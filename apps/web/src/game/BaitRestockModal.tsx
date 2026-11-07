import { useState } from 'react';
import type { InventoryDto, ShopItemDto } from '@fwo/contracts';
import {
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  Notice,
  Select,
  t,
  useI18n,
} from '@fwo/ui';
import { useAuth, useShop } from '../data';
import { ShopPurchaseModal } from '../ShopPurchaseModal';

export function BaitRestockModal({
  locationId,
  entryFeeGold,
  preferredSlug,
  onClose,
  onPurchased,
}: {
  locationId: string;
  entryFeeGold: string;
  preferredSlug?: string;
  onClose: () => void;
  onPurchased: (inventory: InventoryDto, item: ShopItemDto) => void;
}) {
  useI18n();
  const shop = useShop(locationId);
  const level = useAuth((s) => s.player!.level);
  const [selectedId, setSelectedId] = useState('');
  const items =
    shop.data?.items.filter(
      (item) => item.kind === 'BAIT' && item.minLevel <= level,
    ) ?? [];
  const item =
    items.find((item) => item.id === selectedId) ??
    items.find((item) => item.itemSlug === preferredSlug) ??
    items[0];
  return (
    <ShopPurchaseModal
      item={shop.error ? undefined : item}
      configVersion={shop.data?.configVersion}
      locationId={locationId}
      title={t('fishing.restockTitle')}
      onClose={onClose}
      onPurchased={onPurchased}
      onRefresh={() => {
        void shop.refetch();
      }}
    >
      {(pending) => (
        <>
          <Notice tone="warning">{t('fishing.restockDescription')}</Notice>
          <p>{t('fishing.restockFee', { amount: entryFeeGold })}</p>
          {shop.error ? (
            <ErrorState error={shop.error} retry={() => void shop.refetch()} />
          ) : shop.isPending ? (
            <LoadingState />
          ) : !items.length ? (
            <EmptyState
              title={t('fishing.restockEmpty')}
              description={t('fishing.restockEmptyDescription')}
            />
          ) : (
            <FormField label={t('ui.bait.for.the.next.cast')}>
              <Select
                disabled={pending}
                value={item.id}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </>
      )}
    </ShopPurchaseModal>
  );
}
