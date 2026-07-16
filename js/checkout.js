/* ============================================================
   VELVET & VALOR — On-Domain Embedded Checkout
   Stripe Payment Element (card + Apple Pay + Google Pay + Link)
   Fixes the Instagram in-app browser problem: payment happens on
   velvet-valor.com, never redirects to checkout.stripe.com.
   ============================================================ */
'use strict';

(function () {
  const form = document.getElementById('checkoutForm');
  const submitBtn = document.getElementById('checkoutSubmit');
  const submitPriceEl = document.getElementById('checkoutSubmitPrice');
  const errorEl = document.getElementById('checkoutError');
  const emailInput = document.getElementById('checkoutEmail');

  if (!form) return;

  /* ── 1. Read cart from sessionStorage ──────────────────────
     Buy Now handlers put the cart payload here right before
     redirecting to /checkout. Falls back to querystring for
     shareable/refreshable test links. */
  function loadCart() {
    try {
      const raw = sessionStorage.getItem('vvCheckoutCart');
      if (raw) return JSON.parse(raw);
    } catch (e) { /* private mode */ }
    // Fallback: build a minimal cart from URL for direct-link testing
    const q = new URLSearchParams(window.location.search);
    if (q.get('collection') || q.get('design')) {
      return {
        collection: q.get('collection') || 'Noble Steed',
        collectionId: q.get('collectionId') || 'noble-steed',
        design: q.get('design') || '',
        model: q.get('model') || 'iPhone 17',
        finish: q.get('finish') || 'Glossy',
        unit_amount_cents: parseInt(q.get('unit_amount_cents') || '4800', 10),
        image: q.get('image') || '',
      };
    }
    return null;
  }

  const cart = loadCart();

  if (!cart) {
    showFatalError(
      'No item to check out.',
      'Head back to the shop and tap Buy Now on the case you want.'
    );
    return;
  }

  /* ── 2. Render the order summary from the cart ─────────── */
  const fmt = (cents, currency) => {
    try {
      return new Intl.NumberFormat(navigator.language || 'en-US', {
        style: 'currency',
        currency: (currency || 'USD').toUpperCase(),
      }).format(cents / 100);
    } catch (e) {
      return '$' + (cents / 100).toFixed(2);
    }
  };

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  function showLine(id) {
    const el = document.getElementById(id);
    if (el) el.hidden = false;
  }

  // Order summary from cart
  const summaryImg = document.getElementById('summaryImage');
  if (cart.image && summaryImg) {
    summaryImg.src = cart.image;
    summaryImg.alt = (cart.collection || '') + ' — ' + (cart.design || '');
  } else if (summaryImg) {
    summaryImg.style.display = 'none';
  }
  setText('summaryCollection', cart.collection || 'Velvet & Valor');
  setText('summaryDesign', cart.design || '');
  setText('summaryModel', cart.iphone_model || cart.model || '');

  const baseCents = cart.is_custom ? 7300 : (cart.unit_amount_cents || 4800);
  setText('summaryUnitPrice', fmt(baseCents));

  if (cart.is_custom) {
    if (cart.add_initials && cart.initials) {
      showLine('summaryAddonInitials');
    }
    if (cart.add_quote && cart.custom_quote) {
      showLine('summaryAddonQuote');
    }
    if (cart.add_furry_friend && cart.furry_friend_photo_url) {
      showLine('summaryAddonFurry');
    }
  }

  // Pre-fill email if we already have it from the custom-portrait form
  if (cart.email && emailInput) emailInput.value = cart.email;

  /* ── 3. Load Stripe.js + create the PaymentIntent ──────── */
  let stripe, elements, addressElement, paymentElement;
  let totalCents = 0;

  async function bootstrap() {
    try {
      // Fetch publishable key
      const cfgRes = await fetch('/api/stripe-config');
      if (!cfgRes.ok) throw new Error('Stripe not configured on the server yet — please add STRIPE_PUBLISHABLE_KEY in Vercel.');
      const cfg = await cfgRes.json();
      if (!cfg.publishable_key) throw new Error('Missing Stripe publishable key');
      if (typeof Stripe === 'undefined') throw new Error('Stripe.js failed to load — refresh the page.');
      stripe = Stripe(cfg.publishable_key);

      // Create PaymentIntent from cart
      const piRes = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cart),
      });
      if (!piRes.ok) {
        const errData = await piRes.json().catch(() => ({}));
        throw new Error(errData.error || errData.detail || 'Could not start payment');
      }
      const pi = await piRes.json();
      totalCents = pi.amount;
      // Persist for the success page + browser back
      try {
        sessionStorage.setItem('vvCheckoutPI', pi.payment_intent_id);
      } catch (e) {}

      // Complete the total display
      setText('summaryTotal', fmt(totalCents, pi.currency));
      submitPriceEl.textContent = fmt(totalCents, pi.currency);

      // Mount Stripe Elements
      elements = stripe.elements({
        clientSecret: pi.client_secret,
        appearance: buildAppearance(),
        loader: 'auto',
      });

      addressElement = elements.create('address', {
        mode: 'shipping',
        allowedCountries: [
          'US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'DE', 'FR', 'IT', 'ES',
          'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PT', 'PL',
          'CZ', 'GR', 'HU', 'RO', 'BG', 'HR', 'SK', 'SI', 'LT', 'LV',
          'EE', 'LU', 'MT', 'CY', 'JP', 'KR', 'SG', 'HK', 'AE', 'SA',
          'QA', 'BH', 'KW', 'OM', 'IL', 'ZA', 'MX', 'BR', 'AR', 'CL',
          'CO', 'IN', 'MY', 'TH', 'PH', 'ID', 'VN', 'TW',
        ],
        fields: { phone: 'auto' },
      });
      addressElement.mount('#addressElement');

      paymentElement = elements.create('payment', {
        layout: { type: 'tabs', defaultCollapsed: false },
      });
      paymentElement.mount('#paymentElement');

      paymentElement.on('ready', () => {
        submitBtn.disabled = false;
      });
    } catch (err) {
      console.error('Checkout bootstrap failed:', err);
      showFatalError('Could not open checkout.', err.message || 'Please refresh and try again.');
    }
  }

  /* ── 4. Submit → confirmPayment ────────────────────────── */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    hideError();

    const email = (emailInput.value || '').trim();
    if (!email) {
      showError('Please enter your email address.');
      emailInput.focus();
      return;
    }

    submitBtn.disabled = true;
    const originalLabel = submitBtn.querySelector('.checkout-submit-label').textContent;
    submitBtn.querySelector('.checkout-submit-label').textContent = 'Processing…';

    const piId = (() => {
      try { return sessionStorage.getItem('vvCheckoutPI') || ''; } catch (e) { return ''; }
    })();
    const returnUrl = window.location.origin + '/order-success?payment_intent=' + encodeURIComponent(piId);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        receipt_email: email,
      },
    });

    // Only reached if there's an immediate error. On success Stripe
    // redirects to return_url before this promise resolves.
    if (error) {
      showError(error.message || 'Payment could not be completed.');
      submitBtn.disabled = false;
      submitBtn.querySelector('.checkout-submit-label').textContent = originalLabel;
    }
  });

  /* ── Helpers ───────────────────────────────────────────── */
  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }
  function hideError() {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }
  function showFatalError(title, sub) {
    form.innerHTML =
      '<div class="checkout-fatal">' +
        '<h2>' + title + '</h2>' +
        '<p>' + sub + '</p>' +
        '<a href="/collections/iphone-cases" class="btn-primary" style="justify-content:center; margin-top: 16px; display: inline-flex;">Return to shop</a>' +
      '</div>';
  }

  /* Match the Stripe Elements appearance to V&V's dark navy theme. */
  function buildAppearance() {
    return {
      theme: 'flat',
      variables: {
        colorPrimary: '#1A9090',
        colorBackground: '#0C1E3A',
        colorText: '#FFFFFF',
        colorTextSecondary: 'rgba(255,255,255,0.72)',
        colorTextPlaceholder: 'rgba(255,255,255,0.35)',
        colorDanger: '#D97A73',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSizeBase: '15px',
        spacingUnit: '4px',
        borderRadius: '6px',
      },
      rules: {
        '.Input': {
          backgroundColor: '#071428',
          border: '1px solid rgba(212, 175, 55, 0.22)',
          color: '#FFFFFF',
          padding: '14px 14px',
        },
        '.Input:focus': {
          border: '1px solid #D4AF37',
          boxShadow: '0 0 0 3px rgba(212,175,55,0.15)',
        },
        '.Label': {
          color: '#FFFFFF',
          fontFamily: '"Inter", sans-serif',
          fontSize: '0.6875rem',
          fontWeight: '600',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        },
        '.Tab': {
          backgroundColor: '#071428',
          border: '1px solid rgba(212, 175, 55, 0.22)',
          color: 'rgba(255,255,255,0.75)',
        },
        '.Tab--selected': {
          backgroundColor: 'rgba(212, 175, 55, 0.08)',
          border: '1px solid #D4AF37',
          color: '#FFFFFF',
        },
      },
    };
  }

  // Kick off
  bootstrap();
})();
