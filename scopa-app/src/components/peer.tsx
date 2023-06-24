import React from "react";
import { DataConnection } from "peerjs";

interface peerObject {
    peer?: {
        id: string
    }
}

export interface playerStatsProps {
    points: number,
    tricks: number[][],
}

export function PeerHeader(peer: peerObject) {
    return (
    <div style={{
        color: "white",
        padding: "10px",
        backgroundColor: "darkgreen",
    }}>{peer.peer == null ? "Loading..." : "You are " + peer.peer.id}</div>
    );
}
//https://codesandbox.io/s/npvhr?file=/src/context/PeerContext.ts
//https://blog.logrocket.com/getting-started-peerjs/
//https://www.sitepoint.com/file-sharing-component-react/

export function connectionCallbacks(conn: DataConnection, setConnections: Function) {
    // handle a disconnection
    conn.on("close", () => {	
        setConnections((connections: DataConnection[]) => ([...connections].filter(channel => channel !== conn)))
        console.log("connection closed");
    });

    conn.on("data", (data) => {
        console.log(data);
        /*
        if (data === "Room full") {
            conn.close();
            //console.log("Room is full");
            body.innerHTML = `
            <h4 class="headertext">That room is full! Try again.</h4>
            <input id="peerID" type="text"></input>
            <button onclick="connFire()">Connect</button>`;	
        }
        // take a dealt card
        else if (data.includes("DEAL")){
            //console.log("ADDING CARD ", data)
            //hand.push(data.slice(4));
        }
        // start the game
        else if (data == "GO") {
            //printHands();
        }
        // print initial game values
        else if (data.includes("FIELD")) {
            //publishField(data);
        } 
        // if it is a player's turn
        else if (data == "CHOOSE") {
            //turn = true;
            alert("Your turn!");
        } 
        // if a turn has been completed
        else if (data.includes("TURN")) {
            //handleTurn(data, conn);
        }
        // if a card is discarded into the field
        else if (data.includes("DISCARD")) {
            //cardField.innerHTML += `<li><input type="checkbox" >${parseInt(data.slice(7))}</input></li>`;
        }
        // for when the field needs updating
        else if (data.includes("UPDATE")) {
            //updateField(data);
        }
        // for when a scopa occurs
        else if (data === "SCOPA") {
            alert("There has been a scopa!");
        }
        else {
            console.log(data);
        };
        */
    })
}