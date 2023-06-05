// to run offline: 
// pull up Admin CMD and use the command: peerjs --port 9000 --key peerjs --path /myapp
// var peer = new Peer({host: "localhost", port: 9000, path: "/myapp"});
// instead of linking unpkg in the .html file, link locally to the 'node_modules/peerjs/dist/peerjs.min.js' file

// general variables necessary for both host and player
var peer = new Peer();
let body = document.getElementById("body");

// callback handling - https://stackoverflow.com/questions/26958404/peerjs-peer-not-receiving-data?rq=3
// variables for host
let host = false; 			// activated if a host is initiated 
let openRoom = true; 		// boolean flag to manage connections
let peers = []; 			// list of connected peer IDs
let gameStats = {}; 		// map of RTCconnections to game statistics
let field = []; 			// list of integers of active playing cards
let cards = []; 			// list of the deck of cards

// variables for player
let connected = false; 		// either a flag or the host's ID, if connected
let turn = false; 			// boolean flag to allow/disallow turn button
let turnCompleted = true; 	// used by the host to regulate player order
let hand = []; 				// list of integers of the hand for each player

// data structure used by gameStats to map connections to statistics
let player = {
	points: 0,
	tricks: []
}

// detect when a browser is closed and destroy the peer connection
window.onunload = window.oneforunload = (e) => { (!!peer && !peer.destroyed) ? peer.destroy() : null}

// you're a lifesaver, tdxius https://stackoverflow.com/questions/22125865/how-to-wait-until-a-predicate-condition-becomes-true-in-javascript
const waitUntil = (condition, checkInterval=100) => {
    return new Promise(resolve => {
        let interval = setInterval(() => {
            if (!condition()) return;
            clearInterval(interval);
            resolve();
        }, checkInterval)
    })
};

// when a peer reaches out, allow the connection if the game is not full
peer.on('connection', (conn) => {
	let connectedPeers = document.getElementById("connectedPeers");
	
	if (peers.length === 4) {
		openRoom = false;
	} 
	else if (host && connectedPeers && !connectedPeers.innerHTML.includes(conn.peer)){
		connectedPeers.innerHTML += `<li class="players">${conn.peer}</li>`;
		peers.push(conn);
	}
	else if (!host && conn.data != "Room full") {
		connected = conn;
		body.innerHTML = `
			<h4 class="headertext">You have successfully been connected!</h4>
			<p>Awaiting the host to start the game.</p>`;
	}
	
	conn.on("open", () => {
		console.log("primary peer.on callback");

		if (!openRoom && !peers.includes(peer)) {conn.send("Room full"); return};
		
		// manage connections - other data is handled in connFire
		conn.on("data", (data) => {
			// reject data if trying to connect to a closed-off host
			if (!host && (connected == false)) {console.log("Not connected, returning"); return};

			// host fires a connection back to a curious peer
			if (host && data === "Connection received" && openRoom) {
				connFire(conn.peer);
			}
		});
		
		// upon a disconnection, update the host's screen and `peers` list
		conn.on("close", () => {	
			if (host) {
				let players = document.getElementsByClassName("players");
				
				for (let i = players.length - 1; i > -1; --i) {
					if (players[i].innerText == conn.peer) {
						players[i].remove();
					};
				};	

				peers.splice(peers.indexOf(conn), 1);
			}
		});
	});	
});	

