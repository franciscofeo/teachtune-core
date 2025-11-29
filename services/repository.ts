import { Aluno, Aula, IAlunoRepository, IAulaRepository } from '../types';

// URL base da API (configurável via variável de ambiente)
// Fix: Safe access to env to prevent crash if undefined
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';

// Helper para obter token
function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

// Helper para chamadas fetch com autenticação
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    
    // Se retornar 401, limpar token e recarregar página
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    
    throw new Error(`API Error (${response.status}): ${errorBody || response.statusText}`);
  }

  // Retorna vazio se não tiver conteúdo (ex: 201 Created ou 204 No Content)
  if (response.status === 201 || response.status === 204) return {} as T;

  return response.json();
}

// --- Aluno Repository Implementation (API Client) ---
export const AlunoRepository: IAlunoRepository = {
  async criar(aluno: Aluno): Promise<void> {
    await apiRequest('/alunos', {
      method: 'POST',
      body: JSON.stringify(aluno),
    });
  },

  async atualizar(aluno: Aluno): Promise<void> {
    await apiRequest(`/alunos/${aluno.id}`, {
      method: 'PUT',
      body: JSON.stringify(aluno),
    });
  },

  async listar(): Promise<Aluno[]> {
    return apiRequest<Aluno[]>('/alunos');
  },

  async buscarPorId(id: string): Promise<Aluno | undefined> {
    return apiRequest<Aluno>(`/alunos/${id}`);
  }
};

// --- Aula Repository Implementation (API Client) ---
export const AulaRepository: IAulaRepository = {
  async agendar(aula: Aula): Promise<void> {
    await apiRequest('/aulas', {
      method: 'POST',
      body: JSON.stringify(aula),
    });
  },

  async agendarLote(aulas: Aula[]): Promise<void> {
    if (aulas.length === 0) return;
    await apiRequest('/aulas/batch', {
      method: 'POST',
      body: JSON.stringify({ aulas }),
    });
  },

  async atualizar(aula: Aula): Promise<void> {
    await apiRequest(`/aulas/${aula.id}`, {
      method: 'PUT',
      body: JSON.stringify(aula),
    });
  },

  async deletar(id: string): Promise<void> {
    await apiRequest(`/aulas/${id}`, {
      method: 'DELETE',
    });
  },

  async deletarAulasFuturas(alunoId: string): Promise<void> {
    // Endpoint específico para limpeza lógica
    await apiRequest(`/aulas/future/${alunoId}`, {
      method: 'DELETE',
    });
  },

  async listarPorPeriodo(inicio: Date, fim: Date): Promise<Aula[]> {
    const params = new URLSearchParams({
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
    });
    return apiRequest<Aula[]>(`/aulas?${params.toString()}`);
  },

  async listarPorAluno(alunoId: string): Promise<Aula[]> {
    return apiRequest<Aula[]>(`/alunos/${alunoId}/aulas`);
  }
};