import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Dashboard from './pages/Dashboard'; 
import Locadores from './pages/Locadores';
import Locatarios from './pages/Locatarios';
import DetalhesLocatario from './pages/Locatarios/detalhes';
import Imoveis from './pages/Imoveis';
import DetalhesImovel from './pages/Imoveis/detalhes';
import DetalhesLocador from './pages/Locadores/detalhes';
import Agendamentos from './pages/Agendamentos';
import Irrf from './pages/Irrf';
import GerenciarIrrf from './pages/Irrf/gerenciar';
import ContasBancarias from './pages/ContasBancarias';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    //BrowserRouter é o "envelopador" que habilita a navegação
    <BrowserRouter>
      <Routes>
        {/* <!-- Rota raiz (/) renderiza o Login --> */}
        <Route path="/" element={<Login />} />
        
        {/* <!-- Rota /cadastro renderiza o Cadastro --> */}
        <Route path="/cadastro" element={<Cadastro />} />
        
        {/* <!-- Rota /dashboard renderiza o Dashboard --> */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        
        {/* <!-- Rota /locadores renderiza o Locadores --> */}
        <Route path="/locadores" element={<ProtectedRoute><Locadores /></ProtectedRoute>} />
        <Route path="/locadores/:id" element={<ProtectedRoute><DetalhesLocador/></ProtectedRoute>} />

        {/* <!-- Rota /locatarios renderiza o Locatários --> */}
        <Route path="/locatarios" element={<ProtectedRoute><Locatarios /></ProtectedRoute>} />
        <Route path="/locatarios/:id" element={<ProtectedRoute><DetalhesLocatario/></ProtectedRoute>} />

        {/* <!-- Rota /imoveis renderiza o Imóveis --> */}
        <Route path="/imoveis" element={<ProtectedRoute><Imoveis /></ProtectedRoute>} />
        <Route path="/imoveis/:id" element={<ProtectedRoute><DetalhesImovel/></ProtectedRoute>} />

        {/* <!-- Rota /agendamentos renderiza o Agendamento --> */}
        <Route path="/agendamentos" element={<ProtectedRoute><Agendamentos /></ProtectedRoute>} />

        {/* <!-- Tabelas IRRF: consulta para todos; edição só para ADMIN --> */}
        <Route path="/irrf" element={<ProtectedRoute><Irrf /></ProtectedRoute>} />
        <Route path="/irrf/gerenciar" element={<ProtectedRoute role="ADMIN"><GerenciarIrrf /></ProtectedRoute>} />

        {/* <!-- Contas bancárias: CRUD aberto a qualquer usuário autenticado --> */}
        <Route path="/contas-bancarias" element={<ProtectedRoute><ContasBancarias /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}