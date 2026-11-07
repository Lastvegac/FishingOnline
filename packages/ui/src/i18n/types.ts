import type { vi } from './locales/vi';

export type Locale = 'vi' | 'en';
export type MessageKey = keyof typeof vi;
export type TranslationCatalog = { readonly [K in MessageKey]: string };
export type TranslationValues = Record<string, string | number>;
export type MessageDescriptor = { key: MessageKey; values?: TranslationValues };
