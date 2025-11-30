import React, { useEffect, useState, useCallback } from 'react';
import { Aula, Aluno } from '../types';
import { listarAgenda, agendarAula, atualizarAula, listarAlunos, deletarAula } from '../services/useCases';
import { Button } from './Button';
import { Plus, Check, X, Clock, Music, FileText, Calendar as CalendarIcon, List as ListIcon, ChevronLeft, ChevronRight, Bell, Trash2, Repeat } from 'lucide-react';

export const AgendaView: React.FC = () => {
  const [aulas, setAulas] = useState<(Aula & { aluno?: Aluno })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAula, setSelectedAula] = useState<(Aula & { aluno?: Aluno }) | null>(null);
  
  // View State
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // Notification State
  const [notification, setNotification] = useState<{message: string, type: 'info' | 'warning'} | null>(null);
  const [notifiedAulaIds, setNotifiedAulaIds] = useState<Set<string>>(new Set());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Audio for notification
  const notificationSound = React.useRef<HTMLAudioElement | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }

    // Create audio element for notification sound - Pleasant melodic chime that loops
    // This creates a nice "ding-dong" notification sound that repeats for 2 seconds
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const createNotificationSound = () => {
      const sampleRate = audioContext.sampleRate;
      const noteDuration = 0.6; // Duration of single "ding-dong"
      const noteLength = Math.floor(sampleRate * noteDuration);
      const buffer = audioContext.createBuffer(1, noteLength, sampleRate);
      const data = buffer.getChannelData(0);
      
      // Create a pleasant two-tone bell sound (E and C notes)
      for (let i = 0; i < noteLength; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-3 * t); // Decay envelope
        
        // First tone (E note - 659 Hz) fades in quickly
        const freq1 = 659;
        const tone1 = Math.sin(2 * Math.PI * freq1 * t) * envelope * (t < 0.3 ? 1 : 0);
        
        // Second tone (C note - 523 Hz) starts slightly after
        const freq2 = 523;
        const tone2 = Math.sin(2 * Math.PI * freq2 * t) * envelope * (t > 0.15 ? 1 : 0);
        
        data[i] = (tone1 * 0.5 + tone2 * 0.4) * 0.9; // Volume aumentado
      }
      
      return buffer;
    };
    
    // Store the play function with looping for 2 seconds
    notificationSound.current = {
      play: () => {
        const sources: AudioBufferSourceNode[] = [];
        const buffer = createNotificationSound();
        const noteDuration = 0.6;
        const totalDuration = 2; // 2 seconds total
        const repeatCount = Math.ceil(totalDuration / noteDuration);
        
        // Create gain node for volume control
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1.2; // Volume master (0.0 a 2.0+) - ajuste aqui para aumentar/diminuir
        gainNode.connect(audioContext.destination);
        
        // Schedule multiple plays to loop for 2 seconds
        for (let i = 0; i < repeatCount; i++) {
          const source = audioContext.createBufferSource();
          source.buffer = buffer;
          source.connect(gainNode); // Connect to gain node instead of directly to destination
          source.start(audioContext.currentTime + (i * noteDuration));
          sources.push(source);
        }
        
        return Promise.resolve();
      },
      pause: () => {},
      currentTime: 0
    } as any; 
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let start: Date, end: Date;

      if (viewMode === 'list') {
        // List view: Show from today onwards (next 30 days default in useCase if undefined)
        start = new Date();
        end = new Date();
        end.setDate(end.getDate() + 30);
      } else {
        // Calendar view: Show the whole current month
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        start = new Date(year, month, 1);
        end = new Date(year, month + 1, 0); // Last day of month
      }
      
      // Ensure start is at 00:00:00
      start.setHours(0,0,0,0);
      // Ensure end is at end of day
      end.setHours(23,59,59,999);

      const data = await listarAgenda(start, end);
      setAulas(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [viewMode, currentCalendarDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Notification Check Logic (Runs every 30 seconds)
  useEffect(() => {
    const checkUpcomingLessons = () => {
      const now = new Date();
      
      aulas.forEach(aula => {
        // Skip if already notified or if class already happened/marked
        if (notifiedAulaIds.has(aula.id) || aula.presente !== null) return;

        const aulaDate = new Date(aula.data);
        const diffMs = aulaDate.getTime() - now.getTime();
        const diffMinutes = diffMs / (1000 * 60);

        // Notify if lesson starts between 0 and 15 minutes from now
        if (diffMinutes > 0 && diffMinutes <= 15) {
          const minsRemaining = Math.ceil(diffMinutes);
          const message = `Sua aula com ${aula.aluno?.nome} começa em ${minsRemaining} minuto${minsRemaining > 1 ? 's' : ''}!`;
          
          // Visual toast notification
          setNotification({
            message,
            type: 'warning'
          });
          
          // Play notification sound
          if (notificationSound.current) {
            notificationSound.current.play().catch(err => {
              console.warn('Could not play notification sound:', err);
            });
          }

          // System notification (if permission granted)
          if ('Notification' in window && Notification.permission === 'granted') {
            const systemNotification = new Notification('🎵 TeachTune - Aula Próxima', {
              body: message,
              icon: '🎵',
              badge: '🔔',
              tag: aula.id, // Prevents duplicate notifications
              requireInteraction: false,
              silent: false, // Allow system sound
            });

            // Auto close system notification after 10 seconds
            setTimeout(() => {
              systemNotification.close();
            }, 10000);

            // Optional: Click to focus window
            systemNotification.onclick = () => {
              window.focus();
              systemNotification.close();
            };
          }
          
          // Mark as notified so we don't spam
          setNotifiedAulaIds(prev => new Set(prev).add(aula.id));

          // Auto dismiss visual toast after 8 seconds
          setTimeout(() => {
            setNotification(null);
          }, 8000);
        }
      });
    };

    // Initial check
    checkUpcomingLessons();

    // Interval check
    const intervalId = setInterval(checkUpcomingLessons, 30000); // Check every 30s

    return () => clearInterval(intervalId);
  }, [aulas, notifiedAulaIds]);

  // Handlers
  const handleOpenSchedule = (date?: Date) => {
    setSelectedAula(null);
    if (date) {
      // Create a shell for a new lesson
      setSelectedAula({
        id: '',
        alunoId: '',
        data: date.toISOString(), // Use clicked date
        presente: null,
        anotacoes: '',
        repertorio: []
      });
    }
    setIsModalOpen(true);
  };

  const handleEditAula = (aula: Aula & { aluno?: Aluno }) => {
    setSelectedAula(aula);
    setIsModalOpen(true);
  };

  const handleSaveAula = async (dados: any) => {
    console.log('[AgendaView] handleSaveAula - Dados recebidos do form:', dados);
    console.log('[AgendaView] handleSaveAula - Data:', dados.data);
    console.log('[AgendaView] handleSaveAula - Tipo da data:', typeof dados.data);
    
    try {
      if (selectedAula && selectedAula.id) {
        // Update existing
        console.log('[AgendaView] handleSaveAula - Atualizando aula existente, ID:', selectedAula.id);
        await atualizarAula({ ...selectedAula, ...dados });
      } else {
        // Create new (Single lesson)
        console.log('[AgendaView] handleSaveAula - Criando nova aula avulsa');
        await agendarAula(dados.alunoId, dados.data, dados.anotacoes);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error('[AgendaView] handleSaveAula - Erro:', err);
      alert("Erro ao salvar aula: " + (err.message || "Desconhecido"));
    }
  };

  const handleDeleteAula = async (id: string) => {
    try {
      await deletarAula(id);
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alert("Erro ao excluir aula");
    }
  };

  const togglePresenca = async (aula: Aula & { aluno?: Aluno }, statusClicado: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      // Lógica de Toggle: Se clicar no mesmo status, reseta para null (pendente). Se for diferente, atualiza.
      const novoStatus = aula.presente === statusClicado ? null : statusClicado;
      
      await atualizarAula({ ...aula, presente: novoStatus });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentCalendarDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentCalendarDate(newDate);
  };

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
          <div className="bg-indigo-900 text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-4 max-w-sm border-l-4 border-yellow-400">
            <div className="bg-yellow-400 p-2 rounded-full shrink-0">
               <Bell className="w-5 h-5 text-indigo-900" />
            </div>
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wide text-indigo-200 mb-0.5">Próxima Aula</h4>
              <p className="font-medium">{notification.message}</p>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="ml-2 text-indigo-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">Minha Agenda</h2>
          <p className="text-gray-500">
            {viewMode === 'list' 
              ? 'Próximas aulas' 
              : `Visualizando ${currentCalendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
            }
          </p>
          
          {/* Notification Permission Status */}
          {notificationPermission === 'denied' && (
            <div className="mt-2 text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-lg inline-flex items-center gap-2 border border-red-200">
              <X className="w-3 h-3" />
              Notificações bloqueadas. Habilite nas configurações do navegador.
            </div>
          )}
          {notificationPermission === 'default' && (
            <button
              onClick={() => {
                Notification.requestPermission().then(permission => {
                  setNotificationPermission(permission);
                });
              }}
              className="mt-2 text-xs bg-yellow-50 text-yellow-800 px-3 py-1.5 rounded-lg inline-flex items-center gap-2 border border-yellow-200 hover:bg-yellow-100 transition-colors"
            >
              <Bell className="w-3 h-3" />
              Clique para ativar alertas sonoros de aulas
            </button>
          )}
          {notificationPermission === 'granted' && (
            <div className="mt-2 text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg inline-flex items-center gap-2 border border-green-200">
              <Check className="w-3 h-3" />
              Alertas sonoros ativados
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
           <button 
             onClick={() => setViewMode('list')}
             className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
             title="Visualização em Lista"
           >
             <ListIcon className="w-5 h-5" />
           </button>
           <button 
             onClick={() => setViewMode('calendar')}
             className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
             title="Visualização em Calendário"
           >
             <CalendarIcon className="w-5 h-5" />
           </button>
        </div>

        <Button onClick={() => handleOpenSchedule()}>
          <Plus className="w-4 h-4 mr-2" />
          Agendar Aula Avulsa
        </Button>
      </div>

      {viewMode === 'calendar' && (
         <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200 mb-2 shrink-0">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full">
               <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="font-semibold text-gray-800 capitalize">
               {currentCalendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full">
               <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
         </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando agenda...</div>
      ) : (
        <div className="flex-1 min-h-0">
          {viewMode === 'list' ? (
            <div className="grid gap-4">
              {aulas.length === 0 ? (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
                  Nenhuma aula encontrada para este período.
                </div>
              ) : (
                aulas.map((aula) => (
                  <AulaListItem 
                    key={aula.id} 
                    aula={aula} 
                    onEdit={handleEditAula} 
                    onTogglePresenca={togglePresenca} 
                  />
                ))
              )}
            </div>
          ) : (
            <CalendarGrid 
               currentDate={currentCalendarDate} 
               aulas={aulas} 
               onDayClick={handleOpenSchedule}
               onAulaClick={handleEditAula}
            />
          )}
        </div>
      )}

      {isModalOpen && (
        <LessonModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          initialData={selectedAula}
          onSave={handleSaveAula}
          onDelete={handleDeleteAula}
        />
      )}
    </div>
  );
};

// --- Sub-components for better organization ---

const AulaListItem: React.FC<{
  aula: Aula & { aluno?: Aluno };
  onEdit: (aula: Aula & { aluno?: Aluno }) => void;
  onTogglePresenca: (aula: Aula & { aluno?: Aluno }, presente: boolean, e?: React.MouseEvent) => void;
}> = ({ aula, onEdit, onTogglePresenca }) => {
  return (
    <div 
      className={`bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center transition-all hover:shadow-md ${aula.presente === true ? 'border-l-4 border-l-green-500' : aula.presente === false ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-yellow-400'}`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-lg text-gray-900">{aula.aluno?.nome || 'Aluno Desconhecido'}</span>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
            {aula.aluno?.instrumento}
          </span>
          {aula.geradaAutomaticamente && (
             <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
               <Repeat className="w-3 h-3" />
               Recorrente
             </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-4 h-4" />
            {new Date(aula.data).toLocaleDateString('pt-BR')}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {(() => {
              const date = new Date(aula.data);
              console.log('[AulaListItem] Aula ID:', aula.id, 'Data ISO:', aula.data, 'Date Object:', date.toString(), 'Hora exibida:', date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
              return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            })()}
          </div>
        </div>
        {aula.anotacoes && (
          <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 inline-block">
            <FileText className="w-3 h-3 inline mr-1 text-gray-400"/>
            {aula.anotacoes}
          </p>
        )}
        {aula.repertorio.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {aula.repertorio.map((rep, idx) => (
                  <span key={idx} className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                    <Music className="w-3 h-3 inline mr-1"/>{rep}
                  </span>
              ))}
            </div>
        )}
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
        
        <div className="flex items-center bg-gray-50 p-1 rounded-lg border border-gray-100">
           <button 
             onClick={(e) => onTogglePresenca(aula, true, e)}
             className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded transition-all ${
               aula.presente === true 
               ? 'bg-green-100 text-green-700 shadow-sm ring-1 ring-green-200' 
               : 'text-gray-500 hover:bg-green-100 hover:text-green-700'
             }`}
             title="Marcar Presença"
           >
             <Check className="w-3.5 h-3.5" />
             <span className="hidden sm:inline">Presente</span>
           </button>
           <div className="w-px h-4 bg-gray-200 mx-1"></div>
           <button 
             onClick={(e) => onTogglePresenca(aula, false, e)}
             className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded transition-all ${
               aula.presente === false 
               ? 'bg-red-100 text-red-700 shadow-sm ring-1 ring-red-200' 
               : 'text-gray-500 hover:bg-red-100 hover:text-red-700'
             }`}
             title="Marcar Falta"
           >
             <X className="w-3.5 h-3.5" />
             <span className="hidden sm:inline">Falta</span>
           </button>
        </div>

        <Button variant="secondary" size="sm" onClick={() => onEdit(aula)}>
          Detalhes
        </Button>
      </div>
    </div>
  );
};

const CalendarGrid: React.FC<{
  currentDate: Date;
  aulas: (Aula & { aluno?: Aluno })[];
  onDayClick: (date: Date) => void;
  onAulaClick: (aula: Aula & { aluno?: Aluno }) => void;
}> = ({ currentDate, aulas, onDayClick, onAulaClick }) => {
  // Generate calendar days
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days = [];
  
  // Empty slots for previous month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  
  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full md:h-[600px]">
      {/* Week Header */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {weekDays.map(d => (
          <div key={d} className="py-3 text-center text-sm font-semibold text-gray-600 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>
      
      {/* Days Grid */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {days.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="bg-gray-50/30 border-b border-r border-gray-100 last:border-r-0" />;
          }

          // Filter lessons for this day
          const dayLessons = aulas.filter(a => {
            const d = new Date(a.data);
            return d.getDate() === date.getDate() && 
                   d.getMonth() === date.getMonth() && 
                   d.getFullYear() === date.getFullYear();
          });

          const isToday = new Date().toDateString() === date.toDateString();

          return (
            <div 
              key={date.toISOString()} 
              className={`min-h-[100px] border-b border-r border-gray-100 p-2 cursor-pointer transition-colors hover:bg-gray-50 ${isToday ? 'bg-indigo-50/40' : ''}`}
              onClick={() => onDayClick(date)}
            >
              <div className={`text-right mb-1 ${isToday ? 'font-bold text-indigo-600' : 'text-gray-700'}`}>
                 <span className={`${isToday ? 'bg-indigo-100 px-2 py-0.5 rounded-full' : ''}`}>
                   {date.getDate()}
                 </span>
              </div>
              
              <div className="space-y-1">
                {dayLessons.map(aula => (
                  <div 
                    key={aula.id}
                    onClick={(e) => { e.stopPropagation(); onAulaClick(aula); }}
                    className={`text-xs p-1.5 rounded border truncate cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-sm
                      ${aula.presente === true 
                        ? 'bg-green-50 border-green-200 text-green-700' 
                        : aula.presente === false 
                          ? 'bg-red-50 border-red-200 text-red-700' 
                          : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      }`}
                  >
                     {aula.geradaAutomaticamente && <Repeat className="w-2.5 h-2.5 inline mr-0.5 text-indigo-400" />}
                    <span className="font-bold mr-1">{new Date(aula.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                    {aula.aluno?.nome}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper: Convert UTC date to local datetime-local format (YYYY-MM-DDTHH:mm)
const toLocalDateTimeString = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Internal component for the Lesson Modal
interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: (Aula & { aluno?: Aluno }) | null;
  onSave: (data: any) => void;
  onDelete: (id: string) => void;
}

const LessonModal: React.FC<LessonModalProps> = ({ isOpen, onClose, initialData, onSave, onDelete }) => {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const isEditing = !!(initialData && initialData.id);
  
  const [formData, setFormData] = useState({
    alunoId: initialData?.alunoId || '',
    data: initialData?.data 
      ? toLocalDateTimeString(initialData.data) // Use local timezone
      : '',
    anotacoes: initialData?.anotacoes || '',
    repertorioInput: initialData?.repertorio && Array.isArray(initialData.repertorio) 
      ? initialData.repertorio.join(', ') 
      : '',
  });
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    listarAlunos().then(setAlunos);
  }, []);

  // Update form data if initialData changes (e.g., clicking on a different day in calendar)
  useEffect(() => {
    if (initialData) {
       setFormData(prev => ({
         ...prev,
         alunoId: initialData.alunoId || '',
         data: initialData.data ? toLocalDateTimeString(initialData.data) : '',
         anotacoes: initialData.anotacoes || '',
         repertorioInput: initialData.repertorio && Array.isArray(initialData.repertorio)
           ? initialData.repertorio.join(', ')
           : ''
       }));
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[LessonModal] handleSubmit - formData:', formData);
    console.log('[LessonModal] handleSubmit - data value:', formData.data);
    
    // Send datetime-local value directly (browser already has it in local timezone)
    // Format: "YYYY-MM-DDTHH:mm" (sem timezone)
    onSave({
      ...formData,
      repertorio: formData.repertorioInput.split(',').map(s => s.trim()).filter(Boolean)
    });
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };
  
  const handleConfirmDelete = () => {
    if (initialData?.id) {
       onDelete(initialData.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="font-bold text-xl text-gray-800 tracking-tight">
              {isEditing ? 'Editar Aula' : 'Agendar Aula Avulsa'}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">Preencha os dados abaixo para salvar</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {showDeleteConfirm ? (
           <div className="flex flex-col flex-1 items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Aula?</h3>
              <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                Tem certeza que deseja excluir esta aula? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 w-full max-w-xs justify-center">
                <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button variant="danger" onClick={handleConfirmDelete} className="flex-1">
                  Sim, Excluir
                </Button>
              </div>
           </div>
        ) : (
          /* Form Content */
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                
                {/* Left Column */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Aluno</label>
                    <select 
                      required
                      className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900"
                      value={formData.alunoId}
                      onChange={e => setFormData({...formData, alunoId: e.target.value})}
                      disabled={isEditing}
                    >
                      <option value="">Selecione um aluno</option>
                      {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data e Hora</label>
                    <input 
                      type="datetime-local" 
                      required
                      className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900"
                      value={formData.data}
                      onChange={e => setFormData({...formData, data: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Repertório</label>
                    <input 
                      type="text"
                      className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900"
                      placeholder="Ex: Sonata K545, Blackbird"
                      value={formData.repertorioInput}
                      onChange={e => setFormData({...formData, repertorioInput: e.target.value})}
                    />
                    <p className="text-xs text-gray-400 mt-1.5">Separe as músicas por vírgula</p>
                  </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col h-full min-h-[200px] md:min-h-0">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Anotações da Aula</label>
                  <textarea 
                    className="flex-1 w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-all text-sm leading-relaxed text-gray-900"
                    placeholder="Detalhes sobre o progresso, exercícios de casa, pontos de atenção..."
                    value={formData.anotacoes}
                    onChange={e => setFormData({...formData, anotacoes: e.target.value})}
                  />
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
               <div>
                 {isEditing && (
                    <Button type="button" variant="danger" onClick={handleDeleteClick} className="flex items-center gap-2 text-white">
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </Button>
                 )}
               </div>
               <div className="flex gap-3">
                 <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                 <Button type="submit">
                   Salvar Aula
                 </Button>
               </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};