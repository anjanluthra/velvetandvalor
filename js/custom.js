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

  /* ── Colour swatch picker ──────────────────────────────── */
  const colourCards = document.querySelectorAll('.colour-swatch-card');
  const colourInput = document.getElementById('cf-colour');
  colourCards.forEach(card => {
    card.addEventListener('click', () => {
      colourCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      colourInput.value = card.dataset.colour;
      // Trigger validation / submit-state refresh
      colourInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  /* ── Initials add-on ───────────────────────────────────── */
  const initialsToggle = document.getElementById('cf-add-initials');
  const initialsWrap = document.getElementById('initialsInputWrap');
  const initialsInput = document.getElementById('cf-initials');
  const submitPriceEl = document.getElementById('customSubmitPrice');

  function updatePriceDisplay() {
    if (!submitPriceEl) return;
    const base = 85;
    const total = base + (initialsToggle && initialsToggle.checked ? 10 : 0);
    // Re-set data attribute so currency toggle re-reads it
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
      // Force uppercase A-Z, max 4 chars
      initialsInput.value = initialsInput.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    });
  }

  /* ── Form validation / enable submit ───────────────────── */
  function isFormValid() {
    if (!photos[1]) return false; // photo 1 required
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

  /* ── Submit → Stripe Checkout ──────────────────────────── */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;

    submitBtn.disabled = true;
    const textEl = submitBtn.querySelector('.custom-submit-text');
    const originalText = textEl.textContent;
    textEl.textContent = 'Processing…';

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      horse_name: form.horse_name.value.trim(),
      case_colour: form.case_colour.value,
      iphone_model: form.iphone_model.value,
      finish: form.finish.value,
      notes: form.notes.value.trim(),
      photo_url_1: photos[1],
      add_initials: !!(initialsToggle && initialsToggle.checked && initialsInput && initialsInput.value.trim()),
      initials: initialsInput ? initialsInput.value.trim() : '',
    };

    try {
      const res = await fetch('/api/create-custom-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.url) {
        if (typeof window.vvGoToCheckout === 'function') {
          window.vvGoToCheckout(data.url);
        } else {
          window.location.href = data.url;
        }
      } else {
        const msg = data.detail ? `${data.error || 'Checkout error'}: ${data.detail}` : (data.error || 'Could not start checkout');
        throw new Error(msg);
      }
    } catch (err) {
      console.error('Custom checkout error:', err);
      showError(`Something went wrong: ${err.message}. Please try again, or email info@velvet-valor.com.`);
      textEl.textContent = originalText;
      submitBtn.disabled = false;
    }
  });

  // Initial state
  updateSubmitState();
})();
