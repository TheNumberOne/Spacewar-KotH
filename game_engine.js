"use strict";

var shipShapes = {
	'full ship': [[-8,16],[0,-8],[8,16]],
	'left wing': [[-8,16],[0,-8],[4,4],[0,8],[0,16]],
	'right wing':[[-4,4],[0,-8],[8,16],[0,16],[0,8]],
	'nose only': [[-4,4],[0,-8],[4,4],[0,8]]
};
var engineFlame = {
	'full ship':[[[-4,16],[0,20],[4,16]],[[-4,16],[0,24],[4,16]]],
	'left wing':[[[-4,16],[0,20],[0,16]],[[-4,16],[0,24],[0,16]]],
	'right wing':[[[0,16],[0,20],[4,16]],[[0,16],[0,24],[4,16]]],
};

var fieldWidth = 800;
var fieldHeight = 600;

var sun = {"cx":fieldWidth/2, "cy":fieldHeight/2, "r":5, "points":[]};
for (var i=0; i<8; i++) {
	var px = sun.cx+sun.r*Math.cos(i*Math.PI/4);
	var py = sun.cy+sun.r*Math.sin(i*Math.PI/4);
	sun.points.push([px,py]);
}

var missileTimeout = 75; //75 frames, 2250 ms;
var missileSpeed = 10;
var fireRateLimit = 4; //3 frames, 120 ms
var missileMax = 20;

var gravityStrength = 1*5000;
var speedLimit = 15; //engine propulsion
var maxSpeed = 40; //gravity-boosted
var engineThrust = 0.30;

var overideHyperspace = null; // if you wish to disable hyperspace death, set this to 0.

var hyperDuration = 34; //34 frames, 1020 ms
var deathDuration = 34; //34 frames, 1020 ms

var gameDuration = 3000; //3000 frames, 90 seconds

//new

function Game() {
	this.red = {"color":"red", score: 0};
	this.blue = {"color":"blue", score: 0};
	this.teams = [this.red, this.blue];

	this.gameInfo = {
		fieldWidth: fieldWidth,
		fieldHeight: fieldHeight,
		gravityStrength: gravityStrength,
		speedLimit: speedLimit,
		maxSpeed: maxSpeed,
		engineThrust: engineThrust,
		redScore: 0,
		blueScore: 0,
		timeLeft: gameDuration,
		sun_x: sun.cx,
		sun_y: sun.cy,
		sun_r: sun.r
	};
	this.gameOver = false;
	this.frameCount = 0;

	this.setupGame(true);
}

Game.prototype.getRemainingTime = function () {
	var remainingFrames = gameDuration - this.frameCount;
	if (remainingFrames > 0) {
		return Math.floor((remainingFrames/(100/3))/60)+":"+(("00"+Math.floor(remainingFrames/(100/3))%60).slice(-2));
	} else {
		return "GAME OVER";
	}
};

Math.radians = function(degrees) { return degrees * Math.PI / 180; };
Math.degrees = function(radians) { return radians * 180 / Math.PI; };

Game.prototype.setupGame = function (start) {
	this.restartFrame = false;

	var red = this.red;
	var blue = this.blue;

	red.x = 50;
	red.y = Math.floor((fieldHeight-100)*Math.random())+50;
	red.rot = 90;
	red.deadColor = "#FF8888";

	blue.x = fieldWidth-50;
	blue.y = Math.floor((fieldHeight-100)*Math.random())+50;
	blue.rot = -90;
	blue.deadColor = "#8888FF";

	var gameInfo = this.gameInfo;

	this.teams.forEach(function(ship){
		ship.xv = 0.0;
		ship.yv = 0.0;
		ship.fireFrame = -1;
		ship.missileReady = true;
		ship.missileStock = missileMax;
		ship.updateShape = true;
		ship.shape = "full ship";
		ship.thrust = engineThrust;
		ship.flame = 0;
		ship.turnRate = 5;

		ship.deathFrame = false;
		ship.hyperFrame = false;
		ship.exploded = false;
		ship.alive = true;

		["x","y","rot","xv","yv","shape","missileStock","exploded","alive"].forEach(function(attr){
			gameInfo[ship.color+"_"+attr] = ship[attr];
		});

	});

	this.missiles = [];
	this.gameInfo.missiles = this.missiles;
	this.debris = [];
};