// connection via player's button (or host response)
// herein lies core data parsing to manage player-side game logic
function connFire(id=null) {
	if (host && peers.length > 4) {return}		// prevent host from connecting if the game room is full
	
	let conn = peer.connect(id == null ? document.getElementById("peerID").value : id)

	conn.on("open", () => {	
		console.log("connFire callback");
		conn.send("Connection received");

		conn.on("data", (data) => {

			console.log("Data handled by connFire " + data);

			// prevent a connection if the room is full
			if (data === "Room full") {
				conn.close();
				console.log("Room is full");
				body.innerHTML = `
				<h4 class="headertext">That room is full! Try again.</h4>
				<input id="peerID" type="text"></input>
				<button onclick="connFire()">Connect</button>`;	
			}
			// take a dealt card
			else if (data.includes("DEAL")){
				hand.push(data.slice(4));
			}
			// start the game
			else if (data == "GO") {
				printHands();
			}
			// print initial game values
			else if (data.includes("FIELD")) {
				publishField(data);
			} 
			// if it is a player's turn
			else if (data == "CHOOSE") {
				turn = true;
				document.getElementById("turnBtn").disabled = false;
			} 
			// if a turn has been completed
			else if (data.includes("TURN")) {
				handleTurn(data, conn);
			}
			// if a card is discarded into the field
			else if (data.includes("DISCARD")) {
				cardField.innerHTML += `<li><input type="checkbox" >${parseInt(data.slice(7))}</input></li>`;
			}
			// for when the field needs updating
			else if (data.includes("UPDATE")) {
				updateField(data);
			}
			// for when a scopa occurs
			else if (data === "SCOPA") {
				alert("There has been a scopa!");
			}
			else {
				console.log(data);
			};
		});

		// handle a disconnection
		conn.on("close", () => {	
			if (!host) {
				connected = false;
				body.innerHTML = `
				<h4 class="headertext">The host has disconnected! Try again.</h4>
				<input id="peerID" type="text"></input>
				<button onclick="connFire()">Connect</button>`;	
			}
		});
	});
};

// initialize the host display
async function startHost() {
	host = true;
	body.innerHTML = `
	<h1>You are the Game Host!</h1>
	<h4 id="peerDisplay"></h4>
	<ul id="connectedPeers"></ul>
	<button onclick="startGame()">Start Game</button>`;
	// dubious asynchronicity 
	await waitUntil(() => (peer.id != null));
	publishID();
};

// initialize the player display
function joinGame() {
	body.innerHTML = `
	<h3 class="headertext">Enter the following information below to join a game:</h3>
	<input id="peerID" type="text"></input>
    <button onclick="connFire()">Connect</button>`;
};

// publish the host ID to the interface -- need to update for response delays
async function publishID() {
	let visualTag = document.getElementById("peerDisplay");
	if (visualTag) {visualTag.innerText += "You are " + peer.id;};
	peers.push(peer.id);
};

// primary game-running logic -- need to update to tally score
async function startGame() {
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
			broadcast(`FIELD${fieldString}`, publishField);
			
			let activePlayerIndex = 1;
			
			while (cards.length > 0) {
				dealCards();
				broadcast("GO");
				printHands();

				while (hand.length > 0) {
					turnCompleted = false;
					
					if (activePlayerIndex === 0) {
						turn = true;
						document.getElementById("turnBtn").disabled = false;
					} 
					else {
						peers[activePlayerIndex].send("CHOOSE");
					}

					await waitUntil(() => turnCompleted);
					activePlayerIndex += 1;
					activePlayerIndex %= peers.length;
				};
			};
			
			// tally the score
			// most cards, most tricks, most 7s, most hearts, the 7 of hearts
			
			// hearts can be 0-9
			// should create an ordered list cards each player has. Look up a way to find the index of the max value and resolve for a tie
			let mostCards = gameStats.forEach(player => {return sum(player.tricks.forEach(trick => {return sum(trick.length)}))});
			let mostTricks = gameStats.forEach(player => {return sum(player.tricks)});
			let mostHearts = gameStats.forEach(player => {return sum(player.tricks.forEach(trick => {return sum(trick.forEach(card => parseInt(card) < 10 ? card : pass))}))});
			let mostSevens = gameStats.forEach(player => {return sum(player.tricks.forEach(trick => {return sum(trick.forEach(card => parseInt(card) % 6 === 0 ? card : pass))}))});
			let sevenHearts = gameStats.forEach(player => {return bool(player.tricks.forEach(trick => {return bool(trick.forEach(card => parseInt(card) === 6 ? True : pass))}))});
			
			// update Stats here			
		}
	}
};

// deal 3 cards to each player (data side)
function dealCards() {
	for (let i = 0; i < 3; ++i) {
		peers.forEach(peer => {
			typeof(peer) === "string" ? hand.push(cards.pop()) : peer.send(`DEAL${cards.pop()}`);
		})			
	}
};

