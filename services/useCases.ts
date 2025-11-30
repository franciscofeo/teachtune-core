
import { Aula, Aluno, FrequenciaRecorrencia, ConfiguracaoAgenda, DashboardStats } from '../types';
import { AlunoRepository, AulaRepository } from './repository';
import { v4 as uuidv4 } from 'uuid';

const generateId = () => uuidv4();

// Helper interno para gerar aulas
const gerarAulasFuturas = (alunoId: string, config: ConfiguracaoAgenda, meses: number = 6): Aula[] => {
  const aulas: Aula[] = [];
  const startReference = new Date(config.dataInicio);
  // Normalizar data de início para meia-noite para cálculos de dia
  startReference.setHours(0, 0, 0, 0);

  const limitDate = new Date(startReference);
  limitDate.setMonth(limitDate.getMonth() + meses);

  const recorrenciaId = generateId();
  
  // Vamos iterar por "ciclos" (dias base)
  let currentBaseDate = new Date(startReference);

  // Para garantir que começamos no início da semana da data de início para alinhar os dias da semana corretamente
  // Mas precisamos respeitar a dataInicio (não criar aulas no passado daquela semana)
  
  while (currentBaseDate <= limitDate) {
    
    // Para esta semana (ou mês), iterar sobre todos os horários configurados
    for (const slot of config.horarios) {
      
      // Calcular a data específica para este dia da semana nesta iteração
      const targetDate = new Date(currentBaseDate);
      
      // Ajuste para frequência mensal é diferente de semanal/quinzenal
      if (config.frequencia === 'mensal') {
        // Na lógica mensal simples, tentamos manter o mesmo dia do mês ou dia da semana?
        // Simplificação MVP: Mensal repete na mesma data numérica. 
        // Se a lógica for "toda 1ª segunda-feira", é mais complexo.
        // Vamos assumir que 'mensal' aqui repete a estrutura a cada mês.
        // Mas a estrutura de 'horarios' usa dia da semana (0-6). 
        // Para compatibilizar dia da semana com mensal, o ideal seria "todo dia X".
        // Dado que a UI usa dia da semana, vamos focar em Semanal/Quinzenal que é o core.
        // Se for mensal, vamos apenas pular 4 semanas por enquanto na iteração principal.
      } else {
        // Lógica Semanal / Quinzenal
        const currentDayOfWeek = targetDate.getDay();
        const daysUntilTarget = (slot.diaSemana - currentDayOfWeek + 7) % 7;
        
        // Se daysUntilTarget for 0, é hoje. Se for > 0, é nos próximos dias.
        // O problema é se o dia alvo da semana já passou na semana "corrente" do loop.
        // Vamos usar uma abordagem mais absoluta: encontrar a data do slot na semana atual.
        
        // Achar o domingo desta semana
        const diffToSunday = currentBaseDate.getDay(); 
        const sundayOfThisWeek = new Date(currentBaseDate);
        sundayOfThisWeek.setDate(currentBaseDate.getDate() - diffToSunday);
        
        // Achar a data do slot
        const lessonDate = new Date(sundayOfThisWeek);
        lessonDate.setDate(sundayOfThisWeek.getDate() + slot.diaSemana);
        
        // Configurar hora
        const [hora, minuto] = slot.horario.split(':').map(Number);
        lessonDate.setHours(hora, minuto, 0, 0);

        // Validação Importante:
        // 1. A aula não pode ser antes da Data de Início Absoluta configurada
        // 2. A aula não pode ser depois da Data Limite
        if (lessonDate >= startReference && lessonDate <= limitDate) {
           // Só adiciona se a data base for válida para o ciclo
           // Como estamos iterando currentBaseDate corretamente abaixo, aqui é seguro criar
           aulas.push({
            id: generateId(),
            alunoId,
            data: lessonDate.toISOString(),
            dataAtualizacao: new Date().toISOString(),
            presente: null,
            anotacoes: '',
            repertorio: [],
            geradaAutomaticamente: true,
            recorrenciaId
          });
        }
      }
    }

    // Avançar para o próximo ciclo
    const nextBaseDate = new Date(currentBaseDate);
    if (config.frequencia === 'semanal') {
      nextBaseDate.setDate(currentBaseDate.getDate() + 7);
    } else if (config.frequencia === 'quinzenal') {
      nextBaseDate.setDate(currentBaseDate.getDate() + 14);
    } else if (config.frequencia === 'mensal') {
      nextBaseDate.setMonth(currentBaseDate.getMonth() + 1);
    }
    currentBaseDate = nextBaseDate;
  }
  
  // Ordenar aulas por data
  return aulas.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
};

