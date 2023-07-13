import React from "react";

interface MenuScreenProps {
    startHost: Function,
    startPlayer: Function,
}

export function MenuScreen(props: MenuScreenProps) {
    return (
        <>
            <button onClick={() => props.startHost()}>Host a Game</button>
            <button onClick={() => props.startPlayer()}>Join a Game</button>	
        </>
    )
}