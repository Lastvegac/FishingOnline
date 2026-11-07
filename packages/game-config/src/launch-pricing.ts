/** Acquisition trial, not a promise of profitability. Gold is never sold by this profile. */
export const LAUNCH_PRICING_ID = 'acquisition-2026-11-v1';
export const LAUNCH_COSMETIC_PRICES: Record<
  string,
  { currency: 'GOLD' | 'DIAMOND'; price: string }
> = {
  fan: { currency: 'GOLD', price: '20' },
  'wine-flask': { currency: 'GOLD', price: '20' },
  'bamboo-fan': { currency: 'GOLD', price: '20' },
  'jade-necklace': { currency: 'GOLD', price: '30' },
  'jade-bracelet': { currency: 'GOLD', price: '20' },
  'silk-veil': { currency: 'GOLD', price: '20' },
  'cloak-wanderer': { currency: 'GOLD', price: '40' },
  'cloak-taoist': { currency: 'GOLD', price: '40' },
  'ceremonial-sword': { currency: 'DIAMOND', price: '30' },
  'festival-upper': { currency: 'DIAMOND', price: '50' },
  'festival-lower': { currency: 'DIAMOND', price: '50' },
  'winter-upper': { currency: 'DIAMOND', price: '60' },
  'winter-lower': { currency: 'DIAMOND', price: '60' },
  'royal-upper': { currency: 'DIAMOND', price: '100' },
  'royal-lower': { currency: 'DIAMOND', price: '100' },
  ...Object.fromEntries(
    [
      'dye-wine',
      'dye-lilac',
      'dye-blush',
      'pattern-lotus',
      'pattern-dragon',
      'pattern-phoenix',
      'pattern-cloud',
      'pattern-wave',
      'pattern-bamboo',
      'pattern-plum',
      'pattern-meander',
    ].map((id) => [id, { currency: 'GOLD' as const, price: '10' }]),
  ),
};
// Fixed IDs let operators re-run the pricing operation without creating duplicate packs.
export const LAUNCH_DIAMOND_PACKS = [
  {
    id: 'b0100000-0000-4000-8000-000000000001',
    name: 'Gói Khởi Đầu · 100 Kim cương',
    description:
      '100 Kim cương để chọn trang phục và đạo cụ ngoại hình. Không cộng sức mạnh câu cá.',
    amountVnd: '10000',
    diamonds: 100,
  },
  {
    id: 'b0100000-0000-4000-8000-000000000002',
    name: 'Gói Phong Cách · 200 Kim cương',
    description:
      '200 Kim cương để phối trang phục và đạo cụ ngoại hình. Không cộng sức mạnh câu cá.',
    amountVnd: '20000',
    diamonds: 200,
  },
] as const;
