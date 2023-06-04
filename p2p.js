// create a new peer identity
// has to be here for scope purposes

// to run offline: 
// pull up Admin CMD and use the command: peerjs --port 9000 --key peerjs --path /myapp
// var peer = new Peer({host: "localhost", port: 9000, path: "/myapp"});

// variables for both host and player
var peer = new Peer();
let body = document.getElementById("body");

// detect when a browser is closed
window.onunload = window.oneforunload = (e) => {
	if (!!peer && !peer.destroyed) {
		peer.destroy();
	}
}


// upon initialization, publish the ID via HTML
peer.on('open', function(id){
	console.log("Peer initialized");
});

// when a peer reaches out, publish the connecting ID
peer.on('connection', (conn) => {
	
	// Publish the peer connection to the host
	let connectedPeers = document.getElementById("connectedPeers");
	console.log(peers.length);
	
	if (peers.length === 4) {
		openRoom = false;
		conn.send("Room full");
		return;
	}
	else if (host && connectedPeers && !connectedPeers.innerHTML.includes(conn.peer)){
		connectedPeers.innerHTML += `<li class="players">${conn.peer}</li>`;
		peers.push(conn);
	}
	else if (!host && conn.data != "Room full") {	// Publish the peer connection to the player
		connected = conn;
		body.innerHTML = `
		<h4 class="headertext">You have successfully been connected!</h4>
		<p>Awaiting the host to start the game.</p>
		`;
	}
	
	conn.on("open", () => {	// set up a response upon an open connection
		console.log("primary peer.on callback");
		console.log("connection opened");

		
		conn.on("data", (data) => {	// set up a response upon receiving data
			console.log("Data handled by peer.on function");
			if (!host && (connected == false)) {console.log("Not connected, returning"); return};

			// establish a two-way connection when a remote reaches out
			if (host && data === "Connection received") {
				console.log("Firing connection back")
				connFire(conn.peer);
			}
			console.log(data);
		});
		
		// handle a disconnection
		conn.on("close", () => {	
			console.log("closed from primary peer.con");

			if (host) {
				let players = document.getElementsByClassName("players");
				
				// remove the appropriate label from the host screen
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

// When the connection button is hit, send out a connection 
//    request via PeerJS
function connFire(id=null) {
	if (host && peers.length > 4) {return}
	
	let conn = peer.connect(id == null ? document.getElementById("peerID").value : id)

	conn.on("open", () => {	
		console.log("connFire callback");
		conn.send("Connection received");

		// handle a disconnection
		conn.on("close", () => {	
			console.log("closed from connFire");

			if (!host) {
				connected = false;
				body.innerHTML = `
				<h4 class="headertext">The host has disconnected! Try again.</h4>
				<input id="peerID" type="text"></input>
				<button onclick="connFire()">Connect</button>`;	
			}
		});

		conn.on("data", (data) => {
			console.log("Data handled by connFire " + data);

			if (!host && !connected) {console.log("Not connected, returning"); return};

			// establish a two-way connection when a remote reaches out
			if (host && data === "Connection received") {
				console.log("Firing connection back")
				connFire(conn.peer);
			}
			// prevent a connection if the room is full
			else if (data === "Room full") {
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
				alert("Your turn!");
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
		})
	});
};

// callback handling
// https://stackoverflow.com/questions/26958404/peerjs-peer-not-receiving-data?rq=3
// host.js
// variables for host
let host = false;
let openRoom = true;
let peers = [];
let gameStats = {};
let field = [];
let cards = [];

// initialize the host display
async function startHost() {
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
async function publishID() {
	let visualTag = document.getElementById("peerDisplay");
	if (visualTag) {visualTag.innerText += "You are " + peer.id;};
	peers.push(peer.id);
};

const gameOver = () => {
	let totalPoints = [];
	Object.keys(gameStats).forEach(player => {totalPoints.push(gameStats[player].points)});
	return totalPoints.some(score => score >= 14);
}

// start a game with valid players
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
				console.log("REDALT", hand, hand.length);

				while (hand.length > 0) {
					console.log("HOST HAND", hand, hand.length);
					turnCompleted = false;
					
					if (activePlayerIndex === 0) {
						turn = true;
						alert("Your turn!");
					} 
					else {
						peers[activePlayerIndex].send("CHOOSE");
					}

					await waitUntil(() => turnCompleted);
					activePlayerIndex += 1;
					activePlayerIndex %= peers.length;

					console.log("player change, hand length: " + hand.length + hand);
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
}

const waitUntil = (condition, checkInterval=100) => {
    return new Promise(resolve => {
        let interval = setInterval(() => {
            if (!condition()) return;
            clearInterval(interval);
            resolve();
        }, checkInterval)
    })
}

// populate the 4-card playing field
function populateField() {
	for (let i = 0; i < 4; ++i) {
		field.push(cards.pop());
	}
}

// deal 3 cards to each player
function dealCards() {
	for (let i = 0; i < 3; ++i) {
		peers.forEach(peer => {
			console.log("dealing")
			typeof(peer) === "string" ? hand.push(cards.pop()) : peer.send(`DEAL${cards.pop()}`);
		})			
	}
}

// send a message to all players
function broadcast(msg, callback=null) {
	console.log("Broadcasting " + msg);
	peers.forEach(peer => {
		if (typeof(peer) != "string") {
			console.log(peer, typeof(peer));
			peer.send(msg);
		}
		else if (callback) {
			callback(msg);
		}
	})
}

function publishField(data) {
	body.innerHTML = `
	<ul id="cardField"></ul>
	<select id="cardHand"></select>
	<button onclick="playerTurn()">Go</button>`;
	let cardField = document.getElementById("cardField");
	let actualData = data.slice(5, -1);
	console.log(actualData);
	actualData.split(".").forEach(card => cardField.innerHTML += `<li><input type="checkbox">${parseInt(card)}</input></li>`);
}

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
	hand.forEach(card => visualCards.innerHTML += `<option value=${card}>${card}</option>`);
}

function joinGame() {
	body.innerHTML = `
	<h3 class="headertext">Enter the following information below to join a game:</h3>
	<input id="peerID" type="text"></input>
    <button onclick="connFire()">Connect</button>
	`;
}

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
			(fieldSelectedTotal.length != 0 && parseInt(fieldSelectedTotal.reduce((sum, int) => parseInt(sum) + parseInt(int)%10))%10 === parseInt(handSelected.value%10))) {
			
			let transferData = `TURN${handSelected.value}/${fieldSelectedTotal.reduce((sum, card) => sum + card + ".", "")}`;
			console.log("hand pre-splice " + hand);
			hand.splice(hand.indexOf(parseInt(handSelected.value)), 1);
			console.log("hand post-splice " + hand);
			handSelected.options[handSelected.selectedIndex].remove();
			(host ? handleTurn(transferData, peer) : connected.send(transferData));

			turn = false;
		} 
		else {
			alert("Please make a valid choice.");
		}		
	}
	
}

// update the field when cards are removed
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
}

// handle a player's turn -- only called by the host
function handleTurn(turnDataRaw, conn=null) {
	let turnData = turnDataRaw.slice(4).split("/");
	console.log("turnData " + turnData);

	// in case a card was not merely getting laid down
	if (turnData.length > 1 && turnData[1].split(".").length > 1) {
		let nonHand = turnData[1].split(".")
		
		console.log(turnData);
		// update the field, locally and remotely
		updateField(`UPDATE${turnData[1]}`);
		broadcast(`UPDATE${turnData[1]}`);
		
		// update player points
		(host ? gameStats[peer].tricks.push(turnData) : gameStats[conn].tricks.push(turnData));
		
		// in case there is a scopa
		if (field.length === 0) {
			(conn ? gameStats[conn].points += 1 : gameStats[peer].points += 1);
			alert("There has been a Scopa!");
			broadcast("SCOPA");
		}			
	}
	// discard to the field, update local and remotes
	else {
		console.log(parseInt(turnData[0]), turnData[0]);
		field.push(parseInt(turnData[0]));
		cardField.innerHTML += `<li><input type="checkbox">${parseInt(turnData[0])}</input></li>`;
		broadcast(`DISCARD${turnData[0]}`);
	}
	turnCompleted = true;
}