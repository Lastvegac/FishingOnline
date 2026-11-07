CREATE TABLE "lake_messages" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "location_id" UUID NOT NULL,
  "text" VARCHAR(280) NOT NULL,
  "catch_snapshot" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lake_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lake_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "lake_messages_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "fishing_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "lake_messages_text_check" CHECK (length(trim("text")) > 0)
);
CREATE INDEX "lake_messages_location_id_created_at_id_idx" ON "lake_messages"("location_id", "created_at", "id");
CREATE INDEX "lake_messages_user_id_created_at_idx" ON "lake_messages"("user_id", "created_at");
CREATE INDEX "fishing_catches_location_id_created_at_idx" ON "fishing_catches"("location_id", "created_at");
CREATE INDEX "fishing_catches_user_id_fish_id_weight_g_created_at_id_idx" ON "fishing_catches"("user_id", "fish_id", "weight_g" DESC, "created_at", "id");