// Use Case: Registrar Novo Aluno (Com geração de aulas)
export const registrarAluno = async (
  nome: string, 
  instrumento: string, 
  mensalidade: number,
  ativo: boolean,
  configAgenda?: ConfiguracaoAgenda
): Promise<Aluno> => {
  
  const novoAluno: Aluno = {
    id: generateId(),
    nome,
    instrumento,
    mensalidade,
    ativo,
    configuracaoAgenda: configAgenda
  };
  
  await AlunoRepository.criar(novoAluno);

  // Se tiver configuração de agenda, gerar as aulas
  if (ativo && configAgenda && configAgenda.horarios.length > 0) {
    const aulasGeradas = gerarAulasFuturas(novoAluno.id, configAgenda);
    if (aulasGeradas.length > 0) {
      await AulaRepository.agendarLote(aulasGeradas);
    }
  }

  return novoAluno;
};

// Use Case: Editar Aluno (Com regeneração inteligente de agenda)
export const editarAluno = async (
  id: string,
  nome: string,
  instrumento: string,
  mensalidade: number,
  ativo: boolean,
  configAgenda?: ConfiguracaoAgenda
): Promise<void> => {
  
  // 1. Buscar estado atual
  const alunoAtual = await AlunoRepository.buscarPorId(id);
  if (!alunoAtual) throw new Error("Aluno não encontrado");

  const novoAluno: Aluno = {
    ...alunoAtual,
    nome,
    instrumento,
    mensalidade,
    ativo,
    configuracaoAgenda: configAgenda
  };

  // 2. Atualizar dados do aluno
  await AlunoRepository.atualizar(novoAluno);

  // 3. Lógica de Regeneração da Agenda
  // Se estiver Inativo OU se a configuração de agenda mudou, precisamos limpar o futuro.
  // Assumimos que qualquer edição no Save limpa e recria o futuro automático para garantir consistência.
  // Isso simplifica a lógica e evita "lixo" na agenda.
  
  // Limpar aulas futuras automáticas
  await AulaRepository.deletarAulasFuturas(id);

  // Se estiver Ativo e tiver Configuração, gerar novas aulas
  if (ativo && configAgenda && configAgenda.horarios.length > 0) {
     const aulasGeradas = gerarAulasFuturas(id, configAgenda);
     if (aulasGeradas.length > 0) {
       await AulaRepository.agendarLote(aulasGeradas);
     }
  }
};

// Use Case: Listar Alunos
export const listarAlunos = async (): Promise<Aluno[]> => {
  return await AlunoRepository.listar();
};

// Use Case: Agendar Aula Simples (Avulsa)
export const agendarAula = async (alunoId: string, data: string, anotacoes: string): Promise<Aula> => {
  console.log('[UseCase] agendarAula - Data recebida do frontend:', data);
  console.log('[UseCase] agendarAula - Tipo:', typeof data);
  
  // Normalizar data para ISO mantendo timezone local
  // Input datetime-local vem como "YYYY-MM-DDTHH:mm" (sem timezone)
  // Precisamos garantir que seja tratado como local, não UTC
  let dataISO: string;
  if (data.includes('T') && !data.includes('Z') && !data.includes('+')) {
    // Formato datetime-local sem timezone
    const localDate = new Date(data);
    dataISO = localDate.toISOString();
    console.log('[UseCase] agendarAula - Data local interpretada:', localDate.toString());
    console.log('[UseCase] agendarAula - Data ISO para banco:', dataISO);
  } else {
    dataISO = data;
    console.log('[UseCase] agendarAula - Data já no formato ISO:', dataISO);
  }
  
  const novaAula: Aula = {
    id: generateId(),
    alunoId,
    data: dataISO,
    dataAtualizacao: new Date().toISOString(),
    presente: null,
    anotacoes,
    repertorio: []
  };
  
  console.log('[UseCase] agendarAula - Aula a ser criada:', novaAula);
  await AulaRepository.agendar(novaAula);
  return novaAula;
};

