import React from "react";
import { Button } from "@mui/material";

interface MenuScreenProps {
    start: Function,
}

export function MenuScreen(props: MenuScreenProps) {
    return (
        <div className="menuContent">
            <Button variant="contained" onClick={() => props.start("host")}>Host a Game</Button>
            <Button variant="contained"  onClick={() => props.start("player")}>Join a Game</Button>	
        </div>
    )
}