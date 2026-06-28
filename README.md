# DA1 2FA System

Monorepo for a two-factor authentication system with three parts:

- `server/` - Express API with SQLite storage
- `authenticator-app/` - Vite + React PWA for managing OTP accounts
- `demo-app/` - Vite + React demo flow for 2FA and passwordless login

## Tech Stack

- Backend: Node.js, Express, SQLite
- Frontends: React, Vite
- Auth: OTP, JWT, WebAuthn / Schnorr-based passwordless flow

## Local Development

Each app is self-contained. Run the service you need from its folder.

### Server

```bash
cd server
npm install
npm run dev
```

Required environment variables:

- `MASTER_KEY`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `DB_PATH` (optional)
- `CORS_ORIGINS`

### Authenticator app

```bash
cd authenticator-app
npm install
npm run dev
```

### Demo app

```bash
cd demo-app
npm install
npm run dev
```

## Deployment

Deployment details are documented in [DEPLOY.md](DEPLOY.md) and the Render blueprint in [render.yaml](render.yaml).

Typical flow:

1. Push the repo to GitHub.
2. Deploy the Render Blueprint.
3. Set `MASTER_KEY` on the server service.
4. Set `VITE_API_URL` on both frontend services.
5. Set `CORS_ORIGINS` on the server.
6. Redeploy the two frontend services after updating `VITE_API_URL`.

## Repository Hygiene

This repo is configured to ignore:

- `node_modules/`
- `dist/`
- `.env`
- SQLite database files
- `docs/`
- `fileBaoCao/`

## More Information

- [Deployment guide](DEPLOY.md)
- [Render blueprint](render.yaml)
- [CI workflow](.github/workflows/ci.yml)