import seedrandom from "seedrandom";
import { calculateMultiplier } from "./gameMath.js";

type GameStatus = 'FINISH' | 'NO_FINISH'

interface ActiveGameState {
mines: number[];
seed: string;
minesCount: number;
safePick: number;
status: GameStatus;
}

export const activeGames: Record<string, ActiveGameState> = {}

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
        safePick: 0,
        status: 'NO_FINISH'
    };
    
    console.log(`Игра ${gameId} начата. Мины:`, selectedMines);

    return { gameId };
}

export const checkTile = (tileIndex: number, gameId: string): boolean => {
    const currentGame = activeGames[gameId];

    if (!currentGame) {
        throw new Error('Game not found.');
    }
    if(currentGame.mines.includes(tileIndex)) {
        currentGame.status = 'FINISH'
    }
    return currentGame.mines.includes(tileIndex);
}

export const getAllMines = (gameId: string) => {
const currentGame = activeGames[gameId]

 if (!currentGame) {
        throw new Error('Game not found.');
    }
if(currentGame.status === 'FINISH') {
    return currentGame.mines
} 
    throw new Error('Game not Finished.')
}

export const TEST_getAllMines = (gameId: string) => {
const currentGame = activeGames[gameId]
if (!currentGame) {
        throw new Error('Game not found.');
    }
    return currentGame.mines
}

export const HandleMinesCount = (isMine: boolean, gameId: string, rtp: number = 0.90): {currentMultiplier: number, error?: string} => {
    const currentGame = activeGames[gameId];
    if (currentGame) {
        if (isMine) {
            currentGame.safePick = 0;
            return { currentMultiplier: 0 };
        } 
        currentGame.safePick += 1;
        const multiplier = calculateMultiplier(currentGame.minesCount, currentGame.safePick, rtp); 
        return { currentMultiplier: multiplier };
    }
    return { currentMultiplier: 0, error: 'Invalid game' };
}