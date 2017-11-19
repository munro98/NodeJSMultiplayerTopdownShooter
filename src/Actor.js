if (typeof exports !== 'undefined')  {
    global.Entity = require('./Entity.js').Entity;
}

class Actor extends Entity {
	constructor (size, pos) {
		super(size, pos)
		
	}

}

if (typeof exports !== 'undefined') 
  exports.Actor = Actor;