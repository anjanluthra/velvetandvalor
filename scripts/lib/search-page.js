/**
 * Velvet & Valor — shared search-results collection renderer.
 * One template for three tiers (variant / collection / hub), driven by the
 * real catalogue in content/collections.js. Products are server-rendered so
 * crawlers index every item; css/search-collection.css + js/search-collection.js
 * add the client-side filter/sort layer.
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const collectionsCfg = require('../../content/collections');
const blogCfg = require('../../content/blog.config.js');

const baseUrl = collectionsCfg.site.baseUrl;
const brand = collectionsCfg.site.brand;
const ogImage = collectionsCfg.site.defaultOgImage;

// colour family → swatch hex + display order (only families present render)
const COLOUR_HEX = {
  neutral: '#d9c4b4', pink: '#d99bb0', blue: '#3f6fa8', teal: '#1f7e7e',
  green: '#1f5e44', purple: '#5b4a8a', burgundy: '#6e2230', orange: '#cc6a33', grey: '#3a3f44',
};
const COLOUR_ORDER = ['neutral', 'pink', 'blue', 'teal', 'green', 'purple', 'burgundy', 'orange', 'grey'];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = s => esc(s).replace(/"/g, '&quot;');
const stripTags = s => String(s).replace(/<[^>]+>/g, '');

/** Flatten content/collections.js into the flat product catalogue (17 items). */
function catalogue() {
  const out = [];
  for (const c of collectionsCfg.collections) {
    for (const w of c.colourways) {
      out.push({
        design: c.name, designSlug: c.slug, productPrefix: c.productPrefix,
        name: w.label, slug: w.slug, colour: w.colour,
        price: parseFloat(c.priceUsd), priceUsd: c.priceUsd, priceGbp: c.priceGbp,
        image: w.image, images: w.images || [w.image], isNew: c.slug === 'riders-motto',
      });
    }
  }
  return out;
}

function badgeFor(p) {
  if (p.isNew) return '<span class="sr-badge new">New edition</span>';
  if (p.designSlug === 'noble-steed' && (p.slug === 'nude' || p.slug === 'burgundy')) return '<span class="sr-badge best">Bestseller</span>';
  return '';
}

function productCard(p, idx, buyDevice) {
  const href = `/products/${p.productPrefix}-${p.slug}` + (buyDevice ? `?variant=${buyDevice}-glossy` : '');
  return `
            <div class="sr-prod" data-design="${escAttr(p.design)}" data-colour="${p.colour}" data-price="${p.price}" data-new="${p.isNew ? 1 : 0}" data-idx="${idx}" data-name="${escAttr(p.name)}" data-image="/images/${encodeURIComponent(p.image)}" data-href="${href}">
              <div class="sr-prod-img" data-imgs="${p.images.length}">
                ${badgeFor(p)}
                <a class="sr-prod-link" href="${href}" aria-label="${escAttr(p.design)} ${escAttr(p.name)}">
                  <div class="sr-imgs">
                    ${p.images.map((img, i) => `<img src="/images/${encodeURIComponent(img)}" class="${i === 0 ? 'on' : ''}" alt="${escAttr(p.design)} ${escAttr(p.name)} horse iPhone case${i ? ' — view ' + (i + 1) : ''}" loading="lazy" />`).join('')}
                  </div>
                </a>${p.images.length > 1 ? `
                <button class="sr-img-nav sr-img-prev" type="button" aria-label="Previous image">&lsaquo;</button>
                <button class="sr-img-nav sr-img-next" type="button" aria-label="Next image">&rsaquo;</button>
                <div class="sr-img-dots">${p.images.map((_, i) => `<span class="${i === 0 ? 'on' : ''}"></span>`).join('')}</div>` : ''}
              </div>
              <a class="sr-prod-link" href="${href}">
                <div class="sr-prod-info">
                  <div class="d">${esc(p.design)}</div>
                  <div class="n">${esc(p.name)}</div>
                  <div class="p">$${p.price.toFixed(2)}<span class="mag">&middot; MagSafe</span></div>
                </div>
              </a>
            </div>`;
}

