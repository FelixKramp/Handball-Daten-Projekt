// app.js — Router, Modal, Toast, Event-Delegation
window.App = window.App || {};

App.ui = (function () {

  // ── Modal ────────────────────────────────────────────────────────
  const backdrop = document.getElementById('modal-backdrop');
  const modalBox = document.getElementById('modal-box');
  const titleEl  = document.getElementById('modal-title');
  const bodyEl   = document.getElementById('modal-body');
  const closeBtn = document.getElementById('modal-close');

  function openModal(title, html, onSave) {
    titleEl.textContent = title;
    bodyEl.innerHTML    = html;
    backdrop.classList.add('open');
    // Wire up "played" checkbox toggle
    const playedCb = document.getElementById('f-played');
    if (playedCb) {
      playedCb.addEventListener('change', () => {
        document.getElementById('score-fields').style.display = playedCb.checked ? '' : 'none';
      });
    }
    if (onSave) {
      modalBox.dataset.saveHandler = 'pending';
      modalBox._saveHandler = onSave;
    }
  }

  function closeModal() {
    backdrop.classList.remove('open');
    modalBox.classList.remove('modal-wide');
    delete modalBox._saveHandler;
  }

  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });

  // ── Toast ─────────────────────────────────────────────────────────
  const toastArea = document.getElementById('toast-area');

  function toast(msg, type = 'inf') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    toastArea.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 350); }, 2500);
  }

  // ── Shot Modal ───────────────────────────────────────────────────
  function openShotModal({ rx, ry, gameId, position }, onSave) {
    const players = App.data.getPlayers();
    const zoneName = position ? (App.court.ZONE_LABELS[position] || position) : null;
    const html = `
      ${zoneName ? `<div class="zone-pill">Position: <strong>${zoneName}</strong></div>` : ''}
      <div class="form-group">
        <label>Spieler</label>
        <select class="form-control" id="f-shot-player">
          <option value="">— Spieler wählen —</option>
          ${players.map(p => `<option value="${p.id}">#${p.number} ${p.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Ergebnis</label>
        <select class="form-control" id="f-shot-outcome">
          <option value="goal">Tor</option>
          <option value="miss">Fehlschuss</option>
          <option value="block">Geblockt</option>
          <option value="post">Pfosten</option>
        </select>
      </div>
      <div class="form-group">
        <label>Spielminute</label>
        <input class="form-control" id="f-shot-minute" type="number" min="1" max="60" placeholder="30">
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" id="btn-shot-cancel">Abbrechen</button>
        <button class="btn btn-primary" id="btn-save-shot">Speichern</button>
      </div>
    `;
    openModal('Wurf erfassen', html);
    document.getElementById('btn-shot-cancel').addEventListener('click', () => closeModal());
    document.getElementById('btn-save-shot').addEventListener('click', () => {
      const playerId = parseInt(document.getElementById('f-shot-player').value) || null;
      const outcome  = document.getElementById('f-shot-outcome').value;
      const minute   = parseInt(document.getElementById('f-shot-minute').value) || null;
      App.data.addShot({ gameId, playerId, outcome, minute, rx, ry, position });
      closeModal();
      toast('Wurf gespeichert', 'ok');
      if (onSave) onSave();
    });
  }

  // ── Opponent Shot Modal (incl. goal zone for goalkeeper analysis) ──
  function openOpponentShotModal({ rx, ry, gameId, minute, position }, onSave) {
    const zoneName = position ? (App.court.ZONE_LABELS[position] || position) : null;
    const ZONES = [
      { id:'tl', label:'OL' }, { id:'tm', label:'OM' }, { id:'tr', label:'OR' },
      { id:'ml', label:'ML' }, { id:'mm', label:'MM' }, { id:'mr', label:'MR' },
      { id:'bl', label:'UL' }, { id:'bm', label:'UM' }, { id:'br', label:'UR' },
    ];
    let selectedZone = null;
    const html = `
      ${zoneName ? `<div class="zone-pill opp">Position: <strong>${zoneName}</strong></div>` : ''}
      <div class="form-group">
        <label>Gegner-Spieler (optional)</label>
        <input class="form-control" id="f-opp-player" placeholder="Nummer oder Name" maxlength="20">
      </div>
      <div class="form-group">
        <label>Ergebnis</label>
        <select class="form-control" id="f-opp-outcome">
          <option value="goal">Tor</option>
          <option value="miss">Fehlschuss</option>
          <option value="block">Geblockt</option>
          <option value="post">Pfosten</option>
        </select>
      </div>
      <div class="form-group">
        <label>Torzone (aus Torwart-Sicht)</label>
        <div class="goal-zone-grid">
          ${ZONES.map(z => `<button type="button" class="gz-btn" data-zone="${z.id}">${z.label}</button>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label>Spielminute</label>
        <input class="form-control" id="f-opp-minute" type="number" min="1" max="60" value="${minute || ''}" placeholder="30">
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" id="btn-opp-cancel">Abbrechen</button>
        <button class="btn btn-primary" id="btn-save-opp">Speichern</button>
      </div>
    `;
    openModal('Gegner-Wurf erfassen', html);
    document.querySelectorAll('.gz-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedZone = btn.dataset.zone;
        document.querySelectorAll('.gz-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
    document.getElementById('btn-opp-cancel').addEventListener('click', () => closeModal());
    document.getElementById('btn-save-opp').addEventListener('click', () => {
      const opponentPlayer = document.getElementById('f-opp-player').value.trim() || null;
      const outcome  = document.getElementById('f-opp-outcome').value;
      const minute   = parseInt(document.getElementById('f-opp-minute').value) || null;
      App.data.addOpponentShot({ gameId, opponentPlayer, outcome, minute, rx, ry, goalZone: selectedZone, position });
      closeModal();
      toast('Gegner-Wurf gespeichert', 'ok');
      if (onSave) onSave();
    });
  }

  // ── Router ────────────────────────────────────────────────────────
  const views = {
    dashboard: { title: 'Dashboard',      render: App.views.renderDashboard },
    live:      { title: 'Spielmodus',     render: App.views.renderLive },
    squad:     { title: 'Kader',          render: App.views.renderSquad },
    analysis:  { title: 'Spielanalyse',   render: App.views.renderAnalysis },
    schedule:  { title: 'Spielplan',      render: App.views.renderSchedule },
    stats:     { title: 'Statistiken',    render: App.views.renderStats },
  };

  const content      = document.getElementById('page-content');
  const pageTitle    = document.getElementById('page-title');
  const topbarActs   = document.getElementById('topbar-actions');
  const teamNameEl   = document.getElementById('team-name-display');
  const seasonEl     = document.getElementById('season-display');

  function navigate(viewId) {
    const view = views[viewId];
    if (!view) return;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === viewId);
    });

    pageTitle.textContent = view.title;
    topbarActs.innerHTML  = '';

    // Render topbar actions per view
    if (viewId === 'squad') {
      topbarActs.innerHTML = `<button class="btn btn-primary" data-action="add-player">+ Spieler</button>`;
    } else if (viewId === 'schedule') {
      topbarActs.innerHTML = `
        <button class="btn btn-outline" data-action="import-api">↓ API laden</button>
        <button class="btn btn-primary"  data-action="add-game">+ Spiel</button>
      `;
    }

    view.render(content);
    window._currentView = viewId;
  }

  // ── Event Delegation ─────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    const el     = e.target.closest('[data-action]');
    const navEl  = e.target.closest('[data-view]');

    if (navEl && !el) {
      e.preventDefault();
      navigate(navEl.dataset.view);
      return;
    }

    if (!el) return;
    const action = el.dataset.action;
    const id     = el.dataset.id ? parseInt(el.dataset.id) : null;

    switch (action) {
      case 'add-player': {
        const formHtml = App.views.playerFormHTML() + `
          <div class="form-actions">
            <button class="btn btn-outline" onclick="App.ui.closeModal()">Abbrechen</button>
            <button class="btn btn-primary" id="btn-modal-save">Speichern</button>
          </div>`;
        openModal('Spieler hinzufügen', formHtml);
        setTimeout(() => {
          document.getElementById('btn-modal-save')?.addEventListener('click', () => {
            const data = App.views.collectPlayerForm();
            if (!data) return;
            App.data.addPlayer(data);
            closeModal();
            toast('Spieler hinzugefügt', 'ok');
            navigate('squad');
          });
        }, 0);
        break;
      }

      case 'edit-player': {
        const player = App.data.getPlayer(id);
        if (!player) break;
        const formHtml = App.views.playerFormHTML(player) + `
          <div style="margin-top:8px;padding-top:14px;border-top:1px solid var(--border);">
            <button class="btn btn-danger btn-sm" data-action="delete-player" data-id="${id}">Spieler löschen</button>
          </div>
          <div class="form-actions">
            <button class="btn btn-outline" onclick="App.ui.closeModal()">Abbrechen</button>
            <button class="btn btn-primary" id="btn-modal-save">Speichern</button>
          </div>`;
        openModal('Spieler bearbeiten', formHtml);
        setTimeout(() => {
          document.getElementById('btn-modal-save')?.addEventListener('click', () => {
            const data = App.views.collectPlayerForm();
            if (!data) return;
            App.data.updatePlayer(id, data);
            closeModal();
            toast('Spieler aktualisiert', 'ok');
            navigate('squad');
          });
        }, 0);
        break;
      }

      case 'delete-player':
        if (!confirm('Spieler wirklich löschen?')) break;
        App.data.deletePlayer(id);
        closeModal();
        toast('Spieler gelöscht', 'ok');
        navigate('squad');
        break;

      case 'add-game': {
        const formHtml = App.views.gameFormHTML() + `
          <div class="form-actions">
            <button class="btn btn-outline" onclick="App.ui.closeModal()">Abbrechen</button>
            <button class="btn btn-primary" id="btn-modal-save">Speichern</button>
          </div>`;
        openModal('Spiel hinzufügen', formHtml);
        setTimeout(() => {
          document.getElementById('btn-modal-save')?.addEventListener('click', () => {
            const data = App.views.collectGameForm();
            if (!data) return;
            App.data.addGame(data);
            closeModal();
            toast('Spiel hinzugefügt', 'ok');
            navigate('schedule');
          });
        }, 0);
        break;
      }

      case 'edit-game': {
        const game = App.data.getGame(id);
        if (!game) break;
        const formHtml = App.views.gameFormHTML(game) + `
          <div class="form-actions">
            <button class="btn btn-outline" onclick="App.ui.closeModal()">Abbrechen</button>
            <button class="btn btn-primary" id="btn-modal-save">Speichern</button>
          </div>`;
        openModal('Spiel bearbeiten', formHtml);
        setTimeout(() => {
          document.getElementById('btn-modal-save')?.addEventListener('click', () => {
            const data = App.views.collectGameForm();
            if (!data) return;
            App.data.updateGame(id, data);
            closeModal();
            toast('Spiel gespeichert', 'ok');
            navigate('schedule');
          });
        }, 0);
        break;
      }

      case 'delete-game':
        if (!confirm('Spiel und alle zugehörigen Würfe löschen?')) break;
        App.data.deleteGame(id);
        toast('Spiel gelöscht', 'ok');
        navigate('schedule');
        break;

      case 'import-api':
        toast('API wird geladen…', 'inf');
        App.api.loadSchedule()
          .then(({ total, added }) => {
            toast(`${added} neue Spiele importiert (${total} gesamt)`, 'ok');
            navigate('schedule');
          })
          .catch(err => toast(`Fehler: ${err.message}`, 'err'));
        break;

      case 'settings': {
        const team = App.data.getTeam();
        const formHtml = App.views.settingsFormHTML(team) + `
          <div class="form-actions">
            <button class="btn btn-outline" onclick="App.ui.closeModal()">Abbrechen</button>
            <button class="btn btn-primary" id="btn-modal-save">Speichern</button>
          </div>`;
        openModal('Einstellungen', formHtml);
        setTimeout(() => {
          document.getElementById('btn-modal-save')?.addEventListener('click', () => {
            const name   = document.getElementById('f-teamname')?.value.trim();
            const season = document.getElementById('f-season')?.value.trim();
            const league = document.getElementById('f-league')?.value.trim();
            const teamId = document.getElementById('f-teamid')?.value.trim();
            App.data.setTeam({ name: name || team.name, season: season || team.season, apiLeagueId: league, apiTeamId: teamId });
            teamNameEl.textContent = name || team.name;
            seasonEl.textContent   = season || team.season;
            closeModal();
            toast('Einstellungen gespeichert', 'ok');
          });

          // Datensicherung: Export als JSON-Download
          document.getElementById('btn-export-data')?.addEventListener('click', () => {
            const blob = new Blob([App.data.exportJSON()], { type: 'application/json' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `handball-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast('Sicherung heruntergeladen', 'ok');
          });

          // Datensicherung: Import aus JSON-Datei
          const fileInput = document.getElementById('f-import-file');
          document.getElementById('btn-import-data')?.addEventListener('click', () => fileInput?.click());
          fileInput?.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (!file) return;
            if (!confirm('Aktuelle Daten werden durch die Sicherung ersetzt. Fortfahren?')) {
              fileInput.value = '';
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              if (App.data.importJSON(reader.result)) {
                closeModal();
                init();
                toast('Sicherung wiederhergestellt', 'ok');
              } else {
                toast('Ungültige Sicherungsdatei', 'err');
              }
              fileInput.value = '';
            };
            reader.readAsText(file);
          });
        }, 0);
        break;
      }
    }
  });

  // ── Init ──────────────────────────────────────────────────────────
  // Persist timer state across view navigation
  App.live = App.live || { timerSeconds: 0, timerRunning: false, timerHalf: 1, timerInterval: null };

  function init() {
    const team = App.data.getTeam();
    teamNameEl.textContent = team.name;
    seasonEl.textContent   = team.season;
    navigate('dashboard');
  }

  return { openModal, closeModal, toast, openShotModal, openOpponentShotModal, navigate, init };
})();

App.ui.init();
