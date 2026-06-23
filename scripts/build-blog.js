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
  const catLinks = Object.keys(categories)
    .map(s => `            <li><a href="/blog/category/${s}" class="footer-link">${esc(catName(s))}</a></li>`).join('\n');
  return `
  <footer class="footer" aria-label="Site footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <p class="footer-logo">VELVET <span class="amp">&amp;</span> VALOR</p>
          <nav class="footer-social" aria-label="Social media">
            <a href="https://www.instagram.com/velvetvalorstore" target="_blank" rel="noopener" class="footer-social-link" aria-label="Velvet &amp; Valor on Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.9" fill="currentColor"/></svg><span>@velvetvalorstore</span></a>
          </nav>
        </div>
        <div>
          <p class="footer-col-title">Shop</p>
          <ul class="footer-links">
            <li><a href="/collections/iphone-cases" class="footer-link">iPhone Cases</a></li>
            <li><a href="/custom" class="footer-link">Custom Portrait</a></li>
          </ul>
        </div>
        <div>
          <p class="footer-col-title">Journal</p>
          <ul class="footer-links">
${catLinks}
          </ul>
        </div>
        <div>
          <p class="footer-col-title">Help</p>
          <ul class="footer-links">
            <li><a href="/shipping" class="footer-link">Shipping &amp; Returns</a></li>
            <li><a href="/contact" class="footer-link">Contact</a></li>
          </ul>
        </div>
      </div>
      <hr class="gold-rule" />
      <div class="footer-bottom">
        <p class="footer-copy">&copy; 2026 Braveheart FZ-LLC. All rights reserved. Designs, artwork &amp; trademarks protected by copyright and applicable IP law.</p>
        <nav class="footer-legal" aria-label="Legal links">
          <a href="/privacy" class="footer-link">Privacy Policy</a><a href="/cookies" class="footer-link">Cookie Policy</a>
          <a href="#" class="footer-link" onclick="event.preventDefault(); window.vvOpenCookieSettings &amp;&amp; window.vvOpenCookieSettings();">Cookie Preferences</a>
        </nav>
      </div>
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

function renderPost(p, posts) {
  const a = author(p.author);
  const related = posts.filter(x => x.slug !== p.slug && x.category === p.category).slice(0, 3);
  const pool = related.length ? related : posts.filter(x => x.slug !== p.slug).slice(0, 3);
  const idx = posts.indexOf(p);
  const prev = posts[idx + 1]; // older
  const next = posts[idx - 1]; // newer

  const toc = p.toc.length ? `
        <div class="sidebar-widget">
          <p class="sidebar-widget-title">In This Article</p>
          <nav class="sidebar-toc" aria-label="Table of contents">
${p.toc.map((t, i) => `            <a href="#${t.id}" class="sidebar-toc-item${i === 0 ? ' active' : ''}">${esc(t.text)}</a>`).join('\n')}
          </nav>
        </div>` : '';

  const cover = p.cover ? `
      <div class="post-cover">
        <img src="${p.cover}" alt="${esc(p.coverAlt || p.title)}" loading="eager" />
      </div>` : `
      <div class="post-cover">
        <span class="post-cover-icon">&#10022;</span>
        <span class="post-cover-label">${esc(p.title)}</span>
      </div>`;

  const faqBlock = (Array.isArray(p.faq) && p.faq.length) ? `

        <h2 id="faq">Frequently Asked Questions</h2>
