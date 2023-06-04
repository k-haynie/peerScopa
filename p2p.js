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
		connected = true;
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
			if (!host && !connected) {console.log("Not connected, returning"); return};

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
				cardField.innerHTML += `<li><input type="checkbox">${int(data.splice(7))%10}</input></li>`;
			}
			// for when the field needs updating
			else if (data.includes("UPDATE")) {
				let cardField = document.getElementById("cardField");
				cardField.innerHTML = "";
				
				let actualData = data.splice(6);
				actualData.pop();
				acutalData.split(".").forEach(card => cardField.innerHTML += `<li><input type="checkbox">${int(card)%10}</input></li>`);
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
			broadcast(`FIELD${fieldString}`, publishField);
			
			let activePlayerIndex = 1;
			
			while (cards) {
				dealCards();
				broadcast("GO");
				printHands();
				
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
	actualData.split(".").forEach(card => cardField.innerHTML += `<li><input type="checkbox">${Number(card)%10}</input></li>`);
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
	hand.forEach(card => visualCards.innerHTML += `<option value=${card % 10}>${card % 10}</option>`);
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
		
		if (fieldSelectedTotal.reduce((int) => Number.parseInt(int), 0) === handSelected.value || fieldSelectedTotal.length === 0) {
			console.log("You might need to redefine the peer instance in player.js :36");
			let transferData = `TURN${handSelected}/${fieldSelectedTotal.forEach(card => {return str(card) + "."})}`
			console.log(peer._connections);
			(host ? handleTurn(transferData) : peer._connections[0].value[0].peerConnectionsend(transferData));
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