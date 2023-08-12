import React from "react";
import { CardProps } from "../Card";
import cardSVG from "../../cards/cardImport";
import { Button } from "@mui/material";

interface GameScreenProps {
    playingField: CardProps[];
    hand: CardProps[];
    playSelection: Function;
    turn: boolean;
}

export function GameScreen(props: GameScreenProps){
    const [fieldChoice, setFieldChoice] = React.useState<number[]>([]);
    const [handChoice, setHandChoice] = React.useState<number | null>(null);

    React.useEffect(() => {
        setFieldChoice([]);
    }, [props.playingField])

    function play() {
        props.playSelection(fieldChoice, handChoice);
        setFieldChoice([]);
        setHandChoice(null);
    }

    return (
        <div className="gameInterface">
            <div className="hhand field">
                {props.playingField.map((card, index) => (
                    <img 
                        onClick={() => setFieldChoice(old => old.includes(card.card_id) ? old.filter(i => i !== card.card_id) : [...old, card.card_id])} 
                        style={{
                            width: "100px",
                            filter: fieldChoice.includes(card.card_id) ? "drop-shadow(black 5px 5px 5px)" : "none"
                        }} 
                        key={index} className="card" 
                        src={cardSVG(card.value + card.suite)} 
                    />
                ))}
            </div>
            <div className="hhand-compact">
                {props.hand?.map((card, index) => (
                    <img 
                        onClick={() => setHandChoice(old => old === card.card_id ? null : card.card_id)} 
                        style={{
                            width: "100px",
                            marginBottom: handChoice === card.card_id ? "10px" : "0px",
                            filter: handChoice === card.card_id ? "drop-shadow(black 5px 5px 5px)" : "none"
                        }} 
                        key={index} className="card" 
                        src={cardSVG(card.value + card.suite)} 
                    />
                ))}
            </div>
            {props.turn ? <Button className="goBtn" variant="contained" onClick={play}>Go</Button> : null}
        </div>
    )
}