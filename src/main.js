'use strict';
var cameraX = 0;
var cameraY = 0;

var mouseX = 0;
var mouseY = 0;

var mouseX1;
var mouseY1;

var mouseX2;
var mouseY2;

var mouseDown = false;

var level;
var tileImage;

var texture = new Texture();

var player = new Player(new Vec2(800, 1800)); // 400, 40
var player2 = new Player(new Vec2(800, 1800));
var player3 = new Player(new Vec2(800, 1800));

var zombie = new Zombie(new Vec2(600, 100));



//zombieList.push(zombie);
//zombieList.push(new Zombie(new Vec2(600, 100)));
//zombieList.push(new Zombie(new Vec2(600, 200)));

for (var j = 0; j < 25; j++) {
  //zombieList.push(new Zombie(new Vec2(100, 1800+j*50)));
}


var players = new Map();
var bulletList = new Array();
var zombieList = new Array();

var guns = new Array();
guns.push(new Rifle(new Vec2(500, 100)));


var positionBufferSize = 32;

var positionBufferClient = new Array(positionBufferSize);
positionBufferClient.fill(player.pos);
var positionBufferClientIndex = 0;

var onKeyDownCodeSet = new Set();
var keyCodeSet = new Set();

var runTime = 0;
var time2 = 0;


var context = new AudioContext();

var bufferLoader = new BufferLoader(
  context, [
    "res/RifleFire.ogg"
  ],
  finishedLoading
);
bufferLoader.load();

var gunFire;

function finishedLoading(bufferList) {
  gunFire = bufferList[0];
  var source1 = context.createBufferSource();
  source1.buffer = bufferList[0];

  source1.connect(context.destination);
  //source1.start(0);
}


function playSound() {
  var source = context.createBufferSource();
  source.buffer = gunFire;
  source.connect(context.destination);
  source.start(0);
}

/*
networked player direction
lerped positions
networked collisions
make more art
animate legs
melee
lag compensation on bullets sample from fire point to current position(fire point + vel * Math.max(ping, MaxPing))
player/player collision
player/bullet collision

pickup guns


deathmatch
reflective bullets
multiply reflective bullets
instagib

insane knockback guns


remove tileImage from level
remove texture from entity

battle royal game mode
pulse wave gun
using sniper gives extended view range
add dash mechanic
fix sniper spread
place zombie spawners
gui show gamestate
scoreboard
respawning
playerid/team in bullet class
bullet spread from weapon properties
team dethmatch
bullet sponge gamemode (players gradually get more powerful guns)
don't draw offscreen entities(use quadtree) / bullets




design abilities

Refactor

fix onkeydown
and concurrency in swapWeapons
*/
var c;
var ctx;

var deltaTime = 0.0;
var previousTime = 0.0;

var date;

var cameraPosition;

var gameManager;

var width = 20;

var socket;
var sendTime;
var latency = 0;
var timeSinceLastDesync = 0;

var mouseMoved = false;

//players.set( 5, new Player(new Vec2(800, 1800)));

