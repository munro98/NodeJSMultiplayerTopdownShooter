'use strict';


if (typeof exports !== "undefined") {
	global.QuadTree = require('./QuadTree.js').QuadTree;
	global.Actor = require('./Actor.js').Actor;
	global.Zombie = require('./Zombie.js').Zombie;
}

class Level {
	constructor(width, tileImage, ground, roads, interior) {
		this.width = 100;
		this.tileImage = tileImage;

		this.chunkSize = 16;
		this.tileSize = 32;
		this.chunkCount = Math.ceil(this.width / this.chunkSize);
		this.chunkMap = new Array(this.chunkCount * this.chunkCount);

		this.startX = 1;
		this.startY = 1;
		this.endX = 20;
		this.endY = 10;

		//console.log(width);

		this.ground = ground;
		this.roads = roads;
		this.interior = interior;

		this.drawsFrame = 0;

		this.bullets = new Array();
		this.players = new Array();
		this.zombies = new Array();

		this.first = false;

		//let z = new Zombie(new Vec2(600, 100));
		//console.log(Zombie);

		//Build Quadtree
		this.quadTree = new QuadTree(0, 0, 3200, 0);

	}

	updateServer(deltaTime, serverNet, allPlayers) {
		this.players = new Array();

		//console.log(allPlayers);

		for (let i = 0; i < allPlayers.length; i++) {
			let p = allPlayers[i].player;
			this.players.push(p);
		}

		this.players.push();

		if (this.first == false) {
			this.first = true;
			let z = new Zombie(new Vec2(800, 1800));
			this.zombies.push(z);
			serverNet.broadcastCreateZombie(z);

			z = new Zombie(new Vec2(1000, 1800));
			this.zombies.push(z);
			serverNet.broadcastCreateZombie(z);

		}


		for (let i = 0; i < this.bullets.length; i++) {
			this.bullets[i].update(this, deltaTime);
		}

		for (let i = 0; i < this.zombies.length; i++) {
			this.zombies[i].update(this, deltaTime);
		}




		//


	}

	updateCollision(deltaTime, serverNet) {

		this.quadTree = new QuadTree(0, 0, 3200, 0);

		for (let i = 0; i < this.players.length; i++) {
			if (this.players[i] == undefined) {
				continue;
			}
			let p = this.players[i];

			this.quadTree.addEntity(p);
		}


		for (let i = 0; i < this.zombies.length; i++) {
			let z = this.zombies[i];

			this.quadTree.addEntity(z);
		}

		let playersAndZombies = this.zombies;

		for (let j = 0; j < playersAndZombies.length; j++) {
			let potentialCollisions = this.quadTree.selectBoxes(playersAndZombies[j]);

			for (let i = 0; i < potentialCollisions.length; i++) {
				if (playersAndZombies[j] == potentialCollisions[i])
					continue;
				if (playersAndZombies[j].isIntersecting(potentialCollisions[i])) {
					playersAndZombies[j].resolveCollision(potentialCollisions[i]);

				}
			}
		}


		return;

		//Bullets hitting players
		for (var j = 0; j < this.bullets.length; j++) {
			//console.log(bulletList[j]);
			if (this.bullets[j].remove == true)
				continue;

			var potentialCollisions = this.quadTree.selectPoints(this.bullets[j].pos);
			//console.log(potentialCollisions.length);
			label1:
				for (var i = 0; i < potentialCollisions.length; i++) {
					//if (potentialCollisions[i] == player)
					//	continue;

					var samples = 8;
					var step = 1 / samples;

					for (var k = 0, fraction = 0.0; k < samples; k++, fraction += step) {

						if (potentialCollisions[i].isPointIntersecting2(this.bullets[j].pos.add(this.bullets[j].vel.mul(deltaTime * fraction)))) {
							potentialCollisions[i].health -= this.bullets[j].damage;
							this.bullets[j].remove = true;
							console.log("hit!!");
							break label1;
						}


					}

				}



		}

	}

