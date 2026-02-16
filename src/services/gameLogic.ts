import seedrandom from "seedrandom";
import { calculateMultiplier } from "./gameMath.js";
import { prisma } from "../lib/prisma.js";

const generateGameId = () => {
    return (Math.random().toString(36).substring(2, 6) + Date.now().toString(36)).toLocaleUpperCase();
}

const randomizeMines = (minesCount: number, serverSeed: string) => {
    const selectionPool = Array.from({ length: 25 }, (_, index) => index);
    const selectedMines: number[] = [];
    let rng = seedrandom(serverSeed);

    for (let i = 0; i < minesCount; i++) {
        let randomIndex = Math.floor(rng() * selectionPool.length);
        let currentNumber = selectionPool[randomIndex];
        if (currentNumber !== undefined) selectedMines.push(currentNumber);
        selectionPool.splice(randomIndex, 1);
    }
    return selectedMines;
}

export const StartGame = async (minesCount: number, userId: string = '#', userBet: number = 10, gameMode: string, initialBalance: number = 1000): Promise<{ gameId: string; error?: string; }> => {
    if (typeof minesCount !== "number" || minesCount <= 0 || minesCount > 24) {
        return { gameId: 'INVALID', error: 'Invalid minesCount' };
    }

    const user = await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, balance: initialBalance }
    });

    if (user.balance.toNumber() < userBet) {
        return { gameId: 'INVALID', error: 'Insufficient balance' };
    }

    const serverSeed = userId + Date.now() + Math.random().toString(36);
    const gameId = generateGameId();
    const selectedMines = randomizeMines(minesCount, serverSeed);

    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: { balance: { decrement: userBet } }
        }),
        prisma.userGames.create({
            data: {
                gameId,
                userId,
                betAmount: userBet,
                minesPositions: selectedMines,
                minesCount,
                seed: serverSeed,
                status: 'PLAYING',
                gameState: { opened: [] },
                gameMode: gameMode
            }
        })
    ]);

    return { gameId };
}


export const checkTile = async (tileIndex: number | number[], gameId: string,): Promise<boolean | {result :{index: number, isMine: boolean}[], hasMines: boolean}> => {
    const currentGame = await prisma.userGames.findUnique({
        where: { gameId }
    });

    if (!currentGame || currentGame.status !== 'PLAYING') {
        throw new Error('Invalid game state');
    }

    const allMines = currentGame.minesPositions;

    if(currentGame.gameMode === 'MANUAL' && !Array.isArray(tileIndex)) {
        const isMine = allMines.includes(tileIndex);
    const currentGameState = (currentGame.gameState as { opened?: number[] }) || { opened: [] };
    const updatedOpenedTiles = [...(currentGameState.opened || []), tileIndex];

    await prisma.userGames.update({
        where: { gameId },
        data: {
            status: isMine ? 'LOSE' : 'PLAYING',
            gameState: { opened: updatedOpenedTiles }
        }
    });
    return isMine;
    } 
        if (Array.isArray(tileIndex)) {
        const result = tileIndex.map(index => ({
        index: index,         
        isMine: allMines.includes(index) 
    }));

        const hasMines = result.some(item => item.isMine === true);

        await prisma.userGames.update({
            where: { gameId },
            data: {
                status: hasMines ? 'LOSE' : 'WIN', 
                gameState: { opened: tileIndex } 
            }
        });

        return {result, hasMines};
    }

    throw new Error('Invalid input: tileIndex must be an array for AUTO mode');
    
    
};

export const HandleMinesCount = async (isMine: boolean, gameId: string, rtp: number): Promise<{ currentMultiplier: number; error?: string; }> => {
    const currentGame = await prisma.userGames.findUnique({
        where: { gameId }
    });
   
    if (!currentGame) return { currentMultiplier: 0, error: 'Invalid game' };

    if (isMine) return { currentMultiplier: 0 };

    const currentGameState = (currentGame.gameState as { opened: number[] });
    const multiplier = calculateMultiplier(currentGame.minesCount, currentGameState.opened.length, rtp); 
    
    return { currentMultiplier: multiplier };
}

export const WinGame = async (gameId: string, rtp: number) => {
    const currentGame = await prisma.userGames.findUnique({
        where: { gameId }
    });

    if (!currentGame || currentGame.status !== 'PLAYING') {
        throw new Error('Game not found or already finished');
    }

    const currentGameState = (currentGame.gameState as { opened: number[] });
    const currentMultiplier = calculateMultiplier(currentGame.minesCount, currentGameState.opened.length, rtp);
    const winAmount = Math.floor(currentMultiplier * currentGame.betAmount.toNumber() * 100) / 100;

    await prisma.$transaction([
        prisma.userGames.update({
            where: { gameId },
            data: { status: 'WIN', payout: winAmount }
        }),
        prisma.user.update({
            where: { id: currentGame.userId },
            data: { balance: { increment: winAmount } }
        })
    ]);

    return winAmount;
}

export const getAllMines = async (gameId: string) => {
    const currentGame = await prisma.userGames.findUnique({
        where: { gameId }
    });

    if (!currentGame) throw new Error('Game not found.');
    
    if (currentGame.status === 'LOSE' || currentGame.status === 'WIN') {
        return currentGame.minesPositions;
    }
    throw new Error('Game not finished.');
}

export const TEST_getAllMines = async (gameId: string) => {
    const currentGame = await prisma.userGames.findUnique({
        where: { gameId }
    });
    if (!currentGame) throw new Error('Game not found.');
    return currentGame.minesPositions;
}