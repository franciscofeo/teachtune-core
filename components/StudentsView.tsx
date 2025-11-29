import React, { useEffect, useState } from 'react';
import { Aluno, FrequenciaRecorrencia, HorarioSemanal } from '../types';
import { listarAlunos, registrarAluno, editarAluno } from '../services/useCases';
import { Button } from './Button';
import { UserPlus, User, Music, Calendar, Clock, Plus, Trash2, DollarSign, X } from 'lucide-react';

export const StudentsView: React.FC = () => {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAlunoId, setEditingAlunoId] = useState<string | null>(null);

  const loadAlunos = async () => {
    setLoading(true);
    const data = await listarAlunos();
    setAlunos(data);
    setLoading(false);
  };

  useEffect(() => {
    loadAlunos();
  }, []);

  const handleOpenNewStudent = () => {
    setEditingAlunoId(null);
    setIsModalOpen(true);
  };

  const handleOpenEditStudent = (aluno: Aluno) => {
    setEditingAlunoId(aluno.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAlunoId(null);
  };

  const handleSaveStudent = async (data: any) => {
    try {
      if (editingAlunoId) {
        // Edit mode
        await editarAluno(
          editingAlunoId,
          data.nome,
          data.instrumento,
          data.mensalidade,
          data.ativo,
          data.configAgenda
        );
      } else {
        // Create mode
        await registrarAluno(
          data.nome,
          data.instrumento,
          data.mensalidade,
          data.ativo,
          data.configAgenda
        );
      }
      handleCloseModal();
      loadAlunos();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar aluno.');
    }
  };

  const weekDaysMap = [
    { val: 0, label: 'Domingo' },
    { val: 1, label: 'Segunda-feira' },
    { val: 2, label: 'Terça-feira' },
    { val: 3, label: 'Quarta-feira' },
    { val: 4, label: 'Quinta-feira' },
    { val: 5, label: 'Sexta-feira' },
    { val: 6, label: 'Sábado' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Alunos</h2>
          <p className="text-gray-500">Gerencie sua lista de alunos e mensalidades</p>
        </div>
        <Button onClick={handleOpenNewStudent}>
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Aluno
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando lista...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {alunos.map(aluno => (
            <div 
              key={aluno.id} 
              onClick={() => handleOpenEditStudent(aluno)}
              className={`bg-white p-6 rounded-xl shadow-sm border transition-all hover:shadow-md cursor-pointer relative group flex flex-col h-full ${aluno.ativo ? 'border-gray-100' : 'border-gray-200 bg-gray-50/50'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${aluno.ativo ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'}`}>
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`font-bold text-lg ${aluno.ativo ? 'text-gray-900' : 'text-gray-500'}`}>{aluno.nome}</h3>
                    <div className="flex items-center text-xs text-gray-500 gap-1 mt-0.5">
                      <Music className="w-3 h-3" />
                      {aluno.instrumento}
                    </div>
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full font-semibold ${aluno.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                  {aluno.ativo ? 'Ativo' : 'Inativo'}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4 bg-gray-50 p-2 rounded border border-gray-100">
                 <DollarSign className="w-4 h-4 text-emerald-600" />
                 <span className="font-semibold text-gray-700">
                    {aluno.mensalidade?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                 </span>
                 <span className="text-xs text-gray-400">/mês</span>
              </div>
              
              <div className="mt-auto">
                {aluno.ativo && aluno.configuracaoAgenda && aluno.configuracaoAgenda.horarios.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm border border-gray-100 h-full">
                     <div className="flex items-center gap-2 text-gray-700 mb-2 border-b border-gray-200 pb-2">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        <span className="font-medium capitalize">{aluno.configuracaoAgenda.frequencia}</span>
                        <span className="text-gray-400 text-xs ml-auto">
                          Início: {new Date(aluno.configuracaoAgenda.dataInicio).toLocaleDateString()}
                        </span>
                     </div>
                     <div className="space-y-1">
                       {aluno.configuracaoAgenda.horarios.map((h, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-gray-600 bg-white p-1.5 rounded border border-gray-100">
                             <Clock className="w-3.5 h-3.5 text-indigo-400" />
                             <span>
                               {weekDaysMap.find(d => d.val === h.diaSemana)?.label.split('-')[0]}, 
                               {' '}{h.horario}
                             </span>
                          </div>
                       ))}
                     </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-400 text-center italic border border-gray-100 h-full flex items-center justify-center">
                     {aluno.ativo ? 'Sem agenda recorrente definida' : 'Aluno inativo - sem agenda'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <StudentModal 
          isOpen={isModalOpen} 
          onClose={handleCloseModal}
          onSave={handleSaveStudent}
          initialData={editingAlunoId ? alunos.find(a => a.id === editingAlunoId) : null}
        />
      )}
    </div>
  );
};

// --- Modal Component ---

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: Aluno | null;
}

const StudentModal: React.FC<StudentModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const isEditing = !!initialData;

  const [nome, setNome] = useState('');
  const [instrumento, setInstrumento] = useState('');
  const [mensalidade, setMensalidade] = useState('');
  const [ativo, setAtivo] = useState(true);
  
  // Schedule
  const [hasSchedule, setHasSchedule] = useState(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [frequency, setFrequency] = useState<FrequenciaRecorrencia>('semanal');
  const [scheduleSlots, setScheduleSlots] = useState<HorarioSemanal[]>([{ diaSemana: 1, horario: '14:00' }]);

  // Initialize form
  useEffect(() => {
    if (initialData) {
      setNome(initialData.nome);
      setInstrumento(initialData.instrumento);
      setMensalidade(initialData.mensalidade.toString());
      setAtivo(initialData.ativo);
      
      if (initialData.configuracaoAgenda) {
        setHasSchedule(true);
        setFrequency(initialData.configuracaoAgenda.frequencia);
        setStartDate(new Date(initialData.configuracaoAgenda.dataInicio).toISOString().split('T')[0]);
        setScheduleSlots(initialData.configuracaoAgenda.horarios);
      } else {
        setHasSchedule(false);
      }
    } else {
      // Defaults for new student
      setNome('');
      setInstrumento('');
      setMensalidade('');
      setAtivo(true);
      setHasSchedule(true);
      setStartDate(new Date().toISOString().split('T')[0]);
      setFrequency('semanal');
      setScheduleSlots([{ diaSemana: 1, horario: '14:00' }]);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let configAgenda = undefined;
    if (hasSchedule && startDate && scheduleSlots.length > 0) {
      configAgenda = {
        frequencia: frequency,
        dataInicio: startDate,
        horarios: scheduleSlots
      };
    }

    onSave({
      nome,
      instrumento,
      mensalidade: parseFloat(mensalidade) || 0,
      ativo,
      configAgenda
    });
  };

  const handleAddSlot = () => {
    setScheduleSlots([...scheduleSlots, { diaSemana: 1, horario: '14:00' }]);
  };

  const handleRemoveSlot = (index: number) => {
    setScheduleSlots(scheduleSlots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: keyof HorarioSemanal, value: any) => {
    const newSlots = [...scheduleSlots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setScheduleSlots(newSlots);
  };

  const weekDaysMap = [
    { val: 0, label: 'Domingo' },
    { val: 1, label: 'Segunda-feira' },
    { val: 2, label: 'Terça-feira' },
    { val: 3, label: 'Quarta-feira' },
    { val: 4, label: 'Quinta-feira' },
    { val: 5, label: 'Sexta-feira' },
    { val: 6, label: 'Sábado' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="font-bold text-xl text-gray-800 tracking-tight">
              {isEditing ? 'Editar Aluno' : 'Cadastrar Novo Aluno'}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
             {/* Dados Pessoais e Financeiros */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome Completo</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                    placeholder="Ex: Ana Souza"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Instrumento</label>
                  <select 
                     className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                     value={instrumento}
                     onChange={e => setInstrumento(e.target.value)}
                     required
                  >
                    <option value="">Selecione...</option>
                    <option value="Violão">Violão</option>
                    <option value="Piano">Piano</option>
                    <option value="Guitarra">Guitarra</option>
                    <option value="Bateria">Bateria</option>
                    <option value="Canto">Canto</option>
                    <option value="Violino">Violino</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mensalidade (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">R$</span>
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full border border-gray-300 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                      placeholder="0,00"
                      value={mensalidade}
                      onChange={e => setMensalidade(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status do Aluno</label>
                   <div className="flex items-center gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="status"
                          checked={ativo} 
                          onChange={() => setAtivo(true)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-gray-700 font-medium">Ativo</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="status"
                          checked={!ativo} 
                          onChange={() => setAtivo(false)}
                          className="text-gray-500 focus:ring-gray-500"
                        />
                        <span className="text-gray-500">Inativo</span>
                      </label>
                   </div>
                </div>
             </div>

             {/* Configuração de Agenda */}
             <div className={`bg-indigo-50 p-5 rounded-lg border border-indigo-100 mb-6 transition-all ${!ativo ? 'opacity-50 grayscale' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                   <h4 className="font-semibold text-indigo-900 flex items-center gap-2">
                     <Calendar className="w-5 h-5" /> Configuração de Agenda
                   </h4>
                   <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="hasScheduleModal" 
                        checked={hasSchedule} 
                        onChange={e => setHasSchedule(e.target.checked)}
                        disabled={!ativo}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <label htmlFor="hasScheduleModal" className="text-sm text-indigo-800">Gerar agenda automaticamente</label>
                   </div>
                </div>

                {hasSchedule && (
                  <div className="space-y-4 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                          <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Início da Recorrência</label>
                          <input 
                            type="date"
                            required={hasSchedule && ativo}
                            disabled={!ativo}
                            className="w-full border border-indigo-200 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white text-gray-900"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                          />
                          {isEditing && (
                            <p className="text-[10px] text-orange-600 mt-1">
                              ⚠️ Alterar a configuração irá regenerar as aulas futuras deste aluno.
                            </p>
                          )}
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Frequência</label>
                          <select 
                            className="w-full border border-indigo-200 rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white text-gray-900"
                            value={frequency}
                            onChange={e => setFrequency(e.target.value as FrequenciaRecorrencia)}
                            disabled={!ativo}
                          >
                            <option value="semanal">Semanal</option>
                            <option value="quinzenal">Quinzenal</option>
                            <option value="mensal">Mensal</option>
                          </select>
                       </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-indigo-100">
                      <label className="block text-xs font-bold text-indigo-700 uppercase mb-2">Horários Semanais</label>
                      
                      {scheduleSlots.map((slot, index) => (
                        <div key={index} className="flex gap-2 mb-2 items-center">
                          <select 
                            className="flex-1 border border-gray-300 rounded p-2 text-sm bg-white text-gray-900"
                            value={slot.diaSemana}
                            disabled={!ativo}
                            onChange={(e) => updateSlot(index, 'diaSemana', parseInt(e.target.value))}
                          >
                            {weekDaysMap.map(day => (
                              <option key={day.val} value={day.val}>{day.label}</option>
                            ))}
                          </select>
                          <input 
                            type="time" 
                            className="w-28 border border-gray-300 rounded p-2 text-sm bg-white text-gray-900"
                            value={slot.horario}
                            disabled={!ativo}
                            onChange={(e) => updateSlot(index, 'horario', e.target.value)}
                          />
                          {scheduleSlots.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => handleRemoveSlot(index)}
                              disabled={!ativo}
                              className="p-2 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}

                      <Button 
                         type="button" 
                         variant="secondary" 
                         size="sm" 
                         onClick={handleAddSlot} 
                         disabled={!ativo}
                         className="mt-2 w-full border-dashed border-indigo-300 text-indigo-600 disabled:opacity-50 disabled:border-gray-300 disabled:text-gray-400"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Adicionar outro dia/horário
                      </Button>
                    </div>
                  </div>
                )}
             </div>
          </div>
          
          <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
             <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
             <Button type="submit">
               {isEditing ? 'Salvar Alterações' : 'Cadastrar Aluno'}
             </Button>
          </div>
        </form>
      </div>
    </div>
  );
};