/** 3D fish colors remain CSS references so art follows the shared theme. */
export const fishArtPalette: Record<string, [string, string]> = {
  'ca-chep': ['var(--color-fish-carp-dark)', 'var(--color-fish-carp-light)'],
  'ca-tram': [
    'var(--color-fish-grass-carp-dark)',
    'var(--color-fish-grass-carp-light)',
  ],
  'ca-ro-phi': [
    'var(--color-fish-tilapia-dark)',
    'var(--color-fish-tilapia-light)',
  ],
  'ca-loc': [
    'var(--color-fish-snakehead-dark)',
    'var(--color-fish-snakehead-light)',
  ],
  'ca-tre': [
    'var(--color-fish-catfish-dark)',
    'var(--color-fish-catfish-light)',
  ],
  'ca-tra': [
    'var(--color-fish-pangasius-dark)',
    'var(--color-fish-pangasius-light)',
  ],
  'ca-me': [
    'var(--color-fish-silver-carp-dark)',
    'var(--color-fish-silver-carp-light)',
  ],
  'ca-ro': ['var(--color-fish-perch-dark)', 'var(--color-fish-perch-light)'],
  'ca-tai-tuong': [
    'var(--color-fish-gourami-dark)',
    'var(--color-fish-gourami-light)',
  ],
  'ca-dieu-hong': [
    'var(--color-fish-red-tilapia-dark)',
    'var(--color-fish-red-tilapia-light)',
  ],
};
// Related species share a natural color family while retaining their own shape.
const paletteFamilies: Record<string, string> = {
  'river-goby': 'ca-tram',
  chub: 'ca-me',
  'bagrid-catfish': 'ca-tre',
  hemibagrus: 'ca-tre',
  'giant-barb': 'ca-me',
  'stream-minnow': 'ca-me',
  'stream-loach': 'ca-chep',
  hampala: 'ca-chep',
  spinibarbus: 'ca-chep',
  bagarius: 'ca-tre',
  mahseer: 'ca-chep',
  'snakeskin-gourami': 'ca-ro',
  featherback: 'ca-me',
  'clown-featherback': 'ca-me',
  'giant-snakehead': 'ca-loc',
  'mudskipper-goby': 'ca-tram',
  mullet: 'ca-me',
  'spotted-scat': 'ca-ro',
  barramundi: 'ca-me',
  'mangrove-snapper': 'ca-dieu-hong',
  sillago: 'ca-me',
  'round-scad': 'ca-tra',
  'spanish-mackerel': 'ca-tra',
  pompano: 'ca-chep',
  barracuda: 'ca-me',
  grouper: 'ca-tram',
  'giant-grouper': 'ca-loc',
};
for (const [species, family] of Object.entries(paletteFamilies)) {
  fishArtPalette[species] = fishArtPalette[family];
}
export const defaultFishArtPalette: [string, string] = [
  'var(--color-fish-default-dark)',
  'var(--color-fish-default-light)',
];