window.onload = async function () {

  socket = io();

  socket.on('msg', function () {
    console.log("hi");
  });

  socket.on('getLatency', function () {
    socket.emit('getLatency');
  });

  socket.on('ping', function () {
    //console.log('Socket :: Ping sent.');
  });

  socket.on('pong', function (ms) {
    //console.log(`Socket :: Latency :: ${ms} ms`);
    latency = ms;
  });


  socket.on('desync', function (pos) {

    player.pos = new Vec2(pos.x, pos.y);
    player.newVel = new Vec2(0, 0);
    player.vel = new Vec2(0, 0);

    positionBufferClient.fill(player.pos);

  });

  socket.on('pos', function (pos) {

    var ticksBehind = Math.min(31, Math.floor(latency / 32)) + 1;
    var i = positionBufferClientIndex - ticksBehind;
    if (i < 0) {
      i = 32 + (i % 32);
    } else {
      i = i % 32;
    }

    var clientOldPos = positionBufferClient[i];
    player2.pos = clientOldPos;

    var serverOldPos = new Vec2(pos.x, pos.y);
    var deltaPos = clientOldPos.sub(serverOldPos);


    var deltaPos2 = player.pos.sub(serverOldPos);

    date = new Date();
    var currentTime = date.getTime() / 1000.0;

    //console.log("desync " + (currentTime - timeSinceLastDesync));
    //console.log("desync " + deltaPos.mag());

    if (deltaPos.mag() > 40) { //  && (currentTime - timeSinceLastDesync) > 0.5
      date = new Date();
      timeSinceLastDesync = currentTime;
      //console.log("desync " + ticksBehind + " " + i); //deltaPos.mag()
      console.log("desync " + deltaPos.mag() + " " + i); //deltaPos.mag()

      player.pos = serverOldPos;

      player.newVel = new Vec2(0, 0);
      player.vel = new Vec2(0, 0);

      positionBufferClient.fill(player.pos);

      socket.emit('desync');
    }

    //player3.pos = new Vec2(pos.x, pos.y);

  });


  socket.on('playerConnect', function (index, pos) {
    console.log("Con " + index);
    //players[index] = new Player(new Vec2(800, 1800));
    players.set( index, new Player(new Vec2(800, 1800)));

  });

  socket.on('playerDisconnect', function (index) {
    players.delete(index);
    //players.splice(index, 1);

    console.log("Disc " + index);
  });

  socket.on('playerPosition', function (index, pos) {
    //console.log("Pos " + index + pos.x);
    //players[index].pos = new Vec2(pos.x, pos.y);

    //console.log("Pos " + index);
    players.get(index).pos = new Vec2(pos.x, pos.y);
  });


  socket.on('createBullet', function (x, y, dam, vel) { //

    let bullet = new Bullet(new Vec2(x, y), dam, null);
    bullet.vel = new Vec2(vel.x, vel.y);
    bulletList.push(bullet);
    //console.log(vel);

  });

  socket.on('destroyBullet', function (index) {
    bulletList.splice(index, 1);
  });


  socket.on('createZombie', function (x, y) { //

    let z = new Zombie(new Vec2(x, y));
    zombieList.push(z);

  });

  socket.on('destroyZombie', function (index) {
    zombieList.splice(index, 1);
  });

  socket.on('zombiePosition', function (index, x, y, vx, vy) {
    zombieList[index].pos = new Vec2(x, y);
    zombieList[index].vel = new Vec2(vx, vy);
  });
  


  date = new Date();
  var currentTime = date.getTime() / 1000.0;
  previousTime = currentTime;

  gameManager = new GameManager();

  c = document.getElementById("Canvas");
  ctx = c.getContext("2d");

  ctx.canvas.width = window.innerWidth;
  ctx.canvas.height = window.innerHeight;

  var client = new XMLHttpRequest();
  client.open('GET', 'res/untitled.json');
  client.onload = function () {

    tileImage = new Image();
    tileImage.onload = function () {

      var jsonParse = JSON.parse(client.responseText);
      console.log(jsonParse.layers[0].data);

      var data0 = jsonParse.layers[0].data;
      var data1 = jsonParse.layers[1].data
      var data2 = jsonParse.layers[2].data


      level = new Level(100, tileImage, data0, data1, data2);
      setInterval(tick, 16);
      setInterval(serverTick, 32);

    };
    tileImage.src = "res/tilesheet_complete.png";


  }
  client.send();

  c.addEventListener("mouseup", onMouseUp, false);
  c.addEventListener("mousedown", onMouseDown, false);
  c.addEventListener("mousemove", onMouseMove, false);
  c.addEventListener("wheel", onMouseWheel, false);

  document.documentElement.addEventListener("keydown", onKeyDown, false);
  document.documentElement.addEventListener("keyup", onKeyUp, false);


  cameraPosition = player.pos.mul(-1).add(new Vec2(ctx.canvas.width / 2 + 16, ctx.canvas.height / 2 + 16));

  //ctx.fillRect(10, 10, 100, 100);
  //setInterval(tick, 32);
};

