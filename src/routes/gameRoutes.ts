import { Router } from "express";
import {  checkTile, getAllMines, HandleMinesCount, StartGame, TEST_getAllMines, WinGame } from "../services/gameLogic.js";
import { getPayoutTable } from "../services/gameMath.js";
import { prisma } from "../lib/prisma.js";
import { error } from 'console';


const router = Router();
const RTP_CONFIG = 0.90
const userId = 'Test'

router.post('/start-game', async (req, res) => {
    const gameMode = 'MANUAL'
  try {
    const {minesCount, userBet} = req.body as { minesCount: number, userBet: number };
    const result = await StartGame(minesCount, userId, userBet, gameMode);
    const paytable = getPayoutTable(minesCount, RTP_CONFIG)
    if(result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ gameId: result.gameId, paytable, rtp: RTP_CONFIG });
  } catch(error) {
    console.error('Error starting game:', error);
        res.status(500).json({ error: 'Internal server error' });
  }
})


router.post('/reveal-cell', async (req, res) => {
    const { tileIndex, gameId } = req.body as { tileIndex: number, gameId: string };
    
    if (!gameId || typeof tileIndex !== 'number' || tileIndex < 0 || tileIndex >= 25) {
        return res.status(400).json({ error: 'Invalid gameId or tileIndex.' });
    }

    try {
       
        const isMine = await checkTile(tileIndex, gameId);
        const mineFlag = typeof isMine === 'object' ? isMine.hasMines : isMine        
        const stepResult = await HandleMinesCount(mineFlag, gameId, RTP_CONFIG); 
        
        if (isMine) {
           
            const minesArray = await getAllMines(gameId); 
            return res.json({ 
                result: 'mine', 
                multiplier: 0, 
                allMines: minesArray, 
                status: 'LOST' 
            });
        }

      
        return res.json({ 
            result: 'safe', 
            currentMultiplier: stepResult.currentMultiplier,
            status: 'PLAYING'
        });

    } catch (error: any) {
        if (error.message.includes('Game not found')) {
            return res.status(404).json({ error: 'Game not found.' });
        }
        if (error.message.includes('already finished')) {
            return res.status(400).json({ error: 'This game is already over.' });
        }
        console.error('Cell selection error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

router.post('/reveal-cell-auto', async (req, res) => {
    const { selectedTiles, minesCount, userBet, isGameStarted } = req.body as { 
  selectedTiles: number[],
  minesCount: number,
  userBet: number,
  isGameStarted?: boolean 
};

const gameMode = 'AUTO'
const isArray = Array.isArray(selectedTiles);
const hasNoDuplicates = isArray && selectedTiles.length === new Set(selectedTiles).size;
const allInRange = isArray && selectedTiles.every(index => index >= 0 && index <= 24);
const paytable = getPayoutTable(minesCount, RTP_CONFIG)

 if ( !isArray || !hasNoDuplicates || !allInRange) {
        return res.status(400).json({ error: 'Invalid gameId or tileIndex.' });
    }

    try {
        if(isGameStarted) {
            const start = await StartGame(minesCount, userId, userBet, gameMode)
        const check = await checkTile(selectedTiles, start.gameId)
        if(typeof check === 'boolean') return res.status(400).json({ error: 'Invalid start game' });
        const {result, hasMines} = check
        let winAmount = 0;
        if (!hasMines) {
            winAmount = await WinGame(start.gameId, RTP_CONFIG);
        } 
           return res.json({paytable, result, isWin: !hasMines, winAmount})
        }
        return res.status(400).json({ error: 'Invalid start game' });
    }
    catch(error) {
        console.error('AUTO GAME ERROR:', error);
    res.status(500).json({ error: 'Internal server error' });
}

} )

router.post('/get-paytable', async (req, res) => {
const {minesCount} = req.body as {minesCount: number}
if(!minesCount) return res.status(400).json({ error: 'Invalid minesCount.' });
try {
    const paytable = await getPayoutTable(minesCount, RTP_CONFIG)
    if(!paytable || minesCount < 2 || minesCount > 24) {
     return res.json({ result: [], error: 'Invalid MinesCount'});
    } else {
        return  res.json({table: paytable})

    }
    
}
catch(error) {
    console.error('Error starting game:', error);
        res.status(500).json({ error: 'Internal server error' });
}
}
    
)

router.post('/test-route', async(req, res) => {
const {gameId} = req.body as {gameId: string}
if(!gameId) return res.status(400).json({ error: 'Invalid gameId.' });
try {
    const mines = await TEST_getAllMines(gameId)
    if(!mines) {
     return res.json({ result: [], error: 'Invalid TEST'});
    } else {
        return  res.json({result: mines})

    }
    
}
catch(error) {
    console.error('Error starting game:', error);
        res.status(500).json({ error: 'Internal server error' });
}
}
    
)


router.post('/win-game', async (req, res) => {
    const {gameId} = req.body as {gameId: string}
    if(!gameId) return res.status(400).json({ error: 'Invalid gameId.' });
    try {
      const winBet = await WinGame(gameId, RTP_CONFIG);
        const allMines = await getAllMines(gameId)
        res.json({status: 'WIN', allMines: allMines, winAmount: winBet} )
    } catch(error) {
        res.status(500).json({ error: 'Error calculating winnings, game not found' });
    }
})

router.post('/get-unfinished-game', async (req, res) => {
    const {userId} = req.body as {userId: string} 

    try {
        const activeGame = await prisma.userGames.findFirst({
            where: {
                userId: userId,
                status: 'PLAYING'
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!activeGame) {
            const lastGame = await prisma.userGames.findFirst({
                where: {userId},
                orderBy: {createdAt: 'desc'}
            })
            if(lastGame) {
                return res.json({
                    hasActiveGame: false,
                    betAmount: lastGame.betAmount.toNumber(),
                    minesCount: lastGame.minesCount,
                    isSettings: true
                })
            }
            return res.json({ hasActiveGame: false });
            
        }

        const currentStep = (activeGame.gameState as any).opened.length;
const table = getPayoutTable(activeGame.minesCount, RTP_CONFIG);
const multiplier = table.find(t => t.step === currentStep)?.multiplier || 1
     const paytable = getPayoutTable(activeGame.minesCount, RTP_CONFIG)
        res.json({
            hasActiveGame: true,
            isSettings: false,
            gameId: activeGame.gameId,
            betAmount: activeGame.betAmount.toNumber(),
            minesCount: activeGame.minesCount,
            opened: (activeGame.gameState as any).opened || [],
            paytable: paytable,
            currentScore: Math.floor(activeGame.betAmount.toNumber() * multiplier * 100) / 100
        });

    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});




export default router