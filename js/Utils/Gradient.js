/**
  Gradient is a linear or radial color gradient that can be used as a
  strokeStyle or fillStyle.

  Attributes:

    type - Type of the gradient. 'linear' or 'radial'
    startX, startY - Coordinates for the starting point of the gradient.
                     Center of the starting circle of a radial gradient.
                     Default is 0, 0.
    endX, endY - Coordinates for the ending point of the gradient.
                 Center of the ending circle of a radial gradient.
                 Default is 0, 0.
    startRadius - The radius of the starting circle of a radial gradient.
                  Default is 0.
    endRadius - The radius of the ending circle of a radial gradient.
                Default is 100.
    colorStops - The color stops for the gradient. The format for the color
                 stops is: [[position_1, color_1], [position_2, color_2], ...].
                 The possible color formats are: 'red', '#000', '#000000',
                 'rgba(0,0,0, 0.2)', [0,0,0] and [0,0,0, 0.2].
                 Default color stops are [[0, '#000000'], [1, '#FFFFFF']].

  Example:

    var g = new Gradient({
      type : 'radial',
      endRadius : 40,
      colorStops : [
        [0, '#000'],
        [0.2, '#ffffff'],
        [0.5, [255, 0, 0]],
        [0.8, [0, 255, 255, 0.5]],
        [1.0, 'rgba(255, 0, 255, 0.8)']
      ]
    })

  @param config Optional config hash.
  */
Gradient = Klass({
  type : 'linear',
  isPattern : true,
  startX : 0,
  startY : 0,
  endX : 1,
  endY : 0,
  startRadius : 0,
  endRadius : 1,
  colorStops : [],

  initialize : function(config) {
    this.colorStops = [[0, '#000000'], [1, '#FFFFFF']]
    if (config) Object.extend(this, config)
  },

  /**
    Compiles the gradient using the given drawing context.
    Returns a gradient object that can be used as drawing context
    fill/strokeStyle.

    @param ctx Drawing context to compile pattern on.
    @return Gradient object.
    */
  compile : function(ctx) {
    if (this.type == 'linear') {
      var go = ctx.createLinearGradient(
                    this.startX, this.startY,
                    this.endX, this.endY)
    } else {
      var go = ctx.createRadialGradient(
                    this.startX, this.startY, this.startRadius,
                    this.endX, this.endY, this.endRadius)
    }
    for(var i=0; i<this.colorStops.length; i++) {
      var cs = this.colorStops[i]
      if (typeof(cs[1]) == 'string') {
        go.addColorStop(cs[0], cs[1])
      } else {
        var ca = cs[1]
        var a = (ca.length == 3) ? 1 : ca[3]
        var g = 'rgba('+ca.slice(0,3).map(Math.round).join(",")+', '+a+')'
        go.addColorStop(cs[0], g)
      }
    }
    Object.extend(go, Transformable.prototype)
    go.transformList = this.transformList
    go.scale = this.scale
    go.x = this.x
    go.y = this.y
    go.matrix = this.matrix
    go.rotation = this.rotation
    go.units = this.units
    if (!go.isMockObject)
      this.compiled = go
    return go
  }
})