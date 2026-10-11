# earthlyhours-auth

The server half of Sign In With DFOS for earthlyhours.com: it checks
whether someone signing in is a **key holder**, a member of the paid
subgroup in the DFOS space. The browser half is `../dfos-siwd.js`. The
gate itself is `DFOS_GATE` in `../nav.js`.

The Worker holds what a static site can't:

- the site's DFOS app identity, whose public half is in
  `../.well-known/dfos-app.json` and `wrangler.jsonc` (`APP_IDENTITY`),
  and whose private key is the `APP_PRIVATE_KEY` secret
- the single-use sign-in codes and each visitor's standing grant, in the
  D1 database `earthlyhours-auth` (tables in `schema.sql`)

This folder is served publicly along with the rest of the repository.
It holds no secrets. Keep it that way.

## Deploy

**From the Cloudflare dashboard (no local tools):** Workers & Pages →
Create → Import a repository → this repo, with **root directory**
`worker`. Then, under the new Worker's Settings → Variables and Secrets,
add two secrets:

- `APP_PRIVATE_KEY`, from the mint script's output file
- `SESSION_SECRET`, any long random string

**Or from a computer with Node:**

```sh
cd worker
npm install
npx wrangler secret put APP_PRIVATE_KEY
npx wrangler secret put SESSION_SECRET
npx wrangler deploy
```

Then put the Worker's address (`https://earthlyhours-auth.<you>.workers.dev`)
in `AUTH_URL` at the top of `../dfos-siwd.js`.

## Finding the key holders' group

While `KEY_HOLDER_GROUP` is empty, nobody counts as a key holder. Every
sign-in records the signer's groups in D1:

```sh
npx wrangler d1 execute earthlyhours-auth --remote --command "SELECT body FROM setup_groups"
```

Sign in once as a member of the subgroup, find its `group_…` id there,
put it in `KEY_HOLDER_GROUP`, and redeploy. Then
`DROP TABLE setup_groups`.

## Binding the identity to the domain

DFOS's consent screen shows whether the app identity is bound to
earthlyhours.com. Two halves make the binding:

- **The identity claims the domain.** Its chain carries a `DfosOrigin`
  entry, added by `node scripts/bind-origin.mjs <identity file> earthlyhours.com`.
- **The domain claims the identity.** That's `../.well-known/dfos-did`,
  plus `client_did` in `dfos-app.json`.

## Rotating the app identity

`node scripts/mint-app-identity.mjs <file outside the repo>` mints a new
one, and `scripts/bind-origin.mjs` binds it to the domain. Put its public
half in `dfos-app.json`, `dfos-did` and `APP_IDENTITY`, its
private key in `APP_PRIVATE_KEY`, and redeploy. Visitors sign in again,
because their grants were issued to the old identity.
