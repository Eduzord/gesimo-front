import React from "react";
import { LayoutDashboard, Users, LogOut, Menu, Home, Calendar, Percent, Settings, Landmark } from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { isAdmin } from "../../utils/auth";

export default function Sidebar({ menuAberto, setMenuAberto, nome }) {
  const location = useLocation();
  const rotaAtual = location.pathname;
  
  // CORREÇÃO 1: Faltava inicializar o hook de navegação aqui!
  const navigate = useNavigate(); 

  const handleLogout = () => {
    // 1. Limpa os dados do usuário do navegador
    localStorage.removeItem("@gesimo:token");
    localStorage.removeItem("@gesimo:nome");
    localStorage.removeItem("@gesimo:role");

    // 2. Redireciona para a tela de login
    navigate("/"); 
  };

  // "adminOnly: true" esconde o item de quem não é ADMIN (a rota também é protegida em App.jsx)
  const navLinks = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Users, label: "Locadores", path: "/locadores" },
    { icon: Users, label: "Locatários", path: "/locatarios" },
    { icon: Home, label: "Imóveis", path: "/imoveis" },
    { icon: Calendar, label: "Agenda", path: "/agendamentos"},
    { icon: Percent, label: "Tabelas IRRF", path: "/irrf" },
    { icon: Settings, label: "Gerenciar IRRF", path: "/irrf/gerenciar", adminOnly: true },
    { icon: Landmark, label: "Contas Bancárias", path: "/contas-bancarias" },
  ].filter((link) => !link.adminOnly || isAdmin());

  return (
    <aside
      className={`${menuAberto ? "w-64" : "w-20"} bg-[#111827] text-gray-300 transition-all duration-300 flex flex-col justify-between shrink-0`}
    >
      <div>
        {/* Topo da Sidebar (Logo e Botão Toggle) */}
        <div className="p-4 flex items-center justify-between h-20 border-b border-gray-800">
          {menuAberto && (
            <span className="text-white font-bold text-2xl tracking-wide">
              GESIMO
            </span>
          )}
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="p-2 hover:bg-gray-800 rounded-md transition-colors"
          >
            <Menu size={24} color="white" />
          </button>
        </div>

        {/* Links de Navegação */}
        <nav className="px-3 py-6 flex flex-col gap-2">
          {navLinks.map((link, index) => {
            const Icon = link.icon;
            const isActive = rotaAtual === link.path;

            return (
              <Link
                key={index}
                to={link.path}
                className={`flex items-center gap-3 p-3 rounded-md transition-colors ${isActive ? "bg-white text-[#111827] font-medium" : "hover:bg-gray-800 text-gray-300"}`}
              >
                <Icon size={20} />
                {menuAberto && <span>{link.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* CORREÇÃO 2: Rodapé da Sidebar - Transformamos a div inteira em um botão de área ampla */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-2 hover:bg-red-50 text-gray-300 hover:text-red-600 rounded transition-colors"
        >
          <LogOut size={20} />
          {menuAberto && <span className="font-medium">Sair</span>}
        </button>
      </div>
    </aside>
  );
}