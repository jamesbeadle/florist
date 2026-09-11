// Vercel serverless function: POST /api/contact
// Receives the enquiry form as JSON and emails it to CONTACT_TO via Resend.
// Uses Resend's plain REST API so there is no extra dependency to install.

const MAX = { name: 120, email: 200, phone: 40, occasion: 120, date: 40, message: 4000 };

function clean(value, limit) {
  return String(value ?? '').trim().slice(0, limit);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};

  // Honeypot: real people never fill this hidden field. Bots do. Pretend it worked.
  if (body.website) return res.status(200).json({ ok: true });

  const name = clean(body.name, MAX.name);
  const email = clean(body.email, MAX.email);
  const phone = clean(body.phone, MAX.phone);
  const occasion = clean(body.occasion, MAX.occasion);
  const date = clean(body.date, MAX.date);
  const message = clean(body.message, MAX.message);

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: 'Please add your name, email and a message.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'That email address does not look right.' });
  }

  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM } = process.env;
  if (!RESEND_API_KEY || !CONTACT_TO || !CONTACT_FROM) {
    console.error('contact: missing RESEND_API_KEY / CONTACT_TO / CONTACT_FROM');
    return res.status(500).json({ ok: false, error: 'The enquiry form is not set up yet. Please email or call instead.' });
  }

  const rows = [
    ['Name', name],
    ['Email', email],
    ['Phone', phone || '—'],
    ['Occasion', occasion || '—'],
    ['Date', date || '—'],
  ];

  const html = `
    <div style="font-family:Georgia,serif;color:#3b3a37;max-width:560px">
      <h2 style="font-weight:normal;color:#8c5a63">New enquiry from the website</h2>
      <table style="border-collapse:collapse">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:4px 12px 4px 0;color:#8a857d">${k}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`
          )
          .join('')}
      </table>
      <p style="white-space:pre-wrap;margin-top:16px;padding:16px;background:#fbf6ef;border-radius:8px">${escapeHtml(message)}</p>
    </div>`;

  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\n${message}`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: CONTACT_FROM,
        to: [CONTACT_TO],
        reply_to: email,
        subject: `Enquiry from ${name}${occasion ? ` — ${occasion}` : ''}`,
        html,
        text,
      }),
    });
    if (!r.ok) {
      console.error('resend error', r.status, await r.text());
      return res.status(502).json({ ok: false, error: 'Sorry — the message could not be sent. Please try again or email directly.' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact error', err);
    return res.status(500).json({ ok: false, error: 'Sorry — something went wrong. Please try again.' });
  }
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
