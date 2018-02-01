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


var userCount = 0;
var users = new Array(16);
var maxplayers = 16;
var sockets = {};

var level;

class ServerNetworking {
	constructor() {


	}

	broadcastCreateBullet(b) {
		//console.log("bullet created");
		for (var i = 0; i < users.length; i++) {
			if (users[i] == undefined) {
				continue;
			}
			var u = users[i];
			var p = level.players[u.pid];


			sockets[u.id].emit('createBullet', b.pos.x, b.pos.y, b.damage, b.vel); //
		}

	}

	broadcastDestroyBullet(index) {
		//sockets[u.id].emit('destroyBullet', index); //
		for (var i = 0; i < users.length; i++) {
			if (users[i] == undefined) {
				continue;
			}
			var u = users[i];
			var p = level.players[u.pid];

			sockets[u.id].emit('destroyBullet', index);

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
	console.log("Level players " + level.players);

	setInterval(update, 32);
});

app.use("/res", express.static(__dirname + '/res'));
app.use("/src", express.static(__dirname + '/src'));

app.get('/', function (req, res) {
	res.sendFile(path.join(__dirname + '/index.html'));
});

io.on('connection', function (socket) {
	console.log("User connected " + socket.id);

	console.log("User connected " + level.players);

	var i = 0;
	for (; i < maxplayers; i++) {
		if (level.players[i] == undefined) {
			break;
		}
	}

	level.players[i] = new Player(new Vec2(800, 1800));

	//socket.emit('msg');

	var currentPlayer = {
		id: socket.id,
		pid: i
	};

	users[i] = currentPlayer;
	sockets[socket.id] = socket;
	level.players[i].targetPosition = new Vec2(800, 1800);

	//Send all other level.players of this one
	for (var j = 0; j < users.length; j++) {
		socket.emit('playerConnect', j, {
			x: 0,
			y: 0
		});
	}



	for (var j = 0; j < users.length; j++) {
		if (users[j] == undefined) {
			continue;
		}
		var u = users[j];
		var p = level.players[u.pid];

		sockets[u.id].emit('playerConnect', j, {
			x: 0,
			y: 0
		});
	}





	socket.on('keyDown', function (key) {
		level.players[i].downKeys.add(key);
		//console.log('down ' + key);
	});

	socket.on('keyUp', function (key) {
		level.players[i].downKeys.delete(key);
		//console.log('up ' + key);
	});


	socket.on('desync', function () {
		var p = level.players[i];
		level.players[i].downKeys = new Set();

		level.players[i].newVel = new Vec2(0, 0);
		level.players[i].vel = new Vec2(0, 0);
		//p.pos = p.ghost.pos;
		socket.emit('desync', p.pos);
	});

	socket.on('mouseDown', function (key) {
		var p = level.players[i];
		p.downButtons.add(key);
		console.log('down ' + key);
	});

	socket.on('mouseUp', function (key) {
		var p = level.players[i];
		p.downButtons.delete(key);
		console.log('up ' + key);
	});

	socket.on('mouseMove', function (x, y) {
		var p = level.players[i];
		p.mouse = new Vec2(x, y);

		//console.log('x ' + x + ", " + y);
	});



	socket.on('msg', function (msg) {
		console.log('up ' + msg);
	});

	socket.on('pos', function (pos) {
		var p = level.players[i];
		p.targetPos = new Vec2(pos.x, pos.y);


		//console.log(p.targetPos);
	});

	socket.on('disconnect', function () {

		users[i] = undefined;
		level.players[i] = undefined;
		sockets[socket.id] = undefined;


		//Send all other level.players of this one disconnecting
		for (let j = 0; j < users.length; j++) {
			if (users[j] == undefined) {
				continue;
			}
			let u = users[j];
			let p = level.players[u.pid];
			sockets[u.id].emit('playerDisconnect', i);
		}

		console.log("User disconnected");
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

	for (let i = 0; i < users.length; i++) {
		if (users[i] == undefined) {
			continue;
		}
		let u = users[i];
		let p = level.players[u.pid];

		if (i == 0) {
			//console.log(p.targetPosition.x);
		}

		//console.log(p.targetPosition);
		//console.log(p.pos);

		p.updateServer(deltaTime, level, serverNet);
	}

	level.updateCollision(deltaTime, serverNet);

	
	//console.log()


	level.removeDead(serverNet);

	// Broadcast new state
	///*
	for (let i = 0; i < users.length; i++) {
		if (users[i] == undefined) {
			continue;
		}
		let u = users[i];
		let p = level.players[u.pid];

		for (let j = 0; j < users.length; j++) {
			if (users[j] == undefined) {
				continue;
			}

			let v = users[j];
			let p2 = level.players[v.pid];
			let tpos = p2.pos;

			sockets[u.id].emit('playerPosition', j, {
				x: tpos.x,
				y: tpos.y
			});
		}
	}
	//*/


	for (let i = 0; i < users.length; i++) {
		if (users[i] == undefined) {
			continue;
		}
		let u = users[i];
		let p = level.players[u.pid];
		let tpos = p.pos;
		//console.log(tpos.x);

		if (p.moved) {
			//p.moved = false;

			sockets[u.id].emit('pos', {
				x: tpos.x,
				y: tpos.y,
				xv: p.vel.x,
				yv: p.vel.y
			});
		}

	}

	previousTime = currentTime;

}
