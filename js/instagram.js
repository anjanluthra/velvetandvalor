/**
 * Velvet & Valor — Live Instagram Feed Renderer
 *
 * Fetches /api/instagram-feed on page load and replaces the static tiles
 * in .ig-grid with the latest 6 posts from @velvetvalorstore.
 *
 * If the API isn't configured yet (no token), the static tiles remain — so
 * the page never looks broken while the integration is being set up.
 */
(function () {
  'use strict';

  const grid = document.querySelector('.ig-grid');
  if (!grid) return;

  fetch('/api/instagram-feed')
    .then(r => {
      if (!r.ok) throw new Error('Feed not configured yet');
      return r.json();
    })
    .then(data => {
      const items = (data && data.items) || [];
      if (!items.length) return; // keep static fallback tiles

      // Take first 6 — match the grid size
      const top = items.slice(0, 6);
      grid.innerHTML = top.map((item, i) => {
        const safeCaption = (item.caption || 'View on Instagram')
          .replace(/"/g, '&quot;')
          .slice(0, 120);
        const delay = i > 0 ? ` reveal-delay-${Math.min(i, 5)}` : '';
        return `
          <a class="ig-tile reveal${delay}"
             href="${item.permalink}"
             target="_blank"
             rel="noopener"
             aria-label="${safeCaption}">
            <img src="${item.media_url}" alt="${safeCaption}" loading="lazy" />
            <span class="ig-tile-overlay" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor"/>
              </svg>
            </span>
          </a>`;
      }).join('');
    })
    .catch(err => {
      // Silent fall-back: leave the existing static tiles in place
      // (e.g. when IG_ACCESS_TOKEN isn't yet set on Vercel)
      if (window.console) console.info('[V&V] Instagram feed using static fallback:', err.message);
    });
})();
