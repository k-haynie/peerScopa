import { useState, useEffect, forwardRef } from "react";
import { DataConnection } from "peerjs";
import { Badge, InputAdornment, IconButton, CircularProgress, TextField, Tooltip, Typography } from "@mui/material";
import { ContentCopy, Groups } from "@mui/icons-material"

interface peerObject {
    status: string,
    count: number,
    gameOver: boolean,
    points: Map<string, playerStatsProps>,
    peer?: {
        id: string,
        connections: object,
    }
}

export interface playerStatsProps {
    points: number,
    tricks: string[][],
}

export const PeerHeader = forwardRef<HTMLDivElement, peerObject>(( props, ref) => {
  return (
  <div ref={ref} className={"pageHeader " + props.status + (props.gameOver ? " open" : " closed")}>
      <p>Scopa</p>
      {props.peer == null ? <CircularProgress variant="indeterminate" color={"secondary"} /> : 

        <div style={{display: "flex", gap: "20px", justifyContent: "space-between"}}>
          <Tooltip title={props.status === "host" ? "Player Count" : "Connection to Host"}>
            <Badge
                badgeContent={props.status === "host" ? props.count : props.status === "player" && props.count > 0 ? "✓" : "-"}
                anchorOrigin={{vertical: "top", horizontal: "left"}}
                style={{alignSelf: "center"}}
                color="success"
            >            
                <Groups htmlColor="white" fontSize="large" />
            </Badge>            
          </Tooltip>
            {props.gameOver ?
                <>
                    <p style={{fontSize: "18px"}}>{props.peer.id}</p>
                    <Tooltip title="Copy ID to clipboard">
                        <IconButton onClick={() => {
                        props.peer && navigator.clipboard.writeText(props.peer.id)
                        }}>
                        <ContentCopy htmlColor="white" fontSize="medium" />
                        </IconButton>
                    </Tooltip>          
                </> : 
                <>
                    <Tooltip title="Points">
                        <Typography className="inGame">
                            {(props.points.size > 0 && props.points.get(props.peer?.id)?.points) || 0}
                        </Typography>
                    </Tooltip>
                </>
            }            
          </div>
      }
  </div>
  );
})
//https://codesandbox.io/s/npvhr?file=/src/context/PeerContext.ts
//https://blog.logrocket.com/getting-started-peerjs/
//https://www.sitepoint.com/file-sharing-component-react/
