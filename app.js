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
var {Level} = require('./src/Level.js');
var {Player} = require('./src/Player.js');


var userCount = 0;
var users = [];
var players = new Array(16);
var maxPlayers = 16;
var sockets = {};

var level;

class ServerNetworking {
  constructor (){


  }

  broadcastCreateBullet(b) {
    //console.log("bullet created");
    users.forEach( function(u) {
        //var p = players[u.id];
        var p = players[u.pid];
        

        sockets[u.id].emit('createBullet', b.pos.x, b.pos.y, b.damage, b.vel); //
    });

  }

  broadcastDestroyBullet(index) {
    //sockets[u.id].emit('destroyBullet', index); //
    users.forEach( function(u) {
        //var p = players[u.id];
        var p = players[u.pid];
        
    });

  }


}


var serverNet = new ServerNetworking();

fs.readFile('res/untitled.json', 'utf8', function(err, data) {
  if (err) throw err;
  console.log('OK: ' + 'res/untitled.json');

  var jsonParse = JSON.parse(data);
  //console.log(jsonParse.layers[0].data);

  var data0 = jsonParse.layers[0].data;
  var data1 = jsonParse.layers[1].data;
  var data2 = jsonParse.layers[2].data;
  //console.log(data)
  //level = new Level(100, null, data);
  level = new Level(100, null, data0, data1, data2);
  setInterval(update, 32);
});


app.use("/res", express.static(__dirname + '/res'));
app.use("/src", express.static(__dirname + '/src'));

app.get('/', function(req, res) {
	res.sendFile(path.join(__dirname + '/index.html'));
});

io.on('connection', function(socket) {
	console.log("User connected " + socket.id);

    var i = 0;
    for (; i < maxPlayers; i++) {
        if (players[i] == undefined) {
            break;
        }
    }

    players[i] = new Player(new Vec2(800, 1800));

	//socket.emit('msg');

	var currentPlayer = {
        id: socket.id,
        pid : i
    };

	users.push(currentPlayer);
	sockets[socket.id] = socket;
    players[i].targetPosition = new Vec2(800, 1800);

    //Send all other players of this one
    for (var j = 0; j < users.length; j++) {
        socket.emit('playerConnect', j, {x: 0, y: 0});
    }

    // Send this player to all others
    users.forEach( function(u) {
        var p = players[u.pid];
        sockets[u.id].emit('playerConnect', i, {x: 0, y: 0});

    });





	socket.on('keyDown', function(key){
		players[i].downKeys.add(key);
        //console.log('down ' + key);
    });

    socket.on('keyUp', function(key){
    	players[i].downKeys.delete(key);
        //console.log('up ' + key);
    });


    socket.on('desync', function(){
        var p = players[i];
        players[i].downKeys = new Set();

        players[i].newVel = new Vec2(0, 0);
        players[i].vel = new Vec2(0, 0);
        p.pos = p.ghost.pos;
        socket.emit('desync', p.ghost.pos);
    });

    socket.on('mouseDown', function(key){
        var p = players[i];
        p.downButtons.add(key);
        console.log('down ' + key);
    });

    socket.on('mouseUp', function(key){
        var p = players[i];
        p.downButtons.delete(key);
        console.log('up ' + key);
    });

    socket.on('mouseMove', function(x, y){
        //var p = players[socket.id];
        //p.downButtons.delete(key);
        var p = players[i];
        p.mouse = new Vec2(x, y);

        //console.log('x ' + x + ", " + y);
    });

    

    socket.on('msg', function(msg){
        console.log('up ' + msg);
    });

    socket.on('pos', function(pos){
        var p = players[i];
        p.targetPosition = new Vec2(pos.x, pos.y);

        
        //console.log(p.targetPosition);
    });

	socket.on('disconnect', function() {

        // users
        // sockets[socket.id]
        // players[i]

        //Send all other players of this one
        for (var j = 0; j < users.length; j++) {
            var u = users[j];
            var p = players[u.pid];
            sockets[u.id].emit('playerDisconnect', j);
        }

		console.log("User disconnected");
	});
});

http.listen(3000, function() {
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


    level.updateServer(deltaTime, serverNet);

	users.forEach( function(u) {
		//var p = players[u.id];
        var p = players[u.pid];

        //console.log(p.targetPosition);
        //console.log(p.pos);
        if (true) {

        }

        p.updateServer(deltaTime, level, p.targetPosition, serverNet);
	});

    for (var i = 0; i < users.length; i++) {
        var u = users[i];
        var p = players[u.pid];

        for (var j = 0; j < users.length; j++) {
            var v = users[j];
            var p2 = players[v.pid];
            var tpos = p2.ghost.pos;

            sockets[u.id].emit('playerPosition', j, {x: tpos.x, y: tpos.y});
        }
    }


	users.forEach( function(u) {
        var p = players[u.pid];
        var tpos = p.ghost.pos;
        //console.log(tpos);

        if (p.moved) {
            p.moved = false;

            sockets[u.id].emit('pos', {x: tpos.x, y: tpos.y, xv: p.vel.x, yv: p.vel.y});
        }
		
	});

    previousTime = currentTime;

}


