CakeJS.Mouse = {
	LEFT : 0,
	MIDDLE : 1,
	RIGHT : 2
};

/**
  Returns the coordinates for a mouse event relative to element.
  Element must be the target for the event.

  @param element The element to compare against
  @param event The mouse event
  @return An object of form {x: relative_x, y: relative_y}
  */
CakeJS.Mouse.getRelativeCoords = function(element, event) {
  var xy = {x:0, y:0}
  var osl = 0
  var ost = 0
  var el = element
  while (el) {
    osl += el.offsetLeft
    ost += el.offsetTop
    el = el.offsetParent
  }
  xy.x = event.pageX - osl
  xy.y = event.pageY - ost
  return xy
}

CakeJS.Browser = (function(){
  var ua = window.navigator.userAgent;
  var khtml = ua.match(/KHTML/);
  var gecko = ua.match(/Gecko/);
  var webkit = ua.match(/WebKit\/\d+/);
  var ie = ua.match(/Explorer/);
  if (khtml) return 'KHTML';
  if (gecko) return 'Gecko';
  if (webkit) return 'Webkit';
  if (ie) return 'IE';
  return 'UNKNOWN';
})()

if (CakeJS.Browser == 'IE') {
  CakeJS.Mouse.LEFT = 1
  CakeJS.Mouse.MIDDLE = 4
}