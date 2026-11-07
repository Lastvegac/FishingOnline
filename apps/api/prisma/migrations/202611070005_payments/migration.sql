-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('MOMO', 'VNPAY');

-- CreateTable
CREATE TABLE "payment_products" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "amount_vnd" BIGINT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "items" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payment_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_orders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "order_code" VARCHAR(40) NOT NULL,
    "product_name" TEXT NOT NULL,
    "total_amount" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'PENDING',
    "quantity" INTEGER NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "paid_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "image_key" TEXT NOT NULL,

    CONSTRAINT "payment_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "method" TEXT NOT NULL,
    "gateway_transaction_id" TEXT,
    "amount" BIGINT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_url" TEXT,
    "checkout_lease_at" TIMESTAMPTZ(3),
    "gateway_response" JSONB,
    "paid_at" TIMESTAMPTZ(3),
    "last_queried_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_logs" (
    "id" UUID NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "order_code" TEXT,
    "payload" JSONB NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "signature_valid" BOOLEAN NOT NULL,
    "processing_status" TEXT NOT NULL,
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_fulfillment_logs" (
    "id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "inventory_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "fulfilled_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payment_fulfillment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_outbox" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(3),
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_orders_order_code_key" ON "payment_orders"("order_code");

-- CreateIndex
CREATE INDEX "payment_orders_user_id_created_at_id_idx" ON "payment_orders"("user_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "payment_orders_status_expires_at_idx" ON "payment_orders"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_orders_user_id_idempotency_key_key" ON "payment_orders"("user_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "payment_order_items_order_id_item_id_key" ON "payment_order_items"("order_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_order_id_key" ON "payment_transactions"("order_id");

-- CreateIndex
CREATE INDEX "payment_transactions_status_last_queried_at_idx" ON "payment_transactions"("status", "last_queried_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_gateway_gateway_transaction_id_key" ON "payment_transactions"("gateway", "gateway_transaction_id");

-- CreateIndex
CREATE INDEX "payment_webhook_logs_order_code_received_at_idx" ON "payment_webhook_logs"("order_code", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_fulfillment_logs_order_item_id_key" ON "payment_fulfillment_logs"("order_item_id");

-- CreateIndex
CREATE INDEX "payment_fulfillment_logs_user_id_fulfilled_at_idx" ON "payment_fulfillment_logs"("user_id", "fulfilled_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_outbox_key_key" ON "payment_outbox"("key");

-- CreateIndex
CREATE INDEX "payment_outbox_processed_at_available_at_idx" ON "payment_outbox"("processed_at", "available_at");

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "payment_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_order_items" ADD CONSTRAINT "payment_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "payment_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "payment_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_fulfillment_logs" ADD CONSTRAINT "payment_fulfillment_logs_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "payment_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_outbox" ADD CONSTRAINT "payment_outbox_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "payment_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE payment_products ADD CONSTRAINT payment_product_valid CHECK (amount_vnd BETWEEN 1000 AND 999999999 AND version > 0 AND jsonb_typeof(items) = 'array');
ALTER TABLE payment_orders ADD CONSTRAINT payment_order_valid CHECK (total_amount BETWEEN 1000 AND 999999999 AND currency = 'VND' AND quantity BETWEEN 1 AND 100 AND expires_at > created_at AND ((status = 'PAID') = (paid_at IS NOT NULL)));
ALTER TABLE payment_order_items ADD CONSTRAINT payment_item_valid CHECK (quantity BETWEEN 1 AND 1000000 AND kind IN ('BAIT','ROD','LINE','HOOK') AND (kind = 'BAIT' OR quantity = 1));
ALTER TABLE payment_transactions ADD CONSTRAINT payment_transaction_valid CHECK (amount BETWEEN 1000 AND 999999999 AND method IN ('MOMO','VNPAY','ATM','INTERNATIONAL_CARD') AND ((gateway = 'MOMO') = (method = 'MOMO')) AND ((status = 'SUCCESS') = (paid_at IS NOT NULL)));
ALTER TABLE payment_fulfillment_logs ADD CONSTRAINT payment_fulfillment_valid CHECK (quantity > 0);
CREATE TRIGGER immutable_payment_webhook BEFORE UPDATE OR DELETE ON payment_webhook_logs FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_payment_fulfillment BEFORE UPDATE OR DELETE ON payment_fulfillment_logs FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_payment_items BEFORE UPDATE OR DELETE ON payment_order_items FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();

CREATE FUNCTION protect_payment_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'SUCCESS' AND (NEW.status <> OLD.status OR NEW.gateway_transaction_id IS DISTINCT FROM OLD.gateway_transaction_id OR NEW.paid_at IS DISTINCT FROM OLD.paid_at) THEN
    RAISE EXCEPTION 'Successful payment receipt is immutable' USING ERRCODE = '23514';
  END IF;
  IF NEW.amount <> OLD.amount OR NEW.order_id <> OLD.order_id OR NEW.gateway <> OLD.gateway OR NEW.method <> OLD.method THEN
    RAISE EXCEPTION 'Payment identity and amount are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_payment_receipt BEFORE UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION protect_payment_receipt();
CREATE FUNCTION protect_payment_order() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.status = 'PAID' AND (NEW.status <> 'PAID' OR NEW.paid_at IS DISTINCT FROM OLD.paid_at)) OR
     NEW.user_id <> OLD.user_id OR NEW.total_amount <> OLD.total_amount OR NEW.product_id <> OLD.product_id OR NEW.quantity <> OLD.quantity OR NEW.order_code <> OLD.order_code OR NEW.currency <> OLD.currency OR NEW.expires_at <> OLD.expires_at OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Payment order snapshot is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_payment_order BEFORE UPDATE ON payment_orders FOR EACH ROW EXECUTE FUNCTION protect_payment_order();
