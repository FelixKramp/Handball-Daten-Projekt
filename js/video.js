// ── Video (Stufe 1b: Video-Sync) ────────────────────────────────────
// Hält die während der Sitzung geladene Videodatei als Object-URL.
// Kein Upload, keine Kopie — die Datei bleibt lokal und wird pro Sitzung neu gewählt.

window.App = window.App || {};

App.video = (function () {
  let file = null;
  let objectUrl = null;
  let videoEl = null;

  function load(selectedFile) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    file = selectedFile;
    objectUrl = URL.createObjectURL(file);
    if (videoEl) videoEl.src = objectUrl;
  }

  function isLoaded() {
    return !!objectUrl;
  }

  function fileName() {
    return file ? file.name : null;
  }

  // Verbindet das aktuell geladene Video mit einem frisch gerenderten <video>-Element
  // (die Live-Ansicht baut ihr DOM bei jeder Navigation neu auf, die Object-URL bleibt bestehen).
  function attach(el) {
    videoEl = el;
    if (objectUrl) videoEl.src = objectUrl;
  }

  function getCurrentTime() {
    return videoEl && isLoaded() ? videoEl.currentTime : null;
  }

  function clear() {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    file = null;
    objectUrl = null;
    videoEl = null;
  }

  return { load, isLoaded, fileName, attach, getCurrentTime, clear };
})();
