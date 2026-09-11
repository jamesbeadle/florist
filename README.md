# Amy's Little Florist

A scrolling, parallax florist site. One fixed three.js canvas sits behind ordinary HTML. The setting is a limestone Georgian facade: as you scroll, a pedimented doorcase gets dressed with an asymmetric wedding/funeral installation and urn arrangements (hero), the camera tracks along the building, and a tall sash window gets a sill garland and urns (portfolio). Every flower, leaf and stone texture is generated in code — there are no model or image files for the 3D, so it stays fast on phones.

## Run it

```
npm install
npm run dev
```

`npm run build` makes the production site in `dist/`. Deploy to Vercel as a plain Vite project — no settings needed; `api/contact.js` becomes the enquiry-form endpoint automatically.

## Things to swap before launch

- **Photos** — the portfolio and service images are currently free Unsplash stock photos hot-linked in `index.html`. Replace each `src` with Amy's own photo (drop files into `public/images/` and point the `src` at `/images/...`), and update the `alt` text. Portrait ~1200×1500, landscape ~1200×900, JPEG quality ~75 is plenty.
- **Contact details** — email, phone, Instagram and town are in the Contact section of `index.html` (search for `contact-details`).
- **Testimonials** — the three quotes are placeholders. Replace them with real reviews.
- **Enquiry form email** — set `RESEND_API_KEY`, `CONTACT_TO` and `CONTACT_FROM` in the Vercel project (see `.env.example`). Locally, `npm run dev` just prints enquiries to the terminal.
- **Name** — "Amy's Little Florist" appears in `index.html` (title, nav, footer).

## Where things live

```
index.html             all the page content and copy
src/style.css          the look (colours and fonts are CSS variables at the top)
src/main.js            scroll → scene progress, nav, reveals, form
src/scene/index.js     renderer, light, shadows, camera choreography, quality tiers
src/scene/facade.js    the limestone building: doorcase, window, urns, and where the flowers go
src/scene/flora.js     species list, flower palette, instanced "bloom in" installations
src/scene/geometry.js  procedural petals, flower heads, foliage sprays, stone textures
src/scene/petals.js    drifting petals
api/contact.js         Vercel function: emails the enquiry via Resend
```

Flower colours: `FLOWER_PALETTE` in `src/scene/flora.js`. Site colours and fonts: `:root` in `src/style.css`.
Where the flowers sit on the building (the sweep up the column, the sill garland, the urn domes) is the set of `pathAnchors` / `domeAnchors` calls in `src/scene/facade.js`.

Testing tiers on any device: add `?quality=mobile` or `?quality=desktop` to the URL; `?shadows=0` turns shadows off; `?debug=1` logs start-up timings to the console.
