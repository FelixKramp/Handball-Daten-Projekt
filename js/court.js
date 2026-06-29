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

  return { build, renderShots, renderOpponentShots, enableEntry, OUTCOME_COLOR, svgToRelative };
})();