	removeDead(serverNet) {

		//Remove dead bullets
		for (var i = 0; i < this.bullets.length; i++) {
			if (this.bullets[i].remove) {
				this.bullets.splice(i, 1);
				serverNet.broadcastDestroyBullet(i);
				//console.log("bullet destroyed");

				i--;
			}
		}


	}

	updateClient(deltaTime) {


	}

	draw(view, width, height) {
		var vec = view;
		vec.x = Math.round(vec.x);
		vec.y = Math.round(vec.y);

		this.drawsFrame = 0;
		this.drawChunks(vec, width, height);

	}

	drawChunk(vec, width, height, chunk) {
		ctx.drawImage(chunk.offscreenCanvas, 0, 0, chunk.offscreenCanvas.width, chunk.offscreenCanvas.height, vec.x + 0 * this.tileSize, vec.y + 0 * this.tileSize, chunk.offscreenCanvas.width, chunk.offscreenCanvas.height);
	}


	drawChunks(vec, width, height) {

		var startX = Math.max(0, Math.floor((-vec.x) / (this.tileSize * this.chunkSize)));
		var startY = Math.max(0, Math.floor((-vec.y) / (this.tileSize * this.chunkSize)));

		var endX = Math.min(this.chunkCount, Math.floor((-vec.x + width + (this.tileSize * this.chunkSize)) / (this.tileSize * this.chunkSize)));
		var endY = Math.min(this.chunkCount, Math.floor((-vec.y + height + (this.tileSize * this.chunkSize)) / (this.tileSize * this.chunkSize)));

		for (var j = startY; j < this.chunkCount && j < endY; j++) {
			for (var i = startX; i < this.chunkCount && i < endX; i++) {

				var chunk;
				if (this.chunkMap[i + j * this.chunkCount] == undefined) {
					//create chunk
					chunk = new Chunk(i, j, this);
					this.chunkMap[i + j * this.chunkCount] = chunk;
					//render to it
					this.drawToChunk(chunk);

				} else {
					chunk = this.chunkMap[i + j * this.chunkCount];
				}
				//render chunk
				ctx.drawImage(chunk.offscreenCanvas, 0, 0, chunk.offscreenCanvas.width, chunk.offscreenCanvas.height, vec.x + i * (this.tileSize * this.chunkSize), vec.y + j * (this.tileSize * this.chunkSize), chunk.offscreenCanvas.width, chunk.offscreenCanvas.height);
				this.drawsFrame++;
			}

		}

	}

	drawToChunk(chunk) {
		this.drawToChunkLayer(chunk, this.ground);
		this.drawToChunkLayer(chunk, this.roads);
		this.drawToChunkLayer(chunk, this.interior);

	}

	drawToChunkLayer(chunk, layer) {
		var startX = chunk.x * this.chunkSize;
		var startY = chunk.y * this.chunkSize;

		for (var y = startY, yy = 0; y < this.width && yy < this.tileSize; y++, yy++) {
			for (var x = startX, xx = 0; x < this.width && xx < this.tileSize; x++, xx++) {
				var tile = layer[x + y * this.width] - 1;
				if (tile == -1) {
					continue;
				}

				var tileX = tile % 54; // 54 is the number of tiles in each row
				var tileY = Math.floor(tile / 54);

				chunk.ctx.drawImage(this.tileImage, tileX * this.tileSize, tileY * this.tileSize, this.tileSize, this.tileSize, xx * this.tileSize, yy * this.tileSize, this.tileSize, this.tileSize);
				this.drawsFrame++;
			}

		}
	}


	drawLayer(vec, width, height, layer) {
		var startX = Math.max(0, Math.floor((-vec.x) / this.tileSize));
		var startY = Math.max(0, Math.floor((-vec.y) / this.tileSize));

		var endX = Math.min(this.width, Math.floor((-vec.x + width + this.tileSize) / this.tileSize));
		var endY = Math.min(this.width, Math.floor((-vec.y + height + this.tileSize) / this.tileSize));


		for (var y = startY; y < this.width && y < endY; y++) {
			for (var x = startX; x < this.width && x < endX; x++) {

				var tile = layer[x + y * this.width] - 1;
				if (tile == -1) {
					continue;
				}

				var tileX = tile % 54; // 54 is the number of tiles in each row
				var tileY = Math.floor(tile / 54);
				//
				ctx.drawImage(this.tileImage, tileX * this.tileSize, tileY * this.tileSize, this.tileSize, this.tileSize, vec.x + x * this.tileSize, vec.y + y * this.tileSize, this.tileSize, this.tileSize);
				this.drawsFrame++;
			}

		}
	}

