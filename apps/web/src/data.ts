import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { QueryClient, useQuery } from '@tanstack/react-query';
import { ApiError, createApiClient } from '@fwo/ui';
import type {
  InventoryDto,
  LocationDto,
  MissionDto,
  PlayerDto,
  ShopItemDto,
  CollectionItemDto,
  LeaderboardEntryDto,
} from '@fwo/contracts';
type AuthState = {
  player: PlayerDto | null;
  ready: boolean;
  restoreError: Error | null;
  sessionExpired: boolean;
  fishingProtected: boolean;
  setPlayer: (player: PlayerDto | null) => void;
  setReady: () => void;
};
const hot = import.meta.hot?.data as
  | {
      api?: ReturnType<typeof createApiClient>;
      queryClient?: QueryClient;
      auth?: UseBoundStore<StoreApi<AuthState>>;
      restoration?: { flight: Promise<void> | null };
    }
  | undefined;
export const api = hot?.api ?? createApiClient();
const telemetryIds = new Map<string, string>();
export function track(
  name:
    | 'tutorial_started'
    | 'tutorial_completed'
    | 'daily_login'
    | 'page_view'
    | 'session_started'
    | 'session_ended',
  properties: Record<string, string | number | boolean> = {},
  dedupeKey?: string,
) {
  const key = dedupeKey ?? crypto.randomUUID();
  const eventId = telemetryIds.get(key) ?? crypto.randomUUID();
  telemetryIds.set(key, eventId);
  void api
    .request('/analytics/events', {
      method: 'POST',
      body: {
        events: [
          { eventId, name, occurredAt: new Date().toISOString(), properties },
        ],
      },
    })
    .catch(() => {});
}
export const queryClient =
  hot?.queryClient ??
  new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: true },
      mutations: { retry: false },
    },
  });
export const useAuth =
  hot?.auth ??
  create<AuthState>((set) => ({
    player: null,
    ready: false,
    restoreError: null,
    sessionExpired: false,
    fishingProtected: false,
    setPlayer: (player) =>
      set({
        player,
        restoreError: null,
        ...(player ? {} : { sessionExpired: false, fishingProtected: false }),
      }),
    setReady: () => set({ ready: true }),
  }));
const restoration = hot?.restoration ?? {
  flight: null as Promise<void> | null,
};
if (hot) Object.assign(hot, { api, queryClient, auth: useAuth, restoration });
export const usePreferences = create<{
  sound: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  toggleSound: () => void;
  toggleHaptics: () => void;
  toggleMotion: () => void;
}>((set) => ({
  sound: true,
  haptics: true,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  toggleSound: () => set((s) => ({ sound: !s.sound })),
  toggleHaptics: () => set((s) => ({ haptics: !s.haptics })),
  toggleMotion: () => set((s) => ({ reducedMotion: !s.reducedMotion })),
}));
api.onUnauthorized(() => {
  if (useAuth.getState().fishingProtected) {
    useAuth.setState({ sessionExpired: true });
    return false;
  }
  useAuth.getState().setPlayer(null);
  queryClient.clear();
});
export function protectFishing(protectedNow: boolean) {
  useAuth.setState({ fishingProtected: protectedNow });
  if (!protectedNow && useAuth.getState().sessionExpired) {
    api.setToken(null);
    useAuth.getState().setPlayer(null);
    queryClient.clear();
  }
}
export function bootstrap(): Promise<void> {
  if (restoration.flight) return restoration.flight;
  const current = useAuth.getState();
  // HMR must also preserve a cast that is finishing after normal auth expires.
  if (current.ready && current.player && !current.restoreError)
    return Promise.resolve();
  useAuth.setState({ restoreError: null, ready: !!useAuth.getState().player });
  restoration.flight = (async () => {
    try {
      const player = await api.restoreSession<PlayerDto>('/users/me');
      if (player) {
        useAuth.getState().setPlayer(player);
      } else if (window.location.pathname === '/play/fishing') {
        const p = await api.request<PlayerDto>('/auth/fishing-resume', {
          skipRefresh: true,
        });
        useAuth.getState().setPlayer(p);
        useAuth.setState({ sessionExpired: true, fishingProtected: true });
      } else {
        useAuth.getState().setPlayer(null);
      }
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status))
        useAuth.getState().setPlayer(null);
      else if (!(error instanceof DOMException && error.name === 'AbortError'))
        useAuth.setState({ restoreError: error as Error });
    } finally {
      useAuth.getState().setReady();
      restoration.flight = null;
    }
  })();
  return restoration.flight;
}
export async function syncPlayer() {
  const p = await api.request<PlayerDto>('/users/me');
  useAuth.getState().setPlayer(p);
  return p;
}
export async function invalidateGame() {
  await Promise.all([
    syncPlayer(),
    queryClient.invalidateQueries({ queryKey: ['inventory'] }),
    queryClient.invalidateQueries({ queryKey: ['catches'] }),
    queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] }),
    queryClient.invalidateQueries({ queryKey: ['missions'] }),
    queryClient.invalidateQueries({ queryKey: ['collection'] }),
    queryClient.invalidateQueries({ queryKey: ['shop'] }),
    queryClient.invalidateQueries({ queryKey: ['fashion-wallet'] }),
    queryClient.invalidateQueries({ queryKey: ['fashion-passes'] }),
    queryClient.invalidateQueries({ queryKey: ['character-catalog'] }),
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] }),
  ]);
}
export const useLocations = () =>
  useQuery({
    queryKey: ['locations'],
    queryFn: () => api.request<{ items: LocationDto[] }>('/locations'),
  });
export const useInventory = () =>
  useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.request<InventoryDto>('/inventory'),
  });
export const useMissions = () =>
  useQuery({
    queryKey: ['missions'],
    queryFn: () =>
      api.request<{ items: MissionDto[]; periodKey: string; resetAt: string }>(
        '/missions',
      ),
  });
/** Without a spot: the full catalog (each offer lists where it is sold). */
export const useShop = (locationId?: string) =>
  useQuery({
    queryKey: ['shop', locationId ?? 'all'],
    queryFn: () =>
      api.request<{ items: ShopItemDto[]; configVersion: number }>(
        locationId
          ? `/shop?locationId=${encodeURIComponent(locationId)}`
          : '/shop',
      ),
  });
export const useCollection = () =>
  useQuery({
    queryKey: ['collection'],
    queryFn: () => api.request<{ items: CollectionItemDto[] }>('/collection'),
  });
export const useLeaderboard = (metric: string) =>
  useQuery({
    queryKey: ['leaderboard', metric],
    queryFn: () =>
      api.request<{ items: LeaderboardEntryDto[]; myRank?: number }>(
        `/leaderboard?metric=${metric}`,
      ),
  });
