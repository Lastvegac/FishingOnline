import { useState, useId } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import {
  Button,
  Card,
  IconButton,
  RarityBadge,
  Tabs,
  BottomActions,
  LoadingState,
  ErrorState,
  EmptyState,
  Notice,
  Modal,
  CurrencyAmount,
  createApiClient,
  useI18n,
} from '@fwo/ui';
import type {
  CharacterCatalogDto,
  FashionCollectionDto,
  FashionEventDto,
  FashionPassDto,
  CosmeticDto,
} from '@fwo/contracts';
import styles from './admin.module.css';
import { FashionEditor } from './FashionEditor';
type AdminData = CharacterCatalogDto & {
  collections: FashionCollectionDto[];
  events: FashionEventDto[];
  passes: FashionPassDto[];
};
export function FashionAdminPage({
  api,
  canEdit,
}: {
  api: ReturnType<typeof createApiClient>;
  canEdit: boolean;
}) {
  const { t, locale } = useI18n(),
    cache = useQueryClient(),
    formId = useId();
  const [tab, setTab] = useState('items'),
    [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [saveKey, setSaveKey] = useState(crypto.randomUUID());
  const query = useQuery({
    queryKey: ['admin-fashion'],
    queryFn: () => api.request<AdminData>('/admin/fashion'),
  });
  const metrics = useQuery({
    queryKey: ['admin-fashion-metrics'],
    queryFn: () =>
      api.request<{
        days: {
          day: string;
          goldCreated: string;
          goldSpent: string;
          diamondsAdded: string;
          diamondsSpent: string;
          revenueVnd: string;
        }[];
        buyers: number;
        players: number;
        topItems: [string, number][];
        revenueVnd: string | null;
        months: { month: string; revenueVnd: string }[];
        payingPlayers: number;
      }>('/admin/fashion/metrics'),
  });
  const save = useMutation({
    mutationFn: ({
      data,
      reason,
    }: {
      data: Record<string, unknown>;
      reason: string;
    }) =>
      api.request(`/admin/fashion/${tab}`, {
        method: ['events', 'passes'].includes(tab) ? 'POST' : 'PUT',
        idempotencyKey: saveKey,
        body: { ...data, reason },
      }),
    onSuccess: async () => {
      setEditing(null);
      await cache.invalidateQueries({ queryKey: ['admin-fashion'] });
    },
  });
  if (query.isPending) return <LoadingState />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const create = () => {
    save.reset();
    setSaveKey(crypto.randomUUID());
    const now = new Date(),
      later = new Date(now.getTime() + 7 * 86400000);
    setEditing(
      tab === 'items'
        ? {
            id: '',
            assetId: query.data!.cosmetics[0]?.assetId ?? '',
            slot: query.data!.cosmetics[0]?.slot ?? 'UPPER',
            rarity: 'COMMON',
            unlockType: 'GOLD',
            priceGold: '60',
            priceDiamonds: '0',
            collectionId: null,
            minLevel: 1,
            active: false,
            startsAt: null,
            endsAt: null,
            expectedVersion: 0,
          }
        : tab === 'collections'
          ? {
              id: '',
              name: '',
              description: '',
              itemIds: [],
              discountPercent: 10,
              active: false,
              version: 1,
            }
          : tab === 'passes'
            ? {
                name: '',
                kind: 'SEASON',
                startsAt: now.toISOString(),
                endsAt: later.toISOString(),
                priceDiamonds: '100',
                active: false,
                expectedVersion: 0,
                tiers: [],
              }
            : {
                name: '',
                theme: '',
                startsAt: now.toISOString(),
                endsAt: later.toISOString(),
                rewardGold: '0',
                rewardCosmeticId: null,
                active: false,
                expectedVersion: 0,
              },
    );
  };
  const edit = (row: unknown) => {
    setSaveKey(crypto.randomUUID());
    const data = { ...(row as Record<string, unknown>) };
    delete data.owned;
    delete data.createdAt;
    delete data.purchaseCount;
    if (tab !== 'collections') {
      data.expectedVersion = data.version;
      delete data.version;
    } else data.version = Number(data.version) + 1;
    delete data.entered;
    delete data.claimed;
    delete data.entries;
    save.reset();
    setEditing(data);
  };
  const rows =
    tab === 'items'
      ? query.data!.cosmetics
      : tab === 'collections'
        ? query.data!.collections
        : tab === 'events'
          ? query.data!.events
          : query.data!.passes;
  const itemName = (item: CosmeticDto) => {
    const key = `fashion.item.${item.assetId}` as Parameters<typeof t>[0];
    const translated = t(key);
    return (
      (locale === 'en'
        ? item.nameEn || item.nameVi
        : item.nameVi || item.nameEn) ||
      (translated === key ? item.id : translated)
    );
  };
  return (
    <>
      <h1>{t('fashion.adminTitle')}</h1>
      <Notice>{t('fashion.adminPolicy')}</Notice>
      <Tabs
        value={tab}
        onChange={setTab}
        items={['items', 'collections', 'events', 'passes', 'metrics'].map(
          (value) => ({
            value,
            label: t(`fashion.adminTab.${value}` as Parameters<typeof t>[0]),
          }),
        )}
      />
      {tab !== 'metrics' && (
        <>
          {canEdit && (
            <BottomActions>
              <Button onClick={create}>
                <Plus size={16} aria-hidden />
                {t(`fashion.editor.create.${tab}` as Parameters<typeof t>[0])}
              </Button>
            </BottomActions>
          )}
          {!rows.length ? (
            <EmptyState title={t('fashion.noItems')} />
          ) : (
            <div className="fwo-fashion-admin-grid">
              {rows.map((row) => (
                <Card padded key={row.id} className={styles.fashionCard}>
                  <div className={styles.fashionCardHeader}>
                    <h3>{'assetId' in row ? itemName(row) : row.name}</h3>
                    <IconButton
                      label={t('fashion.editor.editNamed', {
                        name: 'assetId' in row ? itemName(row) : row.name,
                      })}
                      disabled={!canEdit}
                      onClick={() => edit(row)}
                    >
                      <Pencil size={18} aria-hidden />
                    </IconButton>
                  </div>
                  {'rarity' in row && (
                    <div>
                      <RarityBadge rarity={row.rarity} />
                    </div>
                  )}
                  <p>
                    {'slot' in row
                      ? t('fashion.adminItemSummary', {
                          slot: t(`character.slot.${row.slot}`),
                          unlock: t(`fashion.currency.${row.unlockType}`),
                        })
                      : 'description' in row
                        ? row.description
                        : 'theme' in row
                          ? row.theme
                          : ''}
                  </p>
                  <div className={styles.fashionPrice}>
                    {'unlockType' in row ? (
                      row.unlockType === 'GOLD' ? (
                        <CurrencyAmount value={row.priceGold} />
                      ) : row.unlockType === 'DIAMOND' ? (
                        t('fashion.diamonds', { count: row.priceDiamonds })
                      ) : row.unlockType === 'LEVEL' ? (
                        t('fashion.levelRequired', { level: row.minLevel })
                      ) : (
                        t('fashion.currency.FREE')
                      )
                    ) : 'priceDiamonds' in row ? (
                      t('fashion.diamonds', { count: row.priceDiamonds })
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
      {tab === 'metrics' &&
        (metrics.isPending ? (
          <LoadingState />
        ) : metrics.error ? (
          <ErrorState
            error={metrics.error}
            retry={() => void metrics.refetch()}
          />
        ) : (
          <>
            <Card padded>
              <p>
                {t('fashion.buyers', {
                  count: metrics.data?.buyers ?? 0,
                  players: metrics.data?.players ?? 0,
                })}
              </p>
              <p>
                {t('fashion.revenue', {
                  amount: metrics.data?.revenueVnd ?? '0',
                })}
              </p>
              <p>
                {t('fashion.payingPlayers', {
                  count: metrics.data?.payingPlayers ?? 0,
                  rate: (
                    ((metrics.data?.payingPlayers ?? 0) * 100) /
                    Math.max(1, metrics.data?.players ?? 0)
                  ).toFixed(2),
                })}
              </p>
            </Card>
            <div className="fwo-table-scroll">
              <table>
                <caption>{t('fashion.dailyMetrics')}</caption>
                <thead>
                  <tr>
                    {[
                      'day',
                      'goldCreated',
                      'goldSpent',
                      'diamondsAdded',
                      'diamondsSpent',
                      'revenueVnd',
                    ].map((k) => (
                      <th key={k}>
                        {t(`fashion.metric.${k}` as Parameters<typeof t>[0])}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.data?.days.map((d) => (
                    <tr key={d.day}>
                      <td>{d.day}</td>
                      <td>{d.goldCreated}</td>
                      <td>{d.goldSpent}</td>
                      <td>{d.diamondsAdded}</td>
                      <td>{d.diamondsSpent}</td>
                      <td>{d.revenueVnd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Card padded>
              <h3>{t('fashion.monthlyRevenue')}</h3>
              {metrics.data?.months.length ? (
                metrics.data.months.map((m) => (
                  <p key={m.month}>
                    {m.month} · {t('fashion.revenue', { amount: m.revenueVnd })}
                  </p>
                ))
              ) : (
                <EmptyState compact title={t('fashion.noRevenue')} />
              )}
            </Card>
            <Card padded>
              <h3>{t('fashion.topItems')}</h3>
              {metrics.data?.topItems.map(([id, count]) => (
                <p key={id}>
                  {id} · {count}
                </p>
              ))}
            </Card>
          </>
        ))}
      <Modal
        open={!!editing}
        onClose={() => {
          if (!save.isPending) setEditing(null);
        }}
        title={t(
          `fashion.editor.${editing?.id ? 'edit' : 'create'}.${tab}` as Parameters<
            typeof t
          >[0],
        )}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={save.isPending}
              onClick={() => setEditing(null)}
            >
              {t('character.cancel')}
            </Button>
            <Button type="submit" form={formId} loading={save.isPending}>
              {t('fashion.editor.save')}
            </Button>
          </>
        }
      >
        {editing && (
          <FashionEditor
            key={`${tab}:${editing.id ?? 'new'}`}
            id={formId}
            tab={tab}
            editing={editing}
            cosmetics={query.data.cosmetics}
            collections={query.data.collections}
            pending={save.isPending}
            error={save.error}
            onChange={() => setSaveKey(crypto.randomUUID())}
            onSubmit={(data, reason) => save.mutate({ data, reason })}
          />
        )}
      </Modal>
    </>
  );
}