Game.prototype.updateGame = function () {
	if (this.frameCount > gameDuration || this.restartFrame && this.frameCount - this.restartFrame > 100) {
		this.gameOver = true;
		return true;
	}

	var filteredMissiles = [];
	for (var i=0; i < this.missiles.length; i++) {
		var m = this.missiles[i];
		if (this.frameCount - m.frameNum > missileTimeout){ m.live = false; }

		if (m.live) {
			filteredMissiles.push(m);
		}
	}
	this.missiles = filteredMissiles;

	if (this.frameCount - this.red.fireFrame > fireRateLimit) { this.red.missileReady = true; }
	if (this.frameCount - this.blue.fireFrame > fireRateLimit) { this.blue.missileReady = true; }

	this.updatePositions(false);

	var gameInfo = this.gameInfo;

	this.teams.forEach(function(ship){
		["x","y","rot","xv","yv","shape","missileStock","exploded","alive"].forEach(function(attr){
			gameInfo[ship.color+"_"+attr] = ship[attr];
		});
		gameInfo[ship.color+"_inHyperspace"] = ship.hyperFrame ? true : false;
	});

	gameInfo.missiles = [];
	this.missiles.forEach(function(m){
		gameInfo.missiles.push({"x":m.x,"y":m.y,"xv":m.xv,"yv":m.yv,});
	});
	gameInfo.numMissiles = this.missiles.length;

	gameInfo.redScore = this.red.score;
	gameInfo.blueScore = this.blue.score;
	gameInfo.timeLeft = this.frameCount;//Math.floor((gameDuration - frameCount)/30);

	this.frameCount++;
	return false;

};

Game.prototype.updatePositions = function () {

	var teams = this.teams;
	var self = this;

	teams.forEach(function(ship){
		if (ship.alive && !ship.hyperFrame) {
			var dx = ship.x - sun.cx;
			var dy = ship.y - sun.cy;
			var dis = Math.sqrt(dx*dx+dy*dy);
			var force;
			if (dx*dx+dy*dy > 5){
				force = gravityStrength / (dx*dx+dy*dy);
			} else {
				force = gravityStrength/5;
			}
			ship.xv += -force*dx/dis;
			ship.yv += -force*dy/dis;

			var speed = ship.xv*ship.xv + ship.yv*ship.yv;
			if (speed > maxSpeed*maxSpeed) {
				ship.xv = maxSpeed*ship.xv/Math.sqrt(speed);
				ship.yv = maxSpeed*ship.yv/Math.sqrt(speed);
			}

			self.checkShipSunCollision(ship);

			if (ship.rot > 180) {
				ship.rot -= 360;
			} else if (ship.rot < -180) {
				ship.rot += 360;
			}
		}
	});

	this.checkShipShipCollision(teams[0],teams[1]);

	this.missiles.forEach(function(m){
		var dx = m.x - sun.cx;
		var dy = m.y - sun.cy;
		var dis = Math.sqrt(dx*dx+dy*dy);
		var force;
		if (dx*dx+dy*dy > 5){
			force = gravityStrength / (dx*dx+dy*dy);
		} else {
			force = gravityStrength/5;
		}
		m.xv += -force*dx/dis;
		m.yv += -force*dy/dis;

		var speed = m.xv*m.xv + m.yv*m.yv;
		if (speed > maxSpeed*maxSpeed*2) {
			m.xv = 1.414*maxSpeed*m.xv/Math.sqrt(speed);
			m.yv = 1.414*maxSpeed*m.yv/Math.sqrt(speed);
		}

		self.checkMissileCollision(m, "sun");
		self.checkMissileCollision(m, "red");
		self.checkMissileCollision(m, "blue");
	});

	teams.forEach(function(ship){
		if (!ship.hyperFrame) {
			if (!ship.exploded) {
				ship.x += ship.xv;
				ship.x = (ship.x+fieldWidth)%fieldWidth;
				ship.y += ship.yv;
				ship.y = (ship.y+fieldHeight)%fieldHeight;
			}

			if (!ship.alive) {
				if (!ship.deathFrame) {
					ship.deathFrame = self.frameCount;
					self.restartFrame = self.frameCount;

					if (ship.color === "red") {
						self.blue.score += 1;
					} else if (ship.color === "blue") {
						self.red.score += 1;
					}
				}

				ship.xv = 0;
				ship.yv = 0;
			}
		} else if (self.frameCount - ship.hyperFrame > hyperDuration) {
			ship.x = Math.random()*(fieldWidth-100)+50;
			ship.y = Math.random()*(fieldHeight-100)+50;
			ship.xv = 0;
			ship.yv = 0;
			var deathChance = overideHyperspace === null ? (ship.shape === "full ship" ? 0.25 : 0.5) : overideHyperspace;
			if (Math.random() < deathChance) { ship.alive = false; }
			ship.hyperFrame = false;
		} else {
			ship.x = -200;
			ship.y = -200;
			ship.xv = 0;
			ship.yv = 0;
		}
	});

	this.missiles.forEach(function(m){
		if (m.live) {
			m.x = (m.x+m.xv+fieldWidth)%fieldWidth;
			m.y = (m.y+m.yv+fieldHeight)%fieldHeight;
		}
	});
};

