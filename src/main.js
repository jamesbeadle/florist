// Page behaviour: scroll → scene progress, nav, reveals, the enquiry form.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (x) => Math.min(1, Math.max(0, x));

import { initScene } from './scene/index.js';

// ---------- 3D scene ----------

let scene3d = null;
const canvas = $('#scene');

async function startScene() {
  try {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) throw new Error('no webgl');
    // initScene builds the world, compiles every shader and renders the first
    // frame at the current scroll position before it resolves — so the canvas
    // fades in already correct, with no pop and no first-frame stall.
    scene3d = await initScene(canvas, computeProgress());
    document.body.classList.add('has-scene');
    requestAnimationFrame(() => canvas.classList.add('is-ready'));
  } catch (err) {
    console.warn('3D scene unavailable, using the soft fallback background.', err);
    canvas.remove();
  }
}

// ---------- scroll → progress ----------

const hero = $('#hero');
const sections = {
  services: $('#services'),
  portfolio: $('#portfolio'),
  contact: $('#contact'),
};
const heroCopy = $('.hero-copy');
const scrollCue = $('.scroll-cue');
const nav = $('.nav');

/** 0 when a section's top enters the bottom of the viewport, 1 when its bottom leaves the top. */
function visibility(el, vh) {
  const r = el.getBoundingClientRect();
  return clamp01((vh - r.top) / (r.height + vh));
}

function computeProgress() {
  const vh = window.innerHeight;
  const y = window.scrollY;
  const runway = Math.max(1, hero.offsetHeight - vh);
  return {
    arch: clamp01(y / runway),
    travel: clamp01((visibility(sections.services, vh) - 0.05) / 0.7),
    window: clamp01((visibility(sections.portfolio, vh) - 0.05) / 0.75),
    outro: clamp01((visibility(sections.contact, vh) - 0.1) / 0.6),
  };
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const p = computeProgress();
    const arch = p.arch;
    const y = window.scrollY;
    scene3d?.setProgress(p);

    // hero copy drifts up and fades as the arch finishes blooming
    const fade = 1 - clamp01((arch - 0.72) / 0.28);
    heroCopy.style.opacity = fade;
    heroCopy.style.transform = `translate3d(0, ${-arch * 90}px, 0)`;
    heroCopy.style.pointerEvents = fade < 0.2 ? 'none' : '';
    scrollCue.style.opacity = 1 - clamp01(arch / 0.15);

    nav.classList.toggle('is-scrolled', y > 40);
  });
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener(
  'resize',
  () => {
    scene3d?.resize();
    onScroll();
  },
  { passive: true }
);

// pointer parallax — desktop only, and never fights touch scrolling
if (window.matchMedia('(pointer: fine)').matches) {
  window.addEventListener(
    'pointermove',
    (e) => {
      scene3d?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    },
    { passive: true }
  );
}

// ---------- reveals ----------

const revealer = new IntersectionObserver(
  (entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add('is-visible');
        revealer.unobserve(en.target);
      }
    }
  },
  { rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
);
const revealEls = $$('[data-reveal]');
revealEls.forEach((el) => revealer.observe(el));
// belt and braces: anything already well inside the viewport is shown on scroll too
function revealFallback() {
  const limit = window.innerHeight * 0.92;
  for (const el of revealEls) {
    if (!el.classList.contains('is-visible') && el.getBoundingClientRect().top < limit) el.classList.add('is-visible');
  }
}
window.addEventListener('scroll', revealFallback, { passive: true });
revealFallback();

// ---------- mobile menu ----------

const toggle = $('.nav-toggle');
const menu = $('#mobile-menu');
function setMenu(open) {
  toggle.setAttribute('aria-expanded', String(open));
  menu.hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
}
toggle.addEventListener('click', () => setMenu(menu.hidden));
$$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
window.addEventListener('keydown', (e) => e.key === 'Escape' && !menu.hidden && setMenu(false));

// ---------- enquiry form ----------

const form = $('#contact-form');
const status = $('.form-status', form);
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.className = 'form-status';
  const data = Object.fromEntries(new FormData(form).entries());
  if (!data.name?.trim() || !data.email?.trim() || !data.message?.trim()) {
    status.textContent = 'Please add your name, email and a few words about what you need.';
    status.classList.add('is-error');
    return;
  }
  const button = $('button[type=submit]', form);
  button.disabled = true;
  button.textContent = 'Sending…';
  try {
    const r = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok || !json.ok) throw new Error(json.error || 'Something went wrong.');
    form.classList.add('is-sent');
    status.textContent = `Thank you, ${data.name.trim().split(' ')[0]} — your message is on its way. I'll be in touch soon.`;
    status.classList.add('is-ok');
  } catch (err) {
    status.textContent = err.message || 'Sorry — that did not send. Please try again or email me directly.';
    status.classList.add('is-error');
  } finally {
    button.disabled = false;
    button.textContent = 'Send enquiry';
  }
});

// ---------- misc ----------

$('#year').textContent = new Date().getFullYear();

if (new URLSearchParams(location.search).has('view')) document.body.classList.add('hide-ui');
startScene();
onScroll();
