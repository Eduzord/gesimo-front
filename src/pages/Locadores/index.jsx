// src/pages/Locadores/index.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, Edit, Trash2, AlertTriangle } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Button from "../../components/Button";
import DataTable from "../../components/DataTable";
import ModalContainer from "../../components/ModalContainer"; // Importe o container
import FormularioLocador from "../../components/Formularios/FormularioLocador"; // Importe o formulário
import MenuAcoes from "../../components/MenuAcoes";
import { api } from "../../services/api";
import { correspondeABusca } from "../../utils/busca";

export default function Locadores() {
  const [menuAberto, setMenuAberto] = useState(() => {
    const preferenciaSalva = localStorage.getItem("@gesimo:menuAberto");
    return preferenciaSalva !== null ? JSON.parse(preferenciaSalva) : true;
  });

  const [nome, setNome] = useState("");
  const [locadores, setLocadores] = useState([]);
  const [termoBusca, setTermoBusca] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const navigate = useNavigate();
  
  // 1. Estado para controlar o modal
  const [modalAberto, setModalAberto] = useState(false);

  const handleDelete = async (id) => {
    if (window.confirm("Deseja realmente apagar este locador?")) {
      try {
        const token = localStorage.getItem("@gesimo:token");
        await api.delete(`/locadores/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        carregarLocadores();
      } catch (erro) {
        console.error("Erro ao apagar locador:", erro);
        alert("Erro ao apagar locador");
      }
    }
  };

  const handleHardDelete = async (id) => {
    if (window.confirm("ATENÇÃO: Deseja apagar este locador PERMANENTEMENTE? (Hard Delete)")) {
      try {
        const token = localStorage.getItem("@gesimo:token");
        await api.delete(`/locadores/${id}/hard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        carregarLocadores();
      } catch (erro) {
        console.error("Erro ao apagar locador permanentemente:", erro);
        alert("Erro ao apagar locador permanentemente");
      }
    }
  };

  const colunasDaTabela = [
    { key: "nomeExibicao", label: "Nome" },
    { key: "documentoExibicao", label: "CPF/CNPJ" },
    { key: "email", label: "Email" },
    { key: "imoveis", label: "Imóveis" },
    { key: "acoes", label: "Ações" },
  ];

  // 2. Usamos useCallback para que a função possa ser chamada de outros lugares
  const carregarLocadores = useCallback(async () => {
    // Pegamos o token do localStorage
    const token = localStorage.getItem("@gesimo:token");
    
    try {
      // INJETAMOS O TOKEN AQUI NO CABEÇALHO DA REQUISIÇÃO
      const resposta = await api.get(`/locadores?page=${paginaAtual}&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const rawData = resposta.data.data || resposta.data;
      const isAdmin = localStorage.getItem("@gesimo:role") === "ADMIN";

      const locadoresComAcoes = rawData.map(locador => ({
        ...locador,
        nomeExibicao: locador.tipoPessoa === "JURIDICA" ? locador.razaoSocial : locador.nome,
        documentoExibicao: locador.tipoPessoa === "JURIDICA" ? locador.cnpj : locador.cpf,
        acoes: (
          <MenuAcoes
            opcoes={[
              { label: "Visualizar", icon: Eye, atalho: true, onClick: () => navigate(`/locadores/${locador.id}`) },
              { label: "Editar", icon: Edit, onClick: () => navigate(`/locadores/${locador.id}?edit=true`) },
              { label: "Apagar", icon: Trash2, danger: true, onClick: () => handleDelete(locador.id) },
              ...(isAdmin ? [{ label: "Remoção Definitiva", icon: AlertTriangle, danger: true, onClick: () => handleHardDelete(locador.id) }] : [])
            ]}
          />
        )
      }));

      setLocadores(locadoresComAcoes);
      setTotalPaginas(resposta.data.meta?.totalPages || 1);
    } catch (erro) {
      console.error("Erro ao carregar locadores:", erro);
    }
  }, [paginaAtual]);

  useEffect(() => {
    setNome(localStorage.getItem("@gesimo:nome") || "Usuário");
    carregarLocadores();
  }, [carregarLocadores]);

  useEffect(() => {
    localStorage.setItem("@gesimo:menuAberto", JSON.stringify(menuAberto));
  }, [menuAberto]);

  const lidarComMudancaDePagina = (novaPagina) => setPaginaAtual(novaPagina);

  // A lista já vem completa do servidor, então o filtro roda em memória a cada tecla (sem novas requisições)
  const locadoresFiltrados = useMemo(
    () =>
      locadores.filter((locador) =>
        correspondeABusca(termoBusca, [
          locador.nomeExibicao,
          locador.nome,
          locador.razaoSocial,
          locador.documentoExibicao,
          locador.email,
        ]),
      ),
    [locadores, termoBusca],
  );

  const botaoNovoLocador = (
    <Button variant="primary" icon={Plus} onClick={() => setModalAberto(true)}>
      Novo Locador
    </Button>
  );

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} nome={nome} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header nome={nome} />

        <main className="p-8 max-w-7xl mx-auto w-full flex-1 flex flex-col">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">Locadores</h1>
            <p className="text-gray-500 text-sm">Gerencie os locadores cadastrados.</p>
          </div>

          <DataTable
            colunas={colunasDaTabela}
            dados={locadoresFiltrados}
            paginaAtual={paginaAtual}
            totalPaginas={totalPaginas}
            onPageChange={lidarComMudancaDePagina}
            placeholderBusca="Buscar por nome, CPF, CNPJ ou e-mail"
            botaoAcao={botaoNovoLocador}
            onSearch={setTermoBusca}
            totalResultados={locadoresFiltrados.length}
            mensagemVazia={
              termoBusca.trim()
                ? `Nenhum locador encontrado para "${termoBusca.trim()}".`
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
        title="Novo Locador"
      >
        <FormularioLocador
          onClose={() => setModalAberto(false)}
          onSuccess={() => carregarLocadores()}
        />
      </ModalContainer>
    </div>
  );
}