Game.prototype.teamMove = function (team, actions) {
	if (this.gameOver){ return; }

	var ship = this[team];
	var engineFired = 0;
	var self = this;

	actions.forEach(function(action){
		if (ship.alive && !ship.hyperFrame) {
			if (ship.shape === "nose only" && action !== "fire missile") { return; }
			switch (action){
				case "fire engine":
					ship.flame = ship.flame ? 3-ship.flame : 1;
					self.fireEngine(ship);
					engineFired = 1;
					break;
				case "fire missile":
					if (self.frameCount - ship.fireFrame > fireRateLimit && ship.missileReady && ship.missileStock) {
						ship.fireFrame = self.frameCount;
						ship.missileReady = false;
						ship.missileStock -= 1;
						self.fireMissile(ship);
					}
					break;
				case "turn right":
					ship.rot = ship.rot + ship.turnRate;
					break;
				case "turn left":
					ship.rot = ship.rot - ship.turnRate;
					break;
				case "hyperspace":
					ship.hyperFrame = self.frameCount;
					break;
			}
		}
	});

	if (!engineFired) { ship.flame = 0; }
};

Game.prototype.fireEngine = function (ship) {
	var speed = ship.xv*ship.xv + ship.yv*ship.yv;

	var nxv = ship.xv + ship.thrust*Math.cos(Math.radians(ship.rot-90));
	var nyv = ship.yv + ship.thrust*Math.sin(Math.radians(ship.rot-90));
	var speed2 = nxv*nxv + nyv*nyv;
	var speedLimit = this.speedLimit;
	if (speed < speedLimit*speedLimit || speed2 < speed) { //either slow enough or slowing down
		ship.xv = nxv;
		ship.yv = nyv;

		if (speed2 > speed && speed2 > speedLimit*speedLimit) {
			ship.xv = speedLimit*ship.xv/Math.sqrt(speed2);
			ship.yv = speedLimit*ship.yv/Math.sqrt(speed2);
		}
	} else {
		ship.xv = Math.sqrt(speed)*nxv/Math.sqrt(speed2);
		ship.yv = Math.sqrt(speed)*nyv/Math.sqrt(speed2);
	}
};

