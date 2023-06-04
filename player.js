// player.js
// variables for player
let connected = false;
let turn = false;
let turnCompleted = true;
let hand = [];

let player = {
	points: 0,
	tricks: []
}

function printHands() {
	let visualCards = document.getElementById("cardHand");
	hand.forEach(card => visualCards.innerHTML += `<option value=${card % 10}>${card % 10}</option>`);
}

function joinGame() {
	body.innerHTML = `
	<h3 class="headertext">Enter the following information below to join a game:</h3>
	<input id="peerID" type="text"></input>
    <button onclick="connFire()">Connect</button>
	`;
}

function playerTurn() {
	if (turn) {
		let cardField = document.getElementById("cardField");
		let fieldSelectedTotal = [];
		let handSelected = document.getElementById("cardHand");
		
		for (let i = 0; i < cardField.children.length; i++){
			if (cardField.children[i].children[0].checked)
				fieldSelectedTotal.push(cardField.children[i].childNodes[1].data);
		};		
		
		if (sum(fieldSelectedTotal) === handSelected.value || fieldSelectedTotal.length === 0) {
			console.log("You might need to redefine the peer instance in player.js :36");
			let transferData = `TURN${handSelected}/${fieldSelectedTotal.forEach(card => {return str(card) + "."})}`
			(host ? handleTurn(transferData) : conn.send(transferData));
		} 
		else {
			alert("Please make a valid choice.");
		}		
	}
	turnCompleted = true;
}

// handle a player's turn -- only called by the host
function handleTurn(turnDataRaw, conn=null) {
	let turnData = turnDataRaw.splice(4).split("/");

	// in case a card was not merely getting laid down
	if (turnData.length > 1) {
		let nonHand = turnData[1].split(".")
		
		// update the field, locally and remotely
		nonHand.forEach(card => field.splice(field.indexOf(int(card)), 1));
		broadcast(`UPDATE${turnData[1]}`);
		
		// insert the first card and remove the excess period
		nonHand.insert(0, turnData[0]);
		nonHand.pop();
		gameStats[conn].tricks.push(nonHand);		
		
		if (field.length === 0) {
			(conn ? gameStats[conn].points += 1 : gameStats[peer].points += 1);
			alert("There has been a Scopa!");
			broadcast("SCOPA");
		}			
	}
	// discard to the field, update local and remotes
	else {
		field.push(int(turnData[0]));
		cardField.innerHTML += `<li><input type="checkbox">${int(data.splice(7))%10}</input></li>`;
		broadcast(`DISCARD${turnData[0]}`);
	}
}