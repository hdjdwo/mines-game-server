import { Router } from "express";
import {  checkTile, StartGame } from "../services/gameLogic.js";


const router = Router();

router.post('/start-game', (req, res) => {
  try {
    const {minesCount} = req.body as { minesCount: number };
    const result = StartGame(minesCount);
    if(result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ gameId: result.gameId });
  } catch(error) {
    console.error('Error starting game:', error);
        res.status(500).json({ error: 'Internal server error' });
  }
})


router.post('/reveal-cell', (req, res) => {
    
    const { tileIndex, gameId } = req.body as { tileIndex: number, gameId: string };
    
    if (!gameId || typeof tileIndex !== 'number' || tileIndex < 0 || tileIndex >= 25) {
        return res.status(400).json({ error: 'Invalid gameId or tileIndex.' });
    }

    try {
     
        const isMine = checkTile(tileIndex, gameId);

        if (isMine) {
            res.json({ result: 'mine', message: 'Game Over' });
        } else {
            res.json({ result: 'safe', message: 'Continue playing', score: 1 });
        }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Game not found')) {
             return res.status(404).json({ error: error.message });
        }
        
        console.error('Cell selection error:', error);
        res.status(500).json({ error: 'Internal server error during tile check.' });
    }
});

export default router