// print out the hands dealt (graphical side)
function printHands() {
	let visualCards = document.getElementById("cardHand");
	hand.forEach(card => visualCards.innerHTML += `<option value=${card}>${card}</option>`);
};

// populate the 4-card playing field (data side)
function populateField() {
	for (let i = 0; i < 4; ++i) {
		field.push(cards.pop());
	}
};

// print the playing field (graphical side)
function publishField(data) {
	body.innerHTML = `
	<ul id="cardField"></ul>
	<select id="cardHand"></select>
	<button id="turnBtn" onclick="playerTurn()" disabled="true">Go</button>`;
	let cardField = document.getElementById("cardField");
	let actualData = data.slice(5, -1);
	console.log(actualData);
	actualData.split(".").forEach(card => cardField.innerHTML += `<li><input type="checkbox">${parseInt(card)}</input></li>`);
};

// update the playing field when cards are removed (data & graphical sides)
function updateField(data) {
	let cardField = document.getElementById("cardField").getElementsByTagName("li");

	data.slice(6).slice(0, -1).split(".").forEach(card => {

		field.splice(field.indexOf(parseInt(card)), 1);
		
		for (let i = cardField.length - 1; i > -1; --i) {
			if (cardField[i].innerText == card) {
				cardField[i].remove();
			};
		};			
	});
};

// send a message to all players (callback applies to host only)
function broadcast(msg, callback=null) {
	console.log("Broadcasting " + msg);
	peers.forEach(peer => {
		if (typeof(peer) != "string") {
			console.log(peer, typeof(peer));
			peer.send(msg);
		}
		else if (callback) {
			callback(msg);
		};
	});
};

// update to actually work
const gameOver = () => {
	let totalPoints = [];
	Object.keys(gameStats).forEach(player => {totalPoints.push(gameStats[player].points)});
	return totalPoints.some(score => score >= 14);
};

// called when a player hits go; parses input and passes on to host
function playerTurn(conn) {
	if (turn) {
		let cardField = document.getElementById("cardField");
		let fieldSelectedTotal = [];
		let handSelected = document.getElementById("cardHand");
		
		for (let i = 0; i < cardField.children.length; i++){
			if (cardField.children[i].children[0].checked)
				fieldSelectedTotal.push(cardField.children[i].childNodes[1].data);
		};		
		

		if (fieldSelectedTotal.length === 0 ||
			(fieldSelectedTotal.length != 0 && 
				parseInt(fieldSelectedTotal.reduce((sum, int) => parseInt(sum) + parseInt(int)%10))%10 === parseInt(handSelected.value%10))) {
			
			let transferData = `TURN${handSelected.value}/${fieldSelectedTotal.reduce((sum, card) => sum + card + ".", "")}`;
			hand.splice(hand.indexOf(parseInt(handSelected.value)), 1);
			handSelected.options[handSelected.selectedIndex].remove();

			(host ? handleTurn(transferData, peer) : connected.send(transferData));
			document.getElementById("turnBtn").disabled = true;
			turn = false;
		} 
		else {
			alert("Please make a valid choice.");
		};
	};
};

// host-side turn processing
function handleTurn(turnDataRaw, conn=null) {
	let turnData = turnDataRaw.slice(4).split("/");
	console.log("turnData " + turnData);

	// a normal trick turn
	if (turnData.length > 1 && turnData[1].split(".").length > 1) {
		updateField(`UPDATE${turnData[1]}`);
		broadcast(`UPDATE${turnData[1]}`);
		
		// update player points
		(host ? gameStats[peer].tricks.push(turnData) : gameStats[conn].tricks.push(turnData));
		
		// in case of scopa, add score & send alerts
		if (field.length === 0) {
			(conn ? gameStats[conn].points += 1 : gameStats[peer].points += 1);
			alert("There has been a Scopa!");
			broadcast("SCOPA");
		};	
	}

	// a discard turn (no trick)
	else {
		field.push(parseInt(turnData[0]));
		cardField.innerHTML += `<li><input type="checkbox">${parseInt(turnData[0])}</input></li>`;
		broadcast(`DISCARD${turnData[0]}`);
	};
	turnCompleted = true;
}