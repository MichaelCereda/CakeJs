/*
Copyright (c) 2007 Ilmari Heikkinen

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

*/

CanvasMage = {
  /**
    Playback commands on the given context.
    */
  draw : function(ctx, commands) {
    if (!ctx.setFillStyle)
      this.augment(ctx)
    var dictionary = {}
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
  },
  conditionalExtend : function(dst, src) {
    for (i in src) if (dst[i] == undefined) dst[i] = src[i]
    return dst
  },
  forceExtend : function(dst, src) {
    for (i in src) try{ dst[i] = src[i] } catch(e) {}
    return dst
  },
  ContextSetterAugment : {
    setFillStyle : function(fs) { this.fillStyle = fs },
    setStrokeStyle : function(ss) { this.strokeStyle = ss },
    setGlobalAlpha : function(ga) { this.globalAlpha = ga },
    setLineWidth : function(lw) { this.lineWidth = lw },
    setLineCap : function(lw) { this.lineCap = lw },
    setLineJoin : function(lw) { this.lineJoin = lw },
    setMiterLimit : function(lw) { this.miterLimit = lw },
    setGlobalCompositeOperation : function(lw) {
      this.globalCompositeOperation = lw
    },
    setShadowColor : function(x) { this.shadowColor = x },
    setShadowBlur : function(x) { this.shadowBlur = x },
    setShadowOffsetX : function(x) { this.shadowOffsetX = x },
    setShadowOffsetY : function(x) { this.shadowOffsetY = x },
    setMozTextStyle : function(x) { this.mozTextStyle = x }
  },
  augment : function(ctx) {
    this.conditionalExtend(ctx, this.ContextSetterAugment)
    return ctx
  }
}
var makeReadystateHandler = function (req, elem, id) {
  return function() {
    if (req.readyState == 4 && (req.status == 200 || req.status == 0)) {
      var imageData = eval(req.responseText)
      var c = document.createElement('canvas')
      var w = parseInt(elem.getAttribute('width'))
      var h = parseInt(elem.getAttribute('height'))
      c.width = w || imageData.width
      c.height = h || imageData.height
      c.id = 'canvasmage-'+id
      var ctx = c.getContext('2d')
      ctx.save()
      ctx.scale(c.width/imageData.width, c.height/imageData.height)
      CanvasMage.draw(ctx, imageData.commands)
      ctx.restore()
      var data
      if (c.toDataURL && (data = c.toDataURL())) {
        elem.src = data
        elem.width = c.width
        elem.height = c.height
      } else {
        CanvasMage.forceExtend(c.style, elem.style)
        if (elem.id) c.id = elem.id
        c.className = elem.className
        elem.parentNode.insertBefore(c, elem)
        elem.parentNode.removeChild(elem)
      }
    }
  }
}
var images = document.getElementsByTagName('img')
for (var i=0; i<images.length; i++) {
  var img = images[i]
  var src = img.getAttribute('canvas-src')
  if (src) {
    var xhr = window.XMLHttpRequest ? new XMLHttpRequest : new ActiveXObject("MSXML2.XMLHTTP.3.0")
    xhr.onreadystatechange = makeReadystateHandler(xhr, img, i)
    xhr.open("GET", src, true)
    xhr.send(null)
  }
}
