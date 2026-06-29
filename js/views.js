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
    const games   = App.data.getGames().filter(g => g.played);
    const players = App.data.getPlayers();

    if (games.length === 0) {
      el.innerHTML = `<div class="empty"><h3>Keine gespielten Spiele</h3>
        <p>Trage zuerst Spielergebnisse im Spielplan ein.</p></div>`;
      return;
    }

    const firstGame = games[0];

    el.innerHTML = `
      <div class="section">
        <div class="court-wrap">
          <div class="court-controls">
            <select class="form-control" id="analysis-game-select" style="max-width:260px;">
              ${games.map(g => `<option value="${g.id}">${dateFmt(g.date)} – ${g.opponent} (${g.goalsFor}:${g.goalsAgainst})</option>`).join('')}
            </select>
            <button class="btn btn-primary" id="btn-add-shot">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>
              Wurf eintragen
            </button>
            <button class="btn btn-outline" id="btn-clear-shots">Alle löschen</button>
            <div id="entry-hint" style="font-size:12px;color:var(--text-2);display:none;">Auf das Spielfeld klicken → Wurfposition wählen</div>
          </div>

          <div id="court-container"></div>

          <div class="shot-legend mt-10">
            <div class="legend-item"><div class="legend-dot" style="background:#3fb968"></div>Tor</div>
            <div class="legend-item"><div class="legend-dot" style="background:#e84855"></div>Fehlschuss</div>
            <div class="legend-item"><div class="legend-dot" style="background:#f0a500"></div>Geblockt</div>
            <div class="legend-item"><div class="legend-dot" style="background:#4a90d9"></div>Pfosten</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="grid-2">
          <div class="card">
            <div class="card-title">Wurfstatistik</div>
            <div id="shot-stats-content"></div>
          </div>
          <div class="card">
            <div class="card-title">Tore nach Spieler</div>
            <div class="chart-wrap" id="player-goals-wrap"><canvas id="player-goals-chart"></canvas></div>
          </div>
        </div>
      </div>
    `;

    let courtSvg = App.court.build();
    document.getElementById('court-container').appendChild(courtSvg);

    let activeGameId = firstGame.id;
    let entryMode = false;

    function refreshCourt() {
      const shots   = App.data.getShots(activeGameId);
      const players = App.data.getPlayers();
      App.court.renderShots(courtSvg, shots, players);
      renderShotStats(activeGameId);
    }

    function renderShotStats(gameId) {
      const s = App.data.getShotStats(gameId);
      const pct = s.total > 0 ? Math.round(s.goals / s.total * 100) : 0;
      document.getElementById('shot-stats-content').innerHTML = `
        <div class="stat-row" style="margin-bottom:16px;">
          <div class="stat-col"><span class="v">${s.total}</span><span class="l">Würfe</span></div>
          <div class="stat-col"><span class="v text-green">${s.goals}</span><span class="l">Tore</span></div>
          <div class="stat-col"><span class="v">${pct}%</span><span class="l">Wurfquote</span></div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <span class="badge" style="background:rgba(232,72,85,0.15);color:#e84855;">${s.misses} Fehlschüsse</span>
          <span class="badge" style="background:rgba(240,165,0,0.15);color:#f0a500;">${s.blocks} Geblockt</span>
          <span class="badge" style="background:rgba(74,144,217,0.15);color:#4a90d9;">${s.posts} Pfosten</span>
        </div>
      `;

      // Player goals chart
      const allShots = App.data.getShots(gameId);
      const pGoals = {};
      allShots.filter(s => s.outcome === 'goal').forEach(s => {
        pGoals[s.playerId] = (pGoals[s.playerId] || 0) + 1;
      });
      const players = App.data.getPlayers();
      const chartData = Object.entries(pGoals)
        .map(([id, g]) => ({ player: players.find(p => p.id == id), goals: g }))
        .filter(d => d.player)
        .sort((a, b) => b.goals - a.goals);

      const wrap = document.getElementById('player-goals-wrap');
      if (wrap) {
        // Always reset to fresh canvas to avoid stale Chart.js instances
        wrap.innerHTML = chartData.length > 0
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
      }
    }

    refreshCourt();

    // Game selector
    document.getElementById('analysis-game-select').addEventListener('change', function () {
      activeGameId = parseInt(this.value);
      refreshCourt();
    });

    // Add shot button → entry mode (one-shot: mode resets as soon as field is clicked)
    document.getElementById('btn-add-shot').addEventListener('click', function () {
      if (entryMode) return;
      entryMode = true;
      this.textContent = '…klicke auf das Feld';
      this.disabled = true;
      document.getElementById('entry-hint').style.display = 'block';

      App.court.enableEntry(courtSvg, function ({ rx, ry }) {
        // Reset button immediately on field click (before modal opens)
        entryMode = false;
        const btn = document.getElementById('btn-add-shot');
        if (btn) { btn.textContent = 'Wurf eintragen'; btn.disabled = false; }
        const hint = document.getElementById('entry-hint');
        if (hint) hint.style.display = 'none';

        App.ui.openShotModal({ rx, ry, gameId: activeGameId }, function () {
          refreshCourt();
        });
      });
    });

    // Clear shots
    document.getElementById('btn-clear-shots').addEventListener('click', function () {
      const shots = App.data.getShots(activeGameId);
      if (shots.length === 0) return;
      if (!confirm(`Alle ${shots.length} Würfe für dieses Spiel löschen?`)) return;
      shots.forEach(s => App.data.deleteShot(s.id));
      refreshCourt();
      App.ui.toast('Würfe gelöscht', 'ok');
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

  return {
    renderDashboard,
    renderSquad,
    renderAnalysis,
    renderSchedule,
    playerFormHTML,
    collectPlayerForm,
    gameFormHTML,
    collectGameForm,
    settingsFormHTML,
    POS_LABELS,
    dateFmt
  };
})();
