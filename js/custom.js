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
      if (file.size > 10 * 1024 * 1024) {
        showError('That photo is over 10MB. Please choose a smaller version.');
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
      progressBar.style.width = '20%';
      progressText.textContent = 'Uploading…';

      try {
        const res = await fetch('/api/upload-photo', {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'image/jpeg',
            'x-filename': file.name || `horse-${Date.now()}.jpg`,
          },
          body: file,
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
    };

    try {
      const res = await fetch('/api/create-custom-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Could not start checkout');
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
