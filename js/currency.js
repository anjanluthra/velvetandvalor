/**
 * Velvet & Valor — Currency Toggle
 * Display-only: charges still occur in USD at Stripe checkout.
 *
 * - Geo-detects user country (ipapi.co), maps to currency.
 * - Fetches USD rates (open.er-api.com), caches 12h in localStorage.
 * - Reads any element with [data-price-usd="48.00"] and rewrites text in selected currency.
 * - Persists user choice in localStorage.
 */
(function () {
  'use strict';

  const CURRENCIES = [
    { code: 'USD', symbol: '$',  flag: '🇺🇸', name: 'US Dollar' },
    { code: 'GBP', symbol: '£',  flag: '🇬🇧', name: 'British Pound' },
    { code: 'EUR', symbol: '€',  flag: '🇪🇺', name: 'Euro' },
    { code: 'CAD', symbol: 'C$', flag: '🇨🇦', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', flag: '🇦🇺', name: 'Australian Dollar' },
    { code: 'NZD', symbol: 'NZ$',flag: '🇳🇿', name: 'NZ Dollar' },
    { code: 'AED', symbol: 'AED',flag: '🇦🇪', name: 'UAE Dirham' },
    { code: 'SAR', symbol: 'SAR',flag: '🇸🇦', name: 'Saudi Riyal' },
    { code: 'INR', symbol: '₹',  flag: '🇮🇳', name: 'Indian Rupee' },
    { code: 'SGD', symbol: 'S$', flag: '🇸🇬', name: 'Singapore Dollar' },
    { code: 'HKD', symbol: 'HK$',flag: '🇭🇰', name: 'Hong Kong Dollar' },
    { code: 'JPY', symbol: '¥',  flag: '🇯🇵', name: 'Japanese Yen' },
    { code: 'CHF', symbol: 'CHF',flag: '🇨🇭', name: 'Swiss Franc' },
    { code: 'SEK', symbol: 'kr', flag: '🇸🇪', name: 'Swedish Krona' },
    { code: 'NOK', symbol: 'kr', flag: '🇳🇴', name: 'Norwegian Krone' },
    { code: 'DKK', symbol: 'kr', flag: '🇩🇰', name: 'Danish Krone' },
    { code: 'ZAR', symbol: 'R',  flag: '🇿🇦', name: 'South African Rand' },
    { code: 'BRL', symbol: 'R$', flag: '🇧🇷', name: 'Brazilian Real' },
    { code: 'MXN', symbol: 'MX$',flag: '🇲🇽', name: 'Mexican Peso' },
  ];

  const COUNTRY_TO_CURRENCY = {
    // English-speaking
    US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD', IE: 'EUR',
    // Eurozone + other EU
    DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR',
    AT: 'EUR', PT: 'EUR', GR: 'EUR', FI: 'EUR', LU: 'EUR', MT: 'EUR',
    CY: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', SK: 'EUR', SI: 'EUR',
    PL: 'EUR', CZ: 'EUR', HU: 'EUR', RO: 'EUR', BG: 'EUR', HR: 'EUR',
    // Middle East (Kate's market — UAE base)
    AE: 'AED', SA: 'SAR', QA: 'AED', KW: 'AED', BH: 'AED', OM: 'AED',
    JO: 'AED', LB: 'AED', IL: 'USD',
    // Asia-Pacific
    IN: 'INR', SG: 'SGD', HK: 'HKD', JP: 'JPY', KR: 'USD', MY: 'USD',
    TH: 'USD', PH: 'USD', ID: 'USD', VN: 'USD', TW: 'USD', CN: 'USD',
    // Europe (non-EUR)
    CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', IS: 'EUR',
    // Africa
    ZA: 'ZAR', NG: 'USD', EG: 'USD', MA: 'EUR', KE: 'USD',
    // Latin America
    BR: 'BRL', MX: 'MXN', AR: 'USD', CL: 'USD', CO: 'USD', PE: 'USD',
  };

  const STORAGE_KEY    = 'vv_currency';
  const RATES_KEY      = 'vv_rates_v1';
  const RATES_TTL_MS   = 12 * 60 * 60 * 1000; // 12 hours
  const RATES_ENDPOINT = 'https://open.er-api.com/v6/latest/USD';
  const GEO_ENDPOINT   = 'https://ipapi.co/json/';

  const FALLBACK_RATES = {
    USD: 1, GBP: 0.79, EUR: 0.92, CAD: 1.37, AUD: 1.51, NZD: 1.65, AED: 3.67,
    SAR: 3.75, INR: 83.5, SGD: 1.34, HKD: 7.82, JPY: 155, CHF: 0.90, SEK: 10.5,
    NOK: 10.8, DKK: 6.88, ZAR: 18.5, BRL: 5.10, MXN: 17.0,
  };

  function getCurrency(code) {
    return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
  }

  function loadRates() {
    try {
      const cached = JSON.parse(localStorage.getItem(RATES_KEY) || 'null');
      if (cached && (Date.now() - cached.timestamp < RATES_TTL_MS) && cached.rates) {
        return Promise.resolve(cached.rates);
      }
    } catch (e) { /* ignore */ }
    return fetch(RATES_ENDPOINT)
      .then(r => r.json())
      .then(data => {
        if (data && data.rates) {
          try {
            localStorage.setItem(RATES_KEY, JSON.stringify({
              timestamp: Date.now(), rates: data.rates,
            }));
          } catch (e) { /* ignore */ }
          return data.rates;
        }
        return FALLBACK_RATES;
      })
      .catch(() => FALLBACK_RATES);
  }

  function detectCountry() {
    const cached = sessionStorage.getItem('vv_country');
    if (cached) return Promise.resolve(cached);
    return fetch(GEO_ENDPOINT)
      .then(r => r.json())
      .then(data => {
        const cc = (data && data.country_code) || '';
        if (cc) sessionStorage.setItem('vv_country', cc);
        return cc;
      })
      .catch(() => '');
  }

  function formatPrice(usdAmount, rates, currencyCode) {
    const cur  = getCurrency(currencyCode);
    const rate = rates[currencyCode] || FALLBACK_RATES[currencyCode] || 1;
    let converted = usdAmount * rate;
    // No decimals for JPY, INR display rounds nicely
    if (currencyCode === 'JPY') {
      converted = Math.round(converted);
      return `${cur.symbol}${converted.toLocaleString()}`;
    }
    return `${cur.symbol}${converted.toFixed(2)}`;
  }

  function applyPrices(rates, currencyCode) {
    const els = document.querySelectorAll('[data-price-usd]');
    els.forEach(el => {
      const usd = parseFloat(el.getAttribute('data-price-usd'));
      if (isNaN(usd)) return;
      const prefix = el.getAttribute('data-price-prefix') || '';
      const suffix = el.getAttribute('data-price-suffix') || '';
      // Currency-specific override: if data-price-<lowercase-code> is set,
      // display that exact value instead of converting from USD.
      // (Lets us lock round GBP numbers like £58/£5 regardless of FX rate.)
      const overrideAttr = 'data-price-' + currencyCode.toLowerCase();
      if (el.hasAttribute(overrideAttr)) {
        const overrideVal = parseFloat(el.getAttribute(overrideAttr));
        if (!isNaN(overrideVal)) {
          const cur = getCurrency(currencyCode);
          let display;
          if (currencyCode === 'JPY') {
            display = `${cur.symbol}${Math.round(overrideVal).toLocaleString()}`;
          } else {
            display = `${cur.symbol}${overrideVal.toFixed(2)}`;
          }
          el.textContent = prefix + display + suffix;
          return;
        }
      }
      el.textContent = prefix + formatPrice(usd, rates, currencyCode) + suffix;
    });
    // Notice on checkout buttons: charged in USD
    const note = document.querySelector('[data-currency-note]');
    if (note) {
      note.textContent = currencyCode === 'USD'
        ? ''
        : `Prices shown in ${currencyCode}. Charged in USD at checkout.`;
    }
  }

  function buildToggle(currentCode) {
    const wrap = document.createElement('div');
    wrap.className = 'currency-toggle';
    wrap.innerHTML = `
      <label class="currency-toggle-label" for="vvCurrencySelect" aria-label="Select currency">
        <span class="currency-toggle-flag" aria-hidden="true">${getCurrency(currentCode).flag}</span>
        <select id="vvCurrencySelect" class="currency-toggle-select" aria-label="Currency">
          ${CURRENCIES.map(c =>
            `<option value="${c.code}"${c.code === currentCode ? ' selected' : ''}>${c.code}</option>`
          ).join('')}
        </select>
        <span class="currency-toggle-chevron" aria-hidden="true">▾</span>
      </label>
    `;
    return wrap;
  }

  function mountToggle(currentCode, onChange) {
    // Prefer custom slot if provided, else inject into top-banner
    let slot = document.querySelector('[data-currency-slot]');
    if (!slot) {
      const banner = document.querySelector('.top-banner-inner');
      if (!banner) return;
      slot = document.createElement('span');
      slot.className = 'top-banner-item top-banner-currency';
      slot.setAttribute('data-currency-slot', '');
      banner.appendChild(slot);
    }
    slot.innerHTML = '';
    const toggle = buildToggle(currentCode);
    slot.appendChild(toggle);
    const select = toggle.querySelector('select');
    const flag   = toggle.querySelector('.currency-toggle-flag');
    select.addEventListener('change', () => {
      const code = select.value;
      flag.textContent = getCurrency(code).flag;
      try { localStorage.setItem(STORAGE_KEY, code); } catch (e) { /* ignore */ }
      onChange(code);
    });
  }

  function init() {
    // 1. If user previously chose a currency on this device, honour it.
    // 2. Otherwise, detect their country via ipapi.co and map to the local
    //    currency (e.g. GB → GBP, IE → EUR, AE → AED, US → USD).
    // 3. Fall back to USD if detection fails.
    let saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}

    const codePromise = saved
      ? Promise.resolve(saved)
      : detectCountry().then(cc => COUNTRY_TO_CURRENCY[cc] || 'USD');

    Promise.all([loadRates(), codePromise]).then(([rates, code]) => {
      mountToggle(code, (newCode) => applyPrices(rates, newCode));
      applyPrices(rates, code);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
