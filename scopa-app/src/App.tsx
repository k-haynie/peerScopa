import './App.css';
import * as React from 'react';
import Game from './components/Game';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import { InstructDialog } from "./components/InstructDialog"
import { IconButton } from "@mui/material";
import { Help } from "@mui/icons-material";

const theme = createTheme({
  palette: {
    primary: {
      main: "#006400",
    },
    secondary: {
      main: "#438C43",
    },
  }
});

function App(){
  const [instructionsOpen, setInstructionsOpen] = React.useState(false);

  return(
    <ThemeProvider theme={theme}>
      <SnackbarProvider maxSnack={3} preventDuplicate>
        <Game />
        <IconButton onClick={() => setInstructionsOpen(true)} style={{position: "absolute", right: "20px", bottom: "20px"}}>
          <Help fontSize="large"/>
        </IconButton>
        <InstructDialog 
          open={instructionsOpen}
          setOpen={setInstructionsOpen}
        />
      </SnackbarProvider>
    </ThemeProvider>
  )
}

export default App;

// update if random disconnect