// Use Case: Marcar Presença e Atualizar Detalhes
export const atualizarAula = async (aula: Aula): Promise<void> => {
  console.log('[UseCase] atualizarAula - Aula recebida:', aula);
  console.log('[UseCase] atualizarAula - Data:', aula.data);
  
  // Normalizar data se necessário
  let aulaAtualizada = { ...aula };
  if (aula.data && typeof aula.data === 'string') {
    if (aula.data.includes('T') && !aula.data.includes('Z') && !aula.data.includes('+')) {
      // Formato datetime-local sem timezone
      const localDate = new Date(aula.data);
      aulaAtualizada.data = localDate.toISOString();
      console.log('[UseCase] atualizarAula - Data convertida de local para ISO:', aulaAtualizada.data);
    }
  }
  
  console.log('[UseCase] atualizarAula - Enviando para repository:', aulaAtualizada);
  await AulaRepository.atualizar(aulaAtualizada);
};

// Use Case: Deletar Aula
export const deletarAula = async (id: string): Promise<void> => {
  await AulaRepository.deletar(id);
};

// Use Case: Listar Agenda
export const listarAgenda = async (inicio?: Date, fim?: Date): Promise<(Aula & { aluno?: Aluno })[]> => {
  let start = inicio;
  let end = fim;

  if (!start) {
    start = new Date();
    start.setHours(0, 0, 0, 0);
  }
  
  if (!end) {
    end = new Date(start);
    end.setDate(end.getDate() + 30);
  }

  console.log('[UseCase] listarAgenda - Período:', { start, end });
  const aulas = await AulaRepository.listarPorPeriodo(start, end);
  console.log('[UseCase] listarAgenda - Aulas recebidas do backend:', aulas.length);
  
  if (aulas.length > 0) {
    console.log('[UseCase] listarAgenda - Exemplo de aula[0]:', aulas[0]);
    console.log('[UseCase] listarAgenda - Data da aula[0]:', aulas[0].data);
    console.log('[UseCase] listarAgenda - new Date(aula[0].data):', new Date(aulas[0].data).toString());
  }
  
  const alunos = await AlunoRepository.listar();

  return aulas.map(aula => ({
    ...aula,
    aluno: alunos.find(a => a.id === aula.alunoId)
  }));
};

// Use Case: Listar Histórico de Aulas (Passadas)
export const listarHistoricoAluno = async (alunoId: string): Promise<Aula[]> => {
  const todasAulas = await AulaRepository.listarPorAluno(alunoId);
  const now = new Date();
  // Filter for past lessons only
  return todasAulas.filter(a => new Date(a.data) < now);
};

// Use Case: Obter Resumo para Dashboard
export const obterResumoDashboard = async (): Promise<{ stats: DashboardStats, aulasHoje: (Aula & { aluno?: Aluno })[] }> => {
  const alunos = await AlunoRepository.listar();
  
  // Estatísticas de Alunos
  const totalAlunos = alunos.length;
  const alunosAtivos = alunos.filter(a => a.ativo).length;
  
  // Renda Mensal (Soma das mensalidades de alunos ativos)
  const rendaMensalEstimada = alunos
    .filter(a => a.ativo)
    .reduce((total, aluno) => total + (aluno.mensalidade || 0), 0);

  // Aulas de Hoje
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);
  
  const hojeFim = new Date();
  hojeFim.setHours(23, 59, 59, 999);

  const aulasHojeRaw = await AulaRepository.listarPorPeriodo(hojeInicio, hojeFim);
  
  // Popula dados do aluno na aula
  const aulasHoje = aulasHojeRaw.map(aula => ({
    ...aula,
    aluno: alunos.find(a => a.id === aula.alunoId)
  })).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  const aulasPendentesHoje = aulasHoje.filter(a => a.presente === null).length;

  return {
    stats: {
      totalAlunos,
      alunosAtivos,
      rendaMensalEstimada,
      aulasHoje: aulasHoje.length,
      aulasPendentesHoje
    },
    aulasHoje
  };
};
