'use strict';
var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http, {
	'pingInterval': 2000,
	'pingTimeout': 5000
});

var path = require('path');
var fs = require('fs');

var Vec2 = require('./src/Vec2.js').Vec2;
var {
	Level
} = require('./src/Level.js');
var {
	Player
} = require('./src/Player.js');

var {
	QuadTree
} = require('./src/QuadTree.js');


var maxplayers = 16;
var allPlayers = [];

var level;

class ServerNetworking {
	constructor() {

	}

	//TODO clean up

	broadcastCreateBullet(b) {
		//console.log("bullet created");
		for (var i = 0; i < allPlayers.length; i++) {
			let sP = allPlayers[i];

			sP.socket.emit('createBullet', b.pos.x, b.pos.y, b.damage, b.vel); //
		}

	}

	broadcastDestroyBullet(index) {
		for (var i = 0; i < allPlayers.length; i++) {
			let sP = allPlayers[i];
			sP.socket.emit('destroyBullet', index);

		}
	}

	broadcastCreateZombie(z) {
		for (var i = 0; i < allPlayers.length; i++) {
			let sP = allPlayers[i];
			sP.socket.emit('createZombie', z.pos.x, z.pos.y); //
		}

	}

	broadcastDestroyZombie(index) {
		for (var i = 0; i < allPlayers.length; i++) {
			let sP = allPlayers[i];
			sP.socket.emit('destroyZombie', index);

		}
	}

}


var serverNet = new ServerNetworking();

fs.readFile('res/untitled.json', 'utf8', function (err, data) {
	if (err) throw err;
	console.log('OK: ' + 'res/untitled.json');

	var jsonParse = JSON.parse(data);
	//console.log(jsonParse.layers[0].data);

	var data0 = jsonParse.layers[0].data;
	var data1 = jsonParse.layers[1].data;
	var data2 = jsonParse.layers[2].data;
	//console.log(data)
	//level = new Level(100, null, data);
	console.log("Level created ");
	level = new Level(100, null, data0, data1, data2);

	setInterval(update, 32);
});

app.use("/res", express.static(__dirname + '/res'));
app.use("/src", express.static(__dirname + '/src'));

app.get('/', function (req, res) {
	res.sendFile(path.join(__dirname + '/index.html'));
});

io.on('connection', function (socket) {
	console.log("Player connected " + socket.id);

	let curPlayer = new Player(new Vec2(800, 1800));

	var serverPlayer = {
		id: socket.id,
		socket: socket,
		player: curPlayer
	};

	

	///*
	//Send current connected players about this one
	for (let j = 0; j < allPlayers.length; j++) {
		//console.log('con' + serverPlayer.id);
		allPlayers[j].socket.emit('playerConnect', socket.id, {
			x: 0,
			y: 0
		});
	}

	///*
	//Send currently connecting player about other players
	for (let j = 0; j < allPlayers.length; j++) {
		let sP = allPlayers[j];
		socket.emit('playerConnect', sP.id, {
			x: sP.player.pos.x,
			y: sP.player.pos.y
		});
	}
	//*/
	for (let j = 0; j < level.zombies.length; j++) {
		let z = level.zombies[j];
		socket.emit('createZombie', z.pos.x, z.pos.y);
	}

	allPlayers.push(serverPlayer);

	//console.log(serverPlayer.id);

	socket.on('keyDown', function (key) {
		curPlayer.downKeys.add(key);
		//curPlayer
		//console.log('down ' + key);
	});

	socket.on('keyUp', function (key) {
		curPlayer.downKeys.delete(key);
		//console.log('up ' + key);
	});


	socket.on('desync', function () {
		var p = curPlayer;
		curPlayer.downKeys = new Set();

		curPlayer.newVel = new Vec2(0, 0);
		curPlayer.vel = new Vec2(0, 0);
		socket.emit('desync', p.pos);
	});

	socket.on('mouseDown', function (key) {
		var p = curPlayer;
		p.downButtons.add(key);
		//console.log('down ' + key);
	});

	socket.on('mouseUp', function (key) {
		var p = curPlayer;
		p.downButtons.delete(key);
		//console.log('up ' + key);
	});

	socket.on('mouseMove', function (x, y) {
		var p = curPlayer;
		p.mouse = new Vec2(x, y);

		//console.log('x ' + x + ", " + y);
	});



	socket.on('msg', function (msg) {
		console.log('up ' + msg);
	});

	socket.on('pos', function (pos) {
		var p = curPlayer;
		p.targetPos = new Vec2(pos.x, pos.y);

		//console.log(p.targetPos);
	});

	socket.on('disconnect', function () {

		var i = allPlayers.indexOf(serverPlayer);
		allPlayers.splice(i, 1);

		//Send all other level.players of this one disconnecting
		for (let j = 0; j < allPlayers.length; j++) {
			allPlayers[j].socket.emit('playerDisconnect', serverPlayer.id);
			
		}

		console.log("Player disconnected " + socket.id + " " + allPlayers.length + " left");
	});
});

http.listen(3000, function () {
	console.log('listening on port s');
});

// Game code


var date = new Date();
var currentTime = date.getTime() / 1000.0;
var previousTime = date.getTime() / 1000.0;

var deltaTime = 0;

function update() {
	date = new Date();
	currentTime = date.getTime() / 1000.0;
	deltaTime = currentTime - previousTime;

	// Server simulation

	level.updateServer(deltaTime, serverNet);

	//Build Quadtree
	var quadTree = new QuadTree(0, 0, 3200, 0);

	for (let i = 0; i < allPlayers.length; i++) {
		let p = allPlayers[i].player;

		//console.log(p.targetPosition);
		//console.log(p.pos);

		p.updateServer(deltaTime, level, serverNet);
	}

	level.updateCollision(deltaTime, serverNet);


	level.removeDead(serverNet);

	// Broadcast new game state state
	///*

	//TODO clean up this code	
	for (let i = 0; i < allPlayers.length; i++) {
		// Select a player
		let sP = allPlayers[i];

		// Then send position of other players
		for (let j = 0; j < allPlayers.length; j++) {
			if (i == j) {
				continue;
			}
			let sP2 = allPlayers[j];

			sP.socket.emit('playerPosition', sP2.id, {
				x: sP2.player.pos.x,
				y: sP2.player.pos.y
			});
		}
	}
	//*/

	for (let i = 0; i < allPlayers.length; i++) {
		let sP = allPlayers[i];

		for (let j = 0; j < level.zombies.length; j++) {
			let z = level.zombies[j];
			sP.socket.emit('zombiePosition', j, z.pos.x, z.pos.y);
		}
	}


	for (let i = 0; i < allPlayers.length; i++) {
		let curP = allPlayers[i];
		let p = allPlayers[i].player;
		if (p.moved) {
			//p.moved = false;

			curP.socket.emit('pos', {
				x: p.pos.x,
				y: p.pos.y,
				xv: p.vel.x,
				yv: p.vel.y
			});
		}

	}

	previousTime = currentTime;

}