Game.prototype.checkShipSunCollision = function (ship, checkOnly) {
	checkOnly = typeof a !== 'undefined' ? checkOnly : false; //http://stackoverflow.com/a/894877/1473772

	var sPoints = this.getShipCoords(ship);
	var speed = Math.sqrt(ship.xv*ship.xv+ship.yv*ship.yv);
	var num = Math.ceil(speed);

	var dx = sun.cx - ship.x;
	var dy = sun.cy - ship.y;
	var dis = Math.sqrt(dx*dx+dy*dy);
	if (dis > 40) { return; } //pointless to check for a collision if they're far apart

	var tPoints = sun.points;

	for (var i=0; i<=num; i++) {
		var f = i/num;

		for (var j=0; j<sPoints.length; j++) {
			var j2 = (j+1)%sPoints.length;
			var sx1 = sPoints[j][0] + f*ship.xv;
			var sy1 = sPoints[j][1] + f*ship.yv;
			var sx2 = sPoints[j2][0] + f*ship.xv;
			var sy2 = sPoints[j2][1] + f*ship.yv;
			var L1 = [[sx1,sy1],[sx2,sy2]];

			for (var k=0; k<tPoints.length; k++) {
				var k2 = (k+1)%tPoints.length;
				var tx1 = tPoints[k][0];
				var ty1 = tPoints[k][1];
				var tx2 = tPoints[k2][0];
				var ty2 = tPoints[k2][1];
				var L2 = [[tx1,ty1],[tx2,ty2]];

				var intersection = lineIntersection(L1,L2);
				if (intersection.length) {
					if (checkOnly) {return true;}

					ship.xv *= f;
					ship.yv *= f;
					ship.alive = false;
					return;
				}
			}
		}
	}

	if (checkOnly) {return false;}

};

Game.prototype.checkShipShipCollision = function (ship1, ship2) {
	var sPoints = this.getShipCoords(ship1);
	var tPoints = this.getShipCoords(ship2);
	var speed1 = Math.sqrt(ship1.xv*ship1.xv+ship1.yv*ship1.yv);
	var speed2 = Math.sqrt(ship2.xv*ship2.xv+ship2.yv*ship2.yv);
	var num = Math.max(Math.ceil(speed1), Math.ceil(speed2));

	var dx = ship1.x - ship2.x;
	var dy = ship1.y - ship2.y;
	var dis = Math.sqrt(dx*dx+dy*dy);
	if (dis > 40) { return; } //pointless to check for a collision if they're far apart

	for (var i=0; i<=num; i++) {
		var f = i/num;

		var states = [];

		for (var j=0; j<sPoints.length; j++) {
			var j2 = (j+1)%sPoints.length;
			var sx1 = sPoints[j][0] + f*ship1.xv;
			var sy1 = sPoints[j][1] + f*ship1.yv;
			var sx2 = sPoints[j2][0] + f*ship1.xv;
			var sy2 = sPoints[j2][1] + f*ship1.yv;
			var L1 = [[sx1,sy1],[sx2,sy2]];

			for (var k=0; k<tPoints.length; k++) {
				var k2 = (k+1)%tPoints.length;
				var tx1 = tPoints[k][0] + f*ship2.xv;
				var ty1 = tPoints[k][1] + f*ship2.yv;
				var tx2 = tPoints[k2][0] + f*ship2.xv;
				var ty2 = tPoints[k2][1] + f*ship2.yv;
				var L2 = [[tx1,ty1],[tx2,ty2]];

				var intersection = lineIntersection(L1,L2);
				if (intersection.length) {
					var state1 = this.identifyDamage(ship1, j, intersection[1][0]);
					var state2 = this.identifyDamage(ship2, k, intersection[1][1]);
					states.push([state1,state2]);
				}
			}
		}

		if (states.length) {
			var priority = ["",""];
			for (var s=0; s<states.length; s++) {
				if (priority[0] !== "dead") {
					priority[0] = states[s][0];
				}
				if (priority[1] !== "dead") {
					priority[1] = states[s][1];
				}
			}

			if (priority[0] === "dead" && priority[1] !== "dead") {
				priority[0] = "";
			} else if (priority[1] === "dead" && priority[0] !== "dead") {
				priority[1] = "";
			}

			var debrisType;
			switch (priority[0]) {
				case "dead":
					ship1.alive = false;
					break;
				case "left wing":
					break;
				case "right wing":
					break;
				case "nose only":
					break;
			}
			switch (priority[1]) {
				case "dead":
					ship2.alive = false;
					break;
				case "left wing":
					break;
				case "right wing":
					break;
				case "nose only":
					break;
			}

			if (priority[0] !== "" && priority[0] !== "dead" && priority[0] !== ship1.shape) {
				ship1.shape = priority[0];
				ship1.updateShape = true;
			}
			if (priority[1] !== "" && priority[1] !== "dead" && priority[1] !== ship2.shape) {
				ship2.shape = priority[1];
				ship2.updateShape = true;
			}

			return;
		}
	}

};

