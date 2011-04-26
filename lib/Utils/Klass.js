/**
  CakeJS.Klass is a function that returns a constructor function.

  The constructor function calls #initialize with its arguments.

  The parameters to CakeJS.Klass have their prototypes or themselves merged with the
  constructor function's prototype.

  Finally, the constructor function's prototype is merged with the constructor
  function. So you can write Shape.getArea.call(this) instead of
  Shape.prototype.getArea.call(this).

  Shape = CakeJS.Klass({
    getArea : function() {
      raise('No area defined!')
    }
  })

  Rectangle = CakeJS.Klass(Shape, {
    initialize : function(x, y) {
      this.x = x
      this.y = y
    },

    getArea : function() {
      return this.x * this.y
    }
  })

  Square = CakeJS.Klass(Rectangle, {
    initialize : function(s) {
      Rectangle.initialize.call(this, s, s)
    }
  })

  new Square(5).getArea()
  //=> 25

  @return Constructor object for the class
  */
CakeJS.Klass = function() {
  var c = function() {
    this.initialize.apply(this, arguments);
  }
  c.ancestors = $A(arguments);
  c.prototype = {};
  for(var i = 0; i<arguments.length; i++) {
    var a = arguments[i];
    //if( a == undefined) continue;
    if (a.prototype) {
      Object.extend(c.prototype, a.prototype);
    } else {
      Object.extend(c.prototype, a);
    }
  }
  Object.extend(c, c.prototype);
  return c;
}
