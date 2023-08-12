import React, { useState, useRef } from "react";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import { Search } from "@mui/icons-material"

interface PlayerScreenProps {
    connectToHost: Function,
    isConnected: boolean,
}

export function PlayerScreen(props: PlayerScreenProps) {
    let inputRef = useRef<HTMLInputElement>(null);

    return ( props.isConnected ? 
        <p className="pageText"> Awaiting the host to start the game!</p> :
        <div>
            <h3 className="pageText">Enter the following information below to join a game:</h3>
            <TextField 
                className="connectInp"
                label="Host ID"
                variant="outlined"
                inputRef={inputRef}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => props.connectToHost(inputRef.current?.value)}>
                        <Search /> 
                      </IconButton>               
                    </InputAdornment>)
                }}
            />
        </div>
    )
}
