"use strict";

if (typeof exports !== 'undefined') {
	global.Vec2 = require('./Vec2.js').Vec2;
	global.Actor = require('./Actor.js').Actor;
	global.PlayerGhost = require('./PlayerGhost.js').PlayerGhost;
	global.Bullet = require('./Bullet.js').Bullet;

	global.Rifle = require('./Gun.js').Rifle;
	global.Pistol = require('./Gun.js').Pistol;

}

class Player extends Actor {
	constructor(pos) {
		super(64, pos)

		this.accel = 1600;
		this.decel = 800;
		this.maxVel = 240;
		this.rotation = 0;

		this.timeSinceLastFire = 0;

		this.texture = "res/player.png";

		this.altWeapon = new Rifle(new Vec2(0, 0));
		this.activeWeapon = new Pistol(new Vec2(0, 0));

		this.downKeys = new Set();
		this.downKeysFrame = new Set();
		this.lastDownKeys = new Set();

		this.downButtons = new Set();

		this.moved = false;
		this.takeInput = true;

		this.targetPostion = pos.copy();
		this.ghost = new PlayerGhost(pos.copy());
		this.mouse = new Vec2(0, 0);


	}

	updateClient(deltaTime, level) {
		var vec3 = cameraPosition.add(this.posCenter); // position of player screen space
		var relvec3 = new Vec2(mouseX, mouseY).sub(vec3);

		this.rotation = Math.atan(relvec3.y / relvec3.x) * 180 / Math.PI;
		if (relvec3.x >= 0.0) {
			this.rotation += 180;
		}

		this.rotation += 90;

	}

	updateServer(deltaTime, level, targetPostion, serverNet) {

		this.downKeysFrame = new Set();

		for (var key of this.downKeys) {
			if (!this.lastDownKeys.has(key)) {
				this.downKeysFrame.add(key);
			}

		}

		if (this.downKeysFrame.has(87)) {
			//console.log("Frame");
		}

		this.ghost.update(deltaTime, level, targetPostion);

		if (this.downKeys.has(87)) {
			this.moved = true;
		}
		if (this.downKeys.has(83)) {
			this.moved = true;
		}

		if (this.downKeys.has(65)) {
			this.moved = true;
		}
		if (this.downKeys.has(68)) {
			this.moved = true;
		}

		var bulletAngle = -Math.atan2(this.mouse.y, this.mouse.x); // In radians

		var spread = this.activeWeapon.spread;
		bulletAngle += 90 * (Math.PI / 180);


		/*
				if (this.downKeysFrame.has(87)) {
					var bullet = new Bullet(this.ghost.pos.add(new Vec2(this.width * 0.5, this.height * 0.5)), this.activeWeapon.damage); // , -offsetAngle * 180 / Math.PI
					bullet.vel = this.mouse.normalized().mul(this.activeWeapon.bulletSpeed);
					level.bullets.push(bullet);
					serverNet.broadcastCreateBullet(bullet);
					
				}
				*/
		this.timeSinceLastFire += deltaTime;
		if (this.timeSinceLastFire > this.activeWeapon.timeBetweenShots && this.downButtons.has(1) && this.activeWeapon.ammo > 0) {


			this.timeSinceLastFire = 0;
			//playSound();
			for (var i = 0; i < this.activeWeapon.bulletsEachShot; i++) {

				var offsetAngle = bulletAngle + (Math.random() * spread - (spread * 0.5)) * (Math.PI / 180);
				var bulletVec2 = new Vec2(Math.sin(offsetAngle), Math.cos(offsetAngle));

				var bullet = new Bullet(this.ghost.pos.add(new Vec2(this.width * 0.5, this.height * 0.5)), this.activeWeapon.damage);
				bullet.vel = this.mouse.normalized().mul(this.activeWeapon.bulletSpeed);
				level.bullets.push(bullet);
				serverNet.broadcastCreateBullet(bullet);
				//var bullet = new Bullet(playerCentre, this.activeWeapon.damage); // , -offsetAngle * 180 / Math.PI
				//bullet.vel = bulletVec2.normalized().mul(this.activeWeapon.bulletSpeed);
				//bulletList.push(bullet);

			}
			this.activeWeapon.ammo = this.activeWeapon.ammo - 1;
		}


		this.lastDownKeys = new Set(this.downKeys);

		super.update(deltaTime, level);
	}

