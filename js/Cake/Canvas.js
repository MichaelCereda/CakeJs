/**
  Canvas is the canvas manager class.
  It takes care of updating and drawing its childNodes on a canvas element.

  An example with a rotating rectangle:

    var c = E.canvas(500, 500)
    var canvas = new Canvas(c)
    var rect = new Rectangle(100, 100)
    rect.x = 250
    rect.y = 250
    rect.fill = true
    rect.fillStyle = 'green'
    rect.addFrameListener(function(t) {
      this.rotation = ((t / 3000) % 1) * Math.PI * 2
    })
    canvas.append(rect)
    document.body.appendChild(c)


  To use the canvas as a manually updated image:

    var canvas = new Canvas(E.canvas(200,40), {
      isPlaying : false,
      redrawOnlyWhenChanged : true
    })
    var c = new Circle(20)
    c.x = 100
    c.y = 20
    c.fill = true
    c.fillStyle = 'red'
    c.addFrameListener(function(t) {
      if (this.root.absoluteMouseX != null) {
        this.x = this.root.mouseX // relative to canvas surface
        this.root.changed = true
      }
    })
    canvas.append(c)


  Or by using raw onFrame-calls:

    var canvas = new Canvas(E.canvas(200,40), {
      isPlaying : false,
      fill : true,
      fillStyle : 'white'
    })
    var c = new Circle(20)
    c.x = 100
    c.y = 20
    c.fill = true
    c.fillStyle = 'red'
    canvas.append(c)
    canvas.onFrame()


  Which is also the recommended way to use a canvas inside another canvas:

    var canvas = new Canvas(E.canvas(200,40), {
      isPlaying : false
    })
    var c = new Circle(20, {
      x: 100, y: 20,
      fill: true, fillStyle: 'red'
    })
    canvas.append(c)

    var topCanvas = new Canvas(E.canvas(500, 500))
    var canvasImage = new ImageNode(canvas.canvas, {x: 250, y: 250})
    topCanvas.append(canvasImage)
    canvasImage.addFrameListener(function(t) {
      this.rotation = (t / 3000 % 1) * Math.PI * 2
      canvas.onFrame(t)
    })

  */
