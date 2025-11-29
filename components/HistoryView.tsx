import React, { useState, useEffect } from 'react';
import { Aluno, Aula } from '../types';
import { listarAlunos, listarHistoricoAluno } from '../services/useCases';
import { User, ChevronRight, ChevronDown, Music, FileText, Check, X, Calendar, Search, Inbox } from 'lucide-react';

export const HistoryView: React.FC = () => {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState<string | null>(null);
  const [historico, setHistorico] = useState<Aula[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedAulaId, setExpandedAulaId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    listarAlunos().then((data) => {
      setAlunos(data);
      setLoadingAlunos(false);
      // Auto select first student if available
      if (data.length > 0 && !selectedAlunoId) {
        setSelectedAlunoId(data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedAlunoId) {
      setLoadingHistory(true);
      listarHistoricoAluno(selectedAlunoId).then(data => {
        setHistorico(data);
        setLoadingHistory(false);
        setExpandedAulaId(null); // Reset expansion when student changes
      });
    } else {
      setHistorico([]);
    }
  }, [selectedAlunoId]);

  const toggleExpand = (id: string) => {
      setExpandedAulaId(expandedAulaId === id ? null : id);
  }

  const filteredAlunos = alunos.filter(a => 
    a.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.instrumento.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
      {/* Sidebar: List of Students */}
      <div className="w-full md:w-80 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden shrink-0">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
           <h2 className="text-lg font-bold text-gray-800 mb-3">Selecione o Aluno</h2>
           <div className="relative">
             <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
             <input 
               type="text" 
               placeholder="Buscar aluno..." 
               className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loadingAlunos ? (
            <div className="p-6 text-center text-gray-400 text-sm">Carregando...</div>
          ) : filteredAlunos.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Nenhum aluno encontrado.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredAlunos.map(aluno => (
                <button
                  key={aluno.id}
                  onClick={() => setSelectedAlunoId(aluno.id)}
                  className={`w-full text-left p-4 flex items-center gap-3 transition-colors hover:bg-gray-50 ${selectedAlunoId === aluno.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'border-l-4 border-transparent'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedAlunoId === aluno.id ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`font-semibold text-sm ${selectedAlunoId === aluno.id ? 'text-indigo-900' : 'text-gray-700'}`}>{aluno.nome}</h3>
                    <p className="text-xs text-gray-500">{aluno.instrumento}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content: History List */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
           <div>
             <h2 className="text-xl font-bold text-gray-900">Histórico de Aulas</h2>
             {selectedAlunoId && (
               <p className="text-sm text-gray-500">
                 {alunos.find(a => a.id === selectedAlunoId)?.nome}
               </p>
             )}
           </div>
           <div className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
             Total: {historico.length} aulas
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          {!selectedAlunoId ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
               <User className="w-12 h-12 mb-3 opacity-20" />
               <p>Selecione um aluno para visualizar o histórico.</p>
            </div>
          ) : loadingHistory ? (
            <div className="h-full flex items-center justify-center text-gray-400">
               Carregando histórico...
            </div>
          ) : historico.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
               <Inbox className="w-12 h-12 mb-3 opacity-20" />
               <p>Nenhuma aula realizada encontrada para este aluno.</p>
            </div>
          ) : (
            <div className="space-y-4">
               {historico.map((aula) => (
                 <div key={aula.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                    {/* Header Row - Clickable */}
                    <div 
                      onClick={() => toggleExpand(aula.id)}
                      className="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50 transition-colors"
                    >
                       <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${aula.presente === true ? 'bg-green-100 text-green-700' : aula.presente === false ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                             {aula.presente === true ? <Check className="w-5 h-5" /> : aula.presente === false ? <X className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                          </div>
                          <div>
                             <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                {new Date(aula.data).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                             </h4>
                             <p className="text-sm text-gray-500 flex items-center gap-2">
                                {new Date(aula.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                {aula.presente === true && <span className="text-green-600 font-medium text-xs">• Presente</span>}
                                {aula.presente === false && <span className="text-red-600 font-medium text-xs">• Faltou</span>}
                                {aula.presente === null && <span className="text-gray-400 font-medium text-xs">• Pendente</span>}
                             </p>
                          </div>
                       </div>
                       <div className={`transform transition-transform duration-200 ${expandedAulaId === aula.id ? 'rotate-180' : ''}`}>
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                       </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedAulaId === aula.id && (
                       <div className="px-4 pb-4 pt-0 border-t border-gray-100 bg-gray-50/50">
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                                  <FileText className="w-3 h-3" /> Anotações
                                </h5>
                                <div className="bg-white p-3 rounded border border-gray-200 text-sm text-gray-700 min-h-[80px]">
                                   {aula.anotacoes ? aula.anotacoes : <span className="text-gray-400 italic">Sem anotações registradas.</span>}
                                </div>
                             </div>
                             <div>
                                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                                  <Music className="w-3 h-3" /> Repertório Trabalhado
                                </h5>
                                <div className="bg-white p-3 rounded border border-gray-200 min-h-[80px]">
                                   {aula.repertorio.length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5">
                                         {aula.repertorio.map((rep, idx) => (
                                            <span key={idx} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100 font-medium">
                                               {rep}
                                            </span>
                                         ))}
                                      </div>
                                   ) : (
                                      <span className="text-sm text-gray-400 italic">Nenhum repertório registrado.</span>
                                   )}
                                </div>
                             </div>
                          </div>
                       </div>
                    )}
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
