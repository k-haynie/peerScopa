import React from "react";
import { Button } from "@mui/material";

interface HostScreenProps {
    startGame: Function,
}

export function HostScreen(props: HostScreenProps) {

    return (
        <div>
            <div className="pageText">You are the host!</div>
            <Button variant="contained" onClick={() => props.startGame()}>Start Game</Button>        
        </div>
    )
}