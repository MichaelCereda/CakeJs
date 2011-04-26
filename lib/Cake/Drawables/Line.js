/**
  A Line is a line drawn from x1,y1 to x2,y2. Lines are stroked by default.

  @param x1 X-coordinate of the line's first point.
  @param y1 Y-coordinate of the line's first point.
  @param x2 X-coordinate of the line's second point.
  @param y2 Y-coordinate of the line's second point.
  @param config Optional config hash.
  */
CakeJS.Line = Klass(Drawable, {
  x1 : 0,
  y1 : 0,
  x2 : 0,
  y2 : 0,
  stroke : true,

  initialize : function(x1,y1, x2,y2, config) {
    this.x1 = x1
    this.y1 = y1
    this.x2 = x2
    this.y2 = y2
    Drawable.initialize.call(this, config)
  },

  drawGeometry : function(ctx) {
    ctx.moveTo(this.x1, this.y1)
    ctx.lineTo(this.x2, this.y2)
  },

  getStartPoint : function() {
    return {
      point: [this.x1, this.y1],
      angle: Math.atan2(this.y2-this.y1, this.x2-this.x1)
    }
  },

  getEndPoint : function() {
    return {
      point: [this.x2, this.y2],
      angle: Math.atan2(this.y2-this.y1, this.x2-this.x1)
    }
  },

  getBoundingBox : function() {
    return [this.x1, this.y1, this.x2-this.x1, this.y2-this.y1]
  },

  getLength : function() {
    return Curves.lineLength([this.x1, this.y1], [this.x2, this.y2])
  }

})