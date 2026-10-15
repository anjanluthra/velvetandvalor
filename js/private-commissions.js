/* ============================================================
   VELVET & VALOR — Private Commissions
   Palette picker, photo upload, enquiry submission.
   ============================================================ */
'use strict';

(function () {
  /* ── Palette config ──────────────────────────────────────
     Keep the list focused — 10 options reads as "editorial curation";
     a 20-swatch dump reads as a hardware store colour chart. These lean
     into Kate's brand palette (navy, teal, umber, gold, cream) plus a
     few atmospheric companions. Tweak freely in one place. */
  const PALETTE = [
    { name: 'Midnight Navy',    hex: '#0a1424' },
    { name: 'Deep Teal',        hex: '#0c3b3b' },
    { name: 'Azure Blue',       hex: '#2f5a8c' },
    { name: 'Charcoal',         hex: '#2a2a2d' },
    { name: 'Warm Umber',       hex: '#8a4e2b' },
    { name: 'Antique Gold',     hex: '#c8a45c' },
    { name: 'Ivory',            hex: '#f0e6ce' },
    { name: 'Chestnut',         hex: '#6b2f1a' },
    { name: 'Burgundy',         hex: '#6b1a2c' },
    { name: 'Dusty Rose',       hex: '#b58a86' },
  ];
  const MAX_PICKS = 3;

  const form        = document.getElementById('pcForm');
  if (!form) return;

  const nameInput   = document.getElementById('pc-name');
  const emailInput  = document.getElementById('pc-email');
  const photoInput  = document.getElementById('pc-photo');
  const photoLabel  = document.getElementById('pcUploadLabel');
  const photoPrev   = document.getElementById('pcUploadPreview');
  const photoPrevImg= document.getElementById('pcUploadImg');
  const photoRemove = document.getElementById('pcUploadRemove');
  const uploadStat  = document.getElementById('pcUploadStatus');
  const palette     = document.getElementById('pcPalette');
  const coloursInp  = document.getElementById('pc-colours');
  const notesInput  = document.getElementById('pc-notes');
  const submitBtn   = document.getElementById('pcSubmit');
  const errorEl     = document.getElementById('pcError');
  const successEl   = document.getElementById('pcSuccess');

  /* ── Palette picker ─────────────────────────────────────── */
  const picked = []; // ordered list of swatch names
  PALETTE.forEach((p) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pc-swatch';
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-selected', 'false');
    btn.setAttribute('data-colour', p.name);

    const colour = document.createElement('span');
    colour.className = 'pc-swatch-colour';
    colour.style.background = p.hex;
    btn.appendChild(colour);

    const name = document.createElement('span');
    name.className = 'pc-swatch-name';
    name.textContent = p.name;
    btn.appendChild(name);

    const pick = document.createElement('span');
    pick.className = 'pc-swatch-pick';
    pick.setAttribute('aria-hidden', 'true');
    pick.textContent = '';
    btn.appendChild(pick);

    btn.addEventListener('click', () => {
      const idx = picked.indexOf(p.name);
      if (idx >= 0) {
        picked.splice(idx, 1);
      } else if (picked.length < MAX_PICKS) {
        picked.push(p.name);
      } else {
        // At the cap — flash the error briefly instead of a silent no-op.
        showError('Please choose at most ' + MAX_PICKS + ' colours.');
        return;
      }
      hideError();
      renderPalette();
    });

    palette.appendChild(btn);
  });

  function renderPalette() {
    const nodes = palette.querySelectorAll('.pc-swatch');
    nodes.forEach((n) => {
      const colour = n.getAttribute('data-colour');
      const idx = picked.indexOf(colour);
      n.classList.toggle('is-selected', idx >= 0);
      n.setAttribute('aria-selected', idx >= 0 ? 'true' : 'false');
      n.querySelector('.pc-swatch-pick').textContent = idx >= 0 ? String(idx + 1) : '';
      // Dim the unpicked ones once we've hit the cap, so the UI signals the limit.
      const atCap = picked.length >= MAX_PICKS;
      if (atCap && idx < 0) {
        n.setAttribute('aria-disabled', 'true');
      } else {
        n.removeAttribute('aria-disabled');
      }
    });
    coloursInp.value = picked.join(', ');
  }

  /* ── Photo upload — streams the file to /api/upload-photo and
       stores the returned URL on the form state. Separate from
       the submit step so the enquiry POST stays small (just a URL). */
  let uploadedPhotoUrl = null;
  const MAX_MB = 15;

  photoInput.addEventListener('change', async () => {
    const file = photoInput.files && photoInput.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setUploadStatus('Please choose an image file (JPEG, PNG, WEBP, HEIC).', 'err');
      photoInput.value = '';
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadStatus(`That image is over ${MAX_MB} MB. Try a smaller version.`, 'err');
      photoInput.value = '';
      return;
    }
    // Local preview immediately (optimistic UX while the upload happens)
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        photoPrevImg.src = e.target.result;
        photoPrev.hidden = false;
      };
      reader.readAsDataURL(file);
    } catch (e) {}

    setUploadStatus('Uploading…', '');
    photoLabel.textContent = 'Uploading…';
    try {
      const safeName = (file.name || 'horse.jpg').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
      const res = await fetch('/api/upload-photo', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'image/jpeg',
          'x-filename': 'commission-' + Date.now() + '-' + safeName,
        },
        body: file,
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Upload failed');
      }
      uploadedPhotoUrl = data.url;
      setUploadStatus('✓ Photograph uploaded.', 'ok');
      photoLabel.textContent = 'Replace photograph';
    } catch (err) {
      console.error('[commissions] upload failed:', err);
      setUploadStatus(err.message || 'Upload failed. Please try again, or email info@velvet-valor.com.', 'err');
      photoLabel.textContent = 'Upload photograph';
      uploadedPhotoUrl = null;
    }
  });

  photoRemove.addEventListener('click', () => {
    uploadedPhotoUrl = null;
    photoInput.value = '';
    photoPrev.hidden = true;
    photoPrevImg.src = '';
    setUploadStatus('', '');
    photoLabel.textContent = 'Upload photograph';
  });

  function setUploadStatus(msg, kind) {
    uploadStat.textContent = msg || '';
    uploadStat.classList.toggle('is-ok',  kind === 'ok');
    uploadStat.classList.toggle('is-err', kind === 'err');
  }

  /* ── Error helpers ──────────────────────────────────────── */
  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
    errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function hideError() {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  /* ── Submit ─────────────────────────────────────────────── */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    // Front-of-house validation. The server validates separately.
    const name  = (nameInput.value  || '').trim();
    const email = (emailInput.value || '').trim();
    if (!name)  { showError('Please enter your name.');  nameInput.focus();  return; }
    if (!email || !/.+@.+\..+/.test(email)) { showError('Please enter a valid email address.'); emailInput.focus(); return; }
    if (!uploadedPhotoUrl) { showError('Please upload a photograph of your horse.'); return; }
    if (picked.length === 0) { showError('Please choose at least one background colour.'); return; }
    const frame = (new FormData(form)).get('frame');
    if (!frame) { showError('Please choose a frame finish.'); return; }
    const size = (new FormData(form)).get('size');
    if (!size) { showError('Please choose a size.'); return; }

    submitBtn.disabled = true;
    const originalLabel = submitBtn.querySelector('.pc-submit-label').textContent;
    submitBtn.querySelector('.pc-submit-label').textContent = 'Sending…';

    // Pack the enquiry into the shared /api/submit endpoint.
    // The handler already supports a `contact` type that stores to KV
    // and emails Kate via Resend — we tag the submission so it's
    // obvious in the admin inbox and in the email subject line.
    const payload = {
      type: 'commission',
      name,
      email,
      subject: 'Private Commission Enquiry',
      message: buildMessage({
        name, email,
        photoUrl: uploadedPhotoUrl,
        colours: picked.join(', '),
        frame, size,
        notes: (notesInput.value || '').trim(),
      }),
      source: 'private-commissions',
    };

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not send your enquiry.');
      }
      // Success — swap form for the thank-you panel
      form.hidden = true;
      successEl.hidden = false;
      successEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error('[commissions] submit failed:', err);
      showError(err.message || 'Could not send your enquiry. Please try again, or email info@velvet-valor.com.');
      submitBtn.disabled = false;
      submitBtn.querySelector('.pc-submit-label').textContent = originalLabel;
    }
  });

  function buildMessage(f) {
    const lines = [
      'A new private commission enquiry has been received.',
      '',
      'FROM',
      '  ' + f.name + ' <' + f.email + '>',
      '',
      'HORSE PHOTOGRAPH',
      '  ' + f.photoUrl,
      '',
      'PREFERRED BACKGROUND PALETTE (ordered)',
      '  ' + f.colours,
      '',
      'FRAME FINISH',
      '  ' + f.frame,
      '',
      'SIZE',
      '  ' + f.size,
    ];
    if (f.notes) {
      lines.push('', 'NOTES', '  ' + f.notes.replace(/\n/g, '\n  '));
    }
    return lines.join('\n');
  }
})();
