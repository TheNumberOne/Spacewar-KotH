function RighthandedSpasms_setup(team) {
	var botVars = {};

	botVars["color"] = team;

	return botVars;
}

function RighthandedSpasms_getActions(gameInfo, botVars) {
	var actions = [];

	if (gameInfo[botVars["color"]+"_alive"]) {
		if (Math.random() > 0.5) { actions.push("turn right") }
		if (Math.random() > 0.5) { actions.push("fire engine") }
		if (Math.random() > 0.8) { actions.push("fire missile") }
	}

	return actions;
}


module.exports = {setup: RighthandedSpasms_setup, getActions: RighthandedSpasms_getActions};