function levelLoaded() {

}

function doThing1() {
  console.log("doThing1");
}

function doThing2() {
  console.log("doThing2");
}

var doThing = doThing1;

var scaleFitNative = 1;

var lastDownKeys = new Set();
var downKeysFrame = new Set();

function serverTick() {
  positionBufferClient[positionBufferClientIndex] = player.pos.copy();
  positionBufferClientIndex++;
  positionBufferClientIndex = positionBufferClientIndex % positionBufferSize;

  socket.emit('pos', {
    x: player.pos.x,
    y: player.pos.y
  });

}

var periodicTimer = new PeriodicTimer(0.6, true, true);

function tick() {

  if (player.takeInput == false) {
    keyCodeSet = new Set();
    currentDownKeys = new Set();

    player.newVel = new Vec2(0, 0);
    player.vel = new Vec2(0, 0);
  }

  var currentDownKeys = new Set(keyCodeSet);
  downKeysFrame = new Set();

  for (var key of currentDownKeys) {
    if (!lastDownKeys.has(key)) {
      downKeysFrame.add(key);
    }

  }

  if (player.takeInput) {
    for (var key of downKeysFrame) {
      socket.emit('keyDown', key);
    }
  }


  if (downKeysFrame.has(87)) {
    console.log("KeyDown " + 81);
  }


  var nativeWidth = 800; // the resolution the games is designed to look best in
  var nativeHeight = 800;

  var deviceWidth = window.innerWidth;
  var deviceHeight = window.innerHeight;


  scaleFitNative = Math.min(window.innerWidth / nativeWidth, window.innerHeight / nativeHeight);

  ctx.canvas.width = Math.floor(deviceWidth / scaleFitNative);
  ctx.canvas.height = Math.floor(deviceHeight / scaleFitNative);

  var cameraBox = new Vec2(ctx.canvas.width, ctx.canvas.height);

  ctx.canvas.style.width = '100%';
  ctx.canvas.style.height = '100%';

  date = new Date();
  var currentTime = date.getTime() / 1000.0;
  deltaTime = currentTime - previousTime;
  previousTime = currentTime;

  //console.log(deltaTime);

  runTime += deltaTime;
  //deltaTime *= 0.2;

  gameManager.update(deltaTime);
  //gameManager.log();

  cameraPosition = player.pos.mul(-1).add(new Vec2(ctx.canvas.width / 2, ctx.canvas.height / 2));

  //console.log(cameraPosition.x);

  time2 += deltaTime;

  var mouseWorld = new Vec2(mouseX, mouseY);
  mouseWorld = mouseWorld.sub(cameraPosition);

  //console.log(mouseWorld.x + " "+mouseWorld.y);
  var mousePlayer = mouseWorld.sub(player.getCenter());
  //console.log(mousePlayer.x + " " + mousePlayer.y);
  if (mouseMoved) {
    mouseMoved = false;
    socket.emit('mouseMove', mousePlayer.x, mousePlayer.y);
  }


  var mouseWorldGrid = new Vec2(Math.floor(mouseWorld.x / 32), Math.floor(mouseWorld.y / 32));
  mouseWorldGrid.x = Math.max(0, Math.min(level.width, mouseWorldGrid.x));
  mouseWorldGrid.y = Math.max(0, Math.min(level.width, mouseWorldGrid.y));

  var zombieGrid = new Vec2(Math.floor(zombie.getCenter().x / 32), Math.floor(zombie.getCenter().y / 32));
  zombieGrid.x = Math.max(0, Math.min(level.width, zombieGrid.x));
  zombieGrid.y = Math.max(0, Math.min(level.width, zombieGrid.y));


  //console.log(mouseWorldGrid.x + ", " + mouseWorldGrid.y);

  ctx.strokeStyle = "#000000";
  ctx.beginPath();
  var vec3 = cameraPosition.add(player.pos);

  ctx.moveTo(vec3.x, vec3.y);

  ctx.lineTo(mouseX, mouseY);
  ctx.stroke();

  if (this.periodicTimer.trigger()) {

  }


  if (time2 > 1) {
    time2 = 0;
    //zombieList.push(new Zombie(new Vec2(100, 100)));
  }


  //level.aStarSearch(zombieGrid.x, zombieGrid.y, mouseWorldGrid.x, mouseWorldGrid.y);
  player.downKeys = keyCodeSet;
  //if (player.takeInput)
  player.updateClient(deltaTime, level);
  player.update(deltaTime, level);
  //console.log(player.vel.mag());

  player3.downKeys = keyCodeSet;

  //zombie2.update(deltaTime, level);
  //player3.update(deltaTime, level);



  //for (var i = 0; i < zombieList.length; i++) {
  //  zombieList[i].update(deltaTime, level);
  //}

  ///*
  for (var i = 0; i < bulletList.length; i++) {
    bulletList[i].update(level, deltaTime);
  }
  //*/
  var quadTree = new QuadTree(0, 0, 3200, 0);

  for (let i = 0; i < this.zombieList.length; i++) {
    let z = this.zombieList[i];
    quadTree.addEntity(z);
  }

  let playersAndZombies = this.zombieList;

  let potentialCollisions = quadTree.selectBoxes(player);
  for (let i = 0; i < potentialCollisions.length; i++) {
    if (player.isIntersecting(potentialCollisions[i])) {
      player.resolveCollision(potentialCollisions[i]);

    }
  }


  /*

  var playersAndZombies = zombieList.concat(player);

  //Build Quadtree
  var quadTree = new QuadTree(0, 0, 3200, 0);
  quadTree.addEntity(player);
  //quadTree.addEntity(player2);
  for (var j = 0; j < zombieList.length; j++) {
    quadTree.addEntity(zombieList[j]);
  }

  // Don't let players and zombies get inside each other
  for (var j = 0; j < playersAndZombies.length; j++) {
    var potentialCollisions = quadTree.selectBoxes(playersAndZombies[j]);
    //console.log(potentialCollisions.length);
    for (var i = 0; i < potentialCollisions.length; i++) {
      if (playersAndZombies[j] == potentialCollisions[i])
        continue;
      if (playersAndZombies[j].isIntersecting(potentialCollisions[i])) {
        playersAndZombies[j].resolveCollision(potentialCollisions[i]);

      }
    }
  }

  */


  /*
  //Bullets hitting zombies
  for (var j = 0; j < bulletList.length; j++) {
    //console.log(bulletList[j]);
    if (bulletList[j].remove == true)
      continue;

    var potentialCollisions = quadTree.selectPoints(bulletList[j].pos);
    //console.log(potentialCollisions.length);
    label1:
      for (var i = 0; i < potentialCollisions.length; i++) {
        if (potentialCollisions[i] == player)
          continue;

        var samples = 8;
        var step = 1 / samples;

        for (var k = 0, fraction = 0.0; k < samples; k++, fraction += step) {

          if (potentialCollisions[i].isPointIntersecting2(bulletList[j].pos.add(bulletList[j].vel.mul(deltaTime * fraction)))) {
            potentialCollisions[i].health -= bulletList[j].damage;
            bulletList[j].remove = true;
            break label1;
          }


        }

      }



  }
  */


  //Remove entites



  //Remove dead zombies
  /*
  for (var i = 0; i < zombieList.length; i++) {
    if (zombieList[i].remove) {
      zombieList.splice(i, 1);
      i--;
    }
  }
  */

  //rendering

  level.draw(cameraPosition, ctx.canvas.width, ctx.canvas.height);
  //level.aStarDraw(cameraPosition);

  for (var i = 0; i < guns.length; i++) {
    guns[i].draw(cameraPosition);
  }

  var cameraPosAndBox = {
    pos: cameraPosition.mul(-1),
    width: cameraBox.x,
    height: cameraBox.y,
  }

  /*
  var potentialCollisions = quadTree.selectBoxes(cameraPosAndBox);
  for (var i = 0; i < potentialCollisions.length; i++) {
    potentialCollisions[i].draw(cameraPosition);
  }
  */

  for (var i = 0; i < zombieList.length; i++) {
    zombieList[i].draw(cameraPosition);
  }

  //for (var i = 0; i < players.length; i++) {
    //players[i].draw(cameraPosition);
  //}

  for (var key of players.keys()) {
    //console.log(key);
    players.get(key).draw(cameraPosition);
  }

  for (var i = 0; i < bulletList.length; i++) {
    bulletList[i].draw(ctx, cameraPosition, cameraBox);
  }

  player.draw(cameraPosition);

  /*
  for (var i = 0; i < 32; i++) {
    var vec = cameraPosition.add(positionBufferClient[i]);
    vec.x = Math.floor(vec.x);
    vec.y = Math.floor(vec.y);

    ctx.save();
    ctx.translate(vec.x, vec.y);

    ctx.strokeRect(0, 0, 64, 64);

    ctx.translate(+64 * 0.5, +64 * 0.5);
    ctx.restore();
  }
  */

  //ctx.strokeStyle = "#000000"
  //player2.draw(cameraPosition);
  //ctx.strokeStyle = "#00FF00"
  //player3.draw(cameraPosition);
  //quadTree.drawQuads(cameraPosition);

  //ctx.strokeStyle="#0000FF"
  //player.ghost.draw(cameraPosition);
  //ctx.fillStyle = "#00FF00";
  //for (var n of zombie.path) {
  //  ctx.fillRect(cameraPosition.x + n.x*level.tileSize, cameraPosition.y+n.y*level.tileSize,level.tileSize,level.tileSize);
  //}

  //Draw HUD

  ctx.font = "30px Verdana";
  //ctx.font = "30px Impact";
  ctx.textAlign = "center";
  ctx.fillText("Day X " + zombieList.length + " " + bulletList.length + " " + players.size, ctx.canvas.width / 2, 50);

  ctx.textAlign = "left";
  ctx.fillText("Abilities", 20, ctx.canvas.height - 20);

  ctx.textAlign = "right";
  ctx.fillText("Ammo: " + player.activeWeapon.ammo, ctx.canvas.width - 20, ctx.canvas.height - 20);


  lastDownKeys = currentDownKeys;
}





