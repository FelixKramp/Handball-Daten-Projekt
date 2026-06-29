// api.js — Externe Spielplan-API (konfigurierbar)
window.App = window.App || {};

App.api = (function () {

  // OpenLigaDB — freie REST-API für deutsche Ligen
  // Handball-Daten: Liga-Shortcut + Saison in Einstellungen konfigurieren
  async function fetchOpenLiga(leagueShortcut, season) {
    const url = `https://api.openligadb.de/getmatchdata/${leagueShortcut}/${season}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API-Fehler ${res.status}: ${res.statusText}`);
    return res.json();
  }

  function parseOpenLigaGames(data, teamId) {
    return data
      .filter(m => m.team1.teamId == teamId || m.team2.teamId == teamId)
      .map(match => {
        const isHome = match.team1.teamId == teamId;
        const us     = isHome ? match.team1 : match.team2;
        const them   = isHome ? match.team2 : match.team1;
        const result = match.matchResults?.find(r => r.resultTypeID === 2) || match.matchResults?.[0];
        const played = match.matchIsFinished;
        return {
          apiId:         String(match.matchId),
          date:          match.matchDateTime?.slice(0, 10) || '',
          opponent:      them.teamName,
          homeAway:      isHome ? 'H' : 'A',
          goalsFor:      played && result ? (isHome ? result.pointsTeam1 : result.pointsTeam2) : null,
          goalsAgainst:  played && result ? (isHome ? result.pointsTeam2 : result.pointsTeam1) : null,
          played
        };
      });
  }

  return {
    async loadSchedule() {
      const team = App.data.getTeam();
      if (!team.apiLeagueId) throw new Error('Bitte zuerst Liga-ID in den Einstellungen eintragen.');

      // Season "2025/26" → "2025"
      const season = team.season?.split('/')?.[0] || new Date().getFullYear();
      const raw    = await fetchOpenLiga(team.apiLeagueId, season);
      const games  = parseOpenLigaGames(raw, team.apiTeamId);
      const added  = App.data.importGames(games);
      return { total: games.length, added };
    }
  };
})();
