/* ============================================================
   CardSwap — vanilla JS port (GSAP driven)
   Faithful to the React Bits <CardSwap /> mechanics:
   drop front -> promote the rest -> return front to back,
   with elastic easing + skewY. Cards restyled Neo-Brutalist.
   Data comes from window.PROJECTS (swap stack) + window.ALL (list).
   ============================================================ */
(function () {
  const gsap = window.gsap;
  const PROJECTS = window.PROJECTS || [];
  const ALL = window.ALL || PROJECTS;

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Render markdown -> HTML, then neutralize obvious XSS vectors.
  function sanitizeHtml(html) {
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
    html = html.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
    html = html.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
    html = html.replace(/(href|src)\s*=\s*"javascript:[^"]*"/gi, '$1="#"');
    html = html.replace(/(href|src)\s*=\s*'javascript:[^']*'/gi, "$1='#'");
    return html;
  }
  function renderMd(md) {
    if (!md) return '';
    const raw = window.marked ? window.marked.parse(md) : escapeHtml(md);
    return sanitizeHtml(raw);
  }

  function makeSlot(i, distX, distY, total) {
    return { x: i * distX, y: -i * distY, z: -i * Math.abs(distX) * 1.5, zIndex: total - i };
  }
  function placeNow(el, slot, skew) {
    gsap.set(el, {
      x: slot.x, y: slot.y, z: slot.z,
      xPercent: -50, yPercent: -50,
      skewY: skew, transformOrigin: 'center center',
      zIndex: slot.zIndex, force3D: true
    });
  }

  function initSwap() {
    const container = document.getElementById('swap');
    if (!container || !PROJECTS.length) return;

    const width = 680, height = 864;
    const cardDistance = 92, verticalDistance = 108, delay = 4000;
    const pauseOnHover = false, skewAmount = 6, easing = 'elastic';

    const config = easing === 'elastic'
      ? { ease: 'elastic.out(0.6,0.9)', durDrop: 2, durMove: 2, durReturn: 2, promoteOverlap: 0.9, returnDelay: 0.05 }
      : { ease: 'power1.inOut', durDrop: 0.8, durMove: 0.8, durReturn: 0.8, promoteOverlap: 0.45, returnDelay: 0.2 };

    const palette = ['red', 'green', 'ink', 'yellow', 'red', 'green'];
    const refs = [];
    let order = PROJECTS.map((_, i) => i);
    let tlRef = null, intervalRef = null;

    PROJECTS.forEach((p, i) => {
      const el = document.createElement('div');
      el.className = 'card card--' + palette[i % palette.length];
      el.style.width = width + 'px';
      el.style.height = height + 'px';
      el.innerHTML =
        '<div class="no">NO. P-' + String(i + 1).padStart(3, '0') + '</div>' +
        '<h3>' + escapeHtml(p.name) + '</h3>' +
        '<div class="meta">' +
          (p.lang ? '<span class="badge">' + escapeHtml(p.lang) + '</span>' : '') +
        '</div>' +
        '<div class="body">' + renderMd(p.readme || p.desc || '') + '</div>';
      container.appendChild(el);
      refs.push(el);
    });

    refs.forEach((el, i) => placeNow(el, makeSlot(i, cardDistance, verticalDistance, refs.length), skewAmount));

    function swap() {
      if (order.length < 2) return;
      const front = order[0];
      const rest = order.slice(1);
      const elFront = refs[front];
      const tl = gsap.timeline();
      tlRef = tl;

      tl.to(elFront, { y: '+=920', duration: config.durDrop, ease: config.ease });
      tl.addLabel('promote', '-=' + (config.durDrop * config.promoteOverlap));
      rest.forEach((idx, i) => {
        const el = refs[idx];
        const slot = makeSlot(i, cardDistance, verticalDistance, refs.length);
        tl.set(el, { zIndex: slot.zIndex }, 'promote');
        tl.to(el, { x: slot.x, y: slot.y, z: slot.z, duration: config.durMove, ease: config.ease }, 'promote+=' + (i * 0.15));
      });
      const backSlot = makeSlot(refs.length - 1, cardDistance, verticalDistance, refs.length);
      tl.addLabel('return', 'promote+=' + (config.durMove * config.returnDelay));
      tl.call(() => { gsap.set(elFront, { zIndex: backSlot.zIndex }); }, null, 'return');
      tl.to(elFront, { x: backSlot.x, y: backSlot.y, z: backSlot.z, duration: config.durReturn, ease: config.ease }, 'return');
      tl.call(() => { order = rest.concat(front); });
    }

    swap();
    intervalRef = window.setInterval(swap, delay);

    if (pauseOnHover) {
      const node = container;
      const pause = () => { if (tlRef) tlRef.pause(); clearInterval(intervalRef); };
      const resume = () => { if (tlRef) tlRef.play(); intervalRef = window.setInterval(swap, delay); };
      node.addEventListener('mouseenter', pause);
      node.addEventListener('mouseleave', resume);
    }
  }

  function initList() {
    const wrap = document.getElementById('all-list');
    if (!wrap) return;
    const spinePalette = ['#E02820', '#109654', '#000000', '#F2B705', '#1E6FB8', '#7A3FB5'];
    ALL.forEach((p, i) => {
      const a = document.createElement('a');
      a.href = p.url || '#';
      a.target = '_blank';
      a.rel = 'noopener';
      a.style.borderLeftColor = spinePalette[i % spinePalette.length];
      let html = '<b>' + escapeHtml(p.name) + '</b>';
      if (p.lang) html += '<span class="lang">' + escapeHtml(p.lang) + '</span>';
      html += '<div class="desc">' + escapeHtml((p.desc || '').slice(0, 80)) + '</div>';
      a.innerHTML = html;
      wrap.appendChild(a);
    });
  }

  function boot() {
    initSwap();
    initList();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
