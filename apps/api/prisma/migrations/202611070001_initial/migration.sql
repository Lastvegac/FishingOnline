-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'GAME_ADMIN', 'SUPPORT', 'ANALYST');

-- CreateEnum
CREATE TYPE "FishingState" AS ENUM ('IDLE', 'CASTING', 'WAITING', 'BITE', 'HOOKING', 'FIGHTING', 'REELING', 'CAUGHT', 'ESCAPED', 'FINISHED');

-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "EquipmentSlot" AS ENUM ('ROD', 'LINE', 'HOOK', 'COSMETIC');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email_normalized" VARCHAR(254) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "username" VARCHAR(24) NOT NULL,
    "normalized_username" VARCHAR(48) NOT NULL,
    "avatar_key" TEXT,
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "total_fish" INTEGER NOT NULL DEFAULT 0,
    "largest_fish_g" INTEGER NOT NULL DEFAULT 0,
    "settings" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "family_id" UUID NOT NULL,
    "parent_id" UUID,
    "device_label" VARCHAR(128),
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "absolute_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fish_species" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image_key" TEXT NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "base_weight_g" INTEGER NOT NULL,
    "min_weight_g" INTEGER NOT NULL,
    "max_weight_g" INTEGER NOT NULL,
    "base_reward_gold" BIGINT NOT NULL,
    "base_xp" INTEGER NOT NULL,
    "habitat" TEXT NOT NULL,
    "preferred_baits" JSONB NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "pull_strength" DOUBLE PRECISION NOT NULL,
    "reaction_ms" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fish_species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fishing_locations" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "min_level" INTEGER NOT NULL DEFAULT 1,
    "entry_fee_gold" BIGINT NOT NULL DEFAULT 0,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "image_key" TEXT NOT NULL,
    "asset_config" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fishing_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_fish" (
    "id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "fish_id" UUID NOT NULL,
    "base_weight" DOUBLE PRECISION NOT NULL,
    "conditions" JSONB NOT NULL,

    CONSTRAINT "location_fish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slot" "EquipmentSlot" NOT NULL,
    "min_level" INTEGER NOT NULL DEFAULT 1,
    "base_price_gold" BIGINT NOT NULL,
    "image_key" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_stats" (
    "id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "equipment_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bait_types" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_gold" BIGINT NOT NULL,
    "image_key" TEXT NOT NULL,
    "attraction_config" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bait_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_inventory" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "equipment_id" UUID,
    "bait_type_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "upgrade_level" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_equipment" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "inventory_id" UUID NOT NULL,
    "slot" "EquipmentSlot" NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fish_collections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "fish_id" UUID NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "best_weight_g" INTEGER NOT NULL,
    "first_caught_at" TIMESTAMPTZ(3) NOT NULL,
    "last_caught_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fish_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fishing_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "config_id" UUID NOT NULL,
    "state" "FishingState" NOT NULL DEFAULT 'IDLE',
    "version" INTEGER NOT NULL DEFAULT 0,
    "config_snapshot" JSONB NOT NULL,
    "secret_outcome" JSONB,
    "simulation" JSONB NOT NULL,
    "cast_at" TIMESTAMPTZ(3),
    "bite_at" TIMESTAMPTZ(3),
    "hook_deadline" TIMESTAMPTZ(3),
    "last_tick_at" TIMESTAMPTZ(3),
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "finished_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fishing_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fishing_actions" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "request_hash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "expected_version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fishing_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fishing_catches" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "fish_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "weight_g" INTEGER NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "reward_gold" BIGINT NOT NULL,
    "reward_xp" INTEGER NOT NULL,
    "reward_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fishing_catches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "balance_gold" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "delta_gold" BIGINT NOT NULL,
    "balance_after_gold" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_items" (
    "id" UUID NOT NULL,
    "equipment_id" UUID,
    "bait_type_id" UUID,
    "price_gold" BIGINT NOT NULL,
    "grant_quantity" INTEGER NOT NULL DEFAULT 1,
    "stock" INTEGER,
    "min_level" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shop_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_orders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "shop_item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_gold" BIGINT NOT NULL,
    "total_gold" BIGINT NOT NULL,
    "item_snapshot" JSONB NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "reward_gold" BIGINT NOT NULL,
    "reward_xp" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_missions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "mission_id" UUID NOT NULL,
    "period_key" VARCHAR(10) NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "reward_snapshot" JSONB NOT NULL,
    "criteria_snapshot" JSONB NOT NULL,
    "completed_at" TIMESTAMPTZ(3),
    "claimed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "achievement_id" UUID NOT NULL,
    "unlocked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "AdminRole" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_snapshot" JSONB NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "request_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "value" JSONB NOT NULL,
    "published_at" TIMESTAMPTZ(3),
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "route" TEXT NOT NULL,
    "key" UUID NOT NULL,
    "request_hash" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "user_id" UUID,
    "event_name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "properties" JSONB NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_grants" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "period_key" VARCHAR(10) NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_normalized_key" ON "users"("email_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_normalized_username_key" ON "user_profiles"("normalized_username");

-- CreateIndex
CREATE INDEX "user_profiles_total_xp_user_id_idx" ON "user_profiles"("total_xp" DESC, "user_id");

