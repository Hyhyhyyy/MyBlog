// DriftWall — vanilla-JS port of the React Bits component.
// Faithful to the original mechanics: round-robin columns, infinite vertical
// drift via duplicated copies + modulo offsets, a perspective plane with
// pointer parallax, and hover lift / overlay. No React, no dependencies.
function initDriftWall(container, props = {}) {
  const {
    items = [],
    columns = 6,
    tileWidth = 220,
    tileHeight = 150,
    gap = 16,
    radius = 0,
    tilt = 16,
    turn = -14,
    roll = 0,
    perspective = 1200,
    depth = 120,
    speed = 40,
    direction = 'up',
    variance = 0.45,
    parallax = 0.6,
    pauseOnHover = false,
    lift = 70,
    fade = 0.55,
    dim = 0.5,
    grayscale = false,
    overlayColor = '#240A07',
    className = '',
    fallbackPalette = ['#FF4438', '#1FD17B', '#FFD600']
  } = props;

  container.classList.add('drift-wall');
  if (className) className.split(/\s+/).filter(Boolean).forEach(c => container.classList.add(c));

  // CSS custom properties consumed by drift-wall.css
  const setVar = (k, v) => container.style.setProperty(k, v);
  setVar('--dw-tile-w', tileWidth + 'px');
  setVar('--dw-tile-h', tileHeight + 'px');
  setVar('--dw-gap', gap + 'px');
  setVar('--dw-radius', radius + 'px');
  setVar('--dw-perspective', perspective + 'px');
  setVar('--dw-lift', lift + 'px');
  setVar('--dw-dim', dim);
  setVar('--dw-gray', grayscale ? 1 : 0);
  setVar('--dw-overlay', overlayColor);
  setVar('--dw-edge', Math.max(0, (1 - fade) * 100) + '%');

  const plane = document.createElement('div');
  plane.className = 'drift-wall__plane';
  container.appendChild(plane);

  const prefersReduced = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let reduced = prefersReduced();
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMq = e => { reduced = e.matches; };
  mq.addEventListener('change', onMq);

  const columnFactor = (index, v) => {
    const pseudo = ((index * 0.6180339887 + 0.35) % 1) * 2 - 1;
    return 1 + v * pseudo;
  };

  let itemsArr = items.slice();
  let columnItems = [];
  let meta = [];
  let baseVelocities = [];

  const trackEls = [];
  const tileMap = {};
  const offsets = [];
  const velocities = [];
  let hoveredCol = -1;
  let wallHovered = false;
  let activeId = null;
  const pointer = { x: 0, y: 0 };
  const pointerDamped = { x: 0, y: 0 };
  let lastTs = null;
  let raf = null;
  let containerHeight = container.clientHeight || window.innerHeight || 800;

  // Column assignment.
  // - Items WITHOUT a `col` field (placeholder blocks) are round-robined across
  //   every column so the wall stays dense.
  // - Items WITH a `col` field (real collection covers) are pinned to that exact
  //   column index and interleaved with placeholders at even intervals, so a
  //   whole column can be dedicated to one category (e.g. musicals in the
  //   center column, literature immediately left of it).
  function splitColumns(arr, cols) {
    const colsArr = Array.from({ length: cols }, () => []);
    const placeholders = arr.filter(it => !('col' in it) || it.col == null);
    const pinned = arr.filter(it => ('col' in it) && it.col != null);
    // 1) round-robin placeholders so every column is dense
    placeholders.forEach((it, i) => colsArr[i % cols].push(it));
    // 2) group pinned items by their preferred column
    const byCol = {};
    pinned.forEach(it => {
      const c = Math.max(0, Math.min(cols - 1, Number(it.col) || 0));
      (byCol[c] = byCol[c] || []).push(it);
    });
  // 3) interleave pinned items into their target column at even intervals
  Object.keys(byCol).forEach(c => {
    c = Number(c);
    const col = colsArr[c];
    const pinnedThis = byCol[c];
    const step = Math.max(1, Math.floor(col.length / (pinnedThis.length + 1)));
    let idx = step;
    pinnedThis.forEach(item => {
      col.splice(Math.min(idx, col.length), 0, item);
      idx += step + 1;
    });
  });
  return colsArr.map(col => (col.length ? col : arr.slice(0, 1)));
}
  function computeMeta() {
    const unit = tileHeight + gap;
    return columnItems.map(col => {
      const copyHeight = Math.max(unit, col.length * unit);
      const copies = Math.max(2, Math.ceil((containerHeight * 1.6) / copyHeight) + 1);
      return { copyHeight, copies };
    });
  }
  function computeVelocities() {
    const dirSign = direction === 'up' ? 1 : -1;
    return columnItems.map((_, c) => {
      const altSign = c % 2 === 0 ? 1 : -1;
      return speed * columnFactor(c, variance) * dirSign * altSign;
    });
  }

  function applyActive() {
    for (const id in tileMap) tileMap[id].classList.toggle('is-active', id === activeId);
  }

  function renderTile(item, id, colIndex) {
    const inner = document.createElement('span');
    inner.className = 'drift-wall__inner';
    if (item.color) {
      inner.classList.add('drift-wall__inner--placeholder');
      inner.style.background = item.color;
    } else if (item.image) {
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = item.title || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.draggable = false;
      // fallback: if the stored image fails to load, swap back to a placeholder colour
      img.onerror = () => {
        img.remove();
        inner.classList.add('drift-wall__inner--placeholder');
        const idx = Math.abs(id.split('-').reduce((a, n) => a + parseInt(n, 10), 0)) % fallbackPalette.length;
        inner.style.background = item.color || fallbackPalette[idx];
      };
      inner.appendChild(img);
    }
    const overlay = document.createElement('span');
    overlay.className = 'drift-wall__overlay';
    overlay.setAttribute('aria-hidden', 'true');
    inner.appendChild(overlay);

    let tile;
    if (item.href) {
      tile = document.createElement('a');
      tile.href = item.href;
      tile.rel = 'noreferrer noopener';
      // 预览面板多以 iframe 内嵌，弹窗(_blank)会被浏览器拦截导致"点击无反应"；
      // 内嵌时改为同窗口跳转，独立浏览器中仍开新标签。
      tile.target = (window.self !== window.top) ? '_self' : '_blank';
    } else {
      tile = document.createElement('div');
      tile.tabIndex = 0;
      tile.setAttribute('role', 'button');
      tile.setAttribute('aria-label', item.title || item.label || 'tile');
    }
    tile.className = 'drift-wall__tile';
    tile.dataset.tileId = id;
    tile.dataset.col = String(colIndex);
    tile.appendChild(inner);

    const setActive = () => { activeId = id; hoveredCol = colIndex; applyActive(); };
    const clearActive = () => { activeId = null; hoveredCol = -1; applyActive(); };
    tile.addEventListener('focus', setActive);
    tile.addEventListener('blur', clearActive);
    tileMap[id] = tile;
    return tile;
  }

  function render() {
    plane.innerHTML = '';
    for (const k in tileMap) delete tileMap[k];
    trackEls.length = 0;
    columnItems.forEach((col, c) => {
      const colEl = document.createElement('div');
      colEl.className = 'drift-wall__col';
      // fixed, non-drifting category label for columns that carry a category
      const cat = col.find(it => it.category);
      if (cat) {
        const label = document.createElement('div');
        label.className = 'drift-wall__col-label';
        label.textContent = cat.category;
        colEl.appendChild(label);
      }
      const track = document.createElement('div');
      track.className = 'drift-wall__track';
      const m = meta[c];
      for (let copy = 0; copy < m.copies; copy++) {
        col.forEach((item, itemIndex) => {
          track.appendChild(renderTile(item, `${c}-${copy}-${itemIndex}`, c));
        });
      }
      colEl.appendChild(track);
      plane.appendChild(colEl);
      trackEls[c] = track;
    });
    offsets.length = 0;
    velocities.length = 0;
    meta.forEach((mm, c) => {
      offsets[c] = mm.copyHeight * ((c * 0.37) % 1);
      velocities[c] = 0;
    });
  }

  function rebuild() {
    columnItems = splitColumns(itemsArr, columns);
    meta = computeMeta();
    baseVelocities = computeVelocities();
    render();
  }

  function animate(ts) {
    if (lastTs === null) lastTs = ts;
    const dt = Math.min(0.05, Math.max(0, ts - lastTs) / 1000);
    lastTs = ts;

    const maxTilt = parallax * 8;
    const targetX = pointer.x * maxTilt;
    const targetY = -pointer.y * maxTilt;
    const damp = 1 - Math.exp(-dt / 0.12);
    pointerDamped.x += (targetX - pointerDamped.x) * damp;
    pointerDamped.y += (targetY - pointerDamped.y) * damp;
    plane.style.transform =
      `translate(-50%, -50%) scale(1.18) ` +
      `rotateX(${tilt + pointerDamped.y}deg) rotateY(${turn + pointerDamped.x}deg) rotateZ(${roll}deg) ` +
      `translateZ(${-depth}px)`;

    if (!reduced) {
      for (let c = 0; c < trackEls.length; c++) {
        const mm = meta[c];
        if (!mm) continue;
        const paused = wallHovered && pauseOnHover;
        const factor = paused || hoveredCol === c ? 0 : 1;
        const target = baseVelocities[c] * factor;
        const ease = 1 - Math.exp(-dt / (target === 0 ? 0.16 : 0.28));
        velocities[c] += (target - velocities[c]) * ease;
        let next = (offsets[c] || 0) + velocities[c] * dt;
        next = ((next % mm.copyHeight) + mm.copyHeight) % mm.copyHeight;
        offsets[c] = next;
        const el = trackEls[c];
        if (el) el.style.transform = `translate3d(0, ${-next}px, 0)`;
      }
    } else {
      for (let c = 0; c < trackEls.length; c++) {
        const el = trackEls[c];
        const mm = meta[c];
        if (el && mm) el.style.transform = `translate3d(0, ${-(offsets[c] || 0)}px, 0)`;
      }
    }
    raf = requestAnimationFrame(animate);
  }

  function handlePointerMove(e) {
    const rect = container.getBoundingClientRect();
    if (parallax > 0 && !reduced) {
      pointer.x = (e.clientX - rect.left) / rect.width - 0.5;
      pointer.y = (e.clientY - rect.top) / rect.height - 0.5;
    }
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    const tileEl = hit && hit.closest ? hit.closest('[data-tile-id]') : null;
    if (!tileEl) return;
    const id = tileEl.dataset.tileId;
    if (id === activeId) return;
    activeId = id;
    hoveredCol = Number(tileEl.dataset.col);
    applyActive();
  }
  function handlePointerLeaveWall() {
    wallHovered = false;
    pointer.x = 0;
    pointer.y = 0;
    activeId = null;
    hoveredCol = -1;
    applyActive();
  }

  container.addEventListener('pointermove', handlePointerMove);
  container.addEventListener('pointerenter', () => { wallHovered = true; });
  container.addEventListener('pointerleave', handlePointerLeaveWall);

  const ro = new ResizeObserver(([entry]) => {
    containerHeight = entry.contentRect.height || containerHeight;
    meta = computeMeta();
    render();
  });
  ro.observe(container);

  rebuild();
  raf = requestAnimationFrame(animate);

  const api = {
    setItems(arr) { itemsArr = arr.slice(); rebuild(); return api; },
    getItems() { return itemsArr.slice(); },
    container
  };
  return api;
}

// 兼容直接以 file:// 打开（非 ES module 加载）
window.initDriftWall = initDriftWall;
