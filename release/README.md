# Postggresively -- release bundle

> **Note:** The `marketing/` folder is a separate site for public landing and download pages. It is not copied into release archives — only `web/` (the operator console) is bundled.

Prebuilt `agent` and `backend` binaries for this platform, plus the `web`
source. Requires [Node.js](https://nodejs.org) 18+ and Postgres already
running somewhere this machine can reach. Nothing else to install; `npm run
start` installs PM2 locally.

## Setup

```bash
cp config.example.json config.json
# edit config.json: at minimum, jwtSecret, agentToken, and your Postgres
# connection details. See the comments in config.example.json.

npm install       # installs PM2 into this folder
npm run setup     # builds web/ once, using config.json's backendUrl
npm start         # starts agent, backend, and web under PM2
```

Then open `config.json`'s `publicUrl` in a browser (`http://localhost:3000`
by default). First load redirects to `/setup` to create the console account.

`backendUrl` in config.json is the address the *browser* calls directly --
not just this server. `http://localhost:8080` only works when you're
browsing from this same machine. Accessing it from another device (the
common case for a self-hosted console) means setting `backendUrl` to
whatever address actually reaches this machine, e.g.
`http://192.168.1.50:8080` or `https://db.example.com`, before running
`npm run setup`. `web/` gets rebuilt against whatever `backendUrl` says, so
change it and re-run `npm run setup` (then `npm run restart`) any time it
needs to point somewhere else.

## Day to day

```bash
npm run status   # is everything up?
npm run logs      # tail all three services
npm run restart   # after editing config.json (rebuild web first if backendUrl changed)
npm run stop
```

`npm start` already ran `pm2 save`, so `pm2 resurrect` (or `pm2 startup`,
see PM2's own docs for your OS) brings the three processes back after a
reboot.

## What each config.json field maps to

See `ecosystem.config.js` in this folder -- it's a short, readable file, not
a build artifact. It translates config.json into the same environment
variables documented in the main repo's `agent/.env.example` and
`backend/.env.example`, if you want the full list of what's tunable beyond
what config.example.json shows.

## Not on Linux/Mac/Windows with a direct Postgres, or want Docker instead?

See `docker/docker-compose.yml` in the full repo (also published as its own
release asset), which runs Postgres, agent, backend, and web together.
`AGENT_ALLOW_SERVICE_CONTROL` is off by default there -- a container can't
control the host's Postgres service the way a bare-metal agent can, so
service start/stop/restart from the UI is unavailable in that mode.
