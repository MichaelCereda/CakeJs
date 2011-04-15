/**
  Merges the src object's attributes with the dst object, ignoring errors.

  @param dst The destination object
  @param src The source object
  @return The dst object
  @addon
  */
Object.forceExtend = function(dst, src) {
  for (var i in src) {
    try{ dst[i] = src[i] } catch(e) {}
  }
  return dst
}
// In case Object.extend isn't defined already, set it to Object.forceExtend.
if (!Object.extend)
  Object.extend = Object.forceExtend

/**
  Merges the src object's attributes with the dst object, preserving all dst
  object's current attributes.

  @param dst The destination object
  @param src The source object
  @return The dst object
  @addon
  */
Object.conditionalExtend = function(dst, src) {
  for (var i in src) {
    if (dst[i] == null)
      dst[i] = src[i]
  }
  return dst
}

/**
  Creates and returns a shallow copy of the src object.

  @param src The source object
  @return A clone of the src object
  @addon
  */
Object.clone = function(src) {
  if (!src || src == true)
    return src
  switch (typeof(src)) {
    case 'string':
      return Object.extend(src+'', src)
      break
    case 'number':
      return src
      break
    case 'function':
      obj = eval(src.toSource())
      return Object.extend(obj, src)
      break
    case 'object':
      if (src instanceof Array) {
        return Object.extend([], src)
      } else {
        return Object.extend({}, src)
      }
      break
  }
}

/**
  Creates and returns an Image object, with source URL set to src and
  onload handler set to onload.

  @param {String} src The source URL for the image
  @param {Function} onload The onload handler for the image
  @return The created Image object
  @type {Image}
  */
Object.loadImage = function(src, onload) {
  var img = new Image()
  if (onload)
    img.onload = onload
  img.src = src
  return img
}

/**
  Returns true if image is fully loaded and ready for use.

  @param image The image to check
  @return Whether the image is loaded or not
  @type {boolean}
  @addon
  */
Object.isImageLoaded = function(image) {
  if (image.tagName == 'CANVAS') return true
  if (!image.complete) return false
  if (image.naturalWidth == null) return true
  return !!image.naturalWidth
}

/**
  Sums two objects.
  */
Object.sum = function(a,b) {
  if (a instanceof Array) {
    if (b instanceof Array) {
      var ab = []
      for (var i=0; i<a.length; i++) {
        ab[i] = a[i] + b[i]
      }
      return ab
    } else {
      return a.map(function(v){ return v + b })
    }
  } else if (b instanceof Array) {
    return b.map(function(v){ return v + a })
  } else {
    return a + b
  }
}

/**
  Substracts b from a.
  */
Object.sub = function(a,b) {
  if (a instanceof Array) {
    if (b instanceof Array) {
      var ab = []
      for (var i=0; i<a.length; i++) {
        ab[i] = a[i] - b[i]
      }
      return ab
    } else {
      return a.map(function(v){ return v - b })
    }
  } else if (b instanceof Array) {
    return b.map(function(v){ return a - v })
  } else {
    return a - b
  }
}