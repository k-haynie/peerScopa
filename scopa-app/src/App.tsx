import './App.css';
import { Peer, DataConnection } from "peerjs";
import * as React from 'react';
import { useState, useEffect } from "react";
import { PeerHeader, connectionCallbacks, playerStatsProps } from './components/peer';
import { HostScreen, PlayerScreen, MenuScreen } from './components/hostLogic';

function App() {
  const [peer, setPeer] = useState<Peer>();
  const [playerStatus, setPlayerStatus] = useState<"player" | "host" | "menu">("menu");
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const playerStats = new Map<string, playerStatsProps>();
  const [playingField, setPlayingField] = useState<number[]>([]);

  function connectToHost(id: string) {
    if (id && peer) {
      const conn = peer.connect(id);
      connectionCallbacks(conn, setConnections);
      setConnections(connections => [...connections, conn]);
    }
    else {
      alert("An error has occurred! Try reloading your page.");
    }
  }

  function startGame() {
    if (connections.length > 3 || connections.length < 1) {
      alert("You need 2-4 players to start a game.");
    }
    else if (peer) {
      connections.forEach(conn => playerStats.set(conn.peer, {points: 0, tricks: []}));
      playerStats.set(peer?.id, {points: 0, tricks: []});

      while (!gameOver) {
        let cards = [...Array(22).keys()];

        // shuffle the cards with Fisher-Yates
        for (let i = cards.length-1; i > 0; --i) {
          const j = Math.floor(Math.random() * (i + 1));
          [cards[i], cards[j]] = [cards[j], cards[i]];
        };

        // populate the playing field with cards and -1 if undefined
        for (let i = 0; i < 4; ++i) {
          let newCard = cards.pop();
          setPlayingField(field => [...field, newCard ? newCard : -1]);
        }

      }
    }
  }

  useEffect(() => {
    if (!peer) {
      const newPeer = new Peer();
      newPeer.on("open", () => setPeer(newPeer));
      newPeer.on("connection", (conn) => {
        connectionCallbacks(conn, setConnections);
        setConnections(connections => [...connections, conn])
      });
    }
  }, [])

  useEffect(() => {
    window.onunload = window.onbeforeunload = (e) => {
      peer?.destroy();
    }
  })

  return (
    <div className="App">
      <PeerHeader peer={peer}/>
      {playerStatus === "menu" ? 
        <MenuScreen 
          startHost={() => setPlayerStatus("host")} 
          startPlayer={() => setPlayerStatus("player")} /> :
        (playerStatus === "host" ? 
          <HostScreen  startGame={startGame}/> :
          <PlayerScreen isConnected={connections.length > 0} connectToHost={(id: string) => connectToHost(id)}/>
        )
      }
      <button onClick={() => {setPlayerStatus("menu"); console.log(connections)}}>Back to Menu</button>
      <ul>
        {connections.map((conn, index) => {
          return (<li key={index} style={{color: `${conn.open ? "blue" : "red"}`}}>{conn.peer}</li>)
        })}
      </ul>
    </div>
  );
}
export default App;
