/* ============================================================
   InfiniteMenu (React Bits) — vanilla WebGL2 port, 无 React
   依赖：window.glMatrix（gl-matrix-min.js，UMD）
   移植自 React Bits <InfiniteMenu />，原依赖 gl-matrix + React。
   适配「学习」页：透明画布叠在浅色背景上；占位娱乐收藏项。
   暴露：window.InfiniteMenuInit(rootEl, items, scale)
   ============================================================ */
(function () {
  'use strict';

  var GM = window.glMatrix;
  if (!GM) {
    console.error('[InfiniteMenu] gl-matrix 未加载');
    return;
  }
  var mat4 = GM.mat4, quat = GM.quat, vec2 = GM.vec2, vec3 = GM.vec3;

  /* ---------------- Shaders ---------------- */
  var discVertShaderSource = `#version 300 es

uniform mat4 uWorldMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPosition;
uniform vec4 uRotationAxisVelocity;

in vec3 aModelPosition;
in vec3 aModelNormal;
in vec2 aModelUvs;
in mat4 aInstanceMatrix;

out vec2 vUvs;
out float vAlpha;
flat out int vInstanceId;
out vec3 vWorldPos;

#define PI 3.141593

void main() {
    vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.);

    vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0., 0., 0., 1.)).xyz;
    float radius = length(centerPos.xyz);

    if (gl_VertexID > 0) {
        vec3 rotationAxis = uRotationAxisVelocity.xyz;
        float rotationVelocity = min(.15, uRotationAxisVelocity.w * 15.);
        vec3 stretchDir = normalize(cross(centerPos, rotationAxis));
        vec3 relativeVertexPos = normalize(worldPosition.xyz - centerPos);
        float strength = dot(stretchDir, relativeVertexPos);
        float invAbsStrength = min(0., abs(strength) - 1.);
        strength = rotationVelocity * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.);
        worldPosition.xyz += stretchDir * strength;
    }

    worldPosition.xyz = radius * normalize(worldPosition.xyz);

    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;

    vAlpha = smoothstep(0.5, 1., normalize(worldPosition.xyz).z) * .9 + .1;
    vWorldPos = worldPosition.xyz;
    vUvs = aModelUvs;
    vInstanceId = gl_InstanceID;
}
`;

  var discFragShaderSource = `#version 300 es
precision highp float;

uniform sampler2D uTex;
uniform int uItemCount;
uniform int uAtlasSize;

out vec4 outColor;

in vec2 vUvs;
in float vAlpha;
flat in int vInstanceId;
in vec3 vWorldPos;

void main() {
    int itemIndex = vInstanceId % uItemCount;
    int cellsPerRow = uAtlasSize;
    int cellX = itemIndex % cellsPerRow;
    int cellY = itemIndex / cellsPerRow;
    vec2 cellSize = vec2(1.0) / vec2(float(cellsPerRow));
    vec2 cellOffset = vec2(float(cellX), float(cellY)) * cellSize;

    ivec2 texSize = textureSize(uTex, 0);
    float imageAspect = float(texSize.x) / float(texSize.y);
    float containerAspect = 1.0;

    float scale = max(imageAspect / containerAspect,
                     containerAspect / imageAspect);

    vec2 st = vec2(vUvs.x, 1.0 - vUvs.y);
    st = (st - 0.5) * scale + 0.5;

    st = clamp(st, 0.0, 1.0);

    st = st * cellSize + cellOffset;

    outColor = texture(uTex, st);

    // 只有正对相机/位于画面中心的圆盘保持彩色；其余去饱和为灰度。
    float nz = normalize(vWorldPos).z;
    float front = smoothstep(0.86, 0.98, nz);
    vec3 gray = vec3(dot(outColor.rgb, vec3(0.299, 0.587, 0.114)));
    outColor.rgb = mix(gray, outColor.rgb, front);

    outColor.a *= vAlpha;
}
`;

  /* ---------------- Geometry helpers ---------------- */
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
    radius = radius || 1;
    var self = this;
    this.vertices.forEach(function (vertex) {
      vec3.normalize(vertex.normal, vertex.position);
      vec3.scale(vertex.position, vertex.normal, radius);
    });
    return this;
  };
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
  Object.defineProperty(Geometry.prototype, 'data', {
    get: function () {
      return {
        vertices: this.vertexData, indices: this.indexData,
        normals: this.normalData, uvs: this.uvData
      };
    }
  });
  Geometry.prototype.getMidPoint = function (ndxA, ndxB, cache) {
    var cacheKey = ndxA < ndxB ? ('k_' + ndxB + '_' + ndxA) : ('k_' + ndxA + '_' + ndxB);
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
      -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0,
      0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t,
      t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1
    ).addFace(
      0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11,
      1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
      3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9,
      4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1
    );
  }
  IcosahedronGeometry.prototype = Object.create(Geometry.prototype);
  IcosahedronGeometry.prototype.constructor = IcosahedronGeometry;

  function DiscGeometry(steps, radius) {
    Geometry.call(this);
    steps = Math.max(4, steps || 4);
    radius = radius || 1;
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

  /* ---------------- GL helpers ---------------- */
  function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
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
    if (attribLocations) {
      for (var attrib in attribLocations) {
        gl.bindAttribLocation(program, attribLocations[attrib], attrib);
      }
    }
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
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

  /* ---------------- Arcball control ---------------- */
  function ArcballControl(canvas, updateCallback) {
    this.canvas = canvas;
    this.updateCallback = updateCallback || function () {};
    this.isPointerDown = false;
    this.orientation = quat.create();
    this.pointerRotation = quat.create();
    this.rotationVelocity = 0;
    this.rotationAxis = vec3.fromValues(1, 0, 0);
    this.snapDirection = vec3.fromValues(0, 0, 1);
    this.snapTargetDirection = undefined;
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
  ArcballControl.prototype.quatFromVectors = function (a, b, out, angleFactor) {
    angleFactor = angleFactor || 1;
    var axis = vec3.cross(vec3.create(), a, b);
    vec3.normalize(axis, axis);
    var d = Math.max(-1, Math.min(1, vec3.dot(a, b)));
    var angle = Math.acos(d) * angleFactor;
    quat.setAxisAngle(out, axis, angle);
    return { q: out, axis: axis, angle: angle };
  };
  ArcballControl.prototype.project = function (pos) {
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
  ArcballControl.prototype.update = function (deltaTime, targetFrameDuration) {
    targetFrameDuration = targetFrameDuration || 16;
    var timeScale = deltaTime / targetFrameDuration + 0.00001;
    var angleFactor = timeScale;
    var snapRotation = quat.create();
    var self = this;

    if (this.isPointerDown) {
      var INTENSITY = 0.3 * timeScale;
      var ANGLE_AMPLIFICATION = 5 / timeScale;
      var midPointerPos = vec2.sub(vec2.create(), this.pointerPos, this.previousPointerPos);
      vec2.scale(midPointerPos, midPointerPos, INTENSITY);
      if (vec2.sqrLen(midPointerPos) > this.EPSILON) {
        vec2.add(midPointerPos, this.previousPointerPos, midPointerPos);
        var p = this.project(midPointerPos);
        var q = this.project(this.previousPointerPos);
        var a = vec3.normalize(vec3.create(), p);
        var b = vec3.normalize(vec3.create(), q);
        vec2.copy(this.previousPointerPos, midPointerPos);
        angleFactor *= ANGLE_AMPLIFICATION;
        this.quatFromVectors(a, b, this.pointerRotation, angleFactor);
      } else {
        quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, INTENSITY);
      }
    } else {
      var INTENSITY2 = 0.1 * timeScale;
      quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, INTENSITY2);
      if (this.snapTargetDirection) {
        var SNAPPING_INTENSITY = 0.2;
        var a2 = this.snapTargetDirection;
        var b2 = this.snapDirection;
        var sqrDist = vec3.squaredDistance(a2, b2);
        var distanceFactor = Math.max(0.1, 1 - sqrDist * 10);
        angleFactor *= SNAPPING_INTENSITY * distanceFactor;
        this.quatFromVectors(a2, b2, snapRotation, angleFactor);
      }
    }

    var combinedQuat = quat.multiply(quat.create(), snapRotation, this.pointerRotation);
    this.orientation = quat.multiply(quat.create(), combinedQuat, this.orientation);
    quat.normalize(this.orientation, this.orientation);

    var RA_INTENSITY = 0.8 * timeScale;
    quat.slerp(this._combinedQuat, this._combinedQuat, combinedQuat, RA_INTENSITY);
    quat.normalize(this._combinedQuat, this._combinedQuat);

    var rad = Math.acos(this._combinedQuat[3]) * 2.0;
    var sn = Math.sin(rad / 2.0);
    var rv = 0;
    if (sn > 0.000001) {
      rv = rad / (2 * Math.PI);
      this.rotationAxis[0] = this._combinedQuat[0] / sn;
      this.rotationAxis[1] = this._combinedQuat[1] / sn;
      this.rotationAxis[2] = this._combinedQuat[2] / sn;
    }
    var RV_INTENSITY = 0.5 * timeScale;
    this._rotationVelocity += (rv - this._rotationVelocity) * RV_INTENSITY;
    this.rotationVelocity = this._rotationVelocity / timeScale;

    this.updateCallback(deltaTime);
  };

  /* ---------------- InfiniteGridMenu ---------------- */
  function InfiniteGridMenu(canvas, items, onActiveItemChange, onMovementChange, onInit, scale) {
    this.canvas = canvas;
    this.items = items || [];
    this.onActiveItemChange = onActiveItemChange || function () {};
    this.onMovementChange = onMovementChange || function () {};
    this.scaleFactor = scale || 1.0;
    this.camera = {
      matrix: mat4.create(),
      near: 0.1, far: 40, fov: Math.PI / 4, aspect: 1,
      position: vec3.fromValues(0, 0, 3 * this.scaleFactor),
      up: vec3.fromValues(0, 1, 0),
      matrices: { view: mat4.create(), projection: mat4.create(), inversProjection: mat4.create() }
    };
    this.nearestVertexIndex = null;
    this.smoothRotationVelocity = 0;
    this.movementActive = false;
    this.TARGET_FRAME_DURATION = 1000 / 60;
    this.SPHERE_RADIUS = 2;
    this._time = 0; this._deltaTime = 0; this._deltaFrames = 0; this._frames = 0;
    this._init(onInit);
  }
  // 私有方法用普通函数实现（避免 ES 私有字段在老引擎报错）
  InfiniteGridMenu.prototype.resize = function () {
    var gl = this.gl;
    this.viewportSize = vec2.set(this.viewportSize || vec2.create(), this.canvas.clientWidth, this.canvas.clientHeight);
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
    var self = this;
    requestAnimationFrame(function (t) { self.run(t); });
  };
  InfiniteGridMenu.prototype._init = function (onInit) {
    this.gl = this.canvas.getContext('webgl2', { antialias: true, alpha: true });
    var gl = this.gl;
    if (!gl) { console.error('[InfiniteMenu] 没有 WebGL2 上下文'); return; }

    this.viewportSize = vec2.fromValues(this.canvas.clientWidth, this.canvas.clientHeight);
    this.drawBufferSize = vec2.clone(this.viewportSize);

    this.discProgram = createProgram(gl, [discVertShaderSource, discFragShaderSource], null, {
      aModelPosition: 0, aModelNormal: 1, aModelUvs: 2, aInstanceMatrix: 3
    });
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
    this.discVAO = makeVertexArray(gl, [
      [makeBuffer(gl, this.discBuffers.vertices, gl.STATIC_DRAW), this.discLocations.aModelPosition, 3],
      [makeBuffer(gl, this.discBuffers.uvs, gl.STATIC_DRAW), this.discLocations.aModelUvs, 2]
    ], this.discBuffers.indices);

    this.icoGeo = new IcosahedronGeometry();
    this.icoGeo.subdivide(1).spherize(this.SPHERE_RADIUS);
    this.instancePositions = this.icoGeo.vertices.map(function (v) { return v.position; });
    this.DISC_INSTANCE_COUNT = this.icoGeo.vertices.length;
    this._initDiscInstances(this.DISC_INSTANCE_COUNT);

    this.worldMatrix = mat4.create();
    this._initTexture();

    this.control = new ArcballControl(this.canvas, function (deltaTime) { this._onControlUpdate(deltaTime); }.bind(this));

    this._updateCameraMatrix();
    this._updateProjectionMatrix(gl);
    this.resize();

    if (onInit) onInit(this);
  };
  InfiniteGridMenu.prototype._initTexture = function () {
    var gl = this.gl;
    this.tex = createAndSetupTexture(gl, gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
    var itemCount = Math.max(1, this.items.length);
    this.atlasSize = Math.ceil(Math.sqrt(itemCount));
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var cellSize = 512;
    canvas.width = this.atlasSize * cellSize;
    canvas.height = this.atlasSize * cellSize;

    var self = this;
    Promise.all(this.items.map(function (item) {
      return new Promise(function (resolve) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () { resolve(img); };
        img.onerror = function () { resolve(null); };
        img.src = item.image;
      });
    })).then(function (images) {
      images.forEach(function (img, i) {
        var x = (i % self.atlasSize) * cellSize;
        var y = Math.floor(i / self.atlasSize) * cellSize;
        if (img) ctx.drawImage(img, x, y, cellSize, cellSize);
        else {
          ctx.fillStyle = '#FF4438';
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      });
      gl.bindTexture(gl.TEXTURE_2D, self.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.generateMipmap(gl.TEXTURE_2D);
    });
  };
  InfiniteGridMenu.prototype.addItem = function (item) {
    this.items.push(item);
    this.atlasSize = Math.ceil(Math.sqrt(this.items.length));
    this._initTexture();
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
    var positions = this.instancePositions.map(function (p) {
      return vec3.transformQuat(vec3.create(), p, this.control.orientation);
    }, this);
    var scale = 0.25;
    var SCALE_INTENSITY = 0.6;
    var self = this;
    positions.forEach(function (p, ndx) {
      var s = (Math.abs(p[2]) / self.SPHERE_RADIUS) * SCALE_INTENSITY + (1 - SCALE_INTENSITY);
      var finalScale = s * scale;
      var matrix = mat4.create();
      mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), vec3.negate(vec3.create(), p)));
      mat4.multiply(matrix, matrix, mat4.targetTo(mat4.create(), [0, 0, 0], p, [0, 1, 0]));
      mat4.multiply(matrix, matrix, mat4.fromScaling(mat4.create(), [finalScale, finalScale, finalScale]));
      mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), [0, 0, -self.SPHERE_RADIUS]));
      mat4.copy(self.discInstances.matrices[ndx], matrix);
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, this.discInstances.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.discInstances.matricesArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this.smoothRotationVelocity = this.control.rotationVelocity;
  };
  InfiniteGridMenu.prototype._render = function () {
    var gl = this.gl;
    gl.useProgram(this.discProgram);
    // 关闭背面剔除：圆盘法线朝球心（远离相机），开启 CULL_FACE 会把正对相机的近侧圆盘剔除，
    // 导致屏幕中心实际显示的是对面远侧占位圆盘，封面与"正对笔记"对不上。关闭后近侧圆盘经深度测试遮挡远侧，
    // 屏幕中心显示的封面与活动笔记（snapDirection 最近顶点）一致。
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(this.discLocations.uWorldMatrix, false, this.worldMatrix);
    gl.uniformMatrix4fv(this.discLocations.uViewMatrix, false, this.camera.matrices.view);
    gl.uniformMatrix4fv(this.discLocations.uProjectionMatrix, false, this.camera.matrices.projection);
    gl.uniform3f(this.discLocations.uCameraPosition, this.camera.position[0], this.camera.position[1], this.camera.position[2]);
    gl.uniform4f(this.discLocations.uRotationAxisVelocity,
      this.control.rotationAxis[0], this.control.rotationAxis[1], this.control.rotationAxis[2],
      this.smoothRotationVelocity * 1.1);
    gl.uniform1i(this.discLocations.uItemCount, this.items.length);
    gl.uniform1i(this.discLocations.uAtlasSize, this.atlasSize);
    gl.uniform1f(this.discLocations.uFrames, this._frames);
    gl.uniform1f(this.discLocations.uScaleFactor, this.scaleFactor);
    gl.uniform1i(this.discLocations.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);

    gl.bindVertexArray(this.discVAO);
    gl.drawElementsInstanced(gl.TRIANGLES, this.discBuffers.indices.length, gl.UNSIGNED_SHORT, 0, this.DISC_INSTANCE_COUNT);
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
    mat4.perspective(this.camera.matrices.projection, this.camera.fov, this.camera.aspect, this.camera.near, this.camera.far);
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
      // 圆盘实际绘制位置与顶点方向相反（实例矩阵把圆盘推到顶点对侧），
      // 故"正对相机、可见"的圆盘对应顶点在 -z 一侧；snap 目标取顶点世界坐标的反向，
      // 让可见圆盘稳定停在屏幕中心，且活动笔记与之严格对应。
      var snapDirection = vec3.normalize(vec3.create(), vec3.negate(vec3.create(), this._getVertexWorldPosition(nearestVertexIndex)));
      this.control.snapTargetDirection = snapDirection;
    } else {
      cameraTargetZ += this.control.rotationVelocity * 80 + 2.5;
      damping = 7 / timeScale;
    }
    this.camera.position[2] += (cameraTargetZ - this.camera.position[2]) / damping;
    this._updateCameraMatrix();
  };
  InfiniteGridMenu.prototype._findNearestVertexIndex = function () {
    // 取 -snapDirection：圆盘绘制在顶点对侧，可见（正对相机）的圆盘对应顶点在 -z 一侧，
    // 故用反向参考向量选出"可见圆盘"对应的顶点，使活动笔记与屏幕上看到的封面一致。
    var n = vec3.negate(vec3.create(), this.control.snapDirection);
    var inversOrientation = quat.conjugate(quat.create(), this.control.orientation);
    var nt = vec3.transformQuat(vec3.create(), n, inversOrientation);
    var maxD = -1, nearestVertexIndex;
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

  /* ---------------- Public init (替代 React 组件) ---------------- */
  function InfiniteMenuInit(rootEl, items, scale) {
    if (!rootEl) return;
    var canvas = document.createElement('canvas');
    canvas.id = 'infinite-grid-menu-canvas';
    rootEl.appendChild(canvas);

    var titleEl = document.createElement('h2');
    titleEl.className = 'face-title active';
    rootEl.appendChild(titleEl);

    var descEl = document.createElement('p');
    descEl.className = 'face-description active';
    rootEl.appendChild(descEl);

    var btn = document.createElement('div');
    btn.className = 'action-button active';
    var icon = document.createElement('p');
    icon.className = 'action-button-icon';
    icon.innerHTML = '<svg viewBox="0 0 48 24" width="36" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2,12 C12,2 36,2 46,12 C36,22 12,22 2,12 Z"/><circle cx="24" cy="12" r="5"/></svg>';
    btn.appendChild(icon);
    rootEl.appendChild(btn);

    var sketch = null;
    var activeItem = null;

    function handleActiveItem(index) {
      var itemIndex = index % items.length;
      activeItem = items[itemIndex];
      titleEl.textContent = activeItem.title;
      descEl.textContent = activeItem.description || '';
    }
    function handleMovement(isMoving) {
      titleEl.className = 'face-title ' + (isMoving ? 'inactive' : 'active');
      descEl.className = 'face-description ' + (isMoving ? 'inactive' : 'active');
      btn.className = 'action-button ' + (isMoving ? 'inactive' : 'active');
    }
    btn.addEventListener('click', function () {
      if (!activeItem || !activeItem.link) return;
      if (activeItem.link.indexOf('http') === 0) window.open(activeItem.link, '_blank');
      else console.log('Internal route:', activeItem.link);
    });

    if (!GM) return;
    sketch = new InfiniteGridMenu(canvas, items, handleActiveItem, handleMovement, function (sk) { sk.run(); }, scale || 1.0);
    window.__infiniteMenuSketch = sketch; // 开发者入口 addNote 需要引用

    // 让首条真实笔记（实例 0 = 408 学习页）落在"可见侧"正对相机：因圆盘绘制在顶点对侧，
    // 需把实例 0 的顶点旋到 -snapDirection，其圆盘才会停在 +z 可见位置，与活动笔记严格对应。
    if (sketch && sketch.control && sketch.instancePositions) {
      var fp = sketch.instancePositions[0];
      var negSnap = vec3.negate(vec3.create(), sketch.control.snapDirection);
      var fpN = vec3.normalize(vec3.create(), fp);
      if (vec3.dot(fpN, negSnap) < 0.9999) {
        var fq = sketch.control.quatFromVectors(fp, negSnap, quat.create());
        if (fq && fq.q) sketch.control.orientation = fq.q;
      }
    }
    // 立即同步一次当前正对笔记对应的标题/分类与按钮激活态（active = 可点击）
    handleActiveItem(0);
    handleMovement(false);

    function handleResize() { if (sketch) sketch.resize(); }
    window.addEventListener('resize', handleResize);
    handleResize();
  }

  window.InfiniteMenuInit = InfiniteMenuInit;
})();