-- CreateIndex
CREATE INDEX "user_profiles_largest_fish_g_user_id_idx" ON "user_profiles"("largest_fish_g" DESC, "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_parent_id_key" ON "user_sessions"("parent_id");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_revoked_at_idx" ON "user_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "user_sessions_family_id_idx" ON "user_sessions"("family_id");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_expires_at_idx" ON "password_reset_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "fish_species_slug_key" ON "fish_species"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "fishing_locations_slug_key" ON "fishing_locations"("slug");

-- CreateIndex
CREATE INDEX "location_fish_fish_id_idx" ON "location_fish"("fish_id");

-- CreateIndex
CREATE UNIQUE INDEX "location_fish_location_id_fish_id_key" ON "location_fish"("location_id", "fish_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_slug_key" ON "equipment"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_stats_equipment_id_key_key" ON "equipment_stats"("equipment_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "bait_types_slug_key" ON "bait_types"("slug");

-- CreateIndex
CREATE INDEX "user_inventory_user_id_equipment_id_idx" ON "user_inventory"("user_id", "equipment_id");

-- CreateIndex
CREATE INDEX "user_inventory_user_id_bait_type_id_idx" ON "user_inventory"("user_id", "bait_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_equipment_inventory_id_key" ON "user_equipment"("inventory_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_equipment_user_id_slot_key" ON "user_equipment"("user_id", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "fish_collections_user_id_fish_id_key" ON "fish_collections"("user_id", "fish_id");

-- CreateIndex
CREATE INDEX "fishing_sessions_user_id_created_at_idx" ON "fishing_sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "fishing_sessions_state_updated_at_idx" ON "fishing_sessions"("state", "updated_at");

-- CreateIndex
CREATE INDEX "fishing_sessions_expires_at_idx" ON "fishing_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "fishing_actions_session_id_created_at_idx" ON "fishing_actions"("session_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "fishing_actions_session_id_idempotency_key_key" ON "fishing_actions"("session_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "fishing_catches_session_id_key" ON "fishing_catches"("session_id");

-- CreateIndex
CREATE INDEX "fishing_catches_user_id_created_at_idx" ON "fishing_catches"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "fishing_catches_fish_id_weight_g_idx" ON "fishing_catches"("fish_id", "weight_g" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_wallet_id_created_at_id_idx" ON "wallet_transactions"("wallet_id", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_wallet_id_idempotency_key_key" ON "wallet_transactions"("wallet_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_wallet_id_reason_reference_type_referen_key" ON "wallet_transactions"("wallet_id", "reason", "reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "shop_orders_user_id_created_at_idx" ON "shop_orders"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "shop_orders_user_id_idempotency_key_key" ON "shop_orders"("user_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "missions_key_key" ON "missions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "user_missions_user_id_mission_id_period_key_key" ON "user_missions"("user_id", "mission_id", "period_key");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_key_key" ON "achievements"("key");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_id_key" ON "user_achievements"("user_id", "achievement_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_user_id_key" ON "admin_users"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_created_at_idx" ON "audit_logs"("target_type", "target_id", "created_at");

-- CreateIndex
CREATE INDEX "system_configs_key_is_active_idx" ON "system_configs"("key", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_version_key" ON "system_configs"("key", "version");

-- CreateIndex
CREATE INDEX "idempotency_records_expires_at_idx" ON "idempotency_records"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_user_id_route_key_key" ON "idempotency_records"("user_id", "route", "key");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_events_event_id_key" ON "analytics_events"("event_id");

-- CreateIndex
CREATE INDEX "analytics_events_event_name_occurred_at_idx" ON "analytics_events"("event_name", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_events_user_id_occurred_at_idx" ON "analytics_events"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_events_processed_at_created_at_idx" ON "analytics_events"("processed_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_grants_user_id_key_period_key_key" ON "user_grants"("user_id", "key", "period_key");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "user_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_fish" ADD CONSTRAINT "location_fish_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "fishing_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_fish" ADD CONSTRAINT "location_fish_fish_id_fkey" FOREIGN KEY ("fish_id") REFERENCES "fish_species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_stats" ADD CONSTRAINT "equipment_stats_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_bait_type_id_fkey" FOREIGN KEY ("bait_type_id") REFERENCES "bait_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_equipment" ADD CONSTRAINT "user_equipment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_equipment" ADD CONSTRAINT "user_equipment_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "user_inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fish_collections" ADD CONSTRAINT "fish_collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fish_collections" ADD CONSTRAINT "fish_collections_fish_id_fkey" FOREIGN KEY ("fish_id") REFERENCES "fish_species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fishing_sessions" ADD CONSTRAINT "fishing_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fishing_sessions" ADD CONSTRAINT "fishing_sessions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "fishing_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fishing_sessions" ADD CONSTRAINT "fishing_sessions_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "system_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fishing_actions" ADD CONSTRAINT "fishing_actions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "fishing_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fishing_catches" ADD CONSTRAINT "fishing_catches_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "fishing_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fishing_catches" ADD CONSTRAINT "fishing_catches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fishing_catches" ADD CONSTRAINT "fishing_catches_fish_id_fkey" FOREIGN KEY ("fish_id") REFERENCES "fish_species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fishing_catches" ADD CONSTRAINT "fishing_catches_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "fishing_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_items" ADD CONSTRAINT "shop_items_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_items" ADD CONSTRAINT "shop_items_bait_type_id_fkey" FOREIGN KEY ("bait_type_id") REFERENCES "bait_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_shop_item_id_fkey" FOREIGN KEY ("shop_item_id") REFERENCES "shop_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_missions" ADD CONSTRAINT "user_missions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_missions" ADD CONSTRAINT "user_missions_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_grants" ADD CONSTRAINT "user_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