Canvas = Klass(CanvasNode, {

  clear : true,
  frameLoop : false,
  recording : false,
  opacity : 1,
  frame : 0,
  elapsed : 0,
  frameDuration : 30,
  speed : 1.0,
  time : 0,
  fps : 0,
  currentRealFps : 0,
  currentFps : 0,
  fpsFrames : 30,
  startTime : 0,
  realFps : 0,
  fixedTimestep : false,
  playOnlyWhenFocused : true,
  isPlaying : true,
  redrawOnlyWhenChanged : false,
  changed : true,
  drawBoundingBoxes : false,
  cursor : 'default',

  mouseDown : false,
  mouseEvents : [],

  // absolute pixel coordinates from canvas top-left
  absoluteMouseX : null,
  absoluteMouseY : null,

  /*
    Coordinates relative to the canvas's surface scale.
    Example:
      canvas.width
      #=> 100
      canvas.style.width
      #=> '100px'
      canvas.absoluteMouseX
      #=> 50
      canvas.mouseX
      #=> 50

      canvas.style.width = '200px'
      canvas.width
      #=> 100
      canvas.absoluteMouseX
      #=> 100
      canvas.mouseX
      #=> 50
  */
  mouseX : null,
  mouseY : null,

  elementNodeZIndexCounter : 0,

  initialize : function(canvas, config) {
    if (arguments.length > 2) {
      var container = arguments[0]
      var w = arguments[1]
      var h = arguments[2]
      var config = arguments[3]
      var canvas = E.canvas(w,h)
      var canvasContainer = E('div', canvas, {style:
        {overflow:'hidden', width:w+'px', height:h+'px', position:'relative'}
      })
      this.canvasContainer = canvasContainer
      if (container)
        container.appendChild(canvasContainer)
    }
    CanvasNode.initialize.call(this, config)
    this.mouseEventStack = []
    this.canvas = canvas
    canvas.canvas = this
    this.width = this.canvas.width
    this.height = this.canvas.height
    var th = this
    this.frameHandler = function() { th.onFrame() }
    this.canvas.addEventListener('DOMNodeInserted', function(ev) {
      if (ev.target == this)
        th.addEventListeners()
    }, false)
    this.canvas.addEventListener('DOMNodeRemoved', function(ev) {
      if (ev.target == this)
        th.removeEventListeners()
    }, false)
    if (this.canvas.parentNode) this.addEventListeners()
    this.startTime = new Date().getTime()
    if (this.isPlaying)
      this.play()
  },

  // FIXME
  removeEventListeners : function() {
  },

  addEventListeners : function() {
    var th = this
    this.canvas.parentNode.addMouseEvent = function(e){
      var xy = Mouse.getRelativeCoords(this, e)
      th.absoluteMouseX = xy.x
      th.absoluteMouseY = xy.y
      var style = document.defaultView.getComputedStyle(th.canvas,"")
      var w = parseFloat(style.getPropertyValue('width'))
      var h = parseFloat(style.getPropertyValue('height'))
      th.mouseX = th.absoluteMouseX * (w / th.canvas.width)
      th.mouseY = th.absoluteMouseY * (h / th.canvas.height)
      th.addMouseEvent(th.mouseX, th.mouseY, th.mouseDown)
    }
    this.canvas.parentNode.contains = this.contains

    this.canvas.parentNode.addEventListener('mousedown', function(e) {
      th.mouseDown = true
      if (th.keyTarget != th.target) {
        if (th.keyTarget)
          th.dispatchEvent({type: 'blur', canvasTarget: th.keyTarget})
        th.keyTarget = th.target
        if (th.keyTarget)
          th.dispatchEvent({type: 'focus', canvasTarget: th.keyTarget})
      }
      this.addMouseEvent(e)
    }, true)

    this.canvas.parentNode.addEventListener('mouseup', function(e) {
      this.addMouseEvent(e)
      th.mouseDown = false
    }, true)

    this.canvas.parentNode.addEventListener('mousemove', function(e) {
      this.addMouseEvent(e)
      if (th.prevClientX == null) {
        th.prevClientX = e.clientX
        th.prevClientY = e.clientY
      }
      if (th.dragTarget) {
        var nev = document.createEvent('MouseEvents')
        nev.initMouseEvent('drag', true, true, window, e.detail,
          e.screenX, e.screenY, e.clientX, e.clientY, e.ctrlKey, e.altKey,
          e.shiftKey, e.metaKey, e.button, e.relatedTarget)
        nev.canvasTarget = th.dragTarget
        nev.dx = e.clientX - th.prevClientX
        nev.dy = e.clientY - th.prevClientY
        th.dragX += nev.dx
        th.dragY += nev.dy
        th.dispatchEvent(nev)
      }
      if (!th.mouseDown) {
        if (th.dragTarget) {
          var nev = document.createEvent('MouseEvents')
          nev.initMouseEvent('dragend', true, true, window, e.detail,
            e.screenX, e.screenY, e.clientX, e.clientY, e.ctrlKey, e.altKey,
            e.shiftKey, e.metaKey, e.button, e.relatedTarget)
          nev.canvasTarget = th.dragTarget
          th.dispatchEvent(nev)
          th.dragX = th.dragY = 0
          th.dragTarget = false
        }
      } else if (!th.dragTarget && th.target) {
        th.dragTarget = th.target
        var nev = document.createEvent('MouseEvents')
        nev.initMouseEvent('dragstart', true, true, window, e.detail,
          e.screenX, e.screenY, e.clientX, e.clientY, e.ctrlKey, e.altKey,
          e.shiftKey, e.metaKey, e.button, e.relatedTarget)
        nev.canvasTarget = th.dragTarget
        th.dragStartX = e.clientX
        th.dragStartY = e.clientY
        th.dragX = th.dragY = 0
        th.dispatchEvent(nev)
      }
      th.prevClientX = e.clientX
      th.prevClientY = e.clientY
    }, true)

    this.canvas.parentNode.addEventListener('mouseout', function(e) {
      if (!CanvasNode.contains.call(this, e.relatedTarget))
        th.absoluteMouseX = th.absoluteMouseY = th.mouseX = th.mouseY = null
    }, true)

    var dispatch = this.dispatchEvent.bind(this)
    var types = [
      'mousemove', 'mouseover', 'mouseout',
      'click', 'dblclick',
      'mousedown', 'mouseup',
      'keypress', 'keydown', 'keyup',
      'DOMMouseScroll', 'mousewheel', 'mousemultiwheel', 'textInput',
      'focus', 'blur'
    ]
    for (var i=0; i<types.length; i++) {
      this.canvas.parentNode.addEventListener(types[i], dispatch, false)
    }
    this.keys = {}

    this.windowEventListeners = {

      keydown : function(ev) {
        if (th.keyTarget) {
          th.updateKeys(ev)
          ev.canvasTarget = th.keyTarget
          th.dispatchEvent(ev)
        }
      },

      keyup : function(ev) {
        if (th.keyTarget) {
          th.updateKeys(ev)
          ev.canvasTarget = th.keyTarget
          th.dispatchEvent(ev)
        }
      },

      // do we even want to have this?
      keypress : function(ev) {
        if (th.keyTarget) {
          ev.canvasTarget = th.keyTarget
          th.dispatchEvent(ev)
        }
      },

      blur : function(ev) {
        th.absoluteMouseX = th.absoluteMouseY = null
        if (th.playOnlyWhenFocused && th.isPlaying) {
          th.stop()
          th.__blurStop = true
        }
      },

      focus : function(ev) {
        if (th.__blurStop && !th.isPlaying) th.play()
      },

      mouseup : function(e) {
        th.mouseDown = false
        if (th.dragTarget) {
          // TODO
          // find the object that receives the drag (i.e. drop target)
          var nev = document.createEvent('MouseEvents')
          nev.initMouseEvent('dragend', true, true, window, e.detail,
            e.screenX, e.screenY, e.clientX, e.clientY, e.ctrlKey, e.altKey,
            e.shiftKey, e.metaKey, e.button, e.relatedTarget)
          nev.canvasTarget = th.dragTarget
          th.dispatchEvent(nev)
          th.dragTarget = false
        }
        if (!th.canvas.parentNode.contains(e.target)) {
          var rv = th.dispatchEvent(e)
          if (th.keyTarget) {
            th.dispatchEvent({type: 'blur', canvasTarget: th.keyTarget})
            th.keyTarget = null
          }
          return rv
        }
      },

      mousemove : function(ev) {
        if (th.__blurStop && !th.isPlaying) th.play()
        if (!th.canvas.parentNode.contains(ev.target) && th.mouseDown)
          return th.dispatchEvent(ev)
      }

    }

    this.canvas.parentNode.addEventListener('DOMNodeRemoved', function(ev) {
      if (ev.target == this)
        th.removeWindowEventListeners()
    }, false)
    this.canvas.parentNode.addEventListener('DOMNodeInserted', function(ev) {
      if (ev.target == this)
        th.addWindowEventListeners()
    }, false)
    if (this.canvas.parentNode.parentNode) this.addWindowEventListeners()
  },

  updateKeys : function(ev) {
    this.keys.shift = ev.shiftKey
    this.keys.ctrl = ev.ctrlKey
    this.keys.alt = ev.altKey
    this.keys.meta = ev.metaKey
    var state = (ev.type == 'keydown')
    switch (ev.keyCode) {
      case 37: this.keys.left = state; break
      case 38: this.keys.up = state; break
      case 39: this.keys.right = state; break
      case 40: this.keys.down = state; break
      case 32: this.keys.space = state; break
      case 13: this.keys.enter = state; break
      case 9: this.keys.tab = state; break
      case 8: this.keys.backspace = state; break
      case 16: this.keys.shift = state; break
      case 17: this.keys.ctrl = state; break
      case 18: this.keys.alt = state; break
    }
    this.keys[ev.keyCode] = state
  },

  addWindowEventListeners : function() {
    for (var i in this.windowEventListeners)
      window.addEventListener(i, this.windowEventListeners[i], false)
  },

  removeWindowEventListeners : function() {
    for (var i in this.windowEventListeners)
      window.removeEventListener(i, this.windowEventListeners[i], false)
  },

  addMouseEvent : function(x,y,mouseDown) {
    var a = this.allocMouseEvent()
    a[0] = x
    a[1] = y
    a[2] = mouseDown
    this.mouseEvents.push(a)
  },

  allocMouseEvent : function() {
    if (this.mouseEventStack.length > 0) {
      return this.mouseEventStack.pop()
    } else {
      return [null, null, null]
    }
  },

  freeMouseEvent : function(ev) {
    this.mouseEventStack.push(ev)
    if (this.mouseEventStack.length > 100)
      this.mouseEventStack.splice(0,this.mouseEventStack.length)
  },

  clearMouseEvents : function() {
    while (this.mouseEvents.length > 0)
      this.freeMouseEvent(this.mouseEvents.pop())
  },

  createFrameLoop : function() {
    var self = this;
    var fl = {
      running : true,
      stop : function() {
        this.running = false;
      },
      run : function() {
        if (fl.running) {
          self.onFrame();
          requestAnimFrame(fl.run, self.canvas);
        }
      }
    };
    requestAnimFrame(fl.run, this.canvas);
    return fl;
  },

  /**
    Start frame loop.

    The frame loop is an interval, where #onFrame is called every
    #frameDuration milliseconds.
    */
  play : function() {
    this.stop();
    this.realTime = new Date().getTime();
    this.frameLoop = this.createFrameLoop();
    this.isPlaying = true;
  },

  /**
    Stop frame loop.
    */
  stop : function() {
    this.__blurStop = false;
    if (this.frameLoop) {
      this.frameLoop.stop();
      this.frameLoop = null;
    }
    this.isPlaying = false;
  },

  dispatchEvent : function(ev) {
    var rv = CanvasNode.prototype.dispatchEvent.call(this, ev)
    if (ev.cursor) {
      if (this.canvas.style.cursor != ev.cursor)
        this.canvas.style.cursor = ev.cursor
    } else {
      if (this.canvas.style.cursor != this.cursor)
        this.canvas.style.cursor = this.cursor
    }
    return rv
  },

  /**
    The frame loop function. Called every #frameDuration milliseconds.
    Takes an optional external time parameter (for syncing Canvases with each
    other, e.g. when using a Canvas as an image.)

    If the time parameter is given, the second parameter is used as the frame
    time delta (i.e. the time elapsed since last frame.)

    If time or timeDelta is not given, the canvas computes its own timeDelta.

    @param time The external time. Optional.
    @param timeDelta Time since last frame in milliseconds. Optional.
    */
  onFrame : function(time, timeDelta) {
    this.elementNodeZIndexCounter = 0
    var ctx = this.getContext()
    try {
      var realTime = new Date().getTime()
      this.currentRealElapsed = (realTime - this.realTime)
      this.currentRealFps = 1000 / this.currentRealElapsed
      var dt = this.frameDuration * this.speed
      if (!this.fixedTimestep)
        dt = this.currentRealElapsed * this.speed
      this.realTime = realTime
      if (time != null) {
        this.time = time
        if (timeDelta)
          dt = timeDelta
      } else {
        this.time += dt
      }
      this.previousTarget = this.target
      this.target = null
      if (this.catchMouse)
        this.handlePick(ctx)
      if (this.previousTarget != this.target) {
        if (this.previousTarget) {
          var nev = document.createEvent('MouseEvents')
          nev.initMouseEvent('mouseout', true, true, window,
            0, 0, 0, 0, 0, false, false, false, false, 0, null)
          nev.canvasTarget = this.previousTarget
          this.dispatchEvent(nev)
        }
        if (this.target) {
          var nev = document.createEvent('MouseEvents')
          nev.initMouseEvent('mouseover', true, true, window,
            0, 0, 0, 0, 0, false, false, false, false, 0, null)
          nev.canvasTarget = this.target
          this.dispatchEvent(nev)
        }
      }
      this.handleUpdate(this.time, dt)
      this.clearMouseEvents()
      if (!this.redrawOnlyWhenChanged || this.changed) {
        try {
          this.handleDraw(ctx)
        } catch(e) {
          console.log(e)
          throw(e)
        }
        this.changed = false
      }
      this.currentElapsed = (new Date().getTime() - this.realTime)
      this.elapsed += this.currentElapsed
      this.currentFps = 1000 / this.currentElapsed
      this.frame++
      if (this.frame % this.fpsFrames == 0) {
        this.fps = this.fpsFrames*1000 / (this.elapsed)
        this.realFps = this.fpsFrames*1000 / (new Date().getTime() - this.startTime)
        this.elapsed = 0
        this.startTime = new Date().getTime()
      }
    } catch(e) {
      if (ctx) {
        // screwed up, context is borked
        try {
          // FIXME don't be stupid
          for (var i=0; i<1000; i++)
            ctx.restore()
        } catch(er) {}
      }
      delete this.context
      throw(e)
    }
  },

  /**
    Returns the canvas drawing context object.

    @return Canvas drawing context
    */
  getContext : function() {
    if (this.recording)
      return this.getRecordingContext()
    else if (this.useMockContext)
      return this.getMockContext()
    else
      return this.get2DContext()
  },

  /**
    Gets and returns an augmented canvas 2D drawing context.

    The canvas 2D context is augmented by setter functions for all
    its instance variables, making it easier to record canvas operations in
    a cross-browser fashion.
    */
  get2DContext : function() {
    if (!this.context) {
      var ctx = CanvasSupport.getContext(this.canvas, '2d')
      this.context = ctx
    }
    return this.context
  },

  /**
    Creates and returns a mock drawing context.

    @return Mock drawing context
    */
  getMockContext : function() {
    if (!this.fakeContext) {
      var ctx = this.get2DContext()
      this.fakeContext = {}
      var f = function(){ return this }
      for (var i in ctx) {
        if (typeof(ctx[i]) == 'function')
          this.fakeContext[i] = f
        else
          this.fakeContext[i] = ctx[i]
      }
      this.fakeContext.isMockObject = true
      this.fakeContext.addColorStop = f
    }
    return this.fakeContext
  },

  getRecordingContext : function() {
    if (!this.recordingContext)
      this.recordingContext = new RecordingContext()
    return this.recordingContext
  },

  /**
    Canvas drawPickingPath uses the canvas rectangle as its path.

    @param ctx Canvas drawing context
    */
  drawPickingPath : function(ctx) {
    ctx.rect(0,0, this.canvas.width, this.canvas.height)
  },

  isPointInPath : function(x,y) {
    return ((x >= 0) && (x <= this.canvas.width) && (y >= 0) && (y <= this.canvas.height))
  },

  /**
    Sets globalAlpha to this.opacity and clears the canvas if #clear is set to
    true. If #fill is also set to true, fills the canvas rectangle instead of
    clearing (using #fillStyle as the color.)

    @param ctx Canvas drawing context
    */
  draw : function(ctx) {
    ctx.setGlobalAlpha( this.opacity )
    if (this.clear) {
      if (ctx.fillOn) {
        ctx.beginPath()
        ctx.rect(0,0, this.canvas.width, this.canvas.height)
        ctx.fill()
      } else {
        ctx.clearRect(0,0, this.canvas.width, this.canvas.height)
      }
    }
    // set default fill and stroke for the canvas contents
    ctx.fillStyle = 'black'
    ctx.strokeStyle = 'black'
    ctx.fillOn = false
    ctx.strokeOn = false
  }
})


