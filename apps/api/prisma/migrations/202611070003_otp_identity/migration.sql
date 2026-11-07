-- OTP verification, phone/Google sign-up and immutable email.
CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'SMS');
CREATE TYPE "OtpPurpose" AS ENUM ('REGISTER', 'PROFILE_UPDATE');
CREATE TYPE "IdentityProvider" AS ENUM ('GOOGLE');

ALTER TABLE users ALTER COLUMN email_normalized DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN phone_e164 VARCHAR(16);
ALTER TABLE users ADD COLUMN phone_verified_at TIMESTAMPTZ(3);
CREATE UNIQUE INDEX "users_phone_e164_key" ON users(phone_e164);
ALTER TABLE users ADD CONSTRAINT user_has_login_contact CHECK (email_normalized IS NOT NULL OR phone_e164 IS NOT NULL);
ALTER TABLE users ADD CONSTRAINT user_phone_e164 CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{7,14}$');

-- Email cannot be changed or removed once set. Support-led recovery needs a new reviewed migration, not an UPDATE.
CREATE FUNCTION reject_email_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.email_normalized IS NOT NULL AND NEW.email_normalized IS DISTINCT FROM OLD.email_normalized THEN
    RAISE EXCEPTION 'Email is immutable for user %', OLD.id USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER immutable_user_email BEFORE UPDATE OF email_normalized ON users FOR EACH ROW EXECUTE FUNCTION reject_email_change();

CREATE TABLE user_identities (
  id UUID NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  provider "IdentityProvider" NOT NULL,
  subject VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "user_identities_provider_subject_key" ON user_identities(provider, subject);
CREATE INDEX "user_identities_user_id_idx" ON user_identities(user_id);

CREATE TABLE otp_challenges (
  id UUID NOT NULL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  purpose "OtpPurpose" NOT NULL,
  channel "OtpChannel" NOT NULL,
  destination VARCHAR(254) NOT NULL,
  code_hash TEXT NOT NULL,
  payload JSONB NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  send_count INTEGER NOT NULL DEFAULT 1,
  last_sent_at TIMESTAMPTZ(3) NOT NULL,
  expires_at TIMESTAMPTZ(3) NOT NULL,
  consumed_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT otp_counters_valid CHECK (attempts >= 0 AND attempts <= 5 AND send_count BETWEEN 1 AND 5),
  CONSTRAINT otp_profile_has_user CHECK (purpose <> 'PROFILE_UPDATE' OR user_id IS NOT NULL)
);
CREATE INDEX "otp_challenges_user_id_purpose_created_at_idx" ON otp_challenges(user_id, purpose, created_at);
CREATE INDEX "otp_challenges_expires_at_idx" ON otp_challenges(expires_at);
