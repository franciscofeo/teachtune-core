
import React from 'react';
import { ViewType } from '../types';
import { Calendar, Users, Music, LayoutDashboard, History, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onViewChange }) => {
  const { professor, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar / Mobile Nav */}
      <nav className="bg-indigo-700 text-white w-full md:w-64 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-indigo-600 flex items-center gap-2">
          <Music className="w-8 h-8 text-indigo-300" />
          <div>
            <h1 className="text-xl font-bold">TeachTune</h1>
          </div>
        </div>
        
        <div className="flex md:flex-col p-2 md:p-4 gap-2 overflow-x-auto">
          <button
            onClick={() => onViewChange('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full ${
              currentView === 'dashboard' 
                ? 'bg-indigo-800 text-white shadow-md' 
                : 'text-indigo-100 hover:bg-indigo-600'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Visão Geral</span>
          </button>

          <button
            onClick={() => onViewChange('agenda')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full ${
              currentView === 'agenda' 
                ? 'bg-indigo-800 text-white shadow-md' 
                : 'text-indigo-100 hover:bg-indigo-600'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="font-medium">Agenda</span>
          </button>
          
          <button
            onClick={() => onViewChange('students')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full ${
              currentView === 'students' 
                ? 'bg-indigo-800 text-white shadow-md' 
                : 'text-indigo-100 hover:bg-indigo-600'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Alunos</span>
          </button>

          <button
            onClick={() => onViewChange('history')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full ${
              currentView === 'history' 
                ? 'bg-indigo-800 text-white shadow-md' 
                : 'text-indigo-100 hover:bg-indigo-600'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="font-medium">Histórico</span>
          </button>
        </div>

        {/* Professor Info & Logout */}
        <div className="mt-auto p-4 border-t border-indigo-600">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-indigo-200" />
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-sm truncate">{professor?.nome}</p>
              <p className="text-xs text-indigo-300 truncate">{professor?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};