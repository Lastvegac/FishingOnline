import {
  getLocale,
  localizeMessage,
  t as translate,
  type MessageKey,
} from './i18n';
const errorKeys: Partial<Record<string, MessageKey>> = {
  CHAT_TOO_FAST: 'sim.error.CHAT_TOO_FAST',
  CATCH_NOT_FOUND: 'sim.error.CATCH_NOT_FOUND',
  LOCATION_LOCKED: 'sim.error.LOCATION_LOCKED',
  LOCATION_NOT_FOUND: 'sim.error.LOCATION_NOT_FOUND',
  INVALID_PRESET: 'fashion.error.INVALID_PRESET',
  INVALID_PRICE: 'fashion.error.INVALID_PRICE',
  INVALID_SALE_WINDOW: 'fashion.error.INVALID_SALE_WINDOW',
  UNKNOWN_ASSET: 'fashion.error.UNKNOWN_ASSET',
  INVALID_COLLECTION: 'fashion.error.INVALID_COLLECTION',
  EVENT_ALREADY_STARTED: 'fashion.error.EVENT_ALREADY_STARTED',
  INVALID_VOTE: 'fashion.error.INVALID_VOTE',
  STALE_MOVEMENT: 'fashion.error.STALE_MOVEMENT',
  MOVEMENT_TOO_FAST: 'fashion.error.MOVEMENT_TOO_FAST',
  CHARACTER_REQUIRED: 'fashion.error.CHARACTER_REQUIRED',
  JOIN_LAKE_FIRST: 'fashion.error.JOIN_LAKE_FIRST',
  ACTIVE_FISHING_SESSION: 'fashion.error.ACTIVE_FISHING_SESSION',
  PASS_NOT_ENROLLED: 'fashion.error.PASS_NOT_ENROLLED',
  PREMIUM_REQUIRED: 'fashion.error.PREMIUM_REQUIRED',
  ALREADY_CLAIMED: 'fashion.error.ALREADY_CLAIMED',
  CHARACTER_VERSION_CONFLICT: 'fashion.error.CHARACTER_VERSION_CONFLICT',
  COSMETIC_NOT_OWNED: 'fashion.error.COSMETIC_NOT_OWNED',
  CLOTHING_REQUIRED: 'fashion.error.CLOTHING_REQUIRED',
  COSMETIC_LOCKED: 'fashion.error.COSMETIC_LOCKED',
  INSUFFICIENT_DIAMONDS: 'fashion.error.INSUFFICIENT_DIAMONDS',
  OUTFIT_LIMIT: 'fashion.error.OUTFIT_LIMIT',
  LAKE_FULL: 'fashion.error.LAKE_FULL',
  EVENT_CLOSED: 'fashion.error.EVENT_CLOSED',
  VERSION_CONFLICT: 'fashion.error.VERSION_CONFLICT',
  PRESENCE_EXPIRED: 'fashion.error.PRESENCE_EXPIRED',
  LEVEL_REQUIRED: 'fashion.error.LEVEL_REQUIRED',
  ALREADY_OWNED: 'fashion.error.ALREADY_OWNED',
  PRICE_CHANGED: 'fashion.error.PRICE_CHANGED',
  INVALID_CURRENCY: 'fashion.error.INVALID_CURRENCY',
  INVALID_COSMETIC: 'fashion.error.INVALID_COSMETIC',
  ALREADY_ENTERED: 'fashion.error.ALREADY_ENTERED',
  REWARD_UNAVAILABLE: 'fashion.error.REWARD_UNAVAILABLE',

  NETWORK_ERROR: 'network.unavailable',
  INVALID_RESPONSE: 'network.invalidResponse',
  INVALID_CREDENTIALS: 'auth.invalidCredentials',
  SESSION_ACCOUNT_CHANGED: 'auth.accountChanged',
  RATE_LIMITED: 'auth.rateLimited',
  ACCOUNT_RATE_LIMITED: 'auth.rateLimited',
  EMAIL_TAKEN: 'auth.emailUsed',
  USERNAME_TAKEN: 'auth.usernameUsed',
};
/** Device IANA zone; the server uses it for the real local hour (lighting, twilight). */
const deviceTimeZone = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
})();
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public requestId?: string,
    public fields?: Record<string, string[]>,
    public formErrors?: string[],
  ) {
    super(message);
    this.name = 'ApiError';
    Object.defineProperty(this, 'message', {
      configurable: true,
      get: () => {
        const key = errorKeys[this.code];
        if (
          key &&
          (getLocale() === 'en' ||
            key.startsWith('sim.error.') ||
            [
              'NETWORK_ERROR',
              'INVALID_RESPONSE',
              'SESSION_ACCOUNT_CHANGED',
            ].includes(this.code))
        )
          return translate(key);
        return localizeMessage(message);
      },
    });
  }
}
export function createApiClient() {
  // A non-secret identity hint survives reloads in this tab. Never persist JWTs.
  const identityKey = 'fwo-auth:expected-user';
  const subject = (value: string | null): string | null => {
    if (!value) return null;
    try {
      const payload = value
        .split('.')[1]!
        .replaceAll('-', '+')
        .replaceAll('_', '/');
      const claims = JSON.parse(atob(payload));
      return typeof claims.sub === 'string' ? claims.sub : null;
    } catch {
      return null;
    }
  };
  let expectedUser: string | null = null;
  try {
    expectedUser = globalThis.sessionStorage?.getItem(identityKey) ?? null;
  } catch {
    /* Storage can be unavailable; the in-memory check still applies. */
  }
  const rememberUser = (value: string) => {
    expectedUser = value;
    try {
      globalThis.sessionStorage?.setItem(identityKey, value);
    } catch {
      /* Keep the in-memory identity when storage is blocked. */
    }
  };
  let token: string | null = null;
  let refreshFlight: Promise<boolean> | null = null;
  let refreshAbort: AbortController | null = null;
  let refreshRejected = false;
  let unauthorizedNotified = false;
  let generation = 0;
  let onUnauthorized: (() => boolean | void) | undefined;
  const cookie = (name: string) =>
    decodeURIComponent(
      document.cookie
        .split('; ')
        .find((v) => v.startsWith(`${name}=`))
        ?.split('=')
        .slice(1)
        .join('=') ?? '',
    );
  const unauthorized = () => {
    if (unauthorizedNotified) return;
    unauthorizedNotified = true;
    // The player app may defer leaving until its current cast has been acknowledged.
    if (onUnauthorized?.() !== false) {
      refreshAbort?.abort();
      token = null;
      generation++;
    }
  };
  const refresh = (): Promise<boolean> => {
    if (refreshFlight) return refreshFlight;
    if (refreshRejected) return Promise.resolve(false);
    const startedGeneration = generation;
    const run = async () => {
      if (generation !== startedGeneration) return false;
      const csrf = cookie('fwo-csrf');
      if (!csrf) {
        if (generation === startedGeneration) refreshRejected = true;
        return false;
      }
      let res: Response;
      const controller = new AbortController();
      refreshAbort = controller;
      try {
        res = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrf,
            ...(expectedUser ? { 'X-Fwo-User-Id': expectedUser } : {}),
          },
          body: '{}',
          signal: controller.signal,
        });
      } catch {
        throw new ApiError(
          'NETWORK_ERROR',
          translate('network.unavailable'),
          0,
        );
      }
      if (res.status === 401 || res.status === 403) {
        if (generation === startedGeneration) refreshRejected = true;
        return false;
      }
      if (!res.ok)
        throw new ApiError(
          'REFRESH_UNAVAILABLE',
          translate('network.failed'),
          res.status,
        );
      const json = await res.json();
      if (typeof json.data?.accessToken !== 'string')
        throw new ApiError(
          'INVALID_RESPONSE',
          translate('network.invalidResponse'),
          res.status,
        );
      if (generation !== startedGeneration) return false;
      const restoredUser = subject(json.data.accessToken);
      if (expectedUser && restoredUser !== expectedUser) {
        refreshRejected = true;
        return false;
      }
      if (restoredUser) rememberUser(restoredUser);
      token = json.data.accessToken;
      refreshRejected = false;
      unauthorizedNotified = false;
      return true;
    };
    // Serialize rotation across tabs as well as concurrent requests in this tab.
    const flight = (async () => {
      if (typeof navigator !== 'undefined' && navigator.locks)
        return await navigator.locks.request('fwo-auth-refresh', run);
      return await run();
    })().finally(() => {
      if (refreshFlight === flight) {
        refreshFlight = null;
        refreshAbort = null;
      }
    });
    refreshFlight = flight;
    return flight;
  };
  const expiresSoon = () => {
    if (!token) return false;
    try {
      const part = token
        .split('.')[1]!
        .replaceAll('-', '+')
        .replaceAll('_', '/');
      const { exp } = JSON.parse(atob(part));
      return typeof exp === 'number' && exp * 1000 - Date.now() <= 60_000;
    } catch {
      return false;
    }
  };
  const request = async <T>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      idempotencyKey?: string;
      signal?: AbortSignal;
      skipRefresh?: boolean;
    } = {},
  ): Promise<T> => {
    const mutationKey = options.idempotencyKey ?? crypto.randomUUID();
    const startedGeneration = generation;
    const publicAuth = path.startsWith('/auth/');
    const canRefresh = !options.skipRefresh && !publicAuth;
    let sentToken: string | null = null;
    const send = () => {
      if (generation !== startedGeneration)
        throw new DOMException('Authentication changed', 'AbortError');
      sentToken = token;
      return fetch(`/api/v1${path}`, {
        method: options.method ?? 'GET',
        credentials: 'include',
        signal: options.signal,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(expectedUser ? { 'X-Fwo-User-Id': expectedUser } : {}),
          ...(deviceTimeZone ? { 'X-Time-Zone': deviceTimeZone } : {}),
          ...(options.body !== undefined
            ? { 'Content-Type': 'application/json' }
            : {}),
          ...((options.method ?? 'GET') !== 'GET'
            ? {
                'X-CSRF-Token': cookie('fwo-csrf'),
                'X-Fishing-CSRF': cookie('fwo-fishing-csrf'),
                'Idempotency-Key': mutationKey,
              }
            : {}),
        },
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    };
    let response: Response;
    try {
      if (canRefresh && expiresSoon() && !refreshRejected) {
        if (!(await refresh()) && generation === startedGeneration)
          unauthorized();
      }
      response = await send();
      if (generation !== startedGeneration)
        throw new DOMException('Authentication changed', 'AbortError');
      if (response.status === 401 && canRefresh) {
        // A late 401 for the previous JWT must reuse a token another request renewed.
        if (sentToken !== token && token) response = await send();
        if (response.status === 401 && !refreshRejected && (await refresh()))
          response = await send();
      }
    } catch (e) {
      if (
        e instanceof ApiError ||
        (e instanceof DOMException && e.name === 'AbortError')
      )
        throw e;
      throw new ApiError('NETWORK_ERROR', translate('network.unavailable'), 0);
    }
    if (
      generation === startedGeneration &&
      canRefresh &&
      response.headers.get('X-Fwo-Session-Expired') === 'true'
    ) {
      // A cast can complete with its cookie while the access JWT expires in flight.
      // Only a rejected refresh means the full login session has actually expired.
      if (!refreshRejected) {
        try {
          await refresh();
        } catch {
          /* Keep the successful fishing response during an auth outage. */
        }
      }
      if (refreshRejected && generation === startedGeneration) unauthorized();
    }
    // Logout has no JSON body.
    if (response.status === 204) return undefined as T;
    let json: {
      data?: unknown;
      error?: {
        code?: string;
        message?: string;
        requestId?: string;
        fields?: Record<string, string[]>;
        formErrors?: string[];
      };
    };
    try {
      json = await response.json();
    } catch {
      throw new ApiError(
        'INVALID_RESPONSE',
        translate('network.invalidResponse'),
        response.status,
      );
    }
    if (generation !== startedGeneration)
      throw new DOMException('Authentication changed', 'AbortError');
    if (!response.ok) {
      if (
        response.status === 401 &&
        !publicAuth &&
        !options.skipRefresh &&
        generation === startedGeneration
      )
        unauthorized();
      throw new ApiError(
        json.error?.code ?? 'REQUEST_FAILED',
        json.error?.message ?? translate('network.failed'),
        response.status,
        json.error?.requestId,
        json.error?.fields,
        json.error?.formErrors,
      );
    }
    return json.data as T;
  };
  return {
    request,
    refresh,
    /** Restore cookie-backed auth without treating a restarting API as logout. */
    restoreSession: async <T>(path: string): Promise<T | null> => {
      const retry = async <R>(operation: () => Promise<R>): Promise<R> => {
        for (let attempt = 0; ; attempt++) {
          try {
            return await operation();
          } catch (error) {
            const transient =
              error instanceof ApiError &&
              (error.status === 0 ||
                error.status === 429 ||
                error.status >= 500);
            if (!transient || attempt >= 2) throw error;
            await new Promise((resolve) =>
              setTimeout(resolve, 500 * 2 ** attempt),
            );
          }
        }
      };
      if (!token && !(await retry(refresh))) return null;
      return retry(() => request<T>(path));
    },
    getAccessToken: () => token,
    setToken: (value: string | null) => {
      refreshAbort?.abort();
      refreshAbort = null;
      refreshFlight = null;
      generation++;
      token = value;
      // Only explicit sign-in may replace the tab's expected account. Retain the
      // hint after expiry so another account's cookie cannot silently sign in.
      const user = subject(value);
      if (user) rememberUser(user);
      refreshRejected = false;
      unauthorizedNotified = false;
    },
    onUnauthorized: (fn: () => boolean | void) => {
      onUnauthorized = fn;
    },
  };
}
