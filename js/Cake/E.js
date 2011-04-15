/**
  Creates and configures a DOM element.

  The tag of the element is given by name.

  If params is a string, it is used as the innerHTML of the created element.
  If params is a DOM element, it is appended to the created element.
  If params is an object, it is treated as a config object and merged
  with the created element.

  If params is a string or DOM element, the third argument is treated
  as the config object.

  Special attributes of the config object:
    * content
      - if content is a string, it is used as the innerHTML of the
        created element
      - if content is an element, it is appended to the created element
    * style
      - the style object is merged with the created element's style

  @param {String} name The tag for the created element
  @param params The content or config for the created element
  @param config The config for the created element if params is content
  @return The created DOM element
  */
E = function(name, params, config) {
  var el = document.createElement(name)
  if (params) {
    if (typeof(params) == 'string') {
      el.innerHTML = params
      params = config
    } else if (params.DOCUMENT_NODE) {
      el.appendChild(params)
      params = config
    }
    if (params) {
      if (params.style) {
        var style = params.style
        params = Object.clone(params)
        delete params.style
        Object.forceExtend(el.style, style)
      }
      if (params.content) {
        if (typeof(params.content) == 'string') {
          el.appendChild(T(params.content))
        } else {
          el.appendChild(params.content)
        }
        params = Object.clone(params)
        delete params.content
      }
      Object.forceExtend(el, params)
    }
  }
  return el
}
E.append = function(node) {
  for(var i=1; i<arguments.length; i++) {
    if (typeof(arguments[i]) == 'string') {
      node.appendChild(T(arguments[i]))
    } else {
      node.appendChild(arguments[i])
    }
  }
}
// Safari requires each canvas to have a unique id.
E.lastCanvasId = 0
/**
  Creates and returns a canvas element with width w and height h.

  @param {int} w The width for the canvas
  @param {int} h The height for the canvas
  @param config Optional config object to pass to E()
  @return The created canvas element
  */
E.canvas = function(w,h,config) {
  var id = 'canvas-uuid-' + E.lastCanvasId
  E.lastCanvasId++
  if (!config) config = {}
  return E('canvas', Object.extend(config, {id: id, width: w, height: h}))
}