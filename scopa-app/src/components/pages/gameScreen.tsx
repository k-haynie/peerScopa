import React from "react";

interface GameScreenProps {
    playingField: number[];
    hand: number[];
    playSelection: Function;
    turn: boolean;
}

export function GameScreen(props: GameScreenProps){
    const fieldRef = React.useRef(null);
    const handRef = React.useRef(null);
    return (
        <div>
            <ul ref={fieldRef}>
                {props.playingField.map((card, index) => (
                    <li key={index}>
                        <input type="checkbox" value={card}/>{card}
                    </li>
                ))}
            </ul>
            <select ref={handRef} defaultValue={""}>
                {props.hand?.map((card, index) => (
                    <option key={index} value={card}>
                        {card}
                    </option>
                ))}
            </select>
            {props.turn ? <button onClick={() => props.playSelection(fieldRef.current, handRef.current)}>Go</button> : null}
            
        </div>
    )
}