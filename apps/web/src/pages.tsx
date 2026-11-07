import { t as translate, useI18n, localeTag } from '@fwo/ui';
import { useId, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Anchor,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  ChevronRight,
  Fish,
  Flag,
  Leaf,
  MapPin,
  ShoppingBag,
  Sprout,
  Target,
  Trophy,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CurrencyAmount,
  EmptyState,
  ErrorState,
  Form,
  FormError,
  FormField,
  Input,
  LoadingState,
  LanguageSelector,
  Modal,
  Notice,
  PageHeader,
  Progress,
  RarityBadge,
  Tabs,
  Toggle,
  formatNumber,
  formatWeight,
  useToast,
} from '@fwo/ui';
import type {
  CollectionItemDto,
  InventoryItemDto,
  PlayerDto,
  ShopItemDto,
  AchievementDto,
  OtpChallengeDto,
  WalletTransactionDto,
} from '@fwo/contracts';
import { OtpForm } from './verification';
import {
  api,
  invalidateGame,
  useAuth,
  useCollection,
  useInventory,
  useLeaderboard,
  useLocations,
  useMissions,
  usePreferences,
  useShop,
} from './data';
import { EquipmentArt, FishArt, LakeArt } from './art';
import styles from './app.module.css';
import { CatchBasket } from './CatchBasket';
import { PaymentShop } from './payments';
import { ShopPurchaseModal } from './ShopPurchaseModal';
import { PlayerAvatar } from './PlayerAvatar';
import { PlayerProgress } from './PlayerProgress';
const kinds = () => [
  { value: 'ALL', label: translate('ui.all') },
  { value: 'ROD', label: translate('ui.rod') },
  { value: 'LINE', label: translate('ui.line') },
  { value: 'HOOK', label: translate('ui.hook') },
  { value: 'BAIT', label: translate('ui.bait') },
];
function DataState({
  query,
  children,
}: {
  query: { isPending: boolean; error: unknown; refetch: () => unknown };
  children: React.ReactNode;
}) {
  useI18n();
  if (query.isPending) return <LoadingState />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  return <>{children}</>;
}
export function MapPage() {
  useI18n();
  const query = useLocations();
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        eyebrow={translate('ui.every.lake.has.a.story')}
        title={translate('map.title')}
        description={translate('map.description')}
      />
      <DataState query={query}>
        {query.data?.items.length ? (
          <div className={styles.mapGrid}>
            {query.data.items.map((l) => (
              <Card key={l.id} className={styles.mapCard}>
                <div className={styles.mapScene}>
                  <LakeArt environment={l.environment} />
                </div>
                <div className={styles.mapBody}>
                  <Badge tone={l.unlocked ? 'success' : 'neutral'}>
                    {l.unlocked
                      ? translate('ui.open.now')
                      : translate('ui.unlocks.at.level.value', {
                          value0: l.minLevel,
                        })}
                  </Badge>
                  <h2>{l.name}</h2>
                  <p>{l.description}</p>
                  <div className={styles.mapStats}>
                    <span>
                      <MapPin size={13} /> {translate(`env.${l.environment}`)}
                    </span>
                    <span>
                      {translate('ui.level')} {l.minLevel}+
                    </span>
                    <CurrencyAmount value={l.entryFeeGold} />
                  </div>
                  <Button
                    disabled={!l.unlocked}
                    onClick={() => navigate(`/play/fishing?location=${l.id}`)}
                  >
                    <Anchor size={16} />
                    {translate('ui.go.fishing')} <ArrowRight size={15} />
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!l.unlocked}
                    onClick={() => navigate(`/play/shop?location=${l.id}`)}
                  >
                    <ShoppingBag size={15} />
                    {translate('map.localShop')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title={translate('ui.the.lake.is.being.cared.for')}
            description={translate('ui.no.locations.are.open.yet.please.check')}
          />
        )}
      </DataState>
    </>
  );
}
export function InventoryPage({
  equipmentOnly = false,
}: {
  equipmentOnly?: boolean;
}) {
  useI18n();
  const [params, setParams] = useSearchParams();
  const tab =
    !equipmentOnly && params.get('tab') === 'catches' ? 'catches' : 'equipment';
  const query = useInventory();
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState<InventoryItemDto | null>(null);
  const [upgradeConfirm, setUpgradeConfirm] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const action = useMutation({
    mutationFn: ({ path, body }: { path: string; body: unknown }) =>
      api.request(path, { method: 'POST', body }),
    onSuccess: async () => {
      await invalidateGame();
      setSelected(null);
      setUpgradeConfirm(false);
      toast(translate('ui.equipment.updated'));
    },
    onError: (e) => toast(e.message, 'danger'),
  });
  const items =
    query.data?.items.filter(
      (i) =>
        (!equipmentOnly || i.kind !== 'BAIT') &&
        (filter === 'ALL' || i.kind === filter),
    ) ?? [];
  return (
    <>
      <PageHeader
        eyebrow={translate('ui.ready.for.the.journey')}
        title={
          equipmentOnly
            ? translate('ui.your.equipment')
            : translate('ui.what.s.in.your.bag')
        }
        description={translate(
          equipmentOnly
            ? 'ui.a.comfortable.rod.and.your.favourite.bait'
            : 'inventory.description',
        )}
        action={
          <Button variant="secondary" onClick={() => navigate('/play/shop')}>
            {translate('ui.visit.the.fishing.shop')} <ArrowRight size={14} />
          </Button>
        }
      />
      {!equipmentOnly && (
        <div className={styles.filterBar}>
          <Tabs
            label={translate('inventory.tabs')}
            value={tab}
            onChange={(value) => {
              setParams((current) => {
                const next = new URLSearchParams(current);
                next.set('tab', value);
                return next;
              });
            }}
            items={[
              { value: 'equipment', label: translate('inventory.equipment') },
              { value: 'catches', label: translate('exchange.title') },
            ]}
          />
        </div>
      )}
      {tab === 'catches' ? (
        <CatchBasket />
      ) : (
        <>
          <Button
            variant="secondary"
            onClick={() => navigate('/play/character?tab=wardrobe')}
          >
            {translate('fashion.wardrobeLink')}
          </Button>
          <div className={styles.filterBar}>
            <Tabs
              value={filter}
              onChange={setFilter}
              items={
                equipmentOnly
                  ? kinds().filter((k) => k.value !== 'BAIT')
                  : kinds()
              }
            />
            <span className={styles.smallHeading}>
              {items.length} {translate('ui.item.type')}{' '}
            </span>
          </div>
          <DataState query={query}>
            {items.length ? (
              <div className={styles.cardGrid}>
                {items.map((i) => (
                  <Card key={i.id} className={styles.itemCard}>
                    <div className={styles.itemArt}>
                      <EquipmentArt kind={i.kind} />
                      {i.equipped && (
                        <span className={styles.ownedBadge}>
                          <Badge tone="success">
                            <Check size={10} />
                            {translate('ui.equipped')}{' '}
                          </Badge>
                        </span>
                      )}
                    </div>
                    <h3>{i.name}</h3>
                    <div className={styles.itemMeta}>
                      <span>
                        {i.kind === 'BAIT'
                          ? translate('ui.quantity.value', {
                              value0: i.quantity,
                            })
                          : translate('ui.upgrade.value', {
                              value0: i.upgradeLevel,
                            })}
                      </span>
                      <span>
                        {translate('ui.level')} {i.minLevel}+
                      </span>
                    </div>
                    <div className={styles.itemFooter}>
                      <span className={styles.emptyText}>
                        {i.kind === 'BAIT'
                          ? translate('ui.for.every.cast')
                          : translate('ui.power.value.control.value', {
                              value0: i.power,
                              value1: i.control,
                            })}
                      </span>
                      <Button
                        variant="secondary"
                        onClick={() => setSelected(i)}
                      >
                        {translate('ui.view.item')} <ChevronRight size={13} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title={translate('ui.your.bag.is.empty')}
                description={translate('ui.visit.the.shop.to.prepare.for.your')}
                action={
                  <Button onClick={() => navigate('/play/shop')}>
                    {translate('ui.visit.the.fishing.shop')}{' '}
                  </Button>
                }
              />
            )}
          </DataState>
          <Modal
            open={!!selected}
            onClose={() => setSelected(null)}
            title={selected?.name ?? translate('ui.item')}
            footer={
              selected && (
                <>
                  {selected.kind === 'BAIT' ? (
                    <Button
                      onClick={() => {
                        setSelected(null);
                        navigate('/play/fishing');
                      }}
                      disabled={selected.quantity === 0}
                    >
                      {translate('ui.take.bait.to.the.lake')}{' '}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        disabled={action.isPending || !selected.upgradeCostGold}
                        onClick={() => setUpgradeConfirm(true)}
                        loading={action.isPending}
                      >
                        {translate('ui.upgrade')}{' '}
                        {selected.upgradeCostGold && (
                          <CurrencyAmount value={selected.upgradeCostGold} />
                        )}
                      </Button>
                      <Button
                        loading={action.isPending}
                        onClick={() =>
                          action.mutate(
                            selected.equipped
                              ? {
                                  path: '/inventory/unequip',
                                  body: { slot: selected.slot },
                                }
                              : {
                                  path: '/inventory/equip',
                                  body: { inventoryItemId: selected.id },
                                },
                          )
                        }
                      >
                        {selected.equipped
                          ? translate('ui.unequip')
                          : translate('ui.equip.now')}
                      </Button>
                    </>
                  )}
                </>
              )
            }
          >
            {selected && (
              <>
                <div className={styles.modalArt}>
                  <EquipmentArt kind={selected.kind} live />
                </div>
                <p className={styles.modalText}>
                  {selected.kind === 'BAIT'
                    ? translate('ui.the.server.deducts.bait.for.a.valid')
                    : translate(
                        'ui.equipment.affects.pulling.power.and.line.control',
                      )}
                </p>
                <div className={styles.detailGrid}>
                  <div>
                    <small>{translate('ui.power')}</small>
                    <strong>{selected.power}</strong>
                  </div>
                  <div>
                    <small>{translate('ui.control')}</small>
                    <strong>{selected.control}</strong>
                  </div>
                  <div>
                    <small>{translate('ui.required.level')}</small>
                    <strong>{selected.minLevel}</strong>
                  </div>
                  <div>
                    <small>{translate('ui.quantity')}</small>
                    <strong>{selected.quantity}</strong>
                  </div>
                </div>
                {selected.kind !== 'BAIT' && (
                  <Notice>
                    {selected.upgradeCostGold
                      ? translate('ui.the.next.upgrade.costs.value.gold.you', {
                          value0: selected.upgradeCostGold,
                        })
                      : translate(
                          'ui.no.upgrades.are.currently.available.for.this',
                        )}
                  </Notice>
                )}
              </>
            )}
          </Modal>
          <Modal
            open={upgradeConfirm && !!selected}
            onClose={() => setUpgradeConfirm(false)}
            title={translate('ui.upgrade.equipment')}
            footer={
              <>
                <Button
                  variant="secondary"
                  disabled={action.isPending}
                  onClick={() => setUpgradeConfirm(false)}
                >
                  {translate('ui.later')}{' '}
                </Button>
                <Button
                  loading={action.isPending}
                  onClick={() => {
                    if (selected)
                      action.mutate({
                        path: '/inventory/upgrade',
                        body: {
                          inventoryItemId: selected.id,
                          expectedUpgradeLevel: selected.upgradeLevel,
                        },
                      });
                  }}
                >
                  {translate('ui.upgrade.for')}{' '}
                  <CurrencyAmount value={selected?.upgradeCostGold ?? '0'} />
                </Button>
              </>
            }
          >
            <p>
              {translate('ui.upgrade')} {selected?.name} {translate('ui.to')}
              {(selected?.upgradeLevel ?? 0) + 1}
              {translate('ui.cost')}{' '}
              <CurrencyAmount value={selected?.upgradeCostGold ?? '0'} />{' '}
              {translate('ui.will.be.deducted.from.your.gold.wallet')}{' '}
            </p>
            <Notice>
              {translate('ui.the.server.rechecks.the.price.and.upgrade')}{' '}
            </Notice>
          </Modal>
        </>
      )}
    </>
  );
}
export function CollectionPage() {
  useI18n();
  const query = useCollection();
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CollectionItemDto | null>(null);
  const count = query.data?.items.filter((i) => i.count > 0).length ?? 0;
  const items =
    query.data?.items.filter(
      (i) =>
        (filter === 'ALL' ||
          (filter === 'CAUGHT' ? i.count > 0 : i.count === 0)) &&
        i.fish.name
          .toLocaleLowerCase('vi')
          .includes(search.toLocaleLowerCase('vi')),
    ) ?? [];
  return (
    <>
      <PageHeader
        eyebrow={translate('ui.friends.beneath.the.surface')}
        title={translate('ui.the.fish.journal')}
        description={translate('ui.a.glimmer.of.scales.a.memory.by')}
        action={
          <Badge tone="uncommon">
            <BookOpen size={12} />
            {count}/{query.data?.items.length ?? 0}{' '}
            {translate('ui.species.discovered')}{' '}
          </Badge>
        }
      />
      <div className={styles.filterBar}>
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[
            { value: 'ALL', label: translate('ui.all.fish.species') },
            { value: 'CAUGHT', label: translate('ui.discovered') },
            { value: 'UNSEEN', label: translate('ui.not.yet.found') },
          ]}
        />
        <Input
          aria-label={translate('ui.find.a.fish')}
          placeholder={translate('ui.search.for.a.fish')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <DataState query={query}>
        {items.length ? (
          <div className={styles.cardGrid}>
            {items.map((i) => (
              <Card key={i.fish.id} className={styles.itemCard}>
                <div className={styles.itemArt}>
                  <FishArt slug={i.fish.slug} imageKey={i.fish.imageKey} />
                  {i.count > 0 && (
                    <span className={styles.ownedBadge}>
                      <Badge tone="success">
                        <Check size={10} />
                        {translate('ui.found')}{' '}
                      </Badge>
                    </span>
                  )}
                </div>
                <div className={styles.itemMeta}>
                  <RarityBadge rarity={i.fish.rarity} />
                  <span>
                    {i.count
                      ? translate('ui.value.catches', { value0: i.count })
                      : translate('ui.undiscovered')}
                  </span>
                </div>
                <h3>{i.fish.name}</h3>
                <p>{i.fish.description}</p>
                <div className={styles.itemFooter}>
                  <span className={styles.emptyText}>
                    {i.count
                      ? translate('ui.record.value', {
                          value0: formatWeight(i.bestWeightG),
                        })
                      : translate('ui.waiting.for.you.in.the.lake')}
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() => setSelected(i)}
                    aria-label={`Xem ${i.fish.name}`}
                  >
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title={translate('ui.no.matching.fish.found')}
            description={translate('ui.try.changing.the.filter.or.search.term')}
          />
        )}
      </DataState>
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.fish.name ?? translate('ui.fish.species')}
      >
        {selected && (
          <>
            <div className={styles.modalArt}>
              <FishArt
                slug={selected.fish.slug}
                imageKey={selected.fish.imageKey}
                live
              />
            </div>
            <RarityBadge rarity={selected.fish.rarity} />
            <p className={styles.modalText}>{selected.fish.description}</p>
            <div className={styles.detailGrid}>
              <div>
                <small>{translate('ui.habitat')}</small>
                <strong>{selected.fish.habitat}</strong>
              </div>
              <div>
                <small>{translate('fish.scientificName')}</small>
                <strong>
                  <i>{selected.fish.scientificName}</i>
                </strong>
              </div>
              <div>
                <small>{translate('fish.waterTypes')}</small>
                <strong>
                  {selected.fish.waterTypes
                    .map((water) => translate(`water.${water}` as const))
                    .join(' · ')}
                </strong>
              </div>
              <div>
                <small>{translate('ui.weight')}</small>
                <strong>
                  {formatWeight(selected.fish.minWeightG)} –{' '}
                  {formatWeight(selected.fish.maxWeightG)}
                </strong>
              </div>
              <div>
                <small>{translate('ui.caught')}</small>
                <strong>
                  {selected.count} {translate('ui.times')}
                </strong>
              </div>
              <div>
                <small>{translate('ui.personal.best')}</small>
                <strong>
                  {selected.bestWeightG
                    ? formatWeight(selected.bestWeightG)
                    : translate('ui.none.yet')}
                </strong>
              </div>
              {selected.bestCatch?.lengthCm && (
                <div>
                  <small>{translate('sim.lengthLabel')}</small>
                  <strong>
                    {translate('sim.length', {
                      value:
                        selected.bestCatch.lengthCm.toLocaleString(localeTag()),
                    })}
                  </strong>
                </div>
              )}
              {selected.bestCatch?.caughtAt && (
                <div>
                  <small>{translate('sim.caughtAt')}</small>
                  <strong>
                    {new Date(selected.bestCatch.caughtAt).toLocaleString(
                      localeTag(),
                    )}
                  </strong>
                </div>
              )}
              {selected.bestCatch?.baitName && (
                <div>
                  <small>{translate('sim.recordBait')}</small>
                  <strong>{selected.bestCatch.baitName}</strong>
                </div>
              )}
              {selected.bestCatch?.rodName && (
                <div>
                  <small>{translate('sim.recordRod')}</small>
                  <strong>{selected.bestCatch.rodName}</strong>
                </div>
              )}
              {selected.bestCatch?.locationName && (
                <div>
                  <small>{translate('sim.location')}</small>
                  <strong>{selected.bestCatch.locationName}</strong>
                </div>
              )}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
const GENERAL_STORE = 'GENERAL';
export function ShopPage() {
  useI18n();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const locations = useLocations();
  const inventory = useInventory();
  const openSpots = locations.data?.items.filter((l) => l.unlocked) ?? [];
  const spot = openSpots.find((l) => l.id === params.get('location'));
  const query = useShop(spot?.id);
  const player = useAuth((s) => s.player)!;
  const spotName = (id: string) =>
    locations.data?.items.find((l) => l.id === id)?.name ?? '';
  const ownedFor = (item: ShopItemDto) =>
    inventory.data?.items.find(
      (owned) =>
        owned.kind === item.kind &&
        owned.slug === item.itemSlug &&
        owned.quantity > 0,
    );
  const [selling, setSelling] = useState<ShopItemDto | null>(null);
  const [sellQuantity, setSellQuantity] = useState('1');
  const [saleKey, setSaleKey] = useState('');
  const sellFormId = useId();
  const sellingOwned = selling ? ownedFor(selling) : undefined;
  const sellCount =
    /^\d{1,4}$/.test(sellQuantity) &&
    Number(sellQuantity) >= 1 &&
    Number(sellQuantity) <= Math.min(1000, sellingOwned?.quantity ?? 0)
      ? Number(sellQuantity)
      : 0;
  const sellTotal =
    selling?.sellPriceGold && sellCount
      ? BigInt(selling.sellPriceGold) * BigInt(sellCount)
      : 0n;
  const sale = useMutation({
    mutationFn: () =>
      api.request('/shop/sales', {
        method: 'POST',
        idempotencyKey: saleKey,
        body: {
          shopItemId: selling!.id,
          inventoryItemId: sellingOwned!.id,
          quantity: sellCount,
          expectedUnitPriceGold: selling!.sellPriceGold,
          configVersion: query.data!.configVersion,
          ...(spot ? { locationId: spot.id } : {}),
        },
      }),
    onSuccess: async () => {
      await invalidateGame();
      setSelling(null);
      toast(translate('shop.sold'));
    },
    onError: () => {
      void query.refetch();
    },
  });
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState<ShopItemDto | null>(null);
  const toast = useToast();
  // The general store lists only goods sold everywhere; terrain goods need their spot.
  const items =
    query.data?.items.filter(
      (i) =>
        (filter === 'ALL' || i.kind === filter) &&
        (spot || i.locationIds.length === 0),
    ) ?? [];
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => navigate('/play/character?tab=market')}
      >
        {translate('fashion.shopLink')}
      </Button>
      <PageHeader
        eyebrow={translate('ui.a.little.preparation.a.little.more.joy')}
        title={translate('ui.the.lakeside.fishing.shop')}
        description={translate('ui.useful.items.for.your.next.trip.buy')}
        action={<CurrencyAmount value={player.gold} />}
      />
      {openSpots.length > 0 && (
        <div className={styles.filterBar}>
          <Tabs
            items={[
              { value: GENERAL_STORE, label: translate('shop.general') },
              ...openSpots.map((l) => ({ value: l.id, label: l.name })),
            ]}
            value={spot?.id ?? GENERAL_STORE}
            onChange={(value) =>
              setParams(value === GENERAL_STORE ? {} : { location: value })
            }
          />
          {spot && (
            <span className={styles.smallHeading}>
              <MapPin size={13} /> {translate(`env.${spot.environment}`)}
            </span>
          )}
        </div>
      )}
      <div className={styles.filterBar}>
        <Tabs items={kinds()} value={filter} onChange={setFilter} />
        <span className={styles.smallHeading}>Gold</span>
      </div>
      <DataState query={query}>
        {items.length ? (
          <div className={styles.cardGrid}>
            {items.map((i) => (
              <Card key={i.id} className={styles.itemCard}>
                <div className={styles.itemArt}>
                  <EquipmentArt kind={i.kind} />
                  {i.owned && i.kind !== 'BAIT' && (
                    <span className={styles.ownedBadge}>
                      <Badge tone="success">{translate('ui.owned')}</Badge>
                    </span>
                  )}
                </div>
                <h3>{i.name}</h3>
                <p>{i.description}</p>
                <div className={styles.itemMeta}>
                  <span>
                    {i.kind === 'BAIT'
                      ? translate('ui.value.bait.pack', {
                          value0: i.grantQuantity,
                        })
                      : translate('ui.lasting.equipment')}
                  </span>
                  <span>
                    {translate('ui.level')} {i.minLevel}+
                  </span>
                </div>
                {i.locationIds.length > 0 && (
                  <Badge tone="neutral">
                    {translate('shop.localOnly', {
                      places: i.locationIds.map(spotName).join(', '),
                    })}
                  </Badge>
                )}
                {i.sellPriceGold && ownedFor(i) && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelling(i);
                      setSellQuantity('1');
                      setSaleKey(crypto.randomUUID());
                      sale.reset();
                    }}
                  >
                    {translate('shop.sell')} ·{' '}
                    {translate('shop.sellFor', { price: i.sellPriceGold })}
                  </Button>
                )}
                <div className={styles.itemFooter}>
                  <CurrencyAmount value={i.priceGold} />
                  <Button
                    disabled={
                      player.level < i.minLevel ||
                      (i.owned && i.kind !== 'BAIT')
                    }
                    onClick={() => {
                      setSelected(i);
                    }}
                  >
                    {i.owned && i.kind !== 'BAIT'
                      ? translate('ui.already.in.your.bag')
                      : player.level < i.minLevel
                        ? translate('ui.level.too.low')
                        : translate('ui.choose.item')}
                    <ArrowRight size={13} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title={translate('ui.the.shop.is.preparing.stock')}
            description={translate('ui.no.items.match.this.filter.yet')}
          />
        )}
      </DataState>
      <PaymentShop />
      {selected && (
        <ShopPurchaseModal
          item={
            query.data?.items.find((item) => item.id === selected.id) ??
            selected
          }
          configVersion={query.data?.configVersion}
          locationId={spot?.id}
          onClose={() => setSelected(null)}
          onRefresh={() => {
            void query.refetch();
          }}
        />
      )}
      <Modal
        open={!!selling}
        onClose={() => {
          if (!sale.isPending) setSelling(null);
        }}
        title={translate('shop.sellTitle')}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={sale.isPending}
              onClick={() => setSelling(null)}
            >
              {translate('ui.later')}
            </Button>
            <Button
              loading={sale.isPending}
              disabled={!sellCount || !!sellingOwned?.equipped}
              type="submit"
              form={sellFormId}
            >
              {translate('shop.sellConfirm')}{' '}
              <CurrencyAmount value={sellTotal.toString()} />
            </Button>
          </>
        }
      >
        {selling && (
          <Form
            id={sellFormId}
            error={sale.error}
            onSubmit={(event) => {
              event.preventDefault();
              sale.mutate();
            }}
          >
            <h3>{selling.name}</h3>
            <p className={styles.modalText}>
              {translate('shop.sellFor', { price: selling.sellPriceGold! })}
            </p>
            {selling.kind === 'BAIT' ? (
              <FormField
                label={translate('shop.sellQuantity')}
                required
                help={translate('shop.sellHelp', {
                  count: sellingOwned?.quantity ?? 0,
                })}
                error={
                  sellCount
                    ? undefined
                    : translate('shop.sellHelp', {
                        count: sellingOwned?.quantity ?? 0,
                      })
                }
              >
                <Input
                  name="sellQuantity"
                  type="number"
                  min={1}
                  max={sellingOwned?.quantity ?? 1}
                  value={sellQuantity}
                  onChange={(e) => {
                    setSellQuantity(e.target.value);
                    setSaleKey(crypto.randomUUID());
                  }}
                />
              </FormField>
            ) : sellingOwned?.equipped ? (
              <Notice tone="warning">{translate('shop.unequipFirst')}</Notice>
            ) : sellingOwned?.upgradeLevel ? (
              <Notice tone="warning">{translate('shop.upgradeLost')}</Notice>
            ) : null}
            <FormError error={sale.error} />
          </Form>
        )}
      </Modal>
    </>
  );
}
export function MissionsPage() {
  useI18n();
  const query = useMissions();
  const toast = useToast();
  const navigate = useNavigate();
  const claim = useMutation({
    mutationFn: ({ id, periodKey }: { id: string; periodKey: string }) =>
      api.request(`/missions/${id}/claim`, {
        method: 'POST',
        body: { periodKey },
      }),
    onSuccess: async () => {
      await invalidateGame();
      toast(translate('ui.mission.reward.claimed'));
    },
    onError: (e) => toast(e.message, 'danger'),
  });
  return (
    <>
      <PageHeader
        eyebrow={translate('ui.a.small.goal.every.day')}
        title={translate('ui.what.shall.we.do.today')}
        description={translate('ui.enjoy.fishing.at.your.own.pace.little')}
        action={
          <Badge tone="uncommon">
            <Flag size={12} />
            {translate('ui.daily.missions')}{' '}
          </Badge>
        }
      />
      {query.data && (
        <Notice>
          {translate('missions.resetNotice', {
            time: new Date(query.data.resetAt).toLocaleString(localeTag(), {
              timeZone: 'Asia/Ho_Chi_Minh',
              day: 'numeric',
              month: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }),
          })}
        </Notice>
      )}
      <DataState query={query}>
        {query.data?.items.length ? (
          query.data.items.map((m, i) => (
            <Card key={m.id} className={styles.missionFullCard}>
              <span className={styles.missionIcon}>
                {i === 0 ? (
                  <Fish size={22} />
                ) : i === 1 ? (
                  <Target size={22} />
                ) : (
                  <Flag size={22} />
                )}
              </span>
              <div className={styles.missionFullContent}>
                <h3>{m.name}</h3>
                <p>{m.description}</p>
                <Progress
                  value={m.progress}
                  max={m.target}
                  label={`${Math.min(m.progress, m.target)} / ${m.target}`}
                />
              </div>
              <div className={styles.missionReward}>
                <CurrencyAmount value={m.rewardGold} />
                <small>+{m.rewardXp} XP</small>
                <Button
                  disabled={
                    !!m.claimedAt || m.progress < m.target || claim.isPending
                  }
                  variant={m.claimedAt ? 'secondary' : 'primary'}
                  loading={claim.isPending && claim.variables?.id === m.id}
                  onClick={() =>
                    claim.mutate({ id: m.id, periodKey: m.periodKey })
                  }
                >
                  {m.claimedAt ? (
                    <>
                      <Check size={14} />
                      {translate('ui.claimed')}{' '}
                    </>
                  ) : m.progress >= m.target ? (
                    translate('ui.claim.reward')
                  ) : (
                    translate('ui.in.progress')
                  )}
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            title={translate('ui.no.missions.today')}
            description={translate(
              'ui.come.back.when.new.missions.are.available',
            )}
          />
        )}
      </DataState>
      <Card className={styles.nextAdventure}>
        <span className={styles.missionIcon}>
          <MapPin size={22} aria-hidden="true" />
        </span>
        <div>
          <h2>{translate('missions.nextAdventure')}</h2>
          <p>{translate('missions.nextAdventureDescription')}</p>
        </div>
        <div className={styles.nextAdventureActions}>
          <Button onClick={() => navigate('/play/map')}>
            {translate('navigation.explore')}
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/play/collection')}
          >
            <BookOpen size={16} aria-hidden="true" />
            {translate('navigation.journal')}
          </Button>
        </div>
      </Card>
    </>
  );
}
export function LeaderboardPage() {
  useI18n();
  const [metric, setMetric] = useState('largestFish');
  const query = useLeaderboard(metric);
  const player = useAuth((s) => s.player)!;
  return (
    <>
      <PageHeader
        eyebrow={translate('ui.memorable.stories.by.the.lake')}
        title={translate('ui.anglers.who.leave.a.mark')}
        description={translate('ui.a.little.competition.plenty.of.joy.records')}
        action={
          <Badge tone="uncommon">
            <Trophy size={12} />
            {translate('ui.leaderboard')}{' '}
          </Badge>
        }
      />
      <div className={styles.filterBar}>
        <Tabs
          value={metric}
          onChange={setMetric}
          items={[
            { value: 'largestFish', label: translate('ui.largest.fish') },
            { value: 'totalFish', label: translate('ui.fish.caught') },
            { value: 'totalXp', label: translate('ui.experience') },
          ]}
        />
        {query.data?.myRank && (
          <span className={styles.emptyText}>
            {translate('ui.your.rank')}
            {query.data.myRank}
          </span>
        )}
      </div>
      <DataState query={query}>
        {query.data?.items.length ? (
          <Card className={styles.tableCard}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>{translate('ui.rank')}</th>
                  <th>{translate('ui.angler')}</th>
                  <th>
                    {metric === 'largestFish'
                      ? translate('ui.fish.record')
                      : metric === 'totalFish'
                        ? translate('ui.fish.caught')
                        : translate('ui.total.xp')}
                  </th>
                  <th>{translate('ui.level.2')}</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((p) => (
                  <tr
                    key={p.userId}
                    className={
                      p.userId === player.id ? styles.myRank : undefined
                    }
                  >
                    <td>
                      <span className={styles.rank}>
                        {String(p.rank).padStart(2, '0')}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rankPlayer}>
                        <PlayerAvatar
                          avatarKey={p.avatarKey}
                          username={p.username}
                        />
                        <span>
                          {p.username}
                          {p.userId === player.id ? translate('ui.you') : ''}
                          <small>
                            {p.totalFish} {translate('ui.fish.caught.2')}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>
                      {metric === 'largestFish'
                        ? formatWeight(p.largestFishG)
                        : formatNumber(
                            metric === 'totalFish' ? p.totalFish : p.totalXp,
                          )}
                    </td>
                    <td>
                      <Badge tone="uncommon">
                        {translate('ui.level')} {p.level}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <EmptyState
            title={translate('ui.the.first.record.is.waiting.for.its')}
            description={translate('ui.head.to.the.lake.and.leave.your')}
          />
        )}
      </DataState>
    </>
  );
}
export function ProfilePage() {
  useI18n();
  const player = useAuth((s) => s.player)!;
  const [username, setUsername] = useState(player.username);
  const [avatar, setAvatar] = useState(player.avatarKey);
  const toast = useToast();
  const achievements = useQuery({
    queryKey: ['achievements'],
    queryFn: () => api.request<{ items: AchievementDto[] }>('/achievements'),
  });
  // Every profile change is confirmed with an OTP sent to the account email (or phone).
  const [challenge, setChallenge] = useState<OtpChallengeDto | null>(null);
  const save = useMutation({
    mutationFn: () =>
      api.request<OtpChallengeDto>('/users/me/profile-otp', {
        method: 'POST',
        body: {
          ...(username.trim() !== player.username
            ? { username: username.trim() }
            : {}),
          ...(avatar !== player.avatarKey ? { avatarKey: avatar } : {}),
        },
      }),
    onSuccess: setChallenge,
  });
  const avatarPicker = useRef<HTMLDivElement>(null);
  return (
    <>
      <PageHeader
        eyebrow={translate('ui.every.angler.has.a.journey')}
        title={translate('ui.your.story')}
        description={translate('ui.casts.records.and.little.things.to.be')}
      />
      <div className={styles.statsStrip}>
        <Stat
          icon={<Fish size={22} />}
          label={translate('ui.fish.caught')}
          value={formatNumber(player.totalFish)}
        />
        <Stat
          icon={<Award size={22} />}
          label={translate('ui.personal.best')}
          value={
            player.largestFishG
              ? formatWeight(player.largestFishG)
              : translate('ui.none.yet')
          }
        />
        <Stat
          icon={<Sprout size={22} />}
          label={translate('ui.total.experience')}
          value={`${formatNumber(player.totalXp)} XP`}
        />
      </div>
      <div className={styles.profileGrid}>
        <Card className={styles.profileCard}>
          <PlayerAvatar
            avatarKey={avatar}
            username={player.username}
            className={styles.profileAvatar}
          />
          <h2>{player.username}</h2>
          <PlayerProgress player={player} />
          <Button
            variant="secondary"
            onClick={() => {
              avatarPicker.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
              avatarPicker.current
                ?.querySelector('button')
                ?.focus({ preventScroll: true });
            }}
          >
            {translate('profile.changeAvatar')}
          </Button>
          <p style={{ marginTop: 20 }}>
            {translate('ui.by.the.lake.since')}{' '}
            {new Date(player.createdAt).toLocaleDateString(localeTag(), {
              timeZone: 'Asia/Ho_Chi_Minh',
            })}
          </p>
          <CurrencyAmount value={player.gold} />
        </Card>
        <Card className={styles.profileEdit}>
          <h3>{translate('ui.a.little.about.you')}</h3>
          <Form
            error={save.error}
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <FormField label={translate('ui.angler.name')}>
              <Input
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                pattern={String.raw`[\p{L}\p{N}_ .\-]+`}
                minLength={3}
                maxLength={24}
                required
              />
            </FormField>
            {player.email && (
              <FormField
                label={translate('ui.login.email')}
                help={translate('profile.email.locked')}
              >
                <Input value={player.email} disabled readOnly type="email" />
              </FormField>
            )}
            {player.phone && (
              <FormField
                label={translate('profile.phone')}
                help={translate('profile.phone.locked')}
              >
                <Input value={player.phone} disabled readOnly type="tel" />
              </FormField>
            )}
            <h3 id="profile-avatar">{translate('profile.avatarTitle')}</h3>
            <p>{translate('profile.avatarHelp')}</p>
            <div
              className={styles.avatarOptions}
              ref={avatarPicker}
              role="group"
              aria-labelledby="profile-avatar"
            >
              {['angler-1', 'angler-2', 'angler-3', 'angler-4'].map((a, i) => (
                <Button
                  variant="ghost"
                  key={a}
                  type="button"
                  className={`${styles.avatarOption} ${a === avatar ? styles.avatarSelected : ''}`}
                  aria-label={translate('profile.avatarOption', {
                    number: i + 1,
                  })}
                  aria-pressed={a === avatar}
                  onClick={() => setAvatar(a)}
                >
                  {
                    [
                      <Leaf key="l" />,
                      <Fish key="f" />,
                      <Anchor key="a" />,
                      <Sprout key="s" />,
                    ][i]
                  }
                </Button>
              ))}
            </div>
            <FormError error={save.error} />
            <Button loading={save.isPending} type="submit">
              {translate('ui.save.changes')} <Check size={15} />
            </Button>
          </Form>
        </Card>
      </div>
      <Modal
        open={Boolean(challenge)}
        onClose={() => setChallenge(null)}
        title={translate('profile.otp.title')}
      >
        {challenge && (
          <OtpForm
            challenge={challenge}
            onVerify={async (code) => {
              const p = await api.request<PlayerDto>('/users/me', {
                method: 'PATCH',
                body: { challengeId: challenge.challengeId, code },
              });
              useAuth.getState().setPlayer(p);
              setChallenge(null);
              toast(translate('ui.your.profile.has.been.saved'));
            }}
            onResend={() => save.mutateAsync()}
          />
        )}
      </Modal>
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.smallHeading}>
            {translate('ui.little.milestones')}
          </span>
          <h2>{translate('ui.lakeside.milestones')}</h2>
        </div>
      </div>
      <DataState query={achievements}>
        {achievements.data?.items.length ? (
          <div className={styles.cardGrid}>
            {achievements.data.items.map((a) => (
              <Card key={a.id} className={styles.itemCard}>
                <Award size={28} />
                <h3>{a.name}</h3>
                <p>{a.description}</p>
                <Badge tone={a.unlockedAt ? 'success' : 'neutral'}>
                  {a.unlockedAt
                    ? translate('ui.achieved')
                    : translate('ui.locked')}
                </Badge>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            compact
            title={translate('ui.the.journey.has.just.begun')}
            description={translate(
              'ui.achievements.will.appear.as.you.progress',
            )}
          />
        )}
      </DataState>
    </>
  );
}
export function SettingsPage() {
  useI18n();
  const prefs = usePreferences();
  const ledger = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: () =>
      api.request<{ items: WalletTransactionDto[] }>('/wallet/transactions'),
  });
  return (
    <>
      <PageHeader
        eyebrow={translate('ui.comfort.your.way')}
        title={translate('ui.a.few.little.adjustments')}
        description={translate('ui.choose.the.sound.and.motion.that.suit')}
      />
      <Card className={styles.settingsCard}>
        <div className={styles.settingRow}>
          <div>
            <h3>{translate('ui.lakeside.sounds')}</h3>
            <p>
              {translate('ui.audio.feedback.for.casting.bites.and.landing')}
            </p>
          </div>
          <Toggle
            label={translate('ui.lakeside.sounds')}
            checked={prefs.sound}
            onChange={prefs.toggleSound}
          />
        </div>
        <div className={styles.settingRow}>
          <div>
            <h3>{translate('ui.reduce.motion')}</h3>
            <p>{translate('ui.keep.things.calm.with.fewer.motion.effects')}</p>
          </div>
          <Toggle
            label={translate('ui.reduce.motion')}
            checked={prefs.reducedMotion}
            onChange={prefs.toggleMotion}
          />
        </div>
        <div className={styles.settingRow}>
          <div>
            <h3>{translate('language.label')}</h3>
            <p>{translate('language.description')}</p>
          </div>
          <LanguageSelector />
        </div>
        <div className={styles.settingRow}>
          <div>
            <h3>{translate('ui.play.in.moderation')}</h3>
            <p>{translate('ui.rest.your.eyes.and.stretch.after.each')}</p>
          </div>
          <Leaf size={22} />
        </div>
      </Card>
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.smallHeading}>
            {translate('ui.transparent.rewards')}{' '}
          </span>
          <h2>{translate('ui.gold.history')}</h2>
        </div>
        <Link to="/policy" className={styles.textLink}>
          {translate('ui.about.the.preview')} <ArrowRight size={14} />
        </Link>
      </div>
      <DataState query={ledger}>
        {ledger.data?.items.length ? (
          <Card className={styles.tableCard}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>{translate('ui.time')}</th>
                  <th>{translate('ui.content')}</th>
                  <th>{translate('ui.change')}</th>
                  <th>{translate('ui.balance.after')}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.data.items.map((t) => (
                  <tr key={t.id}>
                    <td>
                      {new Date(t.createdAt).toLocaleString(localeTag(), {
                        timeZone: 'Asia/Ho_Chi_Minh',
                      })}
                    </td>
                    <td>
                      {t.reason === 'FISH_EXCHANGE'
                        ? translate('exchange.action')
                        : t.reason}
                    </td>
                    <td>
                      {BigInt(t.amount) > 0n ? '+' : ''}
                      {formatNumber(t.amount)} G
                    </td>
                    <td>{formatNumber(t.balanceAfter)} G</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <EmptyState
            compact
            title={translate('ui.no.gold.transactions.yet')}
            description={translate(
              'ui.every.reward.and.purchase.will.be.recorded',
            )}
          />
        )}
      </DataState>
    </>
  );
}
function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  useI18n();
  return (
    <Card className={styles.statCard}>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </Card>
  );
}
