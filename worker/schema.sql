-- earthlyhours-auth (D1). Applied once; safe to re-run.

-- Sign-in codes (SIWD nonces) minted by /login/start, each spent at most
-- once by /login/finish — the "consumed verification" INTEGRATIONS.md
-- requires for credential-returning scopes.
CREATE TABLE IF NOT EXISTS nonces (
  nonce      TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL          -- unix ms
);

-- One standing read:memberships grant per signed-in DID, kept so the
-- Worker can re-check key-holder status without another sign-in.
CREATE TABLE IF NOT EXISTS grants (
  did        TEXT PRIMARY KEY,
  credential TEXT NOT NULL,
  key_holder INTEGER NOT NULL,         -- 0 or 1, as of checked_at
  checked_at INTEGER NOT NULL          -- unix ms
);

-- A daily tally of what the Worker is asked: counts only, never who.
-- The Worker creates it itself on first use; listed here to be complete.
-- Events are explained above tally() in src/index.js.
CREATE TABLE IF NOT EXISTS tally (
  day        TEXT NOT NULL,            -- YYYY-MM-DD, UTC
  event      TEXT NOT NULL,
  count      INTEGER NOT NULL,
  PRIMARY KEY (day, event)
);
