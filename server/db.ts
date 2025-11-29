
import { Pool } from 'pg';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  console.warn("ATENÇÃO: DATABASE_URL não definida. O backend falhará ao tentar conectar.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Wrapper para queries simples
export const query = (text: string, params?: any[]) => pool.query(text, params);
