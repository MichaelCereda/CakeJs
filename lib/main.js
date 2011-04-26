var document = window.document;

window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame    || 
              window.oRequestAnimationFrame      || 
              window.msRequestAnimationFrame     || 
              function(/* function */ callback, /* DOMElement */ element){
                window.setTimeout(callback, 1000 / 60);
              };
    })();
 
if (!window['$A']) {
  /**
    Creates a new array from an object with #length.
    */
  $A = function(obj) {
    var a = new Array(obj.length)
    for (var i=0; i<obj.length; i++)
      a[i] = obj[i]
    return a
  }
}

if (!window['$']) {
  $ = function(id) {
    return document.getElementById(id)
  }
}

var CakeJS = (function(){

	// Define a local copy of CakeJS
	var CakeJS = function(){
		
	};
	_CakeJS = window.CakeJS;
});
