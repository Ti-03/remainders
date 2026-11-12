# Add free, customizable statue backgrounds to Memento Mori wallpapers

Adds the supplied Greek statue behind the life and year calendars, with a uniform black background and a default 30% clock safe area. The dashboard exposes image selection/import, visibility, opacity, position, scale and fit without requiring Pro. Existing selected backgrounds retain their layout; calendars, dot colors, calculations, plugins, daily updates, endpoints and iPhone Shortcut remain unchanged.

The original WebP is preserved alongside a lossless PNG used by Satori. The username API embeds the bundled PNG locally, with Vercel file tracing, avoiding a network request to an authenticated preview deployment. Small custom images can be stored directly in the existing Firestore config without Firebase Storage; optional Storage imports use unique paths and never delete a currently saved image while editing. Plan downgrades preserve backgrounds. Config export/import includes background settings.

Fixes cache canonicalization so nested settings actually affect the hash, and versions the renderer cache. Documents Firebase upload rules, document size constraints and deployment checks in docs/custom-backgrounds.md. No production Firebase rules or deployments were changed.

Validation:
- Six automated tests pass: nested cache changes/date rollover, backward-compatible defaults and bounding, real PNG generation for life/months/continuous/calendar, transparency and clock-safe pixels.
- Production build passes using system TLS certificates for the environment's Google Fonts proxy: NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 npm run build.
- TypeScript and targeted ESLint pass.
- Chromium opens /dashboard with no JavaScript errors. Authenticated Firebase upload/save and deployed cache HIT/MISS require the owner's configured Firebase/Vercel deployment; no credentials were available locally.
