
import React, { useEffect, useState } from 'react';
import { DashboardStats, Aula, Aluno } from '../types';
import { obterResumoDashboard } from '../services/useCases';
import { DollarSign, Users, Calendar, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const DashboardView: React.FC = () => {
  const { professor } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [aulasHoje, setAulasHoje] = useState<(Aula & { aluno?: Aluno })[]>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const data = await obterResumoDashboard();
        setStats(data.stats);
        setAulasHoje(data.aulasHoje);
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Carregando painel de controle...</div>;
  }

  if (!stats) return null;

  const getPrimeiroNome = (nomeCompleto: string) => {
    return nomeCompleto.split(' ')[0];
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Olá, {professor ? getPrimeiroNome(professor.nome) : 'Professor'}!
        </h2>
        <p className="text-gray-500">
          Aqui está o resumo completo com estatísticas, alunos ativos e aulas de hoje.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Renda */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="w-16 h-16 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Renda Mensal Estimada</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {stats.rendaMensalEstimada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
            <TrendingUp className="w-3 h-3" />
            Baseado em alunos ativos
          </div>
        </div>

        {/* Card 2: Alunos Ativos */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-16 h-16 text-blue-600" />
          </div>
          <div>
             <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Alunos Ativos</p>
             <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.alunosAtivos}</h3>
          </div>
          <p className="text-xs text-gray-400">Total cadastrados: {stats.totalAlunos}</p>
        </div>

        {/* Card 3: Aulas Hoje */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Calendar className="w-16 h-16 text-indigo-600" />
          </div>
          <div>
             <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Aulas Hoje</p>
             <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.aulasHoje}</h3>
          </div>
          <div className="text-xs text-indigo-600 font-medium">
             Consulte a agenda para detalhes
          </div>
        </div>

        {/* Card 4: Pendências */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertCircle className="w-16 h-16 text-orange-600" />
          </div>
          <div>
             <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pendentes Hoje</p>
             <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.aulasPendentesHoje}</h3>
          </div>
          <p className="text-xs text-gray-400">Aulas sem presença marcada</p>
        </div>
      </div>

      {/* Aulas de Hoje Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-800">Cronograma de Hoje</h3>
            <span className="text-sm text-gray-500">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          
          <div className="p-4 flex-1">
            {aulasHoje.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <Calendar className="w-8 h-8 mb-2 opacity-50" />
                <p>Nenhuma aula agendada para hoje.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {aulasHoje.map(aula => (
                  <div key={aula.id} className="flex items-center p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0 w-16 text-center border-r border-gray-100 pr-3 mr-3">
                      <span className="block text-lg font-bold text-indigo-700">
                        {new Date(aula.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800">{aula.aluno?.nome}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                          {aula.aluno?.instrumento}
                        </span>
                        {aula.presente === true && <span className="text-green-600 font-medium text-xs flex items-center gap-1">● Presente</span>}
                        {aula.presente === false && <span className="text-red-600 font-medium text-xs flex items-center gap-1">● Faltou</span>}
                        {aula.presente === null && <span className="text-gray-400 font-medium text-xs flex items-center gap-1">● Pendente</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Tips / Info Sidebar */}
        <div className="bg-indigo-900 rounded-xl shadow-sm text-white p-6 flex flex-col">
           <h3 className="font-bold text-lg mb-4 text-indigo-100">Lembretes</h3>
           <div className="space-y-4 flex-1">
              <div className="bg-indigo-800/50 p-4 rounded-lg border border-indigo-700/50">
                 <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-yellow-100 mb-1">Confirmação de Presença</p>
                      <p className="text-xs text-indigo-200 leading-relaxed">
                        Lembre-se de marcar a presença das aulas pendentes para manter o histórico dos alunos atualizado.
                      </p>
                    </div>
                 </div>
              </div>

              <div className="bg-indigo-800/50 p-4 rounded-lg border border-indigo-700/50">
                 <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-blue-100 mb-1">Novos Alunos</p>
                      <p className="text-xs text-indigo-200 leading-relaxed">
                        Mantenha o cadastro de mensalidades atualizado para que a projeção de renda seja precisa.
                      </p>
                    </div>
                 </div>
              </div>
           </div>
           
           <div className="mt-6 pt-6 border-t border-indigo-800 text-center">
             <p className="text-xs text-indigo-400">TeachTune v1.0 MVP</p>
           </div>
        </div>
      </div>
    </div>
  );
};
