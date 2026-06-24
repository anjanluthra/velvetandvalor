/**
 * Velvet & Valor — gifting pillar (Tier 4).
 * Source of truth for scripts/build-gifts.js → /gifts/*.html
 *
 * Highest-value SEO play in the plan: "gifts for horse lovers" (1,300/mo, KD 0)
 * + the wider gifting cluster (~3,000/mo at difficulty 0–1), plus the
 * time-sensitive 2026 Year of the (Fire) Horse angle.
 *
 * Each page reuses the real catalogue (Noble Steed / Rider's Motto / Custom),
 * curated and framed for a distinct gift query, with unique copy + FAQ so no
 * two pages are thin/duplicate.
 */

const site = {
  baseUrl: 'https://www.velvet-valor.com',
  brand: 'Velvet & Valor',
  defaultOgImage: 'https://www.velvet-valor.com/images/og-home.jpg',
};

// Shared giftable product pool. id → card. Pages reference products by id.
const products = {
  'ns-nude':    { name: 'Noble Steed — Nude',          collection: 'Noble Steed',        price: '48', image: 'nude product image v2.jpg',            href: '/products/noble-steed-nude' },
  'ns-pink':    { name: 'Noble Steed — Pink',          collection: 'Noble Steed',        price: '48', image: 'pink product image.jpg',               href: '/products/noble-steed-pink' },
  'ns-burgundy':{ name: 'Noble Steed — Burgundy',      collection: 'Noble Steed',        price: '48', image: 'burgundy product image.jpg',           href: '/products/noble-steed-burgundy' },
  'ns-green':   { name: 'Noble Steed — Racing Green',  collection: 'Noble Steed',        price: '48', image: 'racing-green product image.png',       href: '/products/noble-steed-racing-green' },
  'ns-navy':    { name: 'Noble Steed — Navy Blue',     collection: 'Noble Steed',        price: '48', image: 'navy-blue product image.png',          href: '/products/noble-steed-navy-blue' },
  'rm-pink':    { name: "Rider's Motto — Baby Pink",   collection: "The Rider's Motto",  price: '40', image: 'riders-motto-inside-leg-pink.jpg',     href: '/products/riders-motto-pink' },
  'rm-emerald': { name: "Rider's Motto — Emerald",     collection: "The Rider's Motto",  price: '40', image: 'riders-motto-inside-leg-emerald-green.jpg', href: '/products/riders-motto-emerald-green' },
};

