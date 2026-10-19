// Sets which domain the site's DFOS app identity claims — or none:
// appends an identity `update` whose services carry a DfosOrigin entry
// for <domain>, or no DfosOrigin entry at all for `none`
// (INTEGRATIONS.md, Origin binding).
//
//   node scripts/set-origin.mjs <identity-file> <domain | none>
//
// A claim is only half a binding: the domain has to attest this identity
// back (/.well-known/dfos-did, or a _dfos TXT record), and a domain
// attests exactly one identity. earthlyhours.com attests the DFOS
// *space* (did:dfos:7z2fk4vkkd63ta424z2n639v6tan2ev), so the app
// identity claims no domain — claiming earthlyhours.com too would only
// make its binding read as broken.
//
// <identity-file> is the mint script's output (it holds the private key —
// keep it out of the repository). It's rewritten with the longer chain;
// the new identity_chain is printed for dfos-app.json and APP_IDENTITY.
import { readFileSync, writeFileSync } from 'node:fs';
import { signIdentityOperation, verifyIdentityChain } from '@metalabel/dfos-protocol/chain';
import { decodeJwsUnsafe } from '@metalabel/dfos-protocol';
import { restoreSiwdClientIdentity } from '@metalabel/dfos-client/siwd';

const [file, domain] = process.argv.slice(2);
if (!file || !domain || !/^[a-z0-9.-]+$/.test(domain)) {
  console.error('usage: node scripts/set-origin.mjs <identity-file> <bare lowercase domain | none>');
  process.exit(1);
}

const saved = JSON.parse(readFileSync(file, 'utf8'));
const app = await restoreSiwdClientIdentity({ privateKey: new Uint8Array(Buffer.from(saved.privateKey, 'base64url')), chain: saved.chain });
const state = await verifyIdentityChain({ didPrefix: 'did:dfos', log: saved.chain });
const head = decodeJwsUnsafe(saved.chain[saved.chain.length - 1]);

// The keys stay as declared; only the services change.
const keys = role => (state.declared || state)[role].map(({ id, type, publicKeyMultibase }) => ({ id, type, publicKeyMultibase }));
const services = [
  ...(state.services || []).filter(s => s.type !== 'DfosOrigin'),
  ...(domain === 'none' ? [] : [{ id: 'origin', type: 'DfosOrigin', domain }])
];
const operation = {
  version: 1,
  type: 'update',
  previousOperationCID: head.header.cid,
  authKeys: keys('authKeys'),
  assertKeys: keys('assertKeys'),
  controllerKeys: keys('controllerKeys'),
  services,
  createdAt: new Date().toISOString()
};
const { jwsToken } = await signIdentityOperation({ operation, signer: app.signer, keyId: app.kid.split('#')[1], identityDID: app.did });
const chain = [...saved.chain, jwsToken];

const verified = await verifyIdentityChain({ didPrefix: 'did:dfos', log: chain });
if (verified.did !== app.did) throw new Error('the chain no longer derives the same DID');
console.error('services now:', JSON.stringify(verified.services));

writeFileSync(file, JSON.stringify({ ...saved, chain }, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify(chain));
