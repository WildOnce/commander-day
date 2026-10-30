// Tiny pixel-art sprites rendered as crisp SVG. Palette: # fg · o mid · d dim · r alert · g gold · w white
const COL = { '#': 'var(--fg)', o: 'var(--mid)', d: 'var(--dim)', r: 'var(--alert)', g: 'var(--gold)', w: '#f2fff8',
  v: '#2fd27a', b: '#3d8bff', p: '#9b6bff', k: '#111111', n: '#a8643a', s: '#b9c2c9' };

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
  book: ['.####..####.', '#####oo#####', '#oo##oo##oo#', '#####oo#####', '#oo##oo##oo#', '#####oo#####', '#oo##oo##oo#', '############', '.####..####.'],
  goblin: ['..vv....vv..', '.vvvv..vvvv.', '..vvvvvvvv..', '...vkvvkv...', '...vvvvvv...', '....vwwv....', '...vvvvvv...', '..vvvvvvvv..', '..v.vvvv.v..', '....v..v....'],
  wolf: ['.s.......s.', '.ss.....ss.', '.sss...sss.', '.sssssssss.', '.sskssskss.', '..sssssss..', '...sswss...', '....sss....'],
  dragon: ['.r.......r..', '.rr.....rr..', '..rrrrrrr...', '..rkrrrkr...', '..rrrrrrrg..', '...rrrrr.gg.', 'r.rrrrrrr.g.', 'rrrrrrrrrr..', '.r.r...r.r..'],
  robot: ['...ssssss...', '..ssssssss..', '..srrssrrs..', '..ssssssss..', '..sswwwwss..', '...ssssss...', '.ssssssssss.', '.s.ssssss.s.', '...ss..ss...'],
  eye: ['....rrrr....', '..rrggggrr..', '.rggg..gggr.', 'rggg.kk.gggr', '.rggg..gggr.', '..rrggggrr..', '....rrrr....'],
  bat: ['p....pp....p', 'pp..pppp..pp', 'ppppkppkpppp', '.pppppppppp.', '..p.pppp.p..', '.....pp.....'],
  panther: ['.p......p.', '.pp....pp.', '.pppppppp.', '.pgppppgp.', '.pppppppp.', '..ppwwpp..', '...pppp...'],
  cog: ['....ss....', '.s.ssss.s.', '..ssssss..', '.sss..sss.', 'ssss..ssss', '.sss..sss.', '..ssssss..', '.s.ssss.s.', '....ss....'],
  gem: ['..bbbbbb..', '.bwbbbbwb.', 'bbbbbbbbbb', '.bbbbbbbb.', '..bbbbbb..', '...bbbb...', '....bb....'],
  frog: ['.vv....vv.', 'vkvv..vvkv', 'vvvvvvvvvv', '.vvvvvvvv.', '.vkkkkkkv.', '..vvvvvv..', '.vv....vv.'],
  cookie: ['...nnnn...', '..nnnnnn..', '..nwnnwn..', '..nnnnnn..', '...nwwn...', 'nnnnnnnnnn', '..nnwnnn..', '..nnnnnn..', '..nn..nn..', '.nnn..nnn.'],
  demon: ['r........r', 'rr......rr', '.rrrrrrrr.', '.rgrrrrgr.', '.rrrrrrrr.', '..rkkkkr..', '...rrrr...'],
  bird: ['...bb.....', '..bbbb....', '..bkbbbbb.', '.gbbbbbbbb', '..bbbbbbb.', '...bbbbb..', '....b.b...'],
  bolt: ['....gg', '...gg.', '..gg..', '.ggggg', '...gg.', '..gg..', '.gg...', 'gg....'],
  brain: ['...####.##..', '.####k#####.', '##k####k####', '####k####k##', '#k#####k####', '####k#####k#', '.#####k####.', '...##...##..', '....#...#...'],
  orb: ['...####...', '..######..', '.##k#####.', '.#k######.', '.########.', '..######..', '...####...', '..kkkkkk..', '.kkkkkkkk.'],
  mask: ['.#########.', '###########', '##kk###kk##', '##kk###kk##', '###########', '###k###k###', '.###kkkk##.', '..#######..', '...#####...'],
  shard: ['....#....', '...###...', '..##k##..', '.###k###.', '####k####', '.###k###.', '..##k##..', '...###...', '....#....'],
  cat: ['#.......#.', '##.....##.', '#########.', '#k####k##.', '#########.', '.###k###..', '..#####..#', '..########', '..##..##..'],
  wand: ['......#.#', '.......#.', '......#.#', '.....#...', '....#....', '...#.....', '..#......', '.#.......', '#........'],
  thopter: ['#.........#', '##.......##', '.###...###.', '..#######..', '...#k#k#...', '..#######..', '.###...###.', '##.......##'],
  lizard: ['......####..', '.....##k###.', '.....#######', '..#######...', '.########...', '##.######...', '#...#..#....', '...#....#...'],
  gun: ['###########', '###########', '###kk......', '###.k......', '###........', '###........'],
  raven: ['....##.....', '...####....', '..#k####...', '.gg######..', '...#######.', '..#########', '...#####.##', '....#.#....'],
  fang: ['#########', '.#######.', '.#######.', '..#####..', '..#####..', '...###...', '...###...', '....#....'],
  club: ['....####', '...#####', '...#k###', '...##k##', '..#####.', '.###....', '###.....', '##......'],
  horns: ['#.........#', '##.......##', '.##.....##.', '..#######..', '..#k###k#..', '..#######..', '...#k#k#...', '....###....'],
  star: [
    '.....#.....', '....###....', '#.#######.#', '.#########.', '..#######..', '.####.####.', '.##.....##.', '#.........#',
  ],
};

/** mono=true: one consistent look for mascots/effects – body white, details (k/w) as dark pixels. */
export function sprite(name, px = 4, cls = '', mono = false) {
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
      const fill = mono ? ('kwod'.includes(ch) ? '#111111' : '#f5f5f3') : COL[ch] || COL['#']; // details dark, body white
      rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${fill}"/>`;
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
