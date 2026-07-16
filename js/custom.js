/* ============================================================
   VELVET & VALOR — Custom Portrait Page Logic
   Photo upload → Vercel Blob → Stripe Checkout
   ============================================================ */
'use strict';

(function () {
  const form = document.getElementById('customForm');
  if (!form) return;

  const submitBtn = document.getElementById('customSubmit');
  const errorEl = document.getElementById('customFormError');
  const confirmBox = document.getElementById('cf-confirm');

  // Track uploaded photo URL
  const photos = { 1: '' };

  /* ── Image compression ─────────────────────────────────────
     Vercel serverless functions reject bodies > 4.5 MB. iPhone
     photos are routinely 5–12 MB, so we resize anything large
     to maxSide on its longest edge and re-encode as JPEG. */
  function compressImage(file, maxSide, quality) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const w0 = img.naturalWidth || img.width;
          const h0 = img.naturalHeight || img.height;
          if (!w0 || !h0) { URL.revokeObjectURL(url); return resolve(null); }
          const scale = Math.min(1, maxSide / Math.max(w0, h0));
          const w = Math.round(w0 * scale);
          const h = Math.round(h0 * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          // Fill white in case original is transparent (avoid black PNG bg)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (!blob) return resolve(null);
            // If the "compressed" version is somehow bigger than the original
            // AND the original is already under the Vercel limit, keep original.
            if (blob.size > file.size && file.size < 4 * 1024 * 1024) {
              return resolve(null);
            }
            resolve(blob);
          }, 'image/jpeg', quality);
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        // HEIC won't decode in most non-Safari browsers — let original through
        resolve(null);
      };
      img.src = url;
    });
  }

  /* ── Photo Upload ──────────────────────────────────────── */
  function setupSlot(slotNumber) {
    const slot = document.getElementById('photoSlot' + slotNumber);
    const input = document.getElementById('photoInput' + slotNumber);
    const empty = document.getElementById('photoSlot' + slotNumber + 'Empty');
    const preview = document.getElementById('photoSlot' + slotNumber + 'Preview');
    const previewImg = document.getElementById('photoSlot' + slotNumber + 'Img');
    const progress = document.getElementById('photoSlot' + slotNumber + 'Progress');
    const progressBar = progress.querySelector('.photo-progress-bar');
    const progressText = progress.querySelector('.photo-progress-text');
    const removeBtn = document.querySelector(`.photo-remove[data-slot="${slotNumber}"]`);

    function clickToOpen(e) {
      if (e && e.target && e.target.closest('.photo-remove')) return;
      input.click();
    }
    empty.addEventListener('click', clickToOpen);
    slot.addEventListener('click', (e) => {
      if (preview.hidden) return; // empty handles its own
      // already has preview — ignore unless remove
    });

    // Drag & drop
    ['dragenter', 'dragover'].forEach(evt => {
      slot.addEventListener(evt, (e) => {
        e.preventDefault();
        slot.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(evt => {
      slot.addEventListener(evt, (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');
      });
    });
    slot.addEventListener('drop', (e) => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleFile(file);
    });

    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (file) handleFile(file);
    });

    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      photos[slotNumber] = '';
      input.value = '';
      previewImg.src = '';
      preview.hidden = true;
      empty.hidden = false;
      updateSubmitState();
    });

    async function handleFile(file) {
      hideError();

      if (!file.type.startsWith('image/')) {
        showError('Please upload an image file (JPG, PNG, HEIC).');
        return;
      }
      // Generous client cap — actual size limit is Vercel's 4.5 MB body limit,
      // which is handled below by automatic resize/recompress.
      if (file.size > 25 * 1024 * 1024) {
        showError('That photo is over 25MB. Please choose a smaller version.');
        return;
      }

      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        empty.hidden = true;
        preview.hidden = false;
      };
      reader.readAsDataURL(file);

      // Upload to /api/upload-photo
      progress.hidden = false;
      progressBar.style.width = '15%';
      progressText.textContent = 'Preparing photo…';

      // Compress large photos so we don't hit Vercel's 4.5MB function body limit.
      // Most iPhone photos are 5-12MB; this brings them to ~1-2MB while keeping
      // 2400px on the longest side (more than enough for the artist).
      let uploadBlob = file;
      let uploadFilename = file.name || `horse-${Date.now()}.jpg`;
      let uploadContentType = file.type || 'image/jpeg';
      try {
        if (file.size > 3.5 * 1024 * 1024 || /\.heic$/i.test(file.name || '')) {
          const compressed = await compressImage(file, 2400, 0.85);
          if (compressed) {
            uploadBlob = compressed;
            // Always store as JPEG after canvas re-encode
            uploadFilename = uploadFilename.replace(/\.[^.]+$/, '') + '.jpg';
            uploadContentType = 'image/jpeg';
          }
        }
      } catch (e) {
        // If compression fails, try the original (will likely 413, then we show error)
        if (window.console) console.warn('Compression skipped:', e);
      }

      progressBar.style.width = '40%';
      progressText.textContent = 'Uploading…';

      try {
        const res = await fetch('/api/upload-photo', {
          method: 'POST',
          headers: {
            'Content-Type': uploadContentType,
            'x-filename': uploadFilename,
          },
          body: uploadBlob,
        });

        progressBar.style.width = '80%';

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Upload failed');
        }

        const data = await res.json();
        if (!data.url) throw new Error('No URL returned');

        photos[slotNumber] = data.url;
        progressBar.style.width = '100%';
        progressText.textContent = '✓ Uploaded';
        setTimeout(() => { progress.hidden = true; }, 800);
        updateSubmitState();
      } catch (err) {
        console.error('Upload error:', err);
        showError(`Upload failed: ${err.message}. Please try again.`);
        photos[slotNumber] = '';
        progress.hidden = true;
        previewImg.src = '';
        preview.hidden = true;
        empty.hidden = false;
        input.value = '';
        updateSubmitState();
      }
    }
  }

  setupSlot(1);
  setupSlot(2);

  /* ── Shared close-up lightbox (swatches + quote preview) ─ */
  // Build once at outer scope so both the swatch zoom triggers
  // AND the Custom Quote preview thumbnail can open it.
  let openLightbox = function () {}; // no-op default in case build fails
  (function buildLightbox() {
    const lightbox = document.createElement('div');
    lightbox.className = 'swatch-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Case close-up');
    lightbox.innerHTML = `
      <div class="swatch-lightbox-stage">
        <button type="button" class="swatch-lightbox-close" aria-label="Close close-up view">&times;</button>
        <img class="swatch-lightbox-img" alt="" />
        <div class="swatch-lightbox-label"></div>
      </div>
    `;
    document.body.appendChild(lightbox);
    const lbImg = lightbox.querySelector('.swatch-lightbox-img');
    const lbLabel = lightbox.querySelector('.swatch-lightbox-label');
    const lbClose = lightbox.querySelector('.swatch-lightbox-close');
    const lbStage = lightbox.querySelector('.swatch-lightbox-stage');

    openLightbox = function (src, alt, label) {
      lbImg.src = src;
      lbImg.alt = alt || '';
      lbLabel.textContent = label || '';
      lightbox.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    };
    function closeLightbox() {
      lightbox.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    lbClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (!lbStage.contains(e.target)) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
    });
  })();

  /* ── Colour swatch picker ──────────────────────────────── */
  const colourCards = document.querySelectorAll('.colour-swatch-card');
  const colourInput = document.getElementById('cf-colour');
  colourCards.forEach(card => {
    card.addEventListener('click', (e) => {
      // Ignore clicks on the zoom trigger — let it handle them
      if (e.target.closest('.swatch-zoom-trigger')) return;
      colourCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      colourInput.value = card.dataset.colour;
      // Trigger validation / submit-state refresh
      colourInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  /* ── Inject zoom triggers into each swatch ─────────────── */
  if (colourCards.length) {
    const ZOOM_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="20.5" y1="20.5" x2="16.5" y2="16.5"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
    colourCards.forEach(card => {
      const trigger = document.createElement('span');
      trigger.className = 'swatch-zoom-trigger';
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('tabindex', '0');
      trigger.setAttribute('aria-label', `Close-up of ${card.dataset.colour || 'this colour'}`);
      trigger.innerHTML = ZOOM_SVG;
      card.appendChild(trigger);

      const fire = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const img = card.querySelector('.colour-swatch-img img');
        if (!img) return;
        openLightbox(img.currentSrc || img.src, img.alt, card.dataset.colour || '');
      };
      trigger.addEventListener('click', fire);
      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') fire(e);
      });
    });
  }

  /* ── Add-ons (Initials + Custom Quote) ─────────────────── */
  const initialsToggle = document.getElementById('cf-add-initials');
  const initialsWrap = document.getElementById('initialsInputWrap');
  const initialsInput = document.getElementById('cf-initials');

  const quoteToggle = document.getElementById('cf-add-quote');
  const quoteWrap = document.getElementById('quoteInputWrap');
  const quoteInput = document.getElementById('cf-quote');

  const furryToggle = document.getElementById('cf-add-furry');
  const furryWrap = document.getElementById('furryInputWrap');

  const submitPriceEl = document.getElementById('customSubmitPrice');

  const BASE_PRICE = 73;
  const ADDON_PRICE = 6; // initials + quote each cost the same
  const FURRY_PRICE = 32; // furry-friend portrait add-on

  function updatePriceDisplay() {
    if (!submitPriceEl) return;
    let total = BASE_PRICE;
    if (initialsToggle && initialsToggle.checked) total += ADDON_PRICE;
    if (quoteToggle && quoteToggle.checked) total += ADDON_PRICE;
    if (furryToggle && furryToggle.checked) total += FURRY_PRICE;
    submitPriceEl.setAttribute('data-price-usd', total.toFixed(2));
    submitPriceEl.textContent = `— $${total.toFixed(2)}`;
    // If currency toggle has selected a non-USD currency, re-trigger via change event
    const sel = document.getElementById('vvCurrencySelect');
    if (sel) sel.dispatchEvent(new Event('change'));
  }

  if (initialsToggle && initialsWrap && initialsInput) {
    initialsToggle.addEventListener('change', () => {
      initialsWrap.hidden = !initialsToggle.checked;
      if (!initialsToggle.checked) initialsInput.value = '';
      updatePriceDisplay();
    });
    initialsInput.addEventListener('input', () => {
      initialsInput.value = initialsInput.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    });
  }

  if (quoteToggle && quoteWrap && quoteInput) {
    quoteToggle.addEventListener('change', () => {
      quoteWrap.hidden = !quoteToggle.checked;
      if (!quoteToggle.checked) quoteInput.value = '';
      updatePriceDisplay();
    });
  }

  if (furryToggle && furryWrap) {
    furryToggle.addEventListener('change', () => {
      furryWrap.hidden = !furryToggle.checked;
      if (!furryToggle.checked) {
        // Clear the uploaded dog photo when the add-on is unticked
        if (window.photos) window.photos[2] = '';
        photos[2] = '';
        const previewImg = document.getElementById('photoSlot2Img');
        const preview = document.getElementById('photoSlot2Preview');
        const empty = document.getElementById('photoSlot2Empty');
        const input = document.getElementById('photoInput2');
        if (preview) preview.hidden = true;
        if (empty) empty.hidden = false;
        if (previewImg) previewImg.src = '';
        if (input) input.value = '';
      }
      updatePriceDisplay();
    });
  }

  /* ── Quote preview: magnifier on desktop + tap-to-zoom on mobile ──
     Desktop (mouse): 3x scale follows the cursor via transform-origin.
     Mobile / touch:  tap opens the shared swatch lightbox so the
                      handwritten quote can be inspected full-screen.
     Either path: stopPropagation/preventDefault stops the click from
     bubbling to the surrounding <label> and toggling the Add-Quote
     checkbox by accident. */
  const quotePreview = document.querySelector('.quote-preview');
  if (quotePreview) {
    const quotePreviewImg = quotePreview.querySelector('img');

    // Desktop magnifier (cursor-tracking 3x zoom via CSS hover)
    if (quotePreviewImg) {
      quotePreview.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const rect = quotePreview.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        quotePreviewImg.style.transformOrigin = `${x}% ${y}%`;
      });
      quotePreview.addEventListener('pointerleave', () => {
        quotePreviewImg.style.transformOrigin = '50% 35%';
      });
    }

    // Tap / click / keyboard activation — open the full-screen lightbox
    const openQuoteLightbox = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!quotePreviewImg) return;
      openLightbox(
        quotePreviewImg.currentSrc || quotePreviewImg.src,
        quotePreviewImg.alt || 'Handwritten quote on a custom Velvet & Valor case',
        'Handwritten Quote'
      );
    };
    quotePreview.addEventListener('click', openQuoteLightbox);
    quotePreview.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') openQuoteLightbox(e);
    });
  }

  /* ── Form validation / enable submit ───────────────────── */
  function isFormValid() {
    if (!photos[1]) return false; // photo 1 required
    // If furry-friend add-on is on, require a dog photo
    if (furryToggle && furryToggle.checked && !photos[2]) return false;
    if (!form.name.value.trim()) return false;
    if (!form.email.value.trim()) return false;
    if (!form.case_colour.value) return false;
    if (!form.iphone_model.value) return false;
    if (!confirmBox.checked) return false;
    return true;
  }

  function updateSubmitState() {
    submitBtn.disabled = !isFormValid();
  }

  form.addEventListener('input', updateSubmitState);
  form.addEventListener('change', updateSubmitState);

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }
  function hideError() {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }

  /* ── Submit → on-domain /checkout with embedded Payment Element ─── */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isFormValid()) return;

    submitBtn.disabled = true;
    const textEl = submitBtn.querySelector('.custom-submit-text');
    textEl.textContent = 'Opening checkout…';

    const cart = {
      is_custom: true,
      collection: 'Noble Steed — Custom Horse Portrait',
      collectionId: 'custom',
      design: 'Custom Horse Portrait',
      finish: form.finish.value,
      // Custom-portrait fields (server validates + creates line items)
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      horse_name: form.horse_name.value.trim(),
      case_colour: form.case_colour.value,
      iphone_model: form.iphone_model.value,
      model: form.iphone_model.value,
      notes: form.notes.value.trim(),
      photo_url_1: photos[1],
      image: photos[1] || '',
      add_initials: !!(initialsToggle && initialsToggle.checked && initialsInput && initialsInput.value.trim()),
      initials: initialsInput ? initialsInput.value.trim() : '',
      add_quote: !!(quoteToggle && quoteToggle.checked && quoteInput && quoteInput.value.trim()),
      custom_quote: quoteInput ? quoteInput.value.trim() : '',
      add_furry_friend: !!(furryToggle && furryToggle.checked && photos[2]),
      furry_friend_photo_url: photos[2] || '',
      unit_amount_cents: 7300,
    };

    try {
      sessionStorage.setItem('vvCheckoutCart', JSON.stringify(cart));
    } catch (err) {
      showError('Your browser blocked storing checkout data. Please enable session storage and try again.');
      textEl.textContent = 'Continue to Payment';
      submitBtn.disabled = false;
      return;
    }

    // Route to embedded checkout on our own domain (Stripe Payment
    // Element mounts there — no redirect to checkout.stripe.com).
    window.location.href = '/checkout';
  });

  // Initial state
  updateSubmitState();
})();
