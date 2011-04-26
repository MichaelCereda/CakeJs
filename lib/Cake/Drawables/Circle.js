/**
  Circle is used for creating circular paths.

  Uses context.arc(...).

  Attributes:
    cx, cy, radius, startAngle, endAngle, clockwise, closePath, includeCenter

  @param radius Radius of the circle.
  @param config Optional config hash.
  */
CakeJS.Circle = Klass(Drawable, {
  cx : 0,
  cy : 0,
  radius : 10,
  startAngle : 0,
  endAngle : Math.PI * 2,
  clockwise : false,
  closePath : true,
  includeCenter : false,

  initialize : function(radius, config) {
    if (radius != null) this.radius = radius
    Drawable.initialize.call(this, config)
  },

  /**
    Creates a circular path using ctx.arc(...).

    @param ctx Canvas drawing context.
    */
  drawGeometry : function(ctx) {
    if (this.radius == 0) return
    if (this.includeCenter)
      ctx.moveTo(this.cx, this.cy)
    ctx.arc(this.cx, this.cy, this.radius, this.startAngle, this.endAngle, this.clockwise)
    if (this.closePath) {
      // firefox 2 is buggy without the endpoint
      var x2 = Math.cos(this.endAngle)
      var y2 = Math.sin(this.endAngle)
      ctx.moveTo(this.cx + x2*this.radius, this.cy + y2 * this.radius)
      ctx.closePath()
    }
  },

  /**
    Returns true if the point x,y is inside the radius of the circle.

    The x,y point is in user-space coordinates, meaning that e.g. the point
    5,0 will always be inside a circle with radius of 10 and center at origin,
    regardless of the transform on the circle.

    @param x X-coordinate of the point.
    @param y Y-coordinate of the point.
    @return Whether the point is inside the radius of this circle.
    @type boolean
    */
  isPointInPath : function(x,y) {
    x -= this.cx
    y -= this.cy
    return (x*x + y*y) <= (this.radius*this.radius)
  },

  getBoundingBox : function() {
    return [this.cx-this.radius, this.cy-this.radius,
            2*this.radius, 2*this.radius]
  }
})