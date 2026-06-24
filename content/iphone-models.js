/**
 * Velvet & Valor — iPhone model catalogue
 * Single source of truth for the per-model collection page generator
 * (scripts/build-models.js). Add next year's series here each September,
 * then run `npm run build:models`.
 *
 * `device` MUST match the <option value> in product.html #deviceSelect and the
 * value js/product.js parses from ?variant=<device>-glossy, so the buy CTA
 * carries the model straight into checkout.
 */

module.exports = {
  site: {
    baseUrl: 'https://www.velvet-valor.com',
    brand: 'Velvet & Valor',
    price: '$48',          // real Stripe price — keep in sync
    priceUsd: '48.00',
    priceGbp: '38.00',
    defaultOgImage: 'https://www.velvet-valor.com/images/og-home.jpg',
  },

  // Designs shown in the grid on every model page. Buy links resolve to
  // /products/noble-steed-{slug}?variant={device}-glossy
  designs: [
    { slug: 'nude',  name: 'Noble Steed — Nude',  image: 'nude product image v2.jpg' },
    { slug: 'pink',  name: 'Noble Steed — Pink',  image: 'pink product image.jpg' },
    { slug: 'plum',  name: 'Noble Steed — Plum',  image: 'plum product image.webp' },
    { slug: 'teal',  name: 'Noble Steed — Teal',  image: 'teal product image.webp' },
  ],

  /**
   * 24 models grouped by series. Per-model facts are the unique, indexable
   * content that keeps each page out of "thin/duplicate" territory.
   *   slug    → URL: /collections/iphone-{slug}-cases
   *   device  → checkout value (must match product.html)
   *   primaryKw → the head term the page targets
   */
  series: [
    {
      name: 'iPhone 17 Series', year: 2025,
      models: [
        { name: 'iPhone 17',         slug: 'iphone-17',         device: 'iphone17',         display: '6.3"', chip: 'A19',     cameras: 'Dual-camera',   primaryKw: 'horse iphone 17 case' },
        { name: 'iPhone 17 Air',     slug: 'iphone-17-air',     device: 'iphone17air',      display: '6.6"', chip: 'A19 Pro', cameras: 'Single-camera', primaryKw: 'horse iphone 17 air case' },
        { name: 'iPhone 17 Pro',     slug: 'iphone-17-pro',     device: 'iphone17pro',      display: '6.3"', chip: 'A19 Pro', cameras: 'Triple-camera', primaryKw: 'horse iphone 17 pro case' },
        { name: 'iPhone 17 Pro Max', slug: 'iphone-17-pro-max', device: 'iphone17promax',   display: '6.9"', chip: 'A19 Pro', cameras: 'Triple-camera', primaryKw: 'horse iphone 17 pro max case' },
      ],
    },
    {
      name: 'iPhone 16 Series', year: 2024,
      models: [
        { name: 'iPhone 16',         slug: 'iphone-16',         device: 'iphone16',         display: '6.1"', chip: 'A18',     cameras: 'Dual-camera',   primaryKw: 'horse iphone 16 case' },
        { name: 'iPhone 16 Pro',     slug: 'iphone-16-pro',     device: 'iphone16pro',      display: '6.3"', chip: 'A18 Pro', cameras: 'Triple-camera', primaryKw: 'horse iphone 16 pro case' },
        { name: 'iPhone 16 Pro Max', slug: 'iphone-16-pro-max', device: 'iphone16promax',   display: '6.9"', chip: 'A18 Pro', cameras: 'Triple-camera', primaryKw: 'horse iphone 16 pro max case' },
        { name: 'iPhone 16 Plus',    slug: 'iphone-16-plus',    device: 'iphone16plus',     display: '6.7"', chip: 'A18',     cameras: 'Dual-camera',   primaryKw: 'horse iphone 16 plus case' },
      ],
    },
    {
      name: 'iPhone 15 Series', year: 2023,
      models: [
        { name: 'iPhone 15',         slug: 'iphone-15',         device: 'iphone15',         display: '6.1"', chip: 'A16 Bionic', cameras: 'Dual-camera',   primaryKw: 'horse iphone 15 case' },
        { name: 'iPhone 15 Pro',     slug: 'iphone-15-pro',     device: 'iphone15pro',      display: '6.1"', chip: 'A17 Pro',    cameras: 'Triple-camera', primaryKw: 'horse iphone 15 pro case' },
        { name: 'iPhone 15 Pro Max', slug: 'iphone-15-pro-max', device: 'iphone15promax',   display: '6.7"', chip: 'A17 Pro',    cameras: 'Triple-camera', primaryKw: 'horse iphone 15 pro max case' },
        { name: 'iPhone 15 Plus',    slug: 'iphone-15-plus',    device: 'iphone15plus',     display: '6.7"', chip: 'A16 Bionic', cameras: 'Dual-camera',   primaryKw: 'horse iphone 15 plus case' },
      ],
    },
    {
      name: 'iPhone 14 Series', year: 2022,
      models: [
        { name: 'iPhone 14',         slug: 'iphone-14',         device: 'iphone14',         display: '6.1"', chip: 'A15 Bionic', cameras: 'Dual-camera',   primaryKw: 'horse iphone 14 case' },
        { name: 'iPhone 14 Pro',     slug: 'iphone-14-pro',     device: 'iphone14pro',      display: '6.1"', chip: 'A16 Bionic', cameras: 'Triple-camera', primaryKw: 'horse iphone 14 pro case' },
        { name: 'iPhone 14 Pro Max', slug: 'iphone-14-pro-max', device: 'iphone14promax',   display: '6.7"', chip: 'A16 Bionic', cameras: 'Triple-camera', primaryKw: 'horse iphone 14 pro max case' },
        { name: 'iPhone 14 Plus',    slug: 'iphone-14-plus',    device: 'iphone14plus',     display: '6.7"', chip: 'A15 Bionic', cameras: 'Dual-camera',   primaryKw: 'horse iphone 14 plus case' },
      ],
    },
    {
      name: 'iPhone 13 Series', year: 2021,
      models: [
        { name: 'iPhone 13',         slug: 'iphone-13',         device: 'iphone13',         display: '6.1"', chip: 'A15 Bionic', cameras: 'Dual-camera',   primaryKw: 'horse iphone 13 case' },
        { name: 'iPhone 13 mini',    slug: 'iphone-13-mini',    device: 'iphone13mini',     display: '5.4"', chip: 'A15 Bionic', cameras: 'Dual-camera',   primaryKw: 'horse iphone 13 mini case' },
        { name: 'iPhone 13 Pro',     slug: 'iphone-13-pro',     device: 'iphone13pro',      display: '6.1"', chip: 'A15 Bionic', cameras: 'Triple-camera', primaryKw: 'horse iphone 13 pro case' },
        { name: 'iPhone 13 Pro Max', slug: 'iphone-13-pro-max', device: 'iphone13promax',   display: '6.7"', chip: 'A15 Bionic', cameras: 'Triple-camera', primaryKw: 'horse iphone 13 pro max case' },
      ],
    },
    {
      name: 'iPhone 12 Series', year: 2020,
      models: [
        { name: 'iPhone 12',         slug: 'iphone-12',         device: 'iphone12',         display: '6.1"', chip: 'A14 Bionic', cameras: 'Dual-camera',   primaryKw: 'horse iphone 12 case' },
        { name: 'iPhone 12 mini',    slug: 'iphone-12-mini',    device: 'iphone12mini',     display: '5.4"', chip: 'A14 Bionic', cameras: 'Dual-camera',   primaryKw: 'horse iphone 12 mini case' },
        { name: 'iPhone 12 Pro',     slug: 'iphone-12-pro',     device: 'iphone12pro',      display: '6.1"', chip: 'A14 Bionic', cameras: 'Triple-camera', primaryKw: 'horse iphone 12 pro case' },
        { name: 'iPhone 12 Pro Max', slug: 'iphone-12-pro-max', device: 'iphone12promax',   display: '6.7"', chip: 'A14 Bionic', cameras: 'Triple-camera', primaryKw: 'horse iphone 12 pro max case' },
      ],
    },
  ],
};
