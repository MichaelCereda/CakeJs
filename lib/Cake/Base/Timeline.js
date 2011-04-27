/**
  CakeJS.Timeline is an animator that tweens between its frames.

  When object.time = k.time:
       object.state = k.state
  When object.time > k[i-1].time and object.time < k[i].time:
       object.state = k[i].tween(position, k[i-1].state, k[i].state)
       where position = elapsed / duration,
             elapsed = object.time - k[i-1].time,
             duration = k[i].time - k[i-1].time
  */
CakeJS.Timeline = CakeJS.Klass({
  startTime : null,
  repeat : false,
  lastAction : 0,

  initialize : function(repeat, pingpong) {
    this.repeat = repeat
    this.keyframes = []
  },

  addKeyframe : function(time, target, tween) {
    if (arguments.length == 1) this.keyframes.push(time)
    else  this.keyframes.push({
            time : time,
            target : target,
            tween : tween
          })
  },

  appendKeyframe : function(timeDelta, target, tween) {
    this.lastAction += timeDelta
    return this.addKeyframe(this.lastAction, target, tween)
  },

  evaluate : function(object, ot, dt) {
    if (this.startTime == null) this.startTime = ot
    var t = ot - this.startTime
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
          Object.extend(object, Object.clone(previousFrame.target))
          if (this.repeat) this.startTime = ot
          object.changed = true
        }
      } else if (previousFrame) {
        this.keyframes.atEnd = false
        // animate towards current keyframe
        var elapsed = t - previousFrame.time
        var duration = currentFrame.time - previousFrame.time
        var pos = elapsed / duration
        for (var k in currentFrame.target) {
          if (previousFrame.target[k] != null) {
            object.tweenVariable(k,
              previousFrame.target[k], currentFrame.target[k],
              pos, currentFrame.tween)
          }
        }
      }
    }
  }
})
