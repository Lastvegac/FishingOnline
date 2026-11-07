import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  Modal,
  ErrorState,
  EmptyState,
  LoadingState,
  Notice,
  FormError,
  Progress,
  Badge,
  useI18n,
  localeTag,
  type MessageKey,
} from '@fwo/ui';
import type { FashionPassDto } from '@fwo/contracts';
import { api } from './data';
import { invalidateFashion, useCharacterCatalog } from './character-data';
export function FashionPasses() {
  const catalog = useCharacterCatalog();
  const { t, locale } = useI18n(),
    [buying, setBuying] = useState<FashionPassDto | null>(null);
  const rewardName = (id: string) => {
    const item = catalog.data?.cosmetics.find((c) => c.id === id);
    return item
      ? (locale === 'en'
          ? item.nameEn || item.nameVi
          : item.nameVi || item.nameEn) ||
          t(`fashion.item.${item.assetId}` as MessageKey)
      : t('fashion.rewardCosmetic');
  };
  const query = useQuery({
    queryKey: ['fashion-passes'],
    queryFn: () => api.request<{ items: FashionPassDto[] }>('/fashion/passes'),
  });
  const action = useMutation({
    mutationFn: ({
      pass,
      path,
      tierId,
    }: {
      pass: FashionPassDto;
      path: string;
      tierId?: string;
    }) =>
      api.request(`/fashion/passes/${pass.id}/${path}`, {
        method: 'POST',
        body: {
          expectedVersion: pass.version,
          ...(path === 'purchase' ? { expectedPrice: pass.priceDiamonds } : {}),
          ...(tierId ? { tierId } : {}),
        },
      }),
    onSuccess: async () => {
      setBuying(null);
      await Promise.all([invalidateFashion(), query.refetch()]);
    },
  });
  return (
    <>
      <h3>{t('fashion.passes')}</h3>
      <Notice>{t('fashion.passPolicy')}</Notice>
      <Link to="/play/payments">{t('fashion.topup')}</Link>
      <FormError error={action.error} />
      {query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !query.data?.items.length ? (
        <EmptyState compact title={t('fashion.noPasses')} />
      ) : (
        query.data.items.map((p) => (
          <Card padded key={p.id}>
            <h4>{p.name}</h4>
            <Badge>
              {p.kind === 'MEMBERSHIP'
                ? t('fashion.membership')
                : t('fashion.seasonPass')}
            </Badge>
            <p>
              {t('fashion.eventDates', {
                start: new Date(p.startsAt).toLocaleString(localeTag()),
                end: new Date(p.endsAt).toLocaleString(localeTag()),
              })}
            </p>
            {!p.enrolled && (
              <Button
                disabled={
                  action.isPending ||
                  Date.now() < Date.parse(p.startsAt) ||
                  Date.now() >= Date.parse(p.endsAt)
                }
                onClick={() => action.mutate({ pass: p, path: 'enroll' })}
              >
                {t('fashion.enrollFree')}
              </Button>
            )}
            {!p.purchased && (
              <Button
                variant="secondary"
                disabled={
                  Date.now() < Date.parse(p.startsAt) ||
                  Date.now() >= Date.parse(p.endsAt)
                }
                onClick={() => {
                  action.reset();
                  setBuying(p);
                }}
              >
                {t('fashion.unlockPremium', { count: p.priceDiamonds })}
              </Button>
            )}
            {p.tiers.map((tier) => (
              <div key={tier.id}>
                <p>
                  {rewardName(tier.cosmeticId)} ·{' '}
                  {tier.premium
                    ? t('fashion.premiumTier')
                    : t('fashion.freeTier')}
                </p>
                <Progress
                  value={Math.min(p.progress, tier.targetFish || 1)}
                  max={tier.targetFish || 1}
                  label={t('fashion.passProgress', {
                    count: p.progress,
                    target: tier.targetFish,
                  })}
                />
                <Button
                  variant="secondary"
                  disabled={
                    action.isPending ||
                    tier.claimed ||
                    !p.enrolled ||
                    p.progress < tier.targetFish ||
                    (tier.premium && !p.purchased)
                  }
                  onClick={() =>
                    action.mutate({ pass: p, path: 'claim', tierId: tier.id })
                  }
                >
                  {tier.claimed ? t('fashion.claimed') : t('fashion.claim')}
                </Button>
              </div>
            ))}
          </Card>
        ))
      )}
      <Modal
        open={!!buying}
        onClose={() => {
          if (!action.isPending) setBuying(null);
        }}
        title={t('fashion.unlockPass')}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={action.isPending}
              onClick={() => setBuying(null)}
            >
              {t('character.cancel')}
            </Button>
            <Button
              loading={action.isPending}
              onClick={() => action.mutate({ pass: buying!, path: 'purchase' })}
            >
              {t('fashion.confirmBuy')}
            </Button>
          </>
        }
      >
        <p>{buying?.name}</p>
        <p>{t('fashion.diamonds', { count: buying?.priceDiamonds ?? '0' })}</p>
        <Notice>{t('fashion.passPolicy')}</Notice>
        <FormError error={action.error} />
      </Modal>
    </>
  );
}
