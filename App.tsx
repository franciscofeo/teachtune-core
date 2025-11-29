import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { AgendaView } from './components/AgendaView';
import { StudentsView } from './components/StudentsView';
import { DashboardView } from './components/DashboardView';
import { HistoryView } from './components/HistoryView';
import { AuthPage } from './components/AuthPage';
import { ViewType } from './types';

// Componente interno que usa o contexto de autenticação
const AppContent: React.FC = () => {
  const { professor, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mb-4"></div>
          <p className="text-white text-lg font-semibold">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não está autenticado, mostrar tela de login
  if (!professor) {
    return <AuthPage />;
  }

  // Se está autenticado, mostrar aplicação normal
  return (
    <Layout currentView={currentView} onViewChange={setCurrentView}>
      <div key={currentView} className="view-transition">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'agenda' && <AgendaView />}
        {currentView === 'students' && <StudentsView />}
        {currentView === 'history' && <HistoryView />}
      </div>
    </Layout>
  );
};

// Componente principal com Provider
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;