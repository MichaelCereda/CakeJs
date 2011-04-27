/**
  Navigating around differing implementations of canvas features.

  Current issues:

  isPointInPath(x,y):

    Opera supports isPointInPath.

    Safari doesn't have isPointInPath. So you need to keep track of the CTM and
    do your own in-fill-checking. Which is done for circles and rectangles
    in CakeJS.Circle#isPointInPath and CakeJS.Rectangle#isPointInPath.
    Paths use an inaccurate bounding box test, implemented in
    CakeJS.Path#isPointInPath.

    Firefox 3 has isPointInPath. But it uses user-space coordinates.
    Which can be easily navigated around because it has setTransform.

    Firefox 2 has isPointInPath. But it uses user-space coordinates.
    And there's no setTransform, so you need to keep track of the CTM and
    multiply the mouse vector with the CTM's inverse.

  Drawing text:

    Rhino has ctx.drawString(x,y, text)

    Firefox has ctx.mozDrawText(text)

    The WhatWG spec, Safari and Opera have nothing.

*/
CakeJS.CanvasSupport = {
  DEVICE_SPACE : 0, // Opera
  USER_SPACE : 1,   // Fx2, Fx3
  isPointInPathMode : null,
  supportsIsPointInPath : null,
  supportsCSSTransform : null,
  supportsCanvas : null,

  isCanvasSupported : function() {
    if (this.supportsCanvas == null) {
      var e = {};
      try { e = E('canvas'); } catch(x) {}
      this.supportsCanvas = (e.getContext != null);
    }
    return this.supportsCanvas;
  },

  isCSSTransformSupported : function() {
    if (this.supportsCSSTransform == null) {
      var e = E('div')
      var dbs = e.style
      var s = (dbs.webkitTransform != null || dbs.MozTransform != null)
      this.supportsCSSTransform = (s != null)
    }
    return this.supportsCSSTransform
  },

  getTestContext : function() {
    if (!this.testContext) {
      var c = E.canvas(1,1)
      this.testContext = c.getContext('2d')
    }
    return this.testContext
  },

  getSupportsAudioTag : function() {
    var e = E('audio')
    return !!e.play
  },

  getSupportsSoundManager : function() {
    return (window.soundManager && soundManager.enabled)
  },

  soundId : 0,

  getSoundObject : function() {
    var e = null
//     if (this.getSupportsAudioTag()) {
//       e = this.getAudioTagSoundObject()
//     } else
    if (this.getSupportsSoundManager()) {
      e = this.getSoundManagerSoundObject()
    }
    return e
  },

  getAudioTagSoundObject : function() {
    var sid = 'sound-' + this.soundId++
    var e = E('audio', {id: sid})
    e.load = function(src) {
      this.src = src
    }
    e.addEventListener('canplaythrough', function() {
      if (this.onready) this.onready()
    }, false)
    e.setVolume = function(v){ this.volume = v }
    e.setPan = function(v){ this.pan = v }
    return e
  },

  getSoundManagerSoundObject : function() {
    var sid = 'sound-' + this.soundId++
    var e = {
      volume: 100,
      pan: 0,
      sid : sid,
      load : function(src) {
        return soundManager.load(this.sid, {
          url: src,
          autoPlay: false,
          volume: this.volume,
          pan: this.pan
        })
      },
      _onload : function() {
        if (this.onload) this.onload()
        if (this.onready) this.onready()
      },
      _onerror : function() {
        if (this.onerror) this.onerror()
      },
      _onfinish : function() {
        if (this.onfinish) this.onfinish()
      },
      play : function() {
        return soundManager.play(this.sid)
      },
      stop : function() {
        return soundManager.stop(this.sid)
      },
      pause : function() {
        return soundManager.togglePause(this.sid)
      },
      setVolume : function(v) {
        this.volume = v*100
        return soundManager.setVolume(this.sid, v*100)
      },
      setPan : function(v) {
        this.pan = v*100
        return soundManager.setPan(this.sid, v*100)
      }
    }
    soundManager.createSound(sid, 'null.mp3')
    e.sound = soundManager.getSoundById(sid)
    e.sound.options.onfinish = e._onfinish.bind(e)
    e.sound.options.onload = e._onload.bind(e)
    e.sound.options.onerror = e._onerror.bind(e)
    return e
  },

  /**
    CakeJS.Canvas context augment module that adds setters.
    */
  ContextSetterAugment : {
    setFillStyle : function(fs) { this.fillStyle = fs },
    setStrokeStyle : function(ss) { this.strokeStyle = ss },
    setGlobalAlpha : function(ga) { this.globalAlpha = ga },
    setLineWidth : function(lw) { this.lineWidth = lw },
    setLineCap : function(lw) { this.lineCap = lw },
    setLineJoin : function(lw) { this.lineJoin = lw },
    setMiterLimit : function(lw) { this.miterLimit = lw },
    setGlobalCompositeOperation : function(lw) {
      this.globalCompositeOperation = lw
    },
    setShadowColor : function(x) { this.shadowColor = x },
    setShadowBlur : function(x) { this.shadowBlur = x },
    setShadowOffsetX : function(x) { this.shadowOffsetX = x },
    setShadowOffsetY : function(x) { this.shadowOffsetY = x },
    setMozTextStyle : function(x) { this.mozTextStyle = x },
    setFont : function(x) { this.font = x },
    setTextAlign : function(x) { this.textAlign = x },
    setTextBaseline : function(x) { this.textBaseline = x }
  },

  ContextJSImplAugment : {
    identity : function() {
      CakeJS.CanvasSupport.setTransform(this, [1,0,0,1,0,0])
    }
  },

  /**
    Augments a canvas context with setters.
    */
  augment : function(ctx) {
    Object.conditionalExtend(ctx, this.ContextSetterAugment)
    Object.conditionalExtend(ctx, this.ContextJSImplAugment)
    return ctx
  },

  /**
    Gets the augmented context for canvas.
    */
  getContext : function(canvas, type) {
    var ctx = canvas.getContext(type || '2d')
    this.augment(ctx)
    return ctx
  },


  /**
    Multiplies two 3x2 affine 2D column-major transformation matrices with
    each other and stores the result in the first matrix.

    Returns the multiplied matrix m1.
    */
  tMatrixMultiply : function(m1, m2) {
    var m11 = m1[0]*m2[0] + m1[2]*m2[1]
    var m12 = m1[1]*m2[0] + m1[3]*m2[1]

    var m21 = m1[0]*m2[2] + m1[2]*m2[3]
    var m22 = m1[1]*m2[2] + m1[3]*m2[3]

    var dx = m1[0]*m2[4] + m1[2]*m2[5] + m1[4]
    var dy = m1[1]*m2[4] + m1[3]*m2[5] + m1[5]

    m1[0] = m11
    m1[1] = m12
    m1[2] = m21
    m1[3] = m22
    m1[4] = dx
    m1[5] = dy

    return m1
  },

  /**
    Multiplies the vector [x, y, 1] with the 3x2 transformation matrix m.
    */
  tMatrixMultiplyPoint : function(m, x, y) {
    return [
      x*m[0] + y*m[2] + m[4],
      x*m[1] + y*m[3] + m[5]
    ]
  },

  /**
    Inverts a 3x2 affine 2D column-major transformation matrix.

    Returns an inverted copy of the matrix.
    */
  tInvertMatrix : function(m) {
    var d = 1 / (m[0]*m[3]-m[1]*m[2])
    return [
      m[3]*d, -m[1]*d,
      -m[2]*d, m[0]*d,
      d*(m[2]*m[5]-m[3]*m[4]), d*(m[1]*m[4]-m[0]*m[5])
    ]
  },

  /**
    Applies a transformation matrix m on the canvas context ctx.
    */
  transform : function(ctx, m) {
    if (ctx.transform)
      return ctx.transform.apply(ctx, m)
    ctx.translate(m[4], m[5])
    // scale
    if (Math.abs(m[1]) < 1e-6 && Math.abs(m[2]) < 1e-6) {
      ctx.scale(m[0], m[3])
      return
    }
    var res = this.svdTransform({xx:m[0], xy:m[2], yx:m[1], yy:m[3], dx:m[4], dy:m[5]})
    ctx.rotate(res.angle2)
    ctx.scale(res.sx, res.sy)
    ctx.rotate(res.angle1)
    return
  },

  // broken svd...
  brokenSvd : function(m) {
    var mt = [m[0], m[2], m[1], m[3], 0,0]
    var mtm = [
      mt[0]*m[0]+mt[2]*m[1],
      mt[1]*m[0]+mt[3]*m[1],
      mt[0]*m[2]+mt[2]*m[3],
      mt[1]*m[2]+mt[3]*m[3],
      0,0
    ]
    // (mtm[0]-x) * (mtm[3]-x) - (mtm[1]*mtm[2]) = 0
    // x*x - (mtm[0]+mtm[3])*x - (mtm[1]*mtm[2])+(mtm[0]*mtm[3]) = 0
    var a = 1
    var b = -(mtm[0]+mtm[3])
    var c = -(mtm[1]*mtm[2])+(mtm[0]*mtm[3])
    var d = Math.sqrt(b*b - 4*a*c)
    var c1 = (-b + d) / (2*a)
    var c2 = (-b - d) / (2*a)
    if (c1 < c2)
      var tmp = c1, c1 = c2, c2 = tmp
    var s1 = Math.sqrt(c1)
    var s2 = Math.sqrt(c2)
    var i_s = [1/s1, 0, 0, 1/s2, 0,0]
    // (mtm[0]-c1)*x1 + mtm[2]*x2 = 0
    // mtm[1]*x1 + (mtm[3]-c1)*x2 = 0
    // x2 = -(mtm[0]-c1)*x1 / mtm[2]
    var e = ((mtm[0]-c1)/mtm[2])
    var l = Math.sqrt(1 + e*e)
    var v00 = 1 / l
    var v10 = e / l
    var v11 = v00
    var v01 = -v10
    var v = [v00, v01, v10, v11, 0,0]
    var u = m.slice(0)
    this.tMatrixMultiply(u,v)
    this.tMatrixMultiply(u,i_s)
    return [u, [s1,0,0,s2,0,0], [v00, v10, v01, v11, 0, 0]]
  },


  svdTransform : (function(){
    //   Copyright (c) 2004-2005, The Dojo Foundation
    //   All Rights Reserved
    var m = {}
    m.Matrix2D = function(arg){
      // summary: a 2D matrix object
      // description: Normalizes a 2D matrix-like object. If arrays is passed,
      //    all objects of the array are normalized and multiplied sequentially.
      // arg: Object
      //    a 2D matrix-like object, a number, or an array of such objects
      if(arg){
        if(typeof arg == "number"){
          this.xx = this.yy = arg;
        }else if(arg instanceof Array){
          if(arg.length > 0){
            var matrix = m.normalize(arg[0]);
            // combine matrices
            for(var i = 1; i < arg.length; ++i){
              var l = matrix, r = m.normalize(arg[i]);
              matrix = new m.Matrix2D();
              matrix.xx = l.xx * r.xx + l.xy * r.yx;
              matrix.xy = l.xx * r.xy + l.xy * r.yy;
              matrix.yx = l.yx * r.xx + l.yy * r.yx;
              matrix.yy = l.yx * r.xy + l.yy * r.yy;
              matrix.dx = l.xx * r.dx + l.xy * r.dy + l.dx;
              matrix.dy = l.yx * r.dx + l.yy * r.dy + l.dy;
            }
            Object.extend(this, matrix);
          }
        }else{
          Object.extend(this, arg);
        }
      }
    }
    // ensure matrix 2D conformance
    m.normalize = function(matrix){
        // summary: converts an object to a matrix, if necessary
        // description: Converts any 2D matrix-like object or an array of
        //    such objects to a valid dojox.gfx.matrix.Matrix2D object.
        // matrix: Object: an object, which is converted to a matrix, if necessary
        return (matrix instanceof m.Matrix2D) ? matrix : new m.Matrix2D(matrix); // dojox.gfx.matrix.Matrix2D
    }
    m.multiply = function(matrix){
      // summary: combines matrices by multiplying them sequentially in the given order
      // matrix: dojox.gfx.matrix.Matrix2D...: a 2D matrix-like object,
      //    all subsequent arguments are matrix-like objects too
      var M = m.normalize(matrix);
      // combine matrices
      for(var i = 1; i < arguments.length; ++i){
        var l = M, r = m.normalize(arguments[i]);
        M = new m.Matrix2D();
        M.xx = l.xx * r.xx + l.xy * r.yx;
        M.xy = l.xx * r.xy + l.xy * r.yy;
        M.yx = l.yx * r.xx + l.yy * r.yx;
        M.yy = l.yx * r.xy + l.yy * r.yy;
        M.dx = l.xx * r.dx + l.xy * r.dy + l.dx;
        M.dy = l.yx * r.dx + l.yy * r.dy + l.dy;
      }
      return M; // dojox.gfx.matrix.Matrix2D
    }
    m.invert = function(matrix) {
      var M = m.normalize(matrix),
        D = M.xx * M.yy - M.xy * M.yx,
        M = new m.Matrix2D({
          xx: M.yy/D, xy: -M.xy/D,
          yx: -M.yx/D, yy: M.xx/D,
          dx: (M.xy * M.dy - M.yy * M.dx) / D,
          dy: (M.yx * M.dx - M.xx * M.dy) / D
        });
      return M; // dojox.gfx.matrix.Matrix2D
    }
    // the default (identity) matrix, which is used to fill in missing values
    Object.extend(m.Matrix2D, {xx: 1, xy: 0, yx: 0, yy: 1, dx: 0, dy: 0});

    var eq = function(/* Number */ a, /* Number */ b){
      // summary: compare two FP numbers for equality
      return Math.abs(a - b) <= 1e-6 * (Math.abs(a) + Math.abs(b)); // Boolean
    };

    var calcFromValues = function(/* Number */ s1, /* Number */ s2){
      // summary: uses two close FP values to approximate the result
      if(!isFinite(s1)){
        return s2;  // Number
      }else if(!isFinite(s2)){
        return s1;  // Number
      }
      return (s1 + s2) / 2; // Number
    };

    var transpose = function(/* dojox.gfx.matrix.Matrix2D */ matrix){
      // matrix: dojox.gfx.matrix.Matrix2D: a 2D matrix-like object
      var M = new m.Matrix2D(matrix);
      return Object.extend(M, {dx: 0, dy: 0, xy: M.yx, yx: M.xy}); // dojox.gfx.matrix.Matrix2D
    };

    var scaleSign = function(/* dojox.gfx.matrix.Matrix2D */ matrix){
      return (matrix.xx * matrix.yy < 0 || matrix.xy * matrix.yx > 0) ? -1 : 1; // Number
    };

    var eigenvalueDecomposition = function(/* dojox.gfx.matrix.Matrix2D */ matrix){
      // matrix: dojox.gfx.matrix.Matrix2D: a 2D matrix-like object
      var M = m.normalize(matrix),
        b = -M.xx - M.yy,
        c = M.xx * M.yy - M.xy * M.yx,
        d = Math.sqrt(b * b - 4 * c),
        l1 = -(b + (b < 0 ? -d : d)) / 2,
        l2 = c / l1,
        vx1 = M.xy / (l1 - M.xx), vy1 = 1,
        vx2 = M.xy / (l2 - M.xx), vy2 = 1;
      if(eq(l1, l2)){
        vx1 = 1, vy1 = 0, vx2 = 0, vy2 = 1;
      }
      if(!isFinite(vx1)){
        vx1 = 1, vy1 = (l1 - M.xx) / M.xy;
        if(!isFinite(vy1)){
          vx1 = (l1 - M.yy) / M.yx, vy1 = 1;
          if(!isFinite(vx1)){
            vx1 = 1, vy1 = M.yx / (l1 - M.yy);
          }
        }
      }
      if(!isFinite(vx2)){
        vx2 = 1, vy2 = (l2 - M.xx) / M.xy;
        if(!isFinite(vy2)){
          vx2 = (l2 - M.yy) / M.yx, vy2 = 1;
          if(!isFinite(vx2)){
            vx2 = 1, vy2 = M.yx / (l2 - M.yy);
          }
        }
      }
      var d1 = Math.sqrt(vx1 * vx1 + vy1 * vy1),
        d2 = Math.sqrt(vx2 * vx2 + vy2 * vy2);
      if(isNaN(vx1 /= d1)){ vx1 = 0; }
      if(isNaN(vy1 /= d1)){ vy1 = 0; }
      if(isNaN(vx2 /= d2)){ vx2 = 0; }
      if(isNaN(vy2 /= d2)){ vy2 = 0; }
      return {  // Object
        value1: l1,
        value2: l2,
        vector1: {x: vx1, y: vy1},
        vector2: {x: vx2, y: vy2}
      };
    };

    var decomposeSR = function(/* dojox.gfx.matrix.Matrix2D */ M, /* Object */ result){
      // summary: decomposes a matrix into [scale, rotate]; no checks are done.
      var sign = scaleSign(M),
        a = result.angle1 = (Math.atan2(M.yx, M.yy) + Math.atan2(-sign * M.xy, sign * M.xx)) / 2,
        cos = Math.cos(a), sin = Math.sin(a);
      result.sx = calcFromValues(M.xx / cos, -M.xy / sin);
      result.sy = calcFromValues(M.yy / cos, M.yx / sin);
      return result;  // Object
    };

    var decomposeRS = function(/* dojox.gfx.matrix.Matrix2D */ M, /* Object */ result){
      // summary: decomposes a matrix into [rotate, scale]; no checks are done
      var sign = scaleSign(M),
        a = result.angle2 = (Math.atan2(sign * M.yx, sign * M.xx) + Math.atan2(-M.xy, M.yy)) / 2,
        cos = Math.cos(a), sin = Math.sin(a);
      result.sx = calcFromValues(M.xx / cos, M.yx / sin);
      result.sy = calcFromValues(M.yy / cos, -M.xy / sin);
      return result;  // Object
    };

    return function(matrix){
      // summary: decompose a 2D matrix into translation, scaling, and rotation components
      // description: this function decompose a matrix into four logical components:
      //  translation, rotation, scaling, and one more rotation using SVD.
      //  The components should be applied in following order:
      //  | [translate, rotate(angle2), scale, rotate(angle1)]
      // matrix: dojox.gfx.matrix.Matrix2D: a 2D matrix-like object
      var M = m.normalize(matrix),
        result = {dx: M.dx, dy: M.dy, sx: 1, sy: 1, angle1: 0, angle2: 0};
      // detect case: [scale]
      if(eq(M.xy, 0) && eq(M.yx, 0)){
        return Object.extend(result, {sx: M.xx, sy: M.yy});  // Object
      }
      // detect case: [scale, rotate]
      if(eq(M.xx * M.yx, -M.xy * M.yy)){
        return decomposeSR(M, result);  // Object
      }
      // detect case: [rotate, scale]
      if(eq(M.xx * M.xy, -M.yx * M.yy)){
        return decomposeRS(M, result);  // Object
      }
      // do SVD
      var MT = transpose(M),
        u  = eigenvalueDecomposition([M, MT]),
        v  = eigenvalueDecomposition([MT, M]),
        U  = new m.Matrix2D({xx: u.vector1.x, xy: u.vector2.x, yx: u.vector1.y, yy: u.vector2.y}),
        VT = new m.Matrix2D({xx: v.vector1.x, xy: v.vector1.y, yx: v.vector2.x, yy: v.vector2.y}),
        S = new m.Matrix2D([m.invert(U), M, m.invert(VT)]);
      decomposeSR(VT, result);
      S.xx *= result.sx;
      S.yy *= result.sy;
      decomposeRS(U, result);
      S.xx *= result.sx;
      S.yy *= result.sy;
      return Object.extend(result, {sx: S.xx, sy: S.yy});  // Object
    };
  })(),


  /**
    Sets the canvas context ctx's transformation matrix to m, with ctm being
    the current transformation matrix.
    */
  setTransform : function(ctx, m, ctm) {
    if (ctx.setTransform)
      return ctx.setTransform.apply(ctx, m)
    this.transform(ctx, this.tInvertMatrix(ctm))
    this.transform(ctx, m)
  },

  /**
    Skews the canvas context by angle on the x-axis.
    */
  skewX : function(ctx, angle) {
    return this.transform(ctx, this.tSkewXMatrix(angle))
  },

  /**
    Skews the canvas context by angle on the y-axis.
    */
  skewY : function(ctx, angle) {
    return this.transform(ctx, this.tSkewYMatrix(angle))
  },

  /**
    Rotates a transformation matrix by angle.
    */
  tRotate : function(m1, angle) {
    // return this.tMatrixMultiply(matrix, this.tRotationMatrix(angle))
    var c = Math.cos(angle)
    var s = Math.sin(angle)
    var m11 = m1[0]*c + m1[2]*s
    var m12 = m1[1]*c + m1[3]*s
    var m21 = m1[0]*-s + m1[2]*c
    var m22 = m1[1]*-s + m1[3]*c
    m1[0] = m11
    m1[1] = m12
    m1[2] = m21
    m1[3] = m22
    return m1
  },

  /**
    Translates a transformation matrix by x and y.
    */
  tTranslate : function(m1, x, y) {
    // return this.tMatrixMultiply(matrix, this.tTranslationMatrix(x,y))
    m1[4] += m1[0]*x + m1[2]*y
    m1[5] += m1[1]*x + m1[3]*y
    return m1
  },

  /**
    Scales a transformation matrix by sx and sy.
    */
  tScale : function(m1, sx, sy) {
    // return this.tMatrixMultiply(matrix, this.tScalingMatrix(sx,sy))
    m1[0] *= sx
    m1[1] *= sx
    m1[2] *= sy
    m1[3] *= sy
    return m1
  },

  /**
    Skews a transformation matrix by angle on the x-axis.
    */
  tSkewX : function(m1, angle) {
    return this.tMatrixMultiply(m1, this.tSkewXMatrix(angle))
  },

  /**
    Skews a transformation matrix by angle on the y-axis.
    */
  tSkewY : function(m1, angle) {
    return this.tMatrixMultiply(m1, this.tSkewYMatrix(angle))
  },

  /**
    Returns a 3x2 2D column-major y-skew matrix for the angle.
    */
  tSkewXMatrix : function(angle) {
    return [ 1, 0, Math.tan(angle), 1, 0, 0 ]
  },

  /**
    Returns a 3x2 2D column-major y-skew matrix for the angle.
    */
  tSkewYMatrix : function(angle) {
    return [ 1, Math.tan(angle), 0, 1, 0, 0 ]
  },

  /**
    Returns a 3x2 2D column-major rotation matrix for the angle.
    */
  tRotationMatrix : function(angle) {
    var c = Math.cos(angle)
    var s = Math.sin(angle)
    return [ c, s, -s, c, 0, 0 ]
  },

  /**
    Returns a 3x2 2D column-major translation matrix for x and y.
    */
  tTranslationMatrix : function(x, y) {
    return [ 1, 0, 0, 1, x, y ]
  },

  /**
    Returns a 3x2 2D column-major scaling matrix for sx and sy.
    */
  tScalingMatrix : function(sx, sy) {
    return [ sx, 0, 0, sy, 0, 0 ]
  },

  /**
    Returns the name of the text backend to use.

    Possible values are:
      * 'MozText' for Firefox
      * 'DrawString' for Rhino
      * 'NONE' no text drawing

    @return The text backend name
    @type String
    */
  getTextBackend : function() {
    if (this.textBackend == null)
      this.textBackend = this.detectTextBackend()
    return this.textBackend
  },

  /**
    Detects the name of the text backend to use.

    Possible values are:
      * 'MozText' for Firefox
      * 'DrawString' for Rhino
      * 'NONE' no text drawing

    @return The text backend name
    @type String
    */
  detectTextBackend : function() {
    var ctx = this.getTestContext()
    if (ctx.fillText) {
      return 'HTML5'
    } else if (ctx.mozDrawText) {
      return 'MozText'
    } else if (ctx.drawString) {
      return 'DrawString'
    }
    return 'NONE'
  },

  getSupportsPutImageData : function() {
    if (this.supportsPutImageData == null) {
      var ctx = this.getTestContext()
      var support = ctx.putImageData
      if (support) {
        try {
          var idata = ctx.getImageData(0,0,1,1)
          idata[0] = 255
          idata[1] = 0
          idata[2] = 255
          idata[3] = 255
          ctx.putImageData({width: 1, height: 1, data: idata}, 0, 0)
          var idata = ctx.getImageData(0,0,1,1)
          support = [255, 0, 255, 255].equals(idata.data)
        } catch(e) {
          support = false
        }
      }
      this.supportsPutImageData = support
    }
    return support
  },

  /**
    Returns true if the browser can be coaxed to work with
    {@link CakeJS.CanvasSupport.isPointInPath}.

    @return Whether the browser supports isPointInPath or not
    @type boolean
    */
  getSupportsIsPointInPath : function() {
    if (this.supportsIsPointInPath == null)
      this.supportsIsPointInPath = !!this.getTestContext().isPointInPath
    return this.supportsIsPointInPath
  },

  /**
    Returns the coordinate system in which the isPointInPath of the
    browser operates. Possible coordinate systems are
    CakeJS.CanvasSupport.DEVICE_SPACE and CakeJS.CanvasSupport.USER_SPACE.

    @return The coordinate system for the browser's isPointInPath
    */
  getIsPointInPathMode : function() {
    if (this.isPointInPathMode == null)
      this.isPointInPathMode = this.detectIsPointInPathMode()
    return this.isPointInPathMode
  },

  /**
    Detects the coordinate system in which the isPointInPath of the
    browser operates. Possible coordinate systems are
    CakeJS.CanvasSupport.DEVICE_SPACE and CakeJS.CanvasSupport.USER_SPACE.

    @return The coordinate system for the browser's isPointInPath
    @private
    */
  detectIsPointInPathMode : function() {
    var ctx = this.getTestContext()
    var rv
    if (!ctx.isPointInPath)
      return this.USER_SPACE
    ctx.save()
    ctx.translate(1,0)
    ctx.beginPath()
    ctx.rect(0,0,1,1)
    if (ctx.isPointInPath(0.3,0.3)) {
      rv = this.USER_SPACE
    } else {
      rv = this.DEVICE_SPACE
    }
    ctx.restore()
    return rv
  },

  /**
    Returns true if the device-space point (x,y) is inside the fill of
    ctx's current path.

    @param ctx CakeJS.Canvas 2D context to query
    @param x The distance in pixels from the left side of the canvas element
    @param y The distance in pixels from the top side of the canvas element
    @param matrix The current transformation matrix. Needed if the browser has
                  no isPointInPath or the browser's isPointInPath works in
                  user-space coordinates and the browser doesn't support
                  setTransform.
    @param callbackObj If the browser doesn't support isPointInPath,
                       callbackObj.isPointInPath will be called with the
                       x,y-coordinates transformed to user-space.
    @param
    @return Whether (x,y) is inside ctx's current path or not
    @type boolean
    */
  isPointInPath : function(ctx, x, y, matrix, callbackObj) {
    var rv
    if (!ctx.isPointInPath) {
      if (callbackObj && callbackObj.isPointInPath) {
        var xy = this.tMatrixMultiplyPoint(this.tInvertMatrix(matrix), x, y)
        return callbackObj.isPointInPath(xy[0], xy[1])
      } else {
        return false
      }
    } else {
      if (this.getIsPointInPathMode() == this.USER_SPACE) {
        if (!ctx.setTransform) {
          var xy = this.tMatrixMultiplyPoint(this.tInvertMatrix(matrix), x, y)
          rv = ctx.isPointInPath(xy[0], xy[1])
        } else {
          ctx.save()
          ctx.setTransform(1,0,0,1,0,0)
          rv = ctx.isPointInPath(x,y)
          ctx.restore()
        }
      } else {
        rv = ctx.isPointInPath(x,y)
      }
      return rv
    }
  }
}
