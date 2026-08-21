/*
 * liquid-glass.js — adapted from https://github.com/shuding/liquid-glass
 * Original by Shu Ding, 2025 (MIT, see https://github.com/shuding/liquid-glass/blob/main/LICENSE).
 *
 * Refactored into a reusable multi-instance library:
 *   - Exposed Shader class on window.LiquidGlass (no auto-init, no drag listeners).
 *   - Each Shader instance owns a SVG <filter> + <canvas> displacement map,
 *     sized via `width` / `height` and re-rendered on demand via `updateShader()`.
 *   - Use `attachLiquidGlass(el, opts)` from liquid-glass-wrap.js to apply to DOM.
 *
 * The shader algorithm (feDisplacementMap driven by a fragment-defined UV map) is
 * unchanged from the original demo; this file only removes the singleton wrapper
 * and the drag listeners.
 */
(function (global) {
  'use strict';

  function smoothStep(a, b, t) {
    t = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function length(x, y) {
    return Math.sqrt(x * x + y * y);
  }

  function roundedRectSDF(x, y, width, height, radius) {
    const qx = Math.abs(x) - width + radius;
    const qy = Math.abs(y) - height + radius;
    return Math.min(Math.max(qx, qy), 0) + length(Math.max(qx, 0), Math.max(qy, 0)) - radius;
  }

  function texture(x, y) {
    return { type: 't', x: x, y: y };
  }

  function generateId() {
    return 'liquid-glass-' + Math.random().toString(36).slice(2, 11);
  }

  class Shader {
    constructor(options) {
      options = options || {};
      this.width = options.width || 100;
      this.height = options.height || 100;
      this.fragment = options.fragment || function (uv) { return texture(uv.x, uv.y); };
      this.canvasDPI = 1;
      this.id = generateId();
      this.mouse = { x: 0.5, y: 0.5 };
      this.mouseUsed = false;
      this._build();
    }

    _build() {
      // Container — caller styles it (positioned/sized to overlap target element).
      this.container = document.createElement('div');
      this.container.id = this.id + '_host';
      this.container.style.cssText = [
        'position: absolute',
        'top: 0', 'left: 0',
        'width: ' + this.width + 'px',
        'height: ' + this.height + 'px',
        'overflow: hidden',
        'pointer-events: none',
        'z-index: 0'
      ].join(';');

      // Hidden SVG holding the filter.
      this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this.svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      this.svg.setAttribute('width', '0');
      this.svg.setAttribute('height', '0');
      this.svg.style.cssText = 'position: absolute; width: 0; height: 0; pointer-events: none;';

      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      filter.setAttribute('id', this.id + '_filter');
      filter.setAttribute('filterUnits', 'userSpaceOnUse');
      filter.setAttribute('colorInterpolationFilters', 'sRGB');
      filter.setAttribute('x', '0');
      filter.setAttribute('y', '0');
      filter.setAttribute('width', this.width.toString());
      filter.setAttribute('height', this.height.toString());

      this.feImage = document.createElementNS('http://www.w3.org/2000/svg', 'feImage');
      this.feImage.setAttribute('id', this.id + '_map');
      this.feImage.setAttribute('width', this.width.toString());
      this.feImage.setAttribute('height', this.height.toString());

      this.feDisplacementMap = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
      this.feDisplacementMap.setAttribute('in', 'SourceGraphic');
      this.feDisplacementMap.setAttribute('in2', this.id + '_map');
      this.feDisplacementMap.setAttribute('xChannelSelector', 'R');
      this.feDisplacementMap.setAttribute('yChannelSelector', 'G');

      filter.appendChild(this.feImage);
      filter.appendChild(this.feDisplacementMap);
      defs.appendChild(filter);
      this.svg.appendChild(defs);

      // Hidden displacement map canvas.
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.width * this.canvasDPI;
      this.canvas.height = this.height * this.canvasDPI;
      this.canvas.style.cssText = 'display: none;';
      this.context = this.canvas.getContext('2d');
    }

    /**
     * (Re)render the displacement map at the current width × height.
     * Call after changing width/height or after the element resizes.
     */
    updateShader() {
      const mouseProxy = new Proxy(this.mouse, {
        get: function (target, prop) {
          this.mouseUsed = true;
          return target[prop];
        }.bind(this)
      });
      this.mouseUsed = false;

      const w = Math.max(1, Math.round(this.width * this.canvasDPI));
      const h = Math.max(1, Math.round(this.height * this.canvasDPI));
      this.canvas.width = w;
      this.canvas.height = h;

      const data = new Uint8ClampedArray(w * h * 4);
      let maxScale = 0;
      const rawValues = [];

      for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % w;
        const y = Math.floor(i / 4 / w);
        const pos = this.fragment({ x: x / w, y: y / h }, mouseProxy);
        const dx = pos.x * w - x;
        const dy = pos.y * h - y;
        maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
        rawValues.push(dx, dy);
      }

      maxScale *= 0.5;
      let index = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = rawValues[index++] / maxScale + 0.5;
        const g = rawValues[index++] / maxScale + 0.5;
        data[i] = Math.round(r * 255);
        data[i + 1] = Math.round(g * 255);
        data[i + 2] = 0;
        data[i + 3] = 255;
      }

      this.context.putImageData(new ImageData(data, w, h), 0, 0);
      this.feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', this.canvas.toDataURL());
      this.feDisplacementMap.setAttribute('scale', (maxScale / this.canvasDPI).toString());

      // Resize the SVG filter region so backdrop-filter samples the full element.
      const filter = this.svg.querySelector('filter');
      if (filter) {
        filter.setAttribute('width', w.toString());
        filter.setAttribute('height', h.toString());
      }
    }

    /** Append the container and svg into a host element. */
    mount(host) {
      host.appendChild(this.svg);
      host.appendChild(this.container);
    }

    /** Detach the container and svg from the DOM and free GPU resources. */
    destroy() {
      if (this.svg && this.svg.parentNode) this.svg.parentNode.removeChild(this.svg);
      if (this.container && this.container.parentNode) this.container.parentNode.removeChild(this.container);
      this.svg = this.container = this.canvas = this.context = null;
    }
  }

  global.LiquidGlass = {
    Shader: Shader,
    smoothStep: smoothStep,
    roundedRectSDF: roundedRectSDF,
    texture: texture,
    length: length
  };
})(window);
