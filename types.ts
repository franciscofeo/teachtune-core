
// Entities (Entidades)
export type FrequenciaRecorrencia = 'semanal' | 'quinzenal' | 'mensal';

export interface HorarioSemanal {
  diaSemana: number; // 0 (Domingo) - 6 (Sábado)
  horario: string; // "14:30"
}

export interface ConfiguracaoAgenda {
  frequencia: FrequenciaRecorrencia;
  dataInicio: string; // ISO Date (Define o início do ciclo)
  horarios: HorarioSemanal[]; // Lista de dias e horários na semana
}

export interface Aluno {
  id: string;
  nome: string;
  instrumento: string;
  mensalidade: number; // Valor mensal em reais
  ativo: boolean; // Status do aluno (Ativo/Inativo)
  configuracaoAgenda?: ConfiguracaoAgenda; // Configuração recorrente do aluno
}

export interface Aula {
  id: string;
  alunoId: string;
  data: string; // ISO string date (Data e Hora AGENDADA para a aula acontecer)
  dataAtualizacao?: string; // ISO string date (Data da última modificação do registro)
  presente: boolean | null; // null = pendente
  anotacoes: string;
  repertorio: string[];
  // Campos de referência (apenas para saber se foi gerada automaticamente)
  geradaAutomaticamente?: boolean;
  recorrenciaId?: string;
}

export interface DashboardStats {
  totalAlunos: number;
  alunosAtivos: number;
  rendaMensalEstimada: number;
  aulasHoje: number;
  aulasPendentesHoje: number;
}

// UI State Types
export type ViewType = 'dashboard' | 'agenda' | 'students' | 'history';

// Repository Interfaces (Contratos)
export interface IAlunoRepository {
  criar(aluno: Aluno): Promise<void>;
  atualizar(aluno: Aluno): Promise<void>;
  listar(): Promise<Aluno[]>;
  buscarPorId(id: string): Promise<Aluno | undefined>;
}

export interface IAulaRepository {
  agendar(aula: Aula): Promise<void>;
  agendarLote(aulas: Aula[]): Promise<void>;
  atualizar(aula: Aula): Promise<void>;
  deletar(id: string): Promise<void>;
  deletarAulasFuturas(alunoId: string): Promise<void>; // Remove aulas futuras geradas automaticamente
  listarPorPeriodo(inicio: Date, fim: Date): Promise<Aula[]>;
  listarPorAluno(alunoId: string): Promise<Aula[]>;
}