${p.faq.map(f => `        <h3>${esc(f.q)}</h3>\n        <p>${f.a}</p>`).join('\n')}` : '';

  // Tags are labels, not links — we don't generate tag archives, so linking them
  // would create soft-404s. Category navigation lives in the breadcrumb + filter.
  const tags = (p.tags || []).map(t =>
    `          <span class="post-tag">${esc(t)}</span>`).join('\n');

  return head({
    title: `${p.title} — ${site.blogName} | ${site.brand}`,
    description: p.description,
    canonical: p.url,
    ogType: 'article',
    ogImage: p.ogImageAbs,
    jsonld: postSchema(p),
  }) + `
  <main>

    <header class="post-hero">
      <div class="container">
        <nav class="post-breadcrumb" aria-label="Breadcrumb">
          <a href="/blog">Journal</a>
          <span class="post-breadcrumb-sep">&#47;</span>
          <a href="/blog/category/${p.category}">${esc(catName(p.category))}</a>
          <span class="post-breadcrumb-sep">&#47;</span>
          <span>${esc(p.title)}</span>
        </nav>

        <span class="post-category-badge">${esc(catName(p.category))}</span>

        <h1 class="post-title">${esc(p.title)}</h1>

        <p class="post-subtitle">${esc(p.excerpt)}</p>

        <div class="post-meta-bar">
          <div class="post-meta-author post-meta-item">
            <a href="/blog/author/${p.author}" style="display: flex; align-items: center; gap: 10px;">
              <div class="post-meta-avatar">${esc(a.initials)}</div>
              <span class="post-meta-author-name">${esc(a.name)}</span>
            </a>
          </div>
          <span class="post-meta-sep" aria-hidden="true"></span>
          <div class="post-meta-item"><time datetime="${p.date}">${fmtDate(p.date)}</time></div>
          <span class="post-meta-sep" aria-hidden="true"></span>
          <div class="post-meta-item">${p.readingTime} min read</div>
        </div>
      </div>
    </header>

    <div class="container">${cover}
    </div>

    <div class="post-layout">

      <article class="post-content">
${p.html}${faqBlock}

        <div class="post-tags">
          <span class="post-tags-label">Tags</span>
${tags}
        </div>
      </article>

      <aside class="post-sidebar">
${toc}
        <div class="sidebar-widget sidebar-product">
          <p class="sidebar-widget-title">Featured In</p>
          <div class="sidebar-product-image" aria-hidden="true">&#128241;</div>
          <p class="sidebar-product-name">${esc(featuredProduct.name)}</p>
          <p class="sidebar-product-price">${esc(featuredProduct.price)}</p>
          <a href="${featuredProduct.url}" class="btn-primary" style="width: 100%; justify-content: center; font-size: 0.6875rem; padding: 12px 20px;">
            Shop Now
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>

        <div class="sidebar-widget">
          <p class="sidebar-widget-title">Related Articles</p>
          <div class="sidebar-related">
${pool.map(r => `            <a href="${r.path}" class="sidebar-related-item">
              <div class="sidebar-related-thumb" aria-hidden="true">&#10022;</div>
              <span class="sidebar-related-title">${esc(r.title)}</span>
            </a>`).join('\n')}
          </div>
        </div>
      </aside>

    </div><!-- /post-layout -->

    <nav class="post-nav" aria-label="Article navigation">
${prev ? `      <a href="${prev.path}" class="post-nav-item prev">
        <span class="post-nav-direction">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Previous Article
        </span>
        <span class="post-nav-title">${esc(prev.title)}</span>
      </a>` : '<span></span>'}
${next ? `      <a href="${next.path}" class="post-nav-item next">
        <span class="post-nav-direction">
          Next Article
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </span>
        <span class="post-nav-title">${esc(next.title)}</span>
      </a>` : '<span></span>'}
    </nav>

  </main>
` + footer();
}

/* ─────────────────────────── card + listing ─────────────────────────── */

function card(p, delay = 1) {
  return `        <article class="blog-card reveal reveal-delay-${delay}">
          <a href="${p.path}" class="blog-card-link">
            <div class="blog-card-image">
              <div class="blog-card-image-placeholder"><span class="blog-card-image-icon">&#10022;</span></div>
              <span class="blog-card-category-badge">${esc(catName(p.category))}</span>
            </div>
            <div class="blog-card-body">
              <p class="blog-card-meta">
                <span class="blog-card-category">${esc(catName(p.category))}</span>
                <span class="dot">&middot;</span>
                <time datetime="${p.date}">${fmtDateShort(p.date)}</time>
              </p>
              <h3 class="blog-card-title">${esc(p.title)}</h3>
              <p class="blog-card-excerpt">${esc(p.excerpt)}</p>
              <div class="blog-card-footer">
                <div class="blog-card-author">
                  <div class="blog-card-avatar">${esc(author(p.author).initials)}</div>
                  <span class="blog-card-author-name">${esc(author(p.author).name)}</span>
                </div>
                <span class="blog-card-arrow">Read
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </span>
              </div>
            </div>
          </a>
        </article>`;
}

function filterNav(activeSlug) {
  const items = [`        <a href="/blog" class="blog-filter-btn${!activeSlug ? ' active' : ''}">All Articles</a>`]
    .concat(Object.keys(categories).map(s =>
      `        <a href="/blog/category/${s}" class="blog-filter-btn${activeSlug === s ? ' active' : ''}">${esc(catName(s))}</a>`));
  return `      <nav class="blog-filter" aria-label="Filter by category">
