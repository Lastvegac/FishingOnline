-- Legacy catches have already credited Gold. Only newly snapshotted sessions
-- may create unclaimed catches; never reissue rewards for historical catches.
ALTER TABLE fishing_catches
  ADD COLUMN gold_claimed BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN exchanged_at TIMESTAMPTZ(3);

CREATE INDEX fishing_catches_user_id_gold_claimed_created_at_idx
  ON fishing_catches(user_id, gold_claimed, created_at);
CREATE INDEX fishing_catches_user_id_exchanged_at_idx
  ON fishing_catches(user_id, exchanged_at);

ALTER TABLE fishing_catches ADD CONSTRAINT fish_exchange_state_valid CHECK (
  (exchanged_at IS NULL OR gold_claimed = true) AND reward_gold > 0
);
