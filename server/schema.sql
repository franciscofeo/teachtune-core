-- TeachTune Database Schema

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- Para criptografia de senhas

-- Tabela de Professores/Usuários
CREATE TABLE IF NOT EXISTS professores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  ativo BOOLEAN DEFAULT true,
  email_verificado BOOLEAN DEFAULT false,
  ultimo_acesso TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT email_valido CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_professores_email ON professores(email);
CREATE INDEX IF NOT EXISTS idx_professores_ativo ON professores(ativo);

-- Tabela de Alunos (agora com referência ao professor)
CREATE TABLE IF NOT EXISTS alunos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professor_id UUID NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  instrumento VARCHAR(100) NOT NULL,
  mensalidade DECIMAL(10, 2) NOT NULL CHECK (mensalidade >= 0),
  ativo BOOLEAN DEFAULT true,
  configuracao_agenda JSONB, -- Armazena ConfiguracaoAgenda como JSON
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Aulas
CREATE TABLE IF NOT EXISTS aulas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  data TIMESTAMP NOT NULL, -- Data e hora agendada
  data_atualizacao TIMESTAMP DEFAULT NOW(),
  presente BOOLEAN DEFAULT NULL, -- null = pendente, true = presente, false = ausente
  anotacoes TEXT DEFAULT '',
  repertorio JSONB DEFAULT '[]'::jsonb, -- Array de strings em formato JSON
  gerada_automaticamente BOOLEAN DEFAULT false,
  recorrencia_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_alunos_professor_id ON alunos(professor_id);
CREATE INDEX IF NOT EXISTS idx_alunos_ativo ON alunos(ativo);
CREATE INDEX IF NOT EXISTS idx_alunos_professor_ativo ON alunos(professor_id, ativo);
CREATE INDEX IF NOT EXISTS idx_aulas_aluno_id ON aulas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_aulas_data ON aulas(data);
CREATE INDEX IF NOT EXISTS idx_aulas_presente ON aulas(presente);
CREATE INDEX IF NOT EXISTS idx_aulas_aluno_data ON aulas(aluno_id, data);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas
DROP TRIGGER IF EXISTS update_professores_updated_at ON professores;
CREATE TRIGGER update_professores_updated_at
  BEFORE UPDATE ON professores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alunos_updated_at ON alunos;
CREATE TRIGGER update_alunos_updated_at
  BEFORE UPDATE ON alunos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_aulas_updated_at ON aulas;
CREATE TRIGGER update_aulas_updated_at
  BEFORE UPDATE ON aulas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Dados de exemplo (opcional - comentar se não quiser)
-- INSERT INTO alunos (nome, instrumento, mensalidade, ativo) VALUES
--   ('João Silva', 'Violão', 250.00, true),
--   ('Maria Santos', 'Piano', 300.00, true),
--   ('Pedro Oliveira', 'Guitarra', 280.00, true);

-- Comentários informativos
COMMENT ON TABLE professores IS 'Tabela de professores/usuários do sistema';
COMMENT ON TABLE alunos IS 'Tabela de alunos cadastrados por cada professor';
COMMENT ON TABLE aulas IS 'Tabela de aulas agendadas e realizadas';
COMMENT ON COLUMN aulas.presente IS 'null = pendente, true = presente, false = ausente';
COMMENT ON COLUMN professores.senha_hash IS 'Hash bcrypt da senha do professor';

-- Função helper para criar senha hash (usar no backend, mas disponível no DB)
CREATE OR REPLACE FUNCTION criar_senha_hash(senha TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(senha, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql;

-- Função helper para verificar senha
CREATE OR REPLACE FUNCTION verificar_senha(senha TEXT, senha_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN senha_hash = crypt(senha, senha_hash);
END;
$$ LANGUAGE plpgsql;

