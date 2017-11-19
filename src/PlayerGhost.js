'use strict';
if (typeof exports !== 'undefined')  {
    global.Vec2 = require('./Vec2.js').Vec2;
    global.Actor = require('./Actor.js').Actor;

}

class PlayerGhost extends Actor {
  constructor (pos) {
    super(64, pos)

    this.health = 100;

    this.targetPos = new Vec2(0, 0);
    this.path = new Array();
    this.currentIndexOnPath = 0;

    this.accel = 1600;
    this.decel = 800;
    this.maxVel = 240;//240;

    this.texture = "res/player.png";

  }

  update (deltaTime, level, targetPostion){
    

    var deltaPos = targetPostion.sub(this.pos);

    if (deltaPos.mag() > deltaTime * this.maxVel) {
      deltaPos = deltaPos.normalized().mul(deltaTime * this.maxVel);
    }

    var nextXposition = this.pos.x + deltaPos.x;
    var hitX = false;

    for (var x = 0; x <= this.width; x += 32) {
      for (var y = 0; y <= this.width; y += 32) {
        hitX |= level.hit(new Vec2(nextXposition + x, this.pos.y + y));
      }
    }

    if (!hitX) {
      this.pos.x = this.pos.x + deltaPos.x;
    }

    var nextYposition = this.pos.y + deltaPos.y;
    var hitY = false;

    for (var x = 0; x <= this.width; x += 32) {
      for (var y = 0; y <= this.width; y += 32) {
        hitY |= level.hit(new Vec2(this.pos.x + x, nextYposition + y));
      }
    }
    if (!hitY) {
      this.pos.y = this.pos.y + deltaPos.y;
    }



    //this.pos = this.pos.add(deltaPos);

    this.rotation = Math.atan(deltaPos.y / deltaPos.x) * 180 / Math.PI;
    if (deltaPos.x >= 0.0) {
      this.rotation += 180;
    }

    this.rotation += 90;
  }

  hit (v){
    //if(this.pos.x+this.width / 2 < v.x || this.pos.x-this.width  / 2 > v.x ) return false;
    //if(this.pos.y+this.height / 2 < v.y || this.pos.y-this.height  / 2 > v.y ) return false;

    if(this.pos.x+this.width / 2 < v.x || this.pos.x-this.width  / 2 > v.x ) return false;
    if(this.pos.y+this.height / 2 < v.y || this.pos.y-this.height  / 2 > v.y ) return false;

    return true;
  }
}


if (typeof exports !== 'undefined') 
  exports.PlayerGhost = PlayerGhost;