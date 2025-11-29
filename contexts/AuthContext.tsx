import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Professor {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
}

interface AuthContextType {
  professor: Professor | null;
  token: string | null;
  login: (email: string, senha: string) => Promise<void>;
  cadastro: (nome: string, email: string, senha: string, telefone?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = 'http://localhost:3000/api';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [professor, setProfessor] = useState<Professor | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar token do localStorage ao iniciar
  useEffect(() => {
    const loadAuth = async () => {
      const savedToken = localStorage.getItem('token');
      
      if (savedToken) {
        try {
          // Verificar se token ainda é válido
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${savedToken}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setProfessor(data);
            setToken(savedToken);
          } else {
            // Token inválido ou expirado
            localStorage.removeItem('token');
          }
        } catch (error) {
          console.error('Erro ao verificar autenticação:', error);
          localStorage.removeItem('token');
        }
      }
      
      setIsLoading(false);
    };

    loadAuth();
  }, []);

  const login = async (email: string, senha: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, senha })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao fazer login');
      }

      const data = await response.json();
      
      setProfessor(data.professor);
      setToken(data.token);
      localStorage.setItem('token', data.token);
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao fazer login');
    }
  };

  const cadastro = async (nome: string, email: string, senha: string, telefone?: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/cadastro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nome, email, senha, telefone })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao cadastrar');
      }

      const data = await response.json();
      
      setProfessor(data.professor);
      setToken(data.token);
      localStorage.setItem('token', data.token);
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao cadastrar');
    }
  };

  const logout = () => {
    setProfessor(null);
    setToken(null);
    localStorage.removeItem('token');
    
    // Opcional: chamar endpoint de logout no backend
    fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' }).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ professor, token, login, cadastro, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

