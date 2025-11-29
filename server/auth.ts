import { Router, Request, Response, NextFunction } from 'express';
import { pool } from './db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();

// Secret para JWT (em produção, usar variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || 'teachtune_secret_key_change_in_production';
const JWT_EXPIRES_IN = '7d'; // Token válido por 7 dias

// Interface para o payload do JWT
interface JWTPayload {
  professorId: string;
  email: string;
}

// Interface para Request com usuário autenticado
export interface AuthRequest extends Request {
  professorId?: string;
  professorEmail?: string;
}

// Middleware de autenticação
export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Buscar token do header Authorization ou cookie
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    // Verificar token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Verificar se professor ainda existe e está ativo
    const result = await pool.query(
      'SELECT id, email, ativo FROM professores WHERE id = $1',
      [decoded.professorId]
    );

    if (result.rows.length === 0 || !result.rows[0].ativo) {
      return res.status(401).json({ error: 'Usuário inválido ou inativo' });
    }

    // Adicionar dados do professor ao request
    req.professorId = decoded.professorId;
    req.professorEmail = decoded.email;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(500).json({ error: 'Erro ao verificar autenticação' });
  }
};

// Rota de Cadastro
router.post('/cadastro', async (req, res) => {
  const { nome, email, senha, telefone } = req.body;

  try {
    // Validações básicas
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar se email já existe
    const existingUser = await pool.query(
      'SELECT id FROM professores WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Criar professor
    const result = await pool.query(
      `INSERT INTO professores (nome, email, senha_hash, telefone, ativo)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, nome, email, telefone, created_at`,
      [nome, email.toLowerCase(), senhaHash, telefone || null]
    );

    const professor = result.rows[0];

    // Gerar token JWT
    const token = jwt.sign(
      { professorId: professor.id, email: professor.email } as JWTPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Retornar dados do professor e token
    res.status(201).json({
      professor: {
        id: professor.id,
        nome: professor.nome,
        email: professor.email,
        telefone: professor.telefone,
        createdAt: professor.created_at
      },
      token
    });
  } catch (error: any) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ error: 'Erro ao cadastrar professor' });
  }
});

// Rota de Login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    // Validações básicas
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar professor por email
    const result = await pool.query(
      'SELECT id, nome, email, senha_hash, telefone, ativo FROM professores WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const professor = result.rows[0];

    // Verificar se está ativo
    if (!professor.ativo) {
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, professor.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    // Atualizar último acesso
    await pool.query(
      'UPDATE professores SET ultimo_acesso = NOW() WHERE id = $1',
      [professor.id]
    );

    // Gerar token JWT
    const token = jwt.sign(
      { professorId: professor.id, email: professor.email } as JWTPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Retornar dados do professor e token
    res.json({
      professor: {
        id: professor.id,
        nome: professor.nome,
        email: professor.email,
        telefone: professor.telefone
      },
      token
    });
  } catch (error: any) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Rota para verificar token (retorna dados do professor autenticado)
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nome, email, telefone, created_at, ultimo_acesso FROM professores WHERE id = $1',
      [req.professorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Professor não encontrado' });
    }

    const professor = result.rows[0];

    res.json({
      id: professor.id,
      nome: professor.nome,
      email: professor.email,
      telefone: professor.telefone,
      createdAt: professor.created_at,
      ultimoAcesso: professor.ultimo_acesso
    });
  } catch (error: any) {
    console.error('Erro ao buscar professor:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do professor' });
  }
});

// Rota de Logout (opcional, já que JWT é stateless)
router.post('/logout', (req, res) => {
  // Limpar cookie se estiver usando
  res.clearCookie('token');
  res.json({ message: 'Logout realizado com sucesso' });
});

export default router;

