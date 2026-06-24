#!/usr/bin/env node
/**
 * Velvet & Valor — Static Blog Generator
 * --------------------------------------
 * Reads Markdown posts from content/posts/*.md (YAML frontmatter + body) and
 * emits fully SEO-optimised static HTML into /blog, plus category hubs, author
 * pages, an RSS feed, and a regenerated sitemap.xml.
 *
 * Run:  npm run build:blog
 * Output is committed — Vercel serves it statically, no build step required.
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');
const config = require('../content/blog.config.js');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const BLOG_DIR = path.join(ROOT, 'blog');
const { site, categories, authors, featuredProduct, corePages } = config;
const categoryIntros = config.categoryIntros || {};
const categoryIcons = config.categoryIcons || {};
const BASE = site.baseUrl;

/* ─────────────────────────── helpers ─────────────────────────── */

const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// For JSON-LD string values: strip the quote-escaping (JSON.stringify handles it)
const slugify = (s = '') => s.toLowerCase().trim()
  .replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const fmtDate = (iso) => {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};
const fmtDateShort = (iso) => {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
const rfc822 = (iso) => new Date(iso + 'T09:00:00Z').toUTCString();
// YAML parses unquoted `2026-06-10` into a Date object; normalise everything to YYYY-MM-DD.
const toISODate = (v) => (v instanceof Date) ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);

const catName = (slug) => categories[slug] || slug;
const author = (slug) => authors[slug] || authors[Object.keys(authors)[0]];

// Avatar contents for a circular container the caller styles: photo <img> if the
// author has one, else their initials. Container needs overflow:hidden for the img.
const avatarInner = (a) => a.photo
  ? `<img src="${a.photo}" alt="${esc(a.name)}" loading="lazy" />`
  : esc(a.initials);

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function write(file, html) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, html);
  return path.relative(ROOT, file);
}

/* ─────────────────────── markdown → html + toc ─────────────────────── */

function renderBody(md) {
  let html = marked.parse(md, { mangle: false, headerIds: false });
  const toc = [];
  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (m, lvl, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    const id = slugify(text);
    if (lvl === '2') toc.push({ id, text });
    return `<h${lvl} id="${id}">${inner}</h${lvl}>`;
  });
  return { html, toc };
}

/* ─────────────────────────── shared chrome ─────────────────────────── */