// "You may also like" default — prefer products NOT already on the page
// (cross-sells the other design on collection pages), capped at 4.
function defaultAlsoLike(products) {
  const onPage = new Set(products.map(p => p.designSlug + '/' + p.slug));
  const all = catalogue();
  const others = all.filter(p => !onPage.has(p.designSlug + '/' + p.slug));
  const pool = others.length >= 4 ? others : all;
  return pool.slice(0, 4);
}

// Value-props band — our three case promises, in a Back Market–style row.
function valueModule() {
  const items = [
    { svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6l7-3z"/></svg>', t: 'Impact-resistant &amp; non-flex', d: 'A strong, durable polycarbonate shell that won&rsquo;t bend or flex. Built to protect.' },
    { svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.4"/></svg>', t: 'MagSafe compatible', d: 'Seamless wireless and MagSafe charging — no need to remove the case.' },
    { svg: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 13.8 10.2 21 12 13.8 13.8 12 21 10.2 13.8 3 12 10.2 10.2Z"/></svg>', t: 'Premium glossy finish', d: 'A premium glossy finish with vibrant colour and a smooth, reflective surface. Built to last.' },
  ];
  return `
    <section class="sr-value"><div class="container">
      <div class="sr-value-grid">
        ${items.map(i => `<div class="sr-value-cell"><span aria-hidden="true">${i.svg}</span><h3>${i.t}</h3><p>${i.d}</p></div>`).join('\n        ')}
      </div>
    </div></section>`;
}

// Discovery — "You may also like" (server-rendered) + "Recently viewed" (JS).
function discoveryModule(alsoLike) {
  const cards = alsoLike.map((p, i) => productCard(p, 900 + i, null)).join('\n');
  return `
    <section class="sr-discovery"><div class="container">
      <div class="sr-disc-tabs">
        <button class="sr-disc-tab active" data-disc="also">You may also like</button>
        <button class="sr-disc-tab" data-disc="recent" id="sr-recent-tab" hidden>Recently viewed</button>
      </div>
      <div class="sr-disc-rail" id="sr-disc-also">
${cards}
      </div>
      <div class="sr-disc-rail" id="sr-disc-recent" hidden></div>
    </div></section>`;
}

// Custom-case promo banner — sits within the results, sells the bespoke portrait.
function customPromo() {
  return `
        <section class="sr-custom" aria-label="Custom horse portrait case">
          <div class="sr-custom-text">
            <p class="sr-custom-eyebrow"><b>Most popular</b> Bespoke &mdash; One of One</p>
            <h2>Your Horse. <em>Your Custom Case.</em></h2>
            <p>A one-of-a-kind custom case featuring an artistic, design-led portrait of your horse — a personalized horse gift curated specifically for you, cut for your exact iPhone.</p>
            <a class="btn-primary" href="/custom">Create your custom case <span aria-hidden="true">&rarr;</span></a>
          </div>
          <div class="sr-custom-visual" aria-hidden="true">
            <img src="/images/plum%20product%20image.webp" alt="" loading="lazy" />
          </div>
        </section>`;
}

// Blog "Read our guides" rail — links to the most recently published Journal
// posts, read live from content/posts/*.md (same source as the blog generator)
// so the rail always reflects what's actually live. Per-category gradients keep
// the card tops on-brand and varied.
const GUIDE_GRADIENTS = {
  'gift-guides': 'linear-gradient(135deg,#1A9090,#0C1E3A)',
  'the-atelier': 'linear-gradient(135deg,#122448,#1A2E52)',
  'equestrian-life': 'linear-gradient(135deg,#6e2230,#0C1E3A)',
  'care-and-craft': 'linear-gradient(135deg,#116868,#122448)',
  'performance-mindset': 'linear-gradient(135deg,#5b4a8a,#0C1E3A)',
  'iphone-case-guides': 'linear-gradient(135deg,#3f6fa8,#122448)',
};
const GUIDE_GRADIENT_FALLBACK = 'linear-gradient(135deg,#1A9090,#0C1E3A)';

// Load the most recently published posts (newest first, capped at `limit`).
function recentPosts(limit = 4) {
  const dir = path.join(__dirname, '..', '..', 'content', 'posts');
  if (!fs.existsSync(dir)) return [];
  const toISO = v => (v instanceof Date) ? v.toISOString().slice(0, 10) : String(v || '').slice(0, 10);
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const { data } = matter(fs.readFileSync(path.join(dir, f), 'utf8'));
      const slug = data.slug || f.replace(/\.md$/, '');
      return {
        href: `/blog/${slug}`,
        title: data.title || slug,
        cat: blogCfg.categories[data.category] || data.category || '',
        g: GUIDE_GRADIENTS[data.category] || GUIDE_GRADIENT_FALLBACK,
        date: toISO(data.date),
      };
    })
    .sort((a, b) => (b.date < a.date ? -1 : b.date > a.date ? 1 : 0))
    .slice(0, limit);
}

function guidesModule() {
  const guides = recentPosts(4);
  if (!guides.length) return '';
  const ico = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>';
  return `
    <section class="sr-guides"><div class="container">
      <h2>Read our guides</h2>
      <div class="sr-guides-grid">
        ${guides.map(g => `<a class="sr-guide" href="${g.href}">
          <div class="sr-guide-top" style="background:${g.g}">${ico}</div>
          <div class="sr-guide-body"><p class="sr-guide-cat">${esc(g.cat)}</p><p class="sr-guide-title">${esc(g.title)}</p></div>
        </a>`).join('\n        ')}
      </div>
    </div></section>`;
}

function schema(opts, products) {
  const itemList = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: opts.h1,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: {
        '@type': 'Product', name: `${p.design} — ${p.name}`, brand: { '@type': 'Brand', name: brand },
        image: `${baseUrl}/images/${encodeURIComponent(p.image)}`,
        offers: { '@type': 'Offer', priceCurrency: 'USD', price: p.priceUsd, availability: 'https://schema.org/InStock' },
      },
    })),
  };
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: opts.breadcrumb.map((b, i) => ({
      '@type': 'ListItem', position: i + 1, name: b.label,
      ...(b.href ? { item: baseUrl + b.href } : {}),
    })),
  };
  const blocks = [itemList, breadcrumb];
  if (opts.faq && opts.faq.length) {
    blocks.push({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: opts.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: stripTags(f.a) } })),
    });
  }
  return blocks.map(o => `  <script type="application/ld+json">\n${JSON.stringify(o, null, 2)}\n  </script>`).join('\n');
}

