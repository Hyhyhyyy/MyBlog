// Collections (合集) wiring for the Neo-Brutalist prototype.
// - Seeds the DriftWall with tomato-colour placeholder blocks.
// - User-facing "add" button removed: additions are now developer-only via
//   console API (window.__collections) and persisted in localStorage.
// - Clicking a real tile opens its target URL.
const STORAGE_KEY = 'hyhy_collections_v6';

// Tomato-related palette for the placeholder blocks: reds + green + yellow.
const PALETTE = ['#FF4438', '#E2361F', '#FF7A5C', '#C0271A', '#FFB199', '#1FD17B', '#FFD600'];
const PLACEHOLDER_COUNT = 49; // 7 columns x ~7 → a dense, fully-filled wall

// Real collection tiles. DriftWall consumes `image` + `href`; `category` is stored
// for future use, and `col` is now respected by drift-wall.js when splitting items.
const REAL_TILES = [
  { image: 'six-tile.jpg', href: 'six.html', title: 'SIX 六位王后', category: '音乐剧', col: 3 },
  { image: 'red-black-tile.jpg', href: 'red-black.html', title: '摇滚红与黑 Le Rouge et le Noir', category: '音乐剧', col: 3 },
  { image: 'hulanhe-tile.jpg', href: 'hulanhe.html', title: '呼兰河传 · 萧红', category: '文学', col: 2 },
  { image: 'caofangzi-tile.jpg', href: 'caofangzi.html', title: '草房子 · 曹文轩', category: '文学', col: 2 },
  { image: 'calvino-tile.jpg', href: 'calvino.html', title: '卡尔维诺短篇小说集', category: '文学', col: 2 },
  { image: 'mlp-tile.jpg', href: 'mlp.html', title: '小马宝莉 Friendship Is Magic', category: '影视', col: 4 },
  { image: 'itcrowd-tile.jpg', href: 'itcrowd.html', title: 'IT狂人 The IT Crowd', category: '影视', col: 4 },
  { image: 'friends-tile.jpg', href: 'friends.html', title: 'Friends 老友记', category: '影视', col: 4 },
  { image: 'sherlock-tile.jpg', href: 'sherlock.html', title: 'Sherlock 神探夏洛克', category: '影视', col: 4 }
];

function makePlaceholders() {
  const placeholders = Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => ({
    color: PALETTE[i % PALETTE.length],
    label: '合集 ' + String(i + 1).padStart(2, '0')
  }));
  return [...REAL_TILES, ...placeholders];
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
