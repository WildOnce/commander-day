// Scryfall lookups + pixelated, phosphor-tinted commander art.
const API = 'https://api.scryfall.com';

const found = new Map();
const toInfo = (c) => ({
  name: c.name, colors: 'WUBRG'.split('').filter((x) => (c.color_identity || []).includes(x)).join(''),
  art: c.image_uris?.art_crop || c.card_faces?.[0]?.image_uris?.art_crop || null,
  partner: (c.keywords || []).some((k) => /partner|friends forever|background/i.test(k)),
});

/** Commander-only suggestions, most popular first (EDHREC rank). */
export async function autocomplete(q) {
  if (q.length < 2) return [];
  try {
    const r = await fetch(`${API}/cards/search?q=${encodeURIComponent(`${q} is:commander`)}&order=edhrec&unique=cards`);
    if (!r.ok) return [];
    const list = (await r.json()).data?.slice(0, 8) || [];
    list.forEach((c) => found.set(c.name, toInfo(c)));
    return list.map((c) => c.name);
  } catch { return []; }
}

export async function cardInfo(name) {
  if (found.has(name)) return found.get(name);
  try {
    const r = await fetch(`${API}/cards/named?exact=${encodeURIComponent(name)}`);
    if (!r.ok) return null;
    const c = await r.json();
    const art = c.image_uris?.art_crop || c.card_faces?.[0]?.image_uris?.art_crop || null;
    const partner = (c.keywords || []).some((k) => /partner|friends forever|background/i.test(k));
    return { name: c.name, colors: 'WUBRG'.split('').filter((x) => (c.color_identity || []).includes(x)).join(''), art, partner };
  } catch { return null; }
}

const cache = new Map();
export function drawArt(canvas, url) {
  if (!url || canvas.dataset.drawn === url) return;
  const paint = (img) => {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.dataset.drawn = url;
  };
  if (cache.has(url)) return paint(cache.get(url));
  const img = new Image();
  img.onload = () => { cache.set(url, img); paint(img); };
  img.src = url;
}
