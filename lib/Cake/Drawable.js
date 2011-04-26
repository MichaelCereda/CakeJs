/**
  A Drawable is a CanvasNode with possible fill, stroke and clip.

  It draws the path by calling #drawGeometry
  */
CakeJS.Drawable = CakeJS.Klass(CakeJS.CanvasNode, {
  pickable : true,
  //   'inside' // clip before drawing the stroke
  // | 'above'  // draw stroke after the fill
  // | 'below'  // draw stroke before the fill
  strokeMode : 'above',

  ABOVE : 'above', BELOW : 'below', INSIDE : 'inside',

  initialize : function(config) {
    CakeJS.CanvasNode.initialize.call(this, config)
  },

  /**
    Draws the picking path for the Drawable.

    The default version begins a new path and calls drawGeometry.

    @param ctx Canvas drawing context
    */
  drawPickingPath : function(ctx) {
    if (!this.drawGeometry) return
    ctx.beginPath()
    this.drawGeometry(ctx)
  },

  /**
    Returns true if the point x,y is inside the path of a drawable node.

    The x,y point is in user-space coordinates, meaning that e.g. the point
    5,5 will always be inside the rectangle [0, 0, 10, 10], regardless of the
    transform on the rectangle.

    @param x X-coordinate of the point.
    @param y Y-coordinate of the point.
    @return Whether the point is inside the path of this node.
    @type boolean
    */
  isPointInPath : function(x, y) {
    return false
  },

  isVisible : function(ctx) {
    var abb = this.getAxisAlignedBoundingBox()
    if (!abb) return true
    var x1 = abb[0], x2 = abb[0]+abb[2], y1 = abb[1], y2 = abb[1]+abb[3]
    var w = this.root.width
    var h = this.root.height
    if (this.root.drawBoundingBoxes) {
      ctx.save()
        var bbox = this.getBoundingBox()
        ctx.beginPath()
        ctx.rect(bbox[0], bbox[1], bbox[2], bbox[3])
        ctx.strokeStyle = 'green'
        ctx.lineWidth = 1
        ctx.stroke()
      ctx.restore()
      ctx.save()
        CanvasSupport.setTransform(ctx, [1,0,0,1,0,0], this.currentMatrix)
        ctx.beginPath()
        ctx.rect(x1, y1, x2-x1, y2-y1)
        ctx.strokeStyle = 'red'
        ctx.lineWidth = 1.5
        ctx.stroke()
      ctx.restore()
    }
    var visible = !(x2 < 0 || x1 > w || y2 < 0 || y1 > h)
    return visible
  },

  createSubtreePath : function(ctx, skipTransform) {
    ctx.save()
    if (!skipTransform) this.transform(ctx, true)
    if (this.drawGeometry) this.drawGeometry(ctx)
    for (var i=0; i<this.childNodes.length; i++)
      this.childNodes[i].createSubtreePath(ctx)
    ctx.restore()
  },

  /**
    Draws the Drawable. Begins a path and calls this.drawGeometry, followed by
    possibly filling, stroking and clipping the path, depending on whether
    #fill, #stroke and #clip are set.

    @param ctx Canvas drawing context
    */
  draw : function(ctx) {
    if (!this.drawGeometry) return
    // bbox checking is slower than just drawing in most cases.
    // and caching the bboxes is hard to do correctly.
    // plus, bboxes aren't hierarchical.
    // so we are being glib :|
    if (this.root.drawBoundingBoxes)
      this.isVisible(ctx)
    var ft = (ctx.fillStyle.transformList ||
              ctx.fillStyle.matrix ||
              ctx.fillStyle.scale != null ||
              ctx.fillStyle.rotation ||
              ctx.fillStyle.x ||
              ctx.fillStyle.y )
    var st = (ctx.strokeStyle.transformList ||
              ctx.strokeStyle.matrix ||
              ctx.strokeStyle.scale != null ||
              ctx.strokeStyle.rotation ||
              ctx.strokeStyle.x ||
              ctx.strokeStyle.y )
    ctx.beginPath()
    this.drawGeometry(ctx)
    if (ctx.strokeOn) {
      switch (this.strokeMode) {
        case this.ABOVE:
          if (ctx.fillOn) this.doFill(ctx,ft)
          this.doStroke(ctx, st)
          break
        case this.BELOW:
          this.doStroke(ctx, st)
          if (ctx.fillOn) this.doFill(ctx,ft)
          break
        case this.INSIDE:
          if (ctx.fillOn) this.doFill(ctx,ft)
          ctx.save()
          var lw = ctx.lineWidth
          ctx.setLineWidth(1)
          this.doStroke(ctx, st)
          ctx.setLineWidth(lw)
          ctx.clip()
          this.doStroke(ctx, st)
          ctx.restore()
          break
      }
    } else if (ctx.fillOn) {
      this.doFill(ctx,ft)
    }
    this.drawMarkers(ctx)
    if (this.clip) ctx.clip()
  },

  doFill : function(ctx, ft) {
    if (ft || (this.getBoundingBox && ctx.fillStyle.units == this.OBJECTBOUNDINGBOX)) {
      ctx.save()
      if (this.getBoundingBox && ctx.fillStyle.units == this.OBJECTBOUNDINGBOX) {
        var bb = this.getBoundingBox()
        var sx = bb[2]
        var sy = bb[3]
        ctx.translate(bb[0],bb[1])
        ctx.scale(sx,sy)
      }
      ctx.fillStyle.transform(ctx)
    }
    if (this.fillOpacity != null) {
      var go = ctx.globalAlpha
      ctx.setGlobalAlpha(go * this.fillOpacity)
      ctx.fill()
      ctx.globalAlpha = go
    } else {
      ctx.fill()
    }
    if (ft) ctx.restore()
  },

  doStroke : function(ctx, st) {
    if (st || (this.getBoundingBox && ctx.strokeStyle.units == this.OBJECTBOUNDINGBOX)) {
      ctx.save()
      if (this.getBoundingBox && ctx.strokeStyle.units == this.OBJECTBOUNDINGBOX) {
        var bb = this.getBoundingBox()
        var sx = bb[2]
        var sy = bb[3]
        ctx.translate(bb[0],bb[1])
        ctx.scale(sx,sy)
      }
      ctx.strokeStyle.needMatrixUpdate = true
      ctx.strokeStyle.transform(ctx)
      if (sx != null)
        CanvasSupport.tScale(ctx.strokeStyle.currentMatrix, sx, sy)
      var cm = ctx.strokeStyle.currentMatrix
      // fix stroke width scale (non-uniform scales screw us up though)
      var sw = Math.sqrt(Math.max(
        cm[0]*cm[0] + cm[1]*cm[1],
        cm[2]*cm[2] + cm[3]*cm[3]
      ))
      ctx.setLineWidth(((ctx.lineWidth == null) ? 1 : ctx.lineWidth) / sw)
    }
    if (this.strokeOpacity != null) {
      var go = ctx.globalAlpha
      ctx.setGlobalAlpha(go * this.strokeOpacity)
      ctx.stroke()
      ctx.globalAlpha = go
    } else {
      ctx.stroke()
    }
    if (st) ctx.restore()
  },

  drawMarkers : function(ctx) {
    var sm = this.markerStart || this.marker
    var em = this.markerEnd || this.marker
    var mm = this.markerMid || this.marker
    if (sm && this.getStartPoint) {
      var pa = this.getStartPoint()
      if (sm.orient != null && sm.orient != 'auto')
        pa.angle = sm.orient
      var scale = (sm.markerUnits == 'strokeWidth') ? ctx.lineWidth : 1
      ctx.save()
        ctx.translate(pa.point[0], pa.point[1])
        ctx.scale(scale, scale)
        ctx.rotate(pa.angle)
        var mat = CanvasSupport.tRotate(
          CanvasSupport.tScale(
          CanvasSupport.tTranslate(
            this.currentMatrix.slice(0),
            pa.point[0], pa.point[1]
          ), scale, scale), pa.angle)
        sm.__copyMatrix(mat)
        sm.handleDraw(ctx)
      ctx.restore()
    }
    if (em && this.getEndPoint) {
      var pa = this.getEndPoint()
      if (em.orient != null && em.orient != 'auto')
        pa.angle = em.orient
      var scale = (em.markerUnits == 'strokeWidth') ? ctx.lineWidth : 1
      ctx.save()
        ctx.translate(pa.point[0], pa.point[1])
        ctx.scale(scale, scale)
        ctx.rotate(pa.angle)
        var mat = CanvasSupport.tRotate(
          CanvasSupport.tScale(
          CanvasSupport.tTranslate(
            this.currentMatrix.slice(0),
            pa.point[0], pa.point[1]
          ), scale, scale), pa.angle)
        em.__copyMatrix(mat)
        em.handleDraw(ctx)
      ctx.restore()
    }
    if (mm && this.getMidPoints) {
      var pas = this.getMidPoints()
      var scale = (mm.markerUnits == 'strokeWidth') ? ctx.lineWidth : 1
      for (var i=0; i<pas.length; i++) {
        var pa = pas[i]
        ctx.save()
          ctx.translate(pa.point[0], pa.point[1])
          ctx.scale(scale, scale)
          if (mm.orient != null && mm.orient != 'auto')
            pa.angle = em.orient
          ctx.rotate(pa.angle)
          var mat = CanvasSupport.tRotate(
            CanvasSupport.tScale(
            CanvasSupport.tTranslate(
              this.currentMatrix.slice(0),
              pa.point[0], pa.point[1]
            ), scale, scale), pa.angle)
          mm.__copyMatrix(mat)
          mm.handleDraw(ctx)
        ctx.restore()
      }
    }
  },

  getStartPoint : false,
  getEndPoint : false,
  getMidPoints : false,
  getBoundingBox : false

})
