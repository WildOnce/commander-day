// Tiny pixel-art sprites rendered as crisp SVG. Palette: # fg · o mid · d dim · r alert · g gold · w white
const COL = { '#': 'var(--fg)', o: 'var(--mid)', d: 'var(--dim)', r: 'var(--alert)', g: 'var(--gold)', w: '#f2fff8' };

export const SPRITES = {
  skull: [
    '...######...', '..########..', '.##########.', '.#...##...#.', '.#...##...#.', '.##########.',
    '..###..###..', '...######...', '...#.##.#...', '...######...', '....####....',
  ],
  ghost: [
    '....####....', '..########..', '.##########.', '.##..##..##.', '.##..##..##.', '.##########.',
    '.####..####.', '.##########.', '.##########.', '.##.###.###.', '.#...#...#..',
  ],
  trophy: [
    '.gggggggggg.', 'gg.gggggg.gg', 'g..gggggg..g', 'gg.gggggg.gg', '.gggggggggg.', '...gggggg...',
    '....gggg....', '.....gg.....', '.....gg.....', '...gggggg...', '..gggggggg..',
  ],
  beer: [
    '..wwwwwww...', '.wwwwwwwww..', '.ggggggggg..', '.ggggggggg##', '.ggwggggwg.#', '.ggggggggg.#',
    '.gggwggggg.#', '.ggggggggg##', '.ggggggggg..', '.ggwgggggg..', '..ggggggg...',
  ],
  sword: [
    '...#...', '..###..', '..#o#..', '..#o#..', '..#o#..', '..#o#..', '..#o#..', '..#o#..',
    '..#o#..', '#######', '.##o##.', '...o...', '...o...', '..ooo..',
  ],
  crown: ['g....g....g', 'gg..ggg..gg', 'ggg.ggg.ggg', 'ggggggggggg', 'gg.gg.gg.gg', 'ggggggggggg'],
  heart: [
    '.rrr...rrr.', 'rrrrr.rrrrr', 'rrrrrrrrrrr', 'rrrrrrrrrrr', '.rrrrrrrrr.', '..rrrrrrr..',
    '...rrrrr...', '....rrr....', '.....r.....',
  ],
  potion: [
    '....dd....', '....##....', '....##....', '...####...', '..######..', '.##o##o##.',
    '.########.', '.#o####o#.', '.########.', '..######..',
  ],
  roach: [
    '..#......#..', '...#....#...', '....####....', '...######...', '#.##o##o##.#', '.##########.',
    '#.########.#', '.##########.', '#.########.#', '...######...', '....####....',
  ],
  crosshair: [
    '.....r.....', '...rrrrr...', '..r..r..r..', '.r...r...r.', '.r.......r.', 'rrrr.r.rrrr',
    '.r.......r.', '.r...r...r.', '..r..r..r..', '...rrrrr...', '.....r.....',
  ],
  axe: ['....###.', '...#####', '..######', '..##o###', '...#o###', '....o##.', '...o....', '..o.....', '.o......', 'o.......'],
  shield: [
    '##########', '#oooooooo#', '#o######o#', '#o##oo##o#', '#o#oooo#o#', '#o##oo##o#',
    '.#o####o#.', '..#o##o#..', '...#oo#...', '....##....',
  ],
  zombie: [
    '...#.#.#...', '...#.#.#.#.', '...#######.', '...######..', '....####...', '....####...',
    '....####...', 'ooooooooooo', 'o.o.oo.o.oo',
  ],
  dice: [
    '##########', '#........#', '#.##..##.#', '#.##..##.#', '#........#', '#.##..##.#', '#.##..##.#', '#........#', '##########',
  ],
  rider: [
    '........#.............', '........#.##..........', '........#####.........', '........#ooo#.........',
    '........#####.........', '......##.###..........', '.....####o###.........', '......########..##....',
    '........#####..####...', '..##############.##...', '.################.....', '##..############......',
    '#...###......###......', '....#.#......#.#......', '...#...#....#...#.....', '..#.....#..#.....#....',
  ],
  knight: [
    '....####....', '...######...', '...#....#...', '...######...', '....####..#.', '..########o.',
    '.#.######.o.', '.#.######.o.', '...######.o.', '...##..##...', '...##..##...', '..###..###..',
  ],
  crab: [
    '..r.......r..', '.rr.......rr.', '.r.r.....r.r.', '..rr.w.w.rr..', '...rrrrrrr...', '..rrrrrrrrr..',
    '.rrrrrrrrrrr.', 'r.rrrrrrrrr.r', '..r.r...r.r..', '.r...r.r...r.',
  ],
  flame: [
    '....g.....', '...gg..g..', '..gggr.gg.', '..grrrggg.', '.grrrrrgg.', '.grrwrrrg.',
    'grrwwwrrrg', 'grrwwwwrrg', '.grrwwrrg.', '..grrrrg..',
  ],
  book: ['.oooooooo.', 'o########o', 'o#oooooo#o', 'o########o', 'o#oooooo#o', 'o########o', '.oooooooo.'],
  star: [
    '.....#.....', '....###....', '#.#######.#', '.#########.', '..#######..', '.####.####.', '.##.....##.', '#.........#',
  ],
};

export function sprite(name, px = 4, cls = '') {
  const rows = SPRITES[name] || SPRITES.star;
  const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
  let rects = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') { x++; continue; }
      let run = 1;
      while (row[x + run] === ch) run++;
      rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${COL[ch] || COL['#']}"/>`;
      x += run;
    }
  });
  return `<svg class="px ${cls}" width="${w * px}" height="${h * px}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

/** Pixel confetti burst inside an element. */
export function confetti(host, n = 40, colors = ['var(--fg)', 'var(--gold)', 'var(--mid)'], fixed = false) {
  colors = colors || ['var(--accent)', 'var(--gold)', 'var(--p1)', 'var(--p2)', 'var(--p3)'];
  const wrap = document.createElement('div');
  wrap.className = 'confetti' + (fixed ? ' fixed' : '');
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    s.style.left = Math.random() * 100 + '%';
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = Math.random() * 0.6 + 's';
    s.style.animationDuration = 1.6 + Math.random() * 1.4 + 's';
    s.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
    wrap.appendChild(s);
  }
  host.appendChild(wrap);
  setTimeout(() => wrap.remove(), 3600);
}
