import seedrandom from "seedrandom";

interface ActiveGameState {
mines: number[];
seed: string;
minesCount: number;
}

const activeGames: Record<string, ActiveGameState> = {}

const generateGameId = () => {
 return (Math.random().toString(36).substring(2, 6) + Date.now().toString(36)).toLocaleUpperCase();
}


const randomizeMines = (minesCount: number, serverSeed: string) => {
    const selectionPool = Array.from({length: 25}, (_, index) => index);
    const selectedMines: number[] = [];
    let rng = seedrandom(serverSeed);

   for(let i = 0; i < minesCount; i++) {
        let randomIndex = Math.floor(rng() * selectionPool.length); 
        
        let currentNumber = selectionPool[randomIndex];
        if(currentNumber !== undefined) 
        selectedMines.push(currentNumber);
        
        selectionPool.splice(randomIndex, 1);
    }
    return selectedMines;
}

export const StartGame = (minesCount: number, userId: string = '#') : {gameId: string, error?: string} => {
if (typeof minesCount !== "number" || minesCount <= 0 || minesCount > 24) {
        return { gameId: 'INVALID', error: 'Invalid minesCount' };
    }

    const serverSeed = userId + Date.now() + Math.random().toString(36);
    
    const gameId = generateGameId();
    
    const selectedMines = randomizeMines(minesCount, serverSeed);
    
    activeGames[gameId] = {
        mines: selectedMines,
        seed: serverSeed, 
        minesCount: minesCount,
    };
    
    console.log(`Игра ${gameId} начата. Мины:`, selectedMines);

    return { gameId };
}

export const checkTile = (tileIndex: number, gameId: string): boolean => {
    const currentGame = activeGames[gameId];

    if (!currentGame) {
        throw new Error('Game not found.');
    }
    return currentGame.mines.includes(tileIndex);
}