${items.join('\n')}
      </nav>`;
}

function renderIndex(posts) {
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
  <main>

    <section class="blog-hero">
      <div class="container">
        <p class="blog-hero-eyebrow">Est. MMXXVI &mdash; Atelier</p>
        <h1 class="blog-hero-title">The Equestrian Journal</h1>
        <p class="blog-hero-subtitle">
          Stories from the saddle and the atelier — gift guides for horse lovers,
          equestrian life, craft heritage, and the art of enduring luxury.
        </p>
      </div>
    </section>

    <div class="container">
${filterNav(null)}
    </div>

    <section class="blog-featured container reveal" aria-label="Featured article">
      <a href="${featured.path}" class="blog-featured-card">
        <div class="blog-featured-image">
          <div class="blog-featured-image-placeholder">
            <span class="blog-image-icon">&#10022;</span>
            <span class="blog-image-label">${esc(featured.title)}</span>
          </div>
          <span class="blog-featured-tag">Featured</span>
        </div>
        <div class="blog-featured-body">
          <p class="blog-featured-meta">
            <span>${esc(catName(featured.category))}</span>
            <span class="dot">&middot;</span>
            <time datetime="${featured.date}">${fmtDate(featured.date)}</time>
            <span class="dot">&middot;</span>
            <span>${featured.readingTime} min read</span>
          </p>
          <h2 class="blog-featured-title">${esc(featured.title)}</h2>
          <p class="blog-featured-excerpt">${esc(featured.excerpt)}</p>
          <div class="blog-featured-author">
            <div class="blog-featured-avatar">${esc(a.initials)}</div>
            <div class="blog-featured-author-info">
              <span class="blog-featured-author-name">${esc(a.name)}</span>
              <span class="blog-featured-author-role">${esc(a.role)}</span>
            </div>
          </div>
          <span class="blog-featured-read">Read Article
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </span>
        </div>
      </a>
    </section>

    <section class="blog-grid-section container">
      <div class="blog-grid-header reveal">
        <div>
          <div class="section-label left">From The Atelier</div>
          <h2 class="section-heading">Recent Articles</h2>
        </div>
      </div>
      <div class="blog-grid">
${rest.map((p, i) => card(p, (i % 3) + 1)).join('\n')}
      </div>
    </section>

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
  <main>

    <section class="blog-hero">
      <div class="container">
        <p class="blog-hero-eyebrow">The Equestrian Journal</p>
        <h1 class="blog-hero-title">${esc(name)}</h1>
        <p class="blog-hero-subtitle">Every ${esc(name)} story from the Velvet &amp; Valor atelier.</p>
      </div>
    </section>

    <div class="container">
${filterNav(slug)}
    </div>

    <section class="blog-grid-section container">
      <div class="blog-grid">
${posts.map((p, i) => card(p, (i % 3) + 1)).join('\n')}
      </div>
    </section>

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
    }] }) + `
  <main>

    <section class="blog-hero">
      <div class="container">
        <p class="blog-hero-eyebrow">Author</p>
        <h1 class="blog-hero-title">${esc(a.name)}</h1>
        <p class="blog-hero-subtitle">${esc(a.role)} &mdash; ${esc(a.bio)}</p>
      </div>
    </section>

    <section class="blog-grid-section container">
      <div class="blog-grid">
${posts.map((p, i) => card(p, (i % 3) + 1)).join('\n')}
      </div>
    </section>

  </main>
` + footer();
}

/* ─────────────────────────── sitemap + rss ─────────────────────────── */

function buildSitemap(posts, today) {
  const urls = [];
  const add = (loc, lastmod, changefreq, priority) =>
    urls.push(`  <url>\n    <loc>${BASE}${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`);

  corePages.forEach(p => add(p.loc, today, p.changefreq, p.priority));
  add('/blog', today, 'weekly', '0.7');
  Object.keys(categories).forEach(s => add(`/blog/category/${s}`, today, 'weekly', '0.5'));
  Object.keys(authors).forEach(s => add(`/blog/author/${s}`, today, 'monthly', '0.4'));
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
