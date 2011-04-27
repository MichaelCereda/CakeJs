/**
  CakeJS.Polygon is used for creating paths consisting of straight line
  segments.

  Attributes:
    segments - The vertices of the polygon, e.g. [0,0, 1,1, 1,2, 0,1]
    closePath - Whether to close the path, default is true.

  @param segments The vertices of the polygon.
  @param closePath Whether to close the path.
  @param config Optional config hash.
  */
CakeJS.Polygon = CakeJS.Klass(CakeJS.Drawable, {
  segments : [],
  closePath : true,

  initialize : function(segments, config) {
    this.segments = segments
    CakeJS.Drawable.initialize.call(this, config)
  },

  drawGeometry : function(ctx) {
    if (!this.segments || this.segments.length < 2) return
    var s = this.segments
    ctx.moveTo(s[0], s[1])
    for (var i=2; i<s.length; i+=2) {
      ctx.lineTo(s[i], s[i+1])
    }
    if (this.closePath)
      ctx.closePath()
  },

  isPointInPath : function(px,py) {
    if (!this.segments || this.segments.length < 2) return false
    var bbox = this.getBoundingBox()
    return (px >= bbox[0] && px <= bbox[0]+bbox[2] &&
            py >= bbox[1] && py <= bbox[1]+bbox[3])
  },

  getStartPoint : function() {
    if (!this.segments || this.segments.length < 2)
      return {point:[0,0], angle:0}
    var a = 0
    if (this.segments.length > 2) {
      a = CakeJS.Curves.lineAngle(this.segments.slice(0,2), this.segments.slice(2,4))
    }
    return {point: this.segments.slice(0,2),
            angle: a}
  },

  getEndPoint : function() {
    if (!this.segments || this.segments.length < 2)
      return {point:[0,0], angle:0}
    var a = 0
    if (this.segments.length > 2) {
      a = CakeJS.Curves.lineAngle(this.segments.slice(-4,-2), this.segments.slice(-2))
    }
    return {point: this.segments.slice(-2),
            angle: a}
  },

  getMidPoints : function() {
    if (!this.segments || this.segments.length < 2)
      return []
    var segs = this.segments
    var verts = []
    for (var i=2; i<segs.length-2; i+=2) {
      var a = segs.slice(i-2,i)
      var b = segs.slice(i, i+2)
      var c = segs.slice(i+2, i+4)
      var t = 0.5 * (Curves.lineAngle(a,b) + CakeJS.Curves.lineAngle(b,c))
      verts.push(
        {point: b, angle: t}
      )
    }
    return verts
  },

  getBoundingBox : function() {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    var s = this.segments
    for (var i=0; i<s.length; i+=2) {
      var x = s[i], y = s[i+1]
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    return [minX, minY, maxX-minX, maxY-minY]
  }
})