	update(deltaTime, level) {

		var playerCentre = this.pos.add(new Vec2(this.width * 0.5, this.width * 0.5));

		this.lifeTime += deltaTime;

		var inputVec3 = new Vec2(0, 0);
		if (this.downKeys.has(87)) {
			this.moved = true;
			inputVec3.y += -1;
		}
		if (this.downKeys.has(83)) {
			this.moved = true;
			inputVec3.y += 1;
		}

		if (this.downKeys.has(65)) {
			this.moved = true;
			inputVec3.x += -1;
		}
		if (this.downKeys.has(68)) {
			this.moved = true;
			inputVec3.x += 1;
		}

		var deltaPos = inputVec3;
		deltaPos = deltaPos.normalized().mul(deltaTime * this.accel);
		this.newVel = this.newVel.add(deltaPos);

		if (this.newVel.mag() > this.maxVel) {
			this.newVel = this.newVel.normalized().mul(this.maxVel);
		}

		var deceleration = this.decel * deltaTime;
		if (inputVec3.mag() == 0) {
			if (this.newVel.x > 0) {
				this.newVel.x = Math.max(this.newVel.x - deceleration, 0);
			} else {
				this.newVel.x = Math.min(this.newVel.x + deceleration, 0);
			}
			if (this.newVel.y > 0) {
				this.newVel.y = Math.max(this.newVel.y - deceleration, 0);
			} else {
				this.newVel.y = Math.min(this.newVel.y + deceleration, 0);
			}
		}



		/*
		if (downKeysFrame.has(69)) {
			console.log("sdg")
			for (var i = 0; i < guns.length; i++) {
				if (guns[i].hit(this.posCenter)) { //.add(new Vec2(this.width / 2, this.height / 2))
					if (this.altWeapon == null) {
						this.altWeapon = this.activeWeapon;
						this.activeWeapon = guns[i];
					} else {
						this.activeWeapon = guns[i];
					}
					
					guns.splice(i, 1);
					i--;
				}
				
			}
		}


		this.timeSinceLastFire += deltaTime;

		if (this.activeWeapon.ammo <= 0) {
			this.activeWeapon = new Pistol(new Vec2(0,0));
		}

		var bulletVec2 = new Vec2(mouseX, mouseY).sub(cameraPosition.add(playerCentre));
		var bulletAngle = -Math.atan2(bulletVec2.y, bulletVec2.x); // In radians

		var spread = this.activeWeapon.spread;
		bulletAngle += 90 * (Math.PI / 180); // offset 90 degrees 

		//console.log(bulletAngle + ": " + bulletVec3.x + " " + bulletVec3.y + " ")
		//console.log();

		if (this.timeSinceLastFire > this.activeWeapon.timeBetweenShots && mouseDown && this.activeWeapon.ammo > 0) {


			this.timeSinceLastFire = 0;
			//playSound();
			for (var i = 0; i < this.activeWeapon.bulletsEachShot; i++) {

				var offsetAngle = bulletAngle + (Math.random() * spread - (spread * 0.5) ) * (Math.PI / 180);
				bulletVec2 = new Vec2(Math.sin(offsetAngle), Math.cos(offsetAngle));


				var bullet = new Bullet(playerCentre, this.activeWeapon.damage); // , -offsetAngle * 180 / Math.PI
				bullet.vel = bulletVec2.normalized().mul(this.activeWeapon.bulletSpeed);
				bulletList.push(bullet);
				
			}
			this.activeWeapon.ammo = this.activeWeapon.ammo - 1;
		}
		*/

		//if (onKeyDownCodeSet.has(69)) {



		super.update(deltaTime, level);
	}

	swapWeapon() {
		if (this.altWeapon == null)
			return;
		var temp = this.activeWeapon;
		this.activeWeapon = this.altWeapon;
		this.altWeapon = temp;
	}
}

// if running inside node
if (typeof exports !== 'undefined')
	exports.Player = Player;