Game.prototype.getShipCoords = function (ship) {
	if (typeof(ship) === "string") { ship = this[ship]; }

	var sPoints = shipShapes[ship.shape];
	var tPoints = [];

	for (var i=0; i<sPoints.length; i++) {
		var x = (sPoints[i][0]*Math.cos(Math.radians(ship.rot))-sPoints[i][1]*Math.sin(Math.radians(ship.rot))) + ship.x;
		var y = (sPoints[i][0]*Math.sin(Math.radians(ship.rot))+sPoints[i][1]*Math.cos(Math.radians(ship.rot))) + ship.y;
		tPoints.push([x,y]);
	}

	return tPoints;
};

Game.prototype.fireMissile = function (ship) {
	var mx,my,mxv,myv;
	mx = ship.x + 10*Math.cos(Math.radians(ship.rot-90)); //adjusted to appear at the tip of the nose
	my = ship.y + 10*Math.sin(Math.radians(ship.rot-90));
	mxv = ship.xv + missileSpeed*Math.cos(Math.radians(ship.rot-90));
	myv = ship.yv + missileSpeed*Math.sin(Math.radians(ship.rot-90));

	var dx = sun.x - mx;
	var dy = sun.y - my;
	var dis = Math.sqrt(dx*dx+dy*dy);
	if (dis <= sun.r || this.checkShipSunCollision(ship,true)) { return; }

	this.missiles.push({'x':mx, 'y':my, 'xv':mxv, 'yv':myv, 'frameNum':this.frameCount, 'live':true, 'id':this.missiles.length+1});
};

