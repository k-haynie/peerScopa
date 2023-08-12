// host.js
// variables for host
export let host = false;
export let openRoom = true;
export let peers = [];
export let gameStats = {};
export let field = [];
export let cards = [];

// initialize the host display
export async function startHost() {
	host = true;
	body.innerHTML = `
	<h1>You are the Game Host!</h1>
	<h4 id="peerDisplay"></h4>
	<ul id="connectedPeers"></ul>
	<button onclick="startGame()">Start Game</button>
	`;
	// need to make asynchronous 
	await publishID();
};

// publish the host ID to the interface
export async function publishID() {
	let visualTag = document.getElementById("peerDisplay");
	if (visualTag) {visualTag.innerText += "You are " + peer.id;};
	peers.push(peer.id);
};

export const gameOver = () => {
	let totalPoints = [];
	Object.keys(gameStats).forEach(player => {totalPoints.push(gameStats[player].points)});
	return totalPoints.some(score => score >= 14);
}

// start a game with valid players
export async function startGame() {
	console.log(peers.length)
	if (1 >= peers.length || peers.length > 4) {
		alert("You need 2-4 players to start a game.");
	}
	else {
		// create a player identity for each player and close off the room
		peers.forEach(peer => gameStats[peer] = player); // map connections to players
		openRoom = false;

		while (!gameOver()) {
			cards = [...Array(40).keys()];
			// shuffle the cards with Fisher-Yates
			for (let i = 39; i > 0; --i) {
				const j = Math.floor(Math.random() * (i + 1));
				[cards[i], cards[j]] = [cards[j], cards[i]];
			};
			
			// deal 3 cards & populate the field
			populateField();
			let fieldString = "";
			field.forEach(card => {fieldString += card.toString() + "."});
			broadcast(`FIELD${fieldString}`);
			publishField();
			
			let activePlayerIndex = 1;
			
			while (cards) {
				dealCards();
				broadcast("GO");
				
				while (hand) {
					turnCompleted = false;
					
					if (activePlayerIndex === 0) {
					 // host's turn
						turn = true;
						alert("Your turn!");
					} 
					else {
						peers[activePlayerIndex].send("CHOOSE");
						// wait for the player to complete their turn
						// let asdf = prompt("nonoverloading");
						await waitUntil(() => turnCompleted);
						
						
					}
				};
			};
			
			// tally the score
			// most cards, most tricks, most 7s, most hearts, the 7 of hearts
			
			// hearts can be 0-9
			// should create an ordered list cards each player has. Look up a way to find the index of the max value and resolve for a tie
			let mostCards = gameStats.forEach(player => {return sum(player.tricks.forEach(trick => {return sum(trick.length)}))});
			let mostTricks = gameStats.forEach(player => {return sum(player.tricks)});
			let mostHearts = gameStats.forEach(player => {return sum(player.tricks.forEach(trick => {return sum(trick.forEach(card => int(card) < 10 ? card : pass))}))});
			let mostSevens = gameStats.forEach(player => {return sum(player.tricks.forEach(trick => {return sum(trick.forEach(card => int(card) % 6 === 0 ? card : pass))}))});
			let sevenHearts = gameStats.forEach(player => {return bool(player.tricks.forEach(trick => {return bool(trick.forEach(card => int(card) === 6 ? True : pass))}))});
			
			// update Stats here			
		}
	}
}

export const waitUntil = (condition, checkInterval=100) => {
    return new Promise(resolve => {
        let interval = setInterval(() => {
            if (!condition()) return;
            clearInterval(interval);
            resolve();
        }, checkInterval)
    })
}

// populate the 4-card playing field
export function populateField() {
	for (let i = 0; i < 4; ++i) {
		field.push(cards.pop());
	}
}

// deal 3 cards to each player
export function dealCards() {
	for (let i = 0; i < 3; ++i) {
		peers.forEach(peer => {
			console.log("dealing")
			typeof(peer) === "string" ? hand.push(cards.pop()) : peer.send(`DEAL${cards.pop()}`);
		})			
	}
}

// send a message to all players
export function broadcast(msg) {
	console.log("Broadcasting " + msg);
	peers.forEach(peer => {
		if (typeof(peer) != "string") {
			console.log(peer, typeof(peer));
			peer.send(msg);
		}
	})
}

export function publishField(data) {
	body.innerHTML = `
	<ul id="cardField"></ul>
	<select id="cardHand"></select>
	<button onclick="playerTurn()">Go</button>`;
	let cardField = document.getElementById("cardField");
	let actualData = data.slice(5).slice(0, -1);
	console.log(actualData);
	actualData.split(".").forEach(card => cardField.innerHTML += `<li><input type="checkbox">${Number(card)%10}</input></li>`);
}