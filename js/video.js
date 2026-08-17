// video.js — Videoanalyse: Spielaufnahme laden, Zeitstempel je Wurf, Sprung zur Szene
window.App = window.App || {};

App.video = (function () {

  // Die Videodatei selbst wird bewusst NICHT gespeichert: localStorage fasst keine
  // Videos, und Browser geben aus Sicherheitsgründen keinen dauerhaften Zugriff auf
  // eine lokale Datei. Sie lebt daher nur für die Dauer der Sitzung im Speicher —
  // dafür aber über Ansichtswechsel hinweg. Nach einem Neuladen muss sie erneut
  // ausgewählt werden. Dauerhaft gespeichert wird nur der Anpfiff-Zeitpunkt.
  const META_KEY = 'hb_video_meta';

  let file      = null;
  let objectUrl = null;
  let kickoff   = 0;      // Videosekunde, die dem Anpfiff entspricht
  let videoEl   = null;   // ein einziges <video>, das zwischen den Ansichten wandert
  const listeners = new Set();

  function loadMeta() {
    try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveMeta() {
    if (!file) return;
    localStorage.setItem(META_KEY, JSON.stringify({ name: file.name, kickoff }));
  }

  function notify() { listeners.forEach(fn => { try { fn(); } catch (e) {} }); }

  // Das <video> wird einmal erzeugt und danach nur noch umgehängt. Dadurch bleibt
  // die Abspielposition erhalten, wenn zwischen Spielmodus und Analyse gewechselt wird.
  function ensureVideoEl() {
    if (!videoEl) {
      videoEl = document.createElement('video');
      videoEl.className = 'video-player';
      videoEl.controls = true;
      videoEl.preload  = 'metadata';
      videoEl.playsInline = true;
      videoEl.addEventListener('timeupdate', notify);
    }
    return videoEl;
  }

  const api = {
    hasFile()  { return file !== null; },
    fileName() { return file ? file.name : null; },

    setFile(f) {
      if (!f) return;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      file = f;
      objectUrl = URL.createObjectURL(f);
      // Anpfiff-Zeitpunkt nur übernehmen, wenn es dieselbe Datei wie zuletzt ist
      const meta = loadMeta();
      kickoff = (meta.name === f.name && typeof meta.kickoff === 'number') ? meta.kickoff : 0;
      const v = ensureVideoEl();
      v.src = objectUrl;
      v.load();
      saveMeta();
      notify();
    },

    clear() {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = null;
      file = null;
      kickoff = 0;
      if (videoEl) { videoEl.removeAttribute('src'); videoEl.load(); }
      notify();
    },

    // Aktuelle Abspielposition in Sekunden, oder null wenn kein Video geladen ist
    getTime() {
      return (file && videoEl) ? videoEl.currentTime : null;
    },

    // Springt zu einer Videosekunde. preroll blendet ein paar Sekunden davor ein,
    // damit man den Spielzug von vorn sieht statt erst im Moment des Wurfs.
    seekTo(seconds, { preroll = 4, play = false } = {}) {
      if (!file || seconds == null) return false;
      const v = ensureVideoEl();
      v.currentTime = Math.max(0, seconds - preroll);
      if (play) v.play().catch(() => {});
      return true;
    },

    getKickoff() { return kickoff; },
    setKickoff(seconds) { kickoff = Math.max(0, seconds || 0); saveMeta(); notify(); },
    // Setzt den Anpfiff auf die gerade sichtbare Stelle
    markKickoffHere() { if (file && videoEl) api.setKickoff(videoEl.currentTime); },

    // Spielminute zu einer Videosekunde (1-basiert, wie im Rest der App)
    minuteFromTime(t) {
      if (!file || t == null) return null;
      const rel = t - kickoff;
      if (rel < 0) return null;              // liegt vor dem Anpfiff
      return Math.max(1, Math.ceil(rel / 60));
    },
    currentMinute() { return api.minuteFromTime(api.getTime()); },

    onChange(fn)  { listeners.add(fn); },
    offChange(fn) { listeners.delete(fn); },

    // mm:ss für die Anzeige
    fmt(seconds) {
      if (seconds == null) return '–';
      const s = Math.max(0, Math.floor(seconds));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = String(s % 60).padStart(2, '0');
      return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${sec}` : `${m}:${sec}`;
    },

    // Rendert das Bedienfeld in host. Das <video> selbst wird dabei nur umgehängt,
    // nicht neu erzeugt — die Abspielposition bleibt also erhalten.
    renderPanel(host, { compact = false } = {}) {
      if (!host) return;
      host.innerHTML = `
        <div class="card-title">Videoanalyse</div>
        <div class="video-stage" id="${host.id}-stage"></div>
        <div class="video-bar">
          <input type="file" accept="video/*" id="${host.id}-file" style="display:none">
          <button class="btn btn-outline btn-sm" data-video-act="pick">
            ${file ? 'Anderes Video' : 'Video auswählen'}
          </button>
          ${file ? `<button class="btn btn-outline btn-sm" data-video-act="kickoff" title="Setzt den Anpfiff auf die aktuelle Stelle im Video">Anpfiff = hier</button>` : ''}
          <span class="video-info" id="${host.id}-info"></span>
        </div>
        ${file ? '' : `<div class="video-hint">Aufnahme auswählen, um Würfe mit dem Videozeitpunkt zu verknüpfen. Die Datei bleibt auf deinem Gerät und muss nach einem Neuladen erneut gewählt werden.</div>`}
      `;

      const stage = document.getElementById(`${host.id}-stage`);
      const info  = document.getElementById(`${host.id}-info`);
      if (file) stage.appendChild(ensureVideoEl());
      if (compact) host.classList.add('video-compact');

      function paintInfo() {
        if (!info) return;
        if (!file) { info.textContent = 'keine Aufnahme geladen'; return; }
        const min = api.currentMinute();
        info.textContent = `${file.name} · ${api.fmt(api.getTime())}`
          + (min != null ? ` · Spielminute ${min}` : ' · vor dem Anpfiff')
          + (kickoff > 0 ? ` · Anpfiff bei ${api.fmt(kickoff)}` : '');
      }
      paintInfo();
      // Beim Neuzeichnen den vorherigen Listener abmelden, sonst sammeln sie sich an
      // und zeigen auf längst ersetzte DOM-Knoten.
      if (host._videoPaint) api.offChange(host._videoPaint);
      host._videoPaint = paintInfo;
      api.onChange(paintInfo);

      // Klick-Handler nur einmal pro Host registrieren (innerHTML wird ersetzt,
      // das Host-Element selbst bleibt bestehen).
      if (!host._videoWired) {
        host._videoWired = true;
        host.addEventListener('click', e => {
          const btn = e.target.closest('[data-video-act]');
          if (!btn) return;
          if (btn.dataset.videoAct === 'pick') host.querySelector('input[type=file]').click();
          if (btn.dataset.videoAct === 'kickoff') {
            api.markKickoffHere();
            App.ui.toast(`Anpfiff auf ${api.fmt(kickoff)} gesetzt`, 'ok');
          }
        });
        host.addEventListener('change', e => {
          if (e.target.type !== 'file') return;
          const f = e.target.files && e.target.files[0];
          if (!f) return;
          api.setFile(f);
          api.renderPanel(host, { compact });   // neu zeichnen, damit das Video erscheint
        });
      }
    },
  };

  return api;
})();