Game.prototype.checkMissileCollision = function (m, obj) {
	var len, i, L1, L2, intersection;                      //JSHint made me.

	if (obj === "sun") {
		var points = sun.points;
		L1 = [[m.x,m.y],[m.x+m.xv,m.y+m.yv]];
		len = points.length;

		for (i=0; i<len; i++) {
			L2 = [[points[i][0],points[i][1]], [points[(i+1)%len][0],points[(i+1)%len][1]]];
			intersection = lineIntersection(L1, L2);

			if (intersection.length) { m.live = false; }
		}
	} else if (obj === "red" || obj === "blue") {
		var ship = this[obj];

		var sPoints = this.getShipCoords(ship);
		len = sPoints.length;
		var num = Math.ceil(1+Math.sqrt(ship.xv*ship.xv+ship.yv*ship.yv));

		for (i=0; i<num; i++) {
			var f = i/num;
			var mx1 = m.x + f*m.xv;
			var my1 = m.y + f*m.yv;
			var mx2 = m.x + (i+1)/num*m.xv;
			var my2 = m.y + (i+1)/num*m.yv;
			L1 = [[mx1,my1],[mx2,my2]];

			var closestIntersection = [];

			for (var j=0; j<len; j++) {
				var j2 = (j+1)%len;
				var sx1 = sPoints[j][0] + f*ship.xv;
				var sy1 = sPoints[j][1] + f*ship.yv;
				var sx2 = sPoints[j2][0] + f*ship.xv;
				var sy2 = sPoints[j2][1] + f*ship.yv;
				L2 = [[sx1,sy1],[sx2,sy2]];
				intersection = lineIntersection(L1, L2);

				if (intersection.length) {
					if (!closestIntersection.length || (intersection[1][0] < closestIntersection[1][0])) {
						closestIntersection = intersection;
						closestIntersection.push(j);
					}
				}
			}

			if (closestIntersection.length) {
				m.live = false;
				if (!ship.alive){return;}

				var state = this.identifyDamage(ship, closestIntersection[2], closestIntersection[1][1]);
				if (state) {
					var debrisType;
					switch (state) {
						case "dead":
							ship.alive = false;
							break;
						case "left wing":
							break;
						case "right wing":
							break;
						case "nose only":
							break;
					}

					if (state !== "dead") {
						ship.shape = state;
						ship.updateShape = true;
					}
				}

				if (!ship.alive){
					ship.xv *= f;
					ship.yv *= f;
				}

				return;
			}
		}
	}
};

Game.prototype.identifyDamage = function (ship, which, where) {
	var state;

	if (ship.shape === "full ship") {
		switch(which) {
			case 0:
				if (where > 0.5) { //hit on the nose
					state = "dead";
				} else {
					state = "right wing";
				}
				break;
			case 1:
				if (where < 0.5) { //hit on the nose
					state = "dead";
				} else {
					state = "left wing";
				}
				break;
			case 2:
				if (where < 0.5) { //hit on the right side
					state = "left wing";
				} else {
					state = "right wing";
				}
				break;
		}
	} else if (ship.shape === "left wing") {
		switch(which) {
			case 0:
				if (where > 0.5) { //hit on the nose
					state = "dead";
				} else {
					state = "nose only";
				}
				break;
			case 1:
			case 2:
				state = "dead";
				break;
			case 3:
			case 4:
				state = "nose only";
				break;
		}
	} else if (ship.shape === "right wing") {
		switch(which) {
			case 1:
				if (where < 0.5) { //hit on the nose
					state = "dead";
				} else {
					state = "nose only";
				}
				break;
			case 0:
			case 4:
				state = "dead";
				break;
			case 2:
			case 3:
				state = "nose only";
				break;
		}
	} else if (ship.shape === "nose only") {
		state = "dead";
	}

	return state;

};


function lineIntersection(L1, L2) {
	// from http://stackoverflow.com/a/565282/1473772
	var p = L1[0];
	var r = [L1[1][0]-L1[0][0], L1[1][1]-L1[0][1]];
	var q = L2[0];
	var s = [L2[1][0]-L2[0][0], L2[1][1]-L2[0][1]];

	var rcs = r[0]*s[1] - s[0]*r[1]; //r cross s
	var qmp = [q[0]-p[0],q[1]-p[1]]; //q minus p
	var qmpcr = qmp[0]*r[1] - r[0]*qmp[1]; //(q minus p) cross r
	var qmpcs = qmp[0]*s[1] - s[0]*qmp[1]; //(q minus p) cross s

	if (rcs === 0) { //they're parallel/colinear
		return []; //I'm just going to assume that overlapping colinear lines don't happen
	} else { //not parallel
		var t = qmpcs/rcs;
		var u = qmpcr/rcs;

		if (0 <= t && t <= 1 && 0 <= u && u <= 1) { //intersection exists
			var intx = p[0] + t*r[0];
			var inty = p[1] + t*r[1];
			return [[intx,inty],[t,u]];
		} else { //no intersection
			return [];
		}
	}
}

module.exports = Game;

global.LineIntersection = lineIntersection;
global.window = {shipShapes: shipShapes};
