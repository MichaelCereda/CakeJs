/**
  CanvasNode is the base CAKE scenegraph node. All the other scenegraph nodes
  derive from it. A plain CanvasNode does no drawing, but it can be used for
  grouping other nodes and setting up the group's drawing state.

  var scene = new CanvasNode({x: 10, y: 10})

  The usual way to use CanvasNodes is to append them to a Canvas object:

    var scene = new CanvasNode()
    scene.append(new Rectangle(40, 40, {fill: true}))
    var elem = E.canvas(400, 400)
    var canvas = new Canvas(elem)
    canvas.append(scene)

  You can also use CanvasNodes to draw directly to a canvas element:

    var scene = new CanvasNode()
    scene.append(new Circle(40, {x:200, y:200, stroke: true}))
    var elem = E.canvas(400, 400)
    scene.handleDraw(elem.getContext('2d'))

  */
CanvasNode = Klass(Animatable, Transformable, {
  OBJECTBOUNDINGBOX : 'objectBoundingBox',

  // whether to draw the node and its childNodes or not
  visible : true,

  // whether to draw the node (doesn't affect subtree)
  drawable : true,

  // the CSS display property can be used to affect 'visible'
  // false     => visible = visible
  // 'none'    => visible = false
  // otherwise => visible = true
  display : null,

  // the CSS visibility property can be used to affect 'drawable'
  // false     => drawable = drawable
  // 'hidden'  => drawable = false
  // otherwise => drawable = true
  visibility : null,

  // whether this and the subtree from this register mouse hover
  catchMouse : true,

  // Whether this object registers mouse hover. Only set this to true when you
  // have a drawable object that can be picked. Otherwise the object requires
  // a matrix inversion on Firefox 2 and Safari, which is slow.
  pickable : false,

  // true if this node or one of its descendants is under the mouse
  // cursor and catchMouse is true
  underCursor : false,

  // zIndex in relation to sibling nodes (note: not global)
  zIndex : 0,

  // x translation of the node
  x : 0,

  // y translation of the node
  y : 0,

  // scale factor: number for uniform scaling, [x,y] for dimension-wise
  scale : 1,

  // Rotation of the node, in radians.
  //
  // The rotation can also be the array [angle, cx, cy],
  // where cx and cy define the rotation center.
  //
  // The array form is equivalent to
  // translate(cx, cy); rotate(angle); translate(-cx, -cy);
  rotation : 0,

  // Transform matrix with which to multiply the current transform matrix.
  // Applied after all other transformations.
  matrix : null,

  // Transform matrix with which to replace the current transform matrix.
  // Applied before any other transformation.
  absoluteMatrix : null,

  // SVG-like list of transformations to apply.
  // The different transformations are:
  // ['translate', [x,y]]
  // ['rotate', [angle, cx, cy]] - (optional) cx and cy are the rotation center
  // ['scale', [x,y]]
  // ['matrix', [m11, m12, m21, m22, dx, dy]]
  transformList : null,

  // fillStyle for the node and its descendants
  // Possibilities:
  //   null // use the previous
  //   true      // use the previous but do fill
  //   false     // use the previous but don't do fill
  //   'none'    // use the previous but don't do fill
  //
  //   'white'
  //   '#fff'
  //   '#ffffff'
  //   'rgba(255,255,255, 1.0)'
  //   [255, 255, 255, 1.0]
  //   new Gradient(...)
  //   new Pattern(myImage, 'no-repeat')
  fill : null,

  // strokeStyle for the node and its descendants
  // Possibilities:
  //   null // use the previous
  //   true      // use the previous but do stroke
  //   false     // use the previous but don't do stroke
  //   'none'    // use the previous but don't do stroke
  //
  //   'white'
  //   '#fff'
  //   '#ffffff'
  //   'rgba(255,255,255, 1.0)'
  //   [255, 255, 255, 1.0]
  //   new Gradient(...)
  //   new Pattern(myImage, 'no-repeat')
  stroke : null,

  // stroke line width
  strokeWidth : null,

  // stroke line cap style ('butt' | 'round' | 'square')
  lineCap : null,

  // stroke line join style ('bevel' | 'round' | 'miter')
  lineJoin : null,

  // stroke line miter limit
  miterLimit : null,

  // set globalAlpha to this value
  absoluteOpacity : null,

  // multiply globalAlpha by this value
  opacity : null,

  // fill opacity
  fillOpacity : null,

  // stroke opacity
  strokeOpacity : null,

  // set globalCompositeOperation to this value
  // Possibilities:
  // ( 'source-over' |
  //   'copy' |
  //   'lighter' |
  //   'darker' |
  //   'xor' |
  //   'source-in' |
  //   'source-out' |
  //   'destination-over' |
  //   'destination-atop' |
  //   'destination-in' |
  //   'destination-out' )
  compositeOperation : null,

  // Color for the drop shadow
  shadowColor : null,

  // Drop shadow blur radius
  shadowBlur : null,

  // Drop shadow's x-offset
  shadowOffsetX : null,

  // Drop shadow's y-offset
  shadowOffsetY : null,

  // HTML5 text API
  font : null,
  // horizontal position of the text origin
  // 'left' | 'center' | 'right' | 'start' | 'end'
  textAlign : null,
  // vertical position of the text origin
  // 'top' | 'hanging' | 'middle' | 'alphabetic' | 'ideographic' | 'bottom'
  textBaseline : null,

  cursor : null,

  changed : true,

  tagName : 'g',

  getNextSibling : function(){
    if (this.parentNode)
      return this.parentNode.childNodes[this.parentNode.childNodes.indexOf(this)+1]
    return null
  },

  getPreviousSibling : function(){
    if (this.parentNode)
      return this.parentNode.childNodes[this.parentNode.childNodes.indexOf(this)-1]
    return null
  },

  /**
    Initialize the CanvasNode and merge an optional config hash.
    */
  initialize : function(config) {
    this.root = this
    this.currentMatrix = [1,0,0,1,0,0]
    this.previousMatrix = [1,0,0,1,0,0]
    this.needMatrixUpdate = true
    this.childNodes = []
    this.frameListeners = []
    this.eventListeners = {}
    Animatable.initialize.call(this)
    if (config)
      Object.extend(this, config)
  },

  /**
    Create a clone of the node and its subtree.
    */
  clone : function() {
    var c = Object.clone(this)
    c.parent = c.root = null
    for (var i in this) {
      if (typeof(this[i]) == 'object')
        c[i] = Object.clone(this[i])
    }
    c.parent = c.root = null
    c.childNodes = []
    c.setRoot(null)
    for (var i=0; i<this.childNodes.length; i++) {
      var ch = this.childNodes[i].clone()
      c.append(ch)
    }
    return c
  },

  cloneNode : function(){ return this.clone() },

  /**
    Gets node by id.
    */
  getElementById : function(id) {
    if (this.id == id)
      return this
    for (var i=0; i<this.childNodes.length; i++) {
      var n = this.childNodes[i].getElementById(id)
      if (n) return n
    }
    return null
  },

  $ : function(id) {
    return this.getElementById(id)
  },

  /**
    Alias for append().

    @param Node[s] to append
    */
  appendChild : function() {
    return this.append.apply(this, arguments)
  },

  /**
    Appends arguments as childNodes to the node.

    Adding a child sets child.parent to be the node and calls
    child.setRoot(node.root)

    @param Node[s] to append
    */
  append : function(obj) {
    var a = $A(arguments)
    for (var i=0; i<a.length; i++) {
      if (a[i].parent) a[i].removeSelf()
      this.childNodes.push(a[i])
      a[i].parent = a[i].parentNode = this
      a[i].setRoot(this.root)
    }
    this.changed = true
  },

  /**
    Removes all childNodes from the node.
    */
  removeAllChildren : function() {
    this.remove.apply(this, this.childNodes)
  },

  /**
    Alias for remove().

    @param Node[s] to remove
    */
  removeChild : function() {
    return this.remove.apply(this, arguments)
  },

  /**
    Removes arguments from the node's childNodes.

    Removing a child sets its parent to null and calls
    child.setRoot(null)

    @param Child node[s] to remove
    */
  remove : function(obj) {
    var a = arguments
    for (var i=0; i<a.length; i++) {
      this.childNodes.deleteFirst(a[i])
      delete a[i].parent
      delete a[i].parentNode
      a[i].setRoot(null)
    }
    this.changed = true
  },

  /**
    Calls this.parent.removeChild(this) if this.parent is set.
    */
  removeSelf : function() {
    if (this.parentNode) {
      this.parentNode.remove(this)
    }
  },

  /**
    Returns true if this node's subtree contains obj. (I.e. obj is this or
    obj's parent chain includes this.)

    @param obj Node to look for
    @return True if obj is in this node's subtree, false if it isn't.
    */
  contains : function(obj) {
    while (obj) {
      if (obj == this) return true
      obj = obj.parentNode
    }
    return false
  },

  /**
    Set this.root to the given value and propagate the update to childNodes.

    @param root The new root node
    @private
    */
  setRoot : function(root) {
    if (!root) root = this
    this.dispatchEvent({type: 'rootChanged', canvasTarget: this, relatedTarget: root})
    this.root = root
    for (var i=0; i<this.childNodes.length; i++)
      this.childNodes[i].setRoot(root)
  },

  /**
    Adds a callback function to be called before drawing each frame.

    @param f Callback function
    */
  addFrameListener : function(f) {
    this.frameListeners.push(f)
  },

  /**
    Removes a callback function from update callbacks.

    @param f Callback function
    */
  removeFrameListener : function(f) {
    this.frameListeners.deleteFirst(f)
  },

  addEventListener : function(type, listener, capture) {
    if (!this.eventListeners[type])
      this.eventListeners[type] = {capture:[], bubble:[]}
    this.eventListeners[type][capture ? 'capture' : 'bubble'].push(listener)
  },

  /**
    Synonym for addEventListener.
  */
  when : function(type, listener, capture) {
    this.addEventListener(type, listener, capture || false)
  },

  removeEventListener : function(type, listener, capture) {
    if (!this.eventListeners[type]) return
    this.eventListeners[type][capture ? 'capture' : 'bubble'].deleteFirst(listener)
    if (this.eventListeners[type].capture.length == 0 &&
        this.eventListeners[type].bubble.length == 0)
      delete this.eventListeners[type]
  },

  dispatchEvent : function(event) {
    var type = event.type
    if (!event.canvasTarget) {
      if (type.search(/^(key|text)/i) == 0) {
        event.canvasTarget = this.root.focused || this.root.target
      } else {
        event.canvasTarget = this.root.target
      }
      if (!event.canvasTarget)
        event.canvasTarget = this
    }
    var path = []
    var obj = event.canvasTarget
    while (obj && obj != this) {
      path.push(obj)
      obj = obj.parent
    }
    path.push(this)
    event.canvasPhase = 'capture'
    for (var i=path.length-1; i>=0; i--)
      if (!path[i].handleEvent(event)) return false
    event.canvasPhase = 'bubble'
    for (var i=0; i<path.length; i++)
      if (!path[i].handleEvent(event)) return false
    return true
  },

  broadcastEvent : function(event) {
    var type = event.type
    event.canvasPhase = 'capture'
    if (!this.handleEvent(event)) return false
    for (var i=0; i<this.childNodes.length; i++)
      if (!this.childNodes[i].broadcastEvent(event)) return false
    event.canvasPhase = 'bubble'
    if (!this.handleEvent(event)) return false
    return true
  },

  handleEvent : function(event) {
    var type = event.type
    var phase = event.canvasPhase
    if (this.cursor && phase == 'capture')
      event.cursor = this.cursor
    var els = this.eventListeners[type]
    els = els && els[phase]
    if (els) {
      for (var i=0; i<els.length; i++) {
        var rv = els[i].call(this, event)
        if (rv == false || event.stopped) {
          if (!event.stopped)
            event.stopPropagation()
          event.stopped = true
          return false
        }
      }
    }
    return true
  },

  /**
    Handle scenegraph update.
    Called with current time before drawing each frame.

    This method should be touched only if you know what you're doing.
    If you need your own update handler, either add a frame listener or
    overwrite {@link CanvasNode#update}.

    @param time Current animation time
    @param timeDelta Time since last frame in milliseconds
    */
  handleUpdate : function(time, timeDelta) {
    this.update(time, timeDelta)
    this.willBeDrawn = (!this.parent || this.parent.willBeDrawn) && (this.display ? this.display != 'none' : this.visible)
    for(var i=0; i<this.childNodes.length; i++)
      this.childNodes[i].handleUpdate(time, timeDelta)
    // TODO propagate dirty area bbox up the scene graph
    if (this.parent && this.changed) {
      this.parent.changed = this.changed
      this.changed = false
    }
    this.needMatrixUpdate = true
  },

  /**
    Update this node. Calls all frame listener callbacks in the order they
    were added.

    Overwrite this with your own method if you want to do things differently.

    @param time Current animation time
    @param timeDelta Time since last frame in milliseconds
    */
  update : function(time, timeDelta) {
    // need to operate on a copy, otherwise bad stuff happens
    var fl = this.frameListeners.slice(0)
    for(var i=0; i<fl.length; i++) {
      if (this.frameListeners.includes(fl[i]))
        fl[i].apply(this, arguments)
    }
  },

  /**
    Tests if this node or its subtree is under the mouse cursor and
    sets this.underCursor accordingly.

    If this node (and not one of its childNodes) is under the mouse cursor
    this.root.target is set to this. This way, the topmost (== drawn last)
    node under the mouse cursor is the root target.

    To see whether a subtree node is the current target:

    if (this.underCursor && this.contains(this.root.target)) {
      // we are the target, let's roll
    }

    This method should be touched only if you know what you're doing.
    Overwrite {@link CanvasNode#drawPickingPath} to change the way the node's
    picking path is created.

    Called after handleUpdate, but before handleDraw.

    @param ctx Canvas 2D context
    */
  handlePick : function(ctx) {
    // CSS display & visibility
    if (this.display)
      this.visible = (this.display != 'none')
    if (this.visibility)
      this.drawable = (this.visibility != 'hidden')
    this.underCursor = false
    if (this.visible && this.catchMouse && this.root.absoluteMouseX != null) {
      ctx.save()
      this.transform(ctx, true)
      if (this.pickable && this.drawable) {
        if (ctx.isPointInPath) {
          ctx.beginPath()
          if (this.drawPickingPath)
            this.drawPickingPath(ctx)
        }
        this.underCursor = CanvasSupport.isPointInPath(
                              this.drawPickingPath ? ctx : false,
                              this.root.mouseX,
                              this.root.mouseY,
                              this.currentMatrix,
                              this)
        if (this.underCursor)
          this.root.target = this
      } else {
        this.underCursor = false
      }
      var c = this.__getChildrenCopy()
      this.__zSort(c)
      for(var i=0; i<c.length; i++) {
        c[i].handlePick(ctx)
        if (!this.underCursor)
          this.underCursor = c[i].underCursor
      }
      ctx.restore()
    } else {
      var c = this.__getChildrenCopy()
      while (c.length > 0) {
        var c0 = c.pop()
        if (c0.underCursor) {
          c0.underCursor = false
          Array.prototype.push.apply(c, c0.childNodes)
        }
      }
    }
  },

  __zSort : function(c) {
    c.stableSort(function(c1,c2) { return c1.zIndex - c2.zIndex; });
  },

  __getChildrenCopy : function() {
    if (this.__childNodesCopy) {
      while (this.__childNodesCopy.length > this.childNodes.length)
        this.__childNodesCopy.pop()
      for (var i=0; i<this.childNodes.length; i++)
        this.__childNodesCopy[i] = this.childNodes[i]
    } else {
      this.__childNodesCopy = this.childNodes.slice(0)
    }
    return this.__childNodesCopy
  },

  /**
    Returns true if the point x,y is inside the path of a drawable node.

    The x,y point is in user-space coordinates, meaning that e.g. the point
    5,5 will always be inside the rectangle [0, 0, 10, 10], regardless of the
    transform on the rectangle.

    Leave isPointInPath to false to avoid unnecessary matrix inversions for
    non-drawables.

    @param x X-coordinate of the point.
    @param y Y-coordinate of the point.
    @return Whether the point is inside the path of this node.
    @type boolean
    */
  isPointInPath : false,

  /**
    Handles transforming and drawing the node and its childNodes
    on each frame.

    Pushes context state, applies state transforms and draws the node.
    Then sorts the node's childNodes by zIndex, smallest first, and
    calls their handleDraws in that order. Finally, pops the context state.

    Called after handleUpdate and handlePick.

    This method should be touched only if you know what you're doing.
    Overwrite {@link CanvasNode#draw} when you need to draw things.

    @param ctx Canvas 2D context
    */
  handleDraw : function(ctx) {
    // CSS display & visibility
    if (this.display)
      this.visible = (this.display != 'none')
    if (this.visibility)
      this.drawable = (this.visibility != 'hidden')
    if (!this.visible) return
    ctx.save()
    var pff = ctx.fontFamily
    var pfs = ctx.fontSize
    var pfo = ctx.fillOn
    var pso = ctx.strokeOn
    if (this.fontFamily)
      ctx.fontFamily = this.fontFamily
    if (this.fontSize)
      ctx.fontSize = this.fontSize
    this.transform(ctx)
    if (this.clipPath) {
      ctx.beginPath()
      if (this.clipPath.units == this.OBJECTBOUNDINGBOX) {
        var bb = this.getSubtreeBoundingBox(true)
        ctx.save()
        ctx.translate(bb[0], bb[1])
        ctx.scale(bb[2], bb[3])
        this.clipPath.createSubtreePath(ctx, true)
        ctx.restore()
        ctx.clip()
      } else {
        this.clipPath.createSubtreePath(ctx, true)
        ctx.clip()
      }
    }
    if (this.drawable && this.draw)
      this.draw(ctx)
    var c = this.__getChildrenCopy()
    this.__zSort(c);
    for(var i=0; i<c.length; i++) {
      c[i].handleDraw(ctx)
    }
    ctx.fontFamily = pff
    ctx.fontSize = pfs
    ctx.fillOn = pfo
    ctx.strokeOn = pso
    ctx.restore()
  },

  /**
    Transforms the context state according to this node's attributes.

    @param ctx Canvas 2D context
    @param onlyTransform If set to true, only do matrix transforms.
    */
  transform : function(ctx, onlyTransform) {
    Transformable.prototype.transform.call(this, ctx)

    if (onlyTransform) return

    // stroke / fill modifiers
    if (this.fill != null) {
      if (!this.fill || this.fill == 'none') {
        ctx.fillOn = false
      } else {
        ctx.fillOn = true
        if (this.fill != true) {
          var fillStyle = Colors.parseColorStyle(this.fill, ctx)
          ctx.setFillStyle( fillStyle )
        }
      }
    }
    if (this.stroke != null) {
      if (!this.stroke || this.stroke == 'none') {
        ctx.strokeOn = false
      } else {
        ctx.strokeOn = true
        if (this.stroke != true)
          ctx.setStrokeStyle( Colors.parseColorStyle(this.stroke, ctx) )
      }
    }
    if (this.strokeWidth != null)
      ctx.setLineWidth( this.strokeWidth )
    if (this.lineCap != null)
      ctx.setLineCap( this.lineCap )
    if (this.lineJoin != null)
      ctx.setLineJoin( this.lineJoin )
    if (this.miterLimit != null)
      ctx.setMiterLimit( this.miterLimit )

    // compositing modifiers
    if (this.absoluteOpacity != null)
      ctx.setGlobalAlpha( this.absoluteOpacity )
    if (this.opacity != null)
      ctx.setGlobalAlpha( ctx.globalAlpha * this.opacity )
    if (this.compositeOperation != null)
      ctx.setGlobalCompositeOperation( this.compositeOperation )

    // shadow modifiers
    if (this.shadowColor != null)
      ctx.setShadowColor( Colors.parseColorStyle(this.shadowColor, ctx) )
    if (this.shadowBlur != null)
      ctx.setShadowBlur( this.shadowBlur )
    if (this.shadowOffsetX != null)
      ctx.setShadowOffsetX( this.shadowOffsetX )
    if (this.shadowOffsetY != null)
      ctx.setShadowOffsetY( this.shadowOffsetY )

    // text modifiers
    if (this.textAlign != null)
      ctx.setTextAlign( this.textAlign )
    if (this.textBaseline != null)
      ctx.setTextBaseline( this.textBaseline )
    if (this.font != null)
      ctx.setFont( this.font )
  },

  /**
    Draws the picking path for the node for testing if the mouse cursor
    is inside the node.

    False by default, overwrite if you need special behaviour.

    @param ctx Canvas 2D context
    */
  drawPickingPath : false,

  /**
    Draws the node.

    False by default, overwrite to actually draw something.

    @param ctx Canvas 2D context
    */
  draw : false,

  createSubtreePath : function(ctx, skipTransform) {
    ctx.save()
    if (!skipTransform) this.transform(ctx, true)
    for (var i=0; i<this.childNodes.length; i++)
      this.childNodes[i].createSubtreePath(ctx)
    ctx.restore()
  },

  getSubtreeBoundingBox : function(identity) {
    if (identity) {
      var p = this.parent
      this.parent = null
      this.needMatrixUpdate = true
    }
    var bb = this.getAxisAlignedBoundingBox()
    for (var i=0; i<this.childNodes.length; i++) {
      var cbb = this.childNodes[i].getSubtreeBoundingBox()
      if (!bb) {
        bb = cbb
      } else if (cbb) {
        this.mergeBoundingBoxes(bb, cbb)
      }
    }
    if (identity) {
      this.parent = p
      this.needMatrixUpdate = true
    }
    return bb
  },

  mergeBoundingBoxes : function(bb, bb2) {
    if (bb[0] > bb2[0]) bb[0] = bb2[0]
    if (bb[1] > bb2[1]) bb[1] = bb2[1]
    if (bb[2]+bb[0] < bb2[2]+bb2[0]) bb[2] = bb2[2]+bb2[0]-bb[0]
    if (bb[3]+bb[1] < bb2[3]+bb2[1]) bb[3] = bb2[3]+bb2[1]-bb[1]
  },

  getAxisAlignedBoundingBox : function() {
    this.transform(null, true)
    if (!this.getBoundingBox) return null
    var bbox = this.getBoundingBox()
    var xy1 = CanvasSupport.tMatrixMultiplyPoint(this.currentMatrix,
      bbox[0], bbox[1])
    var xy2 = CanvasSupport.tMatrixMultiplyPoint(this.currentMatrix,
      bbox[0]+bbox[2], bbox[1]+bbox[3])
    var xy3 = CanvasSupport.tMatrixMultiplyPoint(this.currentMatrix,
      bbox[0], bbox[1]+bbox[3])
    var xy4 = CanvasSupport.tMatrixMultiplyPoint(this.currentMatrix,
      bbox[0]+bbox[2], bbox[1])
    var x1 = Math.min(xy1[0], xy2[0], xy3[0], xy4[0])
    var x2 = Math.max(xy1[0], xy2[0], xy3[0], xy4[0])
    var y1 = Math.min(xy1[1], xy2[1], xy3[1], xy4[1])
    var y2 = Math.max(xy1[1], xy2[1], xy3[1], xy4[1])
    return [x1, y1, x2-x1, y2-y1]
  },

  makeDraggable : function() {
    this.addEventListener('dragstart', function(ev) {
      this.dragStartPosition = {x: this.x, y: this.y};
      ev.stopPropagation();
      ev.preventDefault();
      return false;
    }, false);
    this.addEventListener('drag', function(ev) {
      this.x = this.dragStartPosition.x + this.root.dragX / this.parent.currentMatrix[0];
      this.y = this.dragStartPosition.y + this.root.dragY / this.parent.currentMatrix[3];
      ev.stopPropagation();
      ev.preventDefault();
      return false;
    }, false);
  }
})