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
//var {Vec2} = require('./src/Vec2.js');
//var {Vec2} = require('./src/Vec2.js');

var vec = new Vec2(0, 0);

var userCount = 0;
var users = [];
var players = {};
var sockets = {};

var level;

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
	console.log("User connected");

	socket.emit('msg');

	var currentPlayer = {
        id: socket.id,
    };

	users.push(currentPlayer);
	players[socket.id] = new Player(new Vec2(800, 1800));
	sockets[socket.id] = socket;

    players[socket.id].targetPosition = new Vec2(800, 1800);

	socket.on('keyDown', function(key){
		players[socket.id].downKeys.add(key);
        console.log('down ' + key);
    });

    socket.on('keyUp', function(key){
    	players[socket.id].downKeys.delete(key);
        console.log('up ' + key);
    });


    socket.on('desync', function(){
        var p = players[socket.id];
        players[socket.id].downKeys = new Set();

        players[socket.id].newVel = new Vec2(0, 0);
        players[socket.id].vel = new Vec2(0, 0);
        p.pos = p.ghost.pos;
        socket.emit('desync', p.ghost.pos);
    });

    socket.on('mouseDown', function(key){
        var p = players[socket.id];
        p.downButtons.add(key);
        console.log('down ' + key);
    });

    socket.on('mouseUp', function(key){
        var p = players[socket.id];
        p.downButtons.delete(key);
        console.log('up ' + key);
    });

    socket.on('msg', function(msg){
        console.log('up ' + msg);
    });

    socket.on('pos', function(pos){
        var p = players[socket.id];
        p.targetPosition = new Vec2(pos.x, pos.y);
        //p.pos = new Vec2(pos.x, pos.y)
        
        //console.log('pos ');
    });

	socket.on('disconnect', function() {
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

	users.forEach( function(u) {
		var p = players[u.id];
        //console.log(p.targetPosition);

        p.updateServer(deltaTime, level, p.targetPosition);
		//p.update(deltaTime, level);
	});

	users.forEach( function(u) {
		//sockets[u.id].emit('getLatency');
		var p = players[u.id];
        
        var tpos = p.ghost.pos;
        //console.log(tpos);

        //if (p.moved) {
            p.moved = false;
            //sockets[u.id].emit('pos', {x: p.ghost.pos.x, y: p.ghost.pos.y, xv: p.vel.x, yv: p.vel.y});
            sockets[u.id].emit('pos', {x: tpos.x, y: tpos.y, xv: p.vel.x, yv: p.vel.y});
        //}
		
	});

    previousTime = currentTime;

}
