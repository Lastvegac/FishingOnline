import { t as translate, useI18n, localeTag } from '@fwo/ui';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  Link,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import {
  Anchor,
  ArrowLeft,
  ArrowRight,
  Award,
  Backpack,
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  Fish,
  Flag,
  Home,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  Settings,
  ShoppingBag,
  Sprout,
  Target,
  Trophy,
  Waves,
} from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
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
  PasswordInput,
  Progress,
  useToast,
} from '@fwo/ui';
import type { OtpChallengeDto, PlayerDto } from '@fwo/contracts';
import { ApiError } from '@fwo/ui';
import {
  ChannelTabs,
  GoogleSignIn,
  IdentifierField,
  OtpForm,
} from './verification';
import type { SignInChannel } from './verification';
import {
  api,
  bootstrap,
  queryClient,
  useAuth,
  useMissions,
  usePreferences,
} from './data';
import {
  CollectionPage,
  InventoryPage,
  LeaderboardPage,
  MapPage,
  MissionsPage,
  ProfilePage,
  SettingsPage,
  ShopPage,
} from './pages';
import { LakeArt } from './art';
import { PaymentUpdates, PaymentsPage } from './payments';
import { PlayerAvatar } from './PlayerAvatar';
import { PlayerProgress } from './PlayerProgress';
import styles from './app.module.css';
import { useCharacter } from './character-data';
const CharacterPage = lazy(() => import('./CharacterPage'));
const FishingPage = lazy(() => import('./game/FishingPage'));
const navigation = () => [
  {
    to: '/play',
    label: translate('ui.your.lakeside.corner'),
    icon: Home,
    end: true,
  },
  {
    to: '/play/map',
    label: translate('ui.explore.fishing.lakes'),
    icon: Compass,
  },
  {
    to: '/play/inventory',
    label: translate('ui.bag.equipment'),
    icon: Backpack,
  },
  {
    to: '/play/collection',
    label: translate('ui.fish.journal'),
    icon: BookOpen,
  },
  { to: '/play/character', label: translate('character.studio'), icon: Sprout },
  { to: '/play/shop', label: translate('ui.fishing.shop'), icon: ShoppingBag },
  { to: '/play/missions', label: translate('ui.daily.missions'), icon: Flag },
  { to: '/play/leaderboard', label: translate('ui.leaderboard'), icon: Trophy },
];
export function Brand({
  light = false,
  to = '/',
}: {
  light?: boolean;
  to?: string;
}) {
  useI18n();
  return (
    <Link
      to={to}
      aria-label={translate('ui.fishing.world.online.home')}
      className={`${styles.brand} ${light ? styles.brandLight : ''}`}
    >
      <img
        className={styles.brandIcon}
        src="/icon.svg"
        alt=""
        width={36}
        height={36}
      />
      <span>
        fishing world<small>{translate('ui.online.vietnam')}</small>
      </span>
    </Link>
  );
}
function Shell() {
  useI18n();
  const { player, ready, restoreError } = useAuth();
  const character = useCharacter();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const primaryNavigation = navigation().slice(0, 4);
  const moreActive =
    location.pathname !== '/play' &&
    !primaryNavigation
      .slice(1)
      .some(({ to }) => location.pathname.startsWith(to));
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);
  if (!ready) return <LoadingState />;
  if (!player && restoreError)
    return <ErrorState error={restoreError} retry={() => void bootstrap()} />;
  if (!player) return <Navigate to="/login" replace />;
  if (character.isPending) return <LoadingState />;
  if (character.error && !character.data)
    return (
      <ErrorState
        error={character.error}
        retry={() => void character.refetch()}
      />
    );
  if (!character.data && location.pathname !== '/play/character')
    return <Navigate to="/play/character" replace />;
  const logout = async () => {
    try {
      await api.request('/auth/logout', { method: 'POST', body: {} });
      api.setToken(null);
      useAuth.getState().setPlayer(null);
      queryClient.clear();
      navigate('/');
    } catch (e) {
      toast((e as Error).message, 'danger');
    }
  };
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <Brand light to="/play" />
        <div className={styles.sideEyebrow}>
          {translate('ui.a.little.journey')}
        </div>
        <nav aria-label={translate('ui.main.navigation')}>
          {navigation().map(({ to, label, icon: Icon, end }) => (
            <NavLink
              end={end}
              to={to}
              key={to}
              aria-label={label}
              title={label}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navActive : ''}`
              }
            >
              <Icon size={18} strokeWidth={1.65} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarNote}>
          <Sprout size={24} strokeWidth={1.3} />
          <p>
            {translate('ui.slow.down.a.little')} <br />
            {translate('ui.the.lake.is.still.here.waiting.for')}{' '}
          </p>
        </div>
        <div className={styles.sideFooter}>
          <NavLink
            className={styles.navItem}
            to="/"
            end
            aria-label={translate('navigation.projectHome')}
            title={translate('navigation.projectHome')}
          >
            <Home size={17} />
            <span>{translate('navigation.projectHome')}</span>
          </NavLink>
          <NavLink
            className={styles.navItem}
            to="/play/settings"
            aria-label={translate('ui.settings')}
            title={translate('ui.settings')}
          >
            <Settings size={17} />
            <span>{translate('ui.settings')}</span>
          </NavLink>
          <Button
            variant="ghost"
            className={styles.navItem}
            onClick={logout}
            aria-label={translate('ui.log.out')}
            title={translate('ui.log.out')}
          >
            <LogOut size={17} />
            <span>{translate('ui.log.out')}</span>
          </Button>
        </div>
      </aside>
      <div className={styles.mainWrap}>
        <header className={styles.topbar}>
          <div className={styles.mobileBrand}>
            <Brand to="/play" />
          </div>
          <div className={styles.breadcrumb}>
            <Leaf size={15} />
            <span>{translate('ui.a.lovely.day.to.go.fishing')}</span>
          </div>
          <div className={styles.topbarRight}>
            <LanguageSelector />
            <div className={styles.wallet}>
              <CurrencyAmount value={player.gold} />
            </div>
            <Link
              to="/play/profile"
              className={styles.userChip}
              aria-label={translate('ui.value.s.profile', {
                value0: player.username,
              })}
            >
              <PlayerAvatar
                avatarKey={player.avatarKey}
                username={player.username}
              />
              <span>
                <span className={styles.userChipName}>{player.username}</span>
                <small>
                  {translate('profile.currentLevel', { level: player.level })}
                </small>
                {player.levelProgress && (
                  <small>
                    {translate('profile.xpRemaining', {
                      xp: player.levelProgress.remainingXp.toLocaleString(
                        localeTag(),
                      ),
                      level: player.levelProgress.nextLevel,
                    })}
                  </small>
                )}
              </span>
              <ChevronRight size={15} />
            </Link>
          </div>
        </header>
        <main className={styles.main}>
          {location.pathname !== '/play' &&
            location.pathname !== '/play/fishing' && (
              <nav
                className={styles.pageNavigation}
                aria-label={translate('navigation.page')}
              >
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (window.history.state?.idx > 0) void navigate(-1);
                    else void navigate('/play');
                  }}
                >
                  <ArrowLeft size={18} aria-hidden="true" />
                  {translate('ui.back')}
                </Button>
                <Link to="/play">
                  <Home size={16} aria-hidden="true" />
                  {translate('ui.back.to.lobby.2')}
                </Link>
              </nav>
            )}
          <PaymentUpdates />
          <Suspense
            fallback={<LoadingState label={translate('ui.opening.the.lake')} />}
          >
            <div key={location.pathname} className="fwo-page-enter">
              <Outlet />
            </div>
          </Suspense>
        </main>
        <footer className={styles.footer}>
          <span>FISHING WORLD ONLINE</span>
          <span>{translate('ui.cast.a.line.unwind.make.a.memory')}</span>
          <span>{translate('ui.preview.gold.has.no.cash.value')}</span>
        </footer>
      </div>
      <nav
        className={styles.mobileNav}
        aria-label={translate('ui.mobile.navigation')}
      >
        {primaryNavigation.map(({ to, label, icon: Icon, end }, index) => (
          <NavLink
            end={end}
            key={to}
            to={to}
            aria-label={label}
            className={({ isActive }) =>
              isActive ? styles.mobileNavActive : ''
            }
          >
            <Icon size={20} />
            <span>
              {
                [
                  translate('navigation.home'),
                  translate('navigation.explore'),
                  translate('navigation.bag'),
                  translate('navigation.journal'),
                ][index]
              }
            </span>
          </NavLink>
        ))}
        <Button
          variant="ghost"
          aria-label={translate('ui.more.navigation')}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          className={moreActive ? styles.mobileNavActive : ''}
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={20} />
          <span>{translate('ui.more')}</span>
        </Button>
      </nav>
      <Modal
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={translate('ui.where.to.next')}
      >
        <nav className={styles.moreNav} aria-label={translate('ui.all.areas')}>
          {[
            ...navigation(),
            {
              to: '/play/profile',
              label: translate('ui.your.profile'),
              icon: Award,
            },
            {
              to: '/play/settings',
              label: translate('ui.settings'),
              icon: Settings,
            },
            { to: '/', label: translate('navigation.projectHome'), icon: Home },
          ].map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/play' || to === '/'}
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={18} />
              {label}
              <ChevronRight size={16} />
            </NavLink>
          ))}
          <Button
            variant="ghost"
            onClick={() => {
              setMenuOpen(false);
              void logout();
            }}
          >
            <LogOut size={18} />
            {translate('ui.log.out')}{' '}
          </Button>
        </nav>
        <div className={styles.menuLanguage}>
          <span>{translate('language.label')}</span>
          <LanguageSelector />
        </div>
      </Modal>
    </div>
  );
}
function Lobby() {
  useI18n();
  const player = useAuth((s) => s.player)!;
  const navigate = useNavigate();
  const missions = useMissions();
  return (
    <>
      <PageHeader
        eyebrow={translate('ui.your.lakeside.corner.2')}
        title={translate('ui.hi.value.ready.to.go.fishing', {
          value0: player.username,
        })}
        description={translate('ui.leave.the.rush.behind.one.rod.one')}
        action={
          <Badge tone="success">
            <span className={styles.statusDot} />
            {translate('ui.ready.to.cast')}{' '}
          </Badge>
        }
      />
      <div className={styles.lobbyGrid}>
        <section className={styles.lakeHero}>
          <LakeArt />
          <div className={styles.heroOverlay} />
          <div className={styles.lakeHeroTop}>
            <span className={styles.sceneBadge}>
              <MapPin size={12} />
              {translate('ui.your.first.destination')}{' '}
            </span>
            <span className={styles.weather}>
              <Leaf size={14} />
              {translate('ui.peace.by.the.water')}{' '}
            </span>
          </div>
          <div className={styles.lakeHeroContent}>
            <span className={styles.locationTag}>
              {translate('ui.freshwater.lake.vietnam')}
            </span>
            <h2>{translate('ui.lotus.lake')}</h2>
            <p>
              {translate('ui.where.an.angler.s.journey.begins')} <br />
              {translate('ui.perhaps.a.new.record.is.waiting.for')}{' '}
            </p>
            <div className={styles.heroBottom}>
              <Button onClick={() => navigate('/play/fishing')}>
                <Anchor size={16} />
                {translate('ui.go.fishing')} <ArrowRight size={15} />
              </Button>
              <span>{translate('ui.free.entry.level.1')}</span>
            </div>
          </div>
        </section>
        <Card className={styles.journalCard}>
          <div className={styles.sectionTop}>
            <span className={styles.smallHeading}>
              {translate('ui.angler.s.journal')}
            </span>
            <Sprout size={18} />
          </div>
          <div className={styles.profileSummary}>
            <PlayerAvatar
              avatarKey={player.avatarKey}
              username={player.username}
              className={styles.profileAvatar}
            />
            <h3>{player.username}</h3>
          </div>
          <PlayerProgress player={player} />
          <Button
            variant="secondary"
            onClick={() => navigate('/play/profile#profile-avatar')}
          >
            {translate('profile.changeAvatar')}
          </Button>
          <div className={styles.journalStats}>
            <div>
              <Fish size={19} />
              <strong>{player.totalFish}</strong>
              <span>{translate('ui.fish.caught')}</span>
            </div>
            <div>
              <Award size={19} />
              <strong>
                {player.largestFishG
                  ? `${(player.largestFishG / 1000).toLocaleString(localeTag())} kg`
                  : '—'}
              </strong>
              <span>{translate('ui.personal.best')}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            className={styles.textLink}
            onClick={() => navigate('/play/profile')}
          >
            {translate('ui.view.your.profile')} <ArrowRight size={14} />
          </Button>
        </Card>
      </div>
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.smallHeading}>
            {translate('ui.a.little.progress.every.day')}
          </span>
          <h2>{translate('ui.what.shall.we.do.today')}</h2>
        </div>
        <Link to="/play/missions" className={styles.textLink}>
          {translate('ui.all.missions')} <ArrowRight size={14} />
        </Link>
      </div>
      {missions.isPending ? (
        <LoadingState label={translate('ui.opening.the.mission.journal')} />
      ) : missions.error ? (
        <ErrorState
          error={missions.error}
          retry={() => void missions.refetch()}
        />
      ) : missions.data.items.length ? (
        <div className={styles.missionGrid}>
          {missions.data.items.slice(0, 3).map((m, i) => (
            <Card key={m.id} className={styles.missionCard}>
              <div className={styles.missionHead}>
                <span className={styles.missionIcon}>
                  {i === 0 ? (
                    <Fish size={20} />
                  ) : i === 1 ? (
                    <Target size={20} />
                  ) : (
                    <Flag size={20} />
                  )}
                </span>
                <CurrencyAmount value={m.rewardGold} />
              </div>
              <h3>{m.name}</h3>
              <p>{m.description}</p>
              <div className={styles.missionProgress}>
                <Progress value={m.progress} max={m.target} />
                <span>
                  {Math.min(m.progress, m.target)}/{m.target}
                </span>
              </div>
              <Button
                variant="ghost"
                className={styles.textLink}
                onClick={() => navigate('/play/missions')}
              >
                {m.claimedAt
                  ? translate('ui.reward.claimed')
                  : m.progress >= m.target
                    ? translate('ui.claim.reward')
                    : translate('ui.view.mission')}
                <ArrowRight size={13} />
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          compact
          title={translate('ui.a.peaceful.day')}
          description={translate('ui.there.are.no.active.missions.you.can')}
        />
      )}
      <div className={styles.discoverBanner}>
        <span className={styles.discoverIcon}>
          <BookOpen size={27} strokeWidth={1.4} />
        </span>
        <div>
          <span className={styles.smallHeading}>
            {translate('ui.a.journal.of.discoveries')}
          </span>
          <h3>{translate('ui.every.fish.has.its.own.story')}</h3>
          <p>
            {translate('ui.discover.friends.beneath.the.surface.and.fill')}{' '}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => navigate('/play/collection')}
        >
          {translate('ui.open.journal')} <ArrowRight size={14} />
        </Button>
      </div>
    </>
  );
}
function scrollToLandingSection(hash: string) {
  const section = document.getElementById(hash.slice(1));
  section?.focus({ preventScroll: true });
  section?.scrollIntoView({ block: 'start' });
}
function Landing() {
  useI18n();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const player = useAuth((s) => s.player);
  const reducedMotion = usePreferences((s) => s.reducedMotion);
  const landing = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (hash !== '#how' && hash !== '#journey') return;
    scrollToLandingSection(hash);
  }, [hash]);
  const onSectionClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    const nextHash = event.currentTarget.hash;
    if (nextHash === hash) scrollToLandingSection(nextHash);
    else void navigate(nextHash);
  };
  useEffect(() => {
    if (reducedMotion || !window.IntersectionObserver) return;
    const sections =
      landing.current?.querySelectorAll<HTMLElement>('.fwo-reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.revealed = 'true';
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08 },
    );
    sections?.forEach((section) => {
      section.dataset.revealed = 'false';
      observer.observe(section);
    });
    return () => {
      observer.disconnect();
      sections?.forEach((section) => delete section.dataset.revealed);
    };
  }, [reducedMotion]);
  return (
    <div ref={landing} className={styles.landing}>
      <header className={styles.landingHeader}>
        <Brand />
        <nav>
          <LanguageSelector />
          <a href="#how" onClick={onSectionClick}>
            {translate('ui.how.to.play')}
          </a>
          <a href="#journey" onClick={onSectionClick}>
            {translate('ui.the.journey')}
          </a>
          <Button variant="ghost" onClick={() => navigate('/login')}>
            {translate('ui.log.in')}{' '}
          </Button>
          <Button onClick={() => navigate(player ? '/play' : '/register')}>
            {translate('ui.start.your.journey')} <ArrowRight size={15} />
          </Button>
        </nav>
      </header>
      <section className={styles.landingHero}>
        <div className={styles.landingCopy}>
          <span className="fwo-eyebrow">
            {translate('ui.a.little.peace.right.in.your.browser')}{' '}
          </span>
          <h1>
            {translate('ui.cast.a.line')} <br />
            <em>{translate('ui.find.a.little.peace')}</em>
          </h1>
          <p>
            {translate(
              'ui.visit.a.familiar.lakeside.corner.discover.vietnamese',
            )}{' '}
          </p>
          <div className={styles.landingActions}>
            <Button onClick={() => navigate(player ? '/play' : '/register')}>
              {translate('ui.join.us.at.the.lake')} <ArrowRight size={17} />
            </Button>
            <span>
              <Check size={14} />
              {translate('ui.free.preview.no.installation.needed')}{' '}
            </span>
          </div>
          <div className={styles.landingDetails}>
            <span>
              <Waves size={17} />
              {translate('ui.lakes.of.vietnam')}{' '}
            </span>
            <span>
              <Fish size={17} />
              {translate('ui.10.fish.species.to.discover')}{' '}
            </span>
            <span>
              <Leaf size={17} />
              {translate('ui.play.at.your.own.pace')}{' '}
            </span>
          </div>
        </div>
        <div className={styles.landingIllustration}>
          <LakeArt />
          <span className={styles.floatingLabel}>
            <MapPin size={14} />
            {translate('ui.lotus.lake.where.the.story.begins')}{' '}
          </span>
        </div>
      </section>
      <section
        id="how"
        tabIndex={-1}
        className={`${styles.howSection} fwo-reveal`}
      >
        <span className="fwo-eyebrow">
          {translate('ui.easy.to.get.started')}
        </span>
        <h2>{translate('ui.one.rod.endless.discoveries')}</h2>
        <div className={styles.threeColumns}>
          {[
            {
              n: '01',
              icon: Anchor,
              title: translate('ui.choose.a.lakeside.corner'),
              text: translate('ui.prepare.your.rod.choose.bait.and.make'),
            },
            {
              n: '02',
              icon: Waves,
              title: translate('ui.feel.every.pull'),
              text: translate('ui.wait.for.a.bite.and.strike.in'),
            },
            {
              n: '03',
              icon: BookOpen,
              title: translate('ui.keep.the.memories'),
              text: translate('ui.fill.your.journal.upgrade.equipment.and.set'),
            },
          ].map(({ n, icon: Icon, title, text }) => (
            <Card key={n} className={styles.howCard}>
              <div>
                <Icon size={27} />
                <span>{n}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </Card>
          ))}
        </div>
      </section>
      <section
        id="journey"
        tabIndex={-1}
        className={`${styles.landingEnd} fwo-reveal`}
      >
        <Sprout size={35} />
        <h2>{translate('ui.a.lovely.day.to.begin')}</h2>
        <p>{translate('ui.a.small.preview.for.peaceful.little.journeys')}</p>
        <Button onClick={() => navigate('/register')}>
          {translate('ui.create.a.preview.account')} <ArrowRight size={16} />
        </Button>
        <small>{translate('ui.gold.is.for.in.game.use.and')}</small>
      </section>
      <footer className={styles.landingFooter}>
        <Brand />
        <span>© {new Date().getFullYear()} Fishing World Online</span>
        <Link to="/policy">{translate('ui.about.the.preview')}</Link>
      </footer>
    </div>
  );
}
function AuthPage({
  mode,
}: {
  mode: 'login' | 'register' | 'forgot' | 'reset';
}) {
  useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const { player, ready, restoreError } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [done, setDone] = useState(false);
  const [channel, setChannel] = useState<SignInChannel>('email');
  // Registration step 2: the OTP sent to the chosen email/phone.
  const [challenge, setChallenge] = useState<OtpChallengeDto | null>(null);
  // Google sign-up needs an angler name before the account exists.
  const [googleCredential, setGoogleCredential] = useState<string | null>(null);
  if (mode === 'login') {
    if (!ready) return <LoadingState />;
    if (restoreError)
      return <ErrorState error={restoreError} retry={() => void bootstrap()} />;
    if (player) return <Navigate to="/play" replace />;
  }
  const titles = {
    login: translate('ui.back.to.your.familiar.lake'),
    register: translate('ui.your.very.first.journey'),
    forgot: translate('ui.find.your.way.back.to.the.lake'),
    reset: translate('ui.a.fresh.start'),
  };
  async function finish(data: { accessToken: string }, created: boolean) {
    api.setToken(data.accessToken);
    const p = await api.request<PlayerDto>('/users/me');
    useAuth.getState().setPlayer(p);
    toast(
      created
        ? translate('ui.welcome.to.fishing.world')
        : translate('ui.welcome.back'),
    );
    navigate('/play');
  }
  async function google(credential: string, extra: object = {}) {
    setError(null);
    try {
      const data = await api.request<{ accessToken: string }>('/auth/google', {
        method: 'POST',
        body: { credential, ...extra },
        skipRefresh: true,
      });
      await finish(data, Boolean(googleCredential));
    } catch (err) {
      if (err instanceof ApiError && err.code === 'GOOGLE_PROFILE_REQUIRED')
        setGoogleCredential(credential);
      else setError(err as Error);
    }
  }
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const f = new FormData(e.currentTarget);
    const identifier = { [channel]: f.get(channel) };
    try {
      if (googleCredential) {
        await google(googleCredential, {
          username: f.get('username'),
          acceptTerms: f.get('acceptTerms') === 'on',
        });
        return;
      }
      const body =
        mode === 'register'
          ? {
              channel,
              ...identifier,
              username: f.get('username'),
              password: f.get('password'),
              acceptTerms: f.get('acceptTerms') === 'on',
            }
          : mode === 'login'
            ? { ...identifier, password: f.get('password') }
            : mode === 'forgot'
              ? identifier
              : {
                  token:
                    new URLSearchParams(window.location.search).get('token') ??
                    new URLSearchParams(window.location.search).get('reset') ??
                    f.get('token'),
                  password: f.get('password'),
                };
      const path = {
        register: 'register',
        login: 'login',
        forgot: 'forgot-password',
        reset: 'reset-password',
      }[mode];
      const data = await api.request<
        { accessToken: string; profile: PlayerDto } & OtpChallengeDto
      >(`/auth/${path}`, { method: 'POST', body, skipRefresh: true });
      if (mode === 'register') setChallenge(data);
      else if (mode === 'forgot' || mode === 'reset') setDone(true);
      else await finish(data, false);
    } catch (err) {
      setError(err as Error);
    } finally {
      setPending(false);
    }
  };
  return (
    <div className={styles.authPage}>
      <section className={styles.authIllustration}>
        <LakeArt />
        <div>
          <Brand />
          <h2>
            {translate('ui.a.lakeside.corner')} <br />
            {translate('ui.a.little.peace')}{' '}
          </h2>
          <p>{translate('ui.some.days.a.little.journey.is.all')}</p>
        </div>
      </section>
      <section className={styles.authPanel}>
        <div className={styles.authTopbar}>
          <Link to="/" className={styles.backLink}>
            {translate('ui.back.to.home')}
          </Link>
          <LanguageSelector />
        </div>
        <div className={styles.authFormWrap}>
          <span className="fwo-eyebrow">FISHING WORLD ONLINE</span>
          <h1>{titles[mode]}</h1>
          <p>
            {mode === 'login'
              ? translate('ui.log.in.and.continue.making.memories.by')
              : mode === 'register'
                ? translate('ui.create.an.account.to.begin.your.angling')
                : translate('ui.we.will.help.you.recover.access.to')}
          </p>
          {done ? (
            <>
              <Notice tone="success">
                {mode === 'forgot'
                  ? channel === 'phone'
                    ? translate('auth.forgot.phoneDone')
                    : translate('ui.if.the.email.belongs.to.an.account')
                  : translate('ui.your.password.has.been.updated.you.can')}
              </Notice>
              <Button onClick={() => navigate('/login')}>
                {translate('ui.back.to.login')}{' '}
              </Button>
            </>
          ) : challenge ? (
            <OtpForm
              challenge={challenge}
              onVerify={async (code) =>
                finish(
                  await api.request<{ accessToken: string }>(
                    '/auth/register/verify',
                    {
                      method: 'POST',
                      body: { challengeId: challenge.challengeId, code },
                      skipRefresh: true,
                    },
                  ),
                  true,
                )
              }
              onResend={() =>
                api.request<OtpChallengeDto>('/auth/otp/resend', {
                  method: 'POST',
                  body: { challengeId: challenge.challengeId },
                  skipRefresh: true,
                })
              }
              onBack={() => setChallenge(null)}
            />
          ) : googleCredential ? (
            <Form onSubmit={submit} error={error}>
              <Notice tone="info">{translate('auth.google.finishHelp')}</Notice>
              <FormField label={translate('ui.angler.name')} required>
                <Input
                  name="username"
                  placeholder={translate('ui.what.would.you.like.to.be.called')}
                  required
                  minLength={3}
                  maxLength={24}
                  pattern={String.raw`[\p{L}\p{N}_ .\-]+`}
                  autoComplete="nickname"
                />
              </FormField>
              <Checkbox
                name="acceptTerms"
                required
                label={
                  <>
                    {translate('ui.i.have.read')}{' '}
                    <Link to="/policy">
                      {translate('ui.preview.information.and.policies')}{' '}
                    </Link>
                    {translate('ui.i.understand.gold.has.no.cash.value')}{' '}
                  </>
                }
              />
              <FormError error={error} />
              <Button
                type="submit"
                loading={pending}
                className={styles.fullButton}
              >
                {translate('auth.google.finish')}
                <ArrowRight size={16} />
              </Button>
            </Form>
          ) : (
            <Form onSubmit={submit} error={error}>
              {mode !== 'reset' && (
                <ChannelTabs
                  value={channel}
                  onChange={(next) => {
                    setError(null);
                    setChannel(next);
                  }}
                />
              )}
              {mode === 'register' && (
                <FormField label={translate('ui.angler.name')} required>
                  <Input
                    name="username"
                    placeholder={translate(
                      'ui.what.would.you.like.to.be.called',
                    )}
                    required
                    minLength={3}
                    maxLength={24}
                    pattern={String.raw`[\p{L}\p{N}_ .\-]+`}
                    autoComplete="nickname"
                  />
                </FormField>
              )}
              {mode !== 'reset' && (
                <IdentifierField key={channel} channel={channel} />
              )}
              {mode !== 'forgot' && (
                <FormField
                  label={translate('ui.password')}
                  required
                  help={
                    mode === 'register'
                      ? translate('ui.8.128.characters.use.a.password.you')
                      : undefined
                  }
                >
                  <PasswordInput
                    name="password"
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete={
                      mode === 'login' ? 'current-password' : 'new-password'
                    }
                    placeholder={translate(
                      mode === 'login'
                        ? 'password.placeholder'
                        : 'password.newPlaceholder',
                    )}
                  />
                </FormField>
              )}
              {mode === 'reset' &&
                !new URLSearchParams(window.location.search).get('token') &&
                !new URLSearchParams(window.location.search).get('reset') && (
                  <FormField
                    label={translate('ui.password.reset.code')}
                    required
                  >
                    <Input name="token" required minLength={32} />
                  </FormField>
                )}
              {mode === 'register' && (
                <Checkbox
                  name="acceptTerms"
                  required
                  label={
                    <>
                      {translate('ui.i.have.read')}{' '}
                      <Link to="/policy">
                        {translate('ui.preview.information.and.policies')}{' '}
                      </Link>
                      {translate('ui.i.understand.gold.has.no.cash.value')}{' '}
                    </>
                  }
                />
              )}
              {mode === 'login' && (
                <div className={styles.forgotLink}>
                  <Link to="/forgot-password">
                    {translate('ui.forgot.password')}
                  </Link>
                </div>
              )}
              <FormError error={error} />
              <Button
                type="submit"
                loading={pending}
                className={styles.fullButton}
              >
                {mode === 'login'
                  ? translate('ui.log.in')
                  : mode === 'register'
                    ? translate('ui.create.account.start')
                    : mode === 'forgot'
                      ? translate('ui.send.instructions')
                      : translate('ui.reset.password')}
                <ArrowRight size={16} />
              </Button>
            </Form>
          )}
          {(mode === 'login' || mode === 'register') &&
            !challenge &&
            !googleCredential && (
              <GoogleSignIn onCredential={(credential) => google(credential)} />
            )}
          <p className={styles.authSwitch}>
            {mode === 'login' ? (
              <>
                {translate('ui.no.account.yet')}{' '}
                <Link to="/register">{translate('ui.start.your.journey')}</Link>
              </>
            ) : (
              <>
                {translate('ui.already.have.an.account')}{' '}
                <Link to="/login">{translate('ui.log.in')}</Link>
              </>
            )}
          </p>
        </div>
        <small className={styles.authFootnote}>
          <Leaf size={13} />
          {translate('ui.play.in.moderation.take.a.break.when')}{' '}
        </small>
      </section>
    </div>
  );
}
function Policy() {
  useI18n();
  return (
    <div className={styles.policy}>
      <Brand />
      <PageHeader
        title={translate('ui.about.the.preview')}
        description={translate('ui.transparency.in.the.little.things')}
      />
      <Card>
        <h2>Fishing World Online · MVP</h2>
        <p>{translate('ui.this.fishing.game.is.in.development.gold')} </p>
        <h3>{translate('ui.account.data')}</h3>
        <p>{translate('ui.the.game.stores.your.login.email.hashed')} </p>
        <h3>{translate('ui.preview.scope')}</h3>
        <p>
          {translate('ui.features.and.data.may.change.during.development')}{' '}
        </p>
        <h3>{translate('ui.before.release')}</h3>
        <p>{translate('ui.this.information.does.not.replace.full.terms')} </p>
        <Button onClick={() => window.history.back()} variant="secondary">
          {translate('ui.back')}{' '}
        </Button>
      </Card>
    </div>
  );
}
export default function App() {
  useI18n();
  const reducedMotion = usePreferences((s) => s.reducedMotion);
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion);
    return () => {
      delete document.documentElement.dataset.reducedMotion;
    };
  }, [reducedMotion]);
  if (
    window.location.pathname === '/' &&
    new URLSearchParams(window.location.search).has('reset')
  )
    return <AuthPage mode="reset" />;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage key="login" mode="login" />} />
      <Route
        path="/register"
        element={<AuthPage key="register" mode="register" />}
      />
      <Route
        path="/forgot-password"
        element={<AuthPage key="forgot" mode="forgot" />}
      />
      <Route
        path="/reset-password"
        element={<AuthPage key="reset" mode="reset" />}
      />
      <Route path="/policy" element={<Policy />} />
      <Route path="/play" element={<Shell />}>
        <Route index element={<Lobby />} />
        <Route path="character" element={<CharacterPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="fishing" element={<FishingPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="equipment" element={<InventoryPage equipmentOnly />} />
        <Route path="collection" element={<CollectionPage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="missions" element={<MissionsPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route
          path="*"
          element={
            <EmptyState
              title={translate('ui.this.lakeside.corner.is.still.unexplored')}
              action={<Link to="/play">{translate('ui.back.to.lobby')}</Link>}
            />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
