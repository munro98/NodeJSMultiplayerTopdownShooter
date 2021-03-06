'use strict';
class PeriodicTimer {
	constructor(interval, triggerFirst, randomInitialDelay) {
		this.interval = interval;
		this.currentTime = 0;
		if (triggerFirst) {
			this.currentTime = this.interval + 0.1;
		}
		if (randomInitialDelay) {
			this.currentTime = -Math.random();
		}

	}

	trigger(deltaTime) {
		this.currentTime += deltaTime;
		if (this.currentTime > this.interval) {
			this.currentTime = 0;
			return true;
		}
		return false;

	}


}

// if running inside node
if (typeof exports !== "undefined")
	exports.PeriodicTimer = PeriodicTimer;