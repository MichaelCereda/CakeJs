Curves = {

  angularDistance : function(a, b) {
    var pi2 = Math.PI*2
    var d = (b - a) % pi2
    if (d > Math.PI) d -= pi2
    if (d < -Math.PI) d += pi2
    return d
  },

  linePoint : function(a, b, t) {
    return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]
  },

  quadraticPoint : function(a, b, c, t) {
    // var d = this.linePoint(a,b,t)
    // var e = this.linePoint(b,c,t)
    // return this.linePoint(d,e,t)
    var dx = a[0]+(b[0]-a[0])*t
    var ex = b[0]+(c[0]-b[0])*t
    var x = dx+(ex-dx)*t
    var dy = a[1]+(b[1]-a[1])*t
    var ey = b[1]+(c[1]-b[1])*t
    var y = dy+(ey-dy)*t
    return [x,y]
  },

  cubicPoint : function(a, b, c, d, t) {
    var ax3 = a[0]*3
    var bx3 = b[0]*3
    var cx3 = c[0]*3
    var ay3 = a[1]*3
    var by3 = b[1]*3
    var cy3 = c[1]*3
    return [
      a[0] + t*(bx3 - ax3 + t*(ax3-2*bx3+cx3 + t*(bx3-a[0]-cx3+d[0]))),
      a[1] + t*(by3 - ay3 + t*(ay3-2*by3+cy3 + t*(by3-a[1]-cy3+d[1])))
    ]
  },

  linearValue : function(a,b,t) {
    return a + (b-a)*t
  },

  quadraticValue : function(a,b,c,t) {
    var d = a + (b-a)*t
    var e = b + (c-b)*t
    return d + (e-d)*t
  },

  cubicValue : function(a,b,c,d,t) {
    var a3 = a*3, b3 = b*3, c3 = c*3
    return a + t*(b3 - a3 + t*(a3-2*b3+c3 + t*(b3-a-c3+d)))
  },

  catmullRomPoint : function (a,b,c,d, t) {
    var af = ((-t+2)*t-1)*t*0.5
    var bf = (((3*t-5)*t)*t+2)*0.5
    var cf = ((-3*t+4)*t+1)*t*0.5
    var df = ((t-1)*t*t)*0.5
    return [
      a[0]*af + b[0]*bf + c[0]*cf + d[0]*df,
      a[1]*af + b[1]*bf + c[1]*cf + d[1]*df
    ]
  },

  catmullRomAngle : function (a,b,c,d, t) {
    var dx = 0.5 * (c[0] - a[0] + 2*t*(2*a[0] - 5*b[0] + 4*c[0] - d[0]) +
             3*t*t*(3*b[0] + d[0] - a[0] - 3*c[0]))
    var dy = 0.5 * (c[1] - a[1] + 2*t*(2*a[1] - 5*b[1] + 4*c[1] - d[1]) +
             3*t*t*(3*b[1] + d[1] - a[1] - 3*c[1]))
    return Math.atan2(dy, dx)
  },

  catmullRomPointAngle : function (a,b,c,d, t) {
    var p = this.catmullRomPoint(a,b,c,d,t)
    var a = this.catmullRomAngle(a,b,c,d,t)
    return {point:p, angle:a}
  },

  lineAngle : function(a,b) {
    return Math.atan2(b[1]-a[1], b[0]-a[0])
  },

  quadraticAngle : function(a,b,c,t) {
    var d = this.linePoint(a,b,t)
    var e = this.linePoint(b,c,t)
    return this.lineAngle(d,e)
  },

  cubicAngle : function(a, b, c, d, t) {
    var e = this.quadraticPoint(a,b,c,t)
    var f = this.quadraticPoint(b,c,d,t)
    return this.lineAngle(e,f)
  },

  lineLength : function(a,b) {
    var x = (b[0]-a[0])
    var y = (b[1]-a[1])
    return Math.sqrt(x*x + y*y)
  },

  squareLineLength : function(a,b) {
    var x = (b[0]-a[0])
    var y = (b[1]-a[1])
    return x*x + y*y
  },

  quadraticLength : function(a,b,c, error) {
    var p1 = this.linePoint(a,b,2/3)
    var p2 = this.linePoint(b,c,1/3)
    return this.cubicLength(a,p1,p2,c, error)
  },

  cubicLength : (function() {
    var bezsplit = function(v) {
      var vtemp = [v.slice(0)]

      for (var i=1; i < 4; i++) {
        vtemp[i] = [[],[],[],[]]
        for (var j=0; j < 4-i; j++) {
          vtemp[i][j][0] = 0.5 * (vtemp[i-1][j][0] + vtemp[i-1][j+1][0])
          vtemp[i][j][1] = 0.5 * (vtemp[i-1][j][1] + vtemp[i-1][j+1][1])
        }
      }
      var left = []
      var right = []
      for (var j=0; j<4; j++) {
        left[j] = vtemp[j][0]
        right[j] = vtemp[3-j][j]
      }
      return [left, right]
    }

    var addifclose = function(v, error) {
      var len = 0
      for (var i=0; i < 3; i++) {
        len += Curves.lineLength(v[i], v[i+1])
      }
      var chord = Curves.lineLength(v[0], v[3])
      if ((len - chord) > error) {
        var lr = bezsplit(v)
        len = addifclose(lr[0], error) + addifclose(lr[1], error)
      }
      return len
    }

    return function(a,b,c,d, error) {
      if (!error) error = 1
      return addifclose([a,b,c,d], error)
    }
  })(),

  quadraticLengthPointAngle : function(a,b,c,lt,error) {
    var p1 = this.linePoint(a,b,2/3)
    var p2 = this.linePoint(b,c,1/3)
    return this.cubicLengthPointAngle(a,p1,p2,c, error)
  },

  cubicLengthPointAngle : function(a,b,c,d,lt,error) {
    // this thing outright rapes the GC.
    // how about not creating a billion arrays, hmm?
    var len = this.cubicLength(a,b,c,d,error)
    var point = a
    var prevpoint = a
    var lengths = []
    var prevlensum = 0
    var lensum = 0
    var tl = lt*len
    var segs = 20
    var fac = 1/segs
    for (var i=1; i<=segs; i++) { // FIXME get smarter
      prevpoint = point
      point = this.cubicPoint(a,b,c,d, fac*i)
      prevlensum = lensum
      lensum += this.lineLength(prevpoint, point)
      if (lensum >= tl) {
        if (lensum == prevlensum)
          return {point: point, angle: this.lineAngle(a,b)}
        var dl = lensum - tl
        var dt = dl / (lensum-prevlensum)
        return {point: this.linePoint(prevpoint, point, 1-dt),
                angle: this.cubicAngle(a,b,c,d, fac*(i-dt)) }
      }
    }
    return {point: d.slice(0), angle: this.lineAngle(c,d)}
  }

}