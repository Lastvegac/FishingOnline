import type { Environment } from '@fwo/contracts';
import { t as translate, useI18n, localeTag } from './i18n';
import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Eye,
  EyeOff,
  Fish,
  LoaderCircle,
  X,
} from 'lucide-react';
import { FormField } from './forms';
import { fishPhotos, type FishPhoto } from './fish-photos';
import { localizeMessage, type UiMessage } from './i18n';
export {
  getLocale,
  setLocale,
  localeTag,
  localeStorageKey,
  supportedLocales,
  t,
  useI18n,
} from './i18n';
export type {
  Locale,
  MessageKey,
  MessageDescriptor,
  TranslationValues,
} from './i18n';
export { localizeMessage } from './i18n';
export type { UiMessage } from './i18n';
export { createApiClient, ApiError } from './http';
export {
  dayPhase,
  deviceTimeZone,
  localHour,
  nightAmount,
} from './time-of-day';
export type { DayPhase } from './time-of-day';
export function Button({
  variant = 'primary',
  loading = false,
  type = 'button',
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
}) {
  useI18n();
  return (
    <button
      {...props}
      type={type}
      disabled={props.disabled || loading}
      className={`fwo-button fwo-button--${variant} ${className}`}
      aria-busy={loading}
    >
      {loading && <LoaderCircle className="fwo-spin" size={17} />} {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  useI18n();
  return (
    <Button
      {...props}
      variant="ghost"
      aria-label={label}
      title={label}
      className={`fwo-icon-button ${className}`}
    >
      {children}
    </Button>
  );
}
export function Card({
  children,
  className = '',
  padded = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  useI18n();
  return (
    <div
      {...props}
      className={`fwo-card ${padded ? 'fwo-card--padded' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  useI18n();
  return (
    <span className={`fwo-badge fwo-badge--${tone.toLowerCase()}`}>
      {children}
    </span>
  );
}
const rarityLabels: () => Record<string, string> = () => ({
  COMMON: translate('ui.common'),
  UNCOMMON: translate('ui.uncommon'),
  RARE: translate('ui.rare'),
  EPIC: translate('ui.epic'),
  LEGENDARY: translate('ui.legendary'),
  MYTHICAL: translate('fashion.rarity.MYTHICAL'),
});
export const rarityLabel = (rarity: string) => rarityLabels()[rarity] ?? rarity;
export function RarityBadge({ rarity }: { rarity: string }) {
  useI18n();
  return <Badge tone={rarity}>{rarityLabel(rarity)}</Badge>;
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  titleAs: Heading = 'h1',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  titleAs?: 'h1' | 'h2';
}) {
  useI18n();
  return (
    <header className="fwo-page-header">
      <div>
        {eyebrow && <span className="fwo-eyebrow">{eyebrow}</span>}
        <Heading>{title}</Heading>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="fwo-header-action">{action}</div>}
    </header>
  );
}
export { Form, FormError, FormField } from './forms';
export function Input(props: React.ComponentPropsWithRef<'input'>) {
  useI18n();
  return <input {...props} className={`fwo-input ${props.className ?? ''}`} />;
}
/** Native file interaction with translated labels and shared field styling. */
export function FileInput({
  fileName,
  ...props
}: Omit<React.ComponentPropsWithRef<'input'>, 'type'> & { fileName?: string }) {
  const { t } = useI18n();
  return (
    <span
      className="fwo-input fwo-file-input"
      data-invalid={props['aria-invalid'] || undefined}
      data-disabled={props.disabled || undefined}
    >
      <Button
        variant="secondary"
        type="button"
        tabIndex={-1}
        aria-hidden
        disabled={props.disabled}
      >
        {t('file.choose')}
      </Button>
      <span aria-hidden>{fileName || t('file.none')}</span>
      <Input {...props} type="file" className="fwo-file-control" />
    </span>
  );
}
/** Complete accessible range field shared by simulator controls and settings. */
export function RangeField({
  label,
  valueText,
  onValueChange,
  ...props
}: Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange' | 'value'
> & {
  label: string;
  value: number;
  valueText?: string;
  onValueChange(value: number): void;
}) {
  const id = useId();
  return (
    <div>
      <FormField label={label} id={id}>
        <Input
          {...props}
          id={id}
          type="range"
          className="fwo-range"
          aria-valuetext={valueText}
          onChange={(e) => onValueChange(Number(e.target.value))}
        />
      </FormField>
      {valueText && (
        <output className="fwo-range-value" htmlFor={id}>
          {valueText}
        </output>
      )}
    </div>
  );
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  useI18n();
  if (props.multiple || (props.size ?? 0) > 1)
    return (
      <select {...props} className={`fwo-input ${props.className ?? ''}`} />
    );
  return (
    <span className="fwo-select">
      <select {...props} className={`fwo-input ${props.className ?? ''}`} />
      <ChevronDown size={16} aria-hidden="true" />
    </span>
  );
}
export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  useI18n();
  return (
    <textarea {...props} className={`fwo-input ${props.className ?? ''}`} />
  );
}
export function Checkbox({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  useI18n();
  return (
    <FormField
      label={typeof label === 'string' ? label : translate('ui.terms.of.use')}
      visuallyHiddenLabel
      required={props.required}
    >
      <CheckboxControl {...props} label={label} />
    </FormField>
  );
}
function CheckboxControl({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  useI18n();
  return (
    <label className="fwo-checkbox">
      <input {...props} type="checkbox" />
      <span>
        {label}
        {props.required && (
          <span className="fwo-required-mark" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </span>
    </label>
  );
}
export function Tabs({
  items,
  value,
  onChange,
  label,
}: {
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  useI18n();
  return (
    <div
      className="fwo-tabs"
      role="group"
      aria-label={label ?? translate('ui.filters')}
    >
      {items.map((item) => (
        <Button
          key={item.value}
          variant="ghost"
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
          className={value === item.value ? 'fwo-tab-active' : ''}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  useI18n();
  return (
    <button
      type="button"
      className={`fwo-toggle ${checked ? 'fwo-toggle--on' : ''}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
    />
  );
}
export function PasswordInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  useI18n();
  const [shown, setShown] = useState(false);
  return (
    <div className="fwo-password">
      <Input
        {...props}
        placeholder={props.placeholder ?? translate('password.placeholder')}
        type={shown ? 'text' : 'password'}
      />
      <IconButton
        onClick={() => setShown(!shown)}
        label={
          shown ? translate('ui.hide.password') : translate('ui.show.password')
        }
        aria-pressed={shown}
        disabled={props.disabled}
      >
        {shown ? (
          <EyeOff size={19} aria-hidden="true" />
        ) : (
          <Eye size={19} aria-hidden="true" />
        )}
      </IconButton>
    </div>
  );
}
export function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="fwo-language-selector">
      <Select
        aria-label={t('language.label')}
        value={locale}
        title={t(locale === 'vi' ? 'language.vietnamese' : 'language.english')}
        onChange={(event) => {
          const value = event.target.value;
          if (value === 'vi' || value === 'en') setLocale(value);
        }}
      >
        <option value="vi" lang="vi">
          🇻🇳 {t('language.vietnamese')}
        </option>
        <option value="en" lang={locale}>
          🇬🇧 {t('language.english')}
        </option>
      </Select>
    </div>
  );
}
export function BottomActions({ children }: { children: React.ReactNode }) {
  useI18n();
  return <div className="fwo-bottom-actions">{children}</div>;
}
export function EmptyState({
  title = translate('ui.nothing.here.yet'),
  description,
  action,
  compact = false,
  icon,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
  icon?: React.ReactNode;
}) {
  useI18n();
  return (
    <div className={`fwo-empty ${compact ? 'fwo-empty--compact' : ''}`}>
      <span className="fwo-empty-icon">{icon ?? <Fish size={29} />}</span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function LoadingState({
  label = translate('ui.preparing.a.peaceful.lakeside.corner'),
}: {
  label?: string;
}) {
  useI18n();
  return (
    <div className="fwo-loading" role="status">
      <LoaderCircle className="fwo-spin" size={26} />
      <p>{label}</p>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  useI18n();
  return (
    <div className="fwo-error" role="alert">
      <CircleAlert size={25} />
      <h3>{translate('ui.unable.to.load.data')}</h3>
      <p>
        {error instanceof Error
          ? localizeMessage(error.message)
          : translate('ui.connection.interrupted.please.try.again')}
      </p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          {translate('ui.try.again')}{' '}
        </Button>
      )}
    </div>
  );
}
export function Notice({
  children,
  tone = 'info',
}: {
  children: React.ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'danger';
}) {
  useI18n();
  return (
    <div
      className={`fwo-notice fwo-notice--${tone}`}
      role={tone === 'danger' ? 'alert' : undefined}
    >
      <CircleAlert size={17} />
      <span>{children}</span>
    </div>
  );
}
export function Progress({
  value,
  max = 100,
  label,
  tone = 'green',
  testId,
  ariaLabel,
}: {
  value: number;
  max?: number;
  label?: string;
  tone?: 'green' | 'coral' | 'gold';
  testId?: string;
  ariaLabel?: string;
}) {
  useI18n();
  const p = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="fwo-progress-wrap">
      {label && (
        <div className="fwo-progress-label">
          {label}
          <span>{Math.round(p)}%</span>
        </div>
      )}
      <div
        className={`fwo-progress fwo-progress--${tone}`}
        role="progressbar"
        data-testid={testId}
        aria-label={ariaLabel ?? label ?? translate('ui.progress')}
        aria-valuenow={Math.max(0, Math.min(value, max))}
        aria-valuemax={max}
        aria-valuemin={0}
      >
        <span style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}
export const formatNumber = (n: number | string) =>
  new Intl.NumberFormat(localeTag()).format(
    typeof n === 'string' ? BigInt(n) : n,
  );
export const formatWeight = (g: number) =>
  new Intl.NumberFormat(localeTag(), { maximumFractionDigits: 2 }).format(
    g / 1000,
  ) + ' kg';
export function CurrencyAmount({ value }: { value: number | string }) {
  useI18n();
  return (
    <span className="fwo-currency">
      <span className="fwo-coin" aria-hidden="true">
        G
      </span>
      {formatNumber(value)}
      <span className="fwo-sr-only"> Gold</span>
    </span>
  );
}
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'default',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'default' | 'wide';
}) {
  useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const prior = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      if (prior?.isConnected) prior.focus({ preventScroll: true });
    };
  }, [open]);
  if (!open) return null;
  return (
    <dialog
      ref={dialog}
      className={`fwo-modal${size === 'wide' ? ' fwo-modal--wide' : ''}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const bounds = e.currentTarget.getBoundingClientRect();
        if (
          e.clientX < bounds.left ||
          e.clientX > bounds.right ||
          e.clientY < bounds.top ||
          e.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <IconButton label={translate('ui.close')} onClick={onClose}>
          <X size={20} />
        </IconButton>
      </header>
      <div className="fwo-modal-content">{children}</div>
      {footer && <BottomActions>{footer}</BottomActions>}
    </dialog>
  );
}
type ToastContextValue = (
  message: UiMessage,
  tone?: 'success' | 'danger',
) => void;
const ToastContext = createContext<ToastContextValue>(() => {});
export function ToastProvider({ children }: { children: React.ReactNode }) {
  useI18n();
  const [toasts, setToasts] = useState<
    { id: string; message: UiMessage; tone: string }[]
  >([]);
  const notify: ToastContextValue = (message, tone = 'success') => {
    const id = crypto.randomUUID();
    setToasts((v) => [...v.slice(-3), { id, message, tone }]);
    window.setTimeout(
      () => setToasts((v) => v.filter((t) => t.id !== id)),
      6000,
    );
  };
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="fwo-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`fwo-toast fwo-toast--${t.tone}`}>
            {t.tone === 'success' ? (
              <CheckCircle2 size={20} />
            ) : (
              <CircleAlert size={20} />
            )}
            <span>{localizeMessage(t.message)}</span>
            <button
              type="button"
              onClick={() => setToasts((v) => v.filter((x) => x.id !== t.id))}
              aria-label={translate('ui.dismiss.notification')}
            >
              <X size={17} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
type ArtModule = typeof import('./three/art');
type LakeModule = typeof import('./three/lake');
let artModule: Promise<ArtModule> | null = null;
let lakeModule: Promise<LakeModule> | null = null;
// three.js stays in lazy chunks so pages without artwork never download it.
const loadArt = () => (artModule ??= import('./three/art'));
const loadLake = () => (lakeModule ??= import('./three/lake'));
const systemReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * 3D model art. Grids get a cached render from one shared WebGL context;
 * `live` mounts a turntable canvas for single detail views.
 */
function ModelArt({
  subject,
  className,
  live,
  muted,
  reducedMotion,
}: {
  subject: { type: 'fish' | 'equipment'; id: string; lengthCm?: number };
  className: string;
  live: boolean;
  muted?: boolean;
  reducedMotion?: boolean;
}) {
  useI18n();
  const host = useRef<HTMLSpanElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const viewer = useRef<ReturnType<ArtModule['mountArtViewer']>>(null);
  const motion = reducedMotion ?? systemReducedMotion();
  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    void loadArt()
      .then((m) => {
        if (cancelled || !host.current) return;
        if (live) {
          viewer.current = m.mountArtViewer(host.current, subject, {
            reducedMotion: motion,
          });
          if (viewer.current) return;
        }
        setSrc(m.renderArtImage(subject, host.current));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      viewer.current?.destroy();
      viewer.current = null;
    };
    // Re-mount only when the subject or mode changes; motion is pushed below.
  }, [subject.type, subject.id, subject.lengthCm, live]);
  useEffect(() => {
    viewer.current?.setReducedMotion(motion);
  }, [motion]);
  return (
    <span
      ref={host}
      className={`fwo-art fwo-art--model ${className}`}
      aria-hidden="true"
      data-muted={muted ? 'true' : undefined}
    >
      {src && <img src={src} alt="" draggable={false} />}
    </span>
  );
}
function FishPhotoArt({
  photo,
  className,
  muted,
  detail,
}: {
  photo?: Partial<FishPhoto> & Pick<FishPhoto, 'src'>;
  className: string;
  muted: boolean;
  detail: boolean;
}) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  return (
    <figure
      className={`fwo-art fwo-art--photo fwo-fish-art ${className}`}
      data-muted={muted || undefined}
      data-detail={detail || undefined}
    >
      {photo && !failed ? (
        <img
          src={photo.src}
          srcSet={photo.srcSet}
          sizes={
            detail
              ? '(max-width: 720px) 100vw, 640px'
              : '(max-width: 720px) 100vw, 420px'
          }
          alt=""
          loading={detail ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
        />
      ) : (
        <EmptyState compact title={t('fish.photoUnavailable')} />
      )}
      {photo?.source &&
        photo.author &&
        photo.license &&
        !failed &&
        detail &&
        !muted && (
          <figcaption>
            <a href={photo.source} target="_blank" rel="noreferrer noopener">
              {t('fish.photoCredit', {
                author: photo.author,
                license: photo.license,
              })}
            </a>
          </figcaption>
        )}
    </figure>
  );
}

export function FishArt({
  slug = '',
  imageKey,
  previewSrc,
  className = '',
  muted = false,
  live = false,
  reducedMotion,
  lengthCm,
  mode = 'photo',
}: {
  slug?: string;
  /** Saved catalog image; falls back to the legacy slug when absent. */
  imageKey?: string;
  /** Temporary browser object URL for an unsaved photograph. */
  previewSrc?: string;
  className?: string;
  muted?: boolean;
  /** Interactive model or full photograph, depending on mode. */
  live?: boolean;
  reducedMotion?: boolean;
  lengthCm?: number;
  /** Simulator trophies use 3D; existing catalog photos remain supported. */
  mode?: 'photo' | 'model';
}) {
  useI18n();
  if (mode === 'model')
    return (
      <ModelArt
        subject={{ type: 'fish', id: slug, lengthCm }}
        className={`fwo-fish-art ${className}`}
        muted={muted}
        live={live}
        reducedMotion={reducedMotion}
      />
    );
  return (
    <FishPhotoArt
      key={previewSrc ?? imageKey ?? slug}
      photo={
        previewSrc?.startsWith('blob:')
          ? { src: previewSrc }
          : imageKey
            ? imageKey.startsWith('fish/')
              ? fishPhotos[imageKey.slice(5)]
              : /^(https:\/\/|\/fish\/|\/api\/v1\/fish-photos\/)/.test(imageKey)
                ? (Object.values(fishPhotos).find(
                    (photo) => photo.src === imageKey,
                  ) ?? { src: imageKey })
                : undefined
            : fishPhotos[slug]
      }
      className={className}
      detail={live}
      muted={muted}
    />
  );
}
export function EquipmentArt({
  kind = 'ROD',
  className = '',
  live = false,
  reducedMotion,
}: {
  kind?: string;
  className?: string;
  live?: boolean;
  reducedMotion?: boolean;
}) {
  useI18n();
  return (
    <ModelArt
      subject={{ type: 'equipment', id: kind }}
      className={`fwo-equipment-art ${className}`}
      live={live}
      reducedMotion={reducedMotion}
    />
  );
}
/**
 * Live 3D fishing-spot illustration (decorative, idle line in the water). Terrain
 * follows `environment`; sky and lighting follow the device's real local time.
 */
export function LakeArt({
  className = '',
  reducedMotion,
  environment,
}: {
  className?: string;
  reducedMotion?: boolean;
  environment?: Environment;
}) {
  useI18n();
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<ReturnType<LakeModule['createLakeWorld']>>(null);
  const motion = reducedMotion ?? systemReducedMotion();
  const initialMotion = useRef(motion);
  useEffect(() => {
    let cancelled = false;
    void loadLake()
      .then((m) => {
        if (cancelled || !host.current) return;
        world.current = m.createLakeWorld(host.current, {
          decorative: true,
          environment,
          reducedMotion: initialMotion.current,
          fishing: { active: true, bite: false, fighting: false, progress: 0 },
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      world.current?.destroy();
      world.current = null;
    };
  }, [environment]);
  useEffect(() => {
    world.current?.setReducedMotion(motion);
  }, [motion]);
  return (
    <div
      ref={host}
      className={`fwo-art fwo-lake-art ${className}`}
      aria-hidden="true"
    />
  );
}

export { CharacterPreview } from './CharacterPreview';

export { CharacterThumbnail } from './CharacterThumbnail';
