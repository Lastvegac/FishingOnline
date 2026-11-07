import { t as translate, type MessageKey } from '@fwo/ui';
import {
  Anchor,
  BarChart3,
  ClipboardList,
  CreditCard,
  Fish,
  Flag,
  LayoutDashboard,
  Leaf,
  Package,
  Settings,
  Shirt,
  ShoppingBag,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export type AdminRole = 'SUPER_ADMIN' | 'GAME_ADMIN' | 'SUPPORT' | 'ANALYST';
const everyone: AdminRole[] = [
  'SUPER_ADMIN',
  'GAME_ADMIN',
  'SUPPORT',
  'ANALYST',
];
const editors: AdminRole[] = ['SUPER_ADMIN', 'GAME_ADMIN'];
const operations: AdminRole[] = ['SUPER_ADMIN', 'SUPPORT'];

export type AdminLink = {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: AdminRole[];
  /** Shown as a quick action on the overview when present. */
  description?: string;
};
export type AdminGroup = { id: string; label: string; links: AdminLink[] };

/** Labels are computed at render time so a language switch applies immediately. */
export function navigationGroups(): AdminGroup[] {
  const d = (key: MessageKey) => translate(key);
  return [
    {
      id: 'overview',
      label: d('admin.nav.groupOverview'),
      links: [
        {
          to: '/',
          label: d('ui.overview'),
          icon: LayoutDashboard,
          roles: everyone,
        },
        {
          to: '/analytics',
          label: d('admin.nav.analytics'),
          icon: BarChart3,
          roles: everyone,
        },
      ],
    },
    {
      id: 'content',
      label: d('admin.nav.groupContent'),
      links: [
        {
          to: '/data/fish',
          label: d('ui.fish.species'),
          icon: Fish,
          roles: editors,
          description: d('admin.desc.fish'),
        },
        {
          to: '/data/locations',
          label: d('ui.fishing.lakes'),
          icon: Leaf,
          roles: editors,
          description: d('admin.desc.locations'),
        },
        {
          to: '/data/equipment',
          label: d('ui.equipment'),
          icon: Anchor,
          roles: editors,
          description: d('admin.desc.equipment'),
        },
        {
          to: '/data/baits',
          label: d('ui.bait'),
          icon: Package,
          roles: editors,
          description: d('admin.desc.baits'),
        },
        {
          to: '/data/shop-items',
          label: d('ui.shop.prices'),
          icon: ShoppingBag,
          roles: editors,
          description: d('admin.desc.shopItems'),
        },
        {
          to: '/data/missions',
          label: d('ui.missions'),
          icon: Flag,
          roles: editors,
          description: d('admin.desc.missions'),
        },
        {
          to: '/fashion',
          label: d('fashion.adminTitle'),
          icon: Shirt,
          roles: ['SUPER_ADMIN', 'GAME_ADMIN', 'ANALYST'],
        },
      ],
    },
    {
      id: 'community',
      label: d('admin.nav.groupCommunity'),
      links: [
        {
          to: '/users',
          label: d('ui.players'),
          icon: Users,
          roles: ['SUPER_ADMIN', 'GAME_ADMIN', 'SUPPORT'],
          description: d('admin.desc.users'),
        },
        {
          to: '/operations/wallet-transactions',
          label: d('ui.gold.ledger'),
          icon: Wallet,
          roles: operations,
          description: d('admin.desc.ledger'),
        },
        {
          to: '/payments',
          label: d('payments.admin'),
          icon: CreditCard,
          roles: operations,
        },
      ],
    },
    {
      id: 'system',
      label: d('admin.nav.groupSystem'),
      links: [
        {
          to: '/configs',
          label: d('ui.configuration.versions'),
          icon: Settings,
          roles: editors,
          description: d('admin.desc.configs'),
        },
        {
          to: '/operations/audit-logs',
          label: d('ui.admin.audit.log'),
          icon: ClipboardList,
          roles: operations,
          description: d('admin.desc.audit'),
        },
      ],
    },
  ];
}

export function groupsForRole(role: string) {
  return navigationGroups()
    .map((group) => ({
      ...group,
      links: group.links.filter((link) =>
        link.roles.includes(role as AdminRole),
      ),
    }))
    .filter((group) => group.links.length > 0);
}

export function allLinks() {
  return navigationGroups().flatMap((group) => group.links);
}

/** The nav entry that owns a path, for the breadcrumb and document title. */
export function linkForPath(pathname: string) {
  const links = allLinks();
  return (
    links.find((link) => link.to === pathname) ??
    links
      .filter((link) => link.to !== '/' && pathname.startsWith(`${link.to}/`))
      .sort((a, b) => b.to.length - a.to.length)[0]
  );
}
