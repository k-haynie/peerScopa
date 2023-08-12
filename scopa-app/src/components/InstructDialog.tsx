import { Button, Dialog, DialogActions, DialogTitle, DialogContent, Typography } from "@mui/material";

export function InstructDialog(props: {open: boolean, setOpen: Function}) {
    return (
        <Dialog open={props.open}>
            <DialogTitle>
                How To Play
            </DialogTitle>
            <DialogContent>
                Be the first to 12 points to win!
                <br /><br />
                On your turn, choose a card from your hand and any number of cards on the playing field that match that value.
                You must take an exact value match if it exists. This group of cards is called a <b>trick</b>. You may choose to discard
                your selected card to the playing field as well. Any time you remove the last cards from the playing field, that
                is called a <b>Scopa!</b> and you get a point.
                <br /><br />
                Each round ends after all 40 cards have been in play. At the end of each round, any cards left in the playing field are given to 
                the player who took the last trick. Cards are counted and a point is given for each of the following:
                <ul>
                    <li>The most cards</li>
                    <li>The most sevens</li>
                    <li>The most hearts</li>
                    <li>The most tricks</li>
                    <li>The seven of hearts</li>
                    <li>Any Scopa points</li>
                </ul>
                The cards are then reshuffled and gameplay continues until a player wins.
                <br /><br />
                Good luck!
            </DialogContent>
            <DialogActions>
                <Button
                    autoFocus
                    variant="text"
                    onClick={() => props.setOpen(false)}
                >
                    OK
                </Button>
            </DialogActions>
        </Dialog>
    )
}