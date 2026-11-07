import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AuthProvidersDto, OtpChallengeDto } from '@fwo/contracts';
import {
  Button,
  Form,
  FormError,
  FormField,
  Input,
  Tabs,
  t as translate,
  useI18n,
} from '@fwo/ui';
import { api } from './data';

export type SignInChannel = 'email' | 'phone';

export const useAuthProviders = () =>
  useQuery({
    queryKey: ['auth-providers'],
    queryFn: () =>
      api.request<AuthProvidersDto>('/auth/providers', { skipRefresh: true }),
    staleTime: 5 * 60_000,
  });

/** Email/phone switch; phone only appears when the server can deliver SMS. */
export function ChannelTabs({
  value,
  onChange,
}: {
  value: SignInChannel;
  onChange: (value: SignInChannel) => void;
}) {
  useI18n();
  const providers = useAuthProviders();
  if (!providers.data?.phone) return null;
  return (
    <Tabs
      items={[
        { value: 'email', label: translate('auth.channel.email') },
        { value: 'phone', label: translate('auth.channel.phone') },
      ]}
      value={value}
      onChange={(next) => onChange(next as SignInChannel)}
    />
  );
}

export function IdentifierField({ channel }: { channel: SignInChannel }) {
  useI18n();
  return channel === 'phone' ? (
    <FormField
      label={translate('auth.phone.label')}
      required
      help={translate('auth.phone.help')}
    >
      <Input
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="0912 345 678"
        required
        maxLength={20}
        pattern={String.raw`^(\+?84|0)[\s.\-]*[35789]([\s.\-]*\d){8}$`}
      />
    </FormField>
  ) : (
    <FormField label={translate('ui.email.address')} required>
      <Input
        name="email"
        type="email"
        maxLength={254}
        placeholder="ban@example.com"
        required
        autoComplete="email"
      />
    </FormField>
  );
}

/** Six-digit code entry with resend countdown, shared by sign-up and profile confirmation. */
export function OtpForm({
  challenge,
  onVerify,
  onResend,
  onBack,
  id,
  hideSubmit = false,
}: {
  challenge: OtpChallengeDto;
  onVerify: (code: string) => Promise<unknown>;
  onResend?: () => Promise<OtpChallengeDto>;
  onBack?: () => void;
  id?: string;
  hideSubmit?: boolean;
}) {
  useI18n();
  const [current, setCurrent] = useState(challenge);
  const [error, setError] = useState<Error | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [clock, setClock] = useState(Date.now());
  useEffect(() => setCurrent(challenge), [challenge]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const wait = Math.max(
    0,
    Math.ceil((new Date(current.resendAfter).getTime() - clock) / 1000),
  );
  return (
    <Form
      id={id}
      error={error}
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setPending(true);
        try {
          await onVerify(
            String(new FormData(event.currentTarget).get('code') ?? ''),
          );
        } catch (err) {
          setError(err as Error);
        } finally {
          setPending(false);
        }
      }}
    >
      <p aria-live="polite">
        {translate('otp.sent', { destination: current.destination })}
      </p>
      <FormField label={translate('otp.code')} required>
        <Input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern={String.raw`\d{6}`}
          minLength={6}
          maxLength={6}
          required
          autoFocus
          placeholder="••••••"
        />
      </FormField>
      {notice && <small aria-live="polite">{notice}</small>}
      <FormError error={error} />
      {!hideSubmit && (
        <Button type="submit" loading={pending}>
          {translate('otp.verify')}
        </Button>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {onResend && (
          <Button
            type="button"
            variant="ghost"
            disabled={wait > 0}
            onClick={async () => {
              setError(null);
              try {
                setCurrent(await onResend());
                setNotice(translate('otp.resent'));
              } catch (err) {
                setError(err as Error);
              }
            }}
          >
            {wait > 0
              ? translate('otp.resendIn', { seconds: wait })
              : translate('otp.resend')}
          </Button>
        )}
        {onBack && (
          <Button type="button" variant="ghost" onClick={onBack}>
            {translate('otp.changeDetails')}
          </Button>
        )}
      </div>
    </Form>
  );
}

interface GoogleAccounts {
  id: {
    initialize: (options: {
      client_id: string;
      callback: (response: { credential: string }) => void;
      ux_mode?: 'popup';
    }) => void;
    renderButton: (
      element: HTMLElement,
      options: Record<string, string | number>,
    ) => void;
  };
}
declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}
let googleScript: Promise<void> | undefined;
function loadGoogle() {
  googleScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      googleScript = undefined;
      reject(new Error('google'));
    };
    document.head.appendChild(script);
  });
  return googleScript;
}

/** Google Identity Services button; rendered only when the server has a client id. */
export function GoogleSignIn({
  onCredential,
}: {
  onCredential: (credential: string) => void;
}) {
  useI18n();
  const providers = useAuthProviders();
  const host = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  callback.current = onCredential;
  const clientId = providers.data?.google?.clientId;
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    void loadGoogle()
      .then(() => {
        if (cancelled || !host.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          callback: (response) => callback.current(response.credential),
        });
        window.google.accounts.id.renderButton(host.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: Math.min(360, host.current.clientWidth || 320),
          locale: document.documentElement.lang || 'vi',
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [clientId]);
  if (!clientId) return null;
  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
      <span className="fwo-eyebrow">{translate('auth.or')}</span>
      <div ref={host} style={{ width: '100%', minHeight: 44 }} />
    </div>
  );
}
