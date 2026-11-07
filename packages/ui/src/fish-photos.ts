/**
 * Real fish photographs used by FishArt, served from apps/web/public/fish.
 * Prefer clear photographs of healthy live fish with intact fins.
 * Sources: Wikimedia Commons / iNaturalist. `src` is the light ≤720–1280px file; optional
 * `srcSet` adds a ≤1600px copy in /fish/hd so retina screens stay sharp. Keep author/license with the image;
 * CC BY-SA files are redistributed under the same license. See docs/ASSETS.md.
 */
export interface FishPhoto {
  src: string;
  /** Width-described candidates (`url 720w, url 1600w`) for high-DPI displays. */
  srcSet?: string;
  author: string;
  license: string;
  licenseUrl?: string;
  source: string;
}
export const fishPhotos: Record<string, FishPhoto> = {
  carp: {
    src: '/fish/carp.jpg',
    srcSet: '/fish/carp.jpg 720w, /fish/hd/carp.jpg 1600w',
    author: 'George Chernilevsky',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
    source:
      'https://commons.wikimedia.org/wiki/File:Cyprinus_carpio_2008_G1_(cropped).jpg',
  },
  'grass-carp': {
    src: '/fish/live/grass-carp.jpg',
    srcSet: '/fish/live/grass-carp.jpg 1280w, /fish/hd/grass-carp.jpg 1600w',
    author: 'Damien',
    license: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0',
    source:
      'https://commons.wikimedia.org/wiki/File:Limoges_aquarium_201708_5_(42047139015).jpg',
  },
  tilapia: {
    src: '/fish/tilapia.jpg',
    srcSet: '/fish/tilapia.jpg 720w, /fish/hd/tilapia.jpg 1600w',
    author: 'Germano Roberto Schüür',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    source:
      'https://commons.wikimedia.org/wiki/File:Til%C3%A1pia_ou_Sarotherodon_niloticus_2.jpg',
  },
  snakehead: {
    src: '/fish/live/snakehead.jpg',
    author: 'BEDO (Thailand)',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Channa_striata.jpg',
  },
  'walking-catfish': {
    src: '/fish/walking-catfish.jpg',
    srcSet:
      '/fish/walking-catfish.jpg 720w, /fish/hd/walking-catfish.jpg 1600w',
    author: 'Mistvan',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
    source:
      'https://commons.wikimedia.org/wiki/File:Clarias_batrachus-ZOO.Brno.jpg',
  },
  pangasius: {
    src: '/fish/pangasius.jpg',
    srcSet: '/fish/pangasius.jpg 720w, /fish/hd/pangasius.jpg 1234w',
    author: 'User:Melanochromis',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Iridescent_shark.jpg',
  },
  'silver-carp': {
    src: '/fish/silver-carp.jpg',
    srcSet: '/fish/silver-carp.jpg 720w, /fish/hd/silver-carp.jpg 1600w',
    author: 'USFWS Mountain-Prairie',
    license: 'Public domain',
    source:
      'https://commons.wikimedia.org/wiki/File:Silver_Carp_Adult_(Hypophthalmichthys_molitrix).jpg',
  },
  'climbing-perch': {
    src: '/fish/live/climbing-perch.jpg',
    srcSet:
      '/fish/live/climbing-perch.jpg 1280w, /fish/hd/climbing-perch.jpg 1600w',
    author: 'Abu Hamas',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    source:
      'https://commons.wikimedia.org/wiki/File:Anabas_testudineus_52464852.jpg',
  },
  'giant-gourami': {
    src: '/fish/giant-gourami.jpg',
    srcSet: '/fish/giant-gourami.jpg 720w, /fish/hd/giant-gourami.jpg 1600w',
    author: 'George Chernilevsky',
    license: 'Public domain',
    source:
      'https://commons.wikimedia.org/wiki/File:Osphronemus_goramy_2008_G1.jpg',
  },
  'red-tilapia': {
    src: '/fish/live/red-tilapia.jpg',
    author: 'agriculturasp',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    source: 'https://www.flickr.com/photos/39272011@N07/6022028960/',
  },
  'river-goby': {
    src: '/fish/river-goby.jpg',
    srcSet: '/fish/river-goby.jpg 720w, /fish/hd/river-goby.jpg 1600w',
    author: 'Wibowo Djatmiko (Wie146)',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    source:
      'https://commons.wikimedia.org/wiki/File:Glossogo_giur_160312-57258_rwg.JPG',
  },
  chub: {
    src: '/fish/chub.jpg',
    srcSet: '/fish/chub.jpg 720w, /fish/hd/chub.jpg 1600w',
    author: 'Gaeho77',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    source:
      'https://commons.wikimedia.org/wiki/File:Squaliobarbus_curriculus,_Seocheon.jpg',
  },
  'bagrid-catfish': {
    src: '/fish/bagrid-catfish.jpg',
    author: 'Catxx',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
    source: 'https://commons.wikimedia.org/wiki/File:Cranoglanis_bouderius.jpg',
  },
  hemibagrus: {
    src: '/fish/hemibagrus.jpg',
    author: 'FloUdon',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
    source: 'https://commons.wikimedia.org/wiki/File:Redtail-Catfish.jpg',
  },
  'giant-barb': {
    src: '/fish/giant-barb.jpg',
    srcSet: '/fish/giant-barb.jpg 720w, /fish/hd/giant-barb.jpg 1200w',
    author: 'User:Lerdsuwa',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Giant_Barb.jpg',
  },
  'stream-minnow': {
    src: '/fish/live/stream-minnow.jpg',
    srcSet:
      '/fish/live/stream-minnow.jpg 1024w, /fish/hd/stream-minnow.jpg 1600w',
    author: 'Yung-Lun Lin',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0',
    source: 'https://www.inaturalist.org/photos/586203254',
  },
  'stream-loach': {
    src: '/fish/live/stream-loach.jpg',
    srcSet:
      '/fish/live/stream-loach.jpg 1024w, /fish/hd/stream-loach.jpg 1600w',
    author: 'no rights reserved',
    license: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0',
    source: 'https://www.inaturalist.org/photos/275164970',
  },
  hampala: {
    src: '/fish/live/hampala.jpg',
    author: 'Ong Jyh Seng',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    source: 'https://www.inaturalist.org/photos/293461062',
  },
  spinibarbus: {
    src: '/fish/spinibarbus.jpg',
    srcSet: '/fish/spinibarbus.jpg 720w, /fish/hd/spinibarbus.jpg 1463w',
    author: 'Cool critter channel',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Phoenix_barb.jpg',
  },
  bagarius: {
    src: '/fish/live/bagarius.jpg',
    author: 'Beta Mahatvaraj',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Bagarius_bagarius.jpg',
  },
  mahseer: {
    src: '/fish/live/mahseer.jpg',
    srcSet: '/fish/live/mahseer.jpg 1024w, /fish/hd/mahseer.jpg 1600w',
    author: 'Ong Jyh Seng',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    source: 'https://www.inaturalist.org/photos/270432003',
  },
  'snakeskin-gourami': {
    src: '/fish/live/snakeskin-gourami.jpg',
    author: 'BEDO (Thailand)]',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    source:
      'https://commons.wikimedia.org/wiki/File:Trichopodus_pectoralis.jpg',
  },
  featherback: {
    src: '/fish/featherback.jpg',
    srcSet: '/fish/featherback.jpg 720w, /fish/hd/featherback.jpg 901w',
    author: 'Xufanc',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
    source:
      'https://commons.wikimedia.org/wiki/File:Notopterus_notopterus46.JPG',
  },
  'clown-featherback': {
    src: '/fish/clown-featherback.jpg',
    author: 'Parkourprincess',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Chitala_Ornata.jpg',
  },
  'giant-snakehead': {
    src: '/fish/giant-snakehead.jpg',
    srcSet:
      '/fish/giant-snakehead.jpg 720w, /fish/hd/giant-snakehead.jpg 1600w',
    author: 'George Chernilevsky',
    license: 'Public domain',
    source:
      'https://commons.wikimedia.org/wiki/File:Channa_micropeltes_2012_G1.jpg',
  },
  'mudskipper-goby': {
    src: '/fish/live/mudskipper-goby.jpg',
    srcSet:
      '/fish/live/mudskipper-goby.jpg 1024w, /fish/hd/mudskipper-goby.jpg 1600w',
    author: 'Dmitry Ivanov',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0',
    source: 'https://www.inaturalist.org/photos/586010879',
  },
  mullet: {
    src: '/fish/mullet.jpg',
    srcSet: '/fish/mullet.jpg 720w, /fish/hd/mullet.jpg 1600w',
    author: 'Diego Delso',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    source:
      'https://commons.wikimedia.org/wiki/File:M%C3%BAjol_(Mugil_cephalus),_Parque_natural_de_la_Arr%C3%A1bida,_Portugal,_2021-09-09,_DD_25.jpg',
  },
  'spotted-scat': {
    src: '/fish/spotted-scat.jpg',
    srcSet: '/fish/spotted-scat.jpg 720w, /fish/hd/spotted-scat.jpg 1024w',
    author: 'Fokko Toelstede, Wikipedia-User „Nyks“',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
    source: 'https://commons.wikimedia.org/wiki/File:Scatophagus_argus.jpg',
  },
  barramundi: {
    src: '/fish/barramundi.jpg',
    srcSet: '/fish/barramundi.jpg 720w, /fish/hd/barramundi.jpg 1600w',
    author: 'Mitch Ames',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    source:
      'https://commons.wikimedia.org/wiki/File:Lates_calcarifer,_2014-09-19a.jpg',
  },
  'mangrove-snapper': {
    src: '/fish/live/mangrove-snapper.jpg',
    author: 'Jan Ebr &amp; Ivana Ebrová',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0',
    source: 'https://www.inaturalist.org/photos/260893707',
  },
  sillago: {
    src: '/fish/live/sillago.jpg',
    author: 'Shaunak Modi',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0',
    source: 'https://www.inaturalist.org/photos/16963694',
  },
  'round-scad': {
    src: '/fish/live/round-scad.jpg',
    srcSet: '/fish/live/round-scad.jpg 1024w, /fish/hd/round-scad.jpg 1600w',
    author: 'Nicola Crockford',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0',
    source: 'https://www.inaturalist.org/photos/574361195',
  },
  'spanish-mackerel': {
    src: '/fish/live/spanish-mackerel.jpg',
    author: 'Ewout Knoester',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    source: 'https://www.inaturalist.org/photos/116778763',
  },
  pompano: {
    src: '/fish/pompano.jpg',
    author: 'David Burdick',
    license: 'Public domain',
    source:
      'https://commons.wikimedia.org/wiki/File:Trachinotus_blochii,_Guam.jpg',
  },
  barracuda: {
    src: '/fish/barracuda.jpg',
    srcSet: '/fish/barracuda.jpg 720w, /fish/hd/barracuda.jpg 1600w',
    author: 'Diego Delso',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    source:
      'https://commons.wikimedia.org/wiki/File:Gran_barracuda_(Sphyraena_barracuda),_Yeda,_Arabia_Saudita,_2025-05-20,_DD_118.jpg',
  },
  grouper: {
    src: '/fish/live/grouper.jpg',
    srcSet: '/fish/live/grouper.jpg 960w, /fish/hd/grouper.jpg 1600w',
    author: 'タウナギ',
    license: 'CC0',
    licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/deed.en',
    source:
      'https://commons.wikimedia.org/wiki/File:Epinephelus_coioides_Uotto.jpg',
  },
  'giant-grouper': {
    src: '/fish/giant-grouper.jpg',
    srcSet: '/fish/giant-grouper.jpg 720w, /fish/hd/giant-grouper.jpg 1600w',
    author: 'Bernard DUPONT',
    license: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0',
    source:
      'https://commons.wikimedia.org/wiki/File:Epinephelus_lanceolatus_(uShaka).jpg',
  },
};