	hit(v) {
		//var x = Math.floor((v.x) / this.tileSize );
		//var y = Math.floor((v.y) / this.tileSize );
		var x = (v.x) / this.tileSize >> 0;
		var y = (v.y) / this.tileSize >> 0;

		var tileIndex = x + y * this.width;
		if (tileIndex < 0 || tileIndex >= this.width * this.width)
			return false;

		if (this.interior[tileIndex] - 1 >= 0) {
			return true;
		}
		return false;
	}

	removeWall(v) {

		var x = Math.floor((v.x) / this.tileSize);
		var y = Math.floor((v.y) / this.tileSize);
		var tileIndex = x + y * this.width;
		if (tileIndex < 0 || tileIndex >= this.width * this.width)
			return;

		this.interior[tileIndex] = 0;
	}

	checkSurroundingFree(x, y) {
		var count = 0;

		var leftCellFree = x - 1 >= 0 && this.interior[x - 1 + y * this.width] == 0;
		var rightCellFree = x + 1 < this.width && this.interior[x + 1 + y * this.width] == 0;
		var topCellFree = y - 1 >= 0 && this.interior[x + (y - 1) * this.width] == 0;
		var botCellFree = y + 1 < this.width && this.interior[x + (y + 1) * this.width] == 0;

		if (leftCellFree) {
			count++;
		}
		if (rightCellFree) {
			count++;
		}
		if (topCellFree) {
			count++;
		}
		if (botCellFree) {
			count++;
		}

		return count;
	}

	addNeighbourCell(distanceThrough, x, y, xFrom, yFrom, nodeQueue, endX, endY, visited) {

		var visC;
		if (visited.has(x + y * this.width)) {
			visC = visited.get(x + y * this.width);
		} else {
			visC = new Cell(x, y);
			visited.set(x + y * this.width, visC);
		}

		if (distanceThrough < visC.dist) {
			visC.dist = distanceThrough;
			visC.prevX = xFrom;
			visC.prevY = yFrom;
		}

		var D = 1;
		var D2 = Math.sqrt(2);

		var dx = Math.abs(x - endX);
		var dy = Math.abs(y - endY);
		var delta = D * (dx + dy) + (D2 - 2 * D) * Math.min(dx, dy);
		delta = delta * 2;

		var estimateTotal = distanceThrough + delta;

		var newCellElem = new CellElement(x, y, distanceThrough);
		nodeQueue.push(newCellElem, estimateTotal);

	}

