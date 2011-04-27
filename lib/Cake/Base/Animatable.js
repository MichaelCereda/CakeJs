CakeJS.Animatable = CakeJS.Klass({
  tweenFunctions : {
    linear : function(v) { return v },

    set : function(v) { return Math.floor(v) },
    discrete : function(v) { return Math.floor(v) },

    sine : function(v) { return 0.5-0.5*Math.cos(v*Math.PI) },

    sproing : function(v) {
      return (0.5-0.5*Math.cos(v*3.59261946538606)) * 1.05263157894737
      // pi + pi-acos(0.9)
    },

    square : function(v) {
      return v*v
    },

    cube : function(v) {
      return v*v*v
    },

    sqrt : function(v) {
      return Math.sqrt(v)
    },

    curt : function(v) {
      return Math.pow(v, -0.333333333333)
    }
  },

  initialize : function() {
    this.lastAction = 0
    this.timeline = []
    this.keyframes = []
    this.pendingKeyframes = []
    this.pendingTimelineEvents = []
    this.timelines = []
    this.animators = []
    this.addFrameListener(this.updateTimelines)
    this.addFrameListener(this.updateKeyframes)
    this.addFrameListener(this.updateTimeline)
    this.addFrameListener(this.updateAnimators)
  },

  updateTimelines : function(t, dt) {
    for (var i=0; i<this.timelines.length; i++)
      this.timelines[i].evaluate(this, t, dt)
  },

  addTimeline : function(tl) {
    this.timelines.push(tl)
  },

  removeTimeline : function(tl) {
    this.timelines.deleteFirst(tl)
  },

  /**
    Tweens between keyframes (a keyframe is an object with the new values of
    the members of this, e.g. { time: 0, target: { x: 10, y: 20 }, tween: 'square'})

    Keyframes are very much like multi-variable animators, the main difference
    is that with keyframes the start value and the duration are implicit.

    While an animation from value A to B would take two keyframes instead of
    a single animator, chaining and reordering keyframes is very easy.
    */
  updateKeyframes : function(t,dt) {
    this.addPendingKeyframes(t)
    if (this.keyframes.length > 0) {
      // find current keyframe
      var currentIndex, previousFrame, currentFrame
      for (var i=0; i<this.keyframes.length; i++) {
        if (this.keyframes[i].time > t) {
          currentIndex = i
          break
        }
      }
      if (currentIndex != null) {
        previousFrame = this.keyframes[currentIndex-1]
        currentFrame = this.keyframes[currentIndex]
      }
      if (!currentFrame) {
        if (!this.keyframes.atEnd) {
          this.keyframes.atEnd = true
          previousFrame = this.keyframes[this.keyframes.length - 1]
          Object.extend(this, Object.clone(previousFrame.target))
          this.changed = true
        }
      } else if (previousFrame) {
        this.keyframes.atEnd = false
        // animate towards current keyframe
        var elapsed = t - previousFrame.time
        var duration = currentFrame.time - previousFrame.time
        var pos = elapsed / duration
        for (var k in currentFrame.target) {
          if (previousFrame.target[k] != null) {
            this.tweenVariable(k,
              previousFrame.target[k], currentFrame.target[k],
              pos, currentFrame.tween)
          }
        }
      }
    }
  },

  addPendingKeyframes : function(t) {
    if (this.pendingKeyframes.length > 0) {
      while (this.pendingKeyframes.length > 0) {
        var kf = this.pendingKeyframes.shift()
        if (kf.time == null)
          kf.time = kf.relativeTime + t
        this.keyframes.push(kf)
      }
      this.keyframes.stableSort(function(a,b) { return a.time - b.time })
    }
  },

  /**
    Run and remove timelineEvents that have startTime <= t.
    TimelineEvents are run in the ascending order of their startTimes.
    */
  updateTimeline : function(t, dt) {
    this.addPendingTimelineEvents(t)
    while (this.timeline[0] && this.timeline[0].startTime <= t) {
      var keyframe = this.timeline.shift()
      var rv = true
      if (typeof(keyframe.action) == 'function')
        rv = keyframe.action.call(this, t, dt, keyframe)
      else
        this.animators.push(keyframe.action)
      if (keyframe.repeatEvery != null && rv != false) {
        if (keyframe.repeatTimes != null) {
          if (keyframe.repeatTimes <= 0) continue
          keyframe.repeatTimes--
        }
        keyframe.startTime += keyframe.repeatEvery
        this.addTimelineEvent(keyframe)
      }
      this.changed = true
    }
  },

  addPendingTimelineEvents : function(t) {
    if (this.pendingTimelineEvents.length > 0) {
      while (this.pendingTimelineEvents.length > 0) {
        var kf = this.pendingTimelineEvents.shift()
        if (!kf.startTime)
          kf.startTime = kf.relativeStartTime + t
        this.timeline.push(kf)
      }
      this.timeline.stableSort(function(a,b) { return a.startTime - b.startTime })
    }
  },

  addTimelineEvent : function(kf) {
    this.pendingTimelineEvents.push(kf)
  },

  /**
    Run each animator, delete ones that have their durations exceeded.
    */
  updateAnimators : function(t, dt) {
    for (var i=0; i<this.animators.length; i++) {
      var ani = this.animators[i]
      if (!ani.startTime) ani.startTime = t
      var elapsed = t - ani.startTime
      var pos = elapsed / ani.duration
      var shouldRemove = false
      if (pos >= 1) {
        if (!ani.repeat) {
          pos = 1
          shouldRemove = true
        } else {
          if (ani.repeat !== true) ani.repeat = Math.max(0, ani.repeat - 1)
          if (ani.accumulate) {
            ani.startValue = Object.clone(ani.endValue)
            ani.endValue = Object.sum(ani.difference, ani.endValue)
          }
          if (ani.repeat == 0) {
            shouldRemove = true
            pos = 1
          } else {
            ani.startTime = t
            pos = pos % 1
          }
        }
      } else if (ani.repeat && ani.repeat !== true && ani.repeat <= pos) {
        shouldRemove = true
        pos = ani.repeat
      }
      this.tweenVariable(ani.variable, ani.startValue, ani.endValue, pos, ani.tween)
      if (shouldRemove) {
        this.animators.splice(i, 1)
        i--
      }
    }
  },

  tweenVariable : function(variable, start, end, pos, tweenFunction) {
    if (typeof(tweenFunction) != 'function') {
      tweenFunction = this.tweenFunctions[tweenFunction] || this.tweenFunctions.linear
    }
    var tweened = tweenFunction(pos)
    if (typeof(variable) != 'function') {
      if (start instanceof Array) {
        for (var j=0; j<start.length; j++) {
          this[variable][j] = start[j] + tweened*(end[j]-start[j])
        }
      } else {
        this[variable] = start + tweened*(end-start)
      }
    } else {
      variable.call(this, tweened, start, end)
    }
    this.changed = true
  },

  animate : function(variable, start, end, duration, tween, config) {
    var start = Object.clone(start)
    var end = Object.clone(end)
    if (!config) config = {}
    if (config.additive) {
      var diff = Object.sub(end, start)
      start = Object.sum(start, this[variable])
      end = Object.sum(end, this[variable])
    }
    if (typeof(variable) != 'function')
      this[variable] = Object.clone(start)
    var ani = {
      id : CakeJS.Animatable.uid++,
      variable : variable,
      startValue : start,
      endValue : end,
      difference : diff,
      duration : duration,
      tween : tween,
      repeat : config.repeat,
      additive : config.additive,
      accumulate : config.accumulate,
      pingpong : config.pingpong
    }
    this.animators.push(ani)
    return ani
  },

  removeAnimator : function(animator) {
    this.animators.deleteFirst(animator)
  },

  animateTo : function(variableName, end, duration, tween, config) {
    return this.animate(variableName, this[variableName], end, duration, tween, config)
  },

  animateFrom : function(variableName, start, duration, tween, config) {
    return this.animate(variableName, start, this[variableName], duration, tween, config)
  },

  animateFactor : function(variableName, start, endFactor, duration, tween, config) {
    var end
    if (start instanceof Array) {
      end = []
      for (var i=0; i<start.length; i++) {
        end[i] = start[i] * endFactor
      }
    } else {
      end = start * endFactor
    }
    return this.animate(variableName, start, end, duration, tween, config)
  },

  animateToFactor : function(variableName, endFactor, duration, tween, config) {
    var start = this[variableName]
    return this.animateFactor(variableName, start, endFactor, duration, tween, config)
  },

  addKeyframe : function(time, target, tween) {
    var kf = {
      relativeTime: time,
      target: target,
      tween: tween
    }
    this.pendingKeyframes.push(kf)
  },

  addKeyframeAt : function(time, target, tween) {
    var kf = {
      time: time,
      target: target,
      tween: tween
    }
    this.pendingKeyframes.push(kf)
  },

  appendKeyframe : function(timeDelta, target, tween) {
    this.lastAction += timeDelta
    return this.addKeyframe(this.lastAction, target, tween)
  },

  every : function(duration, action, noFirst) {
    var kf = {
      action : action,
      relativeStartTime : noFirst ? duration : 0,
      repeatEvery : duration
    }
    this.addTimelineEvent(kf)
    return kf
  },

  at : function(time, action) {
    var kf = {
      action : action,
      startTime : time
    }
    this.addTimelineEvent(kf)
    return kf
  },

  after : function(duration, action) {
    var kf = {
      action : action,
      relativeStartTime : duration
    }
    this.addTimelineEvent(kf)
    return kf
  },

  afterFrame : function(duration, callback) {
    var elapsed = 0
    var animator
    animator = function(t, dt){
      if (elapsed >= duration) {
        callback.call(this)
        this.removeFrameListener(animator)
      }
      elapsed++
    }
    this.addFrameListener(animator)
    return animator
  },

  everyFrame : function(duration, callback, noFirst) {
    var elapsed = noFirst ? 0 : duration
    var animator
    animator = function(t, dt){
      if (elapsed >= duration) {
        if (callback.call(this) == false)
          this.removeFrameListener(animator)
        elapsed = 0
      }
      elapsed++
    }
    this.addFrameListener(animator)
    return animator
  }
});
CakeJS.Animatable.uid = 0;
