/**
  SVG parser for simple documents. Converts SVG DOM to CAKE scenegraph.
  Emphasis on graphical images, not on the "HTML-killer" features of SVG.

  var svgNode = CakeJS.SVGParser.parse(
    svgRootElement, filename, containerWidth, containerHeight, fontSize
  )

  Features:
    * <svg> width and height, viewBox clipping.
    * Clipping (objectBoundingBox clipping too)
    * Paths, rectangles, ellipses, circles, lines, polylines and polygons
    * Simple untransformed text using HTML
    * Nested transforms
    * Transform lists (transform="rotate(30) translate(2,2) scale(4)")
    * CakeJS.Gradient and pattern transforms
    * Strokes with miter, joins and caps
    * Flat fills and gradient fills, ditto for strokes
    * Parsing simple stylesheets (tag, class or id)
    * Images
    * Non-pixel units (cm, mm, in, pt, pc, em, ex, %)
    * <use>-tags
    * preserveAspectRatio
    * Dynamic gradient sizes (objectBoundingBox, etc.)
    * Markers (though buggy)

  Some of the several missing features:
    * Masks
    * Patterns
    * viewBox clipping for elements other than <marker> and <svg>
    * Text styling
    * tspan, tref, textPath, many things text
    * Fancy style rules (tag .class + #foo > bob#alice { ... })
    * Filters
    * Animation
    * Dashed strokes
  */