/**
  Hacky link class for emulating <a>.

  The correct way would be to have a real <a> under the cursor while hovering
  this, or an imagemap polygon built from the clipped subtree path.

  @param href Link href.
  @param target Link target, defaults to _self.
  @param config Optional config hash.
  */
LinkNode = Klass(CanvasNode, {
  href : null,
  target : '_self',
  cursor : 'pointer',

  initialize : function(href, target, config) {
    this.href = href
    if (target)
      this.target = target
    CanvasNode.initialize.call(this, config)
    this.setupLinkEventListeners()
  },

  setupLinkEventListeners : function() {
    this.addEventListener('click', function(ev) {
      if (ev.button == Mouse.RIGHT) return
      var target = this.target
      if ((ev.ctrlKey || ev.button == Mouse.MIDDLE) && target == '_self')
        target = '_blank'
      window.open(this.href, target)
    }, false)
  }
})


/**
  AudioNode is a CanvasNode used to play a sound.

  */
AudioNode = Klass(CanvasNode, {
  ready : false,
  autoPlay : false,
  playing : false,
  paused : false,
  pan : 0,
  volume : 1,
  loop : false,

  transformSound : false,

  initialize : function(filename, params) {
    CanvasNode.initialize.call(this, params)
    this.filename = filename
    this.when('load', this._autoPlaySound)
    this.loadSound()
  },

  loadSound : function() {
    this.sound = CanvasSupport.getSoundObject()
    if (!this.sound) return
    var self = this
    this.sound.onready = function() {
      self.ready = true
      self.root.dispatchEvent({type: 'ready', canvasTarget: self})
    }
    this.sound.onload = function() {
      self.loaded = true
      self.root.dispatchEvent({type: 'load', canvasTarget: self})
    }
    this.sound.onerror = function() {
      self.root.dispatchEvent({type: 'error', canvasTarget: self})
    }
    this.sound.onfinish = function() {
      if (self.loop) self.play()
      else self.stop()
    }
    this.sound.load(this.filename)
  },

  play : function() {
    this.playing = true
    this.needPlayUpdate = true
  },

  stop : function() {
    this.playing = false
    this.needPlayUpdate = true
  },

  pause : function() {
    if (this.needPauseUpdate) {
      this.needPauseUpdate = false
      return
    }
    this.paused = !this.paused
    this.needPauseUpdate = true
  },

  setVolume : function(v) {
    this.volume = v
    this.needStatusUpdate = true
  },

  setPan : function(p) {
    this.pan = p
    this.needStatusUpdate = true
  },

  handleUpdate : function() {
    CanvasNode.handleUpdate.apply(this, arguments)
    if (this.willBeDrawn) {
      this.transform(null, true)
      if (!this.sound) this.loadSound()
      if (this.ready) {
        if (this.transformSound) {
          var x = this.currentMatrix[4]
          var y = this.currentMatrix[5]
          var a = this.currentMatrix[2]
          var b = this.currentMatrix[3]
          var c = this.currentMatrix[0]
          var d = this.currentMatrix[1]
          var hw = this.root.width * 0.5
          var ys = Math.sqrt(a*a + b*b)
          var xs = Math.sqrt(c*c + d*d)
          this.setVolume(ys)
          this.setPan((x - hw) / hw)
        }
        if (this.needPauseUpdate) {
          this.needPauseUpdate = false
          this._pauseSound()
        }
        if (this.needPlayUpdate) {
          this.needPlayUpdate = false
          if (this.playing) this._playSound()
          else this._stopSound()
        }
        if (this.needStatusUpdate) {
          this._setSoundVolume()
          this._setSoundPan()
        }
      }
    }
  },

  _autoPlaySound : function() {
    if (this.autoPlay) this.play()
  },

  _setSoundVolume : function() {
    this.sound.setVolume(this.volume)
  },

  _setSoundPan : function() {
    this.sound.setPan(this.pan)
  },

  _playSound : function() {
    if (this.sound.play() == false)
      return this.playing = false
    this.root.dispatchEvent({type: 'play', canvasTarget: this})
  },

  _stopSound : function() {
    this.sound.stop()
    this.root.dispatchEvent({type: 'stop', canvasTarget: this})
  },

  _pauseSound : function() {
    this.sound.pause()
    this.root.dispatchEvent({type: this.paused ? 'pause' : 'play', canvasTarget: this})
  }
})