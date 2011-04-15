/**
  ElementNode is a CanvasNode that has an HTML element as its content.

  The content is added to an absolutely positioned HTML element, which is added
  to the root node's canvases parentNode. The content element follows the
  current transformation matrix.

  The opacity of the element is set to the globalAlpha of the drawing context
  unless #noAlpha is true.

  The font-size of the element is set to the current y-scale unless #noScaling
  is true.

  Use ElementNode when you need accessible web content in your animations.

    var e = new ElementNode(
      E('h1', 'HERZLICH WILLKOMMEN IM BAHNHOF'),
      {
        x : 40,
        y : 30
      }
    )
    e.addFrameListener(function(t) {
      this.scale = 1 + 0.5*Math.cos(t/1000)
    })

  @param content An HTML element or string of HTML to use as the content.
  @param config Optional config has.
  */
ElementNode = Klass(CanvasNode, {
  noScaling : false,
  noAlpha : false,
  inherit : 'inherit',
  align: null, // left | center | right
  valign: null, // top | center | bottom
  xOffset: 0,
  yOffset: 0,

  initialize : function(content, config) {
    CanvasNode.initialize.call(this, config)
    this.content = content
    this.element = E('div', content)
    this.element.style.MozTransformOrigin =
    this.element.style.webkitTransformOrigin = '0 0'
    this.element.style.position = 'absolute'
  },

  clone : function() {
    var c = CanvasNode.prototype.clone.call(this)
    if (this.content && this.content.cloneNode)
      c.content = this.content.cloneNode(true)
    c.element = E('div', c.content)
    c.element.style.position = 'absolute'
    c.element.style.MozTransformOrigin =
    c.element.style.webkitTransformOrigin = '0 0'
    return c
  },

  setRoot : function(root) {
    CanvasNode.setRoot.call(this, root)
    if (this.element && this.element.parentNode && this.element.parentNode.removeChild)
      this.element.parentNode.removeChild(this.element)
  },

  handleUpdate : function(t, dt) {
    CanvasNode.handleUpdate.call(this, t, dt)
    if (!this.willBeDrawn || !this.visible || this.display == 'none' || this.visibility == 'hidden' || !this.drawable) {
      if (this.element.style.display != 'none')
        this.element.style.display = 'none'
    } else if (this.element.style.display == 'none') {
      this.element.style.display = 'block'
    }
  },

  addEventListener : function(event, callback, capture) {
    var th = this
    var ccallback = function() { callback.apply(th, arguments) }
    return this.element.addEventListener(event, ccallback, capture||false)
  },

  removeEventListener : function(event, callback, capture) {
    var th = this
    var ccallback = function() { callback.apply(th, arguments) }
    return this.element.removeEventListener(event, ccallback, capture||false)
  },

  draw : function(ctx) {
    if (this.cursor && this.element.style.cursor != this.cursor)
      this.element.style.cursor = this.cursor
    if (this.element.style.zIndex != this.root.elementNodeZIndexCounter)
      this.element.style.zIndex = this.root.elementNodeZIndexCounter
    this.root.elementNodeZIndexCounter++
    var baseTransform = this.currentMatrix
    xo = this.xOffset
    yo = this.yOffset
    if (this.fillBoundingBox && this.parent && this.parent.getBoundingBox) {
      var bb = this.parent.getBoundingBox()
      xo += bb[0]
      yo += bb[1]
    }
    var xy = CanvasSupport.tMatrixMultiplyPoint(baseTransform.slice(0,4).concat([0,0]),
      xo, yo)
    var x = this.currentMatrix[4] + xy[0]
    var y = this.currentMatrix[5] + xy[1]
    var a = this.currentMatrix[2]
    var b = this.currentMatrix[3]
    var c = this.currentMatrix[0]
    var d = this.currentMatrix[1]
    var ys = Math.sqrt(a*a + b*b)
    var xs = Math.sqrt(c*c + d*d)
    if (ctx.fontFamily != null)
      this.element.style.fontFamily = ctx.fontFamily

    var wkt = CanvasSupport.isCSSTransformSupported()
    if (wkt && !this.noScaling) {
      this.element.style.MozTransform =
      this.element.style.webkitTransform = 'matrix('+baseTransform.join(",")+')'
    } else {
      this.element.style.MozTransform =
      this.element.style.webkitTransform = ''
    }
    if (ctx.fontSize != null) {
      if (this.noScaling || wkt) {
        this.element.style.fontSize = ctx.fontSize + 'px'
      } else {
        this.element.style.fontSize = ctx.fontSize * ys + 'px'
      }
    } else {
      if (this.noScaling || wkt) {
        this.element.style.fontSize = 'inherit'
      } else {
        this.element.style.fontSize = 100 * ys + '%'
      }
    }
    if (this.noAlpha)
      this.element.style.opacity = 1
    else
      this.element.style.opacity = ctx.globalAlpha
    if (!this.element.parentNode && this.root.canvas.parentNode) {
      this.element.style.visibility = 'hidden'
      this.root.canvas.parentNode.appendChild(this.element)
      var hidden = true
    }
    var fs = this.color || this.fill
    if (this.parent) {
      if (!fs || !fs.length)
        fs = this.parent.color
      if (!fs || !fs.length)
        fs = this.parent.fill
    }
    if (!fs || !fs.length)
      fs = ctx.fillStyle
    if (typeof(fs) == 'string') {
      if (fs.search(/^rgba\(/) != -1) {
        this.element.style.color = 'rgb(' +
          fs.match(/\d+/g).slice(0,3).join(",") +
          ')'
      } else {
        this.element.style.color = fs
      }
    } else if (fs.length) {
      this.element.style.color = 'rgb(' + fs.slice(0,3).map(Math.floor).join(",") + ')'
    }
    var dx = 0, dy = 0
    if (bb) {
      this.element.style.width = Math.floor(xs * bb[2]) + 'px'
      this.element.style.height = Math.floor(ys * bb[3]) + 'px'
      this.eWidth = xs
      this.eHeight = ys
    } else {
      this.element.style.width = ''
      this.element.style.height = ''
      var align = this.align || this.textAnchor
      var origin = [0,0]
      if (align == 'center' || align == 'middle') {
        dx = -this.element.offsetWidth / 2
        origin[0] = '50%'
      } else if (align == 'right') {
        dx = -this.element.offsetWidth
        origin[0] = '100%'
      }
      var valign = this.valign
      if (valign == 'center' || valign == 'middle') {
        dy = -this.element.offsetHeight / 2
        origin[1] = '50%'
      } else if (valign == 'bottom') {
        dy = -this.element.offsetHeight
        origin[1] = '100%'
      }
      this.element.style.webkitTransformOrigin =
      this.element.style.MozTransformOrigin = origin.join(" ")
      this.eWidth = this.element.offsetWidth / xs
      this.eHeight = this.element.offsetHeight / ys
    }
    if (wkt && !this.noScaling) {
      this.element.style.left = Math.floor(dx) + 'px'
      this.element.style.top = Math.floor(dy) + 'px'
    } else {
      this.element.style.left = Math.floor(x+dx) + 'px'
      this.element.style.top = Math.floor(y+dy) + 'px'
    }
    if (hidden)
      this.element.style.visibility = 'visible'
  }
})