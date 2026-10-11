// Mints the site's DFOS app identity: the client_did that read:memberships
// credentials are issued to. Run once (or again, to rotate):
//
//   node scripts/mint-app-identity.mjs <output-file>
//
// The output file holds the PRIVATE key — keep it out of the repository
// (the repository is served publicly as the site). Paste it into the
// Worker as a secret (`npx wrangler secret put APP_PRIVATE_KEY`), then
// delete the file. The public half — client_did and identity_chain — goes
// into /.well-known/dfos-app.json and wrangler.jsonc, which this script
// prints for you to copy.
import { writeFileSync } from 'node:fs';
import { mintSiwdClientIdentity } from '@metalabel/dfos-client/siwd';

const out = process.argv[2];
if (!out) {
  console.error('usage: node scripts/mint-app-identity.mjs <output-file>');
  process.exit(1);
}

const app = await mintSiwdClientIdentity();
const privateKey = Buffer.from(app.privateKey).toString('base64url');
writeFileSync(out, JSON.stringify({ did: app.did, kid: app.kid, chain: app.chain, privateKey }, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify({ client_did: app.did, kid: app.kid, identity_chain: app.chain }, null, 2));
