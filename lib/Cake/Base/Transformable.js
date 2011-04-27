CakeJS.Transformable = CakeJS.Klass({
  needMatrixUpdate : true,

  /**
    Transforms the context state according to this node's attributes.

    @param ctx CakeJS.Canvas 2D context
    */
  transform : function(ctx) {
    var atm = this.absoluteMatrix
    var xy = this.x || this.y
    var rot = this.rotation
    var sca = this.scale != null
    var skX = this.skewX
    var skY = this.skewY
    var tm = this.matrix
    var tl = this.transformList

    // update the node's transformation matrix
    if (this.needMatrixUpdate || !this.currentMatrix) {
      if (!this.currentMatrix) this.currentMatrix = [1,0,0,1,0,0]
      if (this.parent)
        this.__copyMatrix(this.parent.currentMatrix)
      else
        this.__identityMatrix()
      if (atm) this.__setMatrixMatrix(this.absoluteMatrix)
      if (xy) this.__translateMatrix(this.x, this.y)
      if (rot) this.__rotateMatrix(this.rotation)
      if (skX) this.__skewXMatrix(this.skewX)
      if (skY) this.__skewYMatrix(this.skewY)
      if (sca) this.__scaleMatrix(this.scale)
      if (tm) this.__matrixMatrix(this.matrix)
      if (tl) {
        for (var i=0; i<this.transformList.length; i++) {
          var tl = this.transformList[i]
          this['__'+tl[0]+'Matrix'](tl[1])
        }
      }
      this.needMatrixUpdate = false
    }

    if (!ctx) return

    // transform matrix modifiers
    this.__setMatrix(ctx, this.currentMatrix)
  },

  distanceTo : function(node) {
    return CakeJS.Curves.lineLength([this.x, this.y], [node.x, node.y])
  },

  angleTo : function(node) {
    return CakeJS.Curves.lineAngle([this.x, this.y], [node.x, node.y])
  },



  __setMatrixMatrix : function(matrix) {
    if (!this.previousMatrix) this.previousMatrix = []
    var p = this.previousMatrix
    var c = this.currentMatrix
    p[0] = c[0]
    p[1] = c[1]
    p[2] = c[2]
    p[3] = c[3]
    p[4] = c[4]
    p[5] = c[5]
    p = this.currentMatrix
    c = matrix
    p[0] = c[0]
    p[1] = c[1]
    p[2] = c[2]
    p[3] = c[3]
    p[4] = c[4]
    p[5] = c[5]
  },

  __copyMatrix : function(matrix) {
    var p = this.currentMatrix
    var c = matrix
    p[0] = c[0]
    p[1] = c[1]
    p[2] = c[2]
    p[3] = c[3]
    p[4] = c[4]
    p[5] = c[5]
  },

  __identityMatrix : function() {
    var p = this.currentMatrix
    p[0] = 1
    p[1] = 0
    p[2] = 0
    p[3] = 1
    p[4] = 0
    p[5] = 0
  },

  __translateMatrix : function(x, y) {
    if (x.length) {
      CakeJS.CanvasSupport.tTranslate( this.currentMatrix, x[0], x[1] )
    } else {
      CakeJS.CanvasSupport.tTranslate( this.currentMatrix, x, y )
    }
  },

  __rotateMatrix : function(rotation) {
    if (rotation.length) {
      if (rotation[0] % Math.PI*2 == 0) return
      if (rotation[1] || rotation[2]) {
        CakeJS.CanvasSupport.tTranslate( this.currentMatrix,
                                  rotation[1], rotation[2] )
        CakeJS.CanvasSupport.tRotate( this.currentMatrix, rotation[0] )
        CakeJS.CanvasSupport.tTranslate( this.currentMatrix,
                                  -rotation[1], -rotation[2] )
      } else {
        CakeJS.CanvasSupport.tRotate( this.currentMatrix, rotation[0] )
      }
    } else {
      if (rotation % Math.PI*2 == 0) return
      CakeJS.CanvasSupport.tRotate( this.currentMatrix, rotation )
    }
  },

  __skewXMatrix : function(skewX) {
    if (skewX.length && skewX[0])
      CakeJS.CanvasSupport.tSkewX(this.currentMatrix, skewX[0])
    else
      CakeJS.CanvasSupport.tSkewX(this.currentMatrix, skewX)
  },

  __skewYMatrix : function(skewY) {
    if (skewY.length && skewY[0])
      CakeJS.CanvasSupport.tSkewY(this.currentMatrix, skewY[0])
    else
      CakeJS.CanvasSupport.tSkewY(this.currentMatrix, skewY)
  },

  __scaleMatrix : function(scale) {
    if (scale.length == 2) {
      if (scale[0] == 1 && scale[1] == 1) return
      CakeJS.CanvasSupport.tScale(this.currentMatrix,
                           scale[0], scale[1])
    } else if (scale.length == 3) {
      if (scale[0] == 1 || (scale[0].length && (scale[0][0] == 1 && scale[0][1] == 1)))
        return
      CakeJS.CanvasSupport.tTranslate(this.currentMatrix,
                               scale[1], scale[2])
      if (scale[0].length) {
        CakeJS.CanvasSupport.tScale(this.currentMatrix,
                              scale[0][0], scale[0][1])
      } else {
        CakeJS.CanvasSupport.tScale( this.currentMatrix, scale[0], scale[0] )
      }
      CakeJS.CanvasSupport.tTranslate(this.currentMatrix,
                               -scale[1], -scale[2])
    } else if (scale != 1) {
      CakeJS.CanvasSupport.tScale( this.currentMatrix, scale, scale )
    }
  },

  __matrixMatrix : function(matrix) {
    CakeJS.CanvasSupport.tMatrixMultiply(this.currentMatrix, matrix)
  },

  __setMatrix : function(ctx, matrix) {
    CakeJS.CanvasSupport.setTransform(ctx, matrix, this.previousMatrix)
  },

  __translate : function(ctx, x,y) {
    if (x.length != null)
      ctx.translate(x[0], x[1])
    else
      ctx.translate(x, y)
  },

  __rotate : function(ctx, rotation) {
    if (rotation.length) {
      if (rotation[1] || rotation[2]) {
        if (rotation[0] % Math.PI*2 == 0) return
        ctx.translate( rotation[1], rotation[2] )
        ctx.rotate( rotation[0] )
        ctx.translate( -rotation[1], -rotation[2] )
      } else {
        ctx.rotate( rotation[0] )
      }
    } else {
      ctx.rotate( rotation )
    }
  },

  __skewX : function(ctx, skewX) {
    if (skewX.length && skewX[0])
      CakeJS.CanvasSupport.skewX(ctx, skewX[0])
    else
      CakeJS.CanvasSupport.skewX(ctx, skewX)
  },

  __skewY : function(ctx, skewY) {
    if (skewY.length && skewY[0])
      CakeJS.CanvasSupport.skewY(ctx, skewY[0])
    else
      CakeJS.CanvasSupport.skewY(ctx, skewY)
  },

  __scale : function(ctx, scale) {
    if (scale.length == 2) {
      ctx.scale(scale[0], scale[1])
    } else if (scale.length == 3) {
      ctx.translate( scale[1], scale[2] )
      if (scale[0].length) {
        ctx.scale(scale[0][0], scale[0][1])
      } else {
        ctx.scale(scale[0], scale[0])
      }
      ctx.translate( -scale[1], -scale[2] )
    } else {
      ctx.scale(scale, scale)
    }
  },

  __matrix : function(ctx, matrix) {
    CakeJS.CanvasSupport.transform(ctx, matrix)
  }
})
