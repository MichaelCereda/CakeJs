/**
  Path is used for creating custom paths.

  Attributes: segments, closePath.

    var path = new Path([
      ['moveTo', [-50, -60]],
      ['lineTo', [30, 50],
      ['lineTo', [-50, 50]],
      ['bezierCurveTo', [-50, 100, -50, 100, 0, 100]],
      ['quadraticCurveTo', [0, 120, -20, 130]],
      ['quadraticCurveTo', [0, 140, 0, 160]],
      ['bezierCurveTo', [-10, 160, -20, 170, -30, 180]],
      ['quadraticCurveTo', [10, 230, -50, 260]]
    ])

  The path segments are used as [methodName, arguments] on the canvas
  drawing context, so the possible path segments are:

    ['moveTo', [x, y]]
    ['lineTo', [x, y]]
    ['quadraticCurveTo', [control_point_x, control_point_y, x, y]]
    ['bezierCurveTo', [cp1x, cp1y, cp2x, cp2y, x, y]]
    ['arc', [x, y, radius, startAngle, endAngle, drawClockwise]]
    ['arcTo', [x1, y1, x2, y2, radius]]
    ['rect', [x, y, width, height]]

  You can also pass an SVG path string as segments.

    var path = new Path("M 100 100 L 300 100 L 200 300 z", {
      stroke: true, strokeStyle: 'blue',
      fill: true, fillStyle: 'red',
      lineWidth: 3
    })

  @param segments The path segments.
  @param config Optional config hash.
  */
