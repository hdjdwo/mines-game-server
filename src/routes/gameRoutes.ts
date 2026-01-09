import { Router } from "express";
import {  activeGames, checkTile, HandleMinesCount, StartGame } from "../services/gameLogic.js";
import { getPayoutTable } from "../services/gameMath.js";
import { error } from "console";


const router = Router();
const RTP_CONFIG = 0.90

router.post('/start-game', (req, res) => {
  try {
    const {minesCount} = req.body as { minesCount: number };
    const result = StartGame(minesCount);
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


router.post('/reveal-cell', (req, res) => {
    
    const { tileIndex, gameId,} = req.body as { tileIndex: number, gameId: string,};
    
    if (!gameId || typeof tileIndex !== 'number' || tileIndex < 0 || tileIndex >= 25) {
        return res.status(400).json({ error: 'Invalid gameId or tileIndex.' });
    }

    try {
     
        const isMine = checkTile(tileIndex, gameId);
        const stepResult = HandleMinesCount(isMine, gameId); 
        if (isMine) {
            res.json({ result: 'mine', multiplier: 0 });
        } else if (activeGames[gameId]) {
            res.json({ 
                result: 'safe', 
                currentMultiplier: stepResult.currentMultiplier,
                safePick: activeGames[gameId].safePick 
            });
        }
        res.json({ result: 'NaN', multiplier: 0, error: 'Invalid GameID' });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Game not found')) {
             return res.status(404).json({ error: error.message });
        }
        
        console.error('Cell selection error:', error);
        res.status(500).json({ error: 'Internal server error during tile check.' });
    }
});

router.post('/get-paytable', (req, res) => {
const {minesCount} = req.body as {minesCount: number}
if(!minesCount) return res.status(400).json({ error: 'Invalid minesCount.' });
try {
    const paytable = getPayoutTable(minesCount, RTP_CONFIG)
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

export default router