import express from 'express';
import cors from 'cors';
import router from './routes/gameRoutes.js';
const app = express();
const PORT = Number(process.env.PORT) || 3000;


app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://mines-game-client-s3vr.vercel.app', 
    'https://mines-game-client-s3vr-gqz01ycaf-vlads-projects-5e79a7a3.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());


app.get('/', (req, res) => {
    res.send('API Root is running');
});

app.use('/api', router)


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

