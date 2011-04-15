/**
  Color helper functions.
  */
Colors = {

  /**
    Converts an HSL color to its corresponding RGB color.

    @param h Hue in degrees (0 .. 359)
    @param s Saturation (0.0 .. 1.0)
    @param l Lightness (0 .. 255)
    @return The corresponding RGB color as [r,g,b]
    @type Array
    */
  hsl2rgb : function(h,s,l) {
    var r,g,b
    if (s == 0) {
      r=g=b=v
    } else {
      var q = (l < 0.5 ? l * (1+s) : l+s-(l*s))
      var p = 2 * l - q
      var hk = (h % 360) / 360
      var tr = hk + 1/3
      var tg = hk
      var tb = hk - 1/3
      if (tr < 0) tr++
      if (tr > 1) tr--
      if (tg < 0) tg++
      if (tg > 1) tg--
      if (tb < 0) tb++
      if (tb > 1) tb--
      if (tr < 1/6)
        r = p + ((q-p)*6*tr)
      else if (tr < 1/2)
        r = q
      else if (tr < 2/3)
        r = p + ((q-p)*6*(2/3 - tr))
      else
        r = p

      if (tg < 1/6)
        g = p + ((q-p)*6*tg)
      else if (tg < 1/2)
        g = q
      else if (tg < 2/3)
        g = p + ((q-p)*6*(2/3 - tg))
      else
        g = p

      if (tb < 1/6)
        b = p + ((q-p)*6*tb)
      else if (tb < 1/2)
        b = q
      else if (tb < 2/3)
        b = p + ((q-p)*6*(2/3 - tb))
      else
        b = p
    }

    return [r,g,b]
  },

  /**
    Converts an HSV color to its corresponding RGB color.

    @param h Hue in degrees (0 .. 359)
    @param s Saturation (0.0 .. 1.0)
    @param v Value (0 .. 255)
    @return The corresponding RGB color as [r,g,b]
    @type Array
    */
  hsv2rgb : function(h,s,v) {
    var r,g,b
    if (s == 0) {
      r=g=b=v
    } else {
      h = (h % 360)/60.0
      var i = Math.floor(h)
      var f = h-i
      var p = v * (1-s)
      var q = v * (1-s*f)
      var t = v * (1-s*(1-f))
      switch (i) {
        case 0:
          r = v
          g = t
          b = p
          break
        case 1:
          r = q
          g = v
          b = p
          break
        case 2:
          r = p
          g = v
          b = t
          break
        case 3:
          r = p
          g = q
          b = v
          break
        case 4:
          r = t
          g = p
          b = v
          break
        case 5:
          r = v
          g = p
          b = q
          break
      }
    }
    return [r,g,b]
  },

  /**
    Parses a color style object into one that can be used with the given
    canvas context.

    Accepted formats:
      'white'
      '#fff'
      '#ffffff'
      'rgba(255,255,255, 1.0)'
      [255, 255, 255]
      [255, 255, 255, 1.0]
      new Gradient(...)
      new Pattern(...)

    @param style The color style to parse
    @param ctx Canvas 2D context on which the style is to be used
    @return A parsed style, ready to be used as ctx.fillStyle / strokeStyle
    */
  parseColorStyle : function(style, ctx) {
    if (typeof style == 'string') {
      return style
    } else if (style.compiled) {
      return style.compiled
    } else if (style.isPattern) {
      return style.compile(ctx)
    } else if (style.length == 3) {
      return 'rgba('+style.map(Math.round).join(",")+', 1)'
    } else if (style.length == 4) {
      return 'rgba('+
              Math.round(style[0])+','+
              Math.round(style[1])+','+
              Math.round(style[2])+','+
              style[3]+
             ')'
    } else { // wtf
      throw( "Bad style: " + style )
    }
  }
}