import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Eye, Edit, Trash2, AlertTriangle } from "lucide-react"; // Usando 'Users' para representar locatários
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Button from "../../components/Button";
import DataTable from "../../components/DataTable";
import ModalContainer from "../../components/ModalContainer";
import FormularioLocatario from "../../components/Formularios/FormularioLocatario";
import MenuAcoes from "../../components/MenuAcoes";

import { api } from "../../services/api";

export default function Locatarios() {
  const [menuAberto, setMenuAberto] = useState(() => {
    const preferenciaSalva = localStorage.getItem("@gesimo:menuAberto");
    return preferenciaSalva !== null ? JSON.parse(preferenciaSalva) : true;
  });

  const [nomeUsuario, setNomeUsuario] = useState("");
  const [locatarios, setLocatarios] = useState([]);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const navigate = useNavigate();

  // A lista é paginada no servidor, então a busca também é feita lá (filtrar só a página atual
  // esconderia resultados das outras páginas). Página e termo mudam juntos para gerar uma única requisição.
  const [consulta, setConsulta] = useState({ pagina: 1, busca: "" });
  const paginaAtual = consulta.pagina;
  const buscaAtual = consulta.busca;
  const temporizadorBusca = useRef(null);
  const ultimaRequisicao = useRef(0);

  // Debounce: só consulta o servidor 350ms depois da última tecla e volta para a página 1
  const lidarComBusca = (termo) => {
    clearTimeout(temporizadorBusca.current);
    temporizadorBusca.current = setTimeout(() => {
      const busca = termo.trim();
      setConsulta((atual) => (atual.busca === busca ? atual : { pagina: 1, busca }));
    }, 350);
  };

  useEffect(() => () => clearTimeout(temporizadorBusca.current), []);

  const handleDelete = async (id) => {
    if (window.confirm("Deseja realmente inativar este locatário? (Soft Delete)")) {
      try {
        const token = localStorage.getItem("@gesimo:token");
        await api.delete(`/locatarios/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        carregarLocatarios();
      } catch (erro) {
        console.error("Erro ao inativar locatário:", erro);
        alert("Erro ao inativar locatário");
      }
    }
  };

  const handleHardDelete = async (id) => {
    if (window.confirm("ATENÇÃO: Deseja apagar este locatário PERMANENTEMENTE? (Hard Delete)")) {
      try {
        const token = localStorage.getItem("@gesimo:token");
        await api.delete(`/locatarios/${id}/hard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        carregarLocatarios();
      } catch (erro) {
        console.error("Erro ao apagar locatário permanentemente:", erro);
        alert("Erro ao apagar locatário permanentemente");
      }
    }
  };


  // Colunas espelhando perfeitamente o design do mockup image_eed73b.jpg
  const colunasDaTabela = [
    { key: "nomeExibicao", label: "Nome" },
    { key: "documentoExibicao", label: "CPF/CNPJ" },
    { key: "telefone", label: "Telefone" },
    { key: "email", label: "Email" },
    { key: "contratos", label: "Contratos" },
    { key: "acoes", label: "Ações" },
  ];

  const carregarLocatarios = useCallback(async () => {
    const token = localStorage.getItem("@gesimo:token");

    // Se o usuário continuar digitando, respostas antigas que chegarem depois são descartadas
    const idRequisicao = ++ultimaRequisicao.current;
    setCarregando(true);

    try {
      const resposta = await api.get("/locatarios", {
        params: { page: paginaAtual, limit: 10, busca: buscaAtual || undefined },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (idRequisicao !== ultimaRequisicao.current) return;

      const dadosBrutos = resposta.data.data || resposta.data;
      const isAdmin = localStorage.getItem("@gesimo:role") === "ADMIN";

      // Normalizando os dados do Prisma para a exibição limpa na tabela
      const locatariosFormatados = dadosBrutos.map((loc) => {
        const isPF = !!loc.pessoaFisica;
        return {
          ...loc,
          nomeExibicao: isPF ? loc.pessoaFisica.nome : loc.pessoaJuridica?.razaoSocial || "N/A",
          documentoExibicao: isPF ? loc.pessoaFisica.cpf : loc.pessoaJuridica?.cnpj || "N/A",
          contratos: loc.contratosCount, 
          acoes: (
            <MenuAcoes
              opcoes={[
                { label: "Visualizar", icon: Eye, atalho: true, onClick: () => navigate(`/locatarios/${loc.id}`) },
                { label: "Editar", icon: Edit, onClick: () => navigate(`/locatarios/${loc.id}?edit=true`) },
                { label: "Apagar", icon: Trash2, danger: true, onClick: () => handleDelete(loc.id) },
                ...(isAdmin ? [{ label: "Remoção Definitiva", icon: AlertTriangle, danger: true, onClick: () => handleHardDelete(loc.id) }] : [])
              ]}
            />
          )
        };
      });

      setLocatarios(locatariosFormatados);
      setTotalPaginas(resposta.data.meta?.totalPages || 1);
      setTotalRegistros(resposta.data.meta?.total ?? locatariosFormatados.length);
    } catch (erro) {
      if (idRequisicao === ultimaRequisicao.current) {
        console.error("Erro ao carregar locatários:", erro);
      }
    } finally {
      if (idRequisicao === ultimaRequisicao.current) setCarregando(false);
    }
  }, [paginaAtual, buscaAtual]);

  useEffect(() => {
    setNomeUsuario(localStorage.getItem("@gesimo:nome") || "Usuário");
    carregarLocatarios();
  }, [carregarLocatarios]);

  useEffect(() => {
    localStorage.setItem("@gesimo:menuAberto", JSON.stringify(menuAberto));
  }, [menuAberto]);

  const botaoNovoLocatario = (
    <Button variant="primary" icon={Plus} onClick={() => setModalAberto(true)}>
      Novo Locatário
    </Button>
  );

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} nome={nomeUsuario} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header nome={nomeUsuario} />

        <main className="p-8 max-w-7xl mx-auto w-full flex-1 flex flex-col">
          <div className="mb-8 flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">Locatários</h1>
              <p className="text-gray-500 text-sm">Gerencie os locatários cadastrados.</p>
            </div>
          </div>

          <DataTable
            colunas={colunasDaTabela}
            dados={locatarios}
            paginaAtual={paginaAtual}
            totalPaginas={totalPaginas}
            onPageChange={(nova) => setConsulta((atual) => ({ ...atual, pagina: nova }))}
            placeholderBusca="Buscar por nome, CPF, CNPJ, e-mail ou telefone"
            botaoAcao={botaoNovoLocatario}
            onSearch={lidarComBusca}
            totalResultados={totalRegistros}
            carregando={carregando}
            mensagemVazia={
              buscaAtual
                ? `Nenhum locatário encontrado para "${buscaAtual}".`
                : "Nenhum registro encontrado."
            }
          />

          <div className="flex-1"></div>
          <Footer />
        </main>
      </div>

      <ModalContainer
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        title="Novo Locatário"
      >
        <FormularioLocatario onClose={() => setModalAberto(false)} onSuccess={carregarLocatarios} />
      </ModalContainer>
    </div>
  );
}