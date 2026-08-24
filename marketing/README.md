# Postggresively marketing site

Standalone marketing and download pages for [Postggresively](https://github.com/workvar/postgressively). This folder is **not** included in release bundles (`web/` only) and is meant to be deployed separately — for example on Vercel, Cloudflare Pages, or any static/Node host.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Product landing page |
| `/download` | Latest release + all past GitHub releases with platform picker |

Release data is fetched from the GitHub Releases API (`workvar/postgressively`) and cached for 10 minutes.

## Development

```bash
cd marketing
npm install
npm run dev
```

Open http://localhost:3001 (uses port 3001 so it does not clash with the console on 3000).

## Production build

```bash
npm run build
npm start
```

Deploy the `.next` output with a Node-compatible host, or configure your platform's Next.js adapter.

## Theme

Dark and light mode with a header toggle. Preference is stored in `localStorage` under `pg-theme` and respects `prefers-color-scheme` on first visit.

## Relationship to `web/`

| | `web/` | `marketing/` |
| --- | --- | --- |
| Purpose | Operator console (auth, SQL, schema) | Public marketing + downloads |
| In release bundle | Yes | No |
| Default port (dev) | 3000 | 3001 |
