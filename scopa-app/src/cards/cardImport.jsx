import cardAC from "./AC.svg";
import cardAD from "./AD.svg";
import cardAH from "./AH.svg";
import cardAS from "./AS.svg";
import card2C from "./2C.svg";
import card2D from "./2D.svg";
import card2H from "./2H.svg";
import card2S from "./2S.svg";
import card3C from "./3C.svg";
import card3D from "./3D.svg";
import card3H from "./3H.svg";
import card3S from "./3S.svg";
import card4C from "./4C.svg";
import card4D from "./4D.svg";
import card4H from "./4H.svg";
import card4S from "./4S.svg";
import card5C from "./5C.svg";
import card5D from "./5D.svg";
import card5H from "./5H.svg";
import card5S from "./5S.svg";
import card6C from "./6C.svg";
import card6D from "./6D.svg";
import card6H from "./6H.svg";
import card6S from "./6S.svg";
import card7C from "./7C.svg";
import card7D from "./7D.svg";
import card7H from "./7H.svg";
import card7S from "./7S.svg";
import card8C from "./8C.svg";
import card8D from "./8D.svg";
import card8H from "./8H.svg";
import card8S from "./8S.svg";
import card9C from "./9C.svg";
import card9D from "./9D.svg";
import card9H from "./9H.svg";
import card9S from "./9S.svg";
import card10C from "./10C.svg";
import card10D from "./10D.svg";
import card10H from "./10H.svg";
import card10S from "./10S.svg";

export default function cardSVG(name) {
    const cards = {
        "1C": cardAC,
        "1S": cardAS,
        "1H": cardAH,
        "1D": cardAD,
        "2C": card2C,
        "2S": card2S,
        "2H": card2H,
        "2D": card2D,
        "3C": card3C,
        "3S": card3S,
        "3H": card3H,
        "3D": card3D,        
        "4C": card4C,
        "4S": card4S,
        "4H": card4H,
        "4D": card4D,        
        "5C": card5C,
        "5S": card5S,
        "5H": card5H,
        "5D": card5D,        
        "6C": card6C,
        "6S": card6S,
        "6H": card6H,
        "6D": card6D,        
        "7C": card7C,
        "7S": card7S,
        "7H": card7H,
        "7D": card7D,        
        "8C": card8C,
        "8S": card8S,
        "8H": card8H,
        "8D": card8D,        
        "9C": card9C,
        "9S": card9S,
        "9H": card9H,
        "9D": card9D,        
        "10C": card10C,
        "10S": card10S,
        "10H": card10H,
        "10D": card10D,
    };

    if (Object.keys(cards).includes(name)) {
        return cards[name];
    }
    return null;
}