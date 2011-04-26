/**
  CatmullRomSpline draws a Catmull-Rom spline, with optional looping and
  path closing. Handy for motion paths.

  @param segments Control points for the spline, as [[x,y], [x,y], ...]
  @param config Optional config hash.
  */
CakeJS.CatmullRomSpline = Klass(Drawable, {
  segments : [],
  loop : false,
  closePath : false,

  initialize : function(segments, config) {
    this.segments = segments
    Drawable.initialize.call(this, config)
  },

  drawGeometry : function(ctx) {
    var x1 = this.currentMatrix[0]
    var x2 = this.currentMatrix[1]
    var y1 = this.currentMatrix[2]
    var y2 = this.currentMatrix[3]
    var xs = x1*x1 + x2*x2
    var ys = y1*y1 + y2*y2
    var s = Math.floor(Math.sqrt(Math.max(xs, ys)))
    var cmp = this.compiled
    if (!cmp || cmp.scale != s) {
      cmp = this.compile(s)
    }
    for (var i=0; i<cmp.length; i++) {
      var cmd = cmp[i]
      ctx[cmd[0]].apply(ctx, cmd[1])
    }
    if (this.closePath)
      ctx.closePath()
  },

  compile : function(scale) {
    if (!scale) scale = 1
    var compiled = []
    if (this.segments && this.segments.length >= (this.loop ? 1 : 4)) {
      var segs = this.segments
      if (this.loop) {
        segs = segs.slice(0)
        segs.unshift(segs[segs.length-1])
        segs.push(segs[1])
        segs.push(segs[2])
      }
      // FIXME don't be stupid
      var point_spacing = 1 / (15 * (scale+0.5))
      var a,b,c,d,p,pp
      compiled.push(['moveTo', segs[1].slice(0)])
      p = segs[1]
      for (var j=1; j<segs.length-2; j++) {
        a = segs[j-1]
        b = segs[j]
        c = segs[j+1]
        d = segs[j+2]
        for (var i=0; i<1; i+=point_spacing) {
          pp = p
          p = Curves.catmullRomPoint(a,b,c,d,i)
          compiled.push(['lineTo', p])
        }
      }
      p = Curves.catmullRomPoint(a,b,c,d,1)
      compiled.push(['lineTo', p])
    }
    compiled.scale = scale
    this.compiled = compiled
    return compiled
  },

  getBoundingBox : function() {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    var segments = (this.compiled ? this.compiled : this.compile())
    for (var i=0; i<segments.length; i++) {
      var seg = segments[i][1]
      for (var j=0; j<seg.length; j+=2) {
        var x = seg[j], y = seg[j+1]
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
    return [minX, minY, maxX-minX, maxY-minY]
  },

  pointAt : function(t) {
    if (!this.segments) return [0,0]
    if (this.segments.length >= (this.loop ? 1 : 4)) {
      var segs = this.segments
      if (this.loop) {
        segs = segs.slice(0)
        segs.unshift(segs[segs.length-1])
        segs.push(segs[1])
        segs.push(segs[2])
      }
      // turn t into segment_index.segment_t
      var rt = t * (segs.length - 3)
      var j = Math.floor(rt)
      var st = rt-j
      var a = segs[j],
          b = segs[j+1],
          c = segs[j+2],
          d = segs[j+3]
      return Curves.catmullRomPoint(a,b,c,d,st)
    } else {
      return this.segments[0]
    }
  },

  pointAngleAt : function(t) {
    if (!this.segments) return {point: [0,0], angle: 0}
    if (this.segments.length >= (this.loop ? 1 : 4)) {
      var segs = this.segments
      if (this.loop) {
        segs = segs.slice(0)
        segs.unshift(segs[segs.length-1])
        segs.push(segs[1])
        segs.push(segs[2])
      }
      // turn t into segment_index.segment_t
      var rt = t * (segs.length - 3)
      var j = Math.floor(rt)
      var st = rt-j
      var a = segs[j],
          b = segs[j+1],
          c = segs[j+2],
          d = segs[j+3]
      return Curves.catmullRomPointAngle(a,b,c,d,st)
    } else {
      return {point:this.segments[0] || [0,0], angle: 0}
    }
  }
})