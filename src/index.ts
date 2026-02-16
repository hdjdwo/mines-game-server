import express from 'express';
import cors from 'cors';
import router from './routes/gameRoutes.js';
const app = express();
const PORT = Number(process.env.PORT) || 3000;


app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.send('API Root is running');
});

app.use('/api', router)


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

