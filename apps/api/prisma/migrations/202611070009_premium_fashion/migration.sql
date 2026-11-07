-- Reuse the existing gateway, order snapshots, outbox and immutable fulfillment log.
ALTER TABLE payment_order_items DROP CONSTRAINT payment_item_valid;
ALTER TABLE payment_order_items ADD CONSTRAINT payment_item_valid CHECK (quantity BETWEEN 1 AND 1000000 AND kind IN ('BAIT','ROD','LINE','HOOK','DIAMOND') AND (kind IN ('BAIT','DIAMOND') OR quantity=1));
ALTER TABLE payment_fulfillment_logs ALTER COLUMN inventory_id DROP NOT NULL;
ALTER TABLE payment_fulfillment_logs ADD COLUMN diamond_transaction_id UUID UNIQUE REFERENCES diamond_transactions(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE payment_fulfillment_logs ADD CONSTRAINT fulfillment_destination_valid CHECK (num_nonnulls(inventory_id,diamond_transaction_id)=1);
CREATE FUNCTION reconcile_diamonds_on_commit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id UUID; actual BIGINT; expected BIGINT;
BEGIN
 owner_id := NEW.user_id;
 SELECT balance_diamonds INTO actual FROM wallets WHERE user_id=owner_id;
 SELECT COALESCE(sum(amount),0) INTO expected FROM diamond_transactions WHERE user_id=owner_id;
 IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Diamond balance must reconcile to ledger' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER diamonds_reconcile AFTER INSERT OR UPDATE ON wallets DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION reconcile_diamonds_on_commit();
CREATE CONSTRAINT TRIGGER diamonds_ledger_reconcile AFTER INSERT ON diamond_transactions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION reconcile_diamonds_on_commit();
