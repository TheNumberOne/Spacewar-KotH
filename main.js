"use strict";

var fs = require('fs');

var Game = require('./game_engine');

var game;

var renderLoop;
var accelerated = 0;

var players = [];

var redPlayer = "Helios";
var bluePlayer = "HYPER";
var redVars = {};
var blueVars = {};
var uniqueRedActions;
var uniqueBlueActions;
var redWins = 0;
var blueWins = 0;

var theGame;
var numGames = 20;
var inProgress = 0;
var isDone = 0;
var runAll = 0;

var vs = 20;
var hs = 25;
var charw = 8;
var charh = 12;
var maxlen = 20;
var q = charw*maxlen;

function update() {
	if (game.gameOver) { return true; }

	moveShips();

	return game.updateGame();

}

function playGame() {
	redVars = require('./bots/bot_' + redPlayer).setup('red');
	blueVars = require('./bots/bot_' + bluePlayer).setup('blue');
	game = new Game();
	while (!update());

	console.log("Red: " + game.red.score);
	console.log("Blue: " + game.blue.score);
}

function moveShips() {
	var i;

	uniqueRedActions = [""];
	var redActions = require('./bots/bot_' + redPlayer).getActions(game.gameInfo,redVars);
	if (redActions.indexOf("hyperspace") > -1) {
		uniqueRedActions.push("hyperspace");
	} else {
		for ( i=0; i<redActions.length; i++) {
			if (redActions.indexOf(redActions[i]) == i) { uniqueRedActions.push(redActions[i]); }
		}
	}
	game.teamMove("red",uniqueRedActions);

	uniqueBlueActions = [""];
	var blueActions = require('./bots/bot_' + bluePlayer).getActions(game.gameInfo,redVars);
	if (blueActions.indexOf("hyperspace") > -1) {
		uniqueBlueActions.push("hyperspace");
	} else {
		for ( i=0; i<blueActions.length; i++) {
			if (blueActions.indexOf(blueActions[i]) == i) { uniqueBlueActions.push(blueActions[i]); }
		}
	}
	game.teamMove("blue",uniqueBlueActions);
}

var fileNames = fs.readdirSync('./bots');
var players = [];
for (var i = 0; i < fileNames.length; i++) {
	var name = fileNames[i];
	players.push(name.substring(4, name.length - 3));
}
console.log(players);

for (var i = 0; i < players.length; i++) {
	for (var j = 0; j < players.length; j++) {
		if (i == j) {
			continue;
		}
		redPlayer = players[i];
		bluePlayer = players[j];
		playGame();
	}
}
