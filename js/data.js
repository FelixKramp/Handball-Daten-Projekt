// data.js — localStorage-basierter Datenspeicher
window.App = window.App || {};

App.data = (function () {
  const KEY = 'hb_data_v1';

  const DEFAULTS = {
    team: { name: 'Meine Mannschaft', season: '2025/26', apiLeagueId: '', apiTeamId: '' },
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

    // Import games from API (skip if apiId already exists)
    importGames(games) {
      let added = 0;
      games.forEach(g => {
        if (g.apiId && state.games.some(eg => eg.apiId === g.apiId)) return;
        state.games.push({ id: nextId('game'), ...g });
        added++;
      });
      persist(state);
      return added;
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

    // ── Import / Export ───────────────────────────────────
    exportJSON()  { return JSON.stringify(state, null, 2); },
    importJSON(s) {
      try { state = JSON.parse(s); persist(state); return true; }
      catch (e) { return false; }
    },
    reset() { state = JSON.parse(JSON.stringify(DEFAULTS)); persist(state); }
  };

  return api;
})();
