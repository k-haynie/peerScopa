import React from "react";

interface HostScreenProps {
    startGame: Function,
}

export function HostScreen(props: HostScreenProps) {
    return (
        <>
            <div>You are the host!</div>
            <button onClick={() => props.startGame()}>Start Game</button>        
        </>
    )
}