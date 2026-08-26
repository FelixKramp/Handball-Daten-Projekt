// csv.js — CSV-Import für den Spielplan (Alternative/Ergänzung zur API)
window.App = window.App || {};

App.csv = (function () {

  const TEMPLATE =
    'Datum;Gegner;Heim/Auswärts;Tore eigene;Tore Gegner\n' +
    '15.09.2026;TSV Musterstadt;H;28;24\n' +
    '22.09.2026;HSG Beispiel;A;;\n';

  /** Erkennt Trennzeichen an der Kopfzeile — deutsches Excel exportiert meist mit Semikolon. */
  function detectDelimiter(headerLine) {
    return headerLine.includes(';') ? ';' : ',';
  }

  /**
   * Einfacher CSV-Parser ohne Anführungszeichen-Verschachtelung — reicht für
   * Tabellenkalkulations-Exporte, in denen Feldwerte selbst keine Trennzeichen
   * enthalten (Datum, Vereinsname, Zahlen).
   */
  function parseCsv(rawText) {
    const text = String(rawText || '').replace(/^﻿/, ''); // Excel-BOM entfernen
    const lines = text.split(/\r\n|\n|\r/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return [];

    const delimiter = detectDelimiter(lines[0]);
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());

    return lines.slice(1).map(line => {
      const cells = line.split(delimiter).map(c => c.trim());
      const row = {};
      headers.forEach((h, i) => { row[h] = cells[i] !== undefined ? cells[i] : ''; });
      return row;
    });
  }

  /** "15.09.2026" oder "2026-09-15" → ISO "2026-09-15". Leerstring bei ungültigem Datum. */
  function parseDate(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    const de = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (de) {
      const [, d, m, y] = de;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) {
      const [, y, m, d] = iso;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return '';
  }

  function parseHomeAway(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (s === 'h' || s.startsWith('heim')) return 'H';
    if (s === 'a' || s.startsWith('ausw')) return 'A';
    return '';
  }

  /**
   * Wandelt CSV-Text in Spiele im internen Format um (dasselbe Format wie
   * der API-Import, nur ohne apiId).
   * @returns {{games: object[], errors: string[]}}
   */
  function parseGamesFromCsv(text) {
    const rows = parseCsv(text);
    const games = [];
    const errors = [];

    rows.forEach((row, i) => {
      const lineNo = i + 2; // Kopfzeile + 1-indexiert
      const opponent = row['gegner'] || '';
      if (!opponent) { errors.push(`Zeile ${lineNo}: Gegner fehlt`); return; }

      const date = parseDate(row['datum']);
      if (!date) {
        errors.push(`Zeile ${lineNo}: Datum "${row['datum'] || ''}" ungültig (erwartet TT.MM.JJJJ)`);
        return;
      }

      const homeAway = parseHomeAway(row['heim/auswärts']) || 'H';

      const goalsForRaw     = row['tore eigene'];
      const goalsAgainstRaw = row['tore gegner'];
      const played = Boolean(goalsForRaw) && Boolean(goalsAgainstRaw);

      games.push({
        date,
        opponent,
        homeAway,
        played,
        goalsFor:     played ? parseInt(goalsForRaw, 10) || 0 : null,
        goalsAgainst: played ? parseInt(goalsAgainstRaw, 10) || 0 : null,
      });
    });

    return { games, errors };
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'spielplan-vorlage.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return { parseGamesFromCsv, downloadTemplate };
})();