/**
 * opts: {
 *   title, desc, canonical, h1, intro,
 *   breadcrumb:[{label,href?}], lock:{label}|null, products:[...],
 *   showCollectionFilter:bool, buyDevice:string|null,
 *   aboveGrid:html, seoTitle, seoLead, seoBody, faq:[{q,a}]
 * }
 */
function renderSearchPage(opts) {
  const products = opts.products;
  const designs = [...new Set(products.map(p => p.design))];
  const colours = COLOUR_ORDER.filter(c => products.some(p => p.colour === c));
  const prices = [...new Set(products.map(p => p.price))].sort((a, b) => a - b);
  const showCol = opts.showCollectionFilter && designs.length > 1;
  const showPrice = prices.length > 1;
  const minP = prices[0], maxP = prices[prices.length - 1];

  const colCounts = {};
  designs.forEach(d => colCounts[d] = products.filter(p => p.design === d).length);

  const colFilter = showCol ? `
        <details class="sr-fil" open><summary>Collection <i aria-hidden="true">&#43;</i></summary>
          <div class="sr-fil-body">
            ${designs.map(d => `<label class="sr-opt"><input type="checkbox" class="sr-f-col" value="${escAttr(d)}"> ${esc(d)} <span class="ct">${colCounts[d]}</span></label>`).join('\n            ')}
          </div></details>` : '';

  const colourFilter = `
        <details class="sr-fil" open><summary>Colour <i aria-hidden="true">&#43;</i></summary>
          <div class="sr-fil-body"><div class="sr-sw-row">
            ${colours.map(c => `<button class="sr-cw" data-k="${c}" style="background:${COLOUR_HEX[c]}" title="${c.charAt(0).toUpperCase() + c.slice(1)}" aria-label="Filter by ${c}"></button>`).join('\n            ')}
          </div></div></details>`;

  const priceFilter = showPrice ? `
        <details class="sr-fil" open><summary>Price <i aria-hidden="true">&#43;</i></summary>
          <div class="sr-fil-body">
            <div class="sr-price-out">Up to <b id="sr-price-out">$${maxP}</b></div>
            <input type="range" id="sr-price" min="${minP}" max="${maxP}" step="${maxP - minP > 8 ? 1 : (maxP - minP)}" value="${maxP}">
          </div></details>` : '';

  const modelFilter = opts.modelNav ? `
        <details class="sr-fil" data-model-mode="${opts.modelNav.mode || 'nav'}"><summary>iPhone Model <i aria-hidden="true">&#43;</i></summary>
          <div class="sr-fil-body"><div class="sr-models">
            ${opts.modelNav.series.map(s => `<p class="sr-model-series-label">${esc(s.name)}</p>
            ${s.models.map(m => `<a class="sr-model-link${opts.modelNav.current === m.slug ? ' active' : ''}" href="/collections/${m.slug}-cases" data-model="${m.slug}" data-device="${m.device}" data-name="${escAttr(m.name)}">${esc(m.name)}</a>`).join('\n            ')}`).join('\n            ')}
          </div></div></details>` : '';

  const cardArr = products.map((p, i) => productCard(p, i, opts.buyDevice));
  // Drop the custom-case promo into the grid (after the 2nd row) so it sits
  // within the results, not at the bottom.
  cardArr.splice(cardArr.length > 6 ? 6 : cardArr.length, 0, customPromo());
  const cards = cardArr.join('\n');
  const alsoLike = opts.alsoLike || defaultAlsoLike(products);

  const crumb = opts.breadcrumb.map((b, i) => {
    const last = i === opts.breadcrumb.length - 1;
    const sep = i ? '<span class="breadcrumb-sep">/</span>' : '';
    return `${sep}${last ? `<span style="color:rgba(255,255,255,.78)">${esc(b.label)}</span>` : `<a href="${b.href}">${esc(b.label)}</a>`}`;
  }).join(' ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(opts.title)}</title>
  <meta name="description" content="${escAttr(opts.desc)}" />
  <link rel="canonical" href="${opts.canonical}" />
${opts.extraHead || ''}

  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escAttr(opts.h1)} | ${brand}" />
  <meta property="og:description" content="${escAttr(opts.desc)}" />
  <meta property="og:url" content="${opts.canonical}" />
  <meta property="og:image" content="${ogImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escAttr(opts.h1)} — ${brand}" />
  <meta name="twitter:description" content="${escAttr(opts.desc)}" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

  <link rel="stylesheet" href="/css/style.css" />
  <link rel="stylesheet" href="/css/collections.css" />
  <link rel="stylesheet" href="/css/search-collection.css" />

${schema(opts, products)}

  <script src="/js/consent.js"></script>
  <script src="/js/in-app-browser.js" defer></script>
</head>
<body>

  <div class="top-banner" aria-label="Announcements">
    <div class="top-banner-inner">
      <span class="top-banner-item">Worldwide Shipping on All Orders</span>
      <span class="top-banner-item">&#9733;&#9733;&#9733;&#9733;&#9733; Rated Excellent</span>
      <span class="top-banner-item top-banner-promo">First Order? Use <strong>FIRST10</strong> for 10% Off</span>
    </div>
  </div>

  <div class="grain" aria-hidden="true"></div>
  <div class="cursor-dot" aria-hidden="true"></div>
  <div class="cursor-ring" aria-hidden="true"></div>

  <nav class="nav scrolled" role="navigation" aria-label="Main navigation">
    <div class="nav-inner">
      <a href="/" class="nav-logo" aria-label="Velvet and Valor home">VELVET <span class="amp">&amp;</span> VALOR</a>
      <ul class="nav-links" role="list">
        <li><a href="/collections/iphone-cases" class="nav-link">iPhone Cases</a></li>
        <li><a href="/gifts" class="nav-link">Gifts</a></li>
        <li><a href="/custom" class="nav-link">Custom Portrait</a></li>
        <li><a href="/our-story" class="nav-link">Our Story</a></li>
      </ul>
      <button class="nav-mobile-toggle" aria-label="Open menu" aria-expanded="false">
        <span class="hamburger-line"></span><span class="hamburger-line"></span><span class="hamburger-line"></span>
      </button>
      <div class="nav-actions">
        <a href="/collections/iphone-cases" class="btn-primary" style="padding: 10px 24px; font-size: 0.75rem;">Shop Now</a>
      </div>
    </div>
    <div class="nav-mobile-menu" aria-hidden="true">
      <a href="/collections/iphone-cases" class="nav-mobile-link">iPhone Cases</a>
      <a href="/gifts" class="nav-mobile-link">Gifts</a>
      <a href="/custom" class="nav-mobile-link">Custom Portrait</a>
      <a href="/our-story" class="nav-mobile-link">Our Story</a>
    </div>
  </nav>

  <main class="sr-collection">

    <section class="sr-head"><div class="container">
      <nav class="sr-crumb breadcrumb" aria-label="Breadcrumb">${crumb}</nav>
      <h1>${esc(opts.h1)}</h1>
      <p>${opts.intro}</p>
    </div></section>
${opts.aboveGrid || ''}
    <div class="container"><div class="sr-layout">

      <div class="sr-backdrop" id="sr-backdrop"></div>
      <aside class="sr-side" id="sr-side">
        <div class="sr-side-head"><span>Filters</span><button class="sr-side-close" id="sr-side-close" type="button" aria-label="Close filters">&times;</button></div>
        ${opts.lock && !opts.modelNav ? `<div class="sr-lock"><i aria-hidden="true">&#10003;</i> <span>Showing cases for <b style="color:#fff">${esc(opts.lock.label)}</b></span></div>` : ''}
${modelFilter}${colFilter}${colourFilter}${priceFilter}
        <div class="sr-fil sr-includes" style="border-bottom:none">
          <p>Every case includes</p>
          <ul>
            <li><i aria-hidden="true">&#10003;</i> Artist-designed original art</li>
            <li><i aria-hidden="true">&#10003;</i> Impact-resistant &amp; non-flex</li>
            <li><i aria-hidden="true">&#10003;</i> MagSafe compatible</li>
            <li><i aria-hidden="true">&#10003;</i> Premium glossy finish</li>
          </ul>
        </div>
        <div class="sr-side-apply-wrap"><button class="sr-side-apply" id="sr-side-apply" type="button">Show <span id="sr-apply-count">${products.length}</span> products</button></div>
      </aside>

      <div>
        <div class="sr-toolbar">
          <div class="sr-chips">
            <span class="sr-count"><b id="sr-count">${products.length}</b> products</span>
            ${opts.lock ? `<span class="sr-chip lock">${esc(opts.lock.label)}</span>` : ''}
            <span id="sr-model-chip" style="display:none"></span>
            <span id="sr-active" style="display:flex;gap:8px;flex-wrap:wrap"></span>
            <button class="sr-clear" id="sr-clear" style="display:none">Clear all</button>
          </div>
          <div class="sr-toolbar-actions">
            <button class="sr-filter-toggle" id="sr-filter-toggle" type="button" aria-label="Open filters">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 5h18M6 12h12M10 19h4"/></svg>
              Filters
            </button>
            <div class="sr-sortwrap"><label for="sr-sort">Sort</label>
              <select id="sr-sort">
                <option value="featured">Featured</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="new">Newest</option>
              </select>
            </div>
          </div>
        </div>

        <div class="sr-grid">
${cards}
          <div class="sr-empty" style="display:none">No cases match these filters. <b>Clear filters</b></div>
        </div>
      </div>
    </div></div>
${valueModule()}
${discoveryModule(alsoLike)}
${guidesModule()}

    <section class="sr-seo"><div class="container">
      <h2>${esc(opts.seoTitle)}</h2>
      <p>${opts.seoLead}</p>
      <p>${opts.seoBody}</p>
      <div class="sr-faqs">
        ${opts.faq.map((f, i) => `<details class="sr-q"${i === 0 ? ' open' : ''}><summary>${f.q} <i aria-hidden="true">&#43;</i></summary><p>${f.a}</p></details>`).join('\n        ')}
      </div>
    </div></section>
  </main>

  <footer class="footer" aria-label="Site footer">
    <div class="container">

      <div class="footer-grid">

        <div class="footer-brand">
          <p class="footer-logo">VELVET <span class="amp">&amp;</span> VALOR</p>
          <p class="footer-tagline">Artist-led luxury cases for those who carry their horse everywhere they go.</p>
          <nav class="footer-social" aria-label="Social media">
            <a href="https://www.instagram.com/velvetvalorstore" target="_blank" rel="noopener" class="footer-social-link" aria-label="Velvet &amp; Valor on Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.9" fill="currentColor"/></svg><span>@velvetvalorstore</span></a>
          </nav>
        </div>

        <div>
          <p class="footer-col-title">Shop</p>
          <ul class="footer-links">
            <li><a href="/collections/iphone-cases" class="footer-link">iPhone Cases</a></li>
            <li><a href="/collections/noble-steed" class="footer-link">Noble Steed</a></li>
            <li><a href="/collections/riders-motto" class="footer-link">The Rider&rsquo;s Motto</a></li>
            <li><a href="/custom" class="footer-link">Custom Portrait</a></li>
          </ul>
        </div>

        <div>
          <p class="footer-col-title">Explore</p>
          <ul class="footer-links">
            <li><a href="/our-story" class="footer-link">Our Story</a></li>
            <li><a href="/blog" class="footer-link">Blog</a></li>
          </ul>
        </div>

        <div>
          <p class="footer-col-title">Support</p>
          <ul class="footer-links">
            <li><a href="/shipping" class="footer-link">Shipping &amp; Returns</a></li>
            <li><a href="/contact"  class="footer-link">Contact</a></li>
          </ul>
        </div>

      </div>

      <div class="footer-trust">
        <div class="footer-trust-items">
          <span class="footer-trust-item"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>Secure checkout</span>
          <span class="footer-trust-item"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18"/></svg>Worldwide shipping</span>
          <span class="footer-trust-item"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6L12 17l-5.4 2.8 1.2-6L3.3 9.4l6.1-.8z"/></svg>Five-star reviewed</span>
        </div>
      </div>

      <nav class="footer-legal-slim" aria-label="Legal links">
        <a href="/privacy">Privacy Policy</a>
        <a href="/cookies">Cookie Policy</a>
      </nav>

    </div>
  </footer>

  <script src="/js/main.js"></script>
  <script src="/js/currency.js"></script>
  <script src="/js/cart.js"></script>
  <script src="/js/search-collection.js" defer></script>
</body>
</html>
`;
}

module.exports = { catalogue, renderSearchPage, COLOUR_HEX, COLOUR_ORDER };
