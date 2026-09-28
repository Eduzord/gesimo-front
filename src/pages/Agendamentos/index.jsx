import React, { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight, Search } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Calendario from "../../components/Calendario";
import MiniCalendario from "../../components/MiniCalendario";
import ModalContainer from "../../components/ModalContainer";
import FormularioAgendamento from "../../components/Formularios/FormularioAgendamento";
import Breadcrumbs from "../../components/Breadcrumbs";
import { ITEM_DASHBOARD } from "../../utils/breadcrumbs";
import { api } from "../../services/api";

export default function Agendamentos() {
  const [menuAberto, setMenuAberto] = useState(() => {
    const preferenciaSalva = localStorage.getItem("@gesimo:menuAberto");
    return preferenciaSalva !== null ? JSON.parse(preferenciaSalva) : true;
  });

  const [nomeUsuario, setNomeUsuario] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  // Estado para controlar a view do calendário
  const [view, setView] = useState('week'); 
  const [agendamentos, setAgendamentos] = useState([]);

  const fetchAgendamentos = async () => {
    try {
      const token = localStorage.getItem("@gesimo:token");
      const { data } = await api.get('/agendamentos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAgendamentos(data.data || data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setNomeUsuario(localStorage.getItem("@gesimo:nome") || "Usuário");
    fetchAgendamentos();
  }, []);

  useEffect(() => {
    localStorage.setItem("@gesimo:menuAberto", JSON.stringify(menuAberto));
  }, [menuAberto]);

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar
        menuAberto={menuAberto}
        setMenuAberto={setMenuAberto}
        nome={nomeUsuario}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header nome={nomeUsuario} />

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 flex flex-col bg-white overflow-y-auto">
            <div className="p-8 max-w-7xl mx-auto w-full flex-1 flex flex-col">
              <Breadcrumbs itens={[ITEM_DASHBOARD, { label: "Agenda" }]} />

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                  <button className="p-1 hover:bg-white rounded-md transition-colors">
                    <ChevronLeft size={20} className="text-gray-600" />
                  </button>
                  <span className="px-3 text-sm font-medium text-gray-700">Hoje</span>
                  <button className="p-1 hover:bg-white rounded-md transition-colors">
                    <ChevronRight size={20} className="text-gray-600" />
                  </button>
                </div>

                {/* BOTÕES DE VIEW DINÂMICOS */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-sm font-medium">
                  {['day', 'week', 'month', 'year'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setView(mode)}
                      className={`px-4 py-1.5 rounded-md transition-all ${
                        view === mode 
                          ? "bg-red-500 text-white shadow-sm" 
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="relative w-64">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Procurar compromisso..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-gray-300"
                  />
                </div>
              </div>

              {/* Passando o estado view e agendamentos como props para o componente Calendario */}
              <Calendario view={view} agendamentos={agendamentos} />

              <div className="flex-1"></div>
              <Footer />
            </div>
          </main>

          <aside className="w-80 xl:w-96 bg-[#181a20] flex flex-col border-l border-gray-800 shadow-xl z-10">
            <div className="p-6 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <button
                onClick={() => setModalAberto(true)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center justify-center"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="px-6 flex-1 overflow-y-auto pb-6">
              <MiniCalendario agendamentos={agendamentos} />
              <div className="h-px bg-gray-800 my-6"></div>
            </div>
          </aside>
        </div>
      </div>

      <ModalContainer isOpen={modalAberto} onClose={() => setModalAberto(false)} title="Novo Compromisso">
        <FormularioAgendamento
          onClose={() => setModalAberto(false)}
          onSuccess={() => {
            setModalAberto(false);
            fetchAgendamentos();
          }}
        />
      </ModalContainer>
    </div>
  );
}