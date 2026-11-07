import { useSyncExternalStore } from 'react';
import { vi } from './locales/vi';
import { en } from './locales/en';
import type {
  Locale,
  MessageDescriptor,
  MessageKey,
  TranslationValues,
} from './types';

export type {
  Locale,
  MessageKey,
  TranslationCatalog,
  TranslationValues,
  MessageDescriptor,
} from './types';
export const localeStorageKey = 'fwo:language';
export const defaultLocale: Locale = 'vi';
export type UiMessage = string | MessageDescriptor;
export const supportedLocales = ['vi', 'en'] as const;
const catalogs = { vi, en };
const listeners = new Set<() => void>();
const validLocale = (value: unknown): value is Locale =>
  supportedLocales.some((locale) => locale === value);

function storedLocale(): Locale {
  try {
    const value = globalThis.localStorage?.getItem(localeStorageKey);
    return validLocale(value) ? value : defaultLocale;
  } catch {
    return defaultLocale;
  }
}
let currentLocale = storedLocale();
export const getLocale = () => currentLocale;
export const localeTag = (locale = currentLocale) =>
  locale === 'en' ? 'en-GB' : 'vi-VN';
export function t(key: MessageKey, values: TranslationValues = {}): string {
  const message = catalogs[currentLocale][key] ?? vi[key] ?? key;
  return message.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder,
  );
}
const sourceKeys = new Map<string, MessageKey>(
  (Object.keys(vi) as MessageKey[]).flatMap(
    (key) =>
      [
        [vi[key], key],
        [en[key], key],
      ] as [string, MessageKey][],
  ),
);
/** Translate known server messages; leave authored content and unknown messages intact. */
export function localizeMessage(message: UiMessage): string {
  if (typeof message !== 'string') return t(message.key, message.values);
  const key = sourceKeys.get(message);
  return key ? t(key) : message;
}
function applyLocale(locale: Locale) {
  currentLocale = locale;
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
  listeners.forEach((listener) => listener());
}
export function setLocale(locale: Locale) {
  if (!validLocale(locale)) return;
  try {
    globalThis.localStorage?.setItem(localeStorageKey, locale);
  } catch {
    // Keep the selection for this session when browser storage is unavailable.
  }
  if (locale !== currentLocale) applyLocale(locale);
}
function onStorage(event: StorageEvent) {
  if (event.storageArea !== window.localStorage) return;
  if (event.key === localeStorageKey || event.key === null)
    applyLocale(validLocale(event.newValue) ? event.newValue : defaultLocale);
}
export function subscribeLocale(listener: () => void) {
  if (!listeners.size && typeof window !== 'undefined') {
    // Read again in case the preference changed before the first subscriber mounted.
    currentLocale = storedLocale();
    window.addEventListener('storage', onStorage);
  }
  listeners.add(listener);
  if (typeof document !== 'undefined')
    document.documentElement.lang = currentLocale;
  return () => {
    listeners.delete(listener);
    if (!listeners.size && typeof window !== 'undefined')
      window.removeEventListener('storage', onStorage);
  };
}
export function useI18n() {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLocale,
    () => defaultLocale,
  );
  return { locale, setLocale, t };
}
