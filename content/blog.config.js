/**
 * Velvet & Valor — Blog / Journal configuration
 * Single source of truth for the static blog generator (scripts/build-blog.js).
 */

module.exports = {
  site: {
    baseUrl: 'https://www.velvet-valor.com',
    brand: 'Velvet & Valor',
    blogName: 'The Equestrian Journal',
    blogPath: '/blog',
    defaultOgImage: 'https://www.velvet-valor.com/images/og-home.jpg',
    org: {
      name: 'Velvet & Valor',
      url: 'https://www.velvet-valor.com',
      logo: 'https://www.velvet-valor.com/images/logo.png',
    },
  },

  // Featured product shown in the post sidebar (real price — Stripe charges $48.00)
  featuredProduct: {
    name: 'Noble Steed',
    price: '$48',
    url: '/products/noble-steed-nude',
    blurb: 'The luxury equestrian iPhone case, artist-designed and handcrafted.',
  },

  // Category slug → display name. Order = display order in filters/footer.
  categories: {
    'care-and-craft': 'Care & Craft',
    'the-atelier': 'The Atelier',
    'equestrian-life': 'Equestrian Life',
    'gift-guides': 'Gift Guides',
  },

  authors: {
    'kate-luthra': {
      name: 'Kate Luthra',
      role: 'Creative Director & Founder',
      initials: 'KL',
      bio: 'Kate Luthra is the Creative Director and Founder of Velvet & Valor. Raised in the Scottish countryside with a lifelong bond to horses, she founded the atelier to bring artist-led design and genuine equestrian heritage to everyday luxury.',
      sameAs: ['https://www.instagram.com/velvetvalorstore'],
    },
  },

  // Non-blog URLs that belong in sitemap.xml (the generator owns the full sitemap).
  corePages: [
    { loc: '/', changefreq: 'weekly', priority: '1.0' },
    { loc: '/collections/iphone-cases', changefreq: 'weekly', priority: '0.9' },
    { loc: '/products/noble-steed', changefreq: 'weekly', priority: '0.8' },
    { loc: '/products/riders-motto', changefreq: 'weekly', priority: '0.8' },
    { loc: '/custom', changefreq: 'monthly', priority: '0.8' },
    { loc: '/our-story', changefreq: 'monthly', priority: '0.5' },
    { loc: '/contact', changefreq: 'monthly', priority: '0.4' },
    { loc: '/shipping', changefreq: 'monthly', priority: '0.4' },
    { loc: '/privacy', changefreq: 'yearly', priority: '0.3' },
    { loc: '/cookies', changefreq: 'yearly', priority: '0.3' },
  ],
};
