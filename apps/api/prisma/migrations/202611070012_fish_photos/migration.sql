CREATE TABLE "fish_photo_assets" (
  "id" UUID NOT NULL,
  "checksum" VARCHAR(64) NOT NULL,
  "content" BYTEA NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fish_photo_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fish_photo_size" CHECK (octet_length("content") BETWEEN 1 AND 5242880)
);
CREATE UNIQUE INDEX "fish_photo_assets_checksum_key" ON "fish_photo_assets"("checksum");
CREATE TRIGGER "fish_photo_assets_immutable" BEFORE UPDATE OR DELETE ON "fish_photo_assets"
FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
