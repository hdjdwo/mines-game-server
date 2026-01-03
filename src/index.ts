import express from 'express';
import cors from 'cors';
import { StartGame } from './services/gameLogic.js';
import router from './routes/gameRoutes.js';
const app = express();
const port = process.env.PORT || 4000;


app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('API Root is running');
});

app.use('/api', router)


app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})