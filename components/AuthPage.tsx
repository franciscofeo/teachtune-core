import React, { useState } from 'react';
import { Login } from './Login';
import { Cadastro } from './Cadastro';

export const AuthPage: React.FC = () => {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <div key={showLogin ? 'login' : 'cadastro'} className="view-transition">
      {showLogin ? (
        <Login onToggleCadastro={() => setShowLogin(false)} />
      ) : (
        <Cadastro onToggleLogin={() => setShowLogin(true)} />
      )}
    </div>
  );
};

