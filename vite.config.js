import { defineConfig } from 'vite';

// In production the contact form posts to /api/contact, a Vercel serverless
// function (see api/contact.js). Vite's dev server knows nothing about that
// folder, so this tiny plugin answers the same route locally and just logs
// the enquiry to the terminal — no Resend key needed while designing.
function devContactApi() {
  return {
    name: 'dev-contact-api',
    configureServer(server) {
      server.middlewares.use('/api/contact', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end();
        }
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          console.log('\n[dev] contact enquiry:', body, '\n');
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, dev: true }));
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [devContactApi()],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined),
      },
    },
  },
});
