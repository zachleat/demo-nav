# demo nav

A shared header for demo pages: identity link, demo title and description, and
links out to the demo, its source, npm, npmx and the blog post it came from.
One nav, several sites.

## Use it

Open `index.html`, fill in the form, copy the block, paste it at the top of
`<body>`. The CSS comes inlined, so there is nothing to link or upload.

`demo-nav.html` is the same block pre-filled, if you'd rather start from a file.

Both are wrapped in `<!-- zachleat nav (2026-09-04) -->` … `<!-- /zachleat nav -->`
so a pasted copy can be found and replaced later.

## Profiles

| Profile | Links to | Trailing link |
| --- | --- | --- |
| zachleat | `zachleat.com` | All Projects |
| 11ty | `11ty.dev` | Docs |
| Build Awesome | `build.awesome.me` | Docs |

Add one to `PROFILES` in `build.js` and rebuild — the menu, the markup and the
comments all read from it.

Two builder fields worth knowing:

- **Home link text** — a template where `{name}` is the profile name and
  everything around it renders muted. Default `{name} Demo`.
- **Ultra-minify prefix** — renames every class and custom property
  (`demo-nav-description` → `zn-p`), trading some isolation for ~700 bytes.
  Empty means no renaming.

## Develop

```sh
npm install
npm run build
```

`demo-nav.css` is the source of truth. lightningcss minifies it and `build.js`
inlines the result into `demo-nav.html` and `index.html` — edit the CSS or
`src/`, then rebuild. Never edit the generated files.

Pushes to `main` build and deploy to GitHub Pages via
`.github/workflows/deploy.yml`.

## Notes

- The nav starts with `all: initial` and resets its descendants, so a host
  page's fonts, colors and resets can't leak in. Reskin by overriding the
  `--demo-nav-*` properties on `.demo-nav`.
- Icons are each link's own favicon, via the
  [IndieWeb Avatar service](https://www.11ty.dev/docs/services/indieweb-avatar/).
  npm's comes from `docs.npmjs.com`, since npmjs.com blocks the service.
- Sticky on viewports at least `30em` tall; `demo-nav-static` opts out.
- The skip link points at `#demo` — give the demo's container that `id`.
- Light and dark via `light-dark()`, palette taken from zachleat.com.
