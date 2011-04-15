/**
  Ellipse is a scaled circle. Except it isn't. Because that wouldn't work in
  Opera.
  */
Ellipse = Klass(Circle, {
  radiusX : 0,
  radiusY : 0,

  initialize : function(radiusX, radiusY, config) {
    this.radiusX = radiusX
    this.radiusY = radiusY
    Circle.initialize.call(this, 1, config)
  },

  drawGeometry : function(ctx) {
    if (this.radiusX == 0 || this.radiusY == 0) return
    var k = 0.5522847498
    var x = this.cx
    var y = this.cy
    var krx = k*this.radiusX
    var kry = k*this.radiusY
    ctx.moveTo(x+this.radiusX, y)
    ctx.bezierCurveTo(x+this.radiusX, y-kry, x+krx, y-this.radiusY, x, y-this.radiusY)
    ctx.bezierCurveTo(x-krx, y-this.radiusY, x-this.radiusX, y-kry, x-this.radiusX, y)
    ctx.bezierCurveTo(x-this.radiusX, y+kry, x-krx, y+this.radiusY, x, y+this.radiusY)
    ctx.bezierCurveTo(x+krx, y+this.radiusY, x+this.radiusX, y+kry, x+this.radiusX, y)
  },

  isPointInPath : function(x, y) {
    // does this work?
    x -= this.cx
    y -= this.cy
    x /= this.radiusX
    y /= this.radiusY
    return (x*x + y*y) <= 1
  },

  getBoundingBox : function() {
    return [this.cx-this.radiusX, this.cy-this.radiusY,
            this.radiusX*2, this.radiusY*2]
  }
})