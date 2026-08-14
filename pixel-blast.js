/* ============================================================
   PixelBlast (React Bits) — vanilla WebGL2 port, 无 three/postprocessing
   移植自 React Bits <PixelBlast />（原依赖 three + postprocessing）。
   适配：主页全屏背景，使用「红 / 绿 / 黄」三色随机生成（元气番茄配色）。
   说明：原组件用 postprocessing 的 EffectPass 实现 touch-liquid，本移植在
        片元着色器内用轻微 UV 抖动近似「liquid wobble」，避免引入依赖。
   暴露：window.PixelBlastInit(canvasEl, options)
   依赖：无（仅 WebGL2 + 原生 JS）
   ============================================================ */
(function () {
  'use strict';

  var MAX_CLICKS = 10;
  var PALETTE = [
    [1.0, 0.267, 0.220], // 番茄红 #FF4438
    [0.122, 0.819, 0.482], // 绿 #1FD17B
    [1.0, 0.839, 0.0]      // 黄 #FFD600
  ];
  var SHAPE_MAP = { square: 0, circle: 1, triangle: 2, diamond: 3 };

  var VERT_SRC = '#version 300 es\n' +
    'void main() {\n' +
    '  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));\n' +
    '  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);\n' +
    '}\n';

  var FRAG_SRC = [
    '#version 300 es',
    'precision highp float;',
    '',
    'uniform vec3  uPalette[3];',
    'uniform vec2  uResolution;',
    'uniform float uTime;',
    'uniform float uPixelSize;',
    'uniform float uScale;',
    'uniform float uDensity;',
    'uniform float uPixelJitter;',
    'uniform int   uEnableRipples;',
    'uniform float uRippleSpeed;',
    'uniform float uRippleThickness;',
    'uniform float uRippleIntensity;',
    'uniform float uEdgeFade;',
    'uniform int   uShapeType;',
    'uniform float uLiquid;',     // 0..1 近似 liquid wobble 强度
    'uniform float uWobble;',     // liquidWobbleSpeed
    '',
    'const int SHAPE_SQUARE   = 0;',
    'const int SHAPE_CIRCLE   = 1;',
    'const int SHAPE_TRIANGLE = 2;',
    'const int SHAPE_DIAMOND  = 3;',
    '',
    'const int   MAX_CLICKS = 10;',
    'uniform vec2  uClickPos  [MAX_CLICKS];',
    'uniform float uClickTimes[MAX_CLICKS];',
    '',
    'out vec4 fragColor;',
    '',
    'float Bayer2(vec2 a){ a = floor(a); return fract(a.x/2.0 + a.y*a.y*0.75); }',
    '#define Bayer4(a) (Bayer2(0.5*(a))*0.25 + Bayer2(a))',
    '#define Bayer8(a) (Bayer4(0.5*(a))*0.25 + Bayer2(a))',
    '',
    '#define FBM_OCTAVES 5',
    '#define FBM_LACUNARITY 1.25',
    '#define FBM_GAIN 1.0',
    '',
    'float hash11(float n){ return fract(sin(n)*43758.5453); }',
    '',
    'float vnoise(vec3 p){',
    '  vec3 ip = floor(p); vec3 fp = fract(p);',
    '  float n000 = hash11(dot(ip+vec3(0.,0.,0.),vec3(1.,57.,113.)));',
    '  float n100 = hash11(dot(ip+vec3(1.,0.,0.),vec3(1.,57.,113.)));',
    '  float n010 = hash11(dot(ip+vec3(0.,1.,0.),vec3(1.,57.,113.)));',
    '  float n110 = hash11(dot(ip+vec3(1.,1.,0.),vec3(1.,57.,113.)));',
    '  float n001 = hash11(dot(ip+vec3(0.,0.,1.),vec3(1.,57.,113.)));',
    '  float n101 = hash11(dot(ip+vec3(1.,0.,1.),vec3(1.,57.,113.)));',
    '  float n011 = hash11(dot(ip+vec3(0.,1.,1.),vec3(1.,57.,113.)));',
    '  float n111 = hash11(dot(ip+vec3(1.,1.,1.),vec3(1.,57.,113.)));',
    '  vec3 w = fp*fp*fp*(fp*(fp*6.0-15.0)+10.0);',
    '  float x00 = mix(n000,n100,w.x); float x10 = mix(n010,n110,w.x);',
    '  float x01 = mix(n001,n101,w.x); float x11 = mix(n011,n111,w.x);',
    '  float y0 = mix(x00,x10,w.y); float y1 = mix(x01,x11,w.y);',
    '  return mix(y0,y1,w.z)*2.0-1.0;',
    '}',
    '',
    'float fbm2(vec2 uv,float t){',
    '  vec3 p = vec3(uv*uScale, t);',
    '  float amp=1.0, freq=1.0, sum=1.0;',
    '  for(int i=0;i<FBM_OCTAVES;++i){ sum += amp*vnoise(p*freq); freq*=FBM_LACUNARITY; amp*=FBM_GAIN; }',
    '  return sum*0.5+0.5;',
    '}',
    '',
    'float maskCircle(vec2 p,float cov){',
    '  float r = sqrt(cov)*0.25; float d = length(p-0.5)-r; float aa=0.5*fwidth(d);',
    '  return cov*(1.0 - smoothstep(-aa,aa,d*2.0));',
    '}',
    'float maskTriangle(vec2 p,vec2 id,float cov){',
    '  bool flip = mod(id.x+id.y,2.0)>0.5; if(flip) p.x=1.0-p.x;',
    '  float r = sqrt(cov); float d = p.y - r*(1.0-p.x); float aa=fwidth(d);',
    '  return cov*clamp(0.5-d/aa,0.0,1.0);',
    '}',
    'float maskDiamond(vec2 p,float cov){',
    '  float r = sqrt(cov)*0.564; return step(abs(p.x-0.49)+abs(p.y-0.49), r);',
    '}',
    '',
    'void main(){',
    '  float pixelSize = uPixelSize;',
    '  vec2 fragCoord = gl_FragCoord.xy - uResolution*0.5;',
    '  float aspectRatio = uResolution.x/max(uResolution.y,1.0);',
    '  vec2 pixelId = floor(fragCoord/pixelSize);',
    '  vec2 pixelUV = fract(fragCoord/pixelSize);',
    '',
    '  float cellPixelSize = 8.0*pixelSize;',
    '  vec2 cellId = floor(fragCoord/cellPixelSize);',
    '  vec2 cellCoord = cellId*cellPixelSize;',
    '  vec2 uv = cellCoord/uResolution*vec2(aspectRatio,1.0);',
    '',
    '  // 近似 liquid：轻微 UV 抖动（替代 postprocessing touch-liquid）',
    '  uv += uLiquid*0.03*vec2(sin(uv.y*9.0+uTime*uWobble), cos(uv.x*9.0+uTime*uWobble));',
    '',
    '  float base = fbm2(uv, uTime*0.05);',
    '  base = base*0.5 - 0.25;',
    '  float feed = base + (uDensity-0.5)*0.3;',
    '',
    '  float speed = uRippleSpeed; float thickness = uRippleThickness;',
    '  const float dampT = 1.0; const float dampR = 10.0;',
    '  if(uEnableRipples==1){',
    '    for(int i=0;i<MAX_CLICKS;++i){',
    '      vec2 pos = uClickPos[i]; if(pos.x<0.0) continue;',
    '      vec2 cuv = (((pos - uResolution*0.5 - cellPixelSize*0.5)/uResolution))*vec2(aspectRatio,1.0);',
    '      float t = max(uTime-uClickTimes[i],0.0);',
    '      float r = distance(uv,cuv);',
    '      float waveR = speed*t;',
    '      float ring = exp(-pow((r-waveR)/thickness,2.0));',
    '      float atten = exp(-dampT*t)*exp(-dampR*r);',
    '      feed = max(feed, ring*atten*uRippleIntensity);',
    '    }',
    '  }',
    '',
    '  float bayer = Bayer8(fragCoord/uPixelSize)-0.5;',
    '  float bw = step(0.5, feed+bayer);',
    '',
    '  float h = fract(sin(dot(floor(fragCoord/uPixelSize), vec2(127.1,311.7)))*43758.5453);',
    '  float jitterScale = 1.0 + (h-0.5)*uPixelJitter;',
    '  float coverage = bw*jitterScale;',
    '  float M;',
    '  if(uShapeType==SHAPE_CIRCLE) M = maskCircle(pixelUV,coverage);',
    '  else if(uShapeType==SHAPE_TRIANGLE) M = maskTriangle(pixelUV,pixelId,coverage);',
    '  else if(uShapeType==SHAPE_DIAMOND) M = maskDiamond(pixelUV,coverage);',
    '  else M = coverage;',
    '',
    '  if(uEdgeFade>0.0){',
    '    vec2 norm = gl_FragCoord.xy/uResolution;',
    '    float edge = min(min(norm.x,norm.y), min(1.0-norm.x,1.0-norm.y));',
    '    float fade = smoothstep(0.0,uEdgeFade,edge);',
    '    M *= fade;',
    '  }',
    '',
    '  // 红/绿/黄 三色随机生成（按像素 cell 取随机索引）',
    '  int idx = int(fract(h*1.731)*3.0);',
    '  idx = idx<0?0:(idx>2?2:idx);',
    '  vec3 color = uPalette[idx];',
    '',
    '  vec3 srgbColor = mix(color*12.92, 1.055*pow(max(color,vec3(0.0)),vec3(1.0/2.4))-0.055, step(0.0031308,color));',
    '  fragColor = vec4(srgbColor, M);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return s;
    var log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error('[PixelBlast] shader error: ' + log);
  }

  function randomPaletteOrder() {
    // 随机打乱 红/绿/黄 顺序，并给每个色加轻微随机亮度抖动
    var arr = PALETTE.map(function (c) {
      var j = 0.85 + Math.random() * 0.3;
      return [c[0] * j, c[1] * j, c[2] * j];
    });
    for (var i = arr.length - 1; i > 0; i--) {
      var k = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[k]; arr[k] = t;
    }
    return arr;
  }

  function PixelBlastInit(canvas, opts) {
    opts = opts || {};
    if (!canvas) return null;
    var gl = canvas.getContext('webgl2', {
      alpha: true, antialias: true, premultipliedAlpha: false,
      powerPreference: 'high-performance'
    });
    if (!gl) {
      console.warn('[PixelBlast] 无 WebGL2，使用 CSS 渐变兜底');
      canvas.style.background = 'linear-gradient(135deg,#FF4438,#1FD17B,#FFD600)';
      return null;
    }

    var variant = opts.variant || 'circle';
    var pixelSize = opts.pixelSize != null ? opts.pixelSize : 6;
    var patternScale = opts.patternScale != null ? opts.patternScale : 3;
    var patternDensity = opts.patternDensity != null ? opts.patternDensity : 1.2;
    var pixelSizeJitter = opts.pixelSizeJitter != null ? opts.pixelSizeJitter : 0.5;
    var enableRipples = opts.enableRipples !== false;
    var rippleSpeed = opts.rippleSpeed != null ? opts.rippleSpeed : 0.4;
    var rippleThickness = opts.rippleThickness != null ? opts.rippleThickness : 0.12;
    var rippleIntensityScale = opts.rippleIntensityScale != null ? opts.rippleIntensityScale : 1.5;
    var liquid = !!opts.liquid;
    var liquidStrength = opts.liquidStrength != null ? opts.liquidStrength : 0.12;
    var liquidWobbleSpeed = opts.liquidWobbleSpeed != null ? opts.liquidWobbleSpeed : 5;
    var speed = opts.speed != null ? opts.speed : 0.6;
    var edgeFade = opts.edgeFade != null ? opts.edgeFade : 0.25;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT_SRC));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[PixelBlast] link error:', gl.getProgramInfoLog(prog));
      return null;
    }
    gl.useProgram(prog);

    function U(n) { return gl.getUniformLocation(prog, n); }
    var u = {
      palette: U('uPalette'),
      resolution: U('uResolution'),
      time: U('uTime'),
      pixelSize: U('uPixelSize'),
      scale: U('uScale'),
      density: U('uDensity'),
      jitter: U('uPixelJitter'),
      enableRipples: U('uEnableRipples'),
      rippleSpeed: U('uRippleSpeed'),
      rippleThickness: U('uRippleThickness'),
      rippleIntensity: U('uRippleIntensity'),
      edgeFade: U('uEdgeFade'),
      shapeType: U('uShapeType'),
      liquid: U('uLiquid'),
      wobble: U('uWobble'),
      clickPos: U('uClickPos'),
      clickTimes: U('uClickTimes')
    };

    var palette = randomPaletteOrder();
    gl.uniform3fv(u.palette, new Float32Array([
      palette[0][0], palette[0][1], palette[0][2],
      palette[1][0], palette[1][1], palette[1][2],
      palette[2][0], palette[2][1], palette[2][2]
    ]));
    gl.uniform1i(u.shapeType, SHAPE_MAP[variant] != null ? SHAPE_MAP[variant] : 0);
    gl.uniform1f(u.scale, patternScale);
    gl.uniform1f(u.density, patternDensity);
    gl.uniform1f(u.jitter, pixelSizeJitter);
    gl.uniform1i(u.enableRipples, enableRipples ? 1 : 0);
    gl.uniform1f(u.rippleSpeed, rippleSpeed);
    gl.uniform1f(u.rippleThickness, rippleThickness);
    gl.uniform1f(u.rippleIntensity, rippleIntensityScale);
    gl.uniform1f(u.edgeFade, edgeFade);
    gl.uniform1f(u.liquid, liquid ? liquidStrength : 0.0);
    gl.uniform1f(u.wobble, liquidWobbleSpeed);

    // 点击涟漪环形缓冲
    var clickPos = new Float32Array(MAX_CLICKS * 2);
    for (var i = 0; i < MAX_CLICKS; i++) { clickPos[i * 2] = -1; clickPos[i * 2 + 1] = -1; }
    var clickTimes = new Float32Array(MAX_CLICKS);
    var clickIx = 0;
    gl.uniform2fv(u.clickPos, clickPos);
    gl.uniform1fv(u.clickTimes, clickTimes);

    function resize() {
      var w = Math.max(1, canvas.clientWidth || window.innerWidth);
      var h = Math.max(1, canvas.clientHeight || window.innerHeight);
      var dw = Math.round(w * dpr), dh = Math.round(h * dpr);
      if (canvas.width !== dw || canvas.height !== dh) {
        canvas.width = dw; canvas.height = dh;
        gl.viewport(0, 0, dw, dh);
      }
      gl.uniform2f(u.resolution, dw, dh);
      gl.uniform1f(u.pixelSize, pixelSize * dpr);
    }
    resize();
    var ro = ('ResizeObserver' in window) ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(canvas);

    function onPointer(e) {
      if (!enableRipples) return;
      var rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      var fx = (e.clientX - rect.left) * (canvas.width / rect.width);
      var fy = (rect.height - (e.clientY - rect.top)) * (canvas.height / rect.height);
      clickPos[clickIx * 2] = fx;
      clickPos[clickIx * 2 + 1] = fy;
      clickTimes[clickIx] = tNow;
      clickIx = (clickIx + 1) % MAX_CLICKS;
      gl.uniform2fv(u.clickPos, clickPos);
      gl.uniform1fv(u.clickTimes, clickTimes);
    }
    // 背景层 pointer-events:none，故监听 window；仅在背景区域内生效
    window.addEventListener('pointerdown', onPointer, { passive: true });

    var t0 = performance.now() / 1000;
    var tNow = 0;
    var vao = gl.createVertexArray(); // 空 VAO（用 gl_VertexID 画全屏三角形）
    gl.bindVertexArray(vao);

    var running = true;
    function frame() {
      if (!running) return;
      tNow = (performance.now() / 1000 - t0) * speed;
      gl.uniform1f(u.time, tNow);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    return {
      destroy: function () {
        running = false;
        window.removeEventListener('pointerdown', onPointer);
        if (ro) ro.disconnect();
        gl.deleteProgram(prog);
      }
    };
  }

  window.PixelBlastInit = PixelBlastInit;
})();
