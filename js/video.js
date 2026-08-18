// ── Video (Stufe 1b: Video-Sync + dauerhafte Speicherung) ───────────
// Die Videodatei wird in IndexedDB abgelegt und übersteht damit Neuladen und
// Neustart — anders als localStorage, das nur Text und wenige MB fasst.
// Gespeichert wird pro Spiel: beim Spielwechsel taucht die passende Aufnahme
// automatisch wieder auf. Nichts verlässt das Gerät, es gibt keinen Upload.

window.App = window.App || {};

App.video = (function () {
  const DB_NAME = 'hb_video', DB_VERSION = 1, STORE = 'videos';
  const KICKOFF_KEY = 'hb_video_kickoff';   // klein und synchron lesbar -> localStorage

  let file = null;
  let objectUrl = null;
  let videoEl = null;
  let currentGameId = null;
  let lastTime = 0;          // Abspielposition über Ansichtswechsel hinweg merken

  // ── IndexedDB ─────────────────────────────────────────────────────
  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'gameId' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function tx(mode, fn) {
    return openDb().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }

  // ── Anpfiff-Zeitpunkt (pro Spiel) ─────────────────────────────────
  function alleKickoffs() {
    try { return JSON.parse(localStorage.getItem(KICKOFF_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function kickoffFor(gameId) { return alleKickoffs()[gameId] || 0; }

  function setObjectUrl(blob) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(blob);
    if (videoEl) videoEl.src = objectUrl;
  }

  const api = {
    // ── Laden und Speichern ─────────────────────────────────────────
    // gameId ist optional, damit der bestehende Aufruf load(file) weiter funktioniert;
    // ohne gameId wird nur für die Sitzung geladen, nicht gespeichert.
    load(selectedFile, gameId) {
      file = selectedFile;
      api._name = null;                  // echte Datei hat einen eigenen Namen
      currentGameId = gameId != null ? gameId : currentGameId;
      lastTime = 0;
      setObjectUrl(selectedFile);
      if (currentGameId == null) return Promise.resolve(false);
      return tx('readwrite', store => store.put({
        gameId: currentGameId, name: selectedFile.name, type: selectedFile.type,
        size: selectedFile.size, blob: selectedFile, savedAt: Date.now()
      })).then(() => true).catch(err => {
        // Häufigster Fall: Speicherplatz-Kontingent überschritten
        console.warn('Video konnte nicht gespeichert werden:', err);
        return false;
      });
    },

    // Holt die gespeicherte Aufnahme eines Spiels zurück. Liefert true, wenn eine da war.
    restoreForGame(gameId) {
      currentGameId = gameId;
      return tx('readonly', store => store.get(gameId)).then(rec => {
        if (!rec || !rec.blob) { api.releaseSession(); return false; }
        file = rec.blob;
        api._name = rec.name;   // Blob aus der DB trägt keinen Namen — separat merken
        lastTime = 0;
        setObjectUrl(rec.blob);
        return true;
      }).catch(() => false);
    },

    // Entfernt die gespeicherte Aufnahme eines Spiels
    remove(gameId) {
      return tx('readwrite', store => store.delete(gameId)).then(() => {
        if (gameId === currentGameId) api.releaseSession();
        return true;
      });
    },

    // Alle gespeicherten Aufnahmen mit Größe — für die Speicherübersicht
    list() {
      return tx('readonly', store => store.getAll()).then(recs =>
        (recs || []).map(r => ({ gameId: r.gameId, name: r.name, size: r.size, savedAt: r.savedAt }))
      ).catch(() => []);
    },

    // ── Bestehende API aus Stufe 1b (unverändert nutzbar) ───────────
    isLoaded() { return !!objectUrl; },
    fileName() { return (file && file.name) || api._name || null; },

    // Verbindet das aktuell geladene Video mit einem frisch gerenderten <video>-Element.
    // Die Abspielposition wird dabei wiederhergestellt, damit ein Ansichtswechsel
    // nicht zurück an den Anfang springt.
    attach(el) {
      videoEl = el;
      if (!objectUrl) return;
      videoEl.src = objectUrl;
      if (lastTime > 0) {
        const setzen = () => { videoEl.currentTime = lastTime; videoEl.removeEventListener('loadedmetadata', setzen); };
        videoEl.addEventListener('loadedmetadata', setzen);
      }
      videoEl.addEventListener('timeupdate', () => { lastTime = videoEl.currentTime; });
    },

    getCurrentTime() { return videoEl && api.isLoaded() ? videoEl.currentTime : null; },

    // Nur die Sitzung freigeben — die gespeicherte Datei bleibt in der DB
    releaseSession() {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = null; file = null; api._name = null; lastTime = 0;
      if (videoEl) videoEl.removeAttribute('src');
    },
    clear() { api.releaseSession(); },

    // ── Springen ────────────────────────────────────────────────────
    // preroll blendet ein paar Sekunden vorher ein, damit man den Spielzug
    // von vorn sieht statt erst im Moment des Wurfs.
    seekTo(seconds, { preroll = 4, play = false } = {}) {
      if (!videoEl || !api.isLoaded() || seconds == null) return false;
      videoEl.currentTime = Math.max(0, seconds - preroll);
      lastTime = videoEl.currentTime;
      if (play) videoEl.play().catch(() => {});
      return true;
    },

    // ── Anpfiff und Spielminute ─────────────────────────────────────
    getKickoff() { return kickoffFor(currentGameId); },
    setKickoff(seconds) {
      if (currentGameId == null) return;
      const alle = alleKickoffs();
      alle[currentGameId] = Math.max(0, seconds || 0);
      localStorage.setItem(KICKOFF_KEY, JSON.stringify(alle));
    },
    markKickoffHere() {
      const t = api.getCurrentTime();
      if (t != null) api.setKickoff(t);
    },

    // Spielminute zu einer Videosekunde (1-basiert wie im Rest der App)
    minuteFromTime(t) {
      if (!api.isLoaded() || t == null) return null;
      const rel = t - kickoffFor(currentGameId);
      if (rel < 0) return null;                  // liegt vor dem Anpfiff
      return Math.max(1, Math.ceil(rel / 60));
    },
    currentMinute() { return api.minuteFromTime(api.getCurrentTime()); },

    // ── Speicherplatz ───────────────────────────────────────────────
    // Bittet den Browser, den Speicher nicht bei Platzmangel zu verwerfen.
    requestPersist() {
      if (!navigator.storage || !navigator.storage.persist) return Promise.resolve(false);
      return navigator.storage.persisted()
        .then(schon => schon ? true : navigator.storage.persist())
        .catch(() => false);
    },
    quota() {
      if (!navigator.storage || !navigator.storage.estimate) return Promise.resolve(null);
      return navigator.storage.estimate()
        .then(e => ({ belegt: e.usage || 0, gesamt: e.quota || 0 }))
        .catch(() => null);
    },

    // ── Anzeige-Helfer ──────────────────────────────────────────────
    fmt(seconds) {
      if (seconds == null) return '–';
      const s = Math.max(0, Math.floor(seconds));
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
      const sek = String(s % 60).padStart(2, '0');
      return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sek}` : `${m}:${sek}`;
    },
    mb(bytes) {
      if (!bytes) return '0 MB';
      if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
      if (bytes >= 10485760)   return Math.round(bytes / 1048576) + ' MB';
      if (bytes >= 1048576)    return (bytes / 1048576).toFixed(1) + ' MB';
      return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    },
  };

  return api;
})();
