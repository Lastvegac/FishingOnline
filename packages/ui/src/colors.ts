export type ColorToken = `--color-${string}`;

/** Read the same semantic CSS token used by the DOM/SVG design system. */
export function readCssColor(
  token: ColorToken,
  element: Element = document.documentElement,
): string {
  const value = getComputedStyle(element).getPropertyValue(token).trim();
  if (!value) throw new Error(`Missing design color token: ${token}`);
  return value;
}

/** WebGL materials take integers; conversion happens only after resolving the CSS palette. */
export function readCanvasColor(token: ColorToken, element?: Element): number {
  const value = readCssColor(token, element);
  if (!/^#[\da-f]{6}$/i.test(value))
    throw new Error(
      `Canvas token must resolve to an opaque palette color: ${token}`,
    );
  return Number.parseInt(value.slice(1), 16);
}

export function getCanvasPalette(element?: Element) {
  const read = (role: string) =>
    readCanvasColor(`--color-scene-${role}`, element);
  return {
    skyTop: read('sky-top'),
    skyBottom: read('sky-bottom'),
    sun: read('sun'),
    hillFar: read('hill-far'),
    hillMiddle: read('hill-middle'),
    hillNear: read('hill-near'),
    waterTop: read('water-top'),
    waterBottom: read('water-bottom'),
    tree: read('tree'),
    treeLight: read('tree-light'),
    grass: read('grass'),
    grassLight: read('grass-light'),
    grassDark: read('grass-dark'),
    woodDark: read('wood-dark'),
    wood: read('wood'),
    woodLight: read('wood-light'),
    pants: read('pants'),
    shirt: read('shirt'),
    skin: read('skin'),
    hat: read('hat'),
    hatShadow: read('hat-shadow'),
    rod: read('rod'),
    reel: read('reel'),
    outline: read('outline'),
    bobber: read('bobber'),
    bobberLight: read('bobber-light'),
    fishShadow: read('fish-shadow'),
    reed: read('reed'),
    bird: read('bird'),
    ripple: read('ripple'),
    line: read('line'),
    light: read('light'),
    lotus: read('lotus'),
    lotusHeart: read('lotus-heart'),
    lotusPad: read('lotus-pad'),
    stone: read('stone'),
    nightSkyTop: read('night-sky-top'),
    nightSkyBottom: read('night-sky-bottom'),
    dawnSkyTop: read('dawn-sky-top'),
    dawnSkyBottom: read('dawn-sky-bottom'),
    duskSkyTop: read('dusk-sky-top'),
    duskSkyBottom: read('dusk-sky-bottom'),
    goldenLight: read('golden-light'),
    duskLight: read('dusk-light'),
    moonLight: read('moon-light'),
    moon: read('moon'),
    star: read('star'),
    firefly: read('firefly'),
    lantern: read('lantern'),
    sand: read('sand'),
    sandDark: read('sand-dark'),
    mud: read('mud'),
    silt: read('silt'),
    rock: read('rock'),
    rockDark: read('rock-dark'),
    moss: read('moss'),
    seaTop: read('sea-top'),
    seaBottom: read('sea-bottom'),
    swamp: read('swamp'),
    foam: read('foam'),
    palm: read('palm'),
    bamboo: read('bamboo'),
    mangrove: read('mangrove'),
  };
}
