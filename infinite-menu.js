/*!
 * InfiniteMenu — vanilla JS + WebGL2 port of the React Bits "InfiniteMenu"
 * (original by David Haz, MIT — DavidHDev/react-bits,
 *  src/content/Components/InfiniteMenu/InfiniteMenu.jsx).
 *
 * 用法（与原组件 props 对应）:
 *   window.InfiniteMenu(rootEl, items, { scale: 1.0 });
 *     rootEl : 容器元素（会被填充为全屏的 canvas + 文字叠层）
 *     items  : [{ image, link, title, description }, ...]   // 与本博客 9 个合集一一对应
 *     scale  : 相机推拉倍数，默认 1.0
 *
 * 行为差异（为了让娱乐页可用）:
 *   - 加了 WebGL2 不支持时的 CSS Grid 兜底（保留"左名称 / 右分类"语义）
 *   - canvas 上"轻击未拖动"会跳转到当前活跃项的 link（disc 本身也可点开）
 *   - 文字叠层在暗色 disc 上用白字 + 阴影，主题跟随站点但 disc 本身始终黑
 *   - 仅对 http(s) 图片设 crossOrigin='anonymous'，相对路径（本站）不加
 *   - 框架无关类（Geometry / Icosahedron / Disc / ArcballControl /
 *     InfiniteGridMenu / 着色器 / helper）逐行保持原样；只把 ES module 的
 *     `import { mat4, quat, vec2, vec3 } from 'gl-matrix'` 换成对
 *     window.glMatrix 的解构（gl-matrix 3.4.3 UMD 全局）。
 */