function head({ title, description, canonical, ogType = 'website', ogImage, jsonld = [] }) {
  const img = ogImage || site.defaultOgImage;
  const ld = jsonld.map(o => `  <script type="application/ld+json">\n${JSON.stringify(o, null, 2)}\n  </script>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="google-site-verification" content="x7mVJoxLwBmsE4siMV3RvWYQhm2_hkhxpUsnyDUf874" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${canonical}" />

  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

  <meta property="og:type" content="${ogType}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${img}" />
  <meta property="og:site_name" content="${esc(site.brand)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${img}" />

  <link rel="alternate" type="application/rss+xml" title="${esc(site.blogName)}" href="${BASE}/blog/rss.xml" />

${ld}

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

  <link rel="stylesheet" href="/css/style.css" />
  <link rel="stylesheet" href="/css/blog.css" />
  <!-- Cookie consent + conditional analytics -->
  <script src="/js/consent.js"></script>
  <script src="/js/in-app-browser.js" defer></script>
  <script src="/js/blog.js" defer></script>
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
      <a href="/" class="nav-logo" aria-label="Velvet and Valor home">
        VELVET <span class="amp">&amp;</span> VALOR
      </a>
      <ul class="nav-links" role="list">
        <li><a href="/collections/iphone-cases" class="nav-link">iPhone Cases</a></li>
        <li><a href="/custom" class="nav-link">Custom Portrait</a></li>
        <li><a href="/our-story" class="nav-link">Our Story</a></li>
        <li><a href="/blog" class="nav-link" aria-current="page">Journal</a></li>
      </ul>
      <div class="nav-actions">
        <a href="${featuredProduct.url}" class="btn-primary" style="padding: 10px 24px; font-size: 0.75rem;">Shop Now</a>
      </div>
    </div>
  </nav>
`;
}

function footer() {
  // Mirrors the site footer from index.html exactly so the Journal shares the
  // same footer as the home page. All classes live in css/style.css (loaded here).
  return `
  <footer class="footer" aria-label="Site footer">
    <div class="container">

      <div class="footer-grid">

        <!-- Brand column -->
        <div class="footer-brand">
          <p class="footer-logo">VELVET <span class="amp">&amp;</span> VALOR</p>
          <p class="footer-tagline">Artist-led luxury cases for those who carry their horse everywhere they go.</p>
          <nav class="footer-social" aria-label="Social media">
            <a href="https://www.instagram.com/velvetvalorstore" target="_blank" rel="noopener" class="footer-social-link" aria-label="Velvet &amp; Valor on Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.9" fill="currentColor"/></svg><span>@velvetvalorstore</span></a>
          </nav>
        </div>

        <!-- Shop -->
        <div>
          <p class="footer-col-title">Shop</p>
          <ul class="footer-links">
            <li><a href="/collections/iphone-cases" class="footer-link">iPhone Cases</a></li>
            <li><a href="/collections/iphone-cases#noble-steed-collection" class="footer-link">Noble Steed</a></li>
            <li><a href="/riders-motto" class="footer-link">The Rider&rsquo;s Motto</a></li>
            <li><a href="/custom" class="footer-link">Custom Portrait</a></li>
          </ul>
        </div>

        <!-- Explore -->
        <div>
          <p class="footer-col-title">Explore</p>
          <ul class="footer-links">
            <li><a href="/our-story" class="footer-link">Our Story</a></li>
            <li><a href="/blog" class="footer-link">Blog</a></li>
          </ul>
        </div>

        <!-- Support -->
        <div>
          <p class="footer-col-title">Support</p>
          <ul class="footer-links">
            <li><a href="/shipping" class="footer-link">Shipping &amp; Returns</a></li>
            <li><a href="/contact"  class="footer-link">Contact</a></li>
          </ul>
        </div>

      </div>

      <!-- Trust + payment row -->
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
  <script src="/js/currency.js" defer></script>
</body>
</html>`;
}

/* ─────────────────────────── post page ─────────────────────────── */

function postSchema(p) {
  const a = author(p.author);
  const blogPosting = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.description,
    image: p.ogImageAbs,
    datePublished: p.date,
    dateModified: p.updated || p.date,
    author: { '@type': 'Person', name: a.name, url: `${BASE}/blog/author/${p.author}` },
    publisher: {
      '@type': 'Organization', name: site.org.name,
      logo: { '@type': 'ImageObject', url: site.org.logo },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': p.url },
    articleSection: catName(p.category),
    wordCount: p.wordCount,
  };
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: site.blogName, item: `${BASE}/blog` },
      { '@type': 'ListItem', position: 3, name: catName(p.category), item: `${BASE}/blog/category/${p.category}` },
      { '@type': 'ListItem', position: 4, name: p.title, item: p.url },
    ],
  };
  const out = [blogPosting, breadcrumb];
  if (Array.isArray(p.faq) && p.faq.length) {
    out.push({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: p.faq.map(f => ({
        '@type': 'Question', name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }
  return out;
}

// Inject a block of HTML into the rendered body just before the 2nd <h2> so the
// in-content product CTA lands mid-read; fall back to appending if the post is short.
function injectMidContent(html, block) {
  const positions = [];
  const re = /<h2\b/g;
  let m;
  while ((m = re.exec(html))) positions.push(m.index);
  if (positions.length >= 2) {
    const at = positions[1];
    return html.slice(0, at) + block + html.slice(at);
  }
  return html + block;
}

function renderPost(p, posts) {
  const a = author(p.author);
  const related = posts.filter(x => x.slug !== p.slug && x.category === p.category).slice(0, 3);
  const pool = related.length ? related : posts.filter(x => x.slug !== p.slug).slice(0, 3);
  const idx = posts.indexOf(p);
  const prev = posts[idx + 1]; // older
  const next = posts[idx - 1]; // newer

  const shareUrl = encodeURIComponent(p.url);
  const shareTitle = encodeURIComponent(p.title);

  const takeaways = (Array.isArray(p.keyTakeaways) && p.keyTakeaways.length) ? `
        <aside class="article-takeaways" aria-label="Key takeaways">
          <p class="article-takeaways-title">Key Takeaways</p>
          <ul>
${p.keyTakeaways.map(t => `            <li>${esc(t)}</li>`).join('\n')}
          </ul>
        </aside>` : '';

  // In-content product CTA, injected mid-article.
  const inlineCta = `
        <aside class="article-cta" aria-label="Shop ${esc(featuredProduct.name)}">
          <div class="article-cta-media" aria-hidden="true">&#128241;</div>
          <div class="article-cta-text">
            <p class="article-cta-name">${esc(featuredProduct.name)}</p>
            <p class="article-cta-blurb">${esc(featuredProduct.blurb)} &middot; ${esc(featuredProduct.price)}</p>
          </div>
          <a href="${featuredProduct.url}" class="article-cta-btn">Shop Now
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </aside>`;
  const body = injectMidContent(p.html, inlineCta);

  const faqBlock = (Array.isArray(p.faq) && p.faq.length) ? `
        <section class="article-faq" aria-label="Frequently asked questions">
          <h2 id="faq">Frequently Asked Questions</h2>
${p.faq.map(f => `          <details class="article-faq-item">
            <summary>${esc(f.q)}<span class="article-faq-icon" aria-hidden="true"></span></summary>
            <div class="article-faq-answer"><p>${f.a}</p></div>
          </details>`).join('\n')}
        </section>` : '';

  const tags = (p.tags || []).map(t =>
    `            <span class="article-tag">${esc(t)}</span>`).join('\n');

  const credentials = (a.credentials || []).map(c =>
    `            <span class="article-cred">${esc(c)}</span>`).join('\n');

  const toc = p.toc.length ? `
          <nav class="article-toc" aria-label="Table of contents">
            <p class="article-aside-title">In This Article</p>
${p.toc.map((t, i) => `            <a href="#${t.id}" class="article-toc-item${i === 0 ? ' active' : ''}">${esc(t.text)}</a>`).join('\n')}
          </nav>` : '';

  const heroMedia = p.cover ? `
          <figure class="article-hero-media">
            <img src="${p.cover}" alt="${esc(p.coverAlt || p.title)}" loading="eager" />
          </figure>` : `
          <figure class="article-hero-media article-hero-media--placeholder" aria-hidden="true">
            <span class="article-hero-media-icon">&#10022;</span>
          </figure>`;

  const updatedMeta = (p.updated && p.updated !== p.date)
    ? `\n          <span class="article-meta-sep" aria-hidden="true"></span>\n          <span class="article-meta-item">Updated ${fmtDateShort(p.updated)}</span>` : '';

  return head({
    title: `${p.title} — ${site.blogName} | ${site.brand}`,
    description: p.description,
    canonical: p.url,
    ogType: 'article',
    ogImage: p.ogImageAbs,
    jsonld: postSchema(p),
  }) + `
  <div class="reading-progress" aria-hidden="true"><span id="readingProgressBar"></span></div>

  <main class="article">

    <header class="article-hero">
      <div class="container">
        <div class="article-hero-grid">
          <div class="article-hero-text">
            <nav class="article-breadcrumb" aria-label="Breadcrumb">
              <a href="/blog">Journal</a>
              <span class="article-breadcrumb-sep">&#47;</span>
              <a href="/blog/category/${p.category}">${esc(catName(p.category))}</a>
            </nav>

            <span class="article-badge">${esc(catName(p.category))}</span>

            <h1 class="article-title">${esc(p.title)}</h1>

            <p class="article-dek">${esc(p.excerpt)}</p>

            <div class="article-meta">
              <a href="/blog/author/${p.author}" class="article-meta-author">
                <span class="article-meta-avatar">${esc(a.initials)}</span>
                <span class="article-meta-name">${esc(a.name)}</span>
              </a>
              <span class="article-meta-sep" aria-hidden="true"></span>
              <span class="article-meta-item"><time datetime="${p.date}">${fmtDate(p.date)}</time></span>
              <span class="article-meta-sep" aria-hidden="true"></span>
              <span class="article-meta-item">${p.readingTime} min read</span>${updatedMeta}
            </div>
          </div>
${heroMedia}
        </div>
      </div>
    </header>

    <div class="article-paper">
      <div class="article-shell">

        <div class="article-share" aria-label="Share this article">
          <span class="article-share-label">Share</span>
          <a href="https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}" target="_blank" rel="noopener" class="article-share-btn" aria-label="Share on X">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener" class="article-share-btn" aria-label="Share on Facebook">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.01 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.08 24 18.09 24 12.07z"/></svg>
          </a>
          <a href="https://pinterest.com/pin/create/button/?url=${shareUrl}&description=${shareTitle}" target="_blank" rel="noopener" class="article-share-btn" aria-label="Save to Pinterest">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.42 7.62 11.17-.1-.95-.2-2.4.04-3.44.22-.93 1.4-5.96 1.4-5.96s-.36-.72-.36-1.78c0-1.66.97-2.9 2.17-2.9 1.02 0 1.52.77 1.52 1.69 0 1.03-.66 2.57-1 4-.28 1.2.6 2.17 1.78 2.17 2.14 0 3.78-2.25 3.78-5.5 0-2.88-2.07-4.89-5.02-4.89-3.42 0-5.43 2.56-5.43 5.21 0 1.03.4 2.14.89 2.74.1.12.11.22.08.34l-.33 1.37c-.05.22-.18.27-.4.16-1.5-.7-2.44-2.89-2.44-4.65 0-3.78 2.75-7.26 7.92-7.26 4.16 0 7.39 2.96 7.39 6.92 0 4.13-2.6 7.45-6.22 7.45-1.21 0-2.35-.63-2.74-1.38l-.75 2.84c-.27 1.04-1 2.35-1.49 3.15C9.57 23.81 10.76 24 12 24c6.63 0 12-5.37 12-12S18.63 0 12 0z"/></svg>
          </a>
          <a href="mailto:?subject=${shareTitle}&body=${shareUrl}" class="article-share-btn" aria-label="Share by email">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
          </a>
          <button type="button" class="article-share-btn" data-copy-link aria-label="Copy link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>
          </button>
        </div>

        <article class="article-main">
${takeaways}
          <div class="article-body">
${body}
          </div>
${faqBlock}

          <div class="article-tags">
            <span class="article-tags-label">Tags</span>
${tags}
          </div>

          <aside class="article-author" aria-label="About the author">
            <a href="/blog/author/${p.author}" class="article-author-avatar">${avatarInner(a)}</a>
            <div class="article-author-info">
              <p class="article-author-name">About ${esc(a.name)}</p>
              <p class="article-author-bio">${esc(a.shortBio || a.bio)}</p>
              <div class="article-creds">
${credentials}
              </div>
              <a href="/blog/author/${p.author}" class="article-author-link">View all articles
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
            </div>
          </aside>
        </article>

        <aside class="article-aside">
${toc}
          <div class="article-product">
            <p class="article-aside-title light">Featured In</p>
            <a href="${featuredProduct.url}" class="article-product-media">
              ${featuredProduct.image ? `<img src="${featuredProduct.image}" alt="${esc(featuredProduct.imageAlt || featuredProduct.name)}" loading="lazy" />` : '<span aria-hidden="true">&#128241;</span>'}
            </a>
            <p class="article-product-name">${esc(featuredProduct.name)}</p>
            <p class="article-product-price">${esc(featuredProduct.price)}</p>
            <a href="${featuredProduct.url}" class="article-product-btn">Shop Now
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        </aside>

      </div>
    </div>

    <section class="article-newsletter" aria-label="Newsletter signup">
      <div class="container">
        <p class="article-newsletter-eyebrow">The Atelier List</p>
        <h2 class="article-newsletter-title">Join the list for new stories &amp; 10% off</h2>
        <p class="article-newsletter-sub">Care guides, early access, and a little inspiration from the saddle and the atelier.</p>
        <form class="article-newsletter-form" onsubmit="return false;">
          <input type="email" placeholder="your@email.com" aria-label="Email address" />
          <button type="submit">Subscribe</button>
        </form>
      </div>
    </section>

    <section class="article-related container" aria-label="Continue reading">
      <p class="article-related-eyebrow">Continue Reading</p>
      <div class="article-related-grid">
${pool.map(r => `        <a href="${r.path}" class="article-related-card">
          <div class="article-related-thumb" aria-hidden="true"><span>&#10022;</span></div>
          <div class="article-related-body">
            <span class="article-related-cat">${esc(catName(r.category))}</span>
            <h3 class="article-related-title">${esc(r.title)}</h3>
          </div>
        </a>`).join('\n')}
      </div>
    </section>

    <nav class="article-pager container" aria-label="Article navigation">
${prev ? `      <a href="${prev.path}" class="article-pager-item prev">
        <span class="article-pager-dir">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Previous
        </span>
        <span class="article-pager-title">${esc(prev.title)}</span>
      </a>` : '<span></span>'}
${next ? `      <a href="${next.path}" class="article-pager-item next">
        <span class="article-pager-dir">
          Next
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </span>
        <span class="article-pager-title">${esc(next.title)}</span>
      </a>` : '<span></span>'}
    </nav>

  </main>
` + footer();
}

/* ─────────────────────────── card + listing ─────────────────────────── */

// Light "paper" article card used across the homepage, category, and author grids.
// data-search powers the homepage client-side search (title + excerpt + category).
function journalCard(p) {
  const a = author(p.author);
  const media = p.cover
    ? `<img src="${p.cover}" alt="${esc(p.coverAlt || p.title)}" loading="lazy" />`
    : '<span class="journal-card-icon" aria-hidden="true">&#10022;</span>';
  return `        <article class="journal-card" data-search="${esc(`${p.title} ${p.excerpt} ${catName(p.category)} ${(p.tags || []).join(' ')}`.toLowerCase())}">
          <a href="${p.path}" class="journal-card-link">
            <div class="journal-card-media">
              ${media}
              <span class="journal-card-badge">${esc(catName(p.category))}</span>
            </div>
            <div class="journal-card-body">
              <p class="journal-card-meta"><span>${esc(catName(p.category))}</span><span class="dot">&middot;</span><time datetime="${p.date}">${fmtDateShort(p.date)}</time></p>
              <h3 class="journal-card-title">${esc(p.title)}</h3>
              <p class="journal-card-excerpt">${esc(p.excerpt)}</p>
              <div class="journal-card-footer">
                <span class="journal-card-author"><span class="journal-card-avatar">${esc(a.initials)}</span>${esc(a.name)}</span>
                <span class="journal-card-read">${p.readingTime} min
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </span>
              </div>
            </div>
          </a>
        </article>`;
}

// Category filter pills (light). data-hide-on-search collapses them during search.
function journalFilter(activeSlug) {
  const items = [`        <a href="/blog" class="journal-filter-btn${!activeSlug ? ' active' : ''}">All Articles</a>`]
    .concat(Object.keys(categories).map(s =>
      `        <a href="/blog/category/${s}" class="journal-filter-btn${activeSlug === s ? ' active' : ''}">${esc(catName(s))}</a>`));
  return `      <nav class="journal-filter" data-hide-on-search aria-label="Filter by category">
${items.join('\n')}
      </nav>`;
}

// Topic-hub grid — turns the flat feed into crawlable topic clusters (SEO siloing).
function topicHubs(posts) {
  const items = Object.keys(categories).map(slug => {
    const count = posts.filter(p => p.category === slug).length;
    if (!count) return '';
    return `          <a href="/blog/category/${slug}" class="journal-hub">
            <span class="journal-hub-icon" aria-hidden="true">${categoryIcons[slug] || '&#10022;'}</span>
            <span class="journal-hub-name">${esc(catName(slug))}</span>
            <span class="journal-hub-count">${count} ${count === 1 ? 'article' : 'articles'}</span>
          </a>`;
  }).filter(Boolean).join('\n');
  return `      <section class="journal-hubs" data-hide-on-search aria-label="Explore by topic">
        <p class="journal-section-eyebrow">Browse</p>
        <h2 class="journal-hubs-title">Explore by Topic</h2>
        <div class="journal-hubs-grid">
${items}
        </div>
      </section>`;
}

// Shared dark newsletter band (reuses the article newsletter styling).
function newsletterBand(title = 'Be the first to read every new story') {
  return `    <section class="article-newsletter" aria-label="Newsletter signup">
      <div class="container">
        <p class="article-newsletter-eyebrow">The Atelier List</p>
        <h2 class="article-newsletter-title">${esc(title)}</h2>
        <p class="article-newsletter-sub">Care guides, early access &amp; 10% off your first order — straight from the atelier.</p>
        <form class="article-newsletter-form" onsubmit="return false;">
          <input type="email" placeholder="your@email.com" aria-label="Email address" />
          <button type="submit">Subscribe</button>
        </form>
      </div>
    </section>`;
}

// Empty-state index — shown when there are no published posts yet (fresh blog,
// before the content engine publishes its first article). Avoids referencing a
// (non-existent) featured post.
function renderEmptyIndex() {
  return head({
    title: `${site.blogName} — ${site.brand} | Horse Lifestyle & Gift Guides`,
    description: 'The Equestrian Journal by Velvet & Valor: gift guides for horse lovers, equestrian lifestyle, leather care, and the craft behind every case.',
    canonical: `${BASE}/blog`,
    jsonld: [{
      '@context': 'https://schema.org', '@type': 'Blog',
      name: site.blogName, url: `${BASE}/blog`,
      publisher: { '@type': 'Organization', name: site.org.name, url: site.org.url },
    }],
  }) + `
  <main class="journal">

    <section class="journal-hero">
      <div class="container">
        <p class="journal-hero-eyebrow">Est. MMXXVI &mdash; The Atelier</p>
        <h1 class="journal-hero-title">The Equestrian Journal</h1>
        <p class="journal-hero-subtitle">
          Stories from the saddle and the atelier — gift guides for horse lovers,
          equestrian life, craft heritage, and the art of enduring luxury.
        </p>
      </div>
    </section>

    <div class="journal-paper">
      <div class="container">
        <p class="journal-search-empty" style="display:block;">New stories are on their way — subscribe below to be the first to read them.</p>
      </div>
    </div>

${newsletterBand()}

  </main>
` + footer();
}

function renderIndex(posts) {
  if (!posts.length) return renderEmptyIndex();
  const featured = posts[0];
  const rest = posts.slice(1);
  const a = author(featured.author);
  const blogLd = {
    '@context': 'https://schema.org', '@type': 'Blog',
    name: site.blogName,
    description: 'Gift guides for horse lovers, equestrian lifestyle, and craft heritage from Velvet & Valor.',
    url: `${BASE}/blog`,
    publisher: { '@type': 'Organization', name: site.org.name, url: site.org.url },
    blogPost: posts.slice(0, 10).map(p => ({
      '@type': 'BlogPosting', headline: p.title, url: p.url,
      datePublished: p.date, author: { '@type': 'Person', name: author(p.author).name },
    })),
  };
  return head({
    title: `${site.blogName} — ${site.brand} | Horse Lifestyle & Gift Guides`,
    description: 'The Equestrian Journal by Velvet & Valor: gift guides for horse lovers, equestrian lifestyle, leather care, and the craft behind every case.',
    canonical: `${BASE}/blog`,
    jsonld: [blogLd],
  }) + `
  <main class="journal">

    <section class="journal-hero">
      <div class="container">
        <p class="journal-hero-eyebrow">Est. MMXXVI &mdash; The Atelier</p>
        <h1 class="journal-hero-title">The Equestrian Journal</h1>
        <p class="journal-hero-subtitle">
          Stories from the saddle and the atelier — gift guides for horse lovers,
          equestrian life, craft heritage, and the art of enduring luxury.
        </p>
        <div class="journal-search">
          <svg class="journal-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="search" id="journalSearch" class="journal-search-input" placeholder="Search the Journal&hellip;" aria-label="Search the Journal" autocomplete="off" />
        </div>
      </div>
    </section>

    <div class="journal-paper">
      <div class="container">

${journalFilter(null)}

        <p class="journal-search-empty" id="journalSearchEmpty" hidden>No stories match your search. Try another term.</p>

        <section class="journal-featured" data-hide-on-search aria-label="Featured article">
          <a href="${featured.path}" class="journal-featured-card" data-search="${esc(`${featured.title} ${featured.excerpt} ${catName(featured.category)}`.toLowerCase())}">
            <div class="journal-featured-media">
              ${featured.cover ? `<img src="${featured.cover}" alt="${esc(featured.coverAlt || featured.title)}" loading="eager" />` : '<span class="journal-card-icon" aria-hidden="true">&#10022;</span>'}
              <span class="journal-featured-flag">&#9733; Featured</span>
            </div>
            <div class="journal-featured-body">
              <p class="journal-featured-meta">${esc(catName(featured.category))} <span class="dot">&middot;</span> <time datetime="${featured.date}">${fmtDate(featured.date)}</time> <span class="dot">&middot;</span> ${featured.readingTime} min read</p>
              <h2 class="journal-featured-title">${esc(featured.title)}</h2>
              <p class="journal-featured-excerpt">${esc(featured.excerpt)}</p>
              <div class="journal-featured-author">
                <span class="journal-featured-avatar">${esc(a.initials)}</span>
                <span class="journal-featured-author-info">
                  <span class="journal-featured-author-name">${esc(a.name)}</span>
                  <span class="journal-featured-author-role">${esc(a.role)}</span>
                </span>
              </div>
              <span class="journal-featured-read">Read Article
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </span>
            </div>
          </a>
        </section>

        <section class="journal-grid-section">
          <div class="journal-section-head" data-hide-on-search>
            <div>
              <p class="journal-section-eyebrow">From The Atelier</p>
              <h2 class="journal-section-title">Recent Articles</h2>
            </div>
            <span class="journal-section-count">${posts.length} ${posts.length === 1 ? 'story' : 'stories'}</span>
          </div>
          <div class="journal-grid" id="journalGrid">
${rest.map(journalCard).join('\n')}
          </div>
        </section>

${topicHubs(posts)}

      </div>
    </div>

${newsletterBand()}

  </main>
` + footer();
}

function renderCategory(slug, posts) {
  const name = catName(slug);
  return head({
    title: `${name} — ${site.blogName} | ${site.brand}`,
    description: `${name} articles from The Equestrian Journal by Velvet & Valor — ${posts.length} ${posts.length === 1 ? 'story' : 'stories'} on horse lifestyle, gifting, and craft.`,
    canonical: `${BASE}/blog/category/${slug}`,
    jsonld: [{
      '@context': 'https://schema.org', '@type': 'CollectionPage',
      name: `${name} — ${site.blogName}`,
      url: `${BASE}/blog/category/${slug}`,
      isPartOf: { '@type': 'Blog', name: site.blogName, url: `${BASE}/blog` },
    }, {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` },
        { '@type': 'ListItem', position: 2, name: site.blogName, item: `${BASE}/blog` },
        { '@type': 'ListItem', position: 3, name, item: `${BASE}/blog/category/${slug}` },
      ],
    }] }) + `
  <main class="journal">

    <section class="journal-hero">
      <div class="container">
        <nav class="journal-hero-breadcrumb" aria-label="Breadcrumb">
          <a href="/blog">Journal</a>
          <span class="journal-hero-breadcrumb-sep">&#47;</span>
          <span>${esc(name)}</span>
        </nav>
        <p class="journal-hero-eyebrow">The Equestrian Journal</p>
        <h1 class="journal-hero-title">${esc(name)}</h1>
        <p class="journal-hero-subtitle">Every ${esc(name)} story from the Velvet &amp; Valor atelier.</p>
      </div>
    </section>

    <div class="journal-paper">
      <div class="container">

${journalFilter(slug)}
${categoryIntros[slug] ? `
        <div class="journal-intro">
          <p>${categoryIntros[slug]} <span class="journal-intro-count">${posts.length} ${posts.length === 1 ? 'article' : 'articles'} &middot; updated regularly.</span></p>
        </div>` : ''}

        <section class="journal-grid-section">
          <div class="journal-section-head">
            <h2 class="journal-section-title">All ${esc(name)} Stories</h2>
            <span class="journal-section-count">Newest first</span>
          </div>
          <div class="journal-grid">
${posts.map(journalCard).join('\n')}
          </div>
        </section>

      </div>
    </div>

${newsletterBand('Never miss a ' + name + ' story')}

  </main>
` + footer();
}

function renderAuthor(slug, posts) {
  const a = author(slug);
  return head({
    title: `${a.name} — ${site.blogName} | ${site.brand}`,
    description: `Articles by ${a.name}, ${a.role} of Velvet & Valor.`,
    canonical: `${BASE}/blog/author/${slug}`,
    ogType: 'profile',
    jsonld: [{
      '@context': 'https://schema.org', '@type': 'ProfilePage',
      mainEntity: {
        '@type': 'Person', name: a.name, jobTitle: a.role, description: a.bio,
        url: `${BASE}/blog/author/${slug}`, sameAs: a.sameAs || [],
        worksFor: { '@type': 'Organization', name: site.org.name, url: site.org.url },
      },
    }, {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` },
        { '@type': 'ListItem', position: 2, name: site.blogName, item: `${BASE}/blog` },
        { '@type': 'ListItem', position: 3, name: a.name, item: `${BASE}/blog/author/${slug}` },
      ],
    }] }) + (() => {
  const topics = new Set(posts.map(p => p.category));
  const expertise = (a.credentials || []).map(c =>
    `          <span class="journal-expertise-chip">${esc(c)}</span>`).join('\n');
  const stats = [
    { v: String(posts.length), l: posts.length === 1 ? 'Article' : 'Articles' },
    a.yearsExperience ? { v: esc(a.yearsExperience), l: 'Years in Leather' } : null,
    { v: String(topics.size), l: topics.size === 1 ? 'Topic Covered' : 'Topics Covered' },
    a.base ? { v: esc(a.base), l: 'Sourcing Base' } : null,
  ].filter(Boolean).map(s =>
    `          <div class="journal-stat"><span class="journal-stat-value">${s.v}</span><span class="journal-stat-label">${s.l}</span></div>`).join('\n');
  const social = a.instagram
    ? `          <a href="${a.instagram}" target="_blank" rel="noopener" class="journal-author-social"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.9" fill="currentColor"/></svg>${esc(a.instagramHandle || 'Instagram')}</a>` : '';
  return `
  <main class="journal">

    <section class="journal-author-hero">
      <div class="container journal-author-hero-inner">
        <div class="journal-author-avatar">${avatarInner(a)}</div>
        <div class="journal-author-intro">
          <nav class="journal-hero-breadcrumb" aria-label="Breadcrumb">
            <a href="/blog">Journal</a>
            <span class="journal-hero-breadcrumb-sep">&#47;</span>
            <span>${esc(a.name)}</span>
          </nav>
          <h1 class="journal-author-name">${esc(a.name)}</h1>
          <p class="journal-author-role">${esc(a.role)}</p>
          <p class="journal-author-bio">${esc(a.bio)}</p>
          <div class="journal-author-socials">
${social}
            <a href="/contact" class="journal-author-social"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>Contact</a>
          </div>
        </div>
      </div>
    </section>

    <div class="journal-paper">
      <div class="container">

        <div class="journal-stats" aria-label="About ${esc(a.name)}">
${stats}
        </div>
${expertise ? `
        <div class="journal-expertise">
          <p class="journal-expertise-label">Areas of Expertise</p>
          <div class="journal-expertise-chips">
${expertise}
          </div>
        </div>` : ''}

        <section class="journal-grid-section">
          <div class="journal-section-head">
            <h2 class="journal-section-title">Articles by ${esc(a.name.split(' ')[0])}</h2>
            <span class="journal-section-count">${posts.length} ${posts.length === 1 ? 'story' : 'stories'}</span>
          </div>
          <div class="journal-grid">
${posts.map(journalCard).join('\n')}
          </div>
        </section>

      </div>
    </div>

${newsletterBand('Read more from the atelier')}

  </main>
` + footer();
})();
}

/* ─────────────────────────── sitemap + rss ─────────────────────────── */

function buildSitemap(posts, today) {
  const urls = [];
  const add = (loc, lastmod, changefreq, priority) =>
    urls.push(`  <url>\n    <loc>${BASE}${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`);

  corePages.forEach(p => add(p.loc, today, p.changefreq, p.priority));
  add('/blog', today, 'weekly', '0.7');
  // Only list category/author pages that actually have posts — main() generates
  // them conditionally, so listing empty ones would put 404s in the sitemap.
  Object.keys(categories).forEach(s => { if (posts.some(p => p.category === s)) add(`/blog/category/${s}`, today, 'weekly', '0.5'); });
  Object.keys(authors).forEach(s => { if (posts.some(p => p.author === s)) add(`/blog/author/${s}`, today, 'monthly', '0.4'); });
  posts.forEach(p => add(`/blog/${p.slug}`, p.updated || p.date, 'monthly', '0.6'));

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

function buildRss(posts) {
  const items = posts.slice(0, 20).map(p => `    <item>
      <title>${esc(p.title)}</title>
      <link>${p.url}</link>
      <guid isPermaLink="true">${p.url}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <category>${esc(catName(p.category))}</category>
      <description>${esc(p.excerpt)}</description>
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(site.blogName)} — ${esc(site.brand)}</title>
    <link>${BASE}/blog</link>
    <description>Gift guides for horse lovers, equestrian lifestyle, and craft heritage from Velvet &amp; Valor.</description>
    <language>en</language>
    <atom:link href="${BASE}/blog/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

/* ─────────────────────────── main ─────────────────────────── */

function loadPosts() {
  // No posts dir yet (fresh blog before the content engine publishes anything).
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const posts = files.map(file => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const { data, content } = matter(raw);
    const slug = data.slug || file.replace(/\.md$/, '');
    const { html, toc } = renderBody(content);
    const words = content.replace(/[#>*_`\-\[\]()!]/g, ' ').split(/\s+/).filter(Boolean).length;
    if (!data.category || !categories[data.category]) {
      throw new Error(`Post "${slug}" has missing/unknown category: ${data.category}`);
    }
    const ogImageAbs = data.ogImage ? (data.ogImage.startsWith('http') ? data.ogImage : BASE + data.ogImage)
      : (data.cover ? BASE + data.cover : site.defaultOgImage);
    return {
      slug,
      path: `/blog/${slug}`,
      url: `${BASE}/blog/${slug}`,
      title: data.title,
      description: data.description || data.excerpt,
      excerpt: data.excerpt || data.description,
      category: data.category,
      tags: data.tags || [catName(data.category)],
      author: data.author && authors[data.author] ? data.author : Object.keys(authors)[0],
      date: toISODate(data.date),
      updated: data.updated ? toISODate(data.updated) : null,
      cover: data.cover || null,
      coverAlt: data.coverAlt || null,
      ogImageAbs,
      featured: !!data.featured,
      faq: data.faq || null,
      keyTakeaways: Array.isArray(data.keyTakeaways) ? data.keyTakeaways : null,
      readingTime: Math.max(1, Math.round(words / 200)),
      wordCount: words,
      html, toc,
    };
  });
  // newest first; a `featured: true` post floats to the top
  posts.sort((a, b) => (b.date < a.date ? -1 : b.date > a.date ? 1 : 0));
  const feat = posts.findIndex(p => p.featured);
  if (feat > 0) posts.unshift(posts.splice(feat, 1)[0]);
  return posts;
}

function main() {
  const today = (process.env.BUILD_DATE || new Date().toISOString().slice(0, 10));
  const posts = loadPosts();
  const written = [];

  posts.forEach(p => written.push(write(path.join(BLOG_DIR, `${p.slug}.html`), renderPost(p, posts))));
  written.push(write(path.join(BLOG_DIR, 'index.html'), renderIndex(posts)));

  Object.keys(categories).forEach(slug => {
    const cp = posts.filter(p => p.category === slug);
    if (cp.length) written.push(write(path.join(BLOG_DIR, 'category', `${slug}.html`), renderCategory(slug, cp)));
  });
  Object.keys(authors).forEach(slug => {
    const ap = posts.filter(p => p.author === slug);
    if (ap.length) written.push(write(path.join(BLOG_DIR, 'author', `${slug}.html`), renderAuthor(slug, ap)));
  });

  written.push(write(path.join(BLOG_DIR, 'rss.xml'), buildRss(posts)));
  written.push(write(path.join(ROOT, 'sitemap.xml'), buildSitemap(posts, today)));

  console.log(`✓ Built ${posts.length} posts + index + categories + authors + rss + sitemap`);
  written.forEach(f => console.log('  · ' + f));
}

main();
