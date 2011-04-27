CakeJS.RecordingContext = CakeJS.Klass({
  objectId : 0,
  commands : [],
  isMockObject : true,

  initialize : function(commands) {
    this.commands = commands || []
    Object.conditionalExtend(this, this.getMockContext())
  },

  getMockContext : function() {
    if (!CakeJS.RecordingContext.MockContext) {
      var c = E.canvas(1,1)
      var ctx = CakeJS.CanvasSupport.getContext(c, '2d')
      var obj = {}
      for (var i in ctx) {
        if (typeof(ctx[i]) == 'function')
          obj[i] = this.createRecordingFunction(i)
        else
          obj[i] = ctx[i]
      }
      obj.isPointInPath = null
      obj.transform = null
      obj.setTransform = null
      CakeJS.RecordingContext.MockContext = obj
    }
    return CakeJS.RecordingContext.MockContext
  },

  createRecordingFunction : function(name){
    if (name.search(/^set[A-Z]/) != -1 && name != 'setTransform') {
      var varName = name.charAt(3).toLowerCase() + name.slice(4)
      return function(){
        this[varName] = arguments[0]
        this.commands.push([name, $A(arguments)])
      }
    } else {
      return function(){
        this.commands.push([name, $A(arguments)])
      }
    }
  },

  clear : function(){
    this.commands = []
  },

  getRecording : function() {
    return this.commands
  },

  serialize : function(width, height) {
    return '(' + {
      width: width, height: height,
      commands: this.getRecording()
    }.toSource() + ')'
  },

  play : function(ctx) {
    CakeJS.RecordingContext.play(ctx, this.getRecording())
  },

  createLinearGradient : function() {
    var id = this.objectId++
    this.commands.push([id, '=', 'createLinearGradient', $A(arguments)])
    return new MockGradient(this, id)
  },

  createRadialGradient : function() {
    var id = this.objectId++
    this.commands.push([id, '=', 'createRadialGradient', $A(arguments)])
    return new this.MockGradient(this, id)
  },

  createPattern : function() {
    var id = this.objectId++
    this.commands.push([id, '=', 'createPattern', $A(arguments)])
    return new this.MockGradient(this, id)
  },

  MockGradient : CakeJS.Klass({
    isMockObject : true,

    initialize : function(recorder, id) {
      this.recorder = recorder
      this.id = id
    },

    addColorStop : function() {
      this.recorder.commands.push([this.id, 'addColorStop', $A(arguments)])
    },

    toSource : function() {
      return {id : this.id, isMockObject : true}.toSource()
    }
  })
})
CakeJS.RecordingContext.play = function(ctx, commands) {
  var dictionary = []
  for (var i=0; i<commands.length; i++) {
    var cmd = commands[i]
    if (cmd.length == 2) {
      var args = cmd[1]
      if (args[0] && args[0].isMockObject) {
        ctx[cmd[0]](dictionary[args[0].id])
      } else {
        ctx[cmd[0]].apply(ctx, cmd[1])
      }
    } else if (cmd.length == 3) {
      var obj = dictionary[cmd[0]]
      obj[cmd[1]].apply(obj, cmd[2])
    } else if (cmd.length == 4) {
      dictionary[cmd[0]] = ctx[cmd[2]].apply(ctx, cmd[3])
    } else {
      throw "Malformed command: "+cmd.toString()
    }
  }
}
