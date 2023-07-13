import './App.css';
import { Peer, DataConnection } from "peerjs";
import * as React from 'react';
import { useState, useEffect } from "react";
import { PeerHeader, playerStatsProps } from './components/peer';
import { HostScreen } from './components/pages/hostScreen';
import { PlayerScreen } from './components/pages/playerScreen';
import { MenuScreen } from './components/pages/menuScreen';
import { GameScreen } from './components/pages/gameScreen';

function App() {
  // track a peer ID
  const [peer, setPeer] = useState<Peer>();
  // track the page and status state of each app
  const [playerStatus, setPlayerStatus] = useState<"player" | "host" | "menu">("menu");
  // list of data connection objects
  const [connections, setConnections] = useState<DataConnection[]>();
  // arbiter of game logic and connections
  const [gameOver, setGameOver] = useState(true);
  // list of numbers
  const [playingField, setPlayingField] = useState<number[]>([]);
  // list of numbers dealt as a hand
  const [hand, setHand] = useState<number[]>([]);
  // arbiter of who can do what when
  const [turn, setTurn] = useState(false);
  // for the host
  const [playerTurnComplete, setPlayerTurnComplete] = useState(true);
  // update to state
  const [playerStats, setPlayerStats] = useState(new Map<string, playerStatsProps>())
  
  // the host uses this to track the active player in dataconnection list
  const [playerIndex, setPlayerIndex] = useState<number>(0);
  // self-evidence is astounding, eh?
  const [cards, setCards] = useState<number[]>([]);

  // connect to host
  function connectToHost(id: string) {
    if (id && peer) {
      const conn = peer.connect(id);
      connectionCallbacks(conn, setConnections);
    }
    else {
      alert("An error has occurred! Try reloading your page.");
    }
  }

  // update the playing field with the given string
  function publishField(fieldString: string) {
    console.log("Setting field", fieldString);
    setPlayingField(fieldString.slice(5).split(",").filter(i => i !== undefined).map((i) => Number(i)))
  }

  // handle any connection events - open, close, data, error
  function connectionCallbacks(conn: DataConnection, setConnections: Function) {
    // handle a disconnection
    conn.on("open", () => {
      console.log("Adding connection: ", conn.peer);
      setConnections(connections ? [...connections, conn] : [conn]);
    })

    conn.on("close", () => {	
      console.log("connection closed");
      setConnections((connections: DataConnection[]) => [...connections].filter(channel => channel !== conn));
      if (playerStatus === "player")
        cancelGame();
    });

    conn.on("error", (e) => console.log("RTC ERROR: " + e))
    conn.on("data", (data: any) => {
        console.log("Received: ", data);
        if (data.includes("FIELD")) {
          publishField(String(data));
        } 
        else if (data.includes("GAMESTART")) {
          setGameOver(false);
        }
        else if (data.includes("DEAL")) {
          console.log("ADDING CARD ", data);
          setHand(hand => [...hand, parseInt(data.slice(4))]);
          console.log([...hand, (data.slice(4) as number)])
        }
        else if (data === "CHOOSE") {
          setTurn(true);
        }
        else if (data.includes("TURN")) {
          handleTurn(data, conn);
        }
        else if (data === "SCOPA") {
          alert("There has been a scopa!");
        }
    })
  }

  // called by host to deal cards to self and others
  function dealCards(localCards?: number[]) {
    let copyCards = localCards ? localCards : [...cards];
    for (let i = 0; i < 3; ++i) {
      connections?.forEach(conn => conn.send(`DEAL${copyCards.pop()}`));
      setHand(hand => [...hand, copyCards.pop() ?? -1 ]);
    }

    if (!localCards) {
      setCards(copyCards);
    }
  }

  // start the Game - rest is left up to state conditions and useEffect hooks
  function startGame() {
    if (!connections || connections.length > 3 || connections.length < 1) {
      alert("You need 2-4 players to start a game.");
    }
    else if (peer) {
      // update the gameOver state
      setGameOver(false);
      broadcast("GAMESTART");

      // set up an info object for each player
      let interimStats = playerStats.set(peer?.id, {points: 0, tricks: []});
      connections.forEach(conn => interimStats.set(conn.peer, {points: 0, tricks: []}));
      setPlayerStats(interimStats);

      console.log(playerStats);

      shuffleAndUpdate();
    }
  }

  // TODO: flesh out
  function cancelGame() {
    setGameOver(true);
  }

  // resets the deck, shuffles, repopulates field, and calls dealCards
  function shuffleAndUpdate() {
    let localCards = [...Array(40).keys()];

    // shuffle the cards with Fisher-Yates
    for (let i = localCards.length-1; i > 0; --i) {
      const j = Math.floor(Math.random() * (i + 1));
      [localCards[i], localCards[j]] = [localCards[j], localCards[i]];
    };

    let localField = "";
    for (let i = 0; i < 4; ++i) {
      let newCard = localCards.pop();
      localField += newCard + ",";
    }

    broadcast("FIELD" + localField.slice(0, -1));
    publishField("FIELD" + localField.slice(0, -1));
    
    dealCards(localCards);
    setCards(localCards);
  }

  // send messages to all other connections, with optional callback to self
  function broadcast(msg: string, callback?: Function) {
    console.log("Broadcasting " + msg);
    console.log("Connections: ", connections);
    connections?.forEach(conn => {console.log("Sending to ", conn.peer); conn.send(msg)});
    if (callback) {
      callback(msg);
    }
  }

  // validates card choices and either handles to forwards to host
  function playCard(fieldRef: HTMLUListElement, handRef: HTMLSelectElement) {
      let fieldSelectedTotal = [];
      
      for (let i = 0; i < fieldRef.children.length; i++){
        if ((fieldRef.children[i].children[0] as HTMLInputElement).checked)
          fieldSelectedTotal.push((fieldRef.children[i].children[0] as HTMLInputElement).value);
      };		
      
  
      if (fieldSelectedTotal.length === 0 || (fieldSelectedTotal.length != 0 && 
        parseInt(fieldSelectedTotal.reduce((sum, int) => String(parseInt(sum) + parseInt(int)%10)))%10 === parseInt(handRef.value)%10)) 
      {
        let transferData = `TURN${handRef.value}/${fieldSelectedTotal.reduce((sum, card) => sum + card + ".", "")}`;
        setHand([...hand].filter(i => i !== parseInt(handRef.value)));
        playerStatus === "host" ? handleTurn(transferData) : (connections ? connections[0].send(transferData) : console.log("No connections to update!"));
        setTurn(false);
      } 
      else {
        alert("Please make a valid choice.");
      }		
  }

  // handle a player's turn -- only called by the host
  function handleTurn(turnDataRaw: string, conn?: DataConnection) {
    let turnData = turnDataRaw.slice(4).split("/");
    console.log("turnData " + turnData);

    // if cards were removed from the playingField
    if (turnData.length > 1 && turnData[1].split(".").length > 1) {
      // update the field, locally and remotely
      let toRemove = turnData[1].split(".").map(i => parseInt(i));
      setPlayingField(field => [...field].filter(i => !toRemove.includes(i)));
      
      // update player points
      if (conn) {
        updatePoints(conn.peer, turnData);
      }
      else if (peer?.id) {
        updatePoints(peer.id, turnData);
      }
    }
    // discard to the field, update local and remotes
    else {
      setPlayingField(field => [...field, parseInt(turnData[0])]);
    }

    setPlayerTurnComplete(true);
    console.log("updating index", playerStats, playerIndex);
    setPlayerIndex(index => ((index + 1) % playerStats.size));
  }

  // updates each player object with points and turns as necessary
  function updatePoints(peerID: string, turnData: string[]) {
    let newStats = playerStats.get(peerID);
    newStats?.tricks.push(turnData);
    console.log(playingField);

    if (playingField.length === 0 && newStats) {
      newStats.points = newStats.points + 1;
      alert("There has been a Scopa!");
      broadcast("SCOPA");
    }

    setPlayerStats(playerStats.set(peerID, newStats === undefined ? {points: 0, tricks: [turnData]} : newStats));
  }

  // create a new peer as necessary
  useEffect(() => {
    if (peer === undefined) {
      const newPeer = new Peer();
      console.log("Setting new peer");
      newPeer.on("open", () => setPeer(newPeer));
      newPeer.on("connection", (conn) => {
        connectionCallbacks(conn, setConnections)
      });
    }
  }, [peer])

  // destroy the peer on window close
  useEffect(() => {
    window.onunload = window.onbeforeunload = (e) => {
      console.log("Destroying peer");
      peer?.destroy();
    }
  })

  // cancel connection and a running game on external navigation
  useEffect(() => {
    console.log("closing connections");
    connections?.forEach(conn => conn.close());
    cancelGame();
  }, [playerStatus])

  // prompts players to play if host, sets turn state
  useEffect(() => {
    if (!gameOver && playerStatus === "host") {
      setPlayerTurnComplete(false);

      if (playerIndex === 1 && cards.length === 0) {
        console.log("Redealing");
        shuffleAndUpdate();
      }
      else if (playerIndex === 1 && hand.length === 0) {
        dealCards();
      }

      if (playerIndex === 0) {
        setTurn(true);
      }
      else {
        connections ? connections[playerIndex-1].send("CHOOSE") : console.log("No connections to update!");
      }      
    }
  }, [playerIndex])

  // automatically broadcast any field updates processed by host
  useEffect(() => {
    if (playerStatus === "host") {
      broadcast(`FIELD${playingField.join(",")}`)
    }
  }, [playingField])

  // publishes any connection updates
  useEffect(() => {
    console.log("updating connections, ", connections?.length);
  }, [connections])

  // publish any playerStats changes
  useEffect(() => {
    console.log("changing stats: " + playerStats);
  }, [playerStats])

  // ensure the host is the last person to go first of all connections when a game starts
  useEffect(() => {
    if (gameOver === false && playerStatus === "host") {
      setPlayerIndex(1);
    }
  }, [gameOver])

  return (
    <div className="App">
      <PeerHeader peer={peer}/>
      {!gameOver ? 
        <GameScreen 
          playingField={playingField} 
          hand={hand}
          playSelection={playCard}
          turn={turn}
        /> : 
        playerStatus === "menu" ? 
          <MenuScreen 
            startHost={() => setPlayerStatus("host")} 
            startPlayer={() => setPlayerStatus("player")}
          /> :
          (playerStatus === "host" ? 
            <HostScreen startGame={startGame}/> :
            <PlayerScreen isConnected={connections ? connections.length > 0 : false} connectToHost={(id: string) => connectToHost(id)}/>
          )
      }
      <button onClick={() => {setPlayerStatus("menu"); console.log(connections)}}>Back to Menu</button>
      <ul>
        {connections?.map((conn, index) => {
          return (<li key={index} style={{color: `${conn.open ? "blue" : "red"}`}}>{conn.peer}</li>)
        })}
      </ul>
    </div>
  );
}
export default App;
