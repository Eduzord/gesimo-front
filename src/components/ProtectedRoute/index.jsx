import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getRole, isTokenValid } from '../../utils/auth';

// "role" é opcional: quando informado (ex.: role="ADMIN"), só esse papel acessa a rota.
// Isso apenas evita que o usuário veja uma tela que o servidor recusaria de qualquer forma.
export default function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem('@gesimo:token');
  const location = useLocation();

  if (!token || !isTokenValid(token)) {
    // Redireciona para o login e passa a mensagem via state
    return <Navigate to="/" state={{ mensagem: "Por favor efetue o login" }} replace />;
  }

  if (role && getRole() !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
