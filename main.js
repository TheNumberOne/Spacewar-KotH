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
var numGames = 10;
var inProgress = 0;
var isDone = 0;
var runAll = 0;

var vs = 20;
var hs = 25;
var charw = 8;
var charh = 12;
var maxlen = 20;
var q = charw*maxlen;

var leaderboard = {};

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

	var tie = game.red.score == game.blue.score;

	if (!leaderboard[redPlayer]) {
		leaderboard[redPlayer] = {};
	}
	if (!leaderboard[redPlayer][bluePlayer]) {
		leaderboard[redPlayer][bluePlayer] = {wins: 0, losses: 0, ties: 0};
	}

	leaderboard[redPlayer][bluePlayer].wins += !tie && game.red.score;
	leaderboard[redPlayer][bluePlayer].losses += !tie && game.blue.score;
	leaderboard[redPlayer][bluePlayer].ties += tie;

	if (!leaderboard[bluePlayer]) {
		leaderboard[bluePlayer] = {};
	}
	if (!leaderboard[bluePlayer][redPlayer]) {
		leaderboard[bluePlayer][redPlayer] = {wins: 0, losses: 0, ties: 0};
	}

	leaderboard[bluePlayer][redPlayer].wins += !tie && game.blue.score;
	leaderboard[bluePlayer][redPlayer].losses += !tie && game.red.score;
	leaderboard[bluePlayer][redPlayer].ties += tie;

	console.log(redPlayer + " vs " + bluePlayer + ":", tie ? "Tie!" : (game.red.score ? redPlayer : bluePlayer) + " won!" );
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
	var blueActions = require('./bots/bot_' + bluePlayer).getActions(game.gameInfo,blueVars);
	if (blueActions.indexOf("hyperspace") > -1) {
		uniqueBlueActions.push("hyperspace");
	} else {
		for ( i=0; i<blueActions.length; i++) {
			if (blueActions.indexOf(blueActions[i]) == i) { uniqueBlueActions.push(blueActions[i]); }
		}
	}
	game.teamMove("blue",uniqueBlueActions);
}

global.getShipCoords = function(color){game.getShipCoords(color);};

var fileNames = fs.readdirSync('./bots');
var players = [];
for (var i = 0; i < fileNames.length; i++) {
	var name = fileNames[i];
	players.push(name.substring(4, name.length - 3));
}

for (var i = 0; i < players.length; i++) {
	for (var j = 0; j < players.length; j++) {
		if (i == j) {
			continue;
		}
		redPlayer = players[i];
		bluePlayer = players[j];
		for (var k = 0; k < numGames; k++) {
			playGame();
		}
	}
}

console.log(leaderboard);

var scores = {};

for (var i = 0; i < players.length; i++) {
	var name = players[i];
	var total = 0;
	//http://stackoverflow.com/a/897463/4230423
	var M = 0.0;
	var S = 0.0;
	var k = 1;
	for (var opponent in leaderboard[name]) {
		var wins = leaderboard[name][opponent].wins;
		var losses = leaderboard[name][opponent].losses;
		var score = (wins + 1) / (losses + 1);
		total += score;

        var tmpM = M;
        M += (score - tmpM) / k;
        S += (score - tmpM) * (score - M);
        k++;
	}

	var mean = total / (players.length - 1);
	var standardDeviation = Math.sqrt(S / (k - 1));
	scores[name] = {mean: mean, standardDeviation: standardDeviation};
}

players.sort(function(a, b) {
	if (Math.abs(scores[a].mean - scores[b].mean) > 1) {
		return scores[b].mean - scores[a].mean;
	} else {
		return scores[a].standardDeviation - scores[b].standardDeviation;
	}
});

for (var i = 0; i < players.length; i++) {
	var name = players[i];
	console.log(i + 1, name, scores[name]);
}
