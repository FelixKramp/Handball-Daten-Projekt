// views.js — View-Renderer für alle 4 Seiten
window.App = window.App || {};

App.views = (function () {

  // ── Helpers ─────────────────────────────────────────────────────

  function fmt(n) { return n != null ? n : '–'; }

  function dateFmt(iso) {
    if (!iso) return '–';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function resultBadge(game) {
    if (!game.played) return '<span class="badge badge-away">Ausstehend</span>';
    if (game.goalsFor > game.goalsAgainst) return '<span class="badge badge-win">Sieg</span>';
    if (game.goalsFor < game.goalsAgainst) return '<span class="badge badge-loss">Niederlage</span>';
    return '<span class="badge badge-draw">Unentschieden</span>';
  }

  const POSITIONS = ['TH', 'RL', 'LL', 'RM', 'LM', 'RA', 'LA', 'KA', 'PF'];
  const POS_LABELS = { TH:'Torwart', RL:'Rechtsaußen', LL:'Linksaußen', RM:'Rechtsmitte', LM:'Linksmitte', RA:'Rückraum rechts', LA:'Rückraum links', KA:'Kreisläufer', PF:'Pivot' };

  // ── Dashboard ────────────────────────────────────────────────────

  function renderDashboard(el) {
    const stats    = App.data.getSeasonStats();
    const topScore = App.data.getTopScorer();
    const games    = App.data.getGames();
    const lastGame = games.find(g => g.played);
    const nextGame = [...games].reverse().find(g => !g.played);

    el.innerHTML = `
      <!-- KPI Row -->
      <div class="section">
        <div class="grid-4">
          <div class="card card-sm">
            <div class="card-title">Spiele</div>
            <div class="stat-big">${stats.total}</div>
            <div class="stat-label">gespielt diese Saison</div>
          </div>
          <div class="card card-sm">
            <div class="card-title">Bilanz</div>
            <div class="stat-row" style="margin-top:6px;">
              <div class="stat-col">
                <span class="v text-green">${stats.wins}</span>
                <span class="l">S</span>
              </div>
              <div class="stat-col">
                <span class="v text-yellow">${stats.draws}</span>
                <span class="l">U</span>
              </div>
              <div class="stat-col">
                <span class="v text-red">${stats.losses}</span>
                <span class="l">N</span>
              </div>
            </div>
          </div>
          <div class="card card-sm">
            <div class="card-title">Tore</div>
            <div class="stat-big text-green">${stats.goalsFor}</div>
            <div class="stat-label">${stats.goalsAgainst} kassiert · Diff ${stats.goalsFor - stats.goalsAgainst >= 0 ? '+' : ''}${stats.goalsFor - stats.goalsAgainst}</div>
          </div>
          <div class="card card-sm">
            <div class="card-title">Punkte</div>
            <div class="stat-big">${stats.points}</div>
            <div class="stat-label">aus ${stats.total} Spielen</div>
          </div>
        </div>
      </div>

      <!-- Last / Next + Topscorer -->
      <div class="section">
        <div class="grid-3">
          ${lastGame ? `
          <div class="card card-sm">
            <div class="card-title">Letztes Spiel</div>
            <div class="mb-4">${resultBadge(lastGame)}</div>
            <div class="font-bold mb-4" style="font-size:15px">${lastGame.homeAway === 'H' ? 'vs.' : '@'} ${lastGame.opponent}</div>
            <div style="font-size:26px;font-weight:800;">${lastGame.goalsFor}:${lastGame.goalsAgainst}</div>
            <div class="text-muted text-sm mt-10">${dateFmt(lastGame.date)}</div>
          </div>` : '<div class="card card-sm"><div class="card-title">Letztes Spiel</div><div class="text-muted">Noch kein Spiel eingetragen</div></div>'}

          ${nextGame ? `
          <div class="card card-sm">
            <div class="card-title">Nächstes Spiel</div>
            <div class="mb-4"><span class="badge badge-home">${nextGame.homeAway === 'H' ? 'Heim' : 'Auswärts'}</span></div>
            <div class="font-bold mb-4" style="font-size:15px">${nextGame.opponent}</div>
            <div class="text-muted text-sm">${dateFmt(nextGame.date)}</div>
          </div>` : '<div class="card card-sm"><div class="card-title">Nächstes Spiel</div><div class="text-muted">Keine weiteren Spiele geplant</div></div>'}

          <div class="card card-sm">
            <div class="card-title">Bester Torschütze</div>
            ${topScore ? `
              <div class="font-bold" style="font-size:15px">${topScore.player.name}</div>
              <div class="text-muted text-sm mb-8">#${topScore.player.number} · ${POS_LABELS[topScore.player.position] || topScore.player.position}</div>
              <div class="stat-big text-green">${topScore.goals}</div>
              <div class="stat-label">Tore (aus Wurfanalyse)</div>
            ` : '<div class="text-muted">Noch keine Wurfdaten</div>'}
          </div>
        </div>
      </div>

      <!-- Goals chart -->
      ${stats.total > 0 ? `
      <div class="section">
        <div class="card">
          <div class="card-title">Tore pro Spiel</div>
          <div class="chart-wrap">
            <canvas id="goals-chart"></canvas>
          </div>
        </div>
      </div>` : ''}
    `;

    if (stats.total > 0) {
      const gpg = App.data.getGoalsPerGame();
      const ctx = el.querySelector('#goals-chart').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: gpg.map(g => g.label),
          datasets: [
            { label: 'Tore', data: gpg.map(g => g.goalsFor), backgroundColor: 'rgba(63,185,104,0.7)', borderRadius: 4 },
            { label: 'Gegentore', data: gpg.map(g => g.goalsAgainst), backgroundColor: 'rgba(232,72,85,0.5)', borderRadius: 4 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#8b949e', font: { size: 11 } } } },
          scales: {
            x: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.06)' } }
          }
        }
      });
    }
  }

  // ── Kader ────────────────────────────────────────────────────────

  function renderSquad(el) {
    const players = App.data.getPlayers();

    el.innerHTML = players.length === 0
      ? `<div class="empty"><h3>Noch keine Spieler</h3><p>Füge deinen Kader hinzu.</p>
          <button class="btn btn-primary" data-action="add-player">+ Spieler hinzufügen</button></div>`
      : `<div class="grid-auto">
          ${players.map(p => {
            const shotGoals = App.data.getShots().filter(s => s.playerId === p.id && s.outcome === 'goal').length;
            return `<div class="player-card" data-action="edit-player" data-id="${p.id}">
              <div class="player-number">${p.number}</div>
              <div class="player-name">${p.name}</div>
              <div class="player-pos">${POS_LABELS[p.position] || p.position || '–'}</div>
              <div class="player-stats-row">
                <div class="ps"><span class="v">${shotGoals}</span><span class="l">Tore</span></div>
                <div class="ps"><span class="v">${p.assists}</span><span class="l">Assists</span></div>
                <div class="ps"><span class="v">${p.yellowCards}</span><span class="l text-yellow">2min</span></div>
              </div>
            </div>`;
          }).join('')}
        </div>`;
  }

  function playerFormHTML(player) {
    const p = player || {};
    return `
      <div class="form-row">
        <div class="form-group">
          <label>Vorname</label>
          <input class="form-control" id="f-firstname" value="${p.firstname || ''}" placeholder="Max">
        </div>
        <div class="form-group">
          <label>Nachname</label>
          <input class="form-control" id="f-lastname" value="${p.lastname || ''}" placeholder="Mustermann">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Rückennummer</label>
          <input class="form-control" id="f-number" type="number" min="1" max="99" value="${p.number || ''}">
        </div>
        <div class="form-group">
          <label>Position</label>
          <select class="form-control" id="f-position">
            ${POSITIONS.map(pos => `<option value="${pos}" ${p.position === pos ? 'selected' : ''}>${POS_LABELS[pos]}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row3">
        <div class="form-group">
          <label>Assists</label>
          <input class="form-control" id="f-assists" type="number" min="0" value="${p.assists || 0}">
        </div>
        <div class="form-group">
          <label>2-min-Strafen</label>
          <input class="form-control" id="f-yellow" type="number" min="0" value="${p.yellowCards || 0}">
        </div>
        <div class="form-group">
          <label>Rote Karten</label>
          <input class="form-control" id="f-red" type="number" min="0" value="${p.redCards || 0}">
        </div>
      </div>
    `;
  }

  function collectPlayerForm() {
    const firstname = document.getElementById('f-firstname')?.value.trim();
    const lastname  = document.getElementById('f-lastname')?.value.trim();
    if (!firstname && !lastname) { App.ui.toast('Bitte Namen eingeben', 'err'); return null; }
    return {
      name:        [firstname, lastname].filter(Boolean).join(' '),
      firstname,
      lastname,
      number:      parseInt(document.getElementById('f-number')?.value) || 0,
      position:    document.getElementById('f-position')?.value || '',
      assists:     parseInt(document.getElementById('f-assists')?.value) || 0,
      yellowCards: parseInt(document.getElementById('f-yellow')?.value) || 0,
      redCards:    parseInt(document.getElementById('f-red')?.value) || 0,
    };
  }

  // ── Spielanalyse ─────────────────────────────────────────────────

  function renderAnalysis(el) {
    const games = App.data.getGames().filter(g => g.played);

    if (games.length === 0) {
      el.innerHTML = `<div class="empty"><h3>Keine gespielten Spiele</h3>
        <p>Trage zuerst Spielergebnisse im Spielplan ein.</p></div>`;
      return;
    }

    let activeGameId = games[0].id;
    let mode = 'own'; // 'own' | 'opp' | 'momentum'

    el.innerHTML = `
      <div class="section">
        <div class="court-controls" style="margin-bottom:16px;">
          <select class="form-control" id="analysis-game-select" style="max-width:260px;">
            ${games.map(g => `<option value="${g.id}">${dateFmt(g.date)} – ${g.opponent} (${g.goalsFor}:${g.goalsAgainst})</option>`).join('')}
          </select>
          <div class="seg-control" id="analysis-mode">
            <button class="seg-btn active" data-mode="own">Eigene Würfe</button>
            <button class="seg-btn" data-mode="opp">Gegner-Würfe</button>
            <button class="seg-btn" data-mode="momentum">Momentum</button>
          </div>
        </div>
        <div id="analysis-body"></div>
      </div>
    `;

    const body = document.getElementById('analysis-body');

    // ── Shot chart (own or opponent) ─────────────────────────────────
    function renderShotChart(side) {
      const isOwn = side === 'own';
      body.innerHTML = `
        <div class="court-wrap">
          <div class="court-controls">
            <button class="btn btn-primary" id="btn-add-shot">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>
              ${isOwn ? 'Wurf eintragen' : 'Gegner-Wurf eintragen'}
            </button>
            <button class="btn btn-outline" id="btn-clear-shots">Alle löschen</button>
            <div id="entry-hint" style="font-size:12px;color:var(--text-2);display:none;">Auf eine Zone tippen → Wurf erfassen</div>
          </div>
          <div id="court-container"></div>
          <div class="shot-legend mt-10">
            <div class="legend-item"><div class="legend-dot" style="background:#3fb968"></div>Tor</div>
            <div class="legend-item"><div class="legend-dot" style="background:#e84855"></div>Fehlschuss</div>
            <div class="legend-item"><div class="legend-dot" style="background:#f0a500"></div>Geblockt</div>
            <div class="legend-item"><div class="legend-dot" style="background:#4a90d9"></div>Pfosten</div>
          </div>
        </div>
        <div class="section" style="margin-top:24px;">
          <div class="${isOwn ? 'grid-3' : 'grid-2'}">
            <div class="card">
              <div class="card-title">Wurfstatistik${isOwn ? '' : ' (Gegner)'}</div>
              <div id="shot-stats-content"></div>
            </div>
            <div class="card">
              <div class="card-title">${isOwn ? 'Tore nach Spieler' : 'Torzonen — wo wir kassieren'}</div>
              <div id="secondary-panel"></div>
            </div>
            ${isOwn ? `
            <div class="card">
              <div class="card-title">Torzonen — wo wir treffen</div>
              <div id="own-goalzone-panel"></div>
            </div>` : ''}
          </div>
        </div>
      `;

      const courtSvg = App.court.build();
      document.getElementById('court-container').appendChild(courtSvg);

      let entryOn = false;

      function refresh() {
        if (isOwn) {
          App.court.renderShots(courtSvg, App.data.getShots(activeGameId), App.data.getPlayers());
        } else {
          App.court.renderShots(courtSvg, [], []);
          App.court.renderOpponentShots(courtSvg, App.data.getOpponentShots(activeGameId));
        }
        renderStats();
        renderSecondary();
        if (isOwn) renderOwnGoalZone();
        if (entryOn) App.court.renderZones(courtSvg, isOwn ? 'own' : 'opp', pickZone);
      }

      function pickZone(zoneId, pos) {
        if (isOwn) App.ui.openShotModal({ rx: pos.rx, ry: pos.ry, gameId: activeGameId, position: zoneId }, refresh);
        else       App.ui.openOpponentShotModal({ rx: pos.rx, ry: pos.ry, gameId: activeGameId, position: zoneId }, refresh);
      }

      function renderStats() {
        const s = isOwn ? App.data.getShotStats(activeGameId) : App.data.getOpponentShotStats(activeGameId);
        const pct = s.total > 0 ? Math.round(s.goals / s.total * 100) : 0;
        document.getElementById('shot-stats-content').innerHTML = `
          <div class="stat-row" style="margin-bottom:16px;">
            <div class="stat-col"><span class="v">${s.total}</span><span class="l">Würfe</span></div>
            <div class="stat-col"><span class="v ${isOwn ? 'text-green' : 'text-red'}">${s.goals}</span><span class="l">Tore</span></div>
            <div class="stat-col"><span class="v">${pct}%</span><span class="l">Quote</span></div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <span class="badge" style="background:rgba(232,72,85,0.15);color:#e84855;">${s.misses} Fehlschüsse</span>
            <span class="badge" style="background:rgba(240,165,0,0.15);color:#f0a500;">${s.blocks} Geblockt</span>
            <span class="badge" style="background:rgba(74,144,217,0.15);color:#4a90d9;">${s.posts} Pfosten</span>
          </div>
        `;
      }

      function renderSecondary() {
        const host = document.getElementById('secondary-panel');
        if (isOwn) {
          // Player goals chart
          const pGoals = {};
          App.data.getShots(activeGameId).filter(s => s.outcome === 'goal').forEach(s => {
            pGoals[s.playerId] = (pGoals[s.playerId] || 0) + 1;
          });
          const players = App.data.getPlayers();
          const chartData = Object.entries(pGoals)
            .map(([id, g]) => ({ player: players.find(p => p.id == id), goals: g }))
            .filter(d => d.player)
            .sort((a, b) => b.goals - a.goals);

          host.className = 'chart-wrap';
          host.innerHTML = chartData.length > 0
            ? '<canvas id="player-goals-chart"></canvas>'
            : '<div class="text-muted" style="padding:20px;text-align:center">Noch keine Tore erfasst</div>';
          if (chartData.length > 0) {
            new Chart(document.getElementById('player-goals-chart').getContext('2d'), {
              type: 'bar',
              data: {
                labels: chartData.map(d => `#${d.player.number} ${d.player.name.split(' ')[0]}`),
                datasets: [{ data: chartData.map(d => d.goals), backgroundColor: 'rgba(63,185,104,0.7)', borderRadius: 4, label: 'Tore' }]
              },
              options: {
                responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
                  y: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { display: false } }
                }
              }
            });
          }
        } else {
          // Goal-zone heatmap (goalkeeper analysis)
          const gz = App.data.getGoalZoneStats(activeGameId, 'opp');
          host.className = '';
          if (gz.total === 0) {
            host.innerHTML = '<div class="text-muted" style="padding:20px;text-align:center">Noch keine Gegner-Tore mit Torzone erfasst.<br>Trage Gegner-Würfe mit Torzone ein (Spielmodus → Abwehr).</div>';
          } else {
            host.innerHTML = '<div class="goalzone-host"></div><div class="text-muted text-sm" style="text-align:center;margin-top:8px">Aus Sicht des Torwarts · Zahl = kassierte Tore</div>';
            host.querySelector('.goalzone-host').appendChild(App.court.buildGoalZoneGrid(gz));
          }
        }
      }

      function renderOwnGoalZone() {
        const host = document.getElementById('own-goalzone-panel');
        if (!host) return;
        const gz = App.data.getGoalZoneStats(activeGameId, 'own');
        if (gz.total === 0) {
          host.innerHTML = '<div class="text-muted" style="padding:20px;text-align:center">Noch keine eigenen Tore mit Torzone erfasst.<br>Trage Würfe im Spielmodus mit Torzone ein.</div>';
        } else {
          host.innerHTML = '<div class="goalzone-host"></div><div class="text-muted text-sm" style="text-align:center;margin-top:8px">Aus eigener Sicht · Zahl = erzielte Tore</div>';
          host.querySelector('.goalzone-host').appendChild(App.court.buildGoalZoneGrid(gz, '63,185,104'));
        }
      }

      refresh();

      // Entry — toggle the tappable zones on/off
      document.getElementById('btn-add-shot').addEventListener('click', function () {
        entryOn = !entryOn;
        this.textContent = entryOn ? '✓ Fertig' : (isOwn ? 'Wurf eintragen' : 'Gegner-Wurf eintragen');
        document.getElementById('entry-hint').style.display = entryOn ? 'block' : 'none';
        if (entryOn) App.court.renderZones(courtSvg, isOwn ? 'own' : 'opp', pickZone);
        else App.court.clearZones(courtSvg);
      });

      // Clear
      document.getElementById('btn-clear-shots').addEventListener('click', function () {
        const shots = isOwn ? App.data.getShots(activeGameId) : App.data.getOpponentShots(activeGameId);
        if (shots.length === 0) return;
        if (!confirm(`Alle ${shots.length} ${isOwn ? '' : 'Gegner-'}Würfe für dieses Spiel löschen?`)) return;
        shots.forEach(s => isOwn ? App.data.deleteShot(s.id) : App.data.deleteOpponentShot(s.id));
        refresh();
        App.ui.toast('Würfe gelöscht', 'ok');
      });
    }

    // ── Momentum ─────────────────────────────────────────────────────
    function renderMomentum() {
      const m   = App.data.getMomentumData(activeGameId);
      const run = App.data.getCurrentRun(activeGameId);
      const hot = App.data.getHotPlayer(activeGameId, 10);

      let runHtml;
      if (run.side === null) {
        runHtml = '<div class="text-muted">Noch keine Tore mit Minute erfasst</div>';
      } else if (run.count < 2) {
        runHtml = '<div class="text-muted">Aktuell kein Lauf — letzter Treffer wechselseitig</div>';
      } else {
        const own = run.side === 'own';
        runHtml = `<div class="run-indicator ${own ? 'run-own' : 'run-opp'}">
          ${own ? '🔥' : '⚠️'} ${own ? 'Ihr seid' : 'Gegner ist'} auf einem <strong>${run.count}:0-Lauf</strong>
        </div>`;
      }

      const hotHtml = hot
        ? `<div class="hot-player">
             <div class="hot-flame">🔥</div>
             <div>
               <div class="hot-name">#${hot.player.number} ${hot.player.name}</div>
               <div class="hot-sub">${hot.goals} ${hot.goals === 1 ? 'Tor' : 'Tore'} zwischen Min. ${hot.from} und ${hot.to}</div>
             </div>
           </div>`
        : '<div class="text-muted">Noch keine Spielerdaten in den letzten 10 Minuten</div>';

      body.innerHTML = `
        <div class="card">
          <div class="card-title">Momentum — Tordifferenz im Spielverlauf</div>
          ${m.length === 0
            ? '<div class="text-muted" style="padding:30px;text-align:center">Noch keine Tore mit Spielminute erfasst.<br>Trage im Spielmodus Würfe mit Minute ein, dann erscheint hier die Verlaufskurve.</div>'
            : '<div class="chart-wrap" style="height:260px"><canvas id="momentum-chart"></canvas></div><div class="text-muted text-sm" style="text-align:center;margin-top:6px">Kurve steigt → euer Lauf · Kurve fällt → Gegner drückt</div>'}
        </div>
        <div class="section" style="margin-top:24px;">
          <div class="grid-2">
            <div class="card"><div class="card-title">Aktueller Lauf</div>${runHtml}</div>
            <div class="card"><div class="card-title">Heißester Spieler (letzte 10 Min.)</div>${hotHtml}</div>
          </div>
        </div>
      `;

      if (m.length > 0) {
        const labels = ['0\'', ...m.map(d => d.minute + '\'')];
        const data   = [0, ...m.map(d => d.diff)];
        new Chart(document.getElementById('momentum-chart').getContext('2d'), {
          type: 'line',
          data: {
            labels,
            datasets: [{
              data, label: 'Differenz (wir − Gegner)',
              borderColor: '#3fb968', borderWidth: 2,
              backgroundColor: 'rgba(63,185,104,0.12)', fill: 'origin',
              tension: 0.25, pointRadius: 3, pointBackgroundColor: '#3fb968'
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: '#8b949e', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
              y: { ticks: { color: '#8b949e', font: { size: 11 }, stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.06)' } }
            }
          }
        });
      }
    }

    function render() {
      if (mode === 'momentum') renderMomentum();
      else renderShotChart(mode);
    }

    render();

    document.getElementById('analysis-game-select').addEventListener('change', function () {
      activeGameId = parseInt(this.value);
      render();
    });

    document.getElementById('analysis-mode').addEventListener('click', function (e) {
      const btn = e.target.closest('[data-mode]');
      if (!btn || btn.dataset.mode === mode) return;
      mode = btn.dataset.mode;
      this.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
      render();
    });
  }

  // ── Spielplan ────────────────────────────────────────────────────

  function renderSchedule(el) {
    const games = App.data.getGames();

    const tableRows = games.length === 0 ? `
      <tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-2)">Noch keine Spiele eingetragen</td></tr>
    ` : games.map(g => `
      <tr>
        <td>${dateFmt(g.date)}</td>
        <td><span class="badge ${g.homeAway === 'H' ? 'badge-home' : 'badge-away'}">${g.homeAway === 'H' ? 'Heim' : 'Auswärts'}</span></td>
        <td class="font-bold">${g.opponent}</td>
        <td>${g.played ? `<strong>${g.goalsFor}:${g.goalsAgainst}</strong>` : '–'}</td>
        <td>${resultBadge(g)}</td>
        <td>
          <div class="actions">
            <button class="btn btn-ghost btn-sm" data-action="edit-game" data-id="${g.id}">Bearb.</button>
            <button class="btn btn-danger btn-sm" data-action="delete-game" data-id="${g.id}">Löschen</button>
          </div>
        </td>
      </tr>
    `).join('');

    el.innerHTML = `
      <div class="section">
        <div class="card">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Heim/Auswärts</th>
                  <th>Gegner</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="games-table-body">${tableRows}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function gameFormHTML(game) {
    const g = game || {};
    return `
      <div class="form-group">
        <label>Datum</label>
        <input class="form-control" id="f-date" type="date" value="${g.date || ''}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Gegner</label>
          <input class="form-control" id="f-opponent" value="${g.opponent || ''}" placeholder="TSV Musterstadt">
        </div>
        <div class="form-group">
          <label>Heim / Auswärts</label>
          <select class="form-control" id="f-homeaway">
            <option value="H" ${g.homeAway === 'H' || !g.homeAway ? 'selected' : ''}>Heimspiel</option>
            <option value="A" ${g.homeAway === 'A' ? 'selected' : ''}>Auswärtsspiel</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label><input type="checkbox" id="f-played" ${g.played ? 'checked' : ''} style="margin-right:6px;">Spiel ausgetragen</label>
      </div>
      <div class="form-row" id="score-fields" style="${g.played ? '' : 'display:none'}">
        <div class="form-group">
          <label>Unsere Tore</label>
          <input class="form-control" id="f-goals-for" type="number" min="0" value="${g.goalsFor ?? ''}">
        </div>
        <div class="form-group">
          <label>Gegentore</label>
          <input class="form-control" id="f-goals-against" type="number" min="0" value="${g.goalsAgainst ?? ''}">
        </div>
      </div>
    `;
  }

  function collectGameForm() {
    const opponent = document.getElementById('f-opponent')?.value.trim();
    if (!opponent) { App.ui.toast('Bitte Gegner eingeben', 'err'); return null; }
    const played = document.getElementById('f-played')?.checked;
    return {
      date:          document.getElementById('f-date')?.value || '',
      opponent,
      homeAway:      document.getElementById('f-homeaway')?.value || 'H',
      played,
      goalsFor:      played ? parseInt(document.getElementById('f-goals-for')?.value) || 0 : null,
      goalsAgainst:  played ? parseInt(document.getElementById('f-goals-against')?.value) || 0 : null,
    };
  }

  function settingsFormHTML(team) {
    return `
      <div class="form-group">
        <label>Teamname</label>
        <input class="form-control" id="f-teamname" value="${team.name || ''}">
      </div>
      <div class="form-group">
        <label>Saison</label>
        <input class="form-control" id="f-season" value="${team.season || ''}" placeholder="2025/26">
      </div>
      <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:8px;">
        <div class="card-title" style="margin-bottom:12px">OpenLigaDB API (optional)</div>
        <div class="form-group">
          <label>Liga-Shortcut (z.B. hbl für HBL)</label>
          <input class="form-control" id="f-league" value="${team.apiLeagueId || ''}" placeholder="hbl">
        </div>
        <div class="form-group">
          <label>Team-ID</label>
          <input class="form-control" id="f-teamid" value="${team.apiTeamId || ''}" placeholder="123">
        </div>
      </div>
    `;
  }

  // ── Spielmodus (Live) ─────────────────────────────────────────────

  function renderLive(el) {
    const games = App.data.getGames();

    if (games.length === 0) {
      el.innerHTML = `<div class="empty">
        <h3>Kein Spiel vorhanden</h3>
        <p>Füge zuerst ein Spiel im Spielplan hinzu.</p>
        <button class="btn btn-primary" data-action="add-game">+ Spiel hinzufügen</button>
      </div>`;
      return;
    }

    const defaultGame = games.find(g => !g.played) || games[0];

    el.innerHTML = `
      <div class="live-wrap">
        <div class="live-game-bar">
          <select class="form-control live-game-select" id="live-game-select">
            ${games.map(g => `<option value="${g.id}" ${g.id === defaultGame.id ? 'selected' : ''}>${dateFmt(g.date)} – ${g.opponent}${g.played ? ' ✓' : ''}</option>`).join('')}
          </select>
        </div>

        <div class="live-header">
          <div class="live-score-wrap">
            <div class="live-score-side">
              <div class="live-score-label">Wir</div>
              <div class="live-opp-row">
                <button class="live-adj-btn" id="live-own-minus">−</button>
                <div class="live-score-num live-score-own" id="live-score-own">0</div>
                <button class="live-adj-btn" id="live-own-plus">+</button>
              </div>
            </div>
            <div class="live-score-sep">:</div>
            <div class="live-score-side">
              <div class="live-score-label">Gegner</div>
              <div class="live-opp-row">
                <button class="live-adj-btn" id="live-opp-minus">−</button>
                <div class="live-score-num live-score-opp" id="live-score-opp">0</div>
                <button class="live-adj-btn" id="live-opp-plus">+</button>
              </div>
            </div>
          </div>

          <div class="live-timer-wrap">
            <span class="live-hz-badge" id="live-hz-badge">1. HZ</span>
            <span class="live-timer-display" id="live-timer">0:00</span>
            <button class="live-ctrl-btn live-ctrl-play" id="live-timer-toggle" title="Start / Pause">▶</button>
            <button class="live-ctrl-btn live-ctrl-half" id="live-hz-toggle" title="2. Halbzeit starten">2. HZ</button>
          </div>
        </div>

        <div id="live-recent-wrap" class="live-recent-wrap">
          <div id="live-recent"></div>
        </div>
      </div>
    `;

    let currentGameId = defaultGame.id;

    const ts = App.live;

    function currentMinute() {
      return ts.timerSeconds > 0 ? Math.max(1, Math.ceil(ts.timerSeconds / 60)) : null;
    }

    function refreshScore() {
      const ownGoals = App.data.getShots(currentGameId).filter(s => s.outcome === 'goal').length;
      const oppGoals = App.data.getLiveGoalsAgainst(currentGameId);
      const ownEl = document.getElementById('live-score-own');
      const oppEl = document.getElementById('live-score-opp');
      if (ownEl) ownEl.textContent = ownGoals;
      if (oppEl) oppEl.textContent = oppGoals;
    }

    const OC_LABEL = { goal: 'Tor', miss: 'Fehlschuss', block: 'Geblockt', post: 'Pfosten' };

    function refreshRecent() {
      const host = document.getElementById('live-recent');
      if (!host) return;
      const ownShots = App.data.getShots(currentGameId).map(s => ({ ...s, side: 'own' }));
      const oppShots = App.data.getOpponentShots(currentGameId).map(s => ({ ...s, side: 'opp' }));
      const all = [...ownShots, ...oppShots].sort((a, b) => b.id - a.id).slice(0, 6);
      const players = App.data.getPlayers();

      if (all.length === 0) {
        host.innerHTML = '<div class="live-recent-empty">Noch keine Einträge — tippe ⚡ oder Gegner + zum Starten</div>';
        return;
      }

      host.innerHTML = `
        <div class="live-recent-header">Letzte Einträge</div>
        ${all.map(s => {
          const player = s.side === 'own' ? players.find(p => p.id === s.playerId) : null;
          const who = s.side === 'own'
            ? (player ? `#${player.number} ${player.name.split(' ')[0]}` : '–')
            : (s.opponentPlayer ? `Gegner ${s.opponentPlayer}` : 'Gegner');
          const posLabel = s.position ? ` · ${App.court.ZONE_LABELS[s.position] || s.position}` : '';
          const minLabel = s.minute ? `, ${s.minute}'` : '';
          return `<div class="live-recent-item">
            <span class="ri-icon ${s.side === 'own' ? 'ri-own' : 'ri-opp'}">${s.side === 'own' ? '⚡' : '🛡'}</span>
            <span class="ri-text">${who} — <strong>${OC_LABEL[s.outcome] || s.outcome}</strong>${posLabel}${minLabel}</span>
            <button class="ri-del" data-del-id="${s.id}" data-del-side="${s.side}">×</button>
          </div>`;
        }).join('')}
      `;
    }

    // Delete via event delegation on the stable wrapper
    document.getElementById('live-recent-wrap').addEventListener('click', e => {
      const btn = e.target.closest('[data-del-id]');
      if (!btn) return;
      const id = parseInt(btn.dataset.delId);
      if (btn.dataset.delSide === 'own') App.data.deleteShot(id);
      else App.data.deleteOpponentShot(id);
      refreshScore();
      refreshRecent();
    });

    // ── Timer ──────────────────────────────────────────────────────
    function fmtTime(s) {
      return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }

    function updateTimerUI() {
      const t   = document.getElementById('live-timer');
      const btn = document.getElementById('live-timer-toggle');
      const hz  = document.getElementById('live-hz-badge');
      const hz2 = document.getElementById('live-hz-toggle');
      if (t)   t.textContent   = fmtTime(ts.timerSeconds);
      if (btn) btn.textContent = ts.timerRunning ? '⏸' : '▶';
      if (hz)  hz.textContent  = ts.timerHalf + '. HZ';
      if (hz2) hz2.style.display = ts.timerHalf === 1 ? '' : 'none';
    }

    function startTimer() {
      if (ts.timerInterval) return;
      ts.timerInterval = setInterval(() => {
        ts.timerSeconds++;
        const t = document.getElementById('live-timer');
        if (t) t.textContent = fmtTime(ts.timerSeconds);
      }, 1000);
    }

    if (ts.timerRunning && !ts.timerInterval) startTimer();
    updateTimerUI();
    refreshScore();
    refreshRecent();

    document.getElementById('live-timer-toggle').addEventListener('click', () => {
      ts.timerRunning = !ts.timerRunning;
      if (ts.timerRunning) startTimer();
      else { clearInterval(ts.timerInterval); ts.timerInterval = null; }
      updateTimerUI();
    });

    document.getElementById('live-hz-toggle').addEventListener('click', () => {
      clearInterval(ts.timerInterval);
      ts.timerInterval = null;
      ts.timerRunning  = false;
      ts.timerSeconds  = 0;
      ts.timerHalf     = 2;
      updateTimerUI();
    });

    // ── Opponent score ─────────────────────────────────────────────
    document.getElementById('live-opp-minus').addEventListener('click', () => {
      App.data.setLiveGoalsAgainst(currentGameId, App.data.getLiveGoalsAgainst(currentGameId) - 1);
      refreshScore();
    });

    // Wir + → attack modal · Wir − → letztes Tor rückgängig
    document.getElementById('live-own-plus').addEventListener('click', () => {
      openAttackModal(currentGameId, currentMinute());
    });
    document.getElementById('live-own-minus').addEventListener('click', () => {
      const goals = App.data.getShots(currentGameId).filter(s => s.outcome === 'goal');
      if (goals.length === 0) return;
      App.data.deleteShot(goals[goals.length - 1].id);
      refreshScore();
      refreshRecent();
      App.ui.toast('Letztes Tor rückgängig', 'inf');
    });

    // Gegner + → defense modal; Zähler steigt nur bei gespeichertem Tor
    document.getElementById('live-opp-plus').addEventListener('click', () => {
      openDefenseModal(currentGameId, currentMinute());
    });

    // ── Game select ────────────────────────────────────────────────
    document.getElementById('live-game-select').addEventListener('change', function () {
      currentGameId = parseInt(this.value);
      refreshScore();
      refreshRecent();
    });

    // ── Attack modal ───────────────────────────────────────────────
    const GOAL_TARGET_ZONES = [
      { id:'tl', label:'OL' }, { id:'tm', label:'OM' }, { id:'tr', label:'OR' },
      { id:'ml', label:'ML' }, { id:'mm', label:'MM' }, { id:'mr', label:'MR' },
      { id:'bl', label:'UL' }, { id:'bm', label:'UM' }, { id:'br', label:'UR' },
    ];

    function openAttackModal(gameId, autoMinute) {
      const players = App.data.getPlayers();
      let selectedPlayerId = null;
      let selectedOutcome  = null;
      let selectedPosition = null;
      let selectedGoalZone = null;

      const html = `
        <div class="form-group">
          <label>Position (Wurfort)</label>
          <div class="live-court-wrap" id="lm-court-wrap"></div>
        </div>
        ${players.length > 0 ? `
        <div class="form-group">
          <label>Spieler</label>
          <div class="live-player-grid" id="lm-players">
            ${players.map(p => `
              <button class="live-player-btn" data-pid="${p.id}">
                <span class="pnum">${p.number}</span>
                <span class="pname">${(p.firstname || p.name.split(' ')[0]).substring(0, 8)}</span>
              </button>`).join('')}
          </div>
        </div>` : ''}
        <div class="form-group">
          <label>Ergebnis</label>
          <div class="outcome-btn-group">
            <button class="outcome-btn ob-goal"  data-oc="goal">Tor</button>
            <button class="outcome-btn ob-miss"  data-oc="miss">Fehlschuss</button>
            <button class="outcome-btn ob-block" data-oc="block">Geblockt</button>
            <button class="outcome-btn ob-post"  data-oc="post">Pfosten</button>
          </div>
        </div>
        <div class="form-group">
          <label>Torzone (wohin geworfen, aus eigener Sicht)</label>
          <div class="goal-zone-grid">
            ${GOAL_TARGET_ZONES.map(z => `<button class="gz-btn" data-zone="${z.id}">${z.label}</button>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>Minute</label>
          <input class="form-control" id="lm-minute" type="number" min="1" max="60" value="${autoMinute || ''}">
        </div>
        <div class="form-actions">
          <button class="btn btn-outline" onclick="App.ui.closeModal()">Abbrechen</button>
          <button class="btn btn-primary" id="lm-save" style="flex:1;padding:10px;font-size:14px">Speichern</button>
        </div>`;

      App.ui.openModal('Wurf eintragen', html);

      setTimeout(() => {
        // Halbkreis-Spielfeld als Positions-Picker (statt Buttons)
        const courtSvg = App.court.build();
        document.getElementById('lm-court-wrap').appendChild(courtSvg);
        App.court.renderZones(courtSvg, 'own', zoneId => {
          selectedPosition = zoneId;
          courtSvg.querySelectorAll('.zone-chip').forEach(c => c.classList.toggle('selected', c.dataset.zone === zoneId));
        });

        document.getElementById('lm-players')?.addEventListener('click', e => {
          const btn = e.target.closest('[data-pid]');
          if (!btn) return;
          selectedPlayerId = parseInt(btn.dataset.pid);
          document.querySelectorAll('.live-player-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        });

        document.querySelectorAll('.outcome-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            selectedOutcome = btn.dataset.oc;
            document.querySelectorAll('.outcome-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
          });
        });

        document.querySelectorAll('.goal-zone-grid .gz-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            selectedGoalZone = btn.dataset.zone;
            document.querySelectorAll('.goal-zone-grid .gz-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
          });
        });

        document.getElementById('lm-save')?.addEventListener('click', () => {
          if (!selectedOutcome) { App.ui.toast('Bitte Ergebnis wählen', 'err'); return; }
          const pos = selectedPosition ? App.court.zoneCenterRel(selectedPosition, 'own') : { rx: 0.75, ry: 0.5 };
          const minute = parseInt(document.getElementById('lm-minute')?.value) || null;
          App.data.addShot({ gameId, playerId: selectedPlayerId, outcome: selectedOutcome, minute, rx: pos.rx, ry: pos.ry, position: selectedPosition, goalZone: selectedGoalZone });
          App.ui.closeModal();
          App.ui.toast('Wurf gespeichert', 'ok');
          refreshScore();
          refreshRecent();
        });
      }, 0);
    }

    // ── Defense modal (with opponent roster) ──────────────────────
    function openDefenseModal(gameId, autoMinute) {
      let selectedOutcome   = null;
      let selectedZone      = null;
      let selectedOppPlayer = null;

      const ZONES = [
        { id:'tl', label:'OL' }, { id:'tm', label:'OM' }, { id:'tr', label:'OR' },
        { id:'ml', label:'ML' }, { id:'mm', label:'MM' }, { id:'mr', label:'MR' },
        { id:'bl', label:'UL' }, { id:'bm', label:'UM' }, { id:'br', label:'UR' },
      ];

      const html = `
        <div class="form-group">
          <label>Gegner-Spieler</label>
          <div id="opp-player-wrap">
            <div class="opp-roster-row" id="opp-roster-chips"></div>
            <div class="opp-add-row" id="opp-add-row" style="display:none">
              <input class="form-control" id="opp-new-player" placeholder="Nr. oder Name" maxlength="20" style="flex:1">
              <button class="btn btn-primary btn-sm" id="btn-add-confirm">OK</button>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>Ergebnis</label>
          <div class="outcome-btn-group">
            <button class="outcome-btn ob-goal"  data-oc="goal">Tor</button>
            <button class="outcome-btn ob-miss"  data-oc="miss">Fehlschuss</button>
            <button class="outcome-btn ob-block" data-oc="block">Geblockt</button>
            <button class="outcome-btn ob-post"  data-oc="post">Pfosten</button>
          </div>
        </div>
        <div class="form-group">
          <label>Torzone (aus Torwart-Sicht)</label>
          <div class="goal-zone-grid">
            ${ZONES.map(z => `<button class="gz-btn" data-zone="${z.id}">${z.label}</button>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>Minute</label>
          <input class="form-control" id="lm-minute" type="number" min="1" max="60" value="${autoMinute || ''}">
        </div>
        <div class="form-actions">
          <button class="btn btn-outline" onclick="App.ui.closeModal()">Abbrechen</button>
          <button class="btn btn-primary" id="lm-save" style="flex:1;padding:10px;font-size:14px">Speichern</button>
        </div>`;

      App.ui.openModal('Gegner-Wurf eintragen', html);

      setTimeout(() => {
        function buildRosterChips() {
          const roster = App.data.getOpponentRoster(gameId);
          const chips = document.getElementById('opp-roster-chips');
          if (!chips) return;
          chips.innerHTML = roster.map((name, i) =>
            `<button class="opp-roster-btn${selectedOppPlayer === name ? ' selected' : ''}" data-name="${name}" data-idx="${i}">${name}</button>`
          ).join('') + '<button class="opp-roster-add" id="btn-opp-add">+ Hinzufügen</button>';
        }
        buildRosterChips();

        // Player select + add button via delegation on stable wrapper
        document.getElementById('opp-player-wrap').addEventListener('click', e => {
          if (e.target.id === 'btn-opp-add') {
            document.getElementById('opp-add-row').style.display = 'flex';
            document.getElementById('opp-new-player')?.focus();
            return;
          }
          const btn = e.target.closest('.opp-roster-btn');
          if (btn) {
            selectedOppPlayer = selectedOppPlayer === btn.dataset.name ? null : btn.dataset.name;
            buildRosterChips();
          }
        });

        document.getElementById('btn-add-confirm')?.addEventListener('click', () => {
          const name = document.getElementById('opp-new-player')?.value.trim();
          if (!name) return;
          App.data.addOpponentPlayer(gameId, name);
          document.getElementById('opp-new-player').value = '';
          document.getElementById('opp-add-row').style.display = 'none';
          buildRosterChips();
        });

        document.querySelectorAll('.outcome-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            selectedOutcome = btn.dataset.oc;
            document.querySelectorAll('.outcome-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
          });
        });

        document.querySelectorAll('.gz-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            selectedZone = btn.dataset.zone;
            document.querySelectorAll('.gz-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
          });
        });

        document.getElementById('lm-save')?.addEventListener('click', () => {
          if (!selectedOutcome) { App.ui.toast('Bitte Ergebnis wählen', 'err'); return; }
          const minute = parseInt(document.getElementById('lm-minute')?.value) || null;
          App.data.addOpponentShot({ gameId, opponentPlayer: selectedOppPlayer, outcome: selectedOutcome, minute, rx: 0.25, ry: 0.5, goalZone: selectedZone });
          if (selectedOutcome === 'goal') {
            App.data.setLiveGoalsAgainst(gameId, App.data.getLiveGoalsAgainst(gameId) + 1);
          }
          App.ui.closeModal();
          App.ui.toast('Gegner-Wurf gespeichert', 'ok');
          refreshScore();
          refreshRecent();
        });
      }, 0);
    }
  }

  // ── Spieler-Statistiken ──────────────────────────────────────

  function renderStats(el) {
    const players = App.data.getPlayers();

    if (players.length === 0) {
      el.innerHTML = `<div class="empty"><h3>Keine Spieler im Kader</h3><p>Füge zuerst Spieler im Kader hinzu.</p></div>`;
      return;
    }

    let statsData = App.data.getPlayerSeasonStats();
    let sortKey   = 'goals';
    let sortAsc   = false;

    const COLS = [
      { key: 'number',      label: '#'       },
      { key: 'name',        label: 'Name'    },
      { key: 'position',    label: 'Pos'     },
      { key: 'shots',       label: 'Würfe'   },
      { key: 'goals',       label: 'Tore'    },
      { key: 'pct',         label: 'Quote'   },
      { key: 'assists',     label: 'Assists'  },
      { key: 'yellowCards', label: '2min'    },
      { key: 'redCards',    label: 'Rot'     },
    ];

    function getSortVal(row, key) {
      if (key === 'number')   return row.player.number || 0;
      if (key === 'name')     return row.player.name || '';
      if (key === 'position') return row.player.position || '';
      if (key === 'pct')      return row.pct != null ? row.pct : -1;
      return row[key] != null ? row[key] : 0;
    }

    function renderTable() {
      const wrap = document.getElementById('stats-table-wrap');
      if (!wrap) return;

      const sorted = [...statsData].sort((a, b) => {
        const av = getSortVal(a, sortKey);
        const bv = getSortVal(b, sortKey);
        if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        return sortAsc ? av - bv : bv - av;
      });

      const thead = COLS.map(c => {
        const active = c.key === sortKey;
        const arrow  = active ? (sortAsc ? ' ↑' : ' ↓') : '';
        return `<th class="sortable${active ? ' sort-active' : ''}" data-sort="${c.key}">${c.label}${arrow}</th>`;
      }).join('');

      const tbody = sorted.map(row => `
        <tr class="clickable" data-player-id="${row.player.id}">
          <td>${row.player.number || '–'}</td>
          <td class="font-bold">${row.player.name}</td>
          <td>${row.player.position || '–'}</td>
          <td>${row.shots}</td>
          <td class="${row.goals > 0 ? 'text-green font-bold' : ''}">${row.goals}</td>
          <td>${row.pct != null ? row.pct + '%' : '–'}</td>
          <td>${row.assists}</td>
          <td>${row.yellowCards > 0 ? `<span class="text-yellow">${row.yellowCards}</span>` : 0}</td>
          <td>${row.redCards > 0 ? `<span class="text-red">${row.redCards}</span>` : 0}</td>
        </tr>`).join('');

      wrap.innerHTML = `<table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`;
    }

    el.innerHTML = `
      <div class="section">
        <div class="card">
          <div class="table-wrap" id="stats-table-wrap"></div>
        </div>
      </div>
    `;

    renderTable();

    const STAT_ZONE_LABELS = { la:'LA', hld:'HL fern', hl1:'HL 1:1', md:'M fern', m1:'M 1:1', p7:'7m', km:'Kreis', hr1:'HR 1:1', hrd:'HR fern', ra:'RA' };
    const ZONE_ORDER = ['la','hld','hl1','md','m1','p7','km','hr1','hrd','ra'];

    document.getElementById('stats-table-wrap').addEventListener('click', e => {
      const th = e.target.closest('th.sortable');
      if (th) {
        const key = th.dataset.sort;
        if (key === sortKey) sortAsc = !sortAsc;
        else { sortKey = key; sortAsc = false; }
        renderTable();
        return;
      }
      const tr = e.target.closest('tr.clickable');
      if (tr) openPlayerDetail(parseInt(tr.dataset.playerId));
    });

    function openPlayerDetail(playerId) {
      const row = statsData.find(r => r.player.id === playerId);
      if (!row) return;
      const player   = row.player;
      const gameStat = App.data.getPlayerGameStats(playerId);

      const allShots = App.data.getShots().filter(s => s.playerId === playerId && s.position);
      const zoneTally = {};
      ZONE_ORDER.forEach(z => { zoneTally[z] = 0; });
      allShots.forEach(s => { if (zoneTally[s.position] != null) zoneTally[s.position]++; });
      const zoneData = ZONE_ORDER.filter(z => zoneTally[z] > 0);

      const gameTableHtml = gameStat.length === 0
        ? '<div class="text-muted text-sm" style="margin-bottom:16px">Noch keine Wurfeinträge vorhanden</div>'
        : `<div class="card-title" style="margin-bottom:8px">Pro Spiel</div>
           <div class="table-wrap" style="margin-bottom:20px">
             <table>
               <thead><tr><th>Gegner</th><th>Würfe</th><th>Tore</th><th>Quote</th></tr></thead>
               <tbody>${gameStat.map(gs => `
                 <tr>
                   <td>${gs.game.opponent}</td>
                   <td>${gs.shots}</td>
                   <td class="text-green">${gs.goals}</td>
                   <td>${gs.pct != null ? gs.pct + '%' : '–'}</td>
                 </tr>`).join('')}
               </tbody>
             </table>
           </div>`;

      const zoneChartHtml = zoneData.length > 0
        ? `<div class="card-title" style="margin-bottom:8px">Würfe nach Zone</div>
           <div class="chart-wrap" style="height:${Math.min(zoneData.length * 32 + 20, 280)}px"><canvas id="player-zone-chart"></canvas></div>`
        : '';

      const html = `
        <div class="text-muted text-sm" style="margin-bottom:16px">#${player.number || '–'} · ${POS_LABELS[player.position] || player.position || '–'}</div>
        <div class="stat-row" style="flex-wrap:wrap;gap:12px;margin-bottom:20px;">
          <div class="stat-col"><span class="v">${row.shots}</span><span class="l">Würfe</span></div>
          <div class="stat-col"><span class="v text-green">${row.goals}</span><span class="l">Tore</span></div>
          <div class="stat-col"><span class="v">${row.pct != null ? row.pct + '%' : '–'}</span><span class="l">Quote</span></div>
          <div class="stat-col"><span class="v">${row.assists}</span><span class="l">Assists</span></div>
          <div class="stat-col"><span class="v ${row.yellowCards > 0 ? 'text-yellow' : ''}">${row.yellowCards}</span><span class="l">2min</span></div>
          <div class="stat-col"><span class="v ${row.redCards > 0 ? 'text-red' : ''}">${row.redCards}</span><span class="l">Rot</span></div>
        </div>
        ${gameTableHtml}
        ${zoneChartHtml}
      `;

      App.ui.openModal(player.name, html);

      if (zoneData.length > 0) {
        setTimeout(() => {
          const ctx = document.getElementById('player-zone-chart');
          if (!ctx) return;
          new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
              labels: zoneData.map(z => STAT_ZONE_LABELS[z] || z),
              datasets: [{ data: zoneData.map(z => zoneTally[z]), backgroundColor: 'rgba(63,185,104,0.7)', borderRadius: 4, label: 'Würfe' }]
            },
            options: {
              responsive: true, maintainAspectRatio: false, indexAxis: 'y',
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
                y: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { display: false } }
              }
            }
          });
        }, 0);
      }
    }
  }

  return {
    renderDashboard,
    renderSquad,
    renderAnalysis,
    renderSchedule,
    renderLive,
    renderStats,
    playerFormHTML,
    collectPlayerForm,
    gameFormHTML,
    collectGameForm,
    settingsFormHTML,
    POS_LABELS,
    dateFmt
  };
})();
