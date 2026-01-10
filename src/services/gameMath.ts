

export const calculateMultiplier = (minesCount: number, safePicks: number, rtp: number ): number => {
const totalTiles = 25;
const safeTiles = totalTiles - minesCount;
if(safePicks <= 0) return 1.0
if(safePicks > safeTiles) return 0
let probability = 1.0
for(let i = 0; i<safePicks; i++) {
  probability *= (safeTiles - i)/ (totalTiles - i)
}

const multiplier = rtp/probability

return Math.floor(multiplier*100)/100
}


export const getPayoutTable = (minesCount: number, rtp: number) => {
  const steps = [];
  const maxSteps = 25 - minesCount; 
  
  for (let i = 1; i <= maxSteps; i++) {
    steps.push({
      step: i,
      multiplier: calculateMultiplier(minesCount, i, rtp)
    });
  }
  return steps;
};