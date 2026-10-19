// Scryfall lookups + pixelated, phosphor-tinted commander art.
const API = 'https://api.scryfall.com';

export async function autocomplete(q) {
  if (q.length < 2) return [];
  try {
    const r = await fetch(`${API}/cards/autocomplete?q=${encodeURIComponent(q)}`);
    return (await r.json()).data?.slice(0, 8) || [];
  } catch { return []; }
}

export async function cardInfo(name) {
  try {
    const r = await fetch(`${API}/cards/named?exact=${encodeURIComponent(name)}`);
    if (!r.ok) return null;
    const c = await r.json();
    const art = c.image_uris?.art_crop || c.card_faces?.[0]?.image_uris?.art_crop || null;
    const partner = (c.keywords || []).some((k) => /partner|friends forever|background/i.test(k));
    return { name: c.name, colors: (c.color_identity || []).join(''), art, partner };
  } catch { return null; }
}

const cache = new Map();
export function drawArt(canvas, url) {
  if (!url || canvas.dataset.drawn === url) return;
  const paint = (img) => {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'color';
    ctx.fillStyle = '#6fe0a8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    canvas.dataset.drawn = url;
  };
  if (cache.has(url)) return paint(cache.get(url));
  const img = new Image();
  img.onload = () => { cache.set(url, img); paint(img); };
  img.src = url;
}