(function () {
  'use strict';

  var glMatrix = window.glMatrix || {};
  var mat4 = glMatrix.mat4;
  var quat = glMatrix.quat;
  var vec2 = glMatrix.vec2;
  var vec3 = glMatrix.vec3;

  // ──────────────────────── shaders (verbatim) ────────────────────────
  var discVertShaderSource =
    '#version 300 es\n' +
    '\n' +
    'uniform mat4 uWorldMatrix;\n' +
    'uniform mat4 uViewMatrix;\n' +
    'uniform mat4 uProjectionMatrix;\n' +
    'uniform vec3 uCameraPosition;\n' +
    'uniform vec4 uRotationAxisVelocity;\n' +
    '\n' +
    'in vec3 aModelPosition;\n' +
    'in vec3 aModelNormal;\n' +
    'in vec2 aModelUvs;\n' +
    'in mat4 aInstanceMatrix;\n' +
    '\n' +
    'out vec2 vUvs;\n' +
    'out float vAlpha;\n' +
    'flat out int vInstanceId;\n' +
    '\n' +
    '#define PI 3.141593\n' +
    '\n' +
    'void main() {\n' +
    '    vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.);\n' +
    '\n' +
    '    vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0., 0., 0., 1.)).xyz;\n' +
    '    float radius = length(centerPos.xyz);\n' +
    '\n' +
    '    if (gl_VertexID > 0) {\n' +
    '        vec3 rotationAxis = uRotationAxisVelocity.xyz;\n' +
    '        float rotationVelocity = min(.15, uRotationAxisVelocity.w * 15.);\n' +
    '        vec3 stretchDir = normalize(cross(centerPos, rotationAxis));\n' +
    '        vec3 relativeVertexPos = normalize(worldPosition.xyz - centerPos);\n' +
    '        float strength = dot(stretchDir, relativeVertexPos);\n' +
    '        float invAbsStrength = min(0., abs(strength) - 1.);\n' +
    '        strength = rotationVelocity * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.);\n' +
    '        worldPosition.xyz += stretchDir * strength;\n' +
    '    }\n' +
    '\n' +
    '    worldPosition.xyz = radius * normalize(worldPosition.xyz);\n' +
    '\n' +
    '    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;\n' +
    '\n' +
    '    vAlpha = smoothstep(0.5, 1., normalize(worldPosition.xyz).z) * .9 + .1;\n' +
    '    vUvs = aModelUvs;\n' +
    '    vInstanceId = gl_InstanceID;\n' +
    '}\n';

  var discFragShaderSource =
    '#version 300 es\n' +
    'precision highp float;\n' +
    '\n' +
    'uniform sampler2D uTex;\n' +
    'uniform int uItemCount;\n' +
    'uniform int uAtlasSize;\n' +
    '\n' +
    'out vec4 outColor;\n' +
    '\n' +
    'in vec2 vUvs;\n' +
    'in float vAlpha;\n' +
    'flat in int vInstanceId;\n' +
    '\n' +
    'void main() {\n' +
    '    int itemIndex = vInstanceId % uItemCount;\n' +
    '    int cellsPerRow = uAtlasSize;\n' +
    '    int cellX = itemIndex % cellsPerRow;\n' +
    '    int cellY = itemIndex / cellsPerRow;\n' +
    '    vec2 cellSize = vec2(1.0) / vec2(float(cellsPerRow));\n' +
    '    vec2 cellOffset = vec2(float(cellX), float(cellY)) * cellSize;\n' +
    '\n' +
    '    ivec2 texSize = textureSize(uTex, 0);\n' +
    '    float imageAspect = float(texSize.x) / float(texSize.y);\n' +
    '    float containerAspect = 1.0;\n' +
    '    \n' +
    '    float scale = max(imageAspect / containerAspect, \n' +
    '                     containerAspect / imageAspect);\n' +
    '    \n' +
    '    vec2 st = vec2(vUvs.x, 1.0 - vUvs.y);\n' +
    '    st = (st - 0.5) * scale + 0.5;\n' +
    '    \n' +
    '    st = clamp(st, 0.0, 1.0);\n' +
    '    \n' +
    '    st = st * cellSize + cellOffset;\n' +
    '    \n' +
    '    outColor = texture(uTex, st);\n' +
    '    outColor.a *= vAlpha;\n' +
    '}\n';

  // ──────────────────────── geometry (verbatim) ────────────────────────
  function Face(a, b, c) { this.a = a; this.b = b; this.c = c; }

  function Vertex(x, y, z) {
    this.position = vec3.fromValues(x, y, z);
    this.normal = vec3.create();
    this.uv = vec2.create();
  }

  function Geometry() {
    this.vertices = [];
    this.faces = [];
  }
  Geometry.prototype.addVertex = function () {
    for (var i = 0; i < arguments.length; i += 3) {
      this.vertices.push(new Vertex(arguments[i], arguments[i + 1], arguments[i + 2]));
    }
    return this;
  };
  Geometry.prototype.addFace = function () {
    for (var i = 0; i < arguments.length; i += 3) {
      this.faces.push(new Face(arguments[i], arguments[i + 1], arguments[i + 2]));
    }
    return this;
  };
  Object.defineProperty(Geometry.prototype, 'lastVertex', {
    get: function () { return this.vertices[this.vertices.length - 1]; }
  });
  Geometry.prototype.subdivide = function (divisions) {
    divisions = divisions || 1;
    var midPointCache = {};
    var f = this.faces;
    for (var div = 0; div < divisions; ++div) {
      var newFaces = new Array(f.length * 4);
      f.forEach(function (face, ndx) {
        var mAB = this.getMidPoint(face.a, face.b, midPointCache);
        var mBC = this.getMidPoint(face.b, face.c, midPointCache);
        var mCA = this.getMidPoint(face.c, face.a, midPointCache);
        var i = ndx * 4;
        newFaces[i + 0] = new Face(face.a, mAB, mCA);
        newFaces[i + 1] = new Face(face.b, mBC, mAB);
        newFaces[i + 2] = new Face(face.c, mCA, mBC);
        newFaces[i + 3] = new Face(mAB, mBC, mCA);
      }, this);
      f = newFaces;
    }
    this.faces = f;
    return this;
  };
  Geometry.prototype.spherize = function (radius) {
    radius = radius == null ? 1 : radius;
    this.vertices.forEach(function (vertex) {
      vec3.normalize(vertex.normal, vertex.position);
      vec3.scale(vertex.position, vertex.normal, radius);
    });
    return this;
  };
  Object.defineProperty(Geometry.prototype, 'data', {
    get: function () {
      return { vertices: this.vertexData, indices: this.indexData, normals: this.normalData, uvs: this.uvData };
    }
  });
  Object.defineProperty(Geometry.prototype, 'vertexData', {
    get: function () { return new Float32Array(this.vertices.flatMap(function (v) { return Array.from(v.position); })); }
  });
  Object.defineProperty(Geometry.prototype, 'normalData', {
    get: function () { return new Float32Array(this.vertices.flatMap(function (v) { return Array.from(v.normal); })); }
  });
  Object.defineProperty(Geometry.prototype, 'uvData', {
    get: function () { return new Float32Array(this.vertices.flatMap(function (v) { return Array.from(v.uv); })); }
  });
  Object.defineProperty(Geometry.prototype, 'indexData', {
    get: function () { return new Uint16Array(this.faces.flatMap(function (f) { return [f.a, f.b, f.c]; })); }
  });
  Geometry.prototype.getMidPoint = function (ndxA, ndxB, cache) {
    var cacheKey = ndxA < ndxB ? 'k_' + ndxB + '_' + ndxA : 'k_' + ndxA + '_' + ndxB;
    if (Object.prototype.hasOwnProperty.call(cache, cacheKey)) return cache[cacheKey];
    var a = this.vertices[ndxA].position;
    var b = this.vertices[ndxB].position;
    var ndx = this.vertices.length;
    cache[cacheKey] = ndx;
    this.addVertex((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5);
    return ndx;
  };

  function IcosahedronGeometry() {
    Geometry.call(this);
    var t = Math.sqrt(5) * 0.5 + 0.5;
    this.addVertex(
      -1, t, 0,   1, t, 0,   -1, -t, 0,   1, -t, 0,
      0, -1, t,   0, 1, t,   0, -1, -t,  0, 1, -t,
      t, 0, -1,   t, 0, 1,   -t, 0, -1,  -t, 0, 1
    ).addFace(
      0, 11, 5,  0, 5, 1,   0, 1, 7,   0, 7, 10,  0, 10, 11,
      1, 5, 9,   5, 11, 4, 11, 10, 2, 10, 7, 6,   7, 1, 8,
      3, 9, 4,   3, 4, 2,  3, 2, 6,   3, 6, 8,   3, 8, 9,
      4, 9, 5,   2, 4, 11, 6, 2, 10,  8, 6, 7,   9, 8, 1
    );
  }
  IcosahedronGeometry.prototype = Object.create(Geometry.prototype);
  IcosahedronGeometry.prototype.constructor = IcosahedronGeometry;

  function DiscGeometry(steps, radius) {
    Geometry.call(this);
    steps = Math.max(4, steps || 4);
    radius = radius == null ? 1 : radius;
    var alpha = (2 * Math.PI) / steps;
    this.addVertex(0, 0, 0);
    this.lastVertex.uv[0] = 0.5;
    this.lastVertex.uv[1] = 0.5;
    for (var i = 0; i < steps; ++i) {
      var x = Math.cos(alpha * i);
      var y = Math.sin(alpha * i);
      this.addVertex(radius * x, radius * y, 0);
      this.lastVertex.uv[0] = x * 0.5 + 0.5;
      this.lastVertex.uv[1] = y * 0.5 + 0.5;
      if (i > 0) this.addFace(0, i, i + 1);
    }
    this.addFace(0, steps, 1);
  }
  DiscGeometry.prototype = Object.create(Geometry.prototype);
  DiscGeometry.prototype.constructor = DiscGeometry;

  // ──────────────────────── gl helpers (verbatim) ────────────────────────
  function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) return shader;
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  function createProgram(gl, shaderSources, transformFeedbackVaryings, attribLocations) {
    var program = gl.createProgram();
    [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].forEach(function (type, ndx) {
      var shader = createShader(gl, type, shaderSources[ndx]);
      if (shader) gl.attachShader(program, shader);
    });
    if (transformFeedbackVaryings) {
      gl.transformFeedbackVaryings(program, transformFeedbackVaryings, gl.SEPARATE_ATTRIBS);
    }
    if (attribLocations) {
      for (var attrib in attribLocations) {
        if (Object.prototype.hasOwnProperty.call(attribLocations, attrib)) {
          gl.bindAttribLocation(program, attribLocations[attrib], attrib);
        }
      }
    }
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) return program;
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  function makeVertexArray(gl, bufLocNumElmPairs, indices) {
    var va = gl.createVertexArray();
    gl.bindVertexArray(va);
    bufLocNumElmPairs.forEach(function (pair) {
      var buffer = pair[0], loc = pair[1], numElem = pair[2];
      if (loc === -1) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, numElem, gl.FLOAT, false, 0, 0);
    });
    if (indices) {
      var indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    }
    gl.bindVertexArray(null);
    return va;
  }
  function resizeCanvasToDisplaySize(canvas) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var displayWidth = Math.round(canvas.clientWidth * dpr);
    var displayHeight = Math.round(canvas.clientHeight * dpr);
    var needResize = canvas.width !== displayWidth || canvas.height !== displayHeight;
    if (needResize) { canvas.width = displayWidth; canvas.height = displayHeight; }
    return needResize;
  }
  function makeBuffer(gl, sizeOrData, usage) {
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, sizeOrData, usage);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return buf;
  }
  function createAndSetupTexture(gl, minFilter, magFilter, wrapS, wrapT) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
    return texture;
  }

  // ──────────────────────── ArcballControl (verbatim) ────────────────────────
  function ArcballControl(canvas, updateCallback) {
    this.canvas = canvas;
    this.updateCallback = updateCallback || function () { return null; };
    this.isPointerDown = false;
    this.orientation = quat.create();
    this.pointerRotation = quat.create();
    this.rotationVelocity = 0;
    this.rotationAxis = vec3.fromValues(1, 0, 0);
    this.snapDirection = vec3.fromValues(0, 0, -1);
    this.snapTargetDirection = null;
    this.EPSILON = 0.1;
    this.IDENTITY_QUAT = quat.create();

    this.pointerPos = vec2.create();
    this.previousPointerPos = vec2.create();
    this._rotationVelocity = 0;
    this._combinedQuat = quat.create();

    var self = this;
    canvas.addEventListener('pointerdown', function (e) {
      vec2.set(self.pointerPos, e.clientX, e.clientY);
      vec2.copy(self.previousPointerPos, self.pointerPos);
      self.isPointerDown = true;
    });
    canvas.addEventListener('pointerup', function () { self.isPointerDown = false; });
    canvas.addEventListener('pointerleave', function () { self.isPointerDown = false; });
    canvas.addEventListener('pointermove', function (e) {
      if (self.isPointerDown) vec2.set(self.pointerPos, e.clientX, e.clientY);
    });
    canvas.style.touchAction = 'none';
  }
  ArcballControl.prototype.update = function (deltaTime, targetFrameDuration) {
    targetFrameDuration = targetFrameDuration || 16;
    var timeScale = deltaTime / targetFrameDuration + 0.00001;
    var angleFactor = timeScale;
    var snapRotation = quat.create();
    if (this.isPointerDown) {
      var INTENSITY = 0.3 * timeScale;
      var ANGLE_AMPLIFICATION = 5 / timeScale;
      var midPointerPos = vec2.sub(vec2.create(), this.pointerPos, this.previousPointerPos);
      vec2.scale(midPointerPos, midPointerPos, INTENSITY);
      if (vec2.sqrLen(midPointerPos) > this.EPSILON) {
        vec2.add(midPointerPos, this.previousPointerPos, midPointerPos);
        var p = this._project(midPointerPos);
        var q = this._project(this.previousPointerPos);
        var a = vec3.normalize(vec3.create(), p);
        var b = vec3.normalize(vec3.create(), q);
        vec2.copy(this.previousPointerPos, midPointerPos);
        angleFactor *= ANGLE_AMPLIFICATION;
        this.quatFromVectors(a, b, this.pointerRotation, angleFactor);
      } else {
        quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, INTENSITY);
      }
    } else {
      var IDLE_INTENSITY = 0.1 * timeScale;
      quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, IDLE_INTENSITY);
      if (this.snapTargetDirection) {
        var SNAPPING_INTENSITY = 0.2;
        var sa = this.snapTargetDirection;
        var sb = this.snapDirection;
        var sqrDist = vec3.squaredDistance(sa, sb);
        var distanceFactor = Math.max(0.1, 1 - sqrDist * 10);
        angleFactor *= SNAPPING_INTENSITY * distanceFactor;
        this.quatFromVectors(sa, sb, snapRotation, angleFactor);
      }
    }
    var combinedQuat = quat.multiply(quat.create(), snapRotation, this.pointerRotation);
    this.orientation = quat.multiply(quat.create(), combinedQuat, this.orientation);
    quat.normalize(this.orientation, this.orientation);
    var RA_INTENSITY = 0.8 * timeScale;
    quat.slerp(this._combinedQuat, this._combinedQuat, combinedQuat, RA_INTENSITY);
    quat.normalize(this._combinedQuat, this._combinedQuat);
    var rad = Math.acos(this._combinedQuat[3]) * 2.0;
    var s = Math.sin(rad / 2.0);
    var rv = 0;
    if (s > 0.000001) {
      rv = rad / (2 * Math.PI);
      this.rotationAxis[0] = this._combinedQuat[0] / s;
      this.rotationAxis[1] = this._combinedQuat[1] / s;
      this.rotationAxis[2] = this._combinedQuat[2] / s;
    }
    var RV_INTENSITY = 0.5 * timeScale;
    this._rotationVelocity += (rv - this._rotationVelocity) * RV_INTENSITY;
    this.rotationVelocity = this._rotationVelocity / timeScale;
    this.updateCallback(deltaTime);
  };
  ArcballControl.prototype.quatFromVectors = function (a, b, out, angleFactor) {
    angleFactor = angleFactor == null ? 1 : angleFactor;
    var axis = vec3.cross(vec3.create(), a, b);
    vec3.normalize(axis, axis);
    var d = Math.max(-1, Math.min(1, vec3.dot(a, b)));
    var angle = Math.acos(d) * angleFactor;
    quat.setAxisAngle(out, axis, angle);
    return { q: out, axis: axis, angle: angle };
  };
  ArcballControl.prototype._project = function (pos) {
    var r = 2;
    var w = this.canvas.clientWidth;
    var h = this.canvas.clientHeight;
    var s = Math.max(w, h) - 1;
    var x = (2 * pos[0] - w - 1) / s;
    var y = (2 * pos[1] - h - 1) / s;
    var z = 0;
    var xySq = x * x + y * y;
    var rSq = r * r;
    if (xySq <= rSq / 2.0) z = Math.sqrt(rSq - xySq);
    else z = rSq / Math.sqrt(xySq);
    return vec3.fromValues(-x, y, z);
  };

  // ──────────────────────── InfiniteGridMenu (verbatim) ────────────────────────
  function InfiniteGridMenu(canvas, items, onActiveItemChange, onMovementChange, onInit, scale) {
    this.TARGET_FRAME_DURATION = 1000 / 60;
    this.SPHERE_RADIUS = 2;
    this._time = 0;
    this._deltaTime = 0;
    this._deltaFrames = 0;
    this._frames = 0;
    this.canvas = canvas;
    this.items = items || [];
    this.onActiveItemChange = onActiveItemChange || function () {};
    this.onMovementChange = onMovementChange || function () {};
    this.scaleFactor = scale == null ? 1.0 : scale;

    this.camera = {
      matrix: mat4.create(),
      near: 0.1,
      far: 40,
      fov: Math.PI / 4,
      aspect: 1,
      position: vec3.fromValues(0, 0, 3 * this.scaleFactor),
      up: vec3.fromValues(0, 1, 0),
      matrices: {
        view: mat4.create(),
        projection: mat4.create(),
        inversProjection: mat4.create()
      }
    };
    this.nearestVertexIndex = null;
    this.smoothRotationVelocity = 0;
    this.movementActive = false;
    this._init(onInit);
  }
  InfiniteGridMenu.prototype.resize = function () {
    this.viewportSize = vec2.set(
      this.viewportSize || vec2.create(),
      this.canvas.clientWidth,
      this.canvas.clientHeight
    );
    var gl = this.gl;
    var needsResize = resizeCanvasToDisplaySize(gl.canvas);
    if (needsResize) gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    this._updateProjectionMatrix(gl);
  };
  InfiniteGridMenu.prototype.run = function (time) {
    time = time || 0;
    this._deltaTime = Math.min(32, time - this._time);
    this._time = time;
    this._deltaFrames = this._deltaTime / this.TARGET_FRAME_DURATION;
    this._frames += this._deltaFrames;
    this._animate(this._deltaTime);
    this._render();
    requestAnimationFrame(function (t) { this.run(t); }.bind(this));
  };
  InfiniteGridMenu.prototype._init = function (onInit) {
    // alpha:true 让 canvas 透明，背景透出 .im-root 的 var(--white)，从而随站点主题自适应（明色→白、暗色→#181818）
    this.gl = this.canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: false });
    var gl = this.gl;
    if (!gl) throw new Error('No WebGL 2 context!');

    this.viewportSize = vec2.fromValues(this.canvas.clientWidth, this.canvas.clientHeight);
    this.drawBufferSize = vec2.clone(this.viewportSize);

    this.discProgram = createProgram(
      gl,
      [discVertShaderSource, discFragShaderSource],
      null,
      { aModelPosition: 0, aModelNormal: 1, aModelUvs: 2, aInstanceMatrix: 3 }
    );
    this.discLocations = {
      aModelPosition: gl.getAttribLocation(this.discProgram, 'aModelPosition'),
      aModelUvs: gl.getAttribLocation(this.discProgram, 'aModelUvs'),
      aInstanceMatrix: gl.getAttribLocation(this.discProgram, 'aInstanceMatrix'),
      uWorldMatrix: gl.getUniformLocation(this.discProgram, 'uWorldMatrix'),
      uViewMatrix: gl.getUniformLocation(this.discProgram, 'uViewMatrix'),
      uProjectionMatrix: gl.getUniformLocation(this.discProgram, 'uProjectionMatrix'),
      uCameraPosition: gl.getUniformLocation(this.discProgram, 'uCameraPosition'),
      uScaleFactor: gl.getUniformLocation(this.discProgram, 'uScaleFactor'),
      uRotationAxisVelocity: gl.getUniformLocation(this.discProgram, 'uRotationAxisVelocity'),
      uTex: gl.getUniformLocation(this.discProgram, 'uTex'),
      uFrames: gl.getUniformLocation(this.discProgram, 'uFrames'),
      uItemCount: gl.getUniformLocation(this.discProgram, 'uItemCount'),
      uAtlasSize: gl.getUniformLocation(this.discProgram, 'uAtlasSize')
    };
    this.discGeo = new DiscGeometry(56, 1);
    this.discBuffers = this.discGeo.data;
    this.discVAO = makeVertexArray(
      gl,
      [
        [makeBuffer(gl, this.discBuffers.vertices, gl.STATIC_DRAW), this.discLocations.aModelPosition, 3],
        [makeBuffer(gl, this.discBuffers.uvs, gl.STATIC_DRAW), this.discLocations.aModelUvs, 2]
      ],
      this.discBuffers.indices
    );

    this.icoGeo = new IcosahedronGeometry();
    this.icoGeo.subdivide(1).spherize(this.SPHERE_RADIUS);
    this.instancePositions = this.icoGeo.vertices.map(function (v) { return v.position; });
    this.DISC_INSTANCE_COUNT = this.icoGeo.vertices.length;
    this._initDiscInstances(this.DISC_INSTANCE_COUNT);

    this.worldMatrix = mat4.create();
    this._initTexture();

    var self = this;
    this.control = new ArcballControl(this.canvas, function (dt) { self._onControlUpdate(dt); });

    this._updateCameraMatrix();
    this._updateProjectionMatrix(gl);
    this.resize();

    // 监听站点主题切换：data-theme 变化时同步更新 _render() 的 clearColor，避免浅色模式还把背景涂黑。
    if (typeof MutationObserver !== 'undefined' && !this._themeObserver) {
      var self = this;
      this._themeObserver = new MutationObserver(function () {
        var dark = (document.documentElement.getAttribute('data-theme') === 'dark');
        self._clearRGB = dark ? [0, 0, 0] : [1, 1, 1];
      });
      this._themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    if (onInit) onInit(this);
  };
  InfiniteGridMenu.prototype._initTexture = function () {
    var gl = this.gl;
    var self = this;
    this.tex = createAndSetupTexture(gl, gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
    var itemCount = Math.max(1, this.items.length);
    this.atlasSize = Math.ceil(Math.sqrt(itemCount));
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var cellSize = 512;
    canvas.width = this.atlasSize * cellSize;
    canvas.height = this.atlasSize * cellSize;
    // init atlas to opaque black so the disc isn't transparent before images arrive
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    Promise.all(
      this.items.map(function (item) {
        return new Promise(function (resolve) {
          var img = new Image();
          if (/^https?:/i.test(item.image)) img.crossOrigin = 'anonymous';
          img.onload = function () { resolve(img); };
          img.onerror = function () { resolve(null); };
          img.src = item.image;
        });
      })
    ).then(function (images) {
      // 将每张图以 "cover" 方式居中裁切、铺满 512×512 cell（填满方形）。
      // 展示框是圆形 disc 几何（UV 圆心映射到 cell 中心、半径 0.5），
      // 圆形几何会把方形裁成圆 → 封面即呈圆形、正好填满展示框，无黑边。
      // 原版假设源图 1:1；本博客合集封面是 3:2 JPG，用 cover 居中裁切即可适配。
      images.forEach(function (img, i) {
        var x = (i % self.atlasSize) * cellSize;
        var y = Math.floor(i / self.atlasSize) * cellSize;
        if (!img) return;
        var iw = img.naturalWidth || img.width;
        var ih = img.naturalHeight || img.height;
        if (!iw || !ih) { ctx.drawImage(img, x, y, cellSize, cellSize); return; }
        var fit = Math.max(cellSize / iw, cellSize / ih);
        var dw = iw * fit, dh = ih * fit;
        var dx = x + (cellSize - dw) / 2;
        var dy = y + (cellSize - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
      });
      gl.bindTexture(gl.TEXTURE_2D, self.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.generateMipmap(gl.TEXTURE_2D);
    });
  };
  InfiniteGridMenu.prototype._initDiscInstances = function (count) {
    var gl = this.gl;
    this.discInstances = {
      matricesArray: new Float32Array(count * 16),
      matrices: [],
      buffer: gl.createBuffer()
    };
    for (var i = 0; i < count; ++i) {
      var instanceMatrixArray = new Float32Array(this.discInstances.matricesArray.buffer, i * 16 * 4, 16);
      instanceMatrixArray.set(mat4.create());
      this.discInstances.matrices.push(instanceMatrixArray);
    }
    gl.bindVertexArray(this.discVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.discInstances.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.discInstances.matricesArray.byteLength, gl.DYNAMIC_DRAW);
    var mat4AttribSlotCount = 4;
    var bytesPerMatrix = 16 * 4;
    for (var j = 0; j < mat4AttribSlotCount; ++j) {
      var loc = this.discLocations.aInstanceMatrix + j;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, bytesPerMatrix, j * 4 * 4);
      gl.vertexAttribDivisor(loc, 1);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
  };
  InfiniteGridMenu.prototype._animate = function (deltaTime) {
    var gl = this.gl;
    this.control.update(deltaTime, this.TARGET_FRAME_DURATION);
    var quatTransform = function (out, a, q) { return vec3.transformQuat(out, a, q); };
    var positions = this.instancePositions.map(function (p) { return quatTransform(vec3.create(), p, this.control.orientation); }, this);
    var scaleBase = 0.25;
    var SCALE_INTENSITY = 0.6;
    for (var ndx = 0; ndx < positions.length; ++ndx) {
      var p = positions[ndx];
      var depthZ = Math.abs(p[2]) / this.SPHERE_RADIUS;
      var s = depthZ * SCALE_INTENSITY + (1 - SCALE_INTENSITY);
      var finalScale = s * scaleBase;
      var matrix = mat4.create();
      mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), vec3.negate(vec3.create(), p)));
      mat4.multiply(matrix, matrix, mat4.targetTo(mat4.create(), [0, 0, 0], p, [0, 1, 0]));
      mat4.multiply(matrix, matrix, mat4.fromScaling(mat4.create(), [finalScale, finalScale, finalScale]));
      mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), [0, 0, -this.SPHERE_RADIUS]));
      mat4.copy(this.discInstances.matrices[ndx], matrix);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.discInstances.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.discInstances.matricesArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this.smoothRotationVelocity = this.control.rotationVelocity;
  };
  InfiniteGridMenu.prototype._render = function () {
    var gl = this.gl;
    gl.useProgram(this.discProgram);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    // 主题感知 clearColor：浅色模式用白+透明、深色模式用黑+透明。canvas 透明 + var(--white/--black) 自适应 100% 反映站点主题。
    var _isDark = (document.documentElement.getAttribute('data-theme') === 'dark');
    this._clearRGB = _isDark ? [0, 0, 0] : [1, 1, 1];
    gl.clearColor(this._clearRGB[0], this._clearRGB[1], this._clearRGB[2], 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(this.discLocations.uWorldMatrix, false, this.worldMatrix);
    gl.uniformMatrix4fv(this.discLocations.uViewMatrix, false, this.camera.matrices.view);
    gl.uniformMatrix4fv(this.discLocations.uProjectionMatrix, false, this.camera.matrices.projection);
    gl.uniform3f(
      this.discLocations.uCameraPosition,
      this.camera.position[0], this.camera.position[1], this.camera.position[2]
    );
    gl.uniform4f(
      this.discLocations.uRotationAxisVelocity,
      this.control.rotationAxis[0], this.control.rotationAxis[1], this.control.rotationAxis[2],
      this.smoothRotationVelocity * 1.1
    );
    gl.uniform1i(this.discLocations.uItemCount, this.items.length);
    gl.uniform1i(this.discLocations.uAtlasSize, this.atlasSize);
    gl.uniform1f(this.discLocations.uFrames, this._frames);
    gl.uniform1f(this.discLocations.uScaleFactor, this.scaleFactor);
    gl.uniform1i(this.discLocations.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.bindVertexArray(this.discVAO);
    gl.drawElementsInstanced(
      gl.TRIANGLES,
      this.discBuffers.indices.length,
      gl.UNSIGNED_SHORT,
      0,
      this.DISC_INSTANCE_COUNT
    );
  };
  InfiniteGridMenu.prototype._updateCameraMatrix = function () {
    mat4.targetTo(this.camera.matrix, this.camera.position, [0, 0, 0], this.camera.up);
    mat4.invert(this.camera.matrices.view, this.camera.matrix);
  };
  InfiniteGridMenu.prototype._updateProjectionMatrix = function (gl) {
    this.camera.aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var height = this.SPHERE_RADIUS * 0.35;
    var distance = this.camera.position[2];
    if (this.camera.aspect > 1) this.camera.fov = 2 * Math.atan(height / distance);
    else this.camera.fov = 2 * Math.atan(height / this.camera.aspect / distance);
    mat4.perspective(
      this.camera.matrices.projection, this.camera.fov, this.camera.aspect, this.camera.near, this.camera.far
    );
    mat4.invert(this.camera.matrices.inversProjection, this.camera.matrices.projection);
  };
  InfiniteGridMenu.prototype._onControlUpdate = function (deltaTime) {
    var timeScale = deltaTime / this.TARGET_FRAME_DURATION + 0.0001;
    var damping = 5 / timeScale;
    var cameraTargetZ = 3 * this.scaleFactor;
    var isMoving = this.control.isPointerDown || Math.abs(this.smoothRotationVelocity) > 0.01;
    if (isMoving !== this.movementActive) {
      this.movementActive = isMoving;
      this.onMovementChange(isMoving);
    }
    if (!this.control.isPointerDown) {
      var nearestVertexIndex = this._findNearestVertexIndex();
      var itemIndex = nearestVertexIndex % Math.max(1, this.items.length);
      this.onActiveItemChange(itemIndex);
      var snapDir = vec3.normalize(vec3.create(), this._getVertexWorldPosition(nearestVertexIndex));
      this.control.snapTargetDirection = snapDir;
    } else {
      cameraTargetZ += this.control.rotationVelocity * 80 + 2.5;
      damping = 7 / timeScale;
    }
    this.camera.position[2] += (cameraTargetZ - this.camera.position[2]) / damping;
    this._updateCameraMatrix();
  };
  InfiniteGridMenu.prototype._findNearestVertexIndex = function () {
    var n = this.control.snapDirection;
    var inversOrientation = quat.conjugate(quat.create(), this.control.orientation);
    var nt = vec3.transformQuat(vec3.create(), n, inversOrientation);
    var maxD = -1;
    var nearestVertexIndex;
    for (var i = 0; i < this.instancePositions.length; ++i) {
      var d = vec3.dot(nt, this.instancePositions[i]);
      if (d > maxD) { maxD = d; nearestVertexIndex = i; }
    }
    return nearestVertexIndex;
  };
  InfiniteGridMenu.prototype._getVertexWorldPosition = function (index) {
    var nearestVertexPos = this.instancePositions[index];
    return vec3.transformQuat(vec3.create(), nearestVertexPos, this.control.orientation);
  };

  // ──────────────────────── WebGL2 detection / fallback ────────────────────────
  function hasWebGL2() {
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('experimental-webgl2'));
    } catch (e) { return false; }
  }

  // ──────────────────────── Vanilla wrapper ────────────────────────
  function navigateTo(link) {
    if (!link) return;
    if (/^https?:\/\//i.test(link)) window.open(link, '_blank', 'noopener,noreferrer');
    else window.location.href = link;
  }

  function buildFallback(rootEl, items) {
    rootEl.classList.add('im-fallback');
    var grid = document.createElement('div');
    grid.className = 'im-fallback-grid';
    items.forEach(function (it) {
      var card = document.createElement('a');
      card.className = 'im-fallback-card';
      card.href = it.link || '#';
      var img = document.createElement('img');
      img.src = it.image;
      img.alt = it.title || '';
      img.loading = 'lazy';
      var title = document.createElement('span');
      title.className = 'im-fallback-title';
      title.textContent = it.title || '';
      if (it.original) {
        title.appendChild(document.createElement('br'));
        var orig = document.createElement('span');
        orig.className = 'im-fallback-orig';
        orig.textContent = it.original;
        title.appendChild(orig);
      }
      var desc = document.createElement('span');
      desc.className = 'im-fallback-desc';
      desc.textContent = it.description || '';
      card.appendChild(img);
      card.appendChild(title);
      card.appendChild(desc);
      grid.appendChild(card);
    });
    rootEl.appendChild(grid);
    var note = document.createElement('p');
    note.className = 'im-fallback-note';
    note.textContent = '当前浏览器不支持 WebGL 2，已切换到网格视图。';
    rootEl.appendChild(note);
    return { setItems: function (n) { rootEl.innerHTML = ''; buildFallback(rootEl, n); }, destroy: function () { rootEl.innerHTML = ''; } };
  }

  function build(rootEl, items, options) {
    items = (items && items.length) ? items : [{ image: '', link: '#', title: 'Empty', description: '' }];
    options = options || {};
    var scale = options.scale == null ? 1.0 : options.scale;

    if (!hasWebGL2()) {
      console.warn('[InfiniteMenu] WebGL2 unavailable, using fallback grid.');
      return buildFallback(rootEl, items);
    }

    rootEl.classList.add('im-root');

    // overlay DOM
    var canvas = document.createElement('canvas');
    canvas.id = 'infinite-grid-menu-canvas';
    rootEl.appendChild(canvas);

    // 名称：第一行中文（.name-cn）、第二行原文（.name-orig），同属一个 .face-title
    var titleEl = document.createElement('h2');
    titleEl.className = 'face-title inactive';
    var nameCn = document.createElement('span');
    nameCn.className = 'name-cn';
    var nameOrig = document.createElement('span');
    nameOrig.className = 'name-orig';
    titleEl.appendChild(nameCn);
    titleEl.appendChild(nameOrig);

    // 分类：与名称同处左侧、同字体、垂直对称
    var descEl = document.createElement('p');
    descEl.className = 'face-description inactive';

    // 左列容器：把名称与分类包在一起，统一在左侧垂直居中对称
    var leftGroup = document.createElement('div');
    leftGroup.className = 'im-left-group';
    leftGroup.appendChild(titleEl);
    leftGroup.appendChild(descEl);
    rootEl.appendChild(leftGroup);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'action-button inactive';
    btn.setAttribute('aria-label', '打开合集');
    var icon = document.createElement('span');
    icon.className = 'action-button-icon';
    icon.innerHTML = '&#x2197;';
    btn.appendChild(icon);
    rootEl.appendChild(btn);

    var activeItem = null;
    var isMoving = false;

    function applyActive(it) {
      activeItem = it;
      if (it) {
        nameCn.textContent = it.title || '';
        nameOrig.textContent = it.original || '';
        descEl.textContent = it.description || '';
      }
    }
    function applyMoving(m) {
      isMoving = m;
      var cls = m ? 'inactive' : 'active';
      titleEl.className = 'face-title ' + cls;
      descEl.className = 'face-description ' + cls;
      btn.className = 'action-button ' + cls;
    }
    applyActive(items[0]);
    applyMoving(false);

    // canvas tap-to-open (movement < threshold)
    var downX = 0, downY = 0, downAt = 0;
    canvas.addEventListener('pointerdown', function (e) {
      downX = e.clientX; downY = e.clientY; downAt = Date.now();
    });
    canvas.addEventListener('pointerup', function (e) {
      var dx = e.clientX - downX, dy = e.clientY - downY;
      if (dx * dx + dy * dy < 36 && Date.now() - downAt < 600 && activeItem) {
        navigateTo(activeItem.link);
      }
    });
    btn.addEventListener('click', function () { navigateTo(activeItem && activeItem.link); });

    var sketch = null;
    var onResize = function () { if (sketch) sketch.resize(); };
    window.addEventListener('resize', onResize);
    var ro = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(onResize) : null;
    if (ro) ro.observe(rootEl);

    try {
      sketch = new InfiniteGridMenu(
        canvas,
        items,
        function (idx) { applyActive(items[idx % items.length]); },
        applyMoving,
        function (sk) { sk.run(); },
        scale
      );
    } catch (err) {
      console.error('[InfiniteMenu] init failed, falling back:', err);
      window.removeEventListener('resize', onResize);
      if (ro) ro.disconnect();
      rootEl.innerHTML = '';
      return buildFallback(rootEl, items);
    }

    return {
      setItems: function (newItems) {
        // simplest correct path: tear down DOM + sketch, rebuild with new items
        window.removeEventListener('resize', onResize);
        if (ro) ro.disconnect();
        rootEl.innerHTML = '';
        // rAF loop of the old sketch will keep running on a detached canvas; harmless
        return build(rootEl, newItems, options);
      },
      destroy: function () {
        window.removeEventListener('resize', onResize);
        if (ro) ro.disconnect();
        rootEl.innerHTML = '';
      }
    };
  }

  window.InfiniteMenu = function (rootEl, items, options) {
    return build(rootEl, items, options);
  };
})();
