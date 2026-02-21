/* ============================================================
   VELVET & VALOR — Homepage JavaScript
   Marquee pause, parallax accents
   ============================================================ */

'use strict';

/* ── Marquee Pause on Hover ─────────────────────────────────── */
(function initMarquee() {
  const track = document.querySelector('.marquee-track');
  const marquee = document.querySelector('.marquee');
  if (!track || !marquee) return;

  marquee.addEventListener('mouseenter', () => {
    track.style.animationPlayState = 'paused';
  });
  marquee.addEventListener('mouseleave', () => {
    track.style.animationPlayState = 'running';
  });
})();


/* ── Hero Parallax (subtle) ─────────────────────────────────── */
(function initHeroParallax() {
  const heroRight = document.querySelector('.hero-right');
  const phoneWrap = document.querySelector('.phone-wrap');
  if (!heroRight || !phoneWrap) return;

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        if (scrollY < window.innerHeight) {
          phoneWrap.style.transform = `translateY(${scrollY * 0.06}px)`;
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();


/* ── Collection Card — subtle pointer tracking glow ─────────── */
(function initCardGlow() {
  const cards = document.querySelectorAll('.collection-card');
  if (!cards.length) return;

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mx', x + '%');
      card.style.setProperty('--my', y + '%');
    });
  });
})();


/* ── Process Step stagger on scroll ─────────────────────────── */
(function initProcessStagger() {
  const steps = document.querySelectorAll('.process-step');
  if (!steps.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  steps.forEach(step => observer.observe(step));
})();


/* ── Scroll progress indicator (thin gold line top) ─────────── */
(function initScrollProgress() {
  const bar = document.createElement('div');
  bar.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    height: 2px;
    background: linear-gradient(90deg, #C8A84B, #DDB85E);
    z-index: 99999;
    width: 0%;
    transition: width 0.1s linear;
    pointer-events: none;
  `;
  document.body.appendChild(bar);

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = pct + '%';
  }, { passive: true });
})();
