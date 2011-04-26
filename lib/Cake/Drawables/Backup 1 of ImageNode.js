/**
  ImageNode is used for drawing images. Creates a rectangular path around
  the drawn image.

  Attributes:

    centered - If true, image center is at the origin.
               Otherwise image top-left is at the origin.
    usePattern - Use a pattern fill for drawing the image (instead of
                 drawImage.) Doesn't do sub-image drawing, and Safari doesn't
                 like scaled image patterns.
    sX, sY, sWidth, sHeight - Area of image to draw. Optional.
    dX, dY - Coordinates where to draw the image. Default is 0, 0.
    dWidth, dHeight - Size of the drawn image. Optional.

  Example:

    var img = new Image()
    img.src = 'foo.jpg'
    var imageGeo = new ImageNode(img)

  @param image Image to draw.
  @param config Optional config hash.
  */
CakeJS.ImageNode = Klass(Drawable, {
  centered : false,
  usePattern : false,

  sX : 0,
  sY : 0,
  sWidth : null,
  sHeight : null,

  dX : 0,
  dY : 0,
  dWidth : null,
  dHeight : null,

  initialize : function(image, config) {
    this.image = image
    Drawable.initialize.call(this, config)
  },

  /**
    Draws the image on the given drawing context.

    Creates a rectangular path around the drawn image (for possible stroke
    and/or fill.)

    @param ctx Canvas drawing context.
    */
  drawGeometry : function(ctx) {
    if (Object.isImageLoaded(this.image)) {
      var w = this.dWidth == null ? this.image.width : this.dWidth
      var h = this.dHeight == null ? this.image.height : this.dHeight
      var x = this.dX + (this.centered ? -w * 0.5 : 0)
      var y = this.dY + (this.centered ? -h * 0.5 : 0)
      if (this.dWidth != null) {
        if (this.sWidth != null) {
          ctx.drawImage(this.image,
            this.sX, this.sY, this.sWidth, this.sHeight,
            x, y, w, h)
        } else {
          ctx.drawImage(this.image, x, y, w, h)
        }
      } else {
        w = this.image.width
        h = this.image.height
        if (this.usePattern) {
          if (!this.imagePattern)
            this.imagePattern = new Pattern(this.image, 'repeat')
          var fs = this.imagePattern.compiled
          if (!fs)
            fs = this.imagePattern.compile(ctx)
          ctx.save()
          ctx.beginPath()
          ctx.rect(x, y, w, h)
          ctx.setFillStyle(fs)
          ctx.fill()
          ctx.restore()
          ctx.beginPath()
        } else {
          ctx.drawImage(this.image, x, y)
        }
      }
    } else {
      var w = this.dWidth
      var h = this.dHeight
      if (!( w && h )) return
      var x = this.dX + (this.centered ? -w * 0.5 : 0)
      var y = this.dY + (this.centered ? -h * 0.5 : 0)
    }
    ctx.rect(x, y, w, h)
  },

  /**
    Creates a bounding rectangle path for the image on the given drawing
    context.

    @param ctx Canvas drawing context.
    */
  drawPickingPath : function(ctx) {
    var x = this.dX + (this.centered ? -this.image.width * 0.5 : 0)
    var y = this.dY + (this.centered ? -this.image.height * 0.5 : 0)
    var w = this.dWidth
    var h = this.dHeight
    if (this.dWidth == null) {
      w = this.image.width
      h = this.image.height
    }
    ctx.rect(x, y, w, h)
  },

  /**
    Returns true if the point x,y is inside the image rectangle.

    The x,y point is in user-space coordinates, meaning that e.g. the point
    5,5 will always be inside the rectangle [0, 0, 10, 10], regardless of the
    transform on the rectangle.

    @param x X-coordinate of the point.
    @param y Y-coordinate of the point.
    @return Whether the point is inside the image rectangle.
    @type boolean
    */
  isPointInPath : function(x,y) {
    x -= this.dX
    y -= this.dY
    if (this.centered) {
      x += this.image.width * 0.5
      y += this.image.height * 0.5
    }
    var w = this.dWidth
    var h = this.dHeight
    if (this.dWidth == null) {
      w = this.image.width
      h = this.image.height
    }
    return ((x >= 0) && (x <= w) && (y >= 0) && (y <= h))
  },

  getBoundingBox : function() {
    x = this.dX
    y = this.dY
    if (this.centered) {
      x -= this.image.width * 0.5
      y -= this.image.height * 0.5
    }
    var w = this.dWidth
    var h = this.dHeight
    if (this.dWidth == null) {
      w = this.image.width
      h = this.image.height
    }
    return [x, y, w, h]
  }
})

ImageNode.load = function(src) {
  var img = new Image();
  img.src = src;
  var imgn = new ImageNode(img);
  return imgn;
}