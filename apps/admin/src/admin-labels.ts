import { t, type MessageKey } from '@fwo/ui';
const action: Record<string, MessageKey> = {
  APPLY_LAUNCH_PRICING: 'admin.value.action.0',
  BOOTSTRAP_SUPER_ADMIN: 'admin.value.action.1',
  CHARACTER_SAVE: 'admin.value.action.2',
  OUTFIT_EQUIP: 'admin.value.action.3',
  FASHION_ITEM: 'admin.value.action.4',
  FASHION_COLLECTION: 'admin.value.action.5',
  FASHION_EVENT: 'admin.value.action.6',
  FASHION_PASS: 'admin.value.action.7',
  UPDATE_CONFIG_ENTITY: 'admin.value.action.8',
  CREATE_CONFIG_ENTITY: 'admin.value.action.9',
  ARCHIVE_CONFIG_ENTITY: 'admin.value.action.10',
  USER_STATUS: 'admin.value.action.11',
  REVOKE_SESSIONS: 'admin.value.action.12',
  ADMIN_ROLE: 'admin.value.action.13',
  CREATE_CONFIG_DRAFT: 'admin.value.action.14',
  PUBLISH_CONFIG: 'admin.value.action.15',
  PAYMENT_RECONCILE_REQUEST: 'admin.value.action.16',
  PAYMENT_PRODUCT_CREATE: 'admin.value.action.17',
  PAYMENT_PRODUCT_UPDATE: 'admin.value.action.18',
};
const targetType: Record<string, MessageKey> = {
  PricingProfile: 'admin.value.targetType.0',
  User: 'admin.value.targetType.1',
  CHARACTER: 'admin.value.targetType.2',
  SystemConfig: 'admin.value.targetType.3',
  fish: 'admin.value.targetType.4',
  equipment: 'admin.value.targetType.5',
  baits: 'admin.value.targetType.6',
  locations: 'admin.value.targetType.7',
  missions: 'admin.value.targetType.8',
  'shop-items': 'admin.value.targetType.9',
  payment_order: 'admin.value.targetType.10',
  payment_product: 'admin.value.targetType.11',
};
const reason: Record<string, MessageKey> = {
  'Explicit operator bootstrap': 'admin.value.reason.0',
  'Apply user-approved acquisition prices before launch':
    'admin.value.reason.1',
  'Admin content editor': 'admin.value.reason.2',
  'Admin archive': 'admin.value.reason.3',
  CATCH: 'admin.value.reason.4',
  FISH_EXCHANGE: 'admin.value.reason.5',
  PURCHASE: 'admin.value.reason.6',
  ITEM_SALE: 'admin.value.reason.7',
  COSMETIC_PURCHASE: 'admin.value.reason.8',
  FASHION_COLLECTION: 'admin.value.reason.9',
  FASHION_EVENT: 'admin.value.reason.10',
  FASHION_PASS: 'admin.value.reason.11',
  STARTER: 'admin.value.reason.12',
  MISSION: 'admin.value.reason.13',
  UPGRADE: 'admin.value.reason.14',
  ENTRY_FEE: 'admin.value.reason.15',
};
const kind: Record<string, MessageKey> = {
  ROD: 'ui.rod',
  LINE: 'ui.line',
  HOOK: 'ui.hook',
  BAIT: 'ui.bait',
};

/** Display-only mapping; never rewrite audit records or operator-authored reasons. */
export function adminValue(value: string, field: string): string {
  const key =
    field === 'action'
      ? action[value]
      : field === 'targetType'
        ? targetType[value]
        : field === 'reason'
          ? (action[value] ?? reason[value])
          : field === 'kind' || field === 'slot'
            ? kind[value]
            : undefined;
  return key ? t(key) : value;
}
