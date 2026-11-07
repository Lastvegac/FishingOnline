import { useState } from 'react';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { CatchBagDto } from '@fwo/contracts';
import {
  Button,
  Card,
  CurrencyAmount,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  Notice,
  PageHeader,
  RarityBadge,
  formatWeight,
  useToast,
  useI18n,
} from '@fwo/ui';
import { api, invalidateGame, queryClient } from './data';
import { FishArt } from './art';
import styles from './app.module.css';

export function CatchBasket({
  onContinueFishing,
}: { onContinueFishing?: () => void } = {}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const [selected, setSelected] = useState<{
    fish: CatchBagDto['items'][number];
    key: string;
  } | null>(null);
  const query = useInfiniteQuery({
    queryKey: ['catches'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api.request<CatchBagDto>(
        `/inventory/catches${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ''}`,
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: 60_000,
  });
  const exchange = useMutation({
    mutationFn: (selection: NonNullable<typeof selected>) =>
      api.request(`/inventory/catches/${selection.fish.id}/exchange`, {
        method: 'POST',
        body: { expectedGold: selection.fish.gold },
        idempotencyKey: selection.key,
      }),
    onSuccess: async () => {
      setSelected(null);
      toast(t('exchange.success'));
      await invalidateGame();
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ['catches'] });
    },
  });
  const budget = query.data?.pages[0];
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const canExchange = (gold: string) =>
    !!budget && BigInt(gold) <= BigInt(budget.remainingGold);
  return (
    <section aria-label={t('exchange.label')}>
      <PageHeader
        titleAs="h2"
        title={t('exchange.title')}
        description={t('exchange.description')}
        action={
          !onContinueFishing && (
            <Button variant="secondary" onClick={() => navigate('/play/shop')}>
              {t('exchange.shop')}
            </Button>
          )
        }
      />
      {budget && (
        <Notice>
          {t('exchange.budget', {
            remaining: budget.remainingGold,
            cap: budget.dailyCapGold,
          })}
        </Notice>
      )}
      {query.isPending ? (
        <LoadingState label={t('exchange.loading')} />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : items.length ? (
        <>
          <div className={styles.catchGrid}>
            {items.map((fish) => (
              <Card key={fish.id} className={styles.catchCard}>
                <div className={styles.itemArt}>
                  <FishArt
                    slug={fish.fish.slug}
                    imageKey={fish.fish.imageKey}
                  />
                </div>
                <RarityBadge rarity={fish.fish.rarity} />
                <h3>{fish.fish.name}</h3>
                <p>{formatWeight(fish.weightG)}</p>
                <div className={styles.catchFooter}>
                  <CurrencyAmount value={fish.gold} />
                  <Button
                    disabled={exchange.isPending || !canExchange(fish.gold)}
                    onClick={() => {
                      exchange.reset();
                      setSelected({ fish, key: crypto.randomUUID() });
                    }}
                  >
                    {t('exchange.action')}
                  </Button>
                  {!canExchange(fish.gold) && <p>{t('exchange.tomorrow')}</p>}
                </div>
              </Card>
            ))}
          </div>
          {query.hasNextPage && (
            <Button
              variant="secondary"
              loading={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {t('exchange.more')}
            </Button>
          )}
        </>
      ) : (
        <EmptyState
          title={t('exchange.empty')}
          description={t('exchange.emptyDescription')}
          action={
            <Button
              onClick={() =>
                onContinueFishing
                  ? onContinueFishing()
                  : navigate('/play/fishing')
              }
            >
              {t(onContinueFishing ? 'ui.keep.fishing' : 'exchange.fish')}
            </Button>
          }
        />
      )}
      <Modal
        open={!!selected}
        onClose={() => {
          if (!exchange.isPending) setSelected(null);
        }}
        title={t('exchange.confirmTitle')}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={exchange.isPending}
              onClick={() => setSelected(null)}
            >
              {t('exchange.keep')}
            </Button>
            <Button
              loading={exchange.isPending}
              disabled={!selected || !canExchange(selected.fish.gold)}
              onClick={() => selected && exchange.mutate(selected)}
            >
              {t('exchange.confirm')}{' '}
              {selected && <CurrencyAmount value={selected.fish.gold} />}
            </Button>
          </>
        }
      >
        {selected && (
          <p>
            {t('exchange.confirmDescription', {
              name: selected.fish.fish.name,
              weight: formatWeight(selected.fish.weightG),
              gold: selected.fish.gold,
            })}
          </p>
        )}
        {exchange.error && (
          <Notice tone="danger">{exchange.error.message}</Notice>
        )}
      </Modal>
    </section>
  );
}
