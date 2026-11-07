import { ApiError, createApiClient } from '@fwo/ui';
import type { PlayerDto } from '@fwo/contracts';
import { QueryClient } from '@tanstack/react-query';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

type AuthState = {
  player: PlayerDto | null;
  ready: boolean;
  restoreError: Error | null;
  notice: SessionNotice;
  /** True after deliberate sign-out: the next sign-in starts at the overview. */
  signedOut: boolean;
};
const hot = import.meta.hot?.data as
  | {
      api?: ReturnType<typeof createApiClient>;
      queryClient?: QueryClient;
      auth?: UseBoundStore<StoreApi<AuthState>>;
      restoration?: { flight: Promise<void> | null };
    }
  | undefined;

/**
 * Admin auth uses the same transport as the player app: the short-lived access
 * JWT stays in memory, the rotating refresh token is an httpOnly cookie and
 * refreshes are single-flight across requests and tabs (Web Locks). This
 * module adds the operator UX around it: expiry notice, return-to-page,
 * cross-tab sign-in/out and role revalidation when the tab regains focus.
 */
export const api = hot?.api ?? createApiClient();

const noRetry = new Set([400, 401, 403, 404, 409, 422]);
export const queryClient =
  hot?.queryClient ??
  new QueryClient({
    defaultOptions: {
      queries: {
        // Retrying permission/validation failures only delays the error state.
        retry: (count, error) =>
          count < 1 &&
          !(error instanceof ApiError && noRetry.has(error.status)),
        staleTime: 30_000,
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
  });

export type SessionNotice = 'expired' | 'signedOutElsewhere' | null;
export const useAuth =
  hot?.auth ??
  create<AuthState>(() => ({
    player: null,
    ready: false,
    restoreError: null,
    notice: null,
    signedOut: false,
  }));
const restoration = hot?.restoration ?? {
  flight: null as Promise<void> | null,
};
if (hot) Object.assign(hot, { api, queryClient, auth: useAuth, restoration });

const returnKey = 'fwo-admin:return-to';
const channel =
  typeof BroadcastChannel === 'undefined'
    ? null
    : new BroadcastChannel('fwo-admin-auth');

/** Remember where the operator was so signing in again lands on the same page. */
export function rememberLocation(path: string) {
  if (path.startsWith('/login')) return;
  try {
    sessionStorage.setItem(returnKey, path);
  } catch {
    // Storage may be blocked; the operator then returns to the overview.
  }
}
export function takeReturnPath() {
  let path: string | null;
  try {
    path = sessionStorage.getItem(returnKey);
    sessionStorage.removeItem(returnKey);
  } catch {
    path = null;
  }
  // Only same-app relative paths; never an open redirect.
  return path &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.startsWith('/login')
    ? path
    : '/';
}

function endLocalSession(notice: SessionNotice) {
  const hadSession = !!useAuth.getState().player;
  api.setToken(null);
  queryClient.clear();
  useAuth.setState({
    player: null,
    restoreError: null,
    notice: hadSession ? notice : null,
  });
}

api.onUnauthorized(() => {
  // The refresh cookie was rejected: the whole login session is over.
  if (useAuth.getState().player)
    rememberLocation(window.location.pathname + window.location.search);
  endLocalSession('expired');
});

async function loadPlayer() {
  const player = await api.request<PlayerDto>('/users/me');
  useAuth.setState({
    player,
    restoreError: null,
    notice: null,
    signedOut: false,
  });
  return player;
}

export function bootstrap(): Promise<void> {
  if (restoration.flight) return restoration.flight;
  const current = useAuth.getState();
  if (current.ready && current.player && !current.restoreError)
    return Promise.resolve();
  useAuth.setState({ restoreError: null, ready: !!useAuth.getState().player });
  restoration.flight = (async () => {
    try {
      const player = await api.restoreSession<PlayerDto>('/users/me');
      useAuth.setState({ player, restoreError: null });
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status))
        useAuth.setState({ player: null, restoreError: null });
      else if (!(error instanceof DOMException && error.name === 'AbortError'))
        useAuth.setState({ restoreError: error as Error });
    } finally {
      useAuth.setState({ ready: true });
      restoration.flight = null;
    }
  })();
  return restoration.flight;
}

export async function signIn(email: string, password: string) {
  const data = await api.request<{ accessToken: string }>('/auth/login', {
    method: 'POST',
    body: { email, password },
    skipRefresh: true,
  });
  api.setToken(data.accessToken);
  const player = await loadPlayer();
  channel?.postMessage('signed-in');
  return player;
}

export async function signOut() {
  await api.request('/auth/logout', { method: 'POST', body: {} });
  useAuth.setState({ signedOut: true });
  endLocalSession(null);
  try {
    sessionStorage.removeItem(returnKey);
  } catch {
    /* ignore */
  }
  channel?.postMessage('signed-out');
}

channel?.addEventListener('message', (event: MessageEvent) => {
  if (event.data === 'signed-out') endLocalSession('signedOutElsewhere');
  // Another tab signed in: the shared refresh cookie now restores this tab too.
  if (event.data === 'signed-in' && !useAuth.getState().player)
    void bootstrap();
});

// Re-check identity/role when an idle tab comes back so a revoked or changed
// role is reflected before the operator acts on stale permissions.
let lastCheck = Date.now();
const recheckIdentity = () => {
  if (document.visibilityState !== 'visible') return;
  if (!useAuth.getState().player || Date.now() - lastCheck < 60_000) return;
  lastCheck = Date.now();
  loadPlayer().catch(() => {
    // 401 is handled by onUnauthorized; network errors keep the current view.
  });
};
if (typeof document !== 'undefined')
  document.addEventListener('visibilitychange', recheckIdentity);
import.meta.hot?.dispose(() => {
  channel?.close();
  document.removeEventListener('visibilitychange', recheckIdentity);
});
