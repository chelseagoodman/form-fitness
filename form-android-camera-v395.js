// FORM v3.9.5 — direct camera capture for Android and other mobile browsers.
// Load after form-ai-v22.js and the other FORM scripts.
(function () {
  'use strict';

  let stream = null;
  let capturedFile = null;

  const byId = id => document.getElementById(id);
  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
    const video = byId('formAndroidCameraVideo');
    if (video) video.srcObject = null;
  };

  function cameraMessage(error) {
    if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
      return 'Camera access was denied. Allow camera access for FORM in the browser, then try again. You can still choose a photo below.';
    }
    if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
      return 'No camera was found. You can still choose an existing photo below.';
    }
    if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
      return 'The camera is busy. Close other apps using it and try again, or choose an existing photo below.';
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      return 'This browser does not support in-app camera access. You can still choose an existing photo below.';
    }
    return 'Could not open the camera. Check browser camera permission or choose an existing photo below.';
  }

  function mountCameraUI() {
    const input = byId('formAiCamera');
    if (!input || byId('formAndroidCameraPanel')) return;
    const panel = document.createElement('div');
    panel.id = 'formAndroidCameraPanel';
    panel.className = 'card';
    panel.style.margin = '10px 0';
    panel.innerHTML = '<p class="tiny muted">Use the rear camera directly, or choose a photo below.</p>' +
      '<div class="actions" style="margin-top:8px"><button type="button" class="button secondary" id="formAndroidCameraStart">Open camera</button>' +
      '<button type="button" class="button" id="formAndroidCameraCapture" hidden>Take photo</button>' +
      '<button type="button" class="button secondary" id="formAndroidCameraCancel" hidden>Cancel camera</button></div>' +
      '<video id="formAndroidCameraVideo" playsinline autoplay muted hidden style="display:block;width:100%;max-height:55vh;object-fit:cover;border-radius:12px;margin-top:10px;background:#000"></video>' +
      '<p class="tiny muted" id="formAndroidCameraStatus" aria-live="polite"></p>';
    input.before(panel);

    byId('formAndroidCameraStart').addEventListener('click', async () => {
      const status = byId('formAndroidCameraStatus');
      const video = byId('formAndroidCameraVideo');
      status.textContent = 'Opening camera…';
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        stopCamera();
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' } }
        });
        video.srcObject = stream;
        video.hidden = false;
        await video.play();
        byId('formAndroidCameraCapture').hidden = false;
        byId('formAndroidCameraCancel').hidden = false;
        status.textContent = 'Camera ready. Tap Take photo when the food is in view.';
      } catch (error) {
        stopCamera();
        video.hidden = true;
        byId('formAndroidCameraCapture').hidden = true;
        byId('formAndroidCameraCancel').hidden = true;
        status.textContent = cameraMessage(error);
      }
    });

    byId('formAndroidCameraCapture').addEventListener('click', () => {
      const video = byId('formAndroidCameraVideo');
      const status = byId('formAndroidCameraStatus');
      if (!video.videoWidth || !video.videoHeight) {
        status.textContent = 'The camera is not ready yet. Wait a moment and try again.';
        return;
      }
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (!blob) {
          status.textContent = 'Could not capture that photo. Please try again or choose an existing photo.';
          return;
        }
        try {
          capturedFile = new File([blob], 'form-food-photo.jpg', { type: 'image/jpeg' });
          const transfer = new DataTransfer();
          transfer.items.add(capturedFile);
          input.files = transfer.files;
          status.textContent = 'Photo ready. Tap Analyse meal to review it.';
        } catch {
          capturedFile = null;
          status.textContent = 'This browser could not attach the camera photo. Please choose an existing photo below.';
        }
        stopCamera();
        video.hidden = true;
        byId('formAndroidCameraCapture').hidden = true;
        byId('formAndroidCameraCancel').hidden = true;
      }, 'image/jpeg', 0.88);
    });

    byId('formAndroidCameraCancel').addEventListener('click', () => {
      stopCamera();
      byId('formAndroidCameraVideo').hidden = true;
      byId('formAndroidCameraCapture').hidden = true;
      byId('formAndroidCameraCancel').hidden = true;
      byId('formAndroidCameraStatus').textContent = 'Camera closed. You can choose a photo or open the camera again.';
    });

    input.addEventListener('change', () => { capturedFile = null; });
    const galleryInput = byId('formAiFile');
    if (galleryInput) galleryInput.addEventListener('change', () => {
      capturedFile = null;
      input.value = '';
    });
  }

  const oldOpen = window.formAiOpen;
  if (typeof oldOpen === 'function') {
    window.formAiOpen = async function (...args) {
      stopCamera();
      capturedFile = null;
      const result = await oldOpen.apply(this, args);
      mountCameraUI();
      return result;
    };
  }

  const oldAnalyse = window.formAiAnalyse;
  if (typeof oldAnalyse === 'function') {
    window.formAiAnalyse = async function (...args) {
      if (capturedFile) {
        const input = byId('formAiCamera');
        try {
          const transfer = new DataTransfer();
          transfer.items.add(capturedFile);
          input.files = transfer.files;
        } catch {
          const status = byId('formAndroidCameraStatus');
          if (status) status.textContent = 'The camera photo could not be attached. Please choose it again from your photos.';
          return;
        }
      }
      return oldAnalyse.apply(this, args);
    };
  }

  const dialog = byId('modal');
  if (dialog) dialog.addEventListener('close', stopCamera);
})();