	aStarSearch(startX, startY, endX, endY) {
		var path = new Array();
		if (startX == endX && startY == endY)
			return path;

		if (this.checkSurroundingFree(startX, startY) != 4)
			return path;

		if (this.checkSurroundingFree(endX, endY) != 4)
			return path;


		this.startX = startX;
		this.startY = startY;
		this.endX = endX;
		this.endY = endY;

		var visited = new Map();

		var nodeQueue = new PriorityQueue();
		nodeQueue.push(new CellElement(startX, startY, 0), 1);

		while (nodeQueue.data.length != 0) {
			var cellElem = nodeQueue.pop();

			var x = cellElem.x;
			var y = cellElem.y;

			var cell;
			if (!visited.has(x + y * this.width)) {
				cell = new Cell(x, y);
				visited.set(x + y * this.width, cell);
			} else {
				cell = visited.get(x + y * this.width);
			}

			if (!cell.isVisited) {
				cell.isVisited = true;

				//Add neighbour nodes to queue
				var distanceThoughN = cellElem.distance + 1;

				var leftCellFree = x - 1 >= 0 && this.interior[x - 1 + y * this.width] == 0;
				var rightCellFree = x + 1 < this.width && this.interior[x + 1 + y * this.width] == 0;
				var topCellFree = y - 1 >= 0 && this.interior[x + (y - 1) * this.width] == 0;
				var botCellFree = y + 1 < this.width && this.interior[x + (y + 1) * this.width] == 0;

				//left neighbour
				if (leftCellFree && this.checkSurroundingFree(x - 1, y) == 4) {
					this.addNeighbourCell(distanceThoughN, x - 1, y, x, y, nodeQueue, endX, endY, visited);
				}

				//right neighbour
				if (rightCellFree && this.checkSurroundingFree(x + 1, y) == 4) {
					this.addNeighbourCell(distanceThoughN, x + 1, y, x, y, nodeQueue, endX, endY, visited);
				}

				//top neighbour
				if (topCellFree && this.checkSurroundingFree(x, y - 1) == 4) {
					this.addNeighbourCell(distanceThoughN, x, y - 1, x, y, nodeQueue, endX, endY, visited);
				}

				//bottom neighbour
				if (botCellFree && this.checkSurroundingFree(x, y + 1) == 4) {
					this.addNeighbourCell(distanceThoughN, x, y + 1, x, y, nodeQueue, endX, endY, visited);
				}

				//We reached the end
				if (x == endX && y == endY) {
					break;
				}
			}


		}

		var startNode = visited.get(startX + startY * this.width);
		var endNode = visited.get(this.endX + this.endY * this.width);

		//console.log(endNode);

		/*
		for (var key of visited.keys()) {
			var x = Math.floor(key % this.width);
			var y = Math.floor(key / this.width);
			
			ctx.fillRect(view.x + x*this.tileSize, view.y + y*this.tileSize,this.tileSize,this.tileSize);
			//console.log(visited.get(key));
			
		}
		*/

		//var currentNode = endNode;
		//console.log(currentNode);
		//currentNode = visited.get(currentNode.prevX+currentNode.prevY*this.width);
		//console.log(currentNode);


		path = new Array();
		///*
		var currentNode = endNode;

		while (true) { //currentNode != null && currentNode != undefined 
			path.push({
				x: currentNode.x,
				y: currentNode.y
			});
			//ctx.fillRect(view.x + currentNode.x*this.tileSize, view.y+currentNode.y*this.tileSize,this.tileSize,this.tileSize);

			//this.pos = new Vec2 (currentNode.x * this.tileSize+16, currentNode.y * this.tileSize+16);
			currentNode = visited.get(currentNode.prevX + currentNode.prevY * this.width);
			if (currentNode.prevX == startX && currentNode.prevY == startY)
				break;
		}

		for (var n of path) {
			//console.log(""+ n.x + ", " + n.y);
		}
		//*/
		return path.reverse();

	}
}


class Chunk {
	constructor(x, y, level) {
		this.x = x;
		this.y = y;
		this.level = level;
		this.dirty = true;

		this.offscreenCanvas = document.createElement('canvas');
		this.offscreenCanvas.width = level.chunkSize * level.tileSize;
		this.offscreenCanvas.height = level.chunkSize * level.tileSize;
		this.ctx = this.offscreenCanvas.getContext('2d');

	}

}

class PriorityQueue {
	constructor() {
		this.data = new Array();
	}

	push(element, priority) {
		priority = -priority;
		for (var i = 0; i < this.data.length && this.data[i][1] > priority; i++);
		this.data.splice(i, 0, [element, priority]);
	}

	pop() {
		return this.data.shift()[0];
	}

	size() {
		return this.data.length;
	}

	isEmpty() {
		return this.data.length == 0;
	}

}

class Cell {
	constructor(x, y) {
		this.x = x;
		this.y = y;

		this.prevX = -1;
		this.prevY = -1;
		this.dist = Number.MAX_VALUE;

		this.isVisited = false;
	}
}


class CellElement {
	constructor(x, y, distance) {
		this.x = x;
		this.y = y;
		this.distance = distance;
	}
}

// if running inside node
if (typeof exports !== 'undefined') {
	exports.Level = Level;
	exports.Cell = Cell;
	exports.CellElement = CellElement;
}