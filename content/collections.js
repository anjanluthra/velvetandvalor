/**
 * Velvet & Valor — design/collection catalogue (Tier 3).
 * Source of truth for scripts/build-collections.js.
 * Replaces the old #noble-steed-collection / #riders-motto on-page anchors
 * with real, crawlable collection URLs (/collections/<slug>).
 *
 * Colourway data mirrors the cards already on /collections/iphone-cases.
 */

module.exports = {
  site: {
    baseUrl: 'https://www.velvet-valor.com',
    brand: 'Velvet & Valor',
    defaultOgImage: 'https://www.velvet-valor.com/images/og-home.jpg',
  },

  collections: [
    {
      slug: 'noble-steed',
      productPrefix: 'noble-steed',
      kicker: 'Signature Collection',
      name: 'Noble Steed',
      h1: 'Noble Steed Horse iPhone Cases',
      title: 'Noble Steed — Luxury Horse iPhone Cases | Velvet & Valor',
      priceUsd: '48.00', priceGbp: '38.00', price: '$48',
      intro: 'The signature collection — original equestrian horse portraits, hand-finished for every iPhone. Ten colourways celebrating the bond between horse and rider.',
      seo: {
        primaryKw: 'noble steed horse iphone case',
        lead: 'Noble Steed is the Velvet &amp; Valor signature series: original horse portraits, painted in-house and printed in a deep, premium glossy finish. Each case celebrates the quiet bond between horse and rider — a piece of equestrian art you carry every day, not a novelty print.',
        body: 'Choose from ten equestrian colourways, from soft Nude and Pink to Racing Green, Navy Blue and Burgundy. Every Noble Steed case is cut for your exact iPhone, MagSafe compatible, and finished in a premium glossy finish. Prefer your own horse? Turn any photograph into a one-of-one <a href="/custom">custom portrait case</a>.',
      },
      colourways: [
        { slug: 'nude',          label: 'Nude',             colour: 'neutral',  image: 'nude product image v2.jpg', images: ['nude product image v2.jpg', 'nude product image.jpg'] },
        { slug: 'pink',          label: 'Pink',             colour: 'pink',     image: 'pink product image.jpg' },
        { slug: 'plum',          label: 'Plum',             colour: 'purple',   image: 'plum product image.webp' },
        { slug: 'teal',          label: 'Teal',             colour: 'teal',     image: 'teal product image.webp' },
        { slug: 'blue',          label: 'Blue',             colour: 'blue',     image: 'blue product image.jpg' },
        { slug: 'navy-blue',     label: 'Navy Blue',        colour: 'blue',     image: 'navy-blue product image.png' },
        { slug: 'burgundy',      label: 'Burgundy',         colour: 'burgundy', image: 'burgundy product image.jpg' },
        { slug: 'navy-burgundy', label: 'Navy & Burgundy',  colour: 'burgundy', image: 'navy-burgundy product image.jpg' },
        { slug: 'racing-green',  label: 'Racing Green',     colour: 'green',    image: 'racing-green product image.png' },
        { slug: 'charcoal-grey', label: 'Charcoal Grey',    colour: 'grey',     image: 'charcoal-grey product image.png' },
      ],
    },
    {
      slug: 'riders-motto',
      productPrefix: 'riders-motto',
      kicker: 'New Edition',
      name: "The Rider's Motto",
      h1: "The Rider's Motto iPhone Cases",
      title: "The Rider's Motto — Quote-Edition Equestrian iPhone Cases | Velvet & Valor",
      priceUsd: '40.00', priceGbp: '32.00', price: '$40',
      intro: 'Quote-edition phone cases. The first in the series — <em>inside leg, outside rein</em> — in seven equestrian colourways, cut for every iPhone.',
      seo: {
        primaryKw: "rider's motto equestrian iphone case",
        lead: 'The Rider\'s Motto is the quote-edition series from Velvet &amp; Valor — the language of the arena, set against navy and a colour of your choosing. The first edition carries the dressage maxim <em>inside leg, outside rein</em>, a phrase every rider knows by heart.',
        body: 'Available in seven colourways, from Baby Pink and Baby Blue to Emerald Green and Burgundy, each cut for your exact iPhone, MagSafe compatible. Explore the signature <a href="/collections/noble-steed">Noble Steed</a> horse-portrait series too, or browse the full <a href="/collections/iphone-cases">iPhone case collection</a>.',
      },
      colourways: [
        { slug: 'pink',          label: 'Navy & Baby Pink',     colour: 'pink',     image: 'riders-motto-inside-leg-pink.jpg' },
        { slug: 'baby-blue',     label: 'Navy & Baby Blue',     colour: 'blue',     image: 'riders-motto-inside-leg-baby-blue.jpg' },
        { slug: 'teal',          label: 'Navy & Teal',          colour: 'teal',     image: 'riders-motto-inside-leg-teal.jpg' },
        { slug: 'orange',        label: 'Navy & Orange',        colour: 'orange',   image: 'riders-motto-inside-leg-orange.jpg' },
        { slug: 'purple-green',  label: 'Purple & Green',       colour: 'purple',   image: 'riders-motto-inside-leg-wimbledon.jpg' },
        { slug: 'burgundy',      label: 'Navy & Burgundy',      colour: 'burgundy', image: 'riders-motto-inside-leg-burgundy.jpg' },
        { slug: 'emerald-green', label: 'Navy & Emerald Green', colour: 'green',    image: 'riders-motto-inside-leg-emerald-green.jpg' },
      ],
    },
  ],
};
