/**
 * Velvet & Valor — Blog / Journal configuration
 * Single source of truth for the static blog generator (scripts/build-blog.js).
 */

const iphoneModels = require('./iphone-models');

// Per-variant collection URLs, derived from the shared model catalogue so the
// sitemap stays in lock-step with scripts/build-models.js (one source of truth).
const variantPages = iphoneModels.series
  .flatMap(s => s.models)
  .map(m => ({ loc: `/collections/${m.slug}-cases`, changefreq: 'monthly', priority: '0.7' }));

// Design/collection-level pages (Tier 3).
const collectionPages = [
  { loc: '/collections/noble-steed', changefreq: 'weekly', priority: '0.8' },
  { loc: '/collections/riders-motto', changefreq: 'weekly', priority: '0.8' },
];

// Gifting pillar (Tier 4), derived from the gift catalogue.
const giftPages = require('./gifts').gifts.map(g => ({
  loc: g.slug === 'index' ? '/gifts' : `/gifts/${g.slug}`,
  changefreq: g.seasonal ? 'weekly' : 'monthly',
  priority: g.isHub ? '0.9' : '0.8',
}));

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
    image: '/images/nude%20product%20image%20v2.jpg',
    imageAlt: 'Noble Steed full-grain leather iPhone case in nude',
    blurb: 'The luxury equestrian iPhone case, artist-designed and handcrafted.',
  },

  // Category slug → display name. Order = display order in filters/footer.
  categories: {
    'care-and-craft': 'Care & Craft',
    'the-atelier': 'The Atelier',
    'equestrian-life': 'Equestrian Life',
    'gift-guides': 'Gift Guides',
    'performance-mindset': 'Performance & Mindset',
    'iphone-case-guides': 'iPhone Case Guides',
  },

  authors: {
    'kate-luthra': {
      name: 'Kate Luthra',
      role: 'Creative Director & Founder',
      initials: 'KL',
      photo: '/images/kate-luthra.jpg',
      bio: 'Kate Luthra is the Creative Director and Founder of Velvet & Valor. Raised in the Scottish countryside with a lifelong bond to horses, she founded the atelier to bring artist-led design and genuine equestrian heritage to everyday luxury.',
      // Short bio shown in the in-article E-E-A-T author box (kept tighter than the full bio).
      shortBio: 'Creative Director & Founder of Velvet & Valor. Raised in the Scottish countryside with a lifelong bond to horses, writing on leather, craft, and equestrian life.',
      // Areas of expertise — surfaced as credential pills (E-E-A-T signal) on author + article pages.
      credentials: ['Leather & Craft', 'Equestrian Heritage', 'Artist-Led Design'],
      // Author-page stat strip (E-E-A-T). articleCount is computed at build time.
      yearsExperience: '15+',
      base: 'Florence',
      instagram: 'https://www.instagram.com/velvetvalorstore',
      instagramHandle: '@velvetvalorstore',
      sameAs: ['https://www.instagram.com/velvetvalorstore'],
    },
  },

  // Topic-hub icons (homepage "Explore by Topic"). Inline SVG, inherits currentColor.
  categoryIcons: {
    'care-and-craft': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>',
    'the-atelier': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.4 6.3L21 12l-6.6 2.7L12 21l-2.4-6.3L3 12l6.6-2.7z"/></svg>',
    'equestrian-life': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0z"/></svg>',
    'gift-guides': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13M12 8S10.5 3 7.5 4 9 8 12 8m0 0s1.5-5 4.5-4S15 8 12 8"/></svg>',
    'performance-mindset': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>',
    'iphone-case-guides': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 5h2"/></svg>',
  },

  // Per-category intro copy shown on category pages (SEO + reader context).
  categoryIntros: {
    'care-and-craft': 'How to look after fine leather, the materials we choose, and the craft that makes a case last a lifetime — conditioning, patina, repair, and the know-how that keeps a piece looking better with age.',
    'the-atelier': 'Behind the scenes at Velvet & Valor — our sourcing, our makers, and the design decisions that shape every artist-led case.',
    'equestrian-life': 'Stories from the saddle: the riders, routines, and traditions that inspire everything we make.',
    'gift-guides': 'Considered gifts for horse lovers and the design-led — curated edits for every occasion and every kind of rider.',
    'performance-mindset': 'For the rider who wants to get better — technique, confidence, and the mindset that carries from the saddle to everything else. Practical guidance and the stories that keep you riding.',
    'iphone-case-guides': 'Straight answers on iPhone cases — MagSafe, materials, protection, and care. How to choose, clean, and get the most from the case you carry every day.',
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
    ...giftPages,
    ...collectionPages,
    ...variantPages,
  ],
};