const gifts = [
  {
    slug: 'index', isHub: true,
    kw: 'horse gifts',
    h1: 'Horse Gifts for Riders & Horse Lovers',
    title: 'Horse Gifts — Luxury Gifts for Horse Lovers | Velvet & Valor',
    eyebrow: 'The Gift Edit',
    intro: 'Artist-designed equestrian gifts they will actually use every day. Hand-finished horse iPhone cases from $40 — beautifully packaged, shipped worldwide.',
    picks: ['ns-nude', 'ns-pink', 'rm-pink', 'ns-green', 'ns-burgundy', 'rm-emerald'],
    seo: {
      lead: 'Finding a horse gift that is not a mug, a keyring or yet another ornament is genuinely hard. A Velvet &amp; Valor case is different: an original equestrian artwork, hand-finished onto a premium phone case the rider in your life carries every single day.',
      body: 'Every case is cut for their exact iPhone, MagSafe compatible, and arrives gift-ready. Browse by recipient and occasion below — from <a href="/gifts/horse-lovers">gifts for horse lovers</a> and <a href="/gifts/horse-gifts-for-girls">horse gifts for girls</a> to <a href="/gifts/luxury-equestrian-gifts">luxury equestrian gifts</a> and <a href="/gifts/year-of-the-horse">2026 Year of the Horse</a> presents. Want something truly personal? Turn their own horse into a <a href="/custom">one-of-one portrait case</a>.',
    },
    faq: [
      { q: 'What is a good gift for someone who loves horses?', a: 'Something they will use, not display and forget. A artist-designed equestrian phone case pairs original horse artwork with everyday usefulness — a more personal, longer-lived gift than the usual horse mug or ornament, from $40.' },
      { q: 'Do you offer gift packaging?', a: 'Yes — every order arrives in premium Velvet &amp; Valor packaging suitable for gifting, with no prices on the parcel.' },
      { q: 'How quickly can a horse gift be delivered?', a: 'Cases are ship worldwide. Order in good time before the occasion; expedited options are shown at checkout.' },
    ],
  },
  {
    slug: 'horse-lovers',
    kw: 'gifts for horse lovers',
    h1: 'Gifts for Horse Lovers',
    title: 'Gifts for Horse Lovers — Unique & Luxury Ideas | Velvet & Valor',
    eyebrow: 'Gift Guide',
    intro: 'Unique, good-looking gifts for the horse lover who has every grooming kit going. Original equestrian artwork on a phone case they carry everywhere — from $40.',
    picks: ['ns-nude', 'ns-pink', 'ns-burgundy', 'rm-pink', 'ns-green', 'rm-emerald'],
    seo: {
      lead: 'The best gifts for horse lovers feel personal without being predictable. Velvet &amp; Valor cases carry original, hand-painted horse portraits — the kind of equestrian art a rider would frame, made into something they will actually use a hundred times a day.',
      body: 'Each case is cut for their exact iPhone, MagSafe compatible and finished in a premium glossy finish. Choose a ready-to-ship <a href="/collections/noble-steed">Noble Steed</a> colourway, a quote-edition <a href="/collections/riders-motto">Rider\'s Motto</a> case, or commission their own horse as a <a href="/custom">custom portrait</a>. For higher budgets, see our <a href="/gifts/luxury-equestrian-gifts">luxury equestrian gifts</a>.',
    },
    faq: [
      { q: 'What do you buy a horse lover who has everything?', a: 'Skip another bridle charm and give something with their own aesthetic: an artist-designed horse phone case, or a custom portrait of their actual horse. It is personal, useful and unlike the usual horse gifts.' },
      { q: 'Are these gifts suitable for both men and women?', a: 'Yes. Colourways range from soft Nude and Pink to Racing Green, Navy and Burgundy, so there is a fit for every rider.' },
      { q: 'Can I make the gift personal?', a: 'Absolutely — turn a photo of their horse into a one-of-one <a href="/custom">custom portrait case</a>, the most personal gift in the range.' },
    ],
  },
  {
    slug: 'equestrian-gifts',
    kw: 'equestrian gifts',
    h1: 'Equestrian Gifts',
    title: 'Equestrian Gifts — For Riders & Horse Owners | Velvet & Valor',
    eyebrow: 'Gift Guide',
    intro: 'Considered gifts for equestrians, riders and horse owners. Artist-designed cases that speak the language of the arena — from $40, cut for every iPhone.',
    picks: ['rm-pink', 'rm-emerald', 'ns-nude', 'ns-navy', 'ns-green', 'ns-burgundy'],
    seo: {
      lead: 'Real equestrians notice the details — so a gift that nods to the discipline lands far better than a generic horse trinket. The <a href="/collections/riders-motto">Rider\'s Motto</a> series sets arena maxims like <em>inside leg, outside rein</em> against refined colourways riders recognise instantly.',
      body: 'Pair that with the hand-painted <a href="/collections/noble-steed">Noble Steed</a> portraits and you have gifts for horse riders and owners that feel insider, not touristy. Every case is MagSafe compatible and cut for their exact iPhone.',
    },
    faq: [
      { q: 'What are good gifts for equestrians?', a: 'Gifts that show you understand the sport. Quote-edition cases featuring dressage and riding maxims, or a portrait of their own horse, beat generic horse-themed gifts every time.' },
      { q: 'What is a good gift for a horse rider or owner?', a: 'A artist-designed equestrian phone case from $40 — personal, practical and used daily, with a custom-portrait option for their own horse.' },
    ],
  },
  {
    slug: 'horse-gifts-for-girls',
    kw: 'horse gifts for girls',
    h1: 'Horse Gifts for Girls',
    title: 'Horse Gifts for Girls — Horse Girl Gift Ideas | Velvet & Valor',
    eyebrow: 'Gift Guide',
    intro: 'Horse gifts for girls and self-confessed horse girls of every age. Pretty, artist-designed cases in soft equestrian colourways — from $40.',
    picks: ['ns-pink', 'ns-nude', 'rm-pink', 'ns-burgundy', 'rm-emerald', 'ns-green'],
    seo: {
      lead: 'Whether she is pony-mad at nine or a lifelong horse girl at thirty, the right gift celebrates the obsession with a bit of style. Velvet &amp; Valor cases pair original horse artwork with soft, giftable colourways — Pink, Nude, Baby Pink — that look as good as they ride.',
      body: 'Each case is cut for her exact iPhone and MagSafe compatible. For the girl who has named every horse she has ever met, turn her favourite into a <a href="/custom">custom portrait case</a> — the gift she will not stop talking about.',
    },
    faq: [
      { q: 'What do you get a horse girl?', a: 'Something that celebrates the passion with style — an artist-designed horse phone case in a soft colourway, or a custom portrait of her own horse or pony.' },
      { q: 'What is a good horse gift for a teenage girl?', a: 'A artist-designed horse iPhone case is ideal — phone-first, on-trend, and personal, especially as a custom portrait of her own horse.' },
    ],
  },
  {
    slug: 'luxury-equestrian-gifts',
    kw: 'luxury gifts for horse lovers',
    h1: 'Luxury Equestrian Gifts',
    title: 'Luxury Equestrian Gifts for Horse Lovers | Velvet & Valor',
    eyebrow: 'The Luxury Edit',
    intro: 'Luxury gifts for horse lovers and owners — original equestrian art, hand-finished. Considered pieces from $40, with bespoke custom portraits available.',
    picks: ['ns-burgundy', 'ns-navy', 'ns-green', 'ns-nude', 'rm-emerald', 'rm-pink'],
    seo: {
      lead: 'Luxury, for a horse person, is rarely about logos — it is about craft and meaning. Velvet &amp; Valor cases are built around original, hand-painted equestrian portraits and finished to a premium glossy standard, so the gift feels like art rather than merchandise.',
      body: 'For the most considered present, commission a <a href="/custom">custom portrait</a> of their own horse — a genuinely one-of-one luxury equestrian gift. Every case is MagSafe compatible and cut for their exact iPhone.',
    },
    faq: [
      { q: 'What is a luxury gift for a horse owner?', a: 'A bespoke custom portrait case of their own horse is the most luxurious option — original artwork, hand-finished and unique to them. Ready-made Noble Steed portraits offer the same craft from $48.' },
      { q: 'Do you offer bespoke or personalised luxury gifts?', a: 'Yes — our <a href="/custom">custom portrait</a> service turns a photograph of their horse into a one-of-one case, the centrepiece of the luxury range.' },
    ],
  },
  {
    slug: 'personalized-horse-gifts',
    kw: 'personalized horse gifts',
    h1: 'Personalized Horse Gifts',
    title: 'Personalized Horse Gifts — Custom Horse Portrait Cases | Velvet & Valor',
    eyebrow: 'Make It Theirs',
    intro: 'Personalized horse gifts they could never buy themselves — their own horse, hand-painted into a one-of-one phone case. Custom portraits plus ready-made equestrian designs.',
    picks: ['ns-nude', 'ns-pink', 'ns-burgundy', 'ns-green', 'rm-pink', 'rm-emerald'],
    seo: {
      lead: 'The most personal horse gift is their <em>own</em> horse. Our <a href="/custom">custom portrait</a> service turns a favourite photograph into an original, hand-finished artwork printed onto a premium case — a personalised horse gift with real emotional weight.',
      body: 'Prefer something ready to ship? The <a href="/collections/noble-steed">Noble Steed</a> portraits and <a href="/collections/riders-motto">Rider\'s Motto</a> quote editions are cut for their exact iPhone in the colour of your choice. Every option is MagSafe compatible and beautifully packaged.',
    },
    faq: [
      { q: 'Can you put my horse on a phone case?', a: 'Yes — send a clear photo and our artists create a hand-finished portrait of your horse, printed onto a case for any iPhone model. Start on the custom portrait page.' },
      { q: 'How long does a personalized horse gift take?', a: 'Custom portraits take a little longer than ready-made cases as the artwork is created for you. Order in good time before the occasion; timings and expedited options are shown at checkout.' },
    ],
  },
  {
    slug: 'year-of-the-horse',
    seasonal: true,
    kw: 'year of the horse gifts',
    h1: 'Year of the Horse 2026 Gifts',
    title: 'Year of the Horse 2026 Gifts — Fire Horse Gift Ideas | Velvet & Valor',
    eyebrow: 'Year of the Fire Horse · 2026',
    intro: '2026 is the Year of the Fire Horse — the perfect moment to gift the horse lover in your life. Artist-designed equestrian cases from $40, shipped worldwide.',
    picks: ['ns-burgundy', 'ns-green', 'ns-navy', 'ns-nude', 'rm-emerald', 'rm-pink'],
    seo: {
      lead: '2026 is the Chinese Year of the Horse — and specifically the Fire Horse, which comes around only once every sixty years. It is a uniquely fitting year to give a horse lover something that celebrates the animal they adore: original equestrian art they will carry every day.',
      body: 'Rich Fire-Horse colourways like Burgundy, Racing Green and Navy make especially apt 2026 gifts, while a <a href="/custom">custom portrait</a> of their own horse turns the occasion into something they will keep for years. Every case is MagSafe compatible and cut for their exact iPhone.',
    },
    faq: [
      { q: 'What is a good Year of the Horse gift for 2026?', a: 'For a horse lover, an artist-designed horse phone case is ideal — it ties directly to the Year of the (Fire) Horse and is used every day. Rich red and green colourways suit the Fire Horse year especially well.' },
      { q: 'Why is 2026 the Year of the Fire Horse?', a: 'In the Chinese zodiac, 2026 is a Horse year, and the cycle of elements makes it a Fire Horse year — a combination that only recurs every 60 years, making it a notable occasion to mark with a horse-themed gift.' },
      { q: 'Will it arrive in time for the Lunar New Year?', a: 'Cases are ship worldwide. Order ahead of Lunar New Year 2026; expedited shipping options appear at checkout.' },
    ],
  },
];

module.exports = { site, products, gifts };
