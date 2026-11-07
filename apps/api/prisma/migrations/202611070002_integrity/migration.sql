-- Prisma cannot express these partial indexes, immutable histories or deferred invariants.
CREATE UNIQUE INDEX one_open_fishing_session ON fishing_sessions(user_id) WHERE state <> 'FINISHED';
CREATE UNIQUE INDEX one_active_game_config ON system_configs(key) WHERE is_active;
CREATE UNIQUE INDEX one_bait_stack ON user_inventory(user_id,bait_type_id) WHERE bait_type_id IS NOT NULL;
ALTER TABLE wallets ADD CONSTRAINT wallet_nonnegative CHECK (balance_gold >= 0 AND balance_gold <= 9000000000000);
ALTER TABLE wallet_transactions ADD CONSTRAINT ledger_valid CHECK (delta_gold <> 0 AND balance_after_gold >= 0);
ALTER TABLE user_profiles ADD CONSTRAINT profile_nonnegative CHECK (total_xp >= 0 AND total_fish >= 0 AND largest_fish_g >= 0);
ALTER TABLE user_inventory ADD CONSTRAINT inventory_valid CHECK (
  ((equipment_id IS NOT NULL AND bait_type_id IS NULL AND quantity = 1) OR
   (equipment_id IS NULL AND bait_type_id IS NOT NULL AND quantity >= 0)) AND upgrade_level BETWEEN 0 AND 2
);
ALTER TABLE fish_species ADD CONSTRAINT fish_stats_valid CHECK (min_weight_g > 0 AND min_weight_g <= base_weight_g AND base_weight_g <= max_weight_g AND base_reward_gold > 0 AND base_xp > 0 AND difficulty BETWEEN 1 AND 100);
ALTER TABLE fishing_catches ADD CONSTRAINT catch_valid CHECK (weight_g > 0 AND reward_gold > 0 AND reward_xp > 0);
ALTER TABLE fishing_locations ADD CONSTRAINT location_valid CHECK (min_level >= 1 AND entry_fee_gold >= 0);
ALTER TABLE shop_items ADD CONSTRAINT shop_item_valid CHECK (
  ((equipment_id IS NULL) <> (bait_type_id IS NULL)) AND price_gold >= 0 AND grant_quantity > 0 AND (stock IS NULL OR stock >= 0)
);
ALTER TABLE shop_orders ADD CONSTRAINT shop_order_valid CHECK (quantity > 0 AND unit_price_gold >= 0 AND total_gold = quantity * unit_price_gold);
ALTER TABLE missions ADD CONSTRAINT mission_valid CHECK (target > 0 AND reward_gold >= 0 AND reward_xp >= 0);
ALTER TABLE location_fish ADD CONSTRAINT spawn_weight_valid CHECK (base_weight >= 0);

CREATE FUNCTION reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Immutable history: updates and deletes are prohibited on %', TG_TABLE_NAME USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER immutable_wallet_ledger BEFORE UPDATE OR DELETE ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_audit_log BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_user_grant BEFORE UPDATE OR DELETE ON user_grants FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();

CREATE FUNCTION protect_published_configuration() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.published_at IS NOT NULL AND (
    NEW.value IS DISTINCT FROM OLD.value OR NEW.key <> OLD.key OR NEW.version <> OLD.version OR
    NEW.schema_version <> OLD.schema_version OR NEW.published_at IS DISTINCT FROM OLD.published_at
  ) THEN RAISE EXCEPTION 'Published configuration values are immutable' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER immutable_published_config BEFORE UPDATE ON system_configs FOR EACH ROW EXECUTE FUNCTION protect_published_configuration();

-- Check the final state at commit, permitting a ledger INSERT and balance UPDATE in either order.
CREATE FUNCTION reconcile_wallet_on_commit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_id uuid; expected numeric; actual bigint;
BEGIN
  IF TG_TABLE_NAME = 'wallets' THEN target_id := NEW.id; ELSE target_id := NEW.wallet_id; END IF;
  SELECT COALESCE(SUM(delta_gold),0) INTO expected FROM wallet_transactions WHERE wallet_id = target_id;
  SELECT balance_gold INTO actual FROM wallets WHERE id = target_id;
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'Wallet balance does not reconcile with ledger' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER wallet_balance_reconciles AFTER INSERT OR UPDATE ON wallets DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION reconcile_wallet_on_commit();
CREATE CONSTRAINT TRIGGER ledger_balance_reconciles AFTER INSERT ON wallet_transactions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION reconcile_wallet_on_commit();

CREATE FUNCTION equipped_inventory_is_owned() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE inventory_owner uuid; definition_slot "EquipmentSlot";
BEGIN
  SELECT i.user_id,e.slot INTO inventory_owner,definition_slot FROM user_inventory i JOIN equipment e ON e.id = i.equipment_id WHERE i.id = NEW.inventory_id;
  IF inventory_owner IS DISTINCT FROM NEW.user_id OR definition_slot IS DISTINCT FROM NEW.slot THEN
    RAISE EXCEPTION 'Equipped item must be owned and match slot' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER equipment_ownership BEFORE INSERT OR UPDATE ON user_equipment FOR EACH ROW EXECUTE FUNCTION equipped_inventory_is_owned();
