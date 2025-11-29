
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pool } from './db';
import routes from './routes';
import authRoutes from './auth';
import 'dotenv/config'; // Certifique-se de ter dotenv instalado

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true // Permite cookies
}));
app.use(express.json()); // Parse de JSON no body
app.use(cookieParser()); // Parse de cookies

// Rotas de Autenticação (públicas)
app.use('/api/auth', authRoutes);

// Rotas da API (protegidas - adicionar authMiddleware depois)
app.use('/api', routes);

// Health Check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
