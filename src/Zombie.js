if (typeof exports !== "undefined") {
	global.Actor = require("./Actor.js").Actor;
	global.PeriodicTimer = require("./Time.js").PeriodicTimer;
}

class Zombie extends Actor {
	constructor(pos) {
		super(64, pos)

		this.health = 100;

		this.targetPos = new Vec2(0, 0);
		this.path = new Array();
		this.currentIndexOnPath = 0;

		this.accel = 800;
		this.maxVel = 100;
		this.texture = "res/player.png";

		this.periodicTimer = new PeriodicTimer(0.6, true, true);


	}

	update(level, deltaTime) {

		if (this.periodicTimer.trigger(deltaTime)) {
			

			//var mouseWorldGrid = new Vec2(Math.floor(player.posCenter.x / 32), Math.floor(player.posCenter.y / 32));

			var mouseWorldGrid = new Vec2(10, 10);
			mouseWorldGrid.x = Math.max(0, Math.min(level.width, mouseWorldGrid.x));
			mouseWorldGrid.y = Math.max(0, Math.min(level.width, mouseWorldGrid.y));

			var zombieGrid = new Vec2(Math.floor(this.getCenter().x / 32), Math.floor(this.getCenter().y / 32));
			zombieGrid.x = Math.max(0, Math.min(level.width, zombieGrid.x));
			zombieGrid.y = Math.max(0, Math.min(level.width, zombieGrid.y));

			this.path = level.aStarSearch(zombieGrid.x, zombieGrid.y, mouseWorldGrid.x, mouseWorldGrid.y);
			this.currentIndexOnPath = 0;
		}

		if (this.path.length > 0 && this.currentIndexOnPath < this.path.length) {
			this.targetPos = new Vec2(this.path[this.currentIndexOnPath].x * level.tileSize + 16, this.path[this.currentIndexOnPath].y * level.tileSize + 16);
		}

		var deltaPos = this.targetPos.sub(this.getCenter());

		if (deltaPos.mag() < level.tileSize) {
			this.currentIndexOnPath = Math.min(this.currentIndexOnPath + 1, this.path.length - 1);
		}


		deltaPos = deltaPos.normalized().mul(deltaTime * this.accel);
		this.vel = this.vel.add(deltaPos);

		if (this.vel.mag() > this.maxVel) {
			this.vel = this.vel.normalized().mul(this.maxVel);
		}

		this.rotation = Math.atan(deltaPos.y / deltaPos.x) * 180 / Math.PI;
		if (deltaPos.x >= 0.0) {
			this.rotation += 180;
		}

		this.rotation += 90;

		super.update(deltaTime, level);
	}

	hit(v) {
		if (this.pos.x + this.width / 2 < v.x || this.pos.x - this.width / 2 > v.x) return false;
		if (this.pos.y + this.height / 2 < v.y || this.pos.y - this.height / 2 > v.y) return false;

		return true;
	}
}

if (typeof exports !== "undefined")
	exports.Zombie = Zombie;