function onKeyDown(event) {
  if (player.takeInput) {
    keyCodeSet.add(event.keyCode);
    onKeyDownCodeSet.add(event.keyCode);
  }
  //console.log("KeyDown " + event.keyCode);

}



function onKeyUp(event) {

  if (player.takeInput) {
    keyCodeSet.delete(event.keyCode);
    socket.emit('keyUp', event.keyCode);
  }
  console.log("KeyUp");
}

// Take input
function onMouseWheel(event) {
  console.log("Wheel");
  player.swapWeapon();
}

function onMouseDown(event) {
  //console.log("Up");
  var x = event.x;
  var y = event.y;

  x -= c.offsetLeft;
  y -= c.offsetTop;

  mouseX1 = x;
  mouseY1 = y;
  mouseDown = true;
  socket.emit('mouseDown', event.which);
  if (event.which == 1) {

  }

}

function onMouseUp(event) {
  //console.log("Up");
  var x = event.x;
  var y = event.y;

  x -= c.offsetLeft;
  y -= c.offsetTop;

  mouseX2 = x;
  mouseY2 = y;
  mouseDown = false;
  socket.emit('mouseUp', event.which);
  //console.log("Up");
  if (event.which == 1) {

  }
}

function onMouseMove(event) {
  mouseX = event.pageX / scaleFitNative;
  mouseY = event.pageY / scaleFitNative;

  mouseMoved = true;
  //console.log(mouseX + " "+mouseY);
  //transform mouse position into world space
  //make relative to player
}