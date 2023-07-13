import React, { useState, useRef } from "react";

interface PlayerScreenProps {
    connectToHost: Function,
    isConnected: boolean,
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
