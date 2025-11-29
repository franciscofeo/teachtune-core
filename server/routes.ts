
import { Router } from 'express';
import { pool } from './db';
import { authMiddleware, AuthRequest } from './auth';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// --- Helpers de Mapeamento ---

// Mapeia snake_case do DB para camelCase do Frontend
const mapAluno = (row: any) => ({
  id: row.id,
  nome: row.nome,
  instrumento: row.instrumento,
  mensalidade: parseFloat(row.mensalidade), // Postgres retorna decimal como string
  ativo: row.ativo,
  configuracaoAgenda: row.configuracao_agenda
});

const mapAula = (row: any) => ({
  id: row.id,
  alunoId: row.aluno_id,
  data: row.data, // pg driver converte TIMESTAMP para Date object JS automaticamente
  dataAtualizacao: row.data_atualizacao,
  presente: row.presente,
  anotacoes: row.anotacoes || '',
  repertorio: Array.isArray(row.repertorio) ? row.repertorio : [],
  geradaAutomaticamente: row.gerada_automaticamente,
  recorrenciaId: row.recorrencia_id
});

// --- Rotas de Alunos ---

// Criar Aluno
router.post('/alunos', async (req: AuthRequest, res) => {
  const { id, nome, instrumento, mensalidade, ativo, configuracaoAgenda } = req.body;
  const professorId = req.professorId;
  
  try {
    const result = await pool.query(
      `INSERT INTO alunos (id, professor_id, nome, instrumento, mensalidade, ativo, configuracao_agenda)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, professorId, nome, instrumento, mensalidade, ativo, configuracaoAgenda]
    );
    res.status(201).json(mapAluno(result.rows[0]));
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Listar Alunos (apenas do professor autenticado)
router.get('/alunos', async (req: AuthRequest, res) => {
  const professorId = req.professorId;
  
  try {
    const result = await pool.query(
      'SELECT * FROM alunos WHERE professor_id = $1 ORDER BY nome ASC',
      [professorId]
    );
    res.json(result.rows.map(mapAluno));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar Aluno por ID (apenas se pertencer ao professor)
router.get('/alunos/:id', async (req: AuthRequest, res) => {
  const professorId = req.professorId;
  
  try {
    const result = await pool.query(
      'SELECT * FROM alunos WHERE id = $1 AND professor_id = $2',
      [req.params.id, professorId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Aluno não encontrado' });
    res.json(mapAluno(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar Aluno (apenas se pertencer ao professor)
router.put('/alunos/:id', async (req: AuthRequest, res) => {
  const { nome, instrumento, mensalidade, ativo, configuracaoAgenda } = req.body;
  const professorId = req.professorId;
  
  try {
    const result = await pool.query(
      `UPDATE alunos 
       SET nome = $1, instrumento = $2, mensalidade = $3, ativo = $4, configuracao_agenda = $5
       WHERE id = $6 AND professor_id = $7 RETURNING *`,
      [nome, instrumento, mensalidade, ativo, configuracaoAgenda, req.params.id, professorId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Aluno não encontrado' });
    res.json(mapAluno(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Rotas de Aulas ---

// Agendar Aula (Individual) - Verifica se aluno pertence ao professor
router.post('/aulas', async (req: AuthRequest, res) => {
  const { id, alunoId, data, dataAtualizacao, presente, anotacoes, repertorio, geradaAutomaticamente, recorrenciaId } = req.body;
  const professorId = req.professorId;
  
  try {
    // Verificar se o aluno pertence ao professor
    const alunoCheck = await pool.query(
      'SELECT id FROM alunos WHERE id = $1 AND professor_id = $2',
      [alunoId, professorId]
    );
    
    if (alunoCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Aluno não encontrado ou não pertence a este professor' });
    }
    
    await pool.query(
      `INSERT INTO aulas (id, aluno_id, data, data_atualizacao, presente, anotacoes, repertorio, gerada_automaticamente, recorrencia_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, alunoId, data, dataAtualizacao, presente, anotacoes, repertorio, geradaAutomaticamente || false, recorrenciaId]
    );
    res.status(204).send();
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Agendar Lote (Batch Insert) - Verifica se alunos pertencem ao professor
router.post('/aulas/batch', async (req: AuthRequest, res) => {
  const { aulas } = req.body; // Espera { aulas: Aula[] }
  const professorId = req.professorId;
  
  if (!aulas || aulas.length === 0) return res.status(200).send();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Verificar se todos os alunos pertencem ao professor
    const alunosIds = [...new Set(aulas.map((a: any) => a.alunoId))];
    const alunosCheck = await client.query(
      'SELECT id FROM alunos WHERE id = ANY($1::uuid[]) AND professor_id = $2',
      [alunosIds, professorId]
    );
    
    if (alunosCheck.rows.length !== alunosIds.length) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Um ou mais alunos não pertencem a este professor' });
    }
    
    // Construção dinâmica da query para insert múltiplo
    const values: any[] = [];
    const placeholders: string[] = [];
    
    let paramIndex = 1;
    aulas.forEach((aula: any) => {
      placeholders.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7}, $${paramIndex+8})`);
      values.push(
        aula.id, 
        aula.alunoId, 
        aula.data, 
        aula.dataAtualizacao, 
        aula.presente, 
        aula.anotacoes, 
        aula.repertorio, 
        aula.geradaAutomaticamente || false, 
        aula.recorrenciaId
      );
      paramIndex += 9;
    });

    const queryText = `
      INSERT INTO aulas (id, aluno_id, data, data_atualizacao, presente, anotacoes, repertorio, gerada_automaticamente, recorrencia_id)
      VALUES ${placeholders.join(', ')}
    `;

    await client.query(queryText, values);
    await client.query('COMMIT');
    res.status(204).send();
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Erro no batch insert:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Listar Aulas por Período (apenas aulas de alunos do professor)
router.get('/aulas', async (req: AuthRequest, res) => {
  const { inicio, fim } = req.query;
  const professorId = req.professorId;
  
  if (!inicio || !fim) {
    return res.status(400).json({ error: 'Parâmetros inicio e fim são obrigatórios' });
  }

  try {
    const result = await pool.query(
      `SELECT au.* FROM aulas au
       INNER JOIN alunos al ON au.aluno_id = al.id
       WHERE al.professor_id = $1 
         AND au.data >= $2 AND au.data <= $3 
       ORDER BY au.data ASC`,
      [professorId, inicio, fim]
    );
    res.json(result.rows.map(mapAula));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Listar Aulas por Aluno (apenas se o aluno pertencer ao professor)
router.get('/alunos/:alunoId/aulas', async (req: AuthRequest, res) => {
  const professorId = req.professorId;
  
  try {
    const result = await pool.query(
      `SELECT au.* FROM aulas au
       INNER JOIN alunos al ON au.aluno_id = al.id
       WHERE au.aluno_id = $1 AND al.professor_id = $2
       ORDER BY au.data DESC`,
      [req.params.alunoId, professorId]
    );
    res.json(result.rows.map(mapAula));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar Aula (apenas se pertencer a aluno do professor)
router.put('/aulas/:id', async (req: AuthRequest, res) => {
  const { presente, anotacoes, repertorio, dataAtualizacao } = req.body;
  const professorId = req.professorId;
  
  try {
    const result = await pool.query(
      `UPDATE aulas au
       SET presente = $1, anotacoes = $2, repertorio = $3, data_atualizacao = $4
       FROM alunos al
       WHERE au.id = $5 
         AND au.aluno_id = al.id 
         AND al.professor_id = $6`,
      [presente, anotacoes, repertorio, dataAtualizacao || new Date(), req.params.id, professorId]
    );
    
    if (result.rowCount === 0) return res.status(404).json({ error: 'Aula não encontrada' });
    res.json({ status: 'updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Deletar Aula (apenas se pertencer a aluno do professor)
router.delete('/aulas/:id', async (req: AuthRequest, res) => {
  const professorId = req.professorId;
  
  try {
    const result = await pool.query(
      `DELETE FROM aulas au
       USING alunos al
       WHERE au.id = $1 
         AND au.aluno_id = al.id 
         AND al.professor_id = $2`,
      [req.params.id, professorId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Aula não encontrada' });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Deletar Aulas Futuras Automáticas (apenas se aluno pertencer ao professor)
router.delete('/aulas/future/:alunoId', async (req: AuthRequest, res) => {
  const professorId = req.professorId;
  
  try {
    await pool.query(
      `DELETE FROM aulas au
       USING alunos al
       WHERE au.aluno_id = $1 
         AND au.aluno_id = al.id
         AND al.professor_id = $2
         AND au.data > NOW() 
         AND au.gerada_automaticamente = true`,
      [req.params.alunoId, professorId]
    );
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
