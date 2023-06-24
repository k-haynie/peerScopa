import React, { useState, useRef } from "react";

interface MenuScreenProps {
    startHost: Function,
    startPlayer: Function,
}

interface PlayerScreenProps {
    connectToHost: Function,
    isConnected: boolean,
}

interface HostScreenProps {
    startGame: Function,
}

export function MenuScreen(props: MenuScreenProps) {
    return (
        <>
            <button onClick={() => props.startHost()}>Host a Game</button>
            <button onClick={() => props.startPlayer()}>Join a Game</button>	
        </>
    )
}

export function HostScreen(props: HostScreenProps) {
    return (
        <>
            <div>You are the host!</div>
            <button onClick={props.startGame()}>Start Game</button>        
        </>
    )
}

export function PlayerScreen(props: PlayerScreenProps) {
    let inputRef = useRef<HTMLInputElement>(null);

    return ( props.isConnected ? 
        <p> Awaiting the host to start the game!</p> :
        <>
            <h3 className="headertext">Enter the following information below to join a game:</h3>
            <input ref={inputRef} type="text" />
            <button onClick={() =>  props.connectToHost(inputRef.current?.value)}>Connect</button>        
        </>
    )
}