CakeJS.SVGParser = {
  /**
    Loads an SVG document using XMLHttpRequest and calls the given onSuccess
    callback with the parsed document. If loading fails, calls onFailure
    instead if one is given. When loading and an onLoading callback is given,
    calls onLoading every time xhr.readyState is 3.

    The callbacks will be called with the following parameters:

    onSuccess(svgNode, xmlHttpRequest,
      filename, config)

    onFailure(xmlHttpRequest, possibleException,
      filename, config)

    onLoading(xmlHttpRequest,
      filename, config)

    Config hash parameters:
      filename: Filename for the SVG document. Used for parsing image paths.
      width: Width of the bounding box to fit the SVG in.
      height: Height of the bounding box to fit the SVG in.
      fontSize: Default font size for the SVG document.
      onSuccess: Function to call on successful load. Required.
      onFailure: Function to call on failed load.
      onLoading: Function to call while loading.

    @param config The config hash.
    @param filename The URL of the SVG document to load. Must conform to SOP.
    */
  load : function(filename, config) {
    if (!config.onSuccess) throw("Need to provide an onSuccess function.")
    if (!config.filename)
      config.filename = filename
    var xhr = window.XMLHttpRequest ? new XMLHttpRequest() :
                                      new ActiveXObject("MSXML2.XMLHTTP.3.0")
    xhr.open('GET', filename, true)
    xhr.overrideMimeType('text/xml')
    var failureFired = false
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status == 200 || xhr.status == 0) {
          try {
            var svg = xhr.responseXML
            var svgNode = CakeJS.SVGParser.parse(svg, config)
            svgNode.svgRootElement = svg
          } catch(e) {
            if (config.onFailure)
              config.onFailure(xhr, e, filename, config)
            return
          }
          config.onSuccess(svgNode, xhr, filename, config)
        } else {
          if (config.onFailure && !failureFired)
            config.onFailure(xhr, null, filename, config)
        }
      } else if (xhr.readyState == 3) {
        if (config.onLoading)
          config.onLoading(xhr, filename, config)
      }
    }
    try {
      xhr.send(null)
    } catch(e) {
      if (config.onFailure) {
        config.onFailure(xhr, e, filename, config)
        failureFired = true
      }
      xhr.abort()
    }
  },

  /**
    Parses an SVG DOM into CAKE scenegraph.

    Config hash parameters:
      filename: Filename for the SVG document. Used for parsing image paths.
      width: Width of the bounding box to fit the SVG in.
      height: Height of the bounding box to fit the SVG in.
      fontSize: Default font size for the SVG document.
      currentColor: HTML text color of the containing element.

    @param svgRootElement The root element of the SVG DOM.
    @param config The config hash.
    @returns The root CakeJS.CanvasNode of the scenegraph created from the SVG document.
    @type CakeJS.CanvasNode
    */
  parse : function(svgRootElement, config) {
    var n = new CakeJS.CanvasNode()
    var w = config.width, h = config.height, fs = config.fontSize
    n.innerWidth = w || window.innerWidth
    n.innerHeight = h || window.innerHeight
    n.innerSize = Math.sqrt(w*w + h*h) / Math.sqrt(2)
    n.fontSize = fs || 12
    n.filename = config.filename || '.'
    var defs = {}
    var style = { ids : {}, classes : {}, tags : {} }
    n.color = config.currentColor || 'black'
    this.parseChildren(svgRootElement, n, defs, style)
    n.defs = defs
    n.style = style
    return n
  },

  parsePreserveAspectRatio : function(aspect, w, h, vpw, vph) {
    var aspect = aspect || ""
    var aspa = aspect.split(/\s+/)
    var defer = (aspa[0] == 'defer')
    if (defer) aspa.shift()
    var align = (aspa[0] || 'xMidYMid')
    var meet = (aspa[1] || 'meet')
    var wf = w / vpw
    var hf = h / vph
    var xywh = {x:0, y:0, w:wf, h:hf}
    if (align == 'none') return xywh
    xywh.w = xywh.h = (meet == 'meet' ? Math.min : Math.max)(wf, hf)
    var xa = align.slice(1, 4).toLowerCase()
    var ya = align.slice(5, 8).toLowerCase()
    var xf = (this.SVGAlignMap[xa] || 0)
    var yf = (this.SVGAlignMap[ya] || 0)
    xywh.x = xf * (w-vpw*xywh.w)
    xywh.y = yf * (h-vph*xywh.h)
    return xywh
  },

  SVGAlignMap : {
    min : 0,
    mid : 0.5,
    max : 1
  },

  SVGTagMapping : {
    svg : function(c, cn, defs, style) {
      var p = new CakeJS.Rectangle()
      p.width = 0
      p.height = 0
      p.doFill = function(){}
      p.doStroke = function(){}
      p.drawMarkers = function(){}
      p.fill = 'black'
      p.stroke = 'none'
      var vb = c.getAttribute('viewBox')
      var w = c.getAttribute('width')
      var h = c.getAttribute('height')
      if (!w) w = h
      else if (!h) h = w
      if (w) {
        var wpx = this.parseUnit(w, cn, 'x')
        var hpx = this.parseUnit(h, cn, 'y')
      }
      if (vb) {
        xywh = vb.match(/[-+]?\d+/g).map(parseFloat)
        p.cx = xywh[0]
        p.cy = xywh[1]
        p.width = xywh[2]
        p.height = xywh[3]
        var iw = cn.innerWidth = p.width
        var ih = cn.innerHeight = p.height
        cn.innerSize = Math.sqrt(iw*iw + ih*ih) / Math.sqrt(2)
        if (c.getAttribute('overflow') != 'visible')
          p.clip = true
      }
      if (w) {
        if (vb) { // nuts, let's parse the alignment :|
          var aspect = c.getAttribute('preserveAspectRatio')
          var align = this.parsePreserveAspectRatio(aspect,
            wpx, hpx,
            p.width, p.height)
          p.cx -= align.x / align.w
          p.cy -= align.y / align.h
          p.width = wpx / align.w
          p.height = hpx / align.h
          p.x += align.x
          p.y += align.y
          p.scale = [align.w, align.h]
        }
        // wrong place!
        cn.docWidth = wpx
        cn.docHeight = hpx
      }
      return p
    },

    marker : function(c, cn) {
      var p = new CakeJS.CanvasNode()
      p.draw = function(ctx) {
        if (this.overflow != 'hidden' && this.viewBox) return
        ctx.beginPath()
        ctx.rect(
          this.viewBox[0],this.viewBox[1],
          this.viewBox[2],this.viewBox[3]
        )
        ctx.clip()
      }
      var x = -this.parseUnit(c.getAttribute('refX'), cn, 'x') || 0
      var y = -this.parseUnit(c.getAttribute('refY'), cn, 'y') || 0
      p.transformList = [['translate', [x,y]]]
      p.markerUnits = c.getAttribute('markerUnits') || 'strokeWidth'
      p.markerWidth = this.parseUnit(c.getAttribute('markerWidth'), cn, 'x') || 3
      p.markerHeight = this.parseUnit(
                          c.getAttribute('markerHeight'), cn, 'y') ||
                          3
      p.overflow = c.getAttribute('overflow') || 'hidden'
      p.viewBox = c.getAttribute('viewBox')
      p.orient = c.getAttribute('orient') || 0
      if (p.orient && p.orient != 'auto')
        p.orient = parseFloat(p.orient)*SVGMapping.DEG_TO_RAD_FACTOR
      if (p.viewBox) {
        p.viewBox = p.viewBox.strip().split(/[\s,]+/g).map(parseFloat)
        var vbw = p.viewBox[2] - p.viewBox[0]
        var vbh = p.viewBox[3] - p.viewBox[1]
        if (p.markerWidth) {
          var sx = sy = Math.min(
            p.markerWidth / vbw,
            p.markerHeight / vbh
          )
          p.transformList.unshift(['scale', [sx,sy]])
        }
      }
      return p
    },

    clipPath : function(c,cn) {
      var p = new CakeJS.CanvasNode()
      p.units = c.getAttribute('clipPathUnits')
      return p
    },

    title : function(c, canvasNode) {
      canvasNode.root.title = c.textContent
    },

    desc : function(c,cn) {
      cn.root.description = c.textContent
    },

    metadata : function(c, cn) {
      cn.root.metadata = c
    },








    parseAnimateTag : function(c, cn) {
      var after = CakeJS.SVGParser.SVGTagMapping.parseTime(c.getAttribute('begin'))
      var dur = CakeJS.SVGParser.SVGTagMapping.parseTime(c.getAttribute('dur'))
      var end = CakeJS.SVGParser.SVGTagMapping.parseTime(c.getAttribute('end'))
      if (dur == null) dur = end-after
      dur = isNaN(dur) ? 0 : dur
      var variable = c.getAttribute('attributeName')
      var fill = c.getAttribute('fill')
      if (cn.tagName == 'rect') {
        if (variable == 'x') variable = 'cx'
        if (variable == 'y') variable = 'cy'
      }
      var accum = c.getAttribute('accumulate') == 'sum'
      var additive = c.getAttribute('additive')
      if (additive) additive = additive == 'sum'
      else additive = accum
      var repeat = c.getAttribute('repeatCount')
      if (repeat == 'indefinite') repeat = true
      else repeat = parseFloat(repeat)
      if (!repeat && dur > 0) {
        var repeatDur = c.getAttribute('repeatDur')
        if (repeatDur == 'indefinite') repeat = true
        else repeat = CakeJS.SVGParser.SVGTagMapping.parseTime(repeatDur) / dur
      }
      return {
        after: isNaN(after) ? 0 : after,
        duration: dur,
        restart: c.getAttribute('restart'),
        calcMode : c.getAttribute('calcMode'),
        additive : additive,
        accumulate : accum,
        repeat : repeat,
        variable: variable,
        fill: fill
      }
    },

    parseTime : function(value) {
      if (!value) return null
      if (value.match(/[0-9]$/)) {
        var hms = value.split(":")
        var s = hms[hms.length-1] || 0
        var m = hms[hms.length-2] || 0
        var h = hms[hms.length-3] || 0
        return (parseFloat(h)*3600 + parseFloat(m)*60 + parseFloat(s)) * 1000
      } else {
        var fac = 60
        if (value.match(/s$/i)) fac = 1
        else if (value.match(/h$/i)) fac = 3600
        return parseFloat(value) * fac * 1000
      }
    },






    animate : function(c, cn) {
      var from = this.parseUnit(c.getAttribute('from'), cn, 'x')
      var to = this.parseUnit(c.getAttribute('to'), cn, 'x')
      var by = this.parseUnit(c.getAttribute('by'), cn, 'x')
      var o = CakeJS.SVGParser.SVGTagMapping.parseAnimateTag(c, cn)
      if (c.getAttribute('values')) {
        var self = this
        var vals = c.getAttribute('values')
        vals = vals.split(";").map(function(v) {
          var xy = v.split(/[, ]+/)
          if (xy.length > 2) {
            return xy.map(function(x){ return self.parseUnit(x, cn, 'x') })
          } else if (xy.length > 1) {
            return [
              self.parseUnit(xy[0], cn, 'x'),
              self.parseUnit(xy[1], cn, 'y')
            ]
          } else {
            return self.parseUnit(v, cn, 'x')
          }
        })
      } else {
        if (to == null) to = from + by
      }
      cn.after(o.after, function() {
        if (o.fill == 'remove') {
          var orig = Object.clone(this[o.variable])
          this.after(o.duration, function(){ this[o.variable] = orig })
        }
        if (vals) {
          if (o.additive) {
            var ov = this[o.variable]
            vals = vals.map(function(v){
              return Object.sum(v, ov)
            })
          }
          var length = 0
          var lens = []
          if (vals[0] instanceof Array) {
            for (var i=1; i<vals.length; i++) {
              var diff = Object.sub(vals[i] - vals[i-1])
              var sl = Math.sqrt(diff.reduce(function(s, i) { return s + i*i }, 0))
              lens.push(sl)
              length += sl
            }
          } else {
            for (var i=1; i<vals.length; i++) {
              var sl = Math.abs(vals[i] - vals[i-1])
              lens.push(sl)
              length += sl
            }
          }
          var animator = function(pos) {
            if (pos == 1) {
              this[o.variable] = vals[vals.length-1]
            } else {
              if (o.calcMode == 'paced') {
                var len = pos * length
                var rlen = 0, idx, rt
                for (var i=0; i<lens.length; i++) {
                  if (rlen + lens[i] > len) {
                    idx = i
                    rt = (len - rlen) / lens[i]
                    break
                  }
                  rlen += lens[i]
                }
                var v0 = idx
                var v1 = v0 + 1
              } else {
                var idx = pos * (vals.length-1)
                var v0 = Math.floor(idx)
                var rt = idx - v0
                var v1 = v0 + 1
              }
              this.tweenVariable(o.variable, vals[v0], vals[v1], rt, o.calcMode)
            }
          }
          this.animate(animator, from, to, o.duration, 'linear', {
            repeat: o.repeat,
            additive: o.additive,
            accumulate: o.accumulate
          })
        } else {
          if (from == null) {
            from = this[o.variable]
            if (by != null) to = from + by
          }
          if (o.additive) {
            from = Object.sum(from, this[o.variable])
            to = Object.sum(to, this[o.variable])
          }
          this.animate(o.variable, from, to, o.duration, o.calcMode, {
            repeat: o.repeat,
            additive: o.additive,
            accumulate: o.accumulate
          })
        }
      })
    },

    set : function(c, cn) {
      var to = c.getAttribute('to')
      var o = CakeJS.SVGParser.SVGTagMapping.parseAnimateTag(c, cn)
      cn.after(o.after, function() {
        if (o.fill == 'remove') {
          var orig = Object.clone(this[o.variable])
          this.after(o.duration, function(){ this[o.variable] = orig })
        }
        this[o.variable] = to
      })
    },

    animateMotion : function(c,cn) {
      var path
      if (c.getAttribute('path')) {
        path = new CakeJS.Path(c.getAttribute('path'))
      } else if (c.getAttribute('values')) {
        var vals = c.getAttribute('values')
        path = new CakeJS.Path("M" + vals.split(";").join("L"))
      } else if (c.getAttribute('from') || c.getAttribute('to') || c.getAttribute('by')) {
        var from = c.getAttribute('from')
        var to = c.getAttribute('to')
        var by = c.getAttribute('by')
        if (!from) from = "0,0"
        if (!to) to = "l" + by
        else to = "L" + to
        path = new CakeJS.Path("M" + from + to)
      }
      var p = new CakeJS.CanvasNode()
      p.__motionPath = path
      var rotate = c.getAttribute('rotate')
      var o = CakeJS.SVGParser.SVGTagMapping.parseAnimateTag(c, cn)
      cn.after(o.after, function() {
        if (o.fill == 'remove') {
          var ox = this.x, oy = this.y
          this.after(o.duration, function(){ this.x = ox; this.y = oy})
        }
        var motion = function(pos) {
          var pa = p.__motionPath.pointAngleAt(pos, {
            discrete: o.calcMode == 'discrete',
            linear : o.calcMode == 'linear'
          })
          this.x = pa.point[0]
          this.y = pa.point[1]
          if (rotate == 'auto') {
            this.rotation = pa.angle
          } else if (rotate == 'auto-reverse') {
            this.rotation = pa.angle + Math.PI
          }
        }
        this.animate(motion, 0, 1, o.duration, 'linear', {
          repeat: o.repeat,
          additive: o.additive,
          accumulate: o.accumulate
        })
      })
      return p
    },

    mpath : function(c,cn, defs) {
      var href = c.getAttribute('xlink:href')
      href = href.replace(/^#/,'')
      this.getDef(defs, href, function(obj) {
        cn.__motionPath = obj
      })
    },

    animateColor : function(c, cn, defs) {
      var from = c.getAttribute('from')
      var to = c.getAttribute('to')
      from = CakeJS.SVGParser.SVGMapping.__parseStyle(from, null, defs)
      to = CakeJS.SVGParser.SVGMapping.__parseStyle(to, null, defs)
      var o = CakeJS.SVGParser.SVGTagMapping.parseAnimateTag(c, cn)
      cn.after(o.after, function() {
        if (o.fill == 'remove') {
          var orig = Object.clone(this[o.variable])
          this.after(o.duration, function(){ this[o.variable] = orig })
        }
        this.animate(o.variable, from, to, o.duration, 'linear', {
          repeat: o.repeat,
          additive: o.additive,
          accumulate: o.accumulate
        })
      })
    },

    animateTransform : function(c, cn) {
      var from = c.getAttribute('from')
      var to = c.getAttribute('to')
      var by = c.getAttribute('by')
      var o = CakeJS.SVGParser.SVGTagMapping.parseAnimateTag(c, cn)
      if (from) from = from.split(/[ ,]+/).map(parseFloat)
      if (to) to = to.split(/[ ,]+/).map(parseFloat)
      if (by) by = by.split(/[ ,]+/).map(parseFloat)
      o.variable = c.getAttribute('type')
      if (o.variable == 'rotate') {
        o.variable = 'rotation'
        if (from) from = from.map(function(v) { return v * Math.PI/180 })
        if (to) to = to.map(function(v) { return v * Math.PI/180 })
        if (by) by = by.map(function(v) { return v * Math.PI/180 })
      } else if (o.variable.match(/^skew/)) {
        if (from) from = from.map(function(v) { return v * Math.PI/180 })
        if (to) to = to.map(function(v) { return v * Math.PI/180 })
        if (by) by = by.map(function(v) { return v * Math.PI/180 })
      }
      if (to == null) to = Object.sum(from, by)
      cn.after(o.after, function() {
        if (o.variable == 'translate') {
          if (from == null) {
            from = [this.x, this.y]
            if (by != null) to = Object.sum(from, by)
          }
          if (o.fill == 'remove') {
            var ox = this.x
            var oy = this.y
            this.after(o.duration, function(){ this.x = ox; this.y = oy })
          }
          this.animate('x', from[0], to[0], o.duration, 'linear', {
            repeat: o.repeat,
            additive: o.additive,
            accumulate: o.accumulate
          })
          if (from[1] != null) {
            this.animate('y', from[1], to[1], o.duration, 'linear', {
              repeat: o.repeat,
              additive: o.additive,
              accumulate: o.accumulate
            })
          }
        } else {
          if (from) {
            if (from.length == 1) from = from[0]
          }
          if (to) {
            if (to.length == 1) to = to[0]
          }
          if (by) {
            if (by.length == 1) by = by[0]
          }
          if (from == null) {
            from = this[o.variable]
            if (by != null) to = Object.sum(from, by)
          }
          if (o.variable == 'scale' && o.additive) {
            // +1 in SMIL's additive scale means *1, welcome to brokenville
            o.additive = false
          }
          if (o.fill == 'remove') {
            var orig = Object.clone(this[o.variable])
            this.after(o.duration, function(){ this[o.variable] = orig })
          }
          this.animate(o.variable, from, to, o.duration, 'linear', {
            repeat: o.repeat,
            additive: o.additive,
            accumulate: o.accumulate
          })
        }
      })
    },

    a : function(c, cn) {
      var href = c.getAttribute('xlink:href') ||
                 c.getAttribute('href')
      var target = c.getAttribute('target')
      var p = new LinkNode(href, target)
      return p
    },

    use : function(c, cn, defs, style) {
      var id = c.getAttribute('xlink:href') ||
                c.getAttribute('href')
      var p = new CakeJS.CanvasNode()
      if (id) {
        id = id.replace(/^#/,'')
        this.getDef(defs, id, function(obj) {
          var oc = obj.clone()
          var par = p.parent
          if (par) {
            if (p.stroke) oc.stroke = p.stroke
            if (p.fill) oc.fill = p.fill
            p.append(oc)
          } else {
            p = oc
          }
        })
      }
      return p
    },

    image : function(c, cn, defs, style) {
      var src = c.getAttribute('xlink:href') ||
                c.getAttribute('href')
      if (src && src.search(/^[a-z]+:/i) != 0) {
        src = cn.root.filename.split("/").slice(0,-1).join("/") + "/" + src
      }
      var p = new CakeJS.ImageNode(src ? Object.loadImage(src) : null)
      p.fill = 'none'
      p.dX = this.parseUnit(c.getAttribute('x'), cn, 'x') || 0
      p.dY = this.parseUnit(c.getAttribute('y'), cn, 'y') || 0
      p.srcWidth = this.parseUnit(c.getAttribute('width'), cn, 'x')
      p.srcHeight = this.parseUnit(c.getAttribute('height'), cn, 'y')
      return p
    },

    path : function(c) {
      return new CakeJS.Path(c.getAttribute("d"))
    },

    polygon : function(c) {
      return new CakeJS.Polygon(c.getAttribute("points").toString().strip()
                          .split(/[\s,]+/).map(parseFloat))
    },

    polyline : function(c) {
      return new CakeJS.Polygon(c.getAttribute("points").toString().strip()
                          .split(/[\s,]+/).map(parseFloat), {closePath:false})
    },

    rect : function(c, cn) {
      var p = new CakeJS.Rectangle(
        this.parseUnit(c.getAttribute('width'), cn, 'x'),
        this.parseUnit(c.getAttribute('height'), cn, 'y')
      )
      p.cx = this.parseUnit(c.getAttribute('x'), cn, 'x') || 0
      p.cy = this.parseUnit(c.getAttribute('y'), cn, 'y') || 0
      p.rx = this.parseUnit(c.getAttribute('rx'), cn, 'x') || 0
      p.ry = this.parseUnit(c.getAttribute('ry'), cn, 'y') || 0
      return p
    },

    line : function(c, cn) {
      var x1 = this.parseUnit(c.getAttribute('x1'), cn, 'x') || 0
      var y1 = this.parseUnit(c.getAttribute('y1'), cn, 'y') || 0
      var x2 = this.parseUnit(c.getAttribute('x2'), cn, 'x') || 0
      var y2 = this.parseUnit(c.getAttribute('y2'), cn, 'y') || 0
      var p = new CakeJS.Line(x1,y1, x2,y2)
      return p
    },

    circle : function(c, cn) {
      var p = new CakeJS.Circle(this.parseUnit(c.getAttribute('r'), cn) || 0)
      p.cx = this.parseUnit(c.getAttribute('cx'), cn, 'x') || 0
      p.cy = this.parseUnit(c.getAttribute('cy'), cn, 'y') || 0
      return p
    },

    ellipse : function(c, cn) {
      var p = new CakeJS.Ellipse(
        this.parseUnit(c.getAttribute('rx'), cn, 'x') || 0,
        this.parseUnit(c.getAttribute('ry'), cn, 'y') || 0
      )
      p.cx = this.parseUnit(c.getAttribute('cx'), cn, 'x') || 0
      p.cy = this.parseUnit(c.getAttribute('cy'), cn, 'y') || 0
      return p
    },

    text : function(c, cn) {
      if (false) {
        var p = new CakeJS.TextNode(c.textContent.strip())
        p.setAsPath(true)
        p.cx = this.parseUnit(c.getAttribute('x'),cn, 'x') || 0
        p.cy = this.parseUnit(c.getAttribute('y'),cn, 'y') || 0
        return p
      } else {
        var e = E('div', c.textContent.strip())
        e.style.marginTop = '-1em'
        e.style.whiteSpace = 'nowrap'
        var p = new CakeJS.ElementNode(e)
        p.xOffset = this.parseUnit(c.getAttribute('x'),cn, 'x') || 0
        p.yOffset = this.parseUnit(c.getAttribute('y'),cn, 'y') || 0
        return p
      }
    },

    style : function(c, cn, defs, style) {
      this.parseStyle(c, style)
    },

    defs : function(c, cn, defs, style) {
      return new CakeJS.CanvasNode({visible: false})
    },

    linearGradient : function(c, cn,defs,style) {
      var g = new CakeJS.Gradient({type:'linear'})
      g.color = cn.color
      if (c.getAttribute('color')) {
        CakeJS.SVGParser.SVGMapping.color(g, c.getAttribute('color'), defs, style)
      }
      g.svgNode = c
      var x1 = c.getAttribute('x1')
      var y1 = c.getAttribute('y1')
      var x2 = c.getAttribute('x2')
      var y2 = c.getAttribute('y2')
      var transform = c.getAttribute('gradientTransform')
      g.units = c.getAttribute('gradientUnits') || "objectBoundingBox"
      if (x1) g.startX = parseFloat(x1) * (x1.charAt(x1.length-1) == '%' ? 0.01 : 1)
      if (y1) g.startY = parseFloat(y1) * (y1.charAt(y1.length-1) == '%' ? 0.01 : 1)
      if (x2) g.endX = parseFloat(x2) * (x2.charAt(x2.length-1) == '%' ? 0.01 : 1)
      if (y2) g.endY = parseFloat(y2) * (y2.charAt(y2.length-1) == '%' ? 0.01 : 1)
      if (transform) this.applySVGTransform(g, transform, defs, style)
      this.parseStops(g, c, defs, style)
      return g
    },

    radialGradient : function(c, cn, defs, style) {
      var g = new CakeJS.Gradient({type:'radial'})
      g.color = cn.color
      if (c.getAttribute('color')) {
        CakeJS.SVGParser.SVGMapping.color(g, c.getAttribute('color'), defs, style)
      }
      g.svgNode = c
      var r = c.getAttribute('r')
      var fx = c.getAttribute('fx')
      var fy = c.getAttribute('fy')
      var cx = c.getAttribute('cx')
      var cy = c.getAttribute('cy')
      var transform = c.getAttribute('gradientTransform')
      g.units = c.getAttribute('gradientUnits') || "objectBoundingBox"
      if (r) g.endRadius = parseFloat(r) * (r.charAt(r.length-1) == '%' ? 0.01 : 1)
      if (fx) g.startX = parseFloat(fx) * (fx.charAt(fx.length-1) == '%' ? 0.01 : 1)
      if (fy) g.startY = parseFloat(fy) * (fy.charAt(fy.length-1) == '%' ? 0.01 : 1)
      if (cx) g.endX = parseFloat(cx) * (cx.charAt(cx.length-1) == '%' ? 0.01 : 1)
      if (cy) g.endY = parseFloat(cy) * (cy.charAt(cy.length-1) == '%' ? 0.01 : 1)
      if (transform) this.applySVGTransform(g, transform, defs, style)
      this.parseStops(g, c, defs, style)
      return g
    }
  },

  parseChildren : function(node, canvasNode, defs, style) {
    var childNodes = []
    var cn = canvasNode
    for (var i=0; i<node.childNodes.length; i++) {
      var c = node.childNodes[i]
      var p = false // argh, remember to initialize vars inside loops
      if (c.childNodes) {
        if (c.tagName) {
          if (this.SVGTagMapping[c.tagName]) {
            p = this.SVGTagMapping[c.tagName].call(
                  this, c, canvasNode, defs, style)
          } else {
            p = new CakeJS.CanvasNode()
          }
          if (p) {
            p.root = canvasNode.root
            p.fontSize = cn.fontSize
            p.strokeWidth = cn.strokeWidth
            if (c.attributes) {
              for (var j=0; j<c.attributes.length; j++) {
                var attr = c.attributes[j]
                if (this.SVGMapping[attr.nodeName])
                  this.SVGMapping[attr.nodeName](p, attr.nodeValue, defs, style)
              }
            }
            if (p.id) {
              this.setDef(defs, p.id, p)
            }
            p.tagName = c.tagName
            this.applySVGTransform(p, c.getAttribute("transform"), defs, style)
            this.applySVGStyle(p, c.getAttribute("style"), defs, style)
            if (p.tagName && style.tags[p.tagName])
              this.applySVGStyle(p, style.tags[p.tagName], defs, style)
            if (p.className && style.classes[p.className])
              this.applySVGStyle(p, style.classes[p.className], defs, style)
            if (p.id && style.ids[p.id])
              this.applySVGStyle(p, style.ids[p.id], defs, style)
            if (!p.marker) p.marker = cn.marker
            if (!p.markerStart) p.markerStart = cn.markerStart
            if (!p.markerEnd) p.markerEnd = cn.markerEnd
            if (!p.markerMid) p.markerMid = cn.markerMid
          }
        }
        if (p && p.setRoot) {
          p.zIndex = i
          canvasNode.append(p)
          this.parseChildren(c, p, defs, style)
        }
      }
    }
  },

  parseStyle : function(node, style) {
    var text = node.textContent
    var segs = text.split(/\}/m)
    for (var i=0; i<segs.length; i++) {
      var seg = segs[i]
      var kv = seg.split(/\{/m)
      if (kv.length < 2) continue
      var key = kv[0].strip()
      var value = kv[1].strip()
      switch (key.charAt(0)) {
        case '.':
          style.classes[key.slice(1)] = value
          break;
        case '#':
          style.ids[key.slice(1)] = value
          break;
        default:
          style.tags[key] = value
          break;
      }
    }
  },

  parseStops : function(g, node, defs, style) {
    var href = node.getAttribute('xlink:href')
    g.colorStops = []
    if (href) {
      href = href.replace(/^#/,'')
      this.getDef(defs, href, function(g2) {
        if (g.colorStops.length == 0)
          g.colorStops = g2.colorStops
      })
    }
    var stops = []
    for (var i=0; i<node.childNodes.length; i++) {
      var c = node.childNodes[i]
      if (c.tagName == 'stop') {
        var offset = parseFloat(c.getAttribute('offset'))
        if (c.getAttribute('offset').search(/%/) != -1)
          offset *= 0.01
        var stop = [offset]
        stop.color = g.color
        for (var j=0; j<c.attributes.length; j++) {
          var attr = c.attributes[j]
          if (this.SVGMapping[attr.nodeName])
            this.SVGMapping[attr.nodeName](stop, attr.nodeValue, defs, style)
        }
        this.applySVGStyle(stop, c.getAttribute('style'), defs, style)
        var id = c.getAttribute('id')
        if (id) this.setDef(defs, id, stop)
        stops.push(stop)
      }
    }
    if (stops.length > 0)
      g.colorStops = stops
  },

  applySVGTransform : function(node, transform, defs, style) {
    if (!transform) return
    node.transformList = []
    var segs = transform.match(/[a-z]+\s*\([^)]*\)/ig)
    for (var i=0; i<segs.length; i++) {
      var kv = segs[i].split("(")
      var k = kv[0].strip()
      if (this.SVGMapping[k]) {
        var v = kv[1].strip().slice(0,-1)
        this.SVGMapping[k](node, v, defs, style)
      }
    }
    this.breakDownTransformList(node)
  },

  breakDownTransformList : function(node) {
    var tl = node.transformList
    if (node.transformList.length == 1) {
      var tr = tl[0]
      if (tr[0] == 'translate') {
        node.x = tr[1][0]
        node.y = tr[1][1]
      } else if (tr[0] == 'scale') {
        node.scale = tr[1]
      } else if (tr[0] == 'rotate') {
        node.rotation = tr[1]
      } else if (tr[0] == 'matrix') {
        node.matrix = tr[1]
      } else if (tr[0] == 'skewX') {
        node.skewX = tr[1][0]
      } else if (tr[0] == 'skewY') {
        node.skewY = tr[1][0]
      } else {
        return
      }
      node.transformList = null
    }
  },

  applySVGStyle : function(node, style, defs, st) {
    if (!style) return
    var segs = style.split(";")
    for (var i=0; i<segs.length; i++) {
      var kv = segs[i].split(":")
      var k = kv[0].strip()
      if (this.SVGMapping[k]) {
        var v = kv[1].strip()
        this.SVGMapping[k](node, v, defs, st)
      }
    }
  },

  getDef : function(defs, id, f) {
    if (defs[id] && defs[id] instanceof Array) {
      defs[id].push(f)
    } else if (defs[id]) {
      f(defs[id])
    } else {
      defs[id] = [f]
    }
  },

  setDef : function(defs, id, obj) {
    if (defs[id] && defs[id] instanceof Array) {
      for (var i=0; i<defs[id].length; i++) {
        defs[id][i](obj)
      }
    }
    defs[id] = obj
  },

  parseUnit : function(v, parent, dir) {
    if (v == null) {
      return null
    } else {
      return this.parseUnitMultiplier(v, parent, dir) * parseFloat(v.strip())
    }
  },

  parseUnitMultiplier : function(str, parent, dir) {
    var cm = this.getCmInPixels()
    if (str.search(/cm$/i) != -1)
      return cm
    else if (str.search(/mm$/i) != -1)
      return 0.1 * cm
    else if (str.search(/pt$/i) != -1)
      return 0.0352777778 * cm
    else if (str.search(/pc$/i) != -1)
      return 0.4233333333 * cm
    else if (str.search(/in$/i) != -1)
      return 2.54 * cm
    else if (str.search(/em$/i) != -1)
      return parent.fontSize
    else if (str.search(/ex$/i) != -1)
      return parent.fontSize / 2
    else if (str.search(/%$/i) != -1)
      if (dir == 'x')
        return parent.root.innerWidth * 0.01
      else if (dir == 'y')
        return parent.root.innerHeight * 0.01
      else
        return parent.root.innerSize * 0.01
    else
      return 1
  },

  getCmInPixels : function() {
    if (!this.cmInPixels) {
      var e = E('div',{ style: {
        margin: '0px',
        padding: '0px',
        width: '1cm',
        height: '1cm',
        position: 'absolute',
        visibility: 'hidden'
      }})
      document.body.appendChild(e)
      var cm = e.offsetWidth
      document.body.removeChild(e)
      this.cmInPixels = cm || 38
    }
    return this.cmInPixels
  },

  getEmInPixels : function() {
    if (!this.emInPixels) {
      var e = E('div',{ style: {
        margin: '0px',
        padding: '0px',
        width: '1em',
        height: '1em',
        position: 'absolute',
        visibility: 'hidden'
      }})
      document.body.appendChild(e)
      var em = e.offsetWidth
      document.body.removeChild(e)
      this.emInPixels = em || 12
    }
    return this.emInPixels
  },

  getExInPixels : function() {
    if (!this.exInPixels) {
      var e = E('div',{ style: {
        margin: '0px',
        padding: '0px',
        width: '1ex',
        height: '1ex',
        position: 'absolute',
        visibility: 'hidden'
      }})
      document.body.appendChild(e)
      var ex = e.offsetWidth
      document.body.removeChild(e)
      this.exInPixels = ex || 6
    }
    return this.exInPixels
  },

  SVGMapping : {
    DEG_TO_RAD_FACTOR : Math.PI / 180,
    RAD_TO_DEG_FACTOR : 180 / Math.PI,

    parseUnit : function(v, cn, dir) {
      return CakeJS.SVGParser.parseUnit(v, cn, dir)
    },

    "class" : function(node, v) {
      node.className = v
    },

    marker : function(node, v, defs) {
      CakeJS.SVGParser.getDef(defs, v.replace(/^url\(#|\)$/g, ''), function(g) {
        node.marker = g
      })
    },

    "marker-start" : function(node, v, defs) {
      CakeJS.SVGParser.getDef(defs, v.replace(/^url\(#|\)$/g, ''), function(g) {
        node.markerStart = g
      })
    },

    "marker-end" : function(node, v, defs) {
      CakeJS.SVGParser.getDef(defs, v.replace(/^url\(#|\)$/g, ''), function(g) {
        node.markerEnd = g
      })
    },

    "marker-mid" : function(node, v, defs) {
      CakeJS.SVGParser.getDef(defs, v.replace(/^url\(#|\)$/g, ''), function(g) {
        node.markerMid = g
      })
    },

    "clip-path" : function(node, v, defs) {
      CakeJS.SVGParser.getDef(defs, v.replace(/^url\(#|\)$/g, ''), function(g) {
        node.clipPath = g
      })
    },

    id : function(node, v) {
      node.id = v
    },

    translate : function(node, v) {
      var xy = v.split(/[\s,]+/).map(parseFloat)
      node.transformList.push(['translate', [xy[0], xy[1] || 0]])
    },

    rotate : function(node, v) {
      if (v == 'auto' || v == 'auto-reverse') return
      var rot = v.split(/[\s,]+/).map(parseFloat)
      var angle = rot[0] * this.DEG_TO_RAD_FACTOR
      if (rot.length > 1)
        node.transformList.push(['rotate', [angle, rot[1], rot[2] || 0]])
      else
        node.transformList.push(['rotate', [angle]])
    },

    scale : function(node, v) {
      var xy = v.split(/[\s,]+/).map(parseFloat)
      var trans = ['scale']
      if (xy.length > 1)
        trans[1] = [xy[0], xy[1]]
      else
        trans[1] = [xy[0], xy[0]]
      node.transformList.push(trans)
    },

    matrix : function(node, v) {
      var mat = v.split(/[\s,]+/).map(parseFloat)
      node.transformList.push(['matrix', mat])
    },

    skewX : function(node, v) {
      var angle = parseFloat(v)*this.DEG_TO_RAD_FACTOR
      node.transformList.push(['skewX', [angle]])
    },

    skewY : function(node, v) {
      var angle = parseFloat(v)*this.DEG_TO_RAD_FACTOR
      node.transformList.push(['skewY', [angle]])
    },

    opacity : function(node, v) {
      node.opacity = parseFloat(v)
    },

    display : function (node, v) {
      node.display = v
    },

    visibility : function (node, v) {
      node.visibility = v
    },

    'stroke-miterlimit' : function(node, v) {
      node.miterLimit = parseFloat(v)
    },

    'stroke-linecap' : function(node, v) {
      node.lineCap = v
    },

    'stroke-linejoin' : function(node, v) {
      node.lineJoin = v
    },

    'stroke-width' : function(node, v) {
      node.strokeWidth = this.parseUnit(v, node)
    },

    fill : function(node, v, defs, style) {
      node.fill = this.__parseStyle(v, node.fill, defs, node.color)
    },

    stroke : function(node, v, defs, style) {
      node.stroke = this.__parseStyle(v, node.stroke, defs, node.color)
    },

    color : function(node, v, defs, style) {
      if (v == 'inherit') return
      node.color = this.__parseStyle(v, false, defs, node.color)
    },

    'stop-color' : function(node, v, defs, style) {
      if (v == 'none') {
        node[1] = [0,0,0,0]
      } else {
        node[1] = this.__parseStyle(v, node[1], defs, node.color)
      }
    },

    'fill-opacity' : function(node, v) {
      node.fillOpacity = Math.min(1,Math.max(0,parseFloat(v)))
    },

    'stroke-opacity' : function(node, v) {
      node.strokeOpacity = Math.min(1,Math.max(0,parseFloat(v)))
    },

    'stop-opacity' : function(node, v) {
      node[1] = node[1] || [0,0,0]
      node[1][3] = Math.min(1,Math.max(0,parseFloat(v)))
    },

    'text-anchor' : function(node, v) {
      node.textAnchor = v
      if (node.setAlign) {
        if (v == 'middle')
          node.setAlign('center')
        else
          node.setAlign(v)
      }
    },

    'font-family' : function(node, v) {
      node.fontFamily = v
    },

    'font-size' : function(node, v) {
      node.fontSize = this.parseUnit(v, node)
    },

    __parseStyle : function(v, currentStyle, defs, currentColor) {

      if (v.charAt(0) == '#') {
        if (v.length == 4)
          v = v.replace(/([^#])/g, '$1$1')
        var a = v.slice(1).match(/../g).map(
          function(i) { return parseInt(i, 16) })
        return a

      } else if (v.search(/^rgb\(/) != -1) {
        var a = v.slice(4,-1).split(",")
        for (var i=0; i<a.length; i++) {
          var c = a[i].strip()
          if (c.charAt(c.length-1) == '%')
            a[i] = Math.round(parseFloat(c.slice(0,-1)) * 2.55)
          else
            a[i] = parseInt(c)
        }
        return a

      } else if (v.search(/^rgba\(/) != -1) {
        var a = v.slice(5,-1).split(",")
        for (var i=0; i<3; i++) {
          var c = a[i].strip()
          if (c.charAt(c.length-1) == '%')
            a[i] = Math.round(parseFloat(c.slice(0,-1)) * 2.55)
          else
            a[i] = parseInt(c)
        }
        var c = a[3].strip()
        if (c.charAt(c.length-1) == '%')
          a[3] = Math.round(parseFloat(c.slice(0,-1)) * 0.01)
        else
          a[3] = Math.max(0, Math.min(1, parseFloat(c)))
        return a

      } else if (v.search(/^url\(/) != -1) {
        var id = v.match(/\([^)]+\)/)[0].slice(1,-1).replace(/^#/, '')
        if (defs[id]) {
          return defs[id]
        } else { // missing defs, let's make it known that we're screwed
          return 'rgba(255,0,255,1)'
        }

      } else if (v == 'currentColor') {
        return currentColor

      } else if (v == 'none') {
        return 'none'

      } else if (v == 'freeze') { // SMIL is evil, but so are we
        return null

      } else if (v == 'remove') {
        return null

      } else { // unknown value, maybe it's an ICC color
        return v
      }
    }
  }
}
