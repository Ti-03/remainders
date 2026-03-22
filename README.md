# Remainders (Self-Hosted Fork)

This is a fork of [Ti-03/remainders](https://github.com/Ti-03/remainders) — a wallpaper generator that creates time-aware lock screen images (life calendar, year calendar).

## Changes from upstream

This fork is simplified for **single-user, self-hosted** use:

- **Removed Firebase** — no Google authentication, no Firestore database. Configuration is stored as a local JSON file on disk.
- **Added HTTP Basic Auth** — protects the dashboard and admin routes. The wallpaper API endpoints remain public so devices can fetch wallpapers without credentials.
- **Removed Google Analytics** — no external tracking.
- **Simplified plugin system** — only built-in plugins (quotes, habit tracker, moon phase). The plugin submission and editing pages are disabled.
- **Root redirects to dashboard** — the public landing page is removed since this is a private instance.

## Deployment

Designed to run on [Coolify](https://coolify.io/) (or any Docker/Node host).

### Environment variables

| Variable | Description | Default |
|---|---|---|
| `BASIC_AUTH_USER` | Username for HTTP Basic Auth (leave empty to disable) | — |
| `BASIC_AUTH_PASSWORD` | Password for HTTP Basic Auth | — |
| `NEXT_PUBLIC_APP_USERNAME` | Your username (used in wallpaper URL `/api/<username>`) | `user` |
| `DATA_DIR` | Directory for config file storage (mount as persistent volume) | `./data` |

### Coolify setup

1. Create a new service pointing to this repo
2. Set the environment variables above
3. Mount `./data` as a persistent volume so your config survives redeployments
4. Your wallpaper URL will be `https://your-domain/api/<username>`

## Development

```bash
bun install
bun run dev
```

Without `BASIC_AUTH_USER`/`BASIC_AUTH_PASSWORD` set, auth is skipped for local development.

## Credits

Original project by [Qutibah Ananzeh (Ti-03)](https://github.com/Ti-03/remainders).
