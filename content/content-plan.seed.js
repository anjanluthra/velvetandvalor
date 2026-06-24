/**
 * Velvet & Valor — Content Plan seed
 * ----------------------------------
 * The editorial plan from the Ahrefs-researched blueprint (June 2026, US market).
 * This is the canonical, version-controlled seed. The content engine imports it
 * into KV (vv:engine:plan) on first run; live status/scheduling then live in KV.
 *
 * Fields per item:
 *   id            slug (also the eventual /blog/<id> URL + content/posts/<id>.md)
 *   title         working article title
 *   cluster       cluster id (see content/clusters.js)
 *   targetKeyword primary keyword (US)
 *   volume        US monthly search volume (Ahrefs) — 0 = brand/social piece
 *   kd            Ahrefs keyword difficulty 0–100 (lower = easier) — null = n/a
 *   intent        informational | commercial | transactional
 *   moneyPage     primary internal link target for this article
 *   wordCount     target length
 *   priority      P1 (write first) → P3 (last)
 *   optional      true = add-on beyond the ~31 core articles
 *
 * Metrics source: Ahrefs, June 2026, USA. Vol = US monthly searches.
 */

const RAW_PLAN = [
  // ── Cluster A · Gift Guides (Revenue · High) ───────────────────────────────
  { id: 'gifts-for-horse-lovers-ultimate-guide', title: 'Gifts for Horse Lovers: The Ultimate Guide (2026)', cluster: 'gift-guides', targetKeyword: 'gifts for horse lovers', volume: 1300, kd: 0, intent: 'commercial', moneyPage: '/gifts/horse-lovers', wordCount: 1800, priority: 'P1' },
  { id: 'gifts-for-horse-girls', title: 'Gifts for Horse Girls (Every Age)', cluster: 'gift-guides', targetKeyword: 'horse gifts for girls', volume: 700, kd: 0, intent: 'commercial', moneyPage: '/gifts/horse-gifts-for-girls', wordCount: 1600, priority: 'P1' },
  { id: 'year-of-the-horse-2026-gift-ideas', title: 'Year of the Horse 2026: Gift Ideas for Riders', cluster: 'gift-guides', targetKeyword: 'year of the horse gifts', volume: 600, kd: 0, intent: 'commercial', moneyPage: '/gifts/year-of-the-horse', wordCount: 1500, priority: 'P1' },
  { id: 'unique-gifts-for-horse-lovers', title: 'Unique Gifts for Horse Lovers', cluster: 'gift-guides', targetKeyword: 'unique gifts for horse lovers', volume: 400, kd: 0, intent: 'commercial', moneyPage: '/gifts/horse-lovers', wordCount: 1600, priority: 'P1' },
  { id: 'equestrian-gifts-every-budget', title: 'Equestrian Gifts for Every Budget', cluster: 'gift-guides', targetKeyword: 'equestrian gifts', volume: 300, kd: 0, intent: 'commercial', moneyPage: '/gifts/equestrian-gifts', wordCount: 1600, priority: 'P1' },
  { id: 'horse-gifts-for-women', title: 'Horse Gifts for Women', cluster: 'gift-guides', targetKeyword: 'horse gifts for women', volume: 300, kd: 1, intent: 'commercial', moneyPage: '/gifts/horse-lovers', wordCount: 1500, priority: 'P2' },
  { id: 'best-luxury-gifts-for-equestrians', title: 'Best Luxury Gifts for Equestrians', cluster: 'gift-guides', targetKeyword: 'luxury gifts for horse lovers', volume: 200, kd: 0, intent: 'commercial', moneyPage: '/gifts/luxury-equestrian-gifts', wordCount: 1500, priority: 'P2' },
  { id: 'horse-memorial-gifts', title: 'Thoughtful Horse Memorial Gifts', cluster: 'gift-guides', targetKeyword: 'horse memorial gifts', volume: 200, kd: 0, intent: 'commercial', moneyPage: '/custom', wordCount: 1400, priority: 'P2' },
  { id: 'personalised-horse-gifts', title: 'Personalised Horse Gifts', cluster: 'gift-guides', targetKeyword: 'personalized horse gifts', volume: 150, kd: 0, intent: 'commercial', moneyPage: '/gifts/personalized-horse-gifts', wordCount: 1400, priority: 'P3', optional: true },

  // ── Cluster B · Equestrian Lifestyle (Authority + links · High) ────────────
  { id: 'girl-horse-names', title: 'Girl Horse Names: 200+ Ideas', cluster: 'equestrian-life', targetKeyword: 'girl horse names', volume: 2100, kd: 0, intent: 'informational', moneyPage: '/custom', wordCount: 2000, priority: 'P1' },
  { id: 'equestrian-terms-glossary', title: 'Equestrian Terms: The Complete Glossary', cluster: 'equestrian-life', targetKeyword: 'equestrian terms', volume: 2100, kd: 2, intent: 'informational', moneyPage: '/collections/iphone-cases', wordCount: 2200, priority: 'P1' },
  { id: 'what-does-equestrian-mean', title: 'What Does "Equestrian" Actually Mean?', cluster: 'equestrian-life', targetKeyword: 'equestrian meaning', volume: 1800, kd: 3, intent: 'informational', moneyPage: '/collections/iphone-cases', wordCount: 1600, priority: 'P1' },
  { id: 'equestrian-outfit-ideas', title: 'Equestrian Outfit Ideas for Every Season', cluster: 'equestrian-life', targetKeyword: 'equestrian outfit', volume: 1700, kd: 0, intent: 'informational', moneyPage: '/collections/iphone-cases', wordCount: 1800, priority: 'P1' },
  { id: 'what-is-a-horse-girl', title: 'What Is a "Horse Girl"? (And Why We\'re Reclaiming It)', cluster: 'equestrian-life', targetKeyword: 'horse girl meaning', volume: 1400, kd: 1, intent: 'informational', moneyPage: '/collections/iphone-cases', wordCount: 1600, priority: 'P1' },
  { id: 'equestrian-aesthetic-how-to', title: 'The Equestrian Aesthetic: How to Get the Look', cluster: 'equestrian-life', targetKeyword: 'equestrian style', volume: 300, kd: 12, intent: 'informational', moneyPage: '/collections/iphone-cases', wordCount: 1600, priority: 'P2' },
  { id: 'horse-girl-aesthetic', title: 'Horse Girl Aesthetic: Outfits, Vibe & Inspo', cluster: 'equestrian-life', targetKeyword: 'horse girl aesthetic', volume: 200, kd: 0, intent: 'informational', moneyPage: '/custom', wordCount: 1500, priority: 'P2' },

  // ── Cluster C · Performance & Mindset (Brand / engagement · Low) ────────────
  { id: 'how-to-ride-a-horse-beginners-guide', title: 'How to Ride a Horse: A Beginner\'s Guide', cluster: 'performance-mindset', targetKeyword: 'how to ride a horse', volume: 2400, kd: 3, intent: 'informational', moneyPage: '/collections/iphone-cases', wordCount: 1800, priority: 'P3' },
  { id: 'horse-gaits-explained', title: 'Canter, Trot & Gallop: Horse Gaits Explained', cluster: 'performance-mindset', targetKeyword: 'canter meaning', volume: 1400, kd: 2, intent: 'informational', moneyPage: '/collections/iphone-cases', wordCount: 1500, priority: 'P3' },
  { id: 'how-heavy-is-too-heavy-to-ride-a-horse', title: 'How Heavy Is Too Heavy to Ride a Horse?', cluster: 'performance-mindset', targetKeyword: 'how heavy is too heavy to ride a horse', volume: 100, kd: 0, intent: 'informational', moneyPage: '/collections/iphone-cases', wordCount: 1300, priority: 'P3' },
  // C4–C6: brand/storytelling pieces with minimal search demand — written for the
  // existing audience (email/social) + the Rider's Motto tie-in, not for Google.
  { id: 'why-keep-a-riding-training-journal', title: 'Why Every Rider Should Keep a Training Journal', cluster: 'performance-mindset', targetKeyword: '', volume: 0, kd: null, intent: 'informational', moneyPage: '/custom', wordCount: 1200, priority: 'P3', brandPiece: true },
  { id: 'how-to-build-confidence-in-the-saddle', title: 'How to Build Confidence in the Saddle', cluster: 'performance-mindset', targetKeyword: '', volume: 0, kd: null, intent: 'informational', moneyPage: '/collections/iphone-cases', wordCount: 1200, priority: 'P3', brandPiece: true },
  { id: 'inside-leg-outside-rein-dressage-basics', title: '"Inside Leg, Outside Rein": Dressage Basics', cluster: 'performance-mindset', targetKeyword: '', volume: 0, kd: null, intent: 'informational', moneyPage: '/collections/riders-motto', wordCount: 1200, priority: 'P3', brandPiece: true },

  // ── Cluster D · Product Education (Research-stage buyers · Medium) ──────────
  { id: 'what-is-magsafe', title: 'What Is MagSafe? Everything Explained', cluster: 'iphone-case-guides', targetKeyword: 'what is magsafe', volume: 35000, kd: 15, intent: 'informational', moneyPage: '/collections/iphone-cases', wordCount: 1800, priority: 'P2' },
  { id: 'what-is-a-magsafe-case', title: 'What Is a MagSafe Case?', cluster: 'iphone-case-guides', targetKeyword: 'what is magsafe case', volume: 9800, kd: 7, intent: 'informational', moneyPage: '/collections/iphone-cases', wordCount: 1500, priority: 'P2' },
  { id: 'how-to-apply-a-screen-protector', title: 'How to Apply a Screen Protector (Step by Step)', cluster: 'iphone-case-guides', targetKeyword: 'how to install screen protector', volume: 11000, kd: 0, intent: 'informational', moneyPage: '/collections/iphone-cases', wordCount: 1400, priority: 'P2' },
  { id: 'how-to-clean-a-phone-case', title: 'How to Clean a Phone Case (Clear, Silicone & More)', cluster: 'iphone-case-guides', targetKeyword: 'how to clean a clear phone case', volume: 2800, kd: 1, intent: 'informational', moneyPage: '/collections/iphone-cases', wordCount: 1500, priority: 'P2' },
  { id: 'why-do-clear-cases-turn-yellow', title: 'Why Do Clear Cases Turn Yellow? (And How to Prevent It)', cluster: 'iphone-case-guides', targetKeyword: 'why do clear cases turn yellow', volume: 900, kd: 1, intent: 'informational', moneyPage: '/collections/iphone-cases', wordCount: 1300, priority: 'P2' },
  { id: 'what-makes-a-case-magsafe-compatible', title: 'What Makes a Case MagSafe-Compatible?', cluster: 'iphone-case-guides', targetKeyword: 'what is a magsafe phone case', volume: 700, kd: 1, intent: 'informational', moneyPage: '/collections/iphone-cases', wordCount: 1300, priority: 'P3' },
  { id: 'how-to-clean-a-silicone-phone-case', title: 'How to Clean a Silicone Phone Case', cluster: 'iphone-case-guides', targetKeyword: 'how to clean silicone phone case', volume: 500, kd: 0, intent: 'informational', moneyPage: '/collections/iphone-cases', wordCount: 1300, priority: 'P3' },
  { id: 'how-to-choose-the-right-iphone-case', title: 'How to Choose the Right iPhone Case', cluster: 'iphone-case-guides', targetKeyword: '', volume: 0, kd: null, intent: 'commercial', moneyPage: '/collections/iphone-cases', wordCount: 2000, priority: 'P3' },
  { id: 'best-iphone-case-brands', title: 'Best iPhone Case Brands (Honest Buyer\'s Guide)', cluster: 'iphone-case-guides', targetKeyword: 'best iphone case brands', volume: 1100, kd: 4, intent: 'commercial', moneyPage: '/collections/iphone-cases', wordCount: 1800, priority: 'P3' },
  { id: 'how-protective-are-slim-phone-cases', title: 'How Protective Are Slim Phone Cases?', cluster: 'iphone-case-guides', targetKeyword: 'most protective phone cases', volume: 1100, kd: 12, intent: 'commercial', moneyPage: '/collections/iphone-cases', wordCount: 1500, priority: 'P3' },

  // ── Optional add-on: "best [model] case" buyer guides (generic traffic) ────
  // Caveat (from plan): brand-published "best" lists rank harder + can read as
  // biased. Write as honest buyer's guides, top 2–3 current models only.
  { id: 'best-iphone-17-pro-max-case', title: 'Best iPhone 17 Pro Max Case (Honest Buyer\'s Guide)', cluster: 'iphone-case-guides', targetKeyword: 'best iphone 17 pro max case', volume: 9300, kd: 1, intent: 'commercial', moneyPage: '/collections/iphone-17-pro-max-cases', wordCount: 1600, priority: 'P3', optional: true },
  { id: 'best-iphone-16-pro-case', title: 'Best iPhone 16 Pro Case (Honest Buyer\'s Guide)', cluster: 'iphone-case-guides', targetKeyword: 'best iphone 16 pro case', volume: 8100, kd: 0, intent: 'commercial', moneyPage: '/collections/iphone-16-pro-cases', wordCount: 1600, priority: 'P3', optional: true },
  { id: 'best-iphone-17-pro-case', title: 'Best iPhone 17 Pro Case (Honest Buyer\'s Guide)', cluster: 'iphone-case-guides', targetKeyword: 'best iphone 17 pro case', volume: 6800, kd: 0, intent: 'commercial', moneyPage: '/collections/iphone-17-pro-cases', wordCount: 1600, priority: 'P3', optional: true },
  { id: 'best-iphone-17-case', title: 'Best iPhone 17 Case (Honest Buyer\'s Guide)', cluster: 'iphone-case-guides', targetKeyword: 'best iphone 17 case', volume: 4200, kd: 5, intent: 'commercial', moneyPage: '/collections/iphone-17-cases', wordCount: 1600, priority: 'P3', optional: true },
  { id: 'best-iphone-15-case', title: 'Best iPhone 15 Case (Honest Buyer\'s Guide)', cluster: 'iphone-case-guides', targetKeyword: 'best iphone 15 case', volume: 1800, kd: 3, intent: 'commercial', moneyPage: '/collections/iphone-15-cases', wordCount: 1600, priority: 'P3', optional: true },
];

module.exports = { RAW_PLAN };
