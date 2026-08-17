// Collections (合集) wiring for the Neo-Brutalist prototype.
// - Seeds the DriftWall with placeholder blocks coloured as a red→yellow→green gradient.
// - User-facing "add" button removed: additions are now developer-only via
//   console API (window.__collections) and persisted in localStorage.
// - Clicking a real tile opens its target URL.
const STORAGE_KEY = 'hyhy_collections_v9';

// 占位色块调色板：整体呈现「鲜红 → 鲜黄 → 鲜绿」的渐变（色相 0°→120° 均匀步进）。
// 顺序必须保留：splitColumns 仍按 (i % PALETTE.length) 循环取色，故改这里即改整墙渐变顺序。
const PALETTE = ['#FF1E1E', '#FF6A00', '#FFB300', '#FFE500', '#C6E800', '#5FD800', '#00E000'];
const PLACEHOLDER_COUNT = 49; // 7 columns x ~7 → a dense, fully-filled wall

function makePlaceholders() {
  const items = [{
    image: 'hamilton-tile.jpg',
    href: 'hamilton.html',
    title: 'Hamilton 汉密尔顿',
    category: '音乐剧',
    col: 3
  }, {
    image: 'woyu-ditan-tile.jpg',
    href: 'woyu-ditan.html',
    title: '我与地坛 史铁生',
    category: '文学',
    col: 2
  }, {
    image: 'legally-blonde-tile.jpg',
    href: 'legally-blonde.html',
    title: '律政俏佳人 Legally Blonde',
    category: '音乐剧',
    col: 3
  }];
  for (let i = 0; i < PLACEHOLDER_COUNT; i++) {
    items.push({
      color: PALETTE[i % PALETTE.length],
      label: '合集 ' + String(i + 1).padStart(2, '0')
    });
  }
  return items;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return arr;
    }
  } catch (e) { /* ignore */ }
  return makePlaceholders();
}

function saveState(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('[collections] save failed (maybe storage quota):', e);
  }
}

function init() {
  const container = document.getElementById('dw');
  if (!container) return;

  let items = loadState();
  const wall = initDriftWall(container, {
    items,
    columns: 7,
    tileWidth: 220,
    tileHeight: 150,
    gap: 16,
    radius: 14,
    tilt: 16,
    turn: -14,
    roll: 0,
    perspective: 1200,
    depth: 120,
    speed: 40,
    direction: 'up',
    variance: 0.45,
    parallax: 0.6,
    pauseOnHover: false,
    lift: 70,
    fade: 0.55,
    dim: 0.55,
    overlayColor: '#000000',
    fallbackPalette: PALETTE
  });

  // 添加合集 UI 已移除：仅开发者可通过下面暴露的 API 维护数据。
  // expose for developer-only management
  window.__collections = { wall, getItems: () => items, reset: () => { items = makePlaceholders(); wall.setItems(items); saveState(items); } };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
