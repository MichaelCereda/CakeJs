/**
  TextNode is used for drawing text on a canvas.

  Attributes:

    text - The text string to draw.
    align - Horizontal alignment for the text.
            'left', 'right', 'center', 'start' or 'end'
    baseline - Baseline used for the text.
               'top', 'hanging', 'middle', 'alphabetic', 'ideographic' or 'bottom'
    asPath - If true, creates a text path instead of drawing the text.
    pathGeometry - A geometry object the path of which the text follows.

  Example:

    var text = new TextGeometry('The cake is a lie.')

  @param text The text string to draw.
  @param config Optional config hash.
  */
CakeJS.TextNode = Klass(Drawable, {
  text : 'Text',
  align : 'start', // 'left' | 'right' | 'center' | 'start' | 'end'
  baseline : 'alphabetic', // 'top' | 'hanging' | 'middle' | 'alphabetic' |
                           // 'ideographic' | 'bottom'
  accuratePicking : false,
  asPath : false,
  pathGeometry : null,
  maxWidth : null,
  width : 0,
  height : 20,
  cx : 0,
  cy : 0,

  __drawMethodName : 'draw' + CanvasSupport.getTextBackend(),
  __pickingMethodName : 'drawPickingPath' + CanvasSupport.getTextBackend(),

  initialize : function(text, config) {
    this.lastText = this.text
    this.text = text
    Drawable.initialize.call(this, config)
  },

  drawGeometry : function(ctx) {
    this.drawUsing(ctx, this.__drawMethodName)
  },

  drawPickingPath : function(ctx) {
    this.drawUsing(ctx, this.__pickingMethodName)
  },

  drawUsing : function(ctx, methodName) {
    if (!this.text || this.text.length == 0)
      return
    if (this.lastText != this.text || this.lastStyle != ctx.font) {
      this.dimensions = this.measureText(ctx)
      this.lastText = this.text
      this.lastStyle = ctx.font
    }
    if (this[methodName])
      this[methodName](ctx)
  },

  measureText : function(ctx) {
    var mn = 'measureText' + CanvasSupport.getTextBackend().capitalize()
    if (this[mn]) {
      return this[mn](ctx)
    } else {
      return {width: 0, height: 0}
    }
  },

  computeXForAlign : function() {
    if (this.align == 'left') // most hit branch
      return 0
    else if (this.align == 'right')
      return -this.dimensions.width
    else if (this.align == 'center')
      return  -this.dimensions.width * 0.5
  },

  measureTextHTML5 : function(ctx) {
    // FIXME measureText is retarded
    return {width: ctx.measureText(this.text).width, height: 20}
  },

  drawHTML5 : function(ctx) {
    ctx.fillText(this.text, this.cx, this.cy, this.maxWidth)
  },

  drawPickingPathHTML5 : function(ctx) {
    var ascender = 15 // this.dimensions.ascender
    var ry = this.cy - ascender
    ctx.rect(this.cx, ry, this.dimensions.width, this.dimensions.height)
  },

  measureTextMozText : function(ctx) {
    return {width: ctx.mozMeasureText(this.text), height: 20}
  },

  drawMozText : function(ctx) {
    var x = this.cx + this.computeXForAlign()
    var y = this.cy + 0
    if (this.pathGeometry) {
      this.pathGeometry.draw(ctx)
      ctx.mozDrawTextAlongPath(this.text, this.path)
    } else {
      ctx.save()
      ctx.translate(x,y)
      if (this.asPath) {
        ctx.mozPathText(this.text)
      } else {
        ctx.mozDrawText(this.text)
      }
      ctx.restore()
    }
  },

  drawPickingPathMozText : function(ctx) {
    var x = this.cx + this.computeXForAlign()
    var y = this.cy + 0
    if (this.pathGeometry) { // FIXME how to draw a text path along path?
        this.pathGeometry.draw(ctx)
        // ctx.mozDrawTextAlongPath(this.text, this.path)
    } else if (!this.accuratePicking) {
      var ascender = 15 // this.dimensions.ascender
      var ry = y - ascender
      ctx.rect(x, ry, this.dimensions.width, this.dimensions.height)
    } else {
      ctx.save()
      ctx.translate(x,y)
      ctx.mozPathText(this.text)
      ctx.restore()
    }
  },

  drawDrawString : function(ctx) {
    var x = this.cx + this.computeXForAlign()
    var y = this.cy + 0
    ctx.drawString(x,y, this.text)
  },

  measureTextPerfectWorld : function(ctx) {
    return ctx.measureText(this.text)
  },

  drawPerfectWorld : function(ctx) {
    if (this.pathGeometry) {
      this.pathGeometry.draw(ctx)
      if (this.asPath)
        ctx.pathTextAlongPath(this.text)
      else
        ctx.drawTextAlongPath(this.text)
    } else if (this.asPath) {
      ctx.pathText(this.text)
    } else {
      ctx.drawText(this.text)
    }
  },

  drawPickingPathPerfectWorld : function(ctx) {
    if (this.accuratePicking) {
      if (this.pathGeometry) {
        ctx.pathTextAlongPath(this.text)
      } else {
        ctx.pathText(this.text)
      }
    } else { // creates a path of text bounding box
      if (this.pathGeometry) {
        ctx.textRectAlongPath(this.text)
      } else {
        ctx.textRect(this.text)
      }
    }
  }
})