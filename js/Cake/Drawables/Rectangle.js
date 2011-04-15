/**
  Rectangle is used for creating rectangular paths.

  Uses context.rect(...).

  Attributes:
    cx, cy, width, height, centered, rx, ry

  If centered is set to true, centers the rectangle on the origin.
  Otherwise the top-left corner of the rectangle is on the origin.

  @param width Width of the rectangle.
  @param height Height of the rectangle.
  @param config Optional config hash.
  */
Rectangle = Klass(Drawable, {
  cx : 0,
  cy : 0,
  x2 : 0,
  y2 : 0,
  width : 0,
  height : 0,
  rx : 0,
  ry : 0,
  centered : false,

  initialize : function(width, height, config) {
    if (width != null) {
      this.width = width
      this.height = width
    }
    if (height != null) this.height = height
    Drawable.initialize.call(this, config)
  },

  /**
    Creates a rectangular path using ctx.rect(...).

    @param ctx Canvas drawing context.
    */
  drawGeometry : function(ctx) {
    var x = this.cx
    var y = this.cy
    var w = (this.width || (this.x2 - x))
    var h = (this.height || (this.y2 - y))
    if (w == 0 || h == 0) return
    if (this.centered) {
      x -= 0.5*w
      y -= 0.5*h
    }
    if (this.rx || this.ry) {
      // hahaa, welcome to the undocumented rounded corners path
      // using bezier curves approximating ellipse quadrants
      var rx = Math.min(w * 0.5, this.rx || this.ry)
      var ry = Math.min(h * 0.5, this.ry || rx)
      var k = 0.5522847498
      var krx = k*rx
      var kry = k*ry
      ctx.moveTo(x+rx, y)
      ctx.lineTo(x-rx+w, y)
      ctx.bezierCurveTo(x-rx+w + krx, y, x+w, y+ry-kry, x+w, y+ry)
      ctx.lineTo(x+w, y+h-ry)
      ctx.bezierCurveTo(x+w, y+h-ry+kry, x-rx+w+krx, y+h, x-rx+w, y+h)
      ctx.lineTo(x+rx, y+h)
      ctx.bezierCurveTo(x+rx-krx, y+h, x, y+h-ry+kry, x, y+h-ry)
      ctx.lineTo(x, y+ry)
      ctx.bezierCurveTo(x, y+ry-kry, x+rx-krx, y, x+rx, y)
      ctx.closePath()
    } else {
      if (w < 0) x += w
      if (h < 0) y += h
      ctx.rect(x, y, Math.abs(w), Math.abs(h))
    }
  },

  /**
    Returns true if the point x,y is inside this rectangle.

    The x,y point is in user-space coordinates, meaning that e.g. the point
    5,5 will always be inside the rectangle [0, 0, 10, 10], regardless of the
    transform on the rectangle.

    @param x X-coordinate of the point.
    @param y Y-coordinate of the point.
    @return Whether the point is inside this rectangle.
    @type boolean
    */
  isPointInPath : function(x,y) {
    x -= this.cx
    y -= this.cy
    if (this.centered) {
      x += this.width/2
      y += this.height/2
    }
    return (x >= 0 && x <= this.width && y >= 0 && y <= this.height)
  },

  getBoundingBox : function() {
    var x = this.cx
    var y = this.cy
    if (this.centered) {
      x -= this.width/2
      y -= this.height/2
    }
    return [x,y,this.width,this.height]
  }
})