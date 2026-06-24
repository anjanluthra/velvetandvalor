/**
 * Velvet & Valor — Content Engine cluster config
 * ----------------------------------------------
 * The niche-specific core of the content engine. Each cluster maps to a blog
 * category (see content/blog.config.js `categories`) and to the "money page(s)"
 * its articles funnel internal links toward. The `brief` guides keyword research
 * ideation for the cluster; `defaultMoneyPage` is the primary internal link
 * every article in the cluster must include.
 *
 * Used by:
 *   - the content engine admin (research + generation), and
 *   - the seed plan (content/content-plan.seed.js) for the `cluster` field.
 *
 * Rule (unchanged from the plan): every article links to its money page, plus
 * /custom wherever a horse-bond angle fits.
 */

const CLUSTERS = [
  {
    id: 'gift-guides',
    code: 'A',
    name: 'Gift Guides',
    categorySlug: 'gift-guides',
    job: 'Revenue',
    priority: 'High',
    // Articles pick the most specific gift page (see plan); this is the fallback hub.
    defaultMoneyPage: '/gifts',
    moneyPages: [
      '/gifts',
      '/gifts/horse-lovers',
      '/gifts/horse-gifts-for-girls',
      '/gifts/year-of-the-horse',
      '/gifts/equestrian-gifts',
      '/gifts/luxury-equestrian-gifts',
      '/gifts/personalized-horse-gifts',
      '/custom',
    ],
    brief:
      'Editorial gift-guide listicles for horse lovers and equestrians. SERPs are ' +
      'gift roundups, so each article ranks then routes shoppers to the matching ' +
      'gift collection. Warm, considered, useful — real product picks across budgets. ' +
      'Link to the matching /gifts/* page; use /custom for personalised/memorial angles.',
  },
  {
    id: 'equestrian-life',
    code: 'B',
    name: 'Equestrian Lifestyle',
    categorySlug: 'equestrian-life',
    job: 'Authority + links',
    priority: 'High',
    defaultMoneyPage: '/collections/iphone-cases',
    moneyPages: ['/collections/iphone-cases', '/custom'],
    brief:
      'High-volume, low-difficulty, broadly shareable authority/link-magnet pieces: ' +
      'horse names, equestrian terms and meanings, outfits and aesthetic, "horse girl". ' +
      'Confident brand voice, genuinely useful and quotable. Where a piece touches ' +
      'naming or personal identity (horse names, aesthetic), link to /custom; ' +
      'otherwise link to /collections/iphone-cases.',
  },
  {
    id: 'performance-mindset',
    code: 'C',
    name: 'Performance & Mindset',
    categorySlug: 'performance-mindset',
    job: 'Brand / engagement',
    priority: 'Low',
    defaultMoneyPage: '/collections/iphone-cases',
    moneyPages: ['/collections/iphone-cases', '/custom', '/collections/riders-motto'],
    brief:
      'Riding technique, confidence, and mindset. Honest note: low US search volume — ' +
      'treat as brand voice + email/social fuel, not a traffic engine. A few terms ' +
      '(how to ride a horse, horse gaits) have real demand; the rest are on-brand ' +
      'storytelling for the existing audience. Tie the Rider\'s Motto collection in ' +
      'where the mindset/quote angle fits.',
  },
  {
    id: 'iphone-case-guides',
    code: 'D',
    name: 'Product Education',
    categorySlug: 'iphone-case-guides',
    job: 'Capture research-stage buyers',
    priority: 'Medium',
    defaultMoneyPage: '/collections/iphone-cases',
    moneyPages: ['/collections/iphone-cases'],
    brief:
      'Straight, trustworthy iPhone-case education (MagSafe, screen protectors, ' +
      'cleaning, yellowing, protection, buyer guides) that catches research-stage ' +
      'buyers and routes them to the right model collection. For "best [model] case" ' +
      'guides, write genuinely honest buyer\'s guides (real alternatives, criteria ' +
      'first) and point each at its /collections/iphone-<model>-cases page.',
  },
];

const byId = (id) => CLUSTERS.find((c) => c.id === id) || null;
const byCode = (code) => CLUSTERS.find((c) => c.code === code) || null;

module.exports = { CLUSTERS, byId, byCode };