Path = Klass(Drawable, {
  segments : [],
  closePath : false,

  initialize : function(segments, config) {
    this.segments = segments
    Drawable.initialize.call(this, config)
  },

  /**
    Creates a path on the given drawing context.

    For each path segment, calls the context method named in the first element
    of the segment with the rest of the segment elements as arguments.

    SVG paths are parsed and executed.

    Closes the path if closePath is true.

    @param ctx Canvas drawing context.
    */
  drawGeometry : function(ctx) {
    var segments = this.getSegments()
    for (var i=0; i<segments.length; i++) {
      var seg = segments[i]
      ctx[seg[0]].apply(ctx, seg[1])
    }
    if (this.closePath)
      ctx.closePath()
  },

  /**
    Returns true if the point x,y is inside the path's bounding rectangle.

    The x,y point is in user-space coordinates, meaning that e.g. the point
    5,5 will always be inside the rectangle [0, 0, 10, 10], regardless of the
    transform on the rectangle.

    @param px X-coordinate of the point.
    @param py Y-coordinate of the point.
    @return Whether the point is inside the path's bounding rectangle.
    @type boolean
    */
  isPointInPath : function(px,py) {
    var bbox = this.getBoundingBox()
    return (px >= bbox[0] && px <= bbox[0]+bbox[2] &&
            py >= bbox[1] && py <= bbox[1]+bbox[3])
  },

  getBoundingBox : function() {
    if (!(this.compiled && this.compiledBoundingBox)) {
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      var segments = this.getSegments()
      for (var i=0; i<segments.length; i++) {
        var seg = segments[i][1]
        for (var j=0; j<seg.length; j+=2) {
          var x = seg[j], y = seg[j+1]
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
      this.compiledBoundingBox = [minX, minY, maxX-minX, maxY-minY]
    }
    return this.compiledBoundingBox
  },

  getStartPoint : function() {
    var segs = this.getSegments()
    if (!segs || !segs[0]) return {point: [0,0], angle: 0}
    var fs = segs[0]
    var c = fs[1]
    var point = [c[c.length-2], c[c.length-1]]
    var ss = segs[1]
    var angle = 0
    if (ss) {
      c2 = ss[1]
      angle = Curves.lineAngle(point, [c2[c2.length-2], c2[c2.length-1]])
    }
    return {
      point: point,
      angle: angle
    }
  },

  getEndPoint : function() {
    var segs = this.getSegments()
    if (!segs || !segs[0]) return {point: [0,0], angle: 0}
    var fs = segs[segs.length-1]
    var c = fs[1]
    var point = [c[c.length-2], c[c.length-1]]
    var ss = segs[segs.length-2]
    var angle = 0
    if (ss) {
      c2 = ss[1]
      angle = Curves.lineAngle([c2[c2.length-2], c2[c2.length-1]], point)
    }
    return {
      point: point,
      angle: angle
    }
  },

  getMidPoints : function() {
    var segs = this.getSegments()
    if (this.vertices)
      return this.vertices.slice(1,-1)
    var verts = []
    for (var i=1; i<segs.length-1; i++) {
      var b = segs[i-1][1].slice(-2)
      var c = segs[i][1].slice(0,2)
      if (segs[i-1].length > 2) {
        var a = segs[i-1][1].slice(-4,-2)
        var t = 0.5 * (Curves.lineAngle(a,b) + Curves.lineAngle(b,c))
      } else {
        var t = Curves.lineAngle(b,c)
      }
      verts.push(
        {point: b, angle: t}
      )
      var id = segs[i][2]
      if (id != null) {
        i++
        while (segs[i] && segs[i][2] == id) i++
        i--
      }
    }
    return verts
  },

  getSegments : function() {
    if (typeof(this.segments) == 'string') {
      if (!this.compiled || this.segments != this.compiledSegments) {
        this.compiled = this.compileSVGPath(this.segments)
        this.compiledSegments = this.segments
      }
    } else if (!this.compiled) {
      this.compiled = Object.clone(this.segments)
    }
    return this.compiled
  },

  /**
    Compiles an SVG path string into an array of canvas context method calls.

    Returns an array of [methodName, [arg1, arg2, ...]] method call arrays.
    */
  compileSVGPath : function(svgPath) {
    var segs = svgPath.split(/(?=[a-z])/i)
    var x = 0
    var y = 0
    var px,py
    var pc
    var commands = []
    for (var i=0; i<segs.length; i++) {
      var seg = segs[i]
      var cmd = seg.match(/[a-z]/i)
      if (!cmd) return [];
      cmd = cmd[0];
      var coords = seg.match(/[+-]?\d+(\.\d+(e\d+(\.\d+)?)?)?/gi)
      if (coords) coords = coords.map(parseFloat)
      switch(cmd) {
        case 'M':
          x = coords[0]
          y = coords[1]
          px = py = null
          commands.push(['moveTo', [x, y]])
          break
        case 'm':
          x += coords[0]
          y += coords[1]
          px = py = null
          commands.push(['moveTo', [x, y]])
          break

        case 'L':
          x = coords[0]
          y = coords[1]
          px = py = null
          commands.push(['lineTo', [x, y]])
          break
        case 'l':
          x += coords[0]
          y += coords[1]
          px = py = null
          commands.push(['lineTo', [x, y]])
          break
        case 'H':
          x = coords[0]
          px = py = null
          commands.push(['lineTo', [x, y]])
          break
        case 'h':
          x += coords[0]
          px = py = null
          commands.push(['lineTo', [x,y]])
          break
        case 'V':
          y = coords[0]
          px = py = null
          commands.push(['lineTo', [x,y]])
          break
        case 'v':
          y += coords[0]
          px = py = null
          commands.push(['lineTo', [x,y]])
          break

        case 'C':
          x = coords[4]
          y = coords[5]
          px = coords[2]
          py = coords[3]
          commands.push(['bezierCurveTo', coords])
          break
        case 'c':
          commands.push(['bezierCurveTo',[
            coords[0] + x, coords[1] + y,
            coords[2] + x, coords[3] + y,
            coords[4] + x, coords[5] + y
          ]])
          px = x + coords[2]
          py = y + coords[3]
          x += coords[4]
          y += coords[5]
          break

        case 'S':
          if (px == null || !pc.match(/[sc]/i)) {
            px = x
            py = y
          }
          commands.push(['bezierCurveTo',[
            x-(px-x), y-(py-y),
            coords[0], coords[1],
            coords[2], coords[3]
          ]])
          px = coords[0]
          py = coords[1]
          x = coords[2]
          y = coords[3]
          break
        case 's':
          if (px == null || !pc.match(/[sc]/i)) {
            px = x
            py = y
          }
          commands.push(['bezierCurveTo',[
            x-(px-x), y-(py-y),
            x + coords[0], y + coords[1],
            x + coords[2], y + coords[3]
          ]])
          px = x + coords[0]
          py = y + coords[1]
          x += coords[2]
          y += coords[3]
          break

        case 'Q':
          px = coords[0]
          py = coords[1]
          x = coords[2]
          y = coords[3]
          commands.push(['quadraticCurveTo', coords])
          break
        case 'q':
          commands.push(['quadraticCurveTo',[
            coords[0] + x, coords[1] + y,
            coords[2] + x, coords[3] + y
          ]])
          px = x + coords[0]
          py = y + coords[1]
          x += coords[2]
          y += coords[3]
          break

        case 'T':
          if (px == null || !pc.match(/[qt]/i)) {
            px = x
            py = y
          } else {
            px = x-(px-x)
            py = y-(py-y)
          }
          commands.push(['quadraticCurveTo',[
            px, py,
            coords[0], coords[1]
          ]])
          px = x-(px-x)
          py = y-(py-y)
          x = coords[0]
          y = coords[1]
          break
        case 't':
          if (px == null || !pc.match(/[qt]/i)) {
            px = x
            py = y
          } else {
            px = x-(px-x)
            py = y-(py-y)
          }
          commands.push(['quadraticCurveTo',[
            px, py,
            x + coords[0], y + coords[1]
          ]])
          x += coords[0]
          y += coords[1]
          break

        case 'A':
          var arc_segs = this.solveArc(x,y, coords)
          for (var l=0; l<arc_segs.length; l++) arc_segs[l][2] = i
          commands.push.apply(commands, arc_segs)
          x = coords[5]
          y = coords[6]
          break
        case 'a':
          coords[5] += x
          coords[6] += y
          var arc_segs = this.solveArc(x,y, coords)
          for (var l=0; l<arc_segs.length; l++) arc_segs[l][2] = i
          commands.push.apply(commands, arc_segs)
          x = coords[5]
          y = coords[6]
          break

        case 'Z':
          commands.push(['closePath', []])
          break
        case 'z':
          commands.push(['closePath', []])
          break
      }
      pc = cmd
    }
    return commands
  },

  solveArc : function(x, y, coords) {
    var rx = coords[0]
    var ry = coords[1]
    var rot = coords[2]
    var large = coords[3]
    var sweep = coords[4]
    var ex = coords[5]
    var ey = coords[6]
    var segs = this.arcToSegments(ex, ey, rx, ry, large, sweep, rot, x, y)
    var retval = []
    for (var i=0; i<segs.length; i++) {
      retval.push(['bezierCurveTo', this.segmentToBezier.apply(this, segs[i])])
    }
    return retval
  },


  // Copied from Inkscape svgtopdf, thanks!
  arcToSegments : function(x, y, rx, ry, large, sweep, rotateX, ox, oy) {
    var th = rotateX * (Math.PI/180)
    var sin_th = Math.sin(th)
    var cos_th = Math.cos(th)
    rx = Math.abs(rx)
    ry = Math.abs(ry)
    var px = cos_th * (ox - x) * 0.5 + sin_th * (oy - y) * 0.5
    var py = cos_th * (oy - y) * 0.5 - sin_th * (ox - x) * 0.5
    var pl = (px*px) / (rx*rx) + (py*py) / (ry*ry)
    if (pl > 1) {
      pl = Math.sqrt(pl)
      rx *= pl
      ry *= pl
    }

    var a00 = cos_th / rx
    var a01 = sin_th / rx
    var a10 = (-sin_th) / ry
    var a11 = (cos_th) / ry
    var x0 = a00 * ox + a01 * oy
    var y0 = a10 * ox + a11 * oy
    var x1 = a00 * x + a01 * y
    var y1 = a10 * x + a11 * y

    var d = (x1-x0) * (x1-x0) + (y1-y0) * (y1-y0)
    var sfactor_sq = 1 / d - 0.25
    if (sfactor_sq < 0) sfactor_sq = 0
    var sfactor = Math.sqrt(sfactor_sq)
    if (sweep == large) sfactor = -sfactor
    var xc = 0.5 * (x0 + x1) - sfactor * (y1-y0)
    var yc = 0.5 * (y0 + y1) + sfactor * (x1-x0)

    var th0 = Math.atan2(y0-yc, x0-xc)
    var th1 = Math.atan2(y1-yc, x1-xc)

    var th_arc = th1-th0
    if (th_arc < 0 && sweep == 1){
      th_arc += 2*Math.PI
    } else if (th_arc > 0 && sweep == 0) {
      th_arc -= 2 * Math.PI
    }

    var segments = Math.ceil(Math.abs(th_arc / (Math.PI * 0.5 + 0.001)))
    var result = []
    for (var i=0; i<segments; i++) {
      var th2 = th0 + i * th_arc / segments
      var th3 = th0 + (i+1) * th_arc / segments
      result[i] = [xc, yc, th2, th3, rx, ry, sin_th, cos_th]
    }

    return result
  },

  segmentToBezier : function(cx, cy, th0, th1, rx, ry, sin_th, cos_th) {
    var a00 = cos_th * rx
    var a01 = -sin_th * ry
    var a10 = sin_th * rx
    var a11 = cos_th * ry

    var th_half = 0.5 * (th1 - th0)
    var t = (8/3) * Math.sin(th_half * 0.5) * Math.sin(th_half * 0.5) / Math.sin(th_half)
    var x1 = cx + Math.cos(th0) - t * Math.sin(th0)
    var y1 = cy + Math.sin(th0) + t * Math.cos(th0)
    var x3 = cx + Math.cos(th1)
    var y3 = cy + Math.sin(th1)
    var x2 = x3 + t * Math.sin(th1)
    var y2 = y3 - t * Math.cos(th1)
    return [
      a00 * x1 + a01 * y1,      a10 * x1 + a11 * y1,
      a00 * x2 + a01 * y2,      a10 * x2 + a11 * y2,
      a00 * x3 + a01 * y3,      a10 * x3 + a11 * y3
    ]
  },

  getLength : function() {
    var segs = this.getSegments()
    if (segs.arcLength == null) {
      segs.arcLength = 0
      var x=0, y=0
      for (var i=0; i<segs.length; i++) {
        var args = segs[i][1]
        if (args.length < 2) continue
        switch(segs[i][0]) {
          case 'bezierCurveTo':
            segs[i][3] = Curves.cubicLength(
              [x, y], [args[0], args[1]], [args[2], args[3]], [args[4], args[5]])
            break
          case 'quadraticCurveTo':
            segs[i][3] = Curves.quadraticLength(
              [x, y], [args[0], args[1]], [args[2], args[3]])
            break
          case 'lineTo':
            segs[i][3] = Curves.lineLength(
              [x, y], [args[0], args[1]])
            break
        }
        if (segs[i][3])
          segs.arcLength += segs[i][3]
        x = args[args.length-2]
        y = args[args.length-1]
      }
    }
    return segs.arcLength
  },

  pointAngleAt : function(t, config) {
    var segments = []
    var segs = this.getSegments()
    var length = this.getLength()
    var x = 0, y = 0
    for (var i=0; i<segs.length; i++) {
      var seg = segs[i]
      if (seg[1].length < 2) continue
      if (seg[0] != 'moveTo') {
        segments.push([x, y, seg])
      }
      x = seg[1][seg[1].length-2]
      y = seg[1][seg[1].length-1]
    }
    if (segments.length < 1)
      return {point: [x, y], angle: 0 }
    if (t >= 1) {
      var rt = 1
      var seg = segments[segments.length-1]
    } else if (config && config.discrete) {
      var idx = Math.floor(t * segments.length)
      var seg = segments[idx]
      var rt = 0
    } else if (config && config.linear) {
      var idx = t * segments.length
      var rt = idx - Math.floor(idx)
      var seg = segments[Math.floor(idx)]
    } else {
      var len = t * length
      var rlen = 0, idx, rt
      for (var i=0; i<segments.length; i++) {
        if (rlen + segments[i][2][3] > len) {
          idx = i
          rt = (len - rlen) / segments[i][2][3]
          break
        }
        rlen += segments[i][2][3]
      }
      var seg = segments[idx]
    }
    var angle = 0
    var cmd = seg[2][0]
    var args = seg[2][1]
    switch (cmd) {
      case 'bezierCurveTo':
        return Curves.cubicLengthPointAngle([seg[0], seg[1]], [args[0], args[1]], [args[2], args[3]], [args[4], args[5]], rt)
        break
      case 'quadraticCurveTo':
        return Curves.quadraticLengthPointAngle([seg[0], seg[1]], [args[0], args[1]], [args[2], args[3]], rt)
        break
      case 'lineTo':
        x = Curves.linearValue(seg[0], args[0], rt)
        y = Curves.linearValue(seg[1], args[1], rt)
        angle = Curves.lineAngle([seg[0], seg[1]], [args[0], args[1]], rt)
        break
    }
    return {point: [x, y], angle: angle }
  }

})