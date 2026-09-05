// data.js — localStorage-basierter Datenspeicher
window.App = window.App || {};

App.data = (function () {
  const KEY = 'hb_data_v1';

  const DEFAULTS = {
    // halfMinutes: Länge einer Halbzeit. 30 bei Erwachsenen und A/B-Jugend,
    // darunter kürzer (D-Jugend z.B. 2×20) — deshalb einstellbar.
    team: { name: 'Meine Mannschaft', season: '2025/26', apiLeagueId: '', apiTeamId: '', halfMinutes: 30 },
    players: [],
    games: [],
    shots: [],
    opponentShots: [],
    _seq: { player: 1, game: 1, shot: 1, oppShot: 1 }
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Ensure _seq exists (migration guard)
        if (!parsed._seq) parsed._seq = { player: 1, game: 1, shot: 1, oppShot: 1 };
        if (!parsed._seq.oppShot) parsed._seq.oppShot = 1;
        if (!parsed.opponentShots) parsed.opponentShots = [];
        return parsed;
      }
    } catch (e) { /* ignore */ }
    return JSON.parse(JSON.stringify(DEFAULTS));
  }

  function persist(s) {
    localStorage.setItem(KEY, JSON.stringify(s));
  }

  let state = load();

  function nextId(type) {
    const id = state._seq[type]++;
    persist(state);
    return id;
  }

  const api = {
    // ── Team ─────────────────────────────────────────────
    getTeam()       { return { ...state.team }; },
    setTeam(data)   { state.team = { ...state.team, ...data }; persist(state); },

    // ── Players ──────────────────────────────────────────
    getPlayers()    { return [...state.players]; },
    getPlayer(id)   { return state.players.find(p => p.id === id) || null; },

    addPlayer(data) {
      const p = { id: nextId('player'), goals: 0, assists: 0, saves: 0, yellowCards: 0, redCards: 0, minutesPlayed: 0, ...data };
      state.players.push(p);
      persist(state);
      return p;
    },

    updatePlayer(id, data) {
      const i = state.players.findIndex(p => p.id === id);
      if (i < 0) return null;
      state.players[i] = { ...state.players[i], ...data };
      persist(state);
      return state.players[i];
    },

    deletePlayer(id) {
      state.players = state.players.filter(p => p.id !== id);
      persist(state);
    },

    /**
     * Kader aus CSV übernehmen. Bekannte Spieler werden aktualisiert statt
     * doppelt angelegt — so kann man eine korrigierte Liste einfach erneut
     * hochladen. Erkannt wird über die Handball-ID (stabil, falls vorhanden),
     * sonst über den Namen. Bewusst NICHT über die Rückennummer: die wechselt,
     * und dann stünde derselbe Spieler zweimal im Kader.
     * Erfasste Statistiken (Tore, Strafen …) bleiben unangetastet.
     */
    importPlayers(players) {
      let added = 0;
      let updated = 0;

      players.forEach(incoming => {
        const key = String(incoming.handballId || '').trim().toLowerCase();
        const name = String(incoming.name || '').trim().toLowerCase();

        const existing = state.players.find(p => {
          const pKey = String(p.handballId || '').trim().toLowerCase();
          if (key && pKey) return pKey === key;
          return String(p.name || '').trim().toLowerCase() === name;
        });

        if (existing) {
          Object.assign(existing, {
            name:       incoming.name,
            firstname:  incoming.firstname,
            lastname:   incoming.lastname,
            number:     incoming.number,
            position:   incoming.position,
            handballId: incoming.handballId || existing.handballId || '',
          });
          updated++;
        } else {
          this.addPlayer(incoming);
          added++;
        }
      });

      persist(state);
      return { added, updated };
    },

    // ── Games ─────────────────────────────────────────────
    getGames() {
      return [...state.games].sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    getGame(id) { return state.games.find(g => g.id === id) || null; },

    addGame(data) {
      const g = { id: nextId('game'), played: false, goalsFor: null, goalsAgainst: null, ...data };
      state.games.push(g);
      persist(state);
      return g;
    },

    updateGame(id, data) {
      const i = state.games.findIndex(g => g.id === id);
      if (i < 0) return null;
      state.games[i] = { ...state.games[i], ...data };
      persist(state);
      return state.games[i];
    },

    deleteGame(id) {
      state.games = state.games.filter(g => g.id !== id);
      state.shots = state.shots.filter(s => s.gameId !== id);
      state.opponentShots = state.opponentShots.filter(s => s.gameId !== id);
      persist(state);
    },

    // Import games from API oder CSV (überspringt Spiele, die schon vorhanden sind)
    importGames(games) {
      let added = 0;
      games.forEach(g => {
        // API-Spiele erkennt man an der apiId; CSV-Spiele haben keine, deshalb
        // dort zusätzlich über Datum + Gegner prüfen (macht die CSV wiederholt
        // hochladbar, ohne Dubletten zu erzeugen).
        const duplicate = g.apiId
          ? state.games.some(eg => eg.apiId === g.apiId)
          : state.games.some(eg =>
              eg.date === g.date &&
              String(eg.opponent).trim().toLowerCase() === String(g.opponent).trim().toLowerCase()
            );
        if (duplicate) return;
        state.games.push({ id: nextId('game'), ...g });
        added++;
      });
      persist(state);
      return added;
    },

    // ── Spieltagskader und Start 7 ────────────────────────
    //
    // Pro Spiel zwei Listen von Spieler-IDs auf dem Spiel-Objekt:
    //   squad    — wer heute ueberhaupt dabei ist
    //   starters — die Anfangsformation
    // Fehlt eine (Altdaten oder noch nicht gesetzt), gilt der komplette
    // Kader bzw. keine Start 7 — bestehende Spiele aendern sich dadurch nicht.

    /** Spieler, die an diesem Spiel teilnehmen. Ohne gesetzten Kader: alle. */
    getMatchdaySquad(gameId) {
      const game = state.games.find(g => g.id === gameId);
      const all = [...state.players];
      if (!game || !Array.isArray(game.squad)) return all;
      // Nach IDs filtern statt die IDs zu mappen: geloeschte Spieler fallen
      // so von selbst raus, und die Kader-Reihenfolge bleibt die des Kaders.
      return all.filter(p => game.squad.includes(p.id));
    },

    /** true, wenn fuer dieses Spiel ueberhaupt ein Kader festgelegt wurde. */
    hasMatchdaySquad(gameId) {
      const game = state.games.find(g => g.id === gameId);
      return Boolean(game && Array.isArray(game.squad));
    },

    setMatchdaySquad(gameId, playerIds) {
      const game = state.games.find(g => g.id === gameId);
      if (!game) return null;
      game.squad = [...playerIds];
      persist(state);
      return game.squad;
    },

    /** Anfangsformation. Ohne gesetzte Start 7 eine leere Liste. */
    getStarters(gameId) {
      const game = state.games.find(g => g.id === gameId);
      if (!game || !Array.isArray(game.starters)) return [];
      // Gleiche Filterrichtung wie beim Kader: geloeschte Spieler fallen raus.
      return state.players.filter(p => game.starters.includes(p.id));
    },

    hasStarters(gameId) {
      const game = state.games.find(g => g.id === gameId);
      return Boolean(game && Array.isArray(game.starters) && game.starters.length > 0);
    },

    setStarters(gameId, playerIds) {
      const game = state.games.find(g => g.id === gameId);
      if (!game) return null;
      game.starters = [...playerIds];
      persist(state);
      return game.starters;
    },

    /**
     * Vorschlag beim ersten Oeffnen: die Liste des zuletzt gespielten Spiels
     * DAVOR. So hakt man nur die Aenderungen ab, statt jedes Mal von vorn
     * auszuwaehlen. Bewusst nur rueckwaerts: zoege ein frueheres Spiel seine
     * Aufstellung aus einem spaeteren, waere die Rueckschau falsch.
     *
     * @param {'squad'|'starters'} feld
     * @param {number[]} fallback  Ergebnis, wenn es kein frueheres Spiel gibt.
     */
    suggestFromPreviousGame(gameId, feld, fallback) {
      const game = state.games.find(g => g.id === gameId);
      if (!game) return fallback;

      const frueher = state.games
        .filter(g => g.id !== gameId && Array.isArray(g[feld]) && g.date && g.date <= game.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

      if (!frueher) return fallback;
      // Nur noch existierende Spieler uebernehmen.
      const vorhanden = new Set(state.players.map(p => p.id));
      return frueher[feld].filter(id => vorhanden.has(id));
    },

    /** Ohne frueheres Spiel zaehlt der ganze Kader. */
    suggestMatchdaySquad(gameId) {
      return this.suggestFromPreviousGame(gameId, 'squad', state.players.map(p => p.id));
    },

    /** Ohne frueheres Spiel bleibt die Start 7 leer — raten waere hier falsch. */
    suggestStarters(gameId) {
      return this.suggestFromPreviousGame(gameId, 'starters', []);
    },

    // ── Shots ─────────────────────────────────────────────
    getShots(gameId) {
      return gameId != null
        ? state.shots.filter(s => s.gameId === gameId)
        : [...state.shots];
    },

    addShot(data) {
      const s = { id: nextId('shot'), ...data };
      state.shots.push(s);
      persist(state);
      return s;
    },

    deleteShot(id) {
      state.shots = state.shots.filter(s => s.id !== id);
      persist(state);
    },

    // ── Computed stats ────────────────────────────────────
    getSeasonStats() {
      const played = state.games.filter(g => g.played);
      const wins   = played.filter(g => g.goalsFor >  g.goalsAgainst).length;
      const draws  = played.filter(g => g.goalsFor === g.goalsAgainst).length;
      const losses = played.filter(g => g.goalsFor <  g.goalsAgainst).length;
      const goalsFor     = played.reduce((s, g) => s + (g.goalsFor     || 0), 0);
      const goalsAgainst = played.reduce((s, g) => s + (g.goalsAgainst || 0), 0);
      const points = wins * 2 + draws;
      return { total: played.length, wins, draws, losses, goalsFor, goalsAgainst, points };
    },

    getTopScorer() {
      const tally = {};
      state.shots.filter(s => s.outcome === 'goal').forEach(s => {
        tally[s.playerId] = (tally[s.playerId] || 0) + 1;
      });
      const topId = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
      if (!topId) return null;
      const player = state.players.find(p => p.id == topId);
      return player ? { player, goals: tally[topId] } : null;
    },

    /** Halbzeitlänge in Sekunden — Altdaten ohne Einstellung zählen als 30 Minuten. */
    getHalfSeconds() {
      const min = parseInt(state.team?.halfMinutes, 10);
      return (Number.isFinite(min) && min > 0 ? min : 30) * 60;
    },

    /**
     * Torschützen EINES Spiels, absteigend nach Toren.
     * Nicht zu verwechseln mit getPlayerGameStats() weiter unten — die dreht
     * es um und liefert die Spiele EINES Spielers.
     *
     * Enthält nur Spieler, die in diesem Spiel geworfen haben — eine Liste
     * voller Nullzeilen sagt nichts und macht die Torschützen unauffindbar.
     */
    getScorersForGame(gameId) {
      const shots = this.getShots(gameId);
      const proSpieler = new Map();

      shots.forEach(s => {
        if (s.playerId == null) return;
        if (!proSpieler.has(s.playerId)) {
          proSpieler.set(s.playerId, { shots: 0, goals: 0, misses: 0, blocks: 0, seven: 0, sevenGoals: 0 });
        }
        const e = proSpieler.get(s.playerId);
        e.shots++;
        if (s.outcome === 'goal')  e.goals++;
        if (s.outcome === 'miss')  e.misses++;
        if (s.outcome === 'block') e.blocks++;
        if (s.position === 'p7') {
          e.seven++;
          if (s.outcome === 'goal') e.sevenGoals++;
        }
      });

      return [...proSpieler.entries()]
        .map(([playerId, e]) => {
          const player = state.players.find(p => p.id === playerId);
          return player ? {
            player, ...e,
            pct: e.shots > 0 ? Math.round(e.goals / e.shots * 100) : 0,
          } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.goals - a.goals || b.pct - a.pct);
    },

    getShotStats(gameId) {
      const shots = this.getShots(gameId);
      return {
        total:  shots.length,
        goals:  shots.filter(s => s.outcome === 'goal').length,
        misses: shots.filter(s => s.outcome === 'miss').length,
        blocks: shots.filter(s => s.outcome === 'block').length,
        posts:  shots.filter(s => s.outcome === 'post').length,
      };
    },

    getGoalsPerGame() {
      return [...state.games]
        .filter(g => g.played)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(g => ({ label: g.opponent, goalsFor: g.goalsFor, goalsAgainst: g.goalsAgainst }));
    },

    // ── Opponent Shots ────────────────────────────────────
    getOpponentShots(gameId) {
      return gameId != null
        ? state.opponentShots.filter(s => s.gameId === gameId)
        : [...state.opponentShots];
    },

    addOpponentShot(data) {
      const s = { id: nextId('oppShot'), ...data };
      state.opponentShots.push(s);
      persist(state);
      return s;
    },

    deleteOpponentShot(id) {
      state.opponentShots = state.opponentShots.filter(s => s.id !== id);
      persist(state);
    },

    getOpponentShotStats(gameId) {
      const shots = this.getOpponentShots(gameId);
      return {
        total:  shots.length,
        goals:  shots.filter(s => s.outcome === 'goal').length,
        misses: shots.filter(s => s.outcome === 'miss').length,
        blocks: shots.filter(s => s.outcome === 'block').length,
        posts:  shots.filter(s => s.outcome === 'post').length,
      };
    },

    // ── Analyse: Torzonen / Momentum ──────────────────────
    // Goal-zone tally for goalkeeper analysis.
    // side: 'own' counts our shots, 'opp' counts opponent shots. Only goals are counted.
    getGoalZoneStats(gameId, side = 'opp') {
      const shots = side === 'own' ? this.getShots(gameId) : this.getOpponentShots(gameId);
      const zones = { tl:0, tm:0, tr:0, ml:0, mm:0, mr:0, bl:0, bm:0, br:0 };
      let withZone = 0;
      shots.filter(s => s.outcome === 'goal' && s.goalZone).forEach(s => {
        if (zones[s.goalZone] != null) { zones[s.goalZone]++; withZone++; }
      });
      return { zones, total: withZone };
    },

    // Minute-by-minute momentum timeline: cumulative goals for both sides + running diff.
    getMomentumData(gameId) {
      const goals = this._goalTimeline(gameId);
      let own = 0, opp = 0;
      return goals.map(g => {
        if (g.side === 'own') own++; else opp++;
        return { minute: g.minute, own, opp, diff: own - opp };
      });
    },

    // Current scoring run: consecutive goals by one side at the end. { side, count }.
    getCurrentRun(gameId) {
      const goals = this._goalTimeline(gameId);
      if (goals.length === 0) return { side: null, count: 0 };
      const lastSide = goals[goals.length - 1].side;
      let count = 0;
      for (let i = goals.length - 1; i >= 0; i--) {
        if (goals[i].side === lastSide) count++; else break;
      }
      return { side: lastSide, count };
    },

    // Hottest own player by goals within the last `windowMin` minutes of recorded play.
    getHotPlayer(gameId, windowMin = 10) {
      const shots = this.getShots(gameId).filter(s => s.outcome === 'goal' && s.minute != null);
      if (shots.length === 0) return null;
      const maxMinute = Math.max(...shots.map(s => s.minute));
      const from = maxMinute - windowMin;
      const tally = {};
      shots.filter(s => s.minute >= from).forEach(s => {
        if (s.playerId != null) tally[s.playerId] = (tally[s.playerId] || 0) + 1;
      });
      const topId = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
      if (!topId) return null;
      const player = state.players.find(p => p.id == topId);
      return player ? { player, goals: tally[topId], windowMin, from: Math.max(1, from), to: maxMinute } : null;
    },

    // Merged, minute-sorted list of all scored goals in a game. [{ minute, side }]
    _goalTimeline(gameId) {
      const goals = [];
      this.getShots(gameId)
        .filter(s => s.outcome === 'goal' && s.minute != null)
        .forEach(s => goals.push({ minute: s.minute, side: 'own' }));
      this.getOpponentShots(gameId)
        .filter(s => s.outcome === 'goal' && s.minute != null)
        .forEach(s => goals.push({ minute: s.minute, side: 'opp' }));
      return goals.sort((a, b) => a.minute - b.minute);
    },

    // ── Opponent Roster (per game) ────────────────────────────────────
    getOpponentRoster(gameId) {
      const g = state.games.find(g => g.id === gameId);
      return g ? (g.opponentRoster || []) : [];
    },
    addOpponentPlayer(gameId, name) {
      const i = state.games.findIndex(g => g.id === gameId);
      if (i < 0) return;
      if (!state.games[i].opponentRoster) state.games[i].opponentRoster = [];
      state.games[i].opponentRoster.push(name.trim());
      persist(state);
    },
    removeOpponentPlayer(gameId, idx) {
      const i = state.games.findIndex(g => g.id === gameId);
      if (i < 0) return;
      if (!state.games[i].opponentRoster) return;
      state.games[i].opponentRoster.splice(idx, 1);
      persist(state);
    },

    setOpponentRoster(gameId, names) {
      const g = state.games.find(g => g.id === gameId);
      if (!g) return null;
      // Leeres verwerfen und Dubletten zusammenfassen — Nummern werden
      // haeufig in einem Rutsch eingetippt, da verrutscht schnell etwas.
      const sauber = [];
      names.map(n => String(n).trim()).filter(Boolean).forEach(n => {
        if (!sauber.some(x => x.toLowerCase() === n.toLowerCase())) sauber.push(n);
      });
      g.opponentRoster = sauber;
      persist(state);
      return g.opponentRoster;
    },

    /**
     * Vorschlag fuer den Gegner-Kader. Anders als beim eigenen Kader zaehlt
     * hier nicht das letzte Spiel, sondern das letzte gegen DENSELBEN Gegner:
     * im Rueckspiel traegt die Mannschaft dieselben Nummern.
     * Sonst das, was in diesem Spiel schon an Werfern vorkam.
     */
    suggestOpponentRoster(gameId) {
      const game = state.games.find(g => g.id === gameId);
      if (!game) return [];

      const frueher = state.games
        .filter(g => g.id !== gameId
                  && String(g.opponent).trim().toLowerCase() === String(game.opponent).trim().toLowerCase()
                  && Array.isArray(g.opponentRoster) && g.opponentRoster.length > 0
                  && g.date && g.date <= game.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      if (frueher) return [...frueher.opponentRoster];

      const ausWuerfen = [];
      this.getOpponentShots(gameId).forEach(s => {
        const n = (s.opponentPlayer || '').trim();
        if (n && !ausWuerfen.includes(n)) ausWuerfen.push(n);
      });
      return ausWuerfen;
    },

    // ── Live Score ────────────────────────────────────────
    getLiveGoalsAgainst(gameId) {
      const g = state.games.find(g => g.id === gameId);
      return g ? (g.liveGoalsAgainst || 0) : 0;
    },

    setLiveGoalsAgainst(gameId, count) {
      const i = state.games.findIndex(g => g.id === gameId);
      if (i >= 0) {
        state.games[i].liveGoalsAgainst = Math.max(0, count);
        persist(state);
      }
    },

    // ── Spieler-Statistiken ───────────────────────────────────
    getPlayerSeasonStats() {
      return state.players.map(player => {
        const shots  = state.shots.filter(s => s.playerId === player.id);
        const goals  = shots.filter(s => s.outcome === 'goal').length;
        const misses = shots.filter(s => s.outcome === 'miss').length;
        const blocks = shots.filter(s => s.outcome === 'block').length;
        const posts  = shots.filter(s => s.outcome === 'post').length;
        const total  = shots.length;
        return {
          player,
          shots: total, goals, misses, blocks, posts,
          pct:         total > 0 ? Math.round(goals / total * 100) : null,
          assists:     player.assists || 0,
          yellowCards: player.yellowCards || 0,
          redCards:    player.redCards || 0,
        };
      });
    },

    getPlayerGameStats(playerId) {
      return state.games
        .filter(g => g.played)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .reduce((acc, game) => {
          const shots  = state.shots.filter(s => s.gameId === game.id && s.playerId === playerId);
          if (shots.length === 0) return acc;
          const goals  = shots.filter(s => s.outcome === 'goal').length;
          const misses = shots.filter(s => s.outcome === 'miss').length;
          const blocks = shots.filter(s => s.outcome === 'block').length;
          const posts  = shots.filter(s => s.outcome === 'post').length;
          acc.push({ game, shots: shots.length, goals, misses, blocks, posts, pct: shots.length > 0 ? Math.round(goals / shots.length * 100) : null });
          return acc;
        }, []);
    },

    // ── Import / Export ───────────────────────────────────
    exportJSON()  { return JSON.stringify(state, null, 2); },
    importJSON(s) {
      try {
        const parsed = JSON.parse(s);
        // Nur echte Sicherungen akzeptieren — eine falsche Datei würde die App zerschießen
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.players) || !Array.isArray(parsed.games)) return false;
        state = Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), parsed);
        persist(state);
        return true;
      }
      catch (e) { return false; }
    },
    reset() { state = JSON.parse(JSON.stringify(DEFAULTS)); persist(state); }
  };

  return api;
})();
