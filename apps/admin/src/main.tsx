import { t as translate, useI18n, localeTag } from '@fwo/ui';
import {
  Component,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom';
import {
  QueryClientProvider,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import {
  Anchor,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  CircleCheck,
  ChevronRight,
  Fish,
  ListFilter,
  LogOut,
  PackageCheck,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import {
  ApiError,
  Badge,
  BottomActions,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  Form,
  FormError,
  FormField,
  FishArt,
  Input,
  LoadingState,
  LanguageSelector,
  Modal,
  Notice,
  PageHeader,
  PasswordInput,
  RarityBadge,
  rarityLabel,
  Select,
  Textarea,
  ToastProvider,
  formatNumber,
  useToast,
} from '@fwo/ui';
import type {
  AdminWalletTransactionDto,
  PaymentOrderDto,
  PaymentAdminDetail,
} from '@fwo/contracts';
import { paymentOrderStatuses, rarities, waterTypes } from '@fwo/contracts';
import '@fwo/ui/styles';
import styles from './admin.module.css';
import {
  api,
  bootstrap,
  queryClient,
  rememberLocation,
  signIn,
  signOut,
  takeReturnPath,
  useAuth,
} from './auth';
import { allLinks, groupsForRole, linkForPath } from './navigation';

import { FashionAdminPage } from './FashionAdminPage';
import { encodeFishPhoto, FishImageField } from './FishImageField';
import { adminValue } from './admin-labels';
type Row = Record<string, unknown>;
type List = { items: Row[]; configVersion?: number };
type Field = {
  key: string;
  label: string;
  type?:
    | 'number'
    | 'gold'
    | 'boolean'
    | 'rarity'
    | 'textarea'
    | 'image'
    | 'waterTypes'
    | 'list';
  min?: number;
  max?: number;
  maxLength?: number;
};
const resourceFields: () => Record<string, Field[]> = () => ({
  fish: [
    { key: 'name', label: translate('ui.fish.species.name') },
    { key: 'imageKey', label: translate('admin.fish.image'), type: 'image' },
    {
      key: 'description',
      label: translate('ui.description'),
      type: 'textarea',
    },
    { key: 'rarity', label: translate('ui.rarity'), type: 'rarity' },
    {
      key: 'minWeightG',
      label: translate('ui.minimum.weight.g'),
      type: 'number',
      min: 1,
      max: 1000000,
    },
    {
      key: 'baseWeightG',
      label: translate('ui.base.weight.g'),
      type: 'number',
      min: 1,
      max: 1000000,
    },
    {
      key: 'maxWeightG',
      label: translate('ui.maximum.weight.g'),
      type: 'number',
      min: 1,
      max: 1000000,
    },
    {
      key: 'spawnWeight',
      label: translate('ui.spawn.weight'),
      type: 'number',
      min: 0,
      max: 10000,
    },
    {
      key: 'baseRewardGold',
      label: translate('ui.base.gold'),
      type: 'number',
      min: 1,
      max: 10000,
    },
    {
      key: 'baseXp',
      label: translate('ui.base.xp'),
      type: 'number',
      min: 1,
      max: 10000,
    },
    {
      key: 'difficulty',
      label: translate('ui.difficulty'),
      type: 'number',
      min: 1,
      max: 100,
    },
    { key: 'active', label: translate('ui.active'), type: 'boolean' },
  ],
  equipment: [
    { key: 'name', label: translate('ui.equipment.name') },
    {
      key: 'power',
      label: translate('ui.power'),
      type: 'number',
      min: 0,
      max: 50,
    },
    {
      key: 'control',
      label: translate('ui.control'),
      type: 'number',
      min: 0,
      max: 50,
    },
    {
      key: 'minLevel',
      label: translate('ui.minimum.level'),
      type: 'number',
      min: 1,
      max: 1000,
    },
    { key: 'active', label: translate('ui.active'), type: 'boolean' },
  ],
  baits: [
    { key: 'name', label: translate('ui.bait.name') },
    {
      key: 'minLevel',
      label: translate('ui.minimum.level'),
      type: 'number',
      min: 1,
      max: 1000,
    },
    { key: 'active', label: translate('ui.active'), type: 'boolean' },
  ],
  locations: [
    { key: 'name', label: translate('ui.lake.name') },
    {
      key: 'description',
      label: translate('ui.description'),
      type: 'textarea',
    },
    {
      key: 'entryFeeGold',
      label: translate('ui.lake.entry.fee.gold'),
      type: 'gold',
    },
    {
      key: 'minLevel',
      label: translate('ui.minimum.level'),
      type: 'number',
      min: 1,
      max: 1000,
    },
    { key: 'active', label: translate('ui.active'), type: 'boolean' },
  ],
  missions: [
    { key: 'name', label: translate('ui.mission.name') },
    {
      key: 'description',
      label: translate('ui.description'),
      type: 'textarea',
    },
    {
      key: 'target',
      label: translate('ui.target'),
      type: 'number',
      min: 1,
      max: 10000000,
    },
    { key: 'rewardGold', label: translate('ui.gold.reward'), type: 'gold' },
    {
      key: 'rewardXp',
      label: translate('ui.xp.reward'),
      type: 'number',
      min: 0,
      max: 10000,
    },
    { key: 'active', label: translate('ui.active'), type: 'boolean' },
  ],
  'shop-items': [
    { key: 'name', label: translate('ui.item.name') },
    {
      key: 'description',
      label: translate('ui.description'),
      type: 'textarea',
    },
    { key: 'priceGold', label: translate('ui.gold.price'), type: 'gold' },
    {
      key: 'grantQuantity',
      label: translate('ui.quantity.per.pack'),
      type: 'number',
      min: 1,
      max: 10000,
    },
    {
      key: 'minLevel',
      label: translate('ui.minimum.level'),
      type: 'number',
      min: 1,
      max: 1000,
    },
    { key: 'active', label: translate('ui.on.sale'), type: 'boolean' },
  ],
});
const fishCreationFields = (): Field[] => [
  { key: 'slug', label: translate('admin.fish.slug'), maxLength: 64 },
  {
    key: 'scientificName',
    label: translate('fish.scientificName'),
    maxLength: 120,
  },
  { key: 'habitat', label: translate('ui.habitat') },
  {
    key: 'waterTypes',
    label: translate('fish.waterTypes'),
    type: 'waterTypes',
  },
  {
    key: 'pullStrength',
    label: translate('admin.fish.pullStrength'),
    type: 'number',
    min: 1,
    max: 10,
  },
  {
    key: 'hookWindowMs',
    label: translate('admin.fish.hookWindow'),
    type: 'number',
    min: 1400,
    max: 5000,
  },
  {
    key: 'surgeMinMs',
    label: translate('admin.fish.surgeMin'),
    type: 'number',
    min: 500,
    max: 10000,
  },
  {
    key: 'surgeMaxMs',
    label: translate('admin.fish.surgeMax'),
    type: 'number',
    min: 500,
    max: 15000,
  },
  {
    key: 'preferredBaits',
    label: translate('admin.fish.preferredBaits'),
    type: 'list',
  },
];
function Brand() {
  useI18n();
  return (
    <div className={styles.brand}>
      <span>
        <Fish size={25} />
      </span>
      <div>
        fishing world<small>CONTROL ROOM</small>
      </div>
    </div>
  );
}
/** Keeps the Chrome tab title in sync with the current admin page and language. */
function DocumentTitle() {
  useI18n();
  const { pathname } = useLocation();
  const page =
    pathname === '/login'
      ? translate('ui.operations.area')
      : (linkForPath(pathname)?.label ?? translate('ui.administration'));
  const title = translate('admin.documentTitle', { page });
  useEffect(() => {
    document.title = title;
  }, [title]);
  return null;
}
function LogoutButton({ label }: { label?: boolean }) {
  useI18n();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant={label ? 'primary' : 'ghost'}
      loading={pending}
      aria-label={translate('ui.admin.logout')}
      title={translate('ui.admin.logout')}
      onClick={async () => {
        setPending(true);
        try {
          await signOut();
        } catch (e) {
          toast((e as Error).message, 'danger');
          setPending(false);
        }
      }}
    >
      {label ? translate('ui.back.to.login') : <LogOut size={17} />}
    </Button>
  );
}
/** Contains a render failure to the current page so navigation keeps working. */
class PageBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return (
        <ErrorState
          error={this.state.error}
          retry={() => this.setState({ error: null })}
        />
      );
    return this.props.children;
  }
}
function Shell() {
  useI18n();
  const { player, ready, restoreError, notice, signedOut } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const previousRole = useRef(player?.role);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);
  useEffect(() => {
    if (
      previousRole.current &&
      player?.role &&
      previousRole.current !== player.role
    )
      toast(translate('admin.session.roleChanged'));
    previousRole.current = player?.role;
  }, [player?.role, toast]);
  if (!ready) return <LoadingState />;
  if (!player && restoreError)
    return <ErrorState error={restoreError} retry={() => void bootstrap()} />;
  if (!player) {
    // A deep link opened without a session returns here after sign-in.
    if (!signedOut && notice !== 'signedOutElsewhere')
      rememberLocation(location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }
  if (player.role === 'PLAYER')
    return (
      <div className={styles.denied}>
        <ShieldCheck size={35} />
        <h1>{translate('ui.you.do.not.have.admin.access')}</h1>
        <p>{translate('ui.access.is.granted.through.the.bootstrap.cli')}</p>
        <LogoutButton label />
      </div>
    );
  const groups = groupsForRole(player.role);
  const current = linkForPath(location.pathname);
  return (
    <div className={styles.layout}>
      <a className={styles.skipLink} href="#admin-main">
        {translate('admin.skipToContent')}
      </a>
      <aside className={styles.sidebar}>
        <Link to="/" className={styles.brandLink} aria-label="Fishing World">
          <Brand />
        </Link>
        <nav aria-label={translate('ui.admin.navigation')}>
          {groups.map((group) => (
            <div key={group.id} className={styles.navGroup}>
              <div className={styles.sideLabel}>{group.label}</div>
              {group.links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  end={to === '/'}
                  key={to}
                  to={to}
                  aria-label={label}
                  title={label}
                  className={({ isActive }) => (isActive ? styles.active : '')}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className={styles.sideBottom}>
          <ShieldCheck size={17} />
          <span>
            {translate('ui.every.important.change')}{' '}
            {translate('ui.is.recorded.in.the.audit.log')}
          </span>
        </div>
      </aside>
      <div className={styles.mainWrap}>
        <header className={styles.topbar}>
          <div className={styles.crumbs}>
            <span>{translate('ui.administration')}</span>
            <ChevronRight size={15} aria-hidden />
            <strong>{current?.label ?? translate('ui.administration')}</strong>
          </div>
          <div className={styles.topActions}>
            <LanguageSelector />
            <div
              className={styles.userChip}
              title={translate('admin.userMenu', {
                name: player.username,
                role: player.role,
              })}
            >
              <span className={styles.avatar} aria-hidden>
                {player.username.slice(0, 1).toLocaleUpperCase(localeTag())}
              </span>
              <span className={styles.userName}>{player.username}</span>
              <Badge tone="uncommon">{player.role}</Badge>
            </div>
            <LogoutButton />
          </div>
        </header>
        <main id="admin-main" tabIndex={-1} className={styles.main}>
          <PageBoundary key={location.pathname}>
            <Outlet />
          </PageBoundary>
        </main>
        <footer className={styles.footer}>
          FISHING WORLD ONLINE · CONTROL ROOM{' '}
          <span>{translate('payments.adminFooter')}</span>
        </footer>
      </div>
    </div>
  );
}
function RedirectAfterLogin() {
  const [to] = useState(takeReturnPath);
  return <Navigate to={to} replace />;
}
function Login() {
  useI18n();
  const { player, ready, restoreError, notice } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  if (!ready) return <LoadingState />;
  if (restoreError)
    return <ErrorState error={restoreError} retry={() => void bootstrap()} />;
  if (ready && player) return <RedirectAfterLogin />;
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    try {
      await signIn(String(f.get('email')), String(f.get('password')));
    } catch (e) {
      setError(
        e instanceof Error ? e : new Error(translate('ui.unable.to.log.in')),
      );
      setPending(false);
    }
  };
  return (
    <div className={styles.login}>
      <Brand />
      <LanguageSelector />
      <Card className={styles.loginCard}>
        <span className="fwo-eyebrow">{translate('ui.operations.area')}</span>
        <h1>{translate('ui.welcome.keeper.of.the.lake')}</h1>
        <p>{translate('ui.log.in.with.an.account.that.has')}</p>
        {notice && (
          <Notice tone={notice === 'expired' ? 'warning' : 'info'}>
            {translate(
              notice === 'expired'
                ? 'admin.session.expired'
                : 'admin.session.signedOutElsewhere',
            )}
          </Notice>
        )}
        <Form error={error} onSubmit={submit}>
          <FormField label="Email" required>
            <Input
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              placeholder="admin@example.com"
              autoFocus
            />
          </FormField>
          <FormField label={translate('ui.password')} required>
            <PasswordInput
              name="password"
              autoComplete="current-password"
              required
              minLength={8}
              maxLength={128}
            />
          </FormField>
          <FormError error={error} />
          <Button loading={pending} type="submit">
            {translate('ui.enter.the.control.room')} <ArrowRight size={16} />
          </Button>
        </Form>
        <Notice>
          {translate('ui.there.is.no.default.account.the.project')}
        </Notice>
      </Card>
      <small>{translate('ui.admin.sessions.use.secure.cookies.and.api')}</small>
    </div>
  );
}
type Overview = {
  players: number;
  catches: number;
  totalGold: string;
  activeSessions: number;
  events: number;
  recentAudit: Row[];
};
function OverviewPage({ analytics = false }: { analytics?: boolean }) {
  useI18n();
  const query = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => api.request<Overview>('/admin/overview'),
  });
  const role = useAuth((s) => s.player?.role ?? '');
  const quickLinks = allLinks().filter(
    (link) => link.description && (link.roles as string[]).includes(role),
  );
  return (
    <>
      <PageHeader
        eyebrow={translate('ui.care.for.a.lake.keep.a.community')}
        title={
          analytics
            ? translate('ui.listen.to.the.numbers')
            : translate('ui.how.is.the.lake.today')
        }
        description={
          query.dataUpdatedAt
            ? `${translate('ui.live.server.data.follow.activity.progress.and')} ${translate(
                'admin.updatedAt',
                {
                  time: new Date(query.dataUpdatedAt).toLocaleTimeString(
                    localeTag(),
                    { hour: '2-digit', minute: '2-digit' },
                  ),
                },
              )}.`
            : translate('ui.live.server.data.follow.activity.progress.and')
        }
        action={
          <Button
            variant="secondary"
            onClick={() => void query.refetch()}
            loading={query.isFetching}
          >
            {translate('ui.refresh.data')}{' '}
          </Button>
        }
      />
      {query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <div className={styles.stats}>
            {[
              {
                icon: Users,
                label: translate('ui.players'),
                value: formatNumber(query.data.players),
              },
              {
                icon: Fish,
                label: translate('ui.fish.caught.3'),
                value: formatNumber(query.data.catches),
              },
              {
                icon: Anchor,
                label: translate('ui.active.sessions'),
                value: formatNumber(query.data.activeSessions),
              },
              {
                icon: Wallet,
                label: translate('ui.total.gold.in.circulation'),
                value: formatNumber(query.data.totalGold),
              },
            ].map(({ icon: Icon, label, value }) => (
              <Card key={label} className={styles.stat}>
                <span>
                  <Icon size={21} />
                </span>
                <small>{label}</small>
                <strong>{value}</strong>
              </Card>
            ))}
          </div>
          {!analytics && quickLinks.length > 0 && (
            <>
              <div className={styles.sectionTitle}>
                <div>
                  <h2>{translate('admin.quickActions')}</h2>
                  <p>{translate('admin.quickActionsHint')}</p>
                </div>
              </div>
              <div className={styles.quickGrid}>
                {quickLinks.map(({ to, label, description, icon: Icon }) => (
                  <Link key={to} to={to} className={styles.quickCard}>
                    <span className={styles.quickIcon}>
                      <Icon size={19} />
                    </span>
                    <span className={styles.quickText}>
                      <strong>{label}</strong>
                      <small>{description}</small>
                    </span>
                    <ChevronRight size={17} aria-hidden />
                  </Link>
                ))}
              </div>
            </>
          )}
          {analytics && (
            <Notice>
              {translate('ui.recorded')} {formatNumber(query.data.events)}{' '}
              {translate(
                'ui.analytics.events.retention.and.revenue.are.reported',
              )}{' '}
            </Notice>
          )}
          <div className={styles.sectionTitle}>
            <h2>{translate('ui.recent.changes')}</h2>
            <Badge>
              {query.data.recentAudit.length} {translate('ui.latest.records')}
            </Badge>
          </div>
          <DataTable
            rows={query.data.recentAudit}
            columns={['createdAt', 'action', 'targetType', 'reason']}
          />
          <Card className={styles.opsNote}>
            <ShieldCheck size={26} />
            <div>
              <h3>{translate('ui.make.changes.responsibly')}</h3>
              <p>
                {translate(
                  'ui.configuration.is.versioned.active.fishing.sessions.keep',
                )}{' '}
              </p>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
const labels: () => Record<string, string> = () => ({
  id: 'ID',
  name: translate('ui.name'),
  slug: translate('ui.code'),
  rarity: translate('ui.rarity'),
  minWeightG: 'Min (g)',
  maxWeightG: 'Max (g)',
  spawnWeight: translate('ui.weight.2'),
  active: translate('ui.active.2'),
  power: translate('ui.power'),
  control: translate('ui.control'),
  minLevel: translate('ui.level'),
  priceGold: translate('ui.gold.price'),
  target: translate('ui.target'),
  rewardGold: translate('ui.gold.reward.2'),
  rewardXp: 'XP',
  kind: translate('ui.type'),
  entryFeeGold: translate('ui.gold.fee'),
  createdAt: translate('ui.time'),
  action: translate('ui.action'),
  targetType: translate('ui.target.2'),
  reason: translate('ui.reason'),
  amount: translate('ui.change'),
  balanceAfter: translate('ui.balance.after'),
  deltaGold: translate('ui.change'),
  balanceAfterGold: translate('ui.balance.after'),
  walletId: translate('admin.wallet'),
  walletOwner: translate('admin.walletOwner'),
  userId: translate('payments.userId'),
  status: translate('ui.status'),
  username: translate('ui.angler'),
  referenceType: translate('admin.referenceType'),
  referenceId: translate('admin.referenceId'),
  role: translate('ui.role'),
  version: translate('ui.version'),
  isActive: translate('ui.currently.applied'),
  publishedAt: translate('ui.published.at'),
});
function printable(value: unknown, key = '') {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean')
    return value ? translate('ui.yes') : translate('ui.no');
  if (typeof value === 'object') return JSON.stringify(value);
  if (key === 'rarity') return rarityLabel(String(value));
  if (key.endsWith('At'))
    return new Date(String(value)).toLocaleString(localeTag(), {
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  return adminValue(String(value), key);
}
const numeric = (value: unknown) =>
  typeof value === 'number'
    ? value
    : typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value.trim())
      ? Number(value)
      : null;
function compareValues(a: unknown, b: unknown, key: string) {
  if (a === b) return 0;
  if (a === null || a === undefined || a === '') return 1;
  if (b === null || b === undefined || b === '') return -1;
  if (typeof a === 'boolean' || typeof b === 'boolean')
    return Number(!!b) - Number(!!a);
  if (key.endsWith('At'))
    return new Date(String(a)).getTime() - new Date(String(b)).getTime();
  const na = numeric(a),
    nb = numeric(b);
  if (na !== null && nb !== null) return na - nb;
  return printable(a, key).localeCompare(printable(b, key), localeTag(), {
    numeric: true,
    sensitivity: 'base',
  });
}
const searchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase(localeTag());
function DataTable({
  rows,
  columns,
  action,
  columnLabels,
  search,
  searchFields = [],
  toolbarExtra,
  emptyState,
}: {
  rows: Row[];
  columns: string[];
  action?: (row: Row) => React.ReactNode;
  columnLabels?: Record<string, string>;
  /** Placeholder of the client-side search box; omitted = no search box. */
  search?: string;
  /** Extra non-visible fields that search also matches, such as ids or slugs. */
  searchFields?: string[];
  toolbarExtra?: React.ReactNode;
  emptyState?: React.ReactNode;
}) {
  const { locale } = useI18n();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const shown = useMemo(() => {
    const needle = searchText(query.trim());
    const fields = [...columns, ...searchFields];
    const filtered = needle
      ? rows.filter((row) =>
          fields.some((field) =>
            searchText(printable(row[field], field)).includes(needle),
          ),
        )
      : rows;
    return sort
      ? [...filtered].sort(
          (a, b) =>
            compareValues(a[sort.key], b[sort.key], sort.key) * sort.dir,
        )
      : filtered;
  }, [rows, columns, searchFields, query, sort, locale]);
  const label = (c: string) => columnLabels?.[c] ?? labels()[c] ?? c;
  const toolbar = (search || toolbarExtra) && (
    <div className={styles.tableToolbar}>
      {search && (
        <div className={styles.searchBox}>
          <Search size={16} aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={search}
            aria-label={search}
            maxLength={100}
          />
        </div>
      )}
      <span className={styles.tableCount}>
        {translate('admin.table.count', {
          shown: formatNumber(shown.length),
          total: formatNumber(rows.length),
        })}
        {toolbarExtra}
      </span>
    </div>
  );
  if (!rows.length)
    return (
      <>
        {toolbar}
        <Card>
          {emptyState ?? (
            <EmptyState
              title={translate('ui.no.data.yet')}
              description={translate(
                'ui.records.will.appear.when.relevant.activity.occurs',
              )}
            />
          )}
        </Card>
      </>
    );
  return (
    <>
      {toolbar}
      {!shown.length ? (
        <Card>
          <EmptyState
            compact
            title={translate('admin.noResults')}
            description={translate('admin.noResultsHint')}
            action={
              <Button variant="secondary" onClick={() => setQuery('')}>
                {translate('admin.search.clear')}
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className={styles.tableCard}>
          <div className={styles.tableScroll}>
            <table>
              <thead>
                <tr>
                  {columns.map((c) => {
                    const active = sort?.key === c;
                    const SortIcon = !active
                      ? ArrowUpDown
                      : sort.dir === 1
                        ? ArrowUp
                        : ArrowDown;
                    return (
                      <th
                        key={c}
                        aria-sort={
                          !active
                            ? 'none'
                            : sort.dir === 1
                              ? 'ascending'
                              : 'descending'
                        }
                      >
                        <button
                          type="button"
                          className={styles.sortButton}
                          title={translate('admin.table.sortBy', {
                            column: label(c),
                          })}
                          onClick={() =>
                            setSort(
                              !active
                                ? { key: c, dir: 1 }
                                : sort.dir === 1
                                  ? { key: c, dir: -1 }
                                  : null,
                            )
                          }
                        >
                          {label(c)}
                          <SortIcon size={13} aria-hidden />
                        </button>
                      </th>
                    );
                  })}
                  {action && <th>{translate('ui.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {shown.map((row, i) => (
                  <tr key={String(row.id ?? i)}>
                    {columns.map((c) => (
                      <td
                        key={c}
                        title={
                          c === 'imageKey' ? undefined : printable(row[c], c)
                        }
                      >
                        {c === 'imageKey' ? (
                          <FishArt
                            slug={String(row.slug ?? '')}
                            imageKey={String(row.imageKey ?? '')}
                            className={styles.fishThumbnail}
                          />
                        ) : c === 'walletOwner' ? (
                          <div className={styles.walletOwner}>
                            <strong>
                              {String(
                                row.username ||
                                  translate('admin.unknownPlayer'),
                              )}
                            </strong>
                            <small>{String(row.userId ?? '—')}</small>
                          </div>
                        ) : c === 'active' || c === 'isActive' ? (
                          <Badge tone={row[c] ? 'success' : 'neutral'}>
                            {row[c]
                              ? translate('ui.active')
                              : translate('ui.hidden')}
                          </Badge>
                        ) : c === 'rarity' && typeof row[c] === 'string' ? (
                          <RarityBadge rarity={String(row[c])} />
                        ) : c === 'status' && typeof row[c] === 'string' ? (
                          <Badge
                            tone={
                              row[c] === 'ACTIVE' || row[c] === 'PAID'
                                ? 'success'
                                : row[c] === 'SUSPENDED' || row[c] === 'BANNED'
                                  ? 'danger'
                                  : 'neutral'
                            }
                          >
                            {String(row[c])}
                          </Badge>
                        ) : c === 'deltaGold' && numeric(row[c]) !== null ? (
                          <span
                            className={
                              numeric(row[c])! < 0
                                ? styles.negative
                                : styles.positive
                            }
                          >
                            {numeric(row[c])! > 0 ? '+' : ''}
                            {formatNumber(String(row[c]).trim())}
                          </span>
                        ) : c === 'balanceAfterGold' &&
                          numeric(row[c]) !== null ? (
                          <span className={styles.tabular}>
                            {formatNumber(String(row[c]).trim())}
                          </span>
                        ) : (
                          <span
                            className={
                              ['id', 'userId', 'walletId'].includes(c)
                                ? styles.mono
                                : ''
                            }
                          >
                            {printable(row[c], c)}
                          </span>
                        )}
                      </td>
                    ))}
                    {action && <td>{action(row)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
function ResourcePage() {
  useI18n();
  const formId = useId();
  const { resource = 'fish' } = useParams();
  const title =
    linkForPath(`/data/${resource}`)?.label ?? translate('ui.content');
  const fields = resourceFields()[resource] ?? [];
  const query = useQuery({
    queryKey: ['admin', resource],
    queryFn: () => api.request<List>(`/admin/${resource}`),
    enabled: !!fields.length,
  });
  const [selected, setSelected] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({});
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [json, setJson] = useState('');
  const toast = useToast();
  const save = useMutation({
    mutationFn: async () => {
      const photoUpload =
        resource === 'fish' && !archiving && photoFile
          ? await encodeFishPhoto(photoFile)
          : undefined;
      if (creating) {
        let item: unknown;
        if (resource === 'fish') {
          item = {
            ...form,
            preferredBaits: String(form.preferredBaits ?? '')
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean),
          };
        } else {
          try {
            item = JSON.parse(json);
          } catch {
            throw new ApiError(
              'VALIDATION_ERROR',
              translate('ui.review.the.data.before.saving'),
              400,
              undefined,
              {
                item: [translate('ui.invalid.json.check.brackets.and.commas')],
              },
            );
          }
        }
        return api.request(`/admin/${resource}`, {
          method: 'POST',
          body: { item, reason, ...(photoUpload ? { photoUpload } : {}) },
        });
      }
      return api.request(`/admin/${resource}/${selected!.id}`, {
        method: 'PATCH',
        body: {
          ...(archiving ? { active: false } : form),
          reason,
          expectedVersion: selected!.version,
          ...(photoUpload ? { photoUpload } : {}),
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setSelected(null);
      setCreating(false);
      setArchiving(false);
      setPhotoFile(null);
      toast(translate('ui.content.updated.and.recorded.in.the.audit'));
    },
  });
  const open = (row: Row) => {
    setPhotoFile(null);
    setSelected(row);
    setArchiving(false);
    setForm(
      Object.fromEntries(
        fields.map((f) => [
          f.key,
          row[f.key] ?? (f.type === 'boolean' ? true : ''),
        ]),
      ),
    );
    setReason('');
    save.reset();
  };
  const rows = query.data?.items ?? [];
  const columns =
    resource === 'fish'
      ? ['imageKey', 'name', 'rarity', 'spawnWeight', 'active']
      : resource === 'equipment'
        ? ['name', 'kind', 'power', 'control', 'active']
        : resource === 'missions'
          ? ['name', 'target', 'rewardGold', 'active']
          : resource === 'shop-items'
            ? ['name', 'priceGold', 'minLevel', 'active']
            : ['name', 'slug', 'minLevel', 'active'];
  return (
    <>
      <PageHeader
        eyebrow={translate('ui.content.management')}
        title={`${title}.`}
        description={translate(
          'ui.every.change.creates.a.configuration.version.and',
        )}
        action={
          <Button
            onClick={() => {
              setCreating(true);
              setPhotoFile(null);
              setSelected(null);
              setArchiving(false);
              setReason('');
              if (resource === 'fish') {
                const template = query.data?.items[0] ?? {};
                setForm(
                  Object.fromEntries(
                    [
                      ...fields.filter((field) => field.type !== 'boolean'),
                      ...fishCreationFields(),
                    ].map((field) => [
                      field.key,
                      [
                        'name',
                        'slug',
                        'scientificName',
                        'description',
                        'habitat',
                        'imageKey',
                      ].includes(field.key)
                        ? ''
                        : field.type === 'list'
                          ? Array.isArray(template[field.key])
                            ? (template[field.key] as unknown[]).join(', ')
                            : ''
                          : (template[field.key] ??
                            (field.type === 'waterTypes'
                              ? []
                              : field.type === 'rarity'
                                ? 'COMMON'
                                : '')),
                    ]),
                  ),
                );
              }
              setJson(
                JSON.stringify(
                  query.data?.items[0]
                    ? Object.fromEntries(
                        Object.entries(query.data.items[0]).filter(
                          ([key]) =>
                            !['active', 'version', 'stock', 'id'].includes(key),
                        ),
                      )
                    : {},
                  null,
                  2,
                ),
              );
              save.reset();
            }}
          >
            <Plus size={16} />
            {translate('ui.add.new')}{' '}
          </Button>
        }
      />
      {query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <DataTable
          key={resource}
          rows={rows}
          columns={columns}
          columnLabels={{ imageKey: translate('admin.fish.image') }}
          search={translate('ui.search.value', {
            value0: title.toLocaleLowerCase(localeTag()),
          })}
          searchFields={['slug', 'id']}
          toolbarExtra={
            <span className={styles.configTag}>
              {translate('admin.configVersion', {
                version: query.data?.configVersion ?? '—',
              })}
            </span>
          }
          action={(row) => (
            <div className={styles.rowActions}>
              <Button variant="secondary" onClick={() => open(row)}>
                {translate('ui.edit')}{' '}
              </Button>
              {resource === 'fish' && row.active === true && (
                <Button
                  variant="danger"
                  onClick={() => {
                    open(row);
                    setArchiving(true);
                  }}
                >
                  {translate('admin.fish.archive')}
                </Button>
              )}
            </div>
          )}
        />
      )}
      <Modal
        open={!!selected || creating}
        onClose={() => {
          if (!save.isPending) {
            setSelected(null);
            setCreating(false);
          }
        }}
        title={
          archiving
            ? translate('admin.fish.archiveTitle', {
                name: String(selected?.name ?? ''),
              })
            : creating
              ? translate('ui.add.value', {
                  value0: title.toLocaleLowerCase(localeTag()),
                })
              : translate('ui.edit.value', {
                  value0: String(selected?.name ?? title),
                })
        }
        footer={
          <>
            <Button
              variant="secondary"
              disabled={save.isPending}
              onClick={() => {
                setSelected(null);
                setCreating(false);
              }}
            >
              {translate('ui.cancel')}{' '}
            </Button>
            <Button loading={save.isPending} type="submit" form={formId}>
              {translate('ui.save.log.change')}{' '}
            </Button>
          </>
        }
      >
        <Form
          id={formId}
          error={save.error}
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <Notice tone="warning">
            {translate(
              archiving
                ? 'admin.fish.archiveHelp'
                : 'ui.changes.apply.to.new.sessions.check.prices',
            )}{' '}
          </Notice>
          {archiving ? (
            <FishArt
              slug={String(selected?.slug ?? '')}
              imageKey={String(selected?.imageKey ?? '')}
              className={styles.fishPreview}
              live
            />
          ) : creating && resource !== 'fish' ? (
            <FormField
              label={translate('ui.new.item.definition.json')}
              required
              help={translate('ui.enter.a.unique.slug.the.server.generates')}
            >
              <Textarea
                name="item"
                value={json}
                onChange={(e) => setJson(e.target.value)}
                rows={14}
              />
            </FormField>
          ) : (
            (creating && resource === 'fish'
              ? [
                  ...fields.filter((f) => f.type !== 'boolean'),
                  ...fishCreationFields(),
                ]
              : fields
            ).map((f) =>
              f.type === 'boolean' ? (
                <Checkbox
                  key={f.key}
                  name={f.key}
                  label={f.label}
                  checked={!!form[f.key]}
                  onChange={(e) =>
                    setForm({ ...form, [f.key]: e.target.checked })
                  }
                />
              ) : f.type === 'image' ? (
                <FishImageField
                  key={f.key}
                  file={photoFile}
                  onFile={setPhotoFile}
                  disabled={save.isPending}
                  value={String(form.imageKey ?? '')}
                  onChange={(imageKey) => setForm({ ...form, imageKey })}
                />
              ) : f.type === 'waterTypes' ? (
                <FormField
                  key={f.key}
                  label={f.label}
                  required
                  help={translate('admin.fish.waterTypesHelp')}
                >
                  <Select
                    name={f.key}
                    multiple
                    value={
                      Array.isArray(form.waterTypes)
                        ? (form.waterTypes as string[])
                        : []
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        waterTypes: Array.from(
                          event.target.selectedOptions,
                          (option) => option.value,
                        ),
                      })
                    }
                  >
                    {waterTypes.map((water) => (
                      <option key={water} value={water}>
                        {translate(`water.${water}`)}
                      </option>
                    ))}
                  </Select>
                </FormField>
              ) : f.type === 'rarity' ? (
                <FormField key={f.key} label={f.label} required>
                  <Select
                    name={f.key}
                    value={String(form[f.key] ?? 'COMMON')}
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                  >
                    {rarities.map((r) => (
                      <option key={r} value={r}>
                        {rarityLabel(r)}
                      </option>
                    ))}
                  </Select>
                </FormField>
              ) : f.type === 'textarea' ? (
                <FormField key={f.key} label={f.label}>
                  <Textarea
                    name={f.key}
                    maxLength={resource === 'fish' ? 1000 : 500}
                    value={String(form[f.key] ?? '')}
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                  />
                </FormField>
              ) : (
                <FormField key={f.key} label={f.label} required>
                  <Input
                    name={f.key}
                    value={String(form[f.key] ?? '')}
                    type={f.type === 'number' ? 'number' : 'text'}
                    inputMode={f.type === 'gold' ? 'numeric' : undefined}
                    pattern={f.type === 'gold' ? '[0-9]{1,9}' : undefined}
                    minLength={f.type === 'gold' || !f.type ? 1 : undefined}
                    maxLength={
                      f.maxLength ??
                      (f.type === 'gold'
                        ? 9
                        : !f.type || f.type === 'list'
                          ? 100
                          : undefined)
                    }
                    placeholder={
                      f.type === 'list'
                        ? translate('admin.fish.preferredBaitsPlaceholder')
                        : undefined
                    }
                    step={
                      [
                        'power',
                        'control',
                        'spawnWeight',
                        'pullStrength',
                      ].includes(f.key)
                        ? 'any'
                        : 1
                    }
                    min={
                      f.key === 'baseWeightG'
                        ? Number(form.minWeightG) || f.min
                        : f.key === 'maxWeightG'
                          ? Number(form.baseWeightG) || f.min
                          : f.min
                    }
                    max={
                      f.key === 'baseWeightG'
                        ? Number(form.maxWeightG) || f.max
                        : f.key === 'minWeightG'
                          ? Number(form.baseWeightG) || f.max
                          : f.max
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [f.key]:
                          f.type === 'number' && e.target.value !== ''
                            ? Number(e.target.value)
                            : e.target.value,
                      })
                    }
                  />
                </FormField>
              ),
            )
          )}
          <FormField
            label={translate('ui.reason.for.change')}
            required
            help={translate('ui.at.least.5.characters.saved.with.the')}
          >
            <Input
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={5}
              maxLength={1000}
              placeholder={translate(
                'ui.for.example.balance.adjustment.after.testing',
              )}
            />
          </FormField>
          <FormError error={save.error} />
        </Form>
      </Modal>
    </>
  );
}
function UsersPage() {
  useI18n();
  const formId = useId();
  const query = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.request<List>('/admin/users'),
  });
  const player = useAuth((s) => s.player)!;
  const [selected, setSelected] = useState<Row | null>(null);
  const [action, setAction] = useState<'revoke' | 'status'>('revoke');
  const [reason, setReason] = useState('');
  const toast = useToast();
  const mutate = useMutation({
    mutationFn: () =>
      api.request(
        `/admin/users/${selected!.id}/${action === 'revoke' ? 'revoke-sessions' : 'status'}`,
        {
          method: action === 'revoke' ? 'POST' : 'PATCH',
          body: {
            reason,
            ...(action === 'status'
              ? {
                  status:
                    selected!.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                }
              : {}),
          },
        },
      ),
    onSuccess: async () => {
      setSelected(null);
      await query.refetch();
      toast(translate('ui.updated.and.recorded.in.the.audit.log'));
    },
  });
  const rows =
    query.data?.items.map((i) => ({
      ...i,
      username: (i.profile as Row | undefined)?.username,
      role: (i.admin as Row | undefined)?.role ?? 'PLAYER',
    })) ?? [];
  return (
    <>
      <PageHeader
        eyebrow={translate('ui.community.management')}
        title={translate('ui.friends.by.the.lake')}
        description={translate('ui.shows.up.to.100.recent.accounts.passwords')}
      />
      {query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <DataTable
          rows={rows}
          columns={['username', 'status', 'role', 'createdAt']}
          search={translate('admin.search.players')}
          searchFields={['id']}
          action={(row) => (
            <div className={styles.rowActions}>
              {['SUPER_ADMIN', 'SUPPORT'].includes(player.role) && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelected(row);
                    setAction('revoke');
                    setReason('');
                    mutate.reset();
                  }}
                >
                  {translate('ui.revoke.sessions')}{' '}
                </Button>
              )}
              {player.role === 'SUPER_ADMIN' && row.id !== player.id && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelected(row);
                    setAction('status');
                    setReason('');
                    mutate.reset();
                  }}
                >
                  {row.status === 'ACTIVE'
                    ? translate('ui.suspend')
                    : translate('ui.reactivate')}
                </Button>
              )}
            </div>
          )}
        />
      )}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={
          action === 'revoke'
            ? translate('ui.revoke.login.sessions')
            : translate('ui.change.account.status')
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              {translate('ui.cancel')}{' '}
            </Button>
            <Button
              variant="danger"
              loading={mutate.isPending}
              type="submit"
              form={formId}
            >
              {translate('ui.confirm.change')}{' '}
            </Button>
          </>
        }
      >
        <Form
          id={formId}
          error={mutate.error}
          onSubmit={(event) => {
            event.preventDefault();
            mutate.mutate();
          }}
        >
          <Notice tone="warning">
            {translate('ui.this.action.applies.to')}{' '}
            {String(
              selected?.username ?? selected?.id ?? translate('ui.account'),
            )}
            {translate('ui.login.sessions.will.be.revoked')}{' '}
          </Notice>
          <FormField label={translate('ui.reason.for.action')} required>
            <Input
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={5}
              maxLength={1000}
            />
          </FormField>
          <FormError error={mutate.error} />
        </Form>
      </Modal>
    </>
  );
}
function ConfigPage() {
  useI18n();
  const formId = useId();
  const query = useQuery({
    queryKey: ['admin', 'configs'],
    queryFn: () => api.request<List>('/admin/configs'),
  });
  const player = useAuth((s) => s.player)!;
  const [mode, setMode] = useState<'draft' | 'publish' | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [json, setJson] = useState('');
  const [reason, setReason] = useState('');
  const toast = useToast();
  const active = query.data?.items.find((i) => i.isActive);
  const save = useMutation({
    mutationFn: () => {
      if (mode === 'draft') {
        let value: unknown;
        try {
          value = JSON.parse(json);
        } catch {
          throw new ApiError(
            'VALIDATION_ERROR',
            translate('ui.review.the.configuration.before.saving'),
            400,
            undefined,
            { value: [translate('ui.invalid.json.check.brackets.and.commas')] },
          );
        }
        return api.request('/admin/configs/game/versions', {
          method: 'POST',
          body: {
            value,
            schemaVersion: 1,
            reason,
          },
        });
      }
      return api.request(
        `/admin/configs/game/versions/${selected!.version}/publish`,
        {
          method: 'POST',
          body: { expectedActiveVersion: active?.version, reason },
        },
      );
    },
    onSuccess: async () => {
      setMode(null);
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast(translate('ui.configuration.saved.and.recorded.in.the.audit'));
    },
  });
  return (
    <>
      <PageHeader
        eyebrow={translate('ui.controlled.adjustments')}
        title={translate('ui.versioned.configuration')}
        description={translate(
          'ui.create.a.draft.validate.the.full.definition',
        )}
        action={
          <Button
            disabled={!active}
            onClick={() => {
              setMode('draft');
              setJson(JSON.stringify(active?.value ?? {}, null, 2));
              setReason('');
              save.reset();
            }}
          >
            <Plus size={16} />
            {translate('ui.create.draft')}{' '}
          </Button>
        }
      />
      {query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <DataTable
          rows={query.data.items}
          columns={['version', 'isActive', 'publishedAt', 'createdAt']}
          action={(row) => (
            <div className={styles.rowActions}>
              <Button
                variant="secondary"
                onClick={() => {
                  setSelected(row);
                  setJson(JSON.stringify(row.value, null, 2));
                  setMode('draft');
                  setReason('');
                  save.reset();
                }}
              >
                {translate('ui.copy.draft')}{' '}
              </Button>
              {!row.publishedAt && player.role === 'SUPER_ADMIN' && (
                <Button
                  onClick={() => {
                    setSelected(row);
                    setMode('publish');
                    setReason('');
                    save.reset();
                  }}
                >
                  {translate('ui.publish')}{' '}
                </Button>
              )}
            </div>
          )}
        />
      )}
      <Modal
        open={!!mode}
        onClose={() => {
          if (!save.isPending) setMode(null);
        }}
        title={
          mode === 'draft'
            ? translate('ui.prepare.a.new.draft')
            : translate('ui.publish.configuration')
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setMode(null)}
              disabled={save.isPending}
            >
              {translate('ui.cancel')}{' '}
            </Button>
            <Button loading={save.isPending} type="submit" form={formId}>
              {mode === 'draft'
                ? translate('ui.save.draft')
                : translate('ui.confirm.publication')}
            </Button>
          </>
        }
      >
        <Form
          id={formId}
          error={save.error}
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          {mode === 'draft' ? (
            <FormField
              label={translate('ui.game.configuration.json')}
              required
              help={translate(
                'ui.the.server.validates.the.schema.references.pools',
              )}
            >
              <Textarea
                name="value"
                rows={18}
                value={json}
                onChange={(e) => setJson(e.target.value)}
              />
            </FormField>
          ) : (
            <Notice tone="warning">
              {translate('ui.you.will.replace.active.configuration.v')}
              {String(active?.version)} {translate('ui.with.v')}
              {String(selected?.version)}
              {translate(
                'ui.version.conflicts.are.checked.and.the.change',
              )}{' '}
            </Notice>
          )}
          <FormField label={translate('ui.reason.for.change')} required>
            <Input
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={5}
              maxLength={1000}
            />
          </FormField>
          <FormError error={save.error} />
        </Form>
      </Modal>
    </>
  );
}
function OperationsPage() {
  useI18n();
  const { resource = 'audit-logs' } = useParams();
  const audit = resource === 'audit-logs';
  const query = useQuery({
    queryKey: ['admin', resource],
    queryFn: async (): Promise<List> => {
      if (audit) return api.request<List>(`/admin/${resource}`);
      const data = await api.request<{ items: AdminWalletTransactionDto[] }>(
        `/admin/${resource}`,
      );
      return {
        items: data.items.map((row) => ({ ...row, walletOwner: row.username })),
      };
    },
  });
  const [selected, setSelected] = useState<Row | null>(null);
  return (
    <>
      <PageHeader
        eyebrow={translate('ui.operations.data')}
        title={
          audit
            ? translate('ui.every.change.leaves.a.trace')
            : translate('ui.gold.ledger.2')
        }
        description={
          audit
            ? translate('ui.an.immutable.log.of.who.acted.targets')
            : translate('ui.every.source.and.sink.is.recorded.wallet')
        }
      />
      <Notice>
        {translate('ui.shows.up.to.100.recent.records.sensitive')}{' '}
      </Notice>
      {query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <DataTable
          key={resource}
          rows={query.data.items}
          search={translate('admin.search.records')}
          searchFields={[
            'id',
            'walletId',
            'userId',
            'username',
            'targetId',
            'actorId',
            'referenceId',
          ]}
          columns={
            audit
              ? ['createdAt', 'action', 'targetType', 'reason']
              : [
                  'createdAt',
                  'walletOwner',
                  'reason',
                  'deltaGold',
                  'balanceAfterGold',
                ]
          }
          action={(row) => (
            <Button variant="secondary" onClick={() => setSelected(row)}>
              {translate('ui.details')}{' '}
            </Button>
          )}
        />
      )}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={translate('ui.record.details')}
      >
        {selected && (
          <dl>
            {(audit
              ? ['createdAt', 'action', 'targetType', 'reason']
              : [
                  'username',
                  'userId',
                  'walletId',
                  'createdAt',
                  'reason',
                  'deltaGold',
                  'balanceAfterGold',
                  'referenceType',
                  'referenceId',
                ]
            )
              .filter((key) => selected[key] !== undefined)
              .map((key) => (
                <div key={key}>
                  <dt>{labels()[key] ?? key}</dt>
                  <dd>{printable(selected[key], key)}</dd>
                </div>
              ))}
          </dl>
        )}
        <details>
          <summary>{translate('admin.audit.raw')}</summary>
          <pre className={styles.recordJson}>
            {JSON.stringify(selected, null, 2)}
          </pre>
        </details>
      </Modal>
    </>
  );
}
type PaymentProductRow = {
  id: string;
  name: string;
  description: string;
  amountVnd: string;
  active: boolean;
  version: number;
  items: unknown;
};
function PaymentAdminPage() {
  useI18n();
  const superAdmin = useAuth((s) => s.player?.role === 'SUPER_ADMIN');
  const [filters, setFilters] = useState(''),
    [cursor, setCursor] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<PaymentProductRow | 'new' | null>(null);
  const [localError, setLocalError] = useState<Error | null>(null);
  const [productKey, setProductKey] = useState(crypto.randomUUID());
  const toast = useToast(),
    productFormId = useId();
  const query = useQuery({
    queryKey: ['admin-payments', filters, cursor],
    queryFn: () =>
      api.request<{
        items: (PaymentOrderDto & { userId: string })[];
        nextCursor: string | null;
      }>(
        `/admin/payments/orders?${filters}${cursor ? `&cursor=${cursor}` : ''}`,
      ),
  });
  const report = useQuery({
    queryKey: ['admin-payment-report', filters],
    queryFn: () =>
      api.request<{
        revenueVnd: string;
        receivedVnd: string;
        counts: Record<string, number>;
        fulfillmentBacklog: number;
      }>(`/admin/payments/report?${filters}`),
  });
  const detail = useQuery({
    queryKey: ['admin-payment-detail', selectedId],
    enabled: !!selectedId,
    queryFn: () =>
      api.request<PaymentAdminDetail>(`/admin/payments/orders/${selectedId}`),
  });
  const products = useQuery({
    queryKey: ['admin-payment-products'],
    enabled: superAdmin,
    queryFn: () =>
      api.request<{ items: PaymentProductRow[] }>('/admin/payments/products'),
  });
  const reconcile = useMutation({
    mutationFn: (reason: string) =>
      api.request(`/admin/payments/orders/${selectedId}/reconcile`, {
        method: 'POST',
        body: { reason },
      }),
    onSuccess: async () => {
      await Promise.all([query.refetch(), detail.refetch(), report.refetch()]);
    },
  });
  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.request(
        editor && editor !== 'new'
          ? `/admin/payments/products/${editor.id}`
          : '/admin/payments/products',
        {
          method: editor !== 'new' ? 'PATCH' : 'POST',
          idempotencyKey: productKey,
          body,
        },
      ),
    onSuccess: async () => {
      await products.refetch();
      setEditor(null);
      toast(translate('payments.saved'));
    },
  });
  const openEditor = (product: PaymentProductRow | 'new') => {
    setEditor(product);
    setLocalError(null);
    setProductKey(crypto.randomUUID());
    save.reset();
  };
  const edit = editor && editor !== 'new' ? editor : null;
  const columns = {
    orderCode: translate('payments.order'),
    userId: translate('payments.userId'),
    productName: translate('payments.name'),
    totalAmount: translate('payments.total'),
    status: translate('payments.status'),
    gateway: translate('payments.gateway'),
    transactionId: translate('payments.transactionId'),
    createdAt: translate('ui.time'),
  };
  return (
    <div className={styles.paymentPage}>
      <PageHeader
        title={translate('payments.admin')}
        description={translate('payments.adminDescription')}
      />
      <section aria-label={translate('payments.summary')}>
        {report.isPending ? (
          <Card>
            <LoadingState />
          </Card>
        ) : report.error ? (
          <Card>
            <ErrorState
              error={report.error}
              retry={() => void report.refetch()}
            />
          </Card>
        ) : (
          <div className={styles.paymentSummary}>
            {[
              {
                icon: Wallet,
                label: translate('payments.revenue'),
                value: `${formatNumber(report.data.revenueVnd)} ₫`,
              },
              {
                icon: CircleCheck,
                label: translate('payments.received'),
                value: `${formatNumber(report.data.receivedVnd)} ₫`,
              },
              {
                icon: PackageCheck,
                label: translate('payments.backlog'),
                value: formatNumber(report.data.fulfillmentBacklog),
              },
            ].map(({ icon: Icon, label, value }) => (
              <Card key={label} className={styles.paymentMetric}>
                <span className={styles.paymentMetricIcon}>
                  <Icon size={20} aria-hidden />
                </span>
                <small>{label}</small>
                <strong>{value}</strong>
              </Card>
            ))}
          </div>
        )}
      </section>
      <Card className={styles.paymentOrders}>
        <div className={styles.paymentSectionHeader}>
          <PageHeader titleAs="h2" title={translate('payments.history')} />
        </div>
        <Form
          className={styles.paymentFilters}
          onReset={() => {
            setFilters('');
            setCursor('');
          }}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget),
              params = new URLSearchParams();
            for (const name of ['userId', 'gateway', 'status']) {
              const value = String(data.get(name) ?? '').trim();
              if (value) params.set(name, value);
            }
            const from = String(data.get('from') ?? ''),
              to = String(data.get('to') ?? '');
            if (from)
              params.set(
                'from',
                new Date(`${from}T00:00:00+07:00`).toISOString(),
              );
            if (to)
              params.set(
                'to',
                new Date(`${to}T23:59:59.999+07:00`).toISOString(),
              );
            setFilters(params.toString());
            setCursor('');
          }}
        >
          <FormField label={translate('payments.userId')}>
            <Input
              name="userId"
              placeholder={translate('payments.userIdPlaceholder')}
              pattern="[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}"
            />
          </FormField>
          <FormField label={translate('payments.gateway')}>
            <Select name="gateway">
              <option value="">{translate('payments.all')}</option>
              <option value="MOMO">MoMo</option>
              <option value="VNPAY">VNPay</option>
            </Select>
          </FormField>
          <FormField label={translate('payments.status')}>
            <Select name="status">
              <option value="">{translate('payments.all')}</option>
              {paymentOrderStatuses.map((status) => (
                <option key={status} value={status}>
                  {translate(`payments.${status}`)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={translate('payments.from')}>
            <Input name="from" type="date" />
          </FormField>
          <FormField label={translate('payments.to')}>
            <Input name="to" type="date" />
          </FormField>
          <BottomActions>
            <Button variant="ghost" type="reset">
              {translate('payments.reset')}
            </Button>
            <Button type="submit">
              <ListFilter size={16} aria-hidden />
              {translate('payments.filter')}
            </Button>
          </BottomActions>
        </Form>
        {report.data && !report.error && (
          <div
            className={styles.paymentStatuses}
            aria-label={translate('payments.status')}
          >
            {paymentOrderStatuses.map((status) => (
              <Badge
                key={status}
                tone={
                  status === 'PAID'
                    ? 'success'
                    : status === 'FAILED'
                      ? 'danger'
                      : 'neutral'
                }
              >
                {translate(`payments.${status}`)}:{' '}
                {formatNumber(report.data.counts[status] ?? 0)}
              </Badge>
            ))}
          </div>
        )}
        {query.isPending ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : (
          <>
            <DataTable
              emptyState={
                <EmptyState
                  compact
                  icon={<ReceiptText size={26} aria-hidden />}
                  title={translate('payments.emptyOrders')}
                  description={translate('payments.emptyOrdersHint')}
                />
              }
              rows={query.data.items.map((item) => ({
                ...item,
                totalAmount: `${formatNumber(item.totalAmount)} ₫`,
                status: translate(`payments.${item.status}`),
              }))}
              columns={Object.keys(columns)}
              columnLabels={columns}
              action={(row) => (
                <Button
                  variant="secondary"
                  onClick={() => {
                    reconcile.reset();
                    setSelectedId(String(row.id));
                  }}
                >
                  {translate('payments.detail')}
                </Button>
              )}
            />
            {(cursor || query.data.nextCursor) && (
              <BottomActions>
                {cursor && (
                  <Button variant="secondary" onClick={() => setCursor('')}>
                    {translate('ui.back')}
                  </Button>
                )}
                {query.data.nextCursor && (
                  <Button onClick={() => setCursor(query.data.nextCursor!)}>
                    {translate('payments.more')}
                  </Button>
                )}
              </BottomActions>
            )}
          </>
        )}
      </Card>
      {superAdmin && (
        <section className={styles.paymentCatalog}>
          <PageHeader
            titleAs="h2"
            title={translate('payments.products')}
            action={
              <Button onClick={() => openEditor('new')}>
                <Plus size={16} aria-hidden />
                {translate('payments.addProduct')}
              </Button>
            }
          />
          {products.isPending ? (
            <LoadingState />
          ) : products.error ? (
            <ErrorState
              error={products.error}
              retry={() => void products.refetch()}
            />
          ) : (
            <DataTable
              rows={products.data.items}
              emptyState={
                <EmptyState
                  compact
                  icon={<PackageCheck size={26} aria-hidden />}
                  title={translate('payments.emptyProducts')}
                  description={translate('payments.emptyProductsHint')}
                />
              }
              columns={['name', 'amountVnd', 'active', 'version']}
              columnLabels={{
                name: translate('payments.name'),
                amountVnd: translate('payments.price'),
                active: translate('payments.active'),
              }}
              action={(row) => (
                <Button
                  variant="secondary"
                  onClick={() => openEditor(row as PaymentProductRow)}
                >
                  {translate('ui.edit')}
                </Button>
              )}
            />
          )}
        </section>
      )}
      <Modal
        open={!!selectedId}
        title={translate('payments.detail')}
        onClose={() => {
          if (!reconcile.isPending) setSelectedId(null);
        }}
      >
        {detail.isPending ? (
          <LoadingState />
        ) : detail.error ? (
          <ErrorState
            error={detail.error}
            retry={() => void detail.refetch()}
          />
        ) : (
          detail.data && (
            <>
              <p className={styles.mono}>{detail.data.order.orderCode}</p>
              <Badge
                tone={
                  detail.data.order.status === 'PAID' ? 'success' : 'neutral'
                }
              >
                {translate(`payments.${detail.data.order.status}`)}
              </Badge>
              <p>
                {translate('payments.userId')}: {detail.data.userId}
              </p>
              <p>
                {formatNumber(detail.data.order.totalAmount)} ₫ ·{' '}
                {detail.data.order.gateway} · {detail.data.order.transactionId}
              </p>
              <h3>{translate('payments.response')}</h3>
              <pre className={styles.recordJson}>
                {JSON.stringify(detail.data.transaction, null, 2)}
              </pre>
              <h3>{translate('payments.webhooks')}</h3>
              <pre className={styles.recordJson}>
                {JSON.stringify(detail.data.webhooks, null, 2)}
              </pre>
              <h3>{translate('payments.fulfillments')}</h3>
              <pre className={styles.recordJson}>
                {JSON.stringify(detail.data.fulfillments, null, 2)}
              </pre>
              <h3>{translate('payments.retry')}</h3>
              <pre className={styles.recordJson}>
                {JSON.stringify(detail.data.retries, null, 2)}
              </pre>
              {superAdmin && (
                <Form
                  error={reconcile.error}
                  onSubmit={(event) => {
                    event.preventDefault();
                    reconcile.mutate(
                      String(new FormData(event.currentTarget).get('reason')),
                    );
                  }}
                >
                  <Notice tone="info">
                    {translate('payments.reconcileHelp')}
                  </Notice>
                  <FormField label={translate('payments.reason')} required>
                    <Input
                      name="reason"
                      required
                      minLength={5}
                      maxLength={1000}
                    />
                  </FormField>
                  <FormError error={reconcile.error} />
                  <BottomActions>
                    <Button type="submit" loading={reconcile.isPending}>
                      {translate('payments.reconcile')}
                    </Button>
                  </BottomActions>
                </Form>
              )}
            </>
          )
        )}
      </Modal>
      <Modal
        open={!!editor}
        title={translate(edit ? 'payments.editProduct' : 'payments.addProduct')}
        onClose={() => {
          if (!save.isPending) setEditor(null);
        }}
        footer={
          <Button type="submit" form={productFormId} loading={save.isPending}>
            {translate('payments.save')}
          </Button>
        }
      >
        {editor && (
          <Form
            key={typeof editor === 'string' ? editor : editor.id}
            id={productFormId}
            error={localError ?? save.error}
            onChange={() => setProductKey(crypto.randomUUID())}
            onSubmit={(event) => {
              event.preventDefault();
              setLocalError(null);
              const data = new FormData(event.currentTarget);
              let items: unknown;
              try {
                items = JSON.parse(String(data.get('items')));
              } catch {
                setLocalError(
                  new ApiError(
                    'INVALID_ITEMS',
                    translate('payments.invalidItems'),
                    400,
                    undefined,
                    { items: [translate('payments.invalidItems')] },
                  ),
                );
                return;
              }
              save.mutate({
                name: data.get('name'),
                description: data.get('description'),
                amountVnd: data.get('amountVnd'),
                active: data.get('active') === 'on',
                items,
                ...(edit ? { expectedVersion: edit.version } : {}),
                reason: data.get('reason'),
              });
            }}
          >
            <FormField label={translate('payments.name')} required>
              <Input
                name="name"
                required
                maxLength={120}
                defaultValue={edit?.name ?? ''}
                disabled={save.isPending}
              />
            </FormField>
            <FormField label={translate('payments.description')} required>
              <Textarea
                name="description"
                required
                maxLength={1000}
                defaultValue={edit?.description ?? ''}
                disabled={save.isPending}
              />
            </FormField>
            <FormField label={translate('payments.price')} required>
              <Input
                name="amountVnd"
                type="number"
                required
                min={1000}
                max={999999999}
                step={1}
                defaultValue={edit?.amountVnd ?? ''}
                disabled={save.isPending}
              />
            </FormField>
            <FormField
              label={translate('payments.items')}
              help={translate('payments.itemsHelp')}
              required
            >
              <Textarea
                name="items"
                required
                rows={6}
                defaultValue={
                  edit
                    ? JSON.stringify(edit.items, null, 2)
                    : '[\n  {"itemId":"", "kind":"BAIT", "quantity":10}\n]'
                }
                disabled={save.isPending}
              />
            </FormField>
            <Checkbox
              name="active"
              label={translate('payments.active')}
              defaultChecked={edit?.active ?? false}
              disabled={save.isPending}
            />
            <FormField label={translate('payments.reason')} required>
              <Input
                name="reason"
                required
                minLength={5}
                maxLength={1000}
                disabled={save.isPending}
              />
            </FormField>
            <FormError error={localError ?? save.error} />
          </Form>
        )}
      </Modal>
    </div>
  );
}

function FashionAdminRoute() {
  const canEdit = useAuth((s) =>
    ['SUPER_ADMIN', 'GAME_ADMIN'].includes(s.player?.role ?? ''),
  );
  return <FashionAdminPage api={api} canEdit={canEdit} />;
}
function App() {
  useI18n();
  return (
    <>
      <DocumentTitle />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Shell />}>
          <Route index element={<OverviewPage />} />
          <Route path="analytics" element={<OverviewPage analytics />} />
          <Route path="fashion" element={<FashionAdminRoute />} />
          <Route path="payments" element={<PaymentAdminPage />} />
          <Route path="data/:resource" element={<ResourcePage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="configs" element={<ConfigPage />} />
          <Route path="operations/:resource" element={<OperationsPage />} />
          <Route
            path="*"
            element={
              <EmptyState title={translate('ui.operations.area.not.found')} />
            }
          />
        </Route>
      </Routes>
    </>
  );
}
void bootstrap();
const root: ReturnType<typeof createRoot> =
  import.meta.hot?.data.root ?? createRoot(document.getElementById('root')!);
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(
  <QueryClientProvider client={queryClient}>
    <ToastProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ToastProvider>
  </QueryClientProvider>,
);
