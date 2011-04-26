/**
  A Spiral is a function graph drawn in polar coordinates from startAngle to
  endAngle. And the source of all life energy, etc.
  */
CakeJS.Spiral = Klass(Drawable, {
  cx : 0,
  cy : 0,
  startRadius : 0,
  startAngle : 0,
  endAngle : 0,

  radiusFunction : function(a) {
    return a
  },

  initialize : function(endAngle, config) {
    this.endAngle = endAngle
    Drawable.initialize.call(this, config)
  },

  drawGeometry : function(ctx) {
    var x = this.cx
    var y = this.cy
    var a = this.startAngle
    var r = this.startRadius + this.radiusFunction(a)
    ctx.moveTo(x+Math.cos(a)*r, y-Math.sin(a)*r)
    if (this.startAngle < this.endAngle) {
      a += 0.1
      r = this.startRadius + this.radiusFunction(a)
      while (a < this.endAngle) {
        ctx.lineTo(x+Math.cos(a)*r, y-Math.sin(a)*r)
        a += 0.1
        r = this.startRadius + this.radiusFunction(a)
      }
    } else {
      a -= 0.1
      r = this.startRadius + this.radiusFunction(a)
      while (a > this.endAngle) {
        ctx.lineTo(x+Math.cos(a)*r, y-Math.sin(a)*r)
        a -= 0.1
        r = this.startRadius + this.radiusFunction(a)
      }
    }
    a = this.endAngle
    r = this.startRadius + this.radiusFunction(a)
    ctx.lineTo(x+Math.cos(a)*r, y-Math.sin(a)*r)
  },

  isPointInPath : function(x, y) {
    return false
  }
})