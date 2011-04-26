/**
  Pattern is a possibly repeating image that can be used as a strokeStyle or
  fillStyle.

    var image = new Image()
    image.src = 'foo.jpg'
    var pattern = new Pattern(image, 'no-repeat')
    var rect = new Rectangle(200, 200, {fill: true, fillStyle: pattern})

  @param image The image object for the pattern. IMG and CANVAS elements, and
               Image objects all work.
  @param repeat The repeat mode of the pattern. One of 'repeat', 'repeat-y',
                'repeat-x' and 'no-repeat'. The default is 'repeat'.
  */
CakeJS.Pattern = CakeJS.Klass({
  isPattern : true,
  repeat: 'repeat',

  initialize : function(image, repeat) {
    this.image = image
    if (repeat)
      this.repeat = repeat
  },

  /**
    Compiles the pattern using the given drawing context.
    Returns a pattern object that can be used as drawing context
    fill/strokeStyle.

    @param ctx Drawing context to compile pattern on.
    @return Pattern object.
    */
  compile : function(ctx) {
    var pat = ctx.createPattern(this.image, this.repeat)
    Object.extend(pat, Transformable.prototype)
    pat.transformList = this.transformList
    pat.scale = this.scale
    pat.x = this.x
    pat.y = this.y
    pat.matrix = this.matrix
    pat.rotation = this.rotation
    pat.units = this.units
    if (!pat.isMockObject)
      this.compiled = pat
    return pat
  }
})
