import { useId, useMemo, useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { InventoryDto, ShopItemDto } from '@fwo/contracts';
import {
  Button,
  CurrencyAmount,
  Form,
  FormError,
  FormField,
  Input,
  Modal,
  Notice,
  t,
  useI18n,
  useToast,
} from '@fwo/ui';
import { api, invalidateGame, useAuth } from './data';
import { EquipmentArt } from './art';
import styles from './app.module.css';

/** The same confirmed, idempotent purchase in the shop and at the lake. */
export function ShopPurchaseModal({
  item,
  configVersion,
  locationId,
  title,
  children,
  onClose,
  onPurchased,
  onRefresh,
}: {
  item?: ShopItemDto;
  configVersion?: number;
  locationId?: string;
  title?: string;
  children?: ReactNode | ((pending: boolean) => ReactNode);
  onClose: () => void;
  onPurchased?: (inventory: InventoryDto, item: ShopItemDto) => void;
  onRefresh: () => void;
}) {
  useI18n();
  const player = useAuth((s) => s.player)!;
  const toast = useToast();
  const formId = useId();
  const [quantity, setQuantity] = useState('1');
  const count =
    /^\d{1,3}$/.test(quantity) &&
    Number(quantity) >= 1 &&
    Number(quantity) <= 100
      ? Number(quantity)
      : 0;
  const total = item ? BigInt(item.priceGold) * BigInt(count) : 0n;
  const purchaseKey = useMemo(
    () => crypto.randomUUID(),
    [item?.id, item?.priceGold, quantity, configVersion, locationId],
  );
  const purchase = useMutation({
    mutationFn: async () => {
      if (!item || configVersion === undefined || !count) return;
      const data = await api.request<{ inventory: InventoryDto }>(
        '/shop/orders',
        {
          method: 'POST',
          idempotencyKey: purchaseKey,
          body: {
            shopItemId: item.id,
            quantity: count,
            expectedUnitPriceGold: item.priceGold,
            configVersion,
            ...(locationId && item.locationIds.length ? { locationId } : {}),
          },
        },
      );
      return { inventory: data.inventory, item };
    },
    onSuccess: async (data) => {
      if (!data) return;
      await invalidateGame();
      onPurchased?.(data.inventory, data.item);
      onClose();
      toast(t('ui.item.added.to.your.bag.enjoy.your'));
    },
    onError: onRefresh,
  });
  const ready = !!item && configVersion !== undefined;
  return (
    <Modal
      open
      onClose={() => {
        if (!purchase.isPending) onClose();
      }}
      title={title ?? t('ui.take.this.item.home')}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={purchase.isPending}
            onClick={onClose}
          >
            {t('ui.later')}
          </Button>
          {ready && (
            <Button
              loading={purchase.isPending}
              disabled={total > BigInt(player.gold)}
              type="submit"
              form={formId}
            >
              {t('ui.buy.for')} <CurrencyAmount value={total.toString()} />
            </Button>
          )}
        </>
      }
    >
      {typeof children === 'function' ? children(purchase.isPending) : children}
      {ready && (
        <Form
          id={formId}
          error={purchase.error}
          onSubmit={(event) => {
            event.preventDefault();
            if (!purchase.isPending) purchase.mutate();
          }}
        >
          <div className={styles.modalArt}>
            <EquipmentArt kind={item.kind} live />
          </div>
          <h3>{item.name}</h3>
          <p className={styles.modalText}>{item.description}</p>
          {item.kind === 'BAIT' && (
            <FormField
              label={t('ui.packs')}
              required
              help={t('ui.value.bait.per.pack', { value0: item.grantQuantity })}
            >
              <Input
                name="quantity"
                type="number"
                min={1}
                max={100}
                step={1}
                required
                value={quantity}
                disabled={purchase.isPending}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </FormField>
          )}
          <div className={styles.detailGrid}>
            <div>
              <small>{t('ui.total.cost')}</small>
              <CurrencyAmount value={total.toString()} />
            </div>
            <div>
              <small>{t('ui.balance.after.purchase')}</small>
              <CurrencyAmount
                value={(BigInt(player.gold) > total
                  ? BigInt(player.gold) - total
                  : 0n
                ).toString()}
              />
            </div>
          </div>
          {total > BigInt(player.gold) && (
            <Notice tone="warning">
              {t('ui.you.need.more.gold.head.to.the')}
            </Notice>
          )}
          <FormError error={purchase.error} />
        </Form>
      )}
    </Modal>
  );
}
