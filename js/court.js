// court.js — SVG Spielfeld-Zeichner + Wurf-Interaktion
window.App = window.App || {};

App.court = (function () {
  const VW = 800, VH = 400;

  // Court metrics (20px per meter, 40m × 20m field)
  const M     = 20;          // px per meter
  const PX    = 10;          // padding
  const CY    = VH / 2;     // center Y = 200
  const GW    = 3 * M;      // goal width = 60px
  const GL    = PX;          // left goal x
  const GR    = VW - PX;    // right goal x
  const R6    = 6 * M;      // 6m radius = 120
  const R9    = 9 * M;      // 9m radius = 180
  const R7    = 7 * M;      // 7m distance = 140
  const RC    = 3 * M;      // center circle radius = 60 (3m)

  function ns(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  function build() {
    const svg = ns('svg', { viewBox: `0 0 ${VW} ${VH}`, class: 'court-svg', xmlns: 'http://www.w3.org/2000/svg' });

    // Court surface
    svg.appendChild(ns('rect', { x: PX, y: PX, width: VW - PX * 2, height: VH - PX * 2, fill: '#1a3a5c', rx: 3 }));

    const LINE = '#4a7fc1';
    const FILL_6 = 'rgba(74,127,193,0.12)';

    // Field outline
    svg.appendChild(ns('rect', { x: PX, y: PX, width: VW - PX * 2, height: VH - PX * 2, fill: 'none', stroke: LINE, 'stroke-width': 2, rx: 3 }));

    // Center line
    svg.appendChild(ns('line', { x1: VW/2, y1: PX, x2: VW/2, y2: VH - PX, stroke: LINE, 'stroke-width': 1.5 }));

    // Center circle
    svg.appendChild(ns('circle', { cx: VW/2, cy: CY, r: RC, fill: 'none', stroke: LINE, 'stroke-width': 1.5 }));
    svg.appendChild(ns('circle', { cx: VW/2, cy: CY, r: 3, fill: LINE }));

    // Left side
    drawGoalSide(svg, GL, CY, GW, R6, R7, R9, LINE, FILL_6, true);
    // Right side
    drawGoalSide(svg, GR, CY, GW, R6, R7, R9, LINE, FILL_6, false);

    // Opponent shot layer (below own shots)
    svg.appendChild(ns('g', { id: 'opp-shot-layer' }));
    // Own shot layer (on top)
    svg.appendChild(ns('g', { id: 'shot-layer' }));

    return svg;
  }

  function drawGoalSide(svg, gx, cy, gw, r6, r7, r9, line, fill6, isLeft) {
    const gy1 = cy - gw / 2;  // top of goal = 170
    const gy2 = cy + gw / 2;  // bottom of goal = 230
    const dir = isLeft ? 1 : -1;
    const sweep = isLeft ? 1 : 0; // clockwise (bulge outward from goal)

    // 6m area fill (semicircle from y=gy1-r6+gw/2 to y=gy2+r6-gw/2 -- simplified to full semicircle)
    const arcTop    = cy - r6;  // 80
    const arcBottom = cy + r6;  // 320

    svg.appendChild(ns('path', {
      d: `M ${gx} ${arcTop} A ${r6} ${r6} 0 0 ${sweep} ${gx} ${arcBottom}`,
      fill: fill6, stroke: line, 'stroke-width': 2
    }));

    // 9m dashed line
    const arc9Top    = cy - r9;  // 20
    const arc9Bottom = cy + r9;  // 380
    svg.appendChild(ns('path', {
      d: `M ${gx} ${arc9Top} A ${r9} ${r9} 0 0 ${sweep} ${gx} ${arc9Bottom}`,
      fill: 'none', stroke: line, 'stroke-width': 1.5, 'stroke-dasharray': '8,5'
    }));

    // 7m penalty spot
    const px7 = gx + dir * r7;
    svg.appendChild(ns('line', { x1: px7, y1: cy - 8, x2: px7, y2: cy + 8, stroke: line, 'stroke-width': 2 }));

    // Goal posts
    const goalX  = gx - (isLeft ? 0 : 10);
    const goalW  = 10;
    svg.appendChild(ns('rect', { x: goalX, y: gy1, width: goalW, height: gw, fill: '#0d1d30', stroke: line, 'stroke-width': 1.5 }));

    // Goal line segment (in front of goal)
    svg.appendChild(ns('line', { x1: gx, y1: gy1, x2: gx, y2: gy2, stroke: line, 'stroke-width': 2.5 }));
  }

  // Convert SVG click coordinates to relative court position (0..1)
  function svgToRelative(svg, clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const scaleX = VW / rect.width;
    const scaleY = VH / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top)  * scaleY;
    return { rx: x / VW, ry: y / VH };
  }

  function relativeToSVG(rx, ry) {
    return { x: rx * VW, y: ry * VH };
  }

  const OUTCOME_COLOR = {
    goal:  '#3fb968',
    miss:  '#e84855',
    block: '#f0a500',
    post:  '#4a90d9',
  };

  function renderShots(svg, shots, players) {
    const layer = svg.querySelector('#shot-layer');
    while (layer.firstChild) layer.removeChild(layer.firstChild);

    shots.forEach(shot => {
      const { x, y } = relativeToSVG(shot.rx, shot.ry);
      const color = OUTCOME_COLOR[shot.outcome] || '#888';
      const player = players.find(p => p.id === shot.playerId);

      const g = ns('g', { class: 'shot-marker', 'data-id': shot.id });

      // Outer ring
      g.appendChild(ns('circle', { cx: x, cy: y, r: 9, fill: color, opacity: 0.25 }));
      // Inner dot
      g.appendChild(ns('circle', { cx: x, cy: y, r: 5, fill: color }));

      // Player number label
      if (player) {
        const label = ns('text', {
          x, y: y - 13, 'text-anchor': 'middle',
          fill: color, 'font-size': 9, 'font-weight': '700',
          'font-family': '-apple-system, sans-serif'
        });
        label.textContent = '#' + player.number;
        g.appendChild(label);
      }

      layer.appendChild(g);
    });
  }

  function renderOpponentShots(svg, shots) {
    const layer = svg.querySelector('#opp-shot-layer');
    if (!layer) return;
    while (layer.firstChild) layer.removeChild(layer.firstChild);

    shots.forEach(shot => {
      const { x, y } = relativeToSVG(shot.rx, shot.ry);
      const color = OUTCOME_COLOR[shot.outcome] || '#888';

      const g = ns('g', { class: 'opp-shot-marker', 'data-id': shot.id });
      // Dashed outer ring — visually distinct from own shots (solid)
      g.appendChild(ns('circle', { cx: x, cy: y, r: 10, fill: 'none', stroke: color, 'stroke-width': 1.5, opacity: 0.55, 'stroke-dasharray': '3,3' }));
      // Diamond inner (rotated square)
      g.appendChild(ns('rect', { x: x - 4.5, y: y - 4.5, width: 9, height: 9, fill: color, transform: `rotate(45 ${x} ${y})` }));

      if (shot.opponentPlayer) {
        const label = ns('text', {
          x, y: y - 15, 'text-anchor': 'middle',
          fill: color, 'font-size': 8, 'font-weight': '700',
          'font-family': '-apple-system, sans-serif'
        });
        label.textContent = String(shot.opponentPlayer).substring(0, 5);
        g.appendChild(label);
      }

      layer.appendChild(g);
    });
  }

  function enableEntry(svg, callback) {
    svg.classList.add('mode-entry');
    function handler(e) {
      if (e.target.closest('.shot-marker')) return;
      svg.classList.remove('mode-entry');
      svg.removeEventListener('click', handler);
      const { rx, ry } = svgToRelative(svg, e.clientX, e.clientY);
      callback({ rx, ry });
    }
    svg.addEventListener('click', handler);
  }

  // Goal front-view 3×3 heatmap for goalkeeper analysis.
  // zoneStats = { zones: {tl,tm,...}, total }. More saturated = more goals there.
  // rgb: color triplet string, e.g. '232,72,85' (red, default — opponent goals conceded)
  // or '63,185,104' (green — own goals scored).
  function buildGoalZoneGrid(zoneStats, rgb = '232,72,85') {
    const GZ_VW = 300, GZ_VH = 200;
    const PAD = 14;
    const W = GZ_VW - PAD * 2, H = GZ_VH - PAD * 2;
    const cw = W / 3, ch = H / 3;
    const order = ['tl','tm','tr','ml','mm','mr','bl','bm','br'];

    const svg = ns('svg', { viewBox: `0 0 ${GZ_VW} ${GZ_VH}`, class: 'goalzone-svg', xmlns: 'http://www.w3.org/2000/svg' });

    // Goal frame backdrop
    svg.appendChild(ns('rect', { x: PAD - 4, y: PAD - 4, width: W + 8, height: H + 8, fill: '#0d1d30', stroke: '#4a7fc1', 'stroke-width': 3, rx: 2 }));

    const max = Math.max(1, ...order.map(z => zoneStats.zones[z] || 0));

    order.forEach((zone, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = PAD + col * cw, y = PAD + row * ch;
      const count = zoneStats.zones[zone] || 0;
      const intensity = count / max; // 0..1
      // Heat fill: transparent → accent red
      const fill = count > 0 ? `rgba(${rgb},${0.12 + intensity * 0.68})` : 'rgba(255,255,255,0.02)';

      svg.appendChild(ns('rect', {
        x: x + 1.5, y: y + 1.5, width: cw - 3, height: ch - 3,
        fill, stroke: 'rgba(74,127,193,0.4)', 'stroke-width': 1, rx: 3
      }));

      if (count > 0) {
        const label = ns('text', {
          x: x + cw / 2, y: y + ch / 2 + 6, 'text-anchor': 'middle',
          fill: '#fff', 'font-size': 18, 'font-weight': '800',
          'font-family': '-apple-system, sans-serif'
        });
        label.textContent = count;
        svg.appendChild(label);
      }
    });

    return svg;
  }

  // ── Wurfzonen (feste Handball-Positionen) ─────────────────────────
  // Echte Kreissegmente (wie ein Tortendiagramm) statt schwebender Buttons.
  // Winkel 0° = geradeaus vom Tor, positiv = untere Hälfte (HR/RA), negativ = obere (HL/LA).
  // Radius/Winkel sind für den RECHTEN Torraum (Angriff). Für 'opp' wird nur die
  // x-Richtung gespiegelt (dirSign), Radius/Winkel bleiben identisch.
  //
  // Die Ringgrenzen sind an dieselben Konstanten gebunden, die auch die Linien
  // zeichnen (R6 = 6m, R9 = 9m, R7 = 7m-Punkt — siehe drawGoalSide). Dadurch liegen
  // die Zonengrenzen exakt auf den gezeichneten Linien:
  //   Kreis (Mitte):        6m-Linie  →  KM_OUT
  //   1:1 (Mitte):          KM_OUT    →  9m-Linie
  //   Distanz/"fern":       9m-Linie  →  FERN_OUT
  //   Außen (LA/RA):        6m-Linie  →  9m-Linie  (volle Tiefe — in diesem
  //                         Winkelbereich gibt es keine 1:1-/Distanzposition)
  // Innerhalb der 6m-Linie liegt bewusst KEINE Zone: der Torraum ist Sperrzone,
  // von dort kann kein Feldspieler werfen.
  const KM_OUT   = R6 + 30;   // Grenze Kreis ↔ 1:1 (mittig zwischen 6m und 9m)
  const FERN_OUT = R9 + 62;   // äußere Kante der Distanzzonen

  const ATTACK_ZONES = [
    // Außen — volle Tiefe von der 6m- bis zur 9m-Linie
    { id:'la',  label:'LA',      r1:R6,     r2:R9,       a1:-78, a2:-48 },
    { id:'ra',  label:'RA',      r1:R6,     r2:R9,       a1:48,  a2:78 },
    // Kreis — schmales Band direkt außen an der 6m-Linie.
    // Label sitzt außermittig, weil die Segmentmitte vom 7m-Punkt belegt ist.
    { id:'km',  label:'Kreis',   r1:R6,     r2:KM_OUT,   a1:-48, a2:48, labelAngle:33 },
    // 1:1 — zwischen Kreis-Band und 9m-Linie
    { id:'hl1', label:'HL 1:1',  r1:KM_OUT, r2:R9,       a1:-48, a2:-16 },
    // Label leicht nach oben versetzt, sonst überlappt es den 7m-Punkt darunter.
    { id:'m1',  label:'M 1:1',   r1:KM_OUT, r2:R9,       a1:-16, a2:16, labelAngle:-11 },
    { id:'hr1', label:'HR 1:1',  r1:KM_OUT, r2:R9,       a1:16,  a2:48 },
    // Distanz — jenseits der 9m-Linie
    { id:'hld', label:'HL fern', r1:R9,     r2:FERN_OUT, a1:-48, a2:-16 },
    { id:'md',  label:'M fern',  r1:R9,     r2:FERN_OUT, a1:-16, a2:16 },
    { id:'hrd', label:'HR fern', r1:R9,     r2:FERN_OUT, a1:16,  a2:48 },
    // 7m: kein Wedge, sondern ein kleiner Kreis exakt auf der gezeichneten 7m-Markierung.
    // Steht zuletzt im Array = wird oben drauf gezeichnet und gewinnt damit den Klick.
    { id:'p7',  label:'7m',      shape:'circle', dist:R7, radius:15 },
  ];

  const ZONE_LABELS = {
    la:'Linksaußen', ra:'Rechtsaußen', km:'Kreis', p7:'7 Meter',
    hl1:'Halblinks 1:1', hld:'Halblinks Distanz',
    m1:'Mitte 1:1',  md:'Mitte Distanz',
    hr1:'Halbrechts 1:1', hrd:'Halbrechts Distanz',
  };

  // Punkt auf einem Kreisbogen um das Tor: dirSign -1 = rechtes Tor (own), +1 = linkes Tor (opp)
  function polarPoint(gx, r, angleDeg, dirSign) {
    const th = angleDeg * Math.PI / 180;
    return { x: gx + dirSign * r * Math.cos(th), y: CY + r * Math.sin(th) };
  }

  function goalX(side) { return side === 'opp' ? GL : GR; }
  function dirSign(side) { return side === 'opp' ? 1 : -1; }

  // SVG-Pfad für ein Kreisring-Segment (Torte mit Loch) zwischen r1..r2 und a1..a2
  //
  // Zu den sweep-Flags: Bei zwei Endpunkten und gegebenem Radius gibt es zwei mögliche
  // Kreismittelpunkte. Nur die richtige Flag-Kombination wählt den Bogen um das Tor —
  // die andere wölbt sich um einen Ersatzmittelpunkt und schneidet das Segment auf.
  // Für dir=-1 (rechtes Tor) gilt x = gx - r·cos(a), also θ = 180° − a: wächst a,
  // sinkt θ, der Außenbogen läuft demnach in negativer Winkelrichtung (sweep 0).
  // Der Innenbogen läuft zurück und damit umgekehrt (sweep 1). Für dir=+1 ist θ = a
  // und beide Flags drehen sich um.
  function wedgePath(gx, r1, r2, a1, a2, dir) {
    const pInnerStart = polarPoint(gx, r1, a1, dir);
    const pOuterStart = polarPoint(gx, r2, a1, dir);
    const pOuterEnd   = polarPoint(gx, r2, a2, dir);
    const pInnerEnd   = polarPoint(gx, r1, a2, dir);
    const sweepOuter = dir === -1 ? 0 : 1;
    const sweepInner = dir === -1 ? 1 : 0;
    return `M ${pInnerStart.x} ${pInnerStart.y} L ${pOuterStart.x} ${pOuterStart.y} `
         + `A ${r2} ${r2} 0 0 ${sweepOuter} ${pOuterEnd.x} ${pOuterEnd.y} `
         + `L ${pInnerEnd.x} ${pInnerEnd.y} `
         + `A ${r1} ${r1} 0 0 ${sweepInner} ${pInnerStart.x} ${pInnerStart.y} Z`;
  }

  function zoneCenterRel(id, side) {
    const z = ATTACK_ZONES.find(z => z.id === id);
    if (!z) return { rx: 0.5, ry: 0.5 };
    const mid = z.shape === 'circle'
      ? polarPoint(goalX(side), z.dist, 0, dirSign(side))
      : polarPoint(goalX(side), (z.r1 + z.r2) / 2, (z.a1 + z.a2) / 2, dirSign(side));
    return { rx: mid.x / VW, ry: mid.y / VH };
  }

  // Render klickbare Zonen-Segmente auf dem Spielfeld. side: 'own' (rechtes Tor) | 'opp' (linkes Tor).
  // onPick(zoneId, { rx, ry }) wird beim Antippen eines Segments aufgerufen.
  function renderZones(svg, side, onPick) {
    let layer = svg.querySelector('#zone-layer');
    if (!layer) { layer = ns('g', { id: 'zone-layer' }); svg.appendChild(layer); }
    while (layer.firstChild) layer.removeChild(layer.firstChild);

    const gx = goalX(side);
    const dir = dirSign(side);

    ATTACK_ZONES.forEach(z => {
      const g = ns('g', { class: `zone-chip${side === 'opp' ? ' opp' : ''}`, 'data-zone': z.id });
      let mid;
      if (z.shape === 'circle') {
        mid = polarPoint(gx, z.dist, 0, dir);
        g.appendChild(ns('circle', { cx: mid.x, cy: mid.y, r: z.radius, class: 'zone-chip-bg' }));
      } else {
        g.appendChild(ns('path', { d: wedgePath(gx, z.r1, z.r2, z.a1, z.a2, dir), class: 'zone-chip-bg' }));
        // Beschriftung standardmäßig in die Mitte des Segments; labelAngle/labelRadius
        // erlauben Ausnahmen, wo die Mitte belegt ist (z.B. Kreis wegen des 7m-Punkts).
        const labelR = z.labelRadius != null ? z.labelRadius : (z.r1 + z.r2) / 2;
        const labelA = z.labelAngle  != null ? z.labelAngle  : (z.a1 + z.a2) / 2;
        mid = polarPoint(gx, labelR, labelA, dir);
      }
      const t = ns('text', { x: mid.x, y: mid.y + 4, 'text-anchor': 'middle', class: 'zone-chip-label' });
      t.textContent = z.label;
      g.appendChild(t);
      layer.appendChild(g);
    });

    svg._zoneSide = side;
    svg._zonePick = onPick;
    if (!svg._zoneHandler) {
      svg._zoneHandler = e => {
        const chip = e.target.closest('.zone-chip');
        if (!chip || !svg._zonePick) return;
        svg._zonePick(chip.dataset.zone, zoneCenterRel(chip.dataset.zone, svg._zoneSide));
      };
      svg.addEventListener('click', svg._zoneHandler);
    }
  }

  function clearZones(svg) {
    const layer = svg.querySelector('#zone-layer');
    if (layer) while (layer.firstChild) layer.removeChild(layer.firstChild);
    svg._zonePick = null;
  }

  return { build, renderShots, renderOpponentShots, enableEntry, buildGoalZoneGrid,
           renderZones, clearZones, zoneCenterRel, ZONE_LABELS, OUTCOME_COLOR, svgToRelative };
})();
