import { Peer, DataConnection } from "peerjs";
import * as React from 'react';
import { useState, useEffect } from "react";
import { PeerHeader, playerStatsProps } from './peer';
import { HostScreen } from './pages/hostScreen';
import { PlayerScreen } from './pages/playerScreen';
import { MenuScreen } from './pages/menuScreen';
import { GameScreen } from './pages/gameScreen';
import { Card, CardProps } from './Card';
import { Button, IconButton } from "@mui/material";
import { VariantType, useSnackbar } from 'notistack';


type FinalPoints = {
  player: string;
  numOfSevens: number;
  numOfHearts: number;
  numOfCards: number;
  numOfTricks: number;
  numOfScopas: number;
  hasSevenOfHearts: boolean;
}

function Game() {
  const [peer, setPeer] = useState<Peer>(); // assign a peer ID
  const [playerStatus, setPlayerStatus] = useState<"player" | "host" | "menu">("menu"); // player Status
  const [connections, setConnections] = useState<DataConnection[]>([]); // all associated connection objects
  const headerRef = React.useRef<HTMLDivElement>(null); // the ref I need as a fallback for enqueued playerStatus updates

  const [gameOver, setGameOver] = useState(true);
  const [playingField, setPlayingField] = useState<CardProps[]>([]);
  const [hand, setHand] = useState<CardProps[]>([]);
  
  const [turn, setTurn] = useState(false);
  const [playerTurnComplete, setPlayerTurnComplete] = useState(true);
  const [lastPlayed, setLastPlayed] = useState<string>("");
  const [playerIndex, setPlayerIndex] = useState<number>(0); // index of the player in the connections list

  const [playerStats, setPlayerStats] = useState(new Map<string, playerStatsProps>());
  const [cards, setCards] = useState<CardProps[]>([]);
  
  const qualityLogging = false; // extra output for debugging
  const { enqueueSnackbar } = useSnackbar();

  // use the snackbar as a replacement for alert()
  const sendAlert = (msg: string, variant: VariantType) => {
    enqueueSnackbar(msg, { autoHideDuration: 3000, variant: variant });
  }

  // connect to host as a player
  function connectToHost(id: string) {
    if (peer && id === peer.id) {
      sendAlert("You cannot connect to yourself!", "warning");
    }
    else if (id && peer) {
      const conn = peer.connect(id, {reliable: true});
      console.log(`Reaching out to ${conn?.peer}`);
      connectionCallbacks(conn, setConnections);
      
    }
    else {
      sendAlert("An error has occurred! Try reloading your page.", "warning");
    }
  }

  // update the playing field with the given string
  function publishField(fieldString: string) {
    console.log("Setting field", fieldString);
    const vals = fieldString.slice(5);
    setPlayingField(vals ? vals.split(",").map(i => Card(parseInt(i))) : [])
  }

  // handle any connection events - open, close, data, error
  function connectionCallbacks(conn: DataConnection, setConnections: Function) {
    // handle a disconnection
    conn.on("open", () => {
      sendAlert(`${conn.peer} has connected`, "info");
      setConnections((prev: DataConnection[]) => [...prev, conn]);
    })

    conn.on("close", () => {	
      qualityLogging && console.log("connection closed");
      sendAlert(`Player ${conn.peer} has disconnected`, "warning");
      setConnections((connections: DataConnection[]) => [...connections].filter(channel => channel !== conn));
      if (playerStatus === "player")
        cancelGame([], false);
    });

    conn.on("error", (e) => sendAlert("RTC ERROR: " + e, "error"))
    conn.on("data", (data: any) => {
        console.log("Received: ", data);
        if (data.includes("FIELD")) {
          publishField(String(data));
        }
        else if (data.includes("PTS")){
          setPlayerStats(new Map(Object.entries(JSON.parse(data.slice(3)))));
        }
        else if (data.includes("GAMESTART")) {
          setGameOver(false);
        }
        else if (data.includes("DEAL")) {
          qualityLogging && console.log("ADDING CARD ", data);
          setHand(hand => [...hand, Card(parseInt(data.slice(4)))]);
          qualityLogging && console.log([...hand, (data.slice(4) as number)])
        }
        else if (data === "CHOOSE") {
          setTurn(true);
          sendAlert("Your turn!", "info");
        }
        else if (data.includes("TURN")) {
          handleTurn(data.split("SCOPA")[0], conn, data.includes("SCOPA"));
        }
        else if (data === "SCOPA") {
          sendAlert("There has been a scopa!", "success");
        }
        else if (data.includes("GAMEEND")) {
          cancelGame(data.slice(7), false);
        }
        else if (data === "ROUNDOVER"){
          sendAlert("The round has ended!", "info");
        }
    })
  }

  // called by host to deal cards to self and others
  function dealCards(localCards?: CardProps[], initial?: boolean) {
    
    const copyCards = localCards === undefined ? [...cards] : localCards;

    let tempHand = [];
    for (let i = 0; i < 3; ++i) {
      connections?.forEach(conn => conn.send(`DEAL${(copyCards.pop() || Card(-1)).card_id}`));
      tempHand.push(copyCards.pop() || Card(-1));
    }

    setHand([...tempHand]);

    if (initial || localCards === undefined) {
      setCards([...copyCards]);
    }
  }

  // start the Game - rest is left up to state conditions and useEffect hooks
  function startGame() {
    if (!connections || connections.length > 3 || connections.length < 1) {
      sendAlert("You need 2-4 players to start a game.", "error");
    }
    else if (peer) {
      // update the gameOver state
      setGameOver(false);
      broadcast("GAMESTART");

      // set up an info object for each player
      let interimStats = playerStats.set(peer?.id, {points: 0, tricks: []});
      connections.forEach(conn => interimStats.set(conn.peer, {points: 0, tricks: []}));
      setPlayerStats(interimStats);

      shuffleAndUpdate(true);
    }
  }

  // cancel the game, reset state
  function cancelGame(winners: string[], isHost: boolean = true) {
    winners.length > 0 ? sendAlert(`The game has ended, and the winner(s) are: ${winners?.join("")}`, "success") : sendAlert("The game has ended", "info");
    setGameOver(true);
    setPlayingField([]);
    setHand([]);
    setTurn(false);
    setPlayerTurnComplete(true);
    setPlayerIndex(0);
    setLastPlayed("");

    if (isHost || playerStatus === "host") {
      broadcast("GAMEEND" + winners.join(","));
      winners.length > 0 && sendAlert(`The winner(s) are: ${winners.join("")}`, "success");
    }
  }

  
  // optionally creates a playingField and broadcasts it. 
  function shuffleAndUpdate(initial: boolean = false) {
    let localCardIds = [...Array(41).keys()].slice(1);

    // shuffle the cards with Fisher-Yates
    for (let i = localCardIds.length-1; i > 0; --i) {
      const j = Math.floor(Math.random() * (i + 1));
      [localCardIds[i], localCardIds[j]] = [localCardIds[j], localCardIds[i]];
    };

    // convert the cardIds to Card objects
    const localCards = localCardIds.map(i => Card(i));
    
    const passToGameOver = [...playingField].map(i => i.card_id.toString());
    const winners = countPointsGameOver(passToGameOver);

    qualityLogging && console.log("Checking for winners: ", winners);

    // Give any remaining cards in the playingField to the last player who took a trick
    if (winners.length > 0) {
      cancelGame(winners);
      return;
    }
    else {
      let localField = "";
      for (let i = 0; i < 4; ++i) {
        let newCard = localCards.pop();
        localField += newCard?.card_id + ",";
      }
      
      broadcast("FIELD" + localField.slice(0, -1), publishField);
      
      dealCards(localCards, initial);    
    }
  }

  function countPointsGameOver(fieldExtras: string[]){
    broadcast("ROUNDOVER");
    sendAlert("The round has ended!", "info");
    let finalPoints: FinalPoints[] = [];
    let isGameOver: string[] = [];

    // iterate over each player and add any points to the finalPoints list
    playerStats.forEach((player, key) => {
      const tricks = player.tricks.filter(i => i.length > 1 && i[1].includes("."));
      let playerCardsCleansed = key === lastPlayed ? fieldExtras : [];

      for (let i = 0; i < tricks.length; i++) {
        playerCardsCleansed.push(tricks[i][0]);
        playerCardsCleansed.push(...tricks[i][1].split("SCOPA")[0].split(".").filter(i => i != ""));
      }

      finalPoints.push({
        player: key, 
        numOfSevens: playerCardsCleansed.filter(i => parseInt(i) % 10 === 7).length,
        numOfHearts: playerCardsCleansed.filter(i => parseInt(i) <= 10).length,
        numOfCards: playerCardsCleansed.length,
        numOfTricks: tricks.length,
        numOfScopas: 0,
        hasSevenOfHearts: playerCardsCleansed.includes("7"),
      })
    })

    // lists a player ID for each point
    const playerPoints = [
      determineWinner(finalPoints, "numOfSevens"),
      determineWinner(finalPoints, "numOfHearts"),
      determineWinner(finalPoints, "numOfCards"),
      determineWinner(finalPoints, "numOfTricks"),
      finalPoints.filter(i => i.hasSevenOfHearts).length > 0 ? finalPoints.filter(i => i.hasSevenOfHearts)[0].player : ""
    ];

    const newStats = new Map<string, playerStatsProps>();
    playerStats.forEach((player, id) => {
      const playerScore = playerStats.get(id);
      if (playerScore) {
        playerScore.points += playerPoints.filter(i => i === id).length + finalPoints.filter(i => i.player === id)[0].numOfScopas;
        playerScore.tricks = [];
        console.log(`Setting ${id} to ${playerScore.points} points`)
        newStats.set(id, playerScore);

        player.points >= 12 && isGameOver.push(`${id} with ${player.points} points`);    
      }
      else { console.log("There was an error changing the score for", id)}
    });
    setPlayerStats(newStats);

    return isGameOver;
  }

  // returns empty string if a tie, or the playerID string for the highest value
  function determineWinner(finalPoints: FinalPoints[], prop: "numOfSevens" | "numOfHearts" | "numOfCards" | "numOfTricks") {
    finalPoints.sort((a, b) => b[prop] - a[prop]);
    return finalPoints[0][prop] === finalPoints[1][prop] ? "" : finalPoints[0].player;
  }

  // send messages to all other connections, with optional callback to self
  function broadcast(msg: string, callback?: Function) {
    msg==="SCOPA" && console.log("broadcasting to Connections: ", connections);
    connections?.forEach(conn => {console.log(`${msg} to ${conn}`); conn.send(msg)});
    if (callback) {
      callback(msg);
    }
  }

  // validates card choices and either handles or forwards to host
  function playCard(fieldChoice: number[], handChoice: number | null) {
    qualityLogging && console.log(fieldChoice, handChoice);
    if (handChoice !== null && validateTurn(fieldChoice, handChoice)) {
      let transferData = `TURN${handChoice}/${fieldChoice.reduce((sum, card) => sum + card + ".", "")}`;
      setHand([...hand].filter(i => i.card_id !== handChoice));

      // creates a list of Cards from the IDs collected in transerData
      const toRemove = transferData.slice(4).split("/")[1].split(".").map(i => Card(parseInt(i)));
      const toRemoveIds = toRemove.map(i => i.card_id);

      // checks if the playingField would be cleared after this move
      const isScopa = playingField.length !== 0 && [...playingField].filter(i => !toRemoveIds.includes(i.card_id)).length === 0;
      if (isScopa) {
        transferData += "SCOPA";
      }
      
      playerStatus === "host" ? handleTurn(transferData, undefined, isScopa) : (connections ? connections[0].send(transferData) : console.log("No connections to update!"));
      setTurn(false);
    } 
    else {
      sendAlert("Please make a valid choice.", "warning");
    }		
  }

  function validateTurn(selectedField: number[], choice: number){
    const fieldValues = selectedField.map(i => Card(i).value);
    const selectedHand = Card(choice).value;

    // check if a matching card exists and is not chosen
    const existingOfValue = playingField.filter(i => i.value === selectedHand);

    // prompt to select exact match instead of sum
    if (existingOfValue.length > 0 && fieldValues.length > 1) {
      console.log("Select a matching value");
      return false;
    }
    else if (selectedField.length === 0 || fieldValues.reduce((a, b) => a + b) === selectedHand){
      return true;
    }
    qualityLogging && console.log(fieldValues, selectedHand);
    return false;
  }

  // handle a player's turn -- only called by the host
  function handleTurn(turnDataRaw: string, conn?: DataConnection, isScopa?: boolean) {
    const turnData = turnDataRaw.slice(4).split("/");
    qualityLogging && console.log("turnData " + turnData);

    // if cards were removed from the playingField
    if (turnData.length > 1 && turnData[1].split(".").length > 1) {
      // update the field, locally and remotely
      const toRemove = turnData[1].split(".").filter(i => i !== ".").map(i => Card(parseInt(i)));
      const toRemoveIds = toRemove.map(i => i.card_id);
      // console.log("To Remove: ", toRemove, playingField);
      setPlayingField(field => [...field].filter(i => !toRemoveIds.includes(i.card_id)));
      setLastPlayed(conn?.peer ?? peer?.id ?? "");
      
      // update player points
      if (conn) {
        updatePoints(conn.peer, turnData, isScopa);
      }
      else if (peer?.id) {
        updatePoints(peer.id, turnData, isScopa);
      }
    }
    // discard to the field, update local and remotes
    else {
      setPlayingField(field => [...field, Card(parseInt(turnData[0]))]);
    }

    setPlayerTurnComplete(true);
    setPlayerIndex(index => ((index + 1) % playerStats.size));
  }

  // updates each player object with points and turns as necessary
  function updatePoints(peerID: string, turnData: string[], isScopa?: boolean) {
    console.log("updating points: ", peerID, turnData, isScopa);
    let newStats = playerStats.get(peerID);
    console.log(newStats, playerStats);
    newStats?.tricks.push(turnData);
    if (isScopa && newStats){
      newStats.points += 1;
      broadcast("SCOPA");
      console.log("broadcasting scopa");
      sendAlert("There has been a scopa!", "success");
    }
      
    const updated = playerStats.set(peerID, newStats === undefined ? {points: 0, tricks: [turnData]} : newStats)
    console.log(updated);
    setPlayerStats(updated);
  }

  // create a new peer as necessary
  // SAFE EFFECT
  useEffect(() => {
    if (peer === undefined || peer.id === null) {
      const newPeer = new Peer(Math.random().toString(16).slice(2, 8));
      qualityLogging && console.log("Setting new peer", newPeer);
      // assign to the user
      newPeer.on("open", () => setPeer(newPeer));
      newPeer.on("connection", (conn) => {
        if (headerRef.current?.classList.contains("open") && headerRef.current?.classList.contains("host")){
          sendAlert(`${conn.peer} has connected`, "info");
          connectionCallbacks(conn, setConnections); 
        } 
        else {
          conn.close();
        }
      })      
      
    }
    peer?.id === null && sendAlert("Your ID connection has expired. Reload your page.", "error");
  }, [peer])

  // destroy the peer on window close
  // SAFE EFFECT
  useEffect(() => {
    window.onunload = window.onbeforeunload = (e) => {
      qualityLogging && console.log("Destroying peer");
      peer?.destroy();
    }
  })

  // cancel connection and a running game on external navigation
  // SAFE EFFECT
  useEffect(() => {
    // close any existing conn
    if (playerStatus === "menu") {
      connections?.forEach(conn => conn.close());
      // cancel any running games
      headerRef.current?.classList.contains("closed") && cancelGame([], false);      
    }
  }, [playerStatus, connections])

  const oldState = React.useRef({
    oldIndex: playerIndex,
  })
  // prompts players to play if host, sets turn state
  useEffect(() => {
    if (playerIndex !== oldState.current?.oldIndex) {
      if (headerRef.current?.classList.contains("closed") && headerRef.current?.classList.contains("host")) {
        setPlayerTurnComplete(false);
        qualityLogging && console.log("cards: ", cards);

        if (playerIndex === 1 && cards?.length === 0 && hand.length === 0){
          shuffleAndUpdate();
        }
        else if (playerIndex === 1 && hand.length === 0) {
          dealCards();
        }

        if (playerIndex === 0) {
          setTurn(true);
          sendAlert("Your turn!", "info");
        }
        else {
          connections ? connections[playerIndex-1].send("CHOOSE") : console.log("No connections to update!");
        }      
      }      
    }

  }, [playerIndex, cards, hand, connections])

  // automatically broadcast any field updates processed by host
  // SAFE EFFECT - unless broadcast is not safe?
  useEffect(() => {
    headerRef.current?.classList.contains("host") && broadcast(`FIELD${playingField.map(c => c.card_id).join(",")}`);
  }, [playingField])

  // publishes any connection updates
  // SAFE EFFECT
  useEffect(() => {
    if (headerRef.current?.classList.contains("closed")) {
      cancelGame([], false);
      sendAlert("Player departure has caused the game to end.", "error");
    }
  }, [connections])

  // publish any playerStats changes
  // SAFE EFFECT
  useEffect(() => {
    headerRef.current?.classList.contains("host") && broadcast("PTS" + JSON.stringify(Object.fromEntries(playerStats)));
  }, [playerStats])

  // ensure the host is the last person to go first of all connections when a game starts
  // SAFE EFFECT
  useEffect(() => {
    if (gameOver === false && headerRef.current?.classList.contains("host")) {
      setPlayerIndex(1);
    }
  }, [gameOver])


  return (
    <div className="App">
      <PeerHeader
        peer={peer}
        status={playerStatus}
        count={connections.length}
        gameOver={gameOver}
        points={playerStats}
        ref={headerRef}
      />
      <div className="pageContent">
        {!gameOver ? 
          <GameScreen 
            playingField={playingField} 
            hand={hand}
            playSelection={playCard}
            turn={turn}
          /> : 
          playerStatus === "menu" ? 
            <MenuScreen 
              start={(status: "host" | "player") => setPlayerStatus(status)}
            /> :
            (playerStatus === "host" ? 
              <HostScreen startGame={startGame} /> :
              <PlayerScreen isConnected={connections ? connections.length > 0 : false} connectToHost={(id: string) => connectToHost(id)}/>
            )
        }
        <div>
          <Button variant="contained" onClick={() => {setPlayerStatus("menu"); console.log(connections)}}>Back to Menu</Button>     
        </div>
      </div>
    </div>
  );
}

export default Game;