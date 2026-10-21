-- 🧠 Betting-Brain v3 - fantasy402_players: one row per customer_id
--
-- processPlayerInfo upserts with `INSERT ... ON CONFLICT(customer_id) DO UPDATE`,
-- but 0007 only created a NON-unique index on customer_id. SQLite/D1 rejects an
-- ON CONFLICT target that matches no PRIMARY KEY/UNIQUE constraint, so every
-- player-info write failed (and was swallowed by the processor's catch), leaving
-- the bet-history roster bootstrap with nothing to read.
--
-- Step 1 — dedupe. Any duplicates can only come from writers other than the
-- (failing) upsert. Keep exactly one row per customer_id, the most recent:
--   1. highest captured_at  (ISO-8601 capture time of the upstream response;
--      lexical order == chronological order for the ISO strings we write)
--   2. then highest updated_at
--   3. then highest id      (last inserted wins on a full tie)
-- All other rows for that customer_id are deleted. Customers with a single row
-- are untouched (the subquery returns their own id).
DELETE FROM fantasy402_players
WHERE id <> (
  SELECT p2.id
  FROM fantasy402_players AS p2
  WHERE p2.customer_id = fantasy402_players.customer_id
  ORDER BY p2.captured_at DESC, p2.updated_at DESC, p2.id DESC
  LIMIT 1
);

-- Step 2 — enforce it. This is the conflict target processPlayerInfo needs.
CREATE UNIQUE INDEX IF NOT EXISTS idx_fantasy402_players_customer_unique
  ON fantasy402_players(customer_id);

-- The 0007 non-unique index on the same single column is now redundant.
DROP INDEX IF EXISTS idx_fantasy402_players_customer;

-- Record this migration (OR IGNORE: safe to re-run; 0001 creates the table).
INSERT OR IGNORE INTO schema_migrations (version, description)
VALUES (10, 'Dedupe fantasy402_players (keep latest per customer_id) and add UNIQUE index on customer_id');
