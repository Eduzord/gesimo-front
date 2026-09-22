import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { UploadCloud, FileText, Edit, MapPin, ArrowLeft, Trash2, AlertCircle, CheckCircle2, UserPlus, Calculator } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import ModalContainer from "../../components/ModalContainer";
import FormularioEdicaoImovel from "../../components/Formularios/FormularioEdicaoImovel";
import FormularioContrato from "../../components/Formularios/FormularioContrato";
import FormularioDespesa from "../../components/Formularios/FormularioDespesas";
import FormularioLiquidarDespesa from "../../components/Formularios/FormularioLiquidarDespesa";
import EditorPosseImovel from "../../components/Formularios/EditorPosseImovel";
import ModalGerarMemoriaCalculo from "../../components/Formularios/ModalGerarMemoriaCalculo";
import { api } from "../../services/api";
import { listarDespesasDoImovel } from "../../services/memoriaCalculo";
import { formatarMoeda } from "../../utils/formatacao";
import { TIPOS_DESPESA } from "../../utils/memoriaCalculo";
import {
  formatarPercentual,
  nomeDoLocador,
  nomeDoLocatario,
  proprietariosParaEstado,
  somaPosse,
} from "../../utils/posse";

export default function DetalhesImovel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditInit = new URLSearchParams(location.search).get("edit") === "true";

  const [imovel, setImovel] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(isEditInit);
  const [modalContratoAberto, setModalContratoAberto] = useState(false);
  const [modalDespesaAberto, setModalDespesaAberto] = useState(false);
  const [modalPosseAberto, setModalPosseAberto] = useState(false);
  const [modalMemoriaAberto, setModalMemoriaAberto] = useState(false);
  const [contratos, setContratos] = useState([]);
  const [contratoEmEdicao, setContratoEmEdicao] = useState(null);
  const [despesasImovel, setDespesasImovel] = useState([]);
  const [carregandoDespesas, setCarregandoDespesas] = useState(true);
  const [despesaEmLiquidacao, setDespesaEmLiquidacao] = useState(null);
  // Nomes resolvidos por ID (o imóvel e o contrato só guardam idLocador/idLocatario)
  const [nomesLocadores, setNomesLocadores] = useState({});
  const [nomesLocatarios, setNomesLocatarios] = useState({});

  const [nomeUsuario, setNomeUsuario] = useState("");
  const [menuAberto, setMenuAberto] = useState(() => {
    const preferenciaSalva = localStorage.getItem("@gesimo:menuAberto");
    return preferenciaSalva !== null ? JSON.parse(preferenciaSalva) : true;
  });

  const abas = [
    { id: "visao-geral", label: "Visão Geral" },
    { id: "contratos", label: "Contratos" },
    { id: "despesas", label: "Despesas" },
  ];

  useEffect(() => {
    setNomeUsuario(localStorage.getItem("@gesimo:nome") || "Usuário");
  }, []);

  useEffect(() => {
    localStorage.setItem("@gesimo:menuAberto", JSON.stringify(menuAberto));
  }, [menuAberto]);

  useEffect(() => {
    const carregarDetalhes = async () => {
      try {
        const token = localStorage.getItem("@gesimo:token");
        const resposta = await api.get(`/imoveis/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setImovel(resposta.data.data || resposta.data);
      } catch (erro) {
        console.error("Erro ao carregar detalhes do imóvel:", erro);
      } finally {
        setCarregando(false);
      }
    };

    if (id) carregarDetalhes();
  }, [id]);

  useEffect(() => {
    const carregarContratos = async () => {
      try {
        const token = localStorage.getItem("@gesimo:token");
        const resposta = await api.get("/imoveis/contratos", {
          headers: { Authorization: `Bearer ${token}` },
          params: { idImovel: id },
        });
        const dados = resposta.data.data || resposta.data || [];
        setContratos(Array.isArray(dados) ? dados : []);
      } catch (erro) {
        console.error("Erro ao carregar contratos do imóvel:", erro);
      }
    };

    if (id) carregarContratos();
  }, [id]);

  const recarregarDespesas = () => {
    if (!id) return;
    setCarregandoDespesas(true);
    listarDespesasDoImovel(id)
      .then((dados) => setDespesasImovel(Array.isArray(dados) ? dados : []))
      .catch((erro) => console.error("Erro ao carregar despesas do imóvel:", erro))
      .finally(() => setCarregandoDespesas(false));
  };

  useEffect(recarregarDespesas, [id]);

  // Resolve os nomes de locadores (proprietários + locadores dos contratos) e locatários dos contratos
  useEffect(() => {
    if (!imovel) return;

    const idsLocadores = [
      ...new Set([
        ...(imovel.propriedadeimovel || []).map((p) => String(p.idLocador)),
        ...contratos.map((c) => String(c.idLocador)),
      ]),
    ];
    const idsLocatarios = [...new Set(contratos.map((c) => String(c.idLocatario)))];

    const buscarNomes = async (ids, rota, obterNome) => {
      const pares = await Promise.all(
        ids.map(async (idBuscado) => {
          try {
            const resposta = await api.get(`${rota}/${idBuscado}`);
            return [idBuscado, obterNome(resposta.data.data || resposta.data)];
          } catch {
            return [idBuscado, ""];
          }
        }),
      );
      return Object.fromEntries(pares);
    };

    buscarNomes(idsLocadores, "/locadores", nomeDoLocador).then(setNomesLocadores);
    buscarNomes(idsLocatarios, "/locatarios", nomeDoLocatario).then(setNomesLocatarios);
  }, [imovel, contratos]);

  const nomeLocador = (idLocador) => nomesLocadores[String(idLocador)] || `Locador #${idLocador}`;
  const nomeLocatario = (idLocatario) => nomesLocatarios[String(idLocatario)] || `Locatário #${idLocatario}`;

  const formatarData = (data) => {
    if (!data) return "-";
    return new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  };

  const formatarComissao = (comissao) => {
    if (comissao === undefined || comissao === null) return "-";
    return `${(Number(comissao) * 100).toFixed(2).replace(".", ",")}%`;
  };

  const abrirEdicaoContrato = (contrato) => {
    setContratoEmEdicao(contrato);
    setModalContratoAberto(true);
  };

  const handleDelete = async () => {
    if (window.confirm("Deseja realmente apagar este imóvel?")) {
      try {
        const token = localStorage.getItem("@gesimo:token");
        await api.delete(`/imoveis/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        navigate('/imoveis');
      } catch (erro) {
        console.error("Erro ao apagar imóvel:", erro);
        alert("Erro ao apagar imóvel");
      }
    }
  };

  const handleHardDelete = async () => {
    if (window.confirm("ATENÇÃO: Deseja apagar este imóvel PERMANENTEMENTE? (Hard Delete)")) {
      try {
        const token = localStorage.getItem("@gesimo:token");
        await api.delete(`/imoveis/${id}/hard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        navigate('/imoveis');
      } catch (erro) {
        console.error("Erro ao apagar imóvel permanentemente:", erro);
        alert("Erro ao apagar imóvel permanentemente");
      }
    }
  };

  const formatarPalavra = (palavra) => {
    if (!palavra) return "";
    return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
  };

  if (carregando)
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center font-sans">
        Carregando...
      </div>
    );
  if (!imovel)
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center font-sans text-red-500">
        Imóvel não encontrado.
      </div>
    );

  const proprietarios = imovel.propriedadeimovel || [];
  const totalPosse = somaPosse(proprietarios);
  const contratoAtivo = contratos.find((c) => c.status === "ATIVO");

  // Locatário só entra por contrato: o imóvel precisa estar livre e ter proprietários para o contrato apontar um deles
  let motivoSemLocatario = "";
  if (proprietarios.length === 0) {
    motivoSemLocatario = "Vincule ao menos um locador proprietário antes de vincular um locatário.";
  } else if (imovel.status !== "DISPONIVEL") {
    motivoSemLocatario = `O imóvel está ${formatarPalavra(imovel.status)}. Só é possível vincular um locatário a um imóvel disponível.`;
  }

  const resumoLocadores =
    proprietarios.length === 0
      ? "Não vinculado"
      : proprietarios.length === 1
        ? nomeLocador(proprietarios[0].idLocador)
        : `${nomeLocador(proprietarios[0].idLocador)} +${proprietarios.length - 1}`;

  // Locador do contrato precisa poder ser escolhido entre os proprietários (com nome resolvido)
  const proprietariosParaContrato = proprietarios.map((p) => ({
    id: p.idLocador,
    nome: nomeLocador(p.idLocador),
    percentual: p.percentualParticipacao,
  }));

  // Sempre parte da posse atual e deixa uma linha vazia pronta para o novo locador
  const proprietariosIniciaisModal = [
    ...proprietariosParaEstado(proprietarios).map((p) => ({
      ...p,
      nomeLocador: nomesLocadores[String(p.idLocador)] || "",
    })),
    { idLocador: "", nomeLocador: "", percentualParticipacao: "" },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar
        menuAberto={menuAberto}
        setMenuAberto={setMenuAberto}
        nome={nomeUsuario}
      />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header nome={nomeUsuario} />

        <main className="p-8 max-w-7xl mx-auto w-full flex-1">
          <button
            onClick={() => navigate("/imoveis")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> Voltar para lista
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    {formatarPalavra(imovel.tipologia)} no{" "}
                    {imovel.endereco?.bairro || "Bairro não informado"}
                  </h1>
                  <Badge variant={imovel.status || "DISPONIVEL"}>
                    {formatarPalavra(imovel.status || "Disponível")}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-gray-500 mt-2">
                  <MapPin size={16} />
                  <span>
                    {imovel.endereco?.rua || "Endereço não informado"},{" "}
                    {imovel.endereco?.numero || "S/N"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <Button variant="outline" icon={Calculator} onClick={() => setModalMemoriaAberto(true)}>
                  Gerar Memória de Cálculo
                </Button>
                <Button
                  variant="secondary"
                  icon={Edit}
                  onClick={() => setModalEdicaoAberto(true)}
                >
                  Editar
                </Button>
                <Button variant="primary" icon={Trash2} onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white border-none">Apagar</Button>
                {localStorage.getItem("@gesimo:role") === "ADMIN" && (
                  <Button variant="primary" icon={Trash2} onClick={handleHardDelete} className="bg-red-900 hover:bg-red-950 text-white border-none">Remoção Definitiva</Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-8 pt-6 border-t border-gray-100">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tipo</span>
                  <span className="font-medium text-gray-900">
                    {formatarPalavra(imovel.tipologia)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Metragem</span>
                  <span className="font-medium text-gray-900">
                    {imovel.metragem || "Não informada"}
                  </span>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Locador</span>
                  <span className="font-medium text-gray-900">{resumoLocadores}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Locatário</span>
                  <span className="font-medium text-gray-900">
                    {contratoAtivo ? nomeLocatario(contratoAtivo.idLocatario) : "Não vinculado"}
                  </span>
                </div>
              </div>
              <div className="space-y-3 text-sm bg-gray-50 p-4 rounded-xl">
                <div className="flex justify-between">
                  <span className="text-gray-500">Insc. Bombeiros</span>
                  <span className="font-medium text-gray-900">
                    {imovel.inscricaoBombeiro || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Insc. IPTU</span>
                  <span className="font-medium text-gray-900">
                    {imovel.inscricaoIPTU || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-200 mb-6">
            <nav className="flex gap-8">
              {abas.map((aba) => (
                <button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id)}
                  className={`pb-4 text-sm font-medium transition-colors relative
                    ${abaAtiva === aba.id ? "text-blue-600" : "text-gray-500 hover:text-gray-800"}
                  `}
                >
                  {aba.label}
                  {abaAtiva === aba.id && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* === ABA VISÃO GERAL: posse (locadores) e locatário atual === */}
          {abaAtiva === "visao-geral" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Proprietários (Posse Partilhada)
                  </h2>
                  <Button variant="primary" icon={UserPlus} onClick={() => setModalPosseAberto(true)}>
                    Vincular locador
                  </Button>
                </div>

                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 font-medium">Locador</th>
                      <th className="px-4 py-3 font-medium text-right">Participação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {proprietarios.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-4 text-gray-500 italic">
                          Nenhum locador vinculado a este imóvel.
                        </td>
                      </tr>
                    ) : (
                      proprietarios.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => navigate(`/locadores/${p.idLocador}`)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {nomeLocador(p.idLocador)}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 font-medium">
                            {formatarPercentual(p.percentualParticipacao)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {proprietarios.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total da posse</span>
                    <span
                      className={`font-bold ${
                        totalPosse === 100 ? "text-green-600" : "text-amber-500"
                      }`}
                    >
                      {formatarPercentual(totalPosse)}
                      {totalPosse < 100 && ` · faltam ${formatarPercentual(100 - totalPosse)}`}
                      {totalPosse === 100 && " · completo"}
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Locatário Atual</h2>
                  <span title={motivoSemLocatario}>
                    <Button
                      variant="primary"
                      icon={UserPlus}
                      disabled={Boolean(motivoSemLocatario)}
                      onClick={() => {
                        setContratoEmEdicao(null);
                        setModalContratoAberto(true);
                      }}
                    >
                      Vincular locatário
                    </Button>
                  </span>
                </div>

                {motivoSemLocatario && (
                  <p className="text-xs text-gray-500 mb-4">{motivoSemLocatario}</p>
                )}

                {contratoAtivo ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Locatário</span>
                      <button
                        onClick={() => navigate(`/locatarios/${contratoAtivo.idLocatario}`)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {nomeLocatario(contratoAtivo.idLocatario)}
                      </button>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Locador do contrato</span>
                      <span className="font-medium text-gray-900">
                        {nomeLocador(contratoAtivo.idLocador)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Aluguel</span>
                      <span className="font-medium text-gray-900">
                        {Number(contratoAtivo.valorAluguel).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Vigência</span>
                      <span className="font-medium text-gray-900">
                        {formatarData(contratoAtivo.dataInicio)} até {formatarData(contratoAtivo.dataFim)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Nenhum locatário vinculado no momento.</p>
                )}
              </div>
            </div>
          )}

          {/* Área principal das Abas */}
          {(abaAtiva === "contratos" || abaAtiva === "despesas") && (
            <div className="flex gap-6">
              
              {/* === ABA CONTRATOS === */}
              {abaAtiva === "contratos" && (
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Contratos Ativos
                    </h2>
                    <Button
                      variant="primary"
                      onClick={() => setModalContratoAberto(true)}
                    >
                      + Novo Contrato
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 font-medium">Locador</th>
                          <th className="px-4 py-3 font-medium">Locatário</th>
                          <th className="px-4 py-3 font-medium">Valor Aluguel</th>
                          <th className="px-4 py-3 font-medium">Comissão</th>
                          <th className="px-4 py-3 font-medium">Início</th>
                          <th className="px-4 py-3 font-medium">Fim</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {contratos.length === 0 ? (
                          <tr className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-4 py-4 flex items-center gap-3" colSpan={8}>
                              <FileText size={18} className="text-gray-400" />
                              <span className="font-medium text-gray-500">
                                Nenhum contrato encontrado...
                              </span>
                            </td>
                          </tr>
                        ) : (
                          contratos.map((contrato) => (
                            <tr
                              key={contrato.id}
                              className="hover:bg-gray-50/50 transition-colors group"
                            >
                              <td className="px-4 py-4 text-gray-900">
                                {nomeLocador(contrato.idLocador)}
                              </td>
                              <td className="px-4 py-4 text-gray-900">
                                {nomeLocatario(contrato.idLocatario)}
                              </td>
                              <td className="px-4 py-4 text-gray-900 font-medium">
                                {Number(contrato.valorAluguel).toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </td>
                              <td className="px-4 py-4 text-gray-900">
                                {formatarComissao(contrato.comissao)}
                              </td>
                              <td className="px-4 py-4 text-gray-500">
                                {formatarData(contrato.dataInicio)}
                              </td>
                              <td className="px-4 py-4 text-gray-500">
                                {formatarData(contrato.dataFim)}
                              </td>
                              <td className="px-4 py-4">
                                <Badge variant={contrato.status}>
                                  {formatarPalavra(contrato.status)}
                                </Badge>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <button
                                  onClick={() => abrirEdicaoContrato(contrato)}
                                  className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                                >
                                  Editar
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* === ABA DESPESAS === */}
              {abaAtiva === "despesas" && (
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Histórico de Despesas
                    </h2>
                    <Button
                      variant="primary"
                      onClick={() => setModalDespesaAberto(true)}
                    >
                      + Nova Despesa
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 font-medium">Descrição</th>
                          <th className="px-4 py-3 font-medium">Tipo</th>
                          <th className="px-4 py-3 font-medium">Vencimento</th>
                          <th className="px-4 py-3 font-medium">Valor</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {carregandoDespesas ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                              Carregando despesas...
                            </td>
                          </tr>
                        ) : despesasImovel.length === 0 ? (
                          <tr className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-4 py-4 flex items-center gap-3" colSpan={6}>
                              <FileText size={18} className="text-gray-400" />
                              <span className="font-medium text-gray-500">
                                Nenhuma despesa lançada para este imóvel ainda.
                              </span>
                            </td>
                          </tr>
                        ) : (
                          despesasImovel.map((despesa) => {
                            const quitada = despesa.status === "PAGA" && despesa.comprovantePagamento;
                            return (
                              <tr key={despesa.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-4 py-4 text-gray-900 font-medium">{despesa.descricao}</td>
                                <td className="px-4 py-4 text-gray-500">
                                  {TIPOS_DESPESA.find((t) => t.value === despesa.tipo)?.label || despesa.tipo}
                                </td>
                                <td className="px-4 py-4 text-gray-500">{formatarData(despesa.dataVencimento)}</td>
                                <td className="px-4 py-4 text-gray-900 font-bold">{formatarMoeda(despesa.valor)}</td>
                                <td className="px-4 py-4">
                                  {quitada ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <CheckCircle2 size={12} /> Quitada
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                      <AlertCircle size={12} /> Em Aberto
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-4 text-right">
                                  {!quitada && (
                                    <button
                                      onClick={() => setDespesaEmLiquidacao(despesa)}
                                      className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                                    >
                                      Anexar comprovante
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Upload compartilhado lateral */}
              <div className="w-72 shrink-0">
                <label className="border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors p-8 flex flex-col items-center justify-center text-center cursor-pointer h-full min-h-[300px] w-full block">
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-blue-600 mx-auto">
                    <UploadCloud size={24} />
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Arraste arquivos aqui ou{" "}
                    <span className="text-blue-600">clique para enviar</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, JPG, PNG (máx. 10MB)
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,image/*"
                    multiple
                  />
                </label>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MODAIS */}
      {modalEdicaoAberto && (
        <ModalContainer
          isOpen={modalEdicaoAberto}
          onClose={() => setModalEdicaoAberto(false)}
          title="Editar Imóvel"
        >
          <FormularioEdicaoImovel
            imovel={imovel}
            onClose={() => setModalEdicaoAberto(false)}
            onSuccess={() => {
              setModalEdicaoAberto(false);
              window.location.reload();
            }}
          />
        </ModalContainer>
      )}

      {modalContratoAberto && (
        <ModalContainer
          isOpen={modalContratoAberto}
          onClose={() => {
            setModalContratoAberto(false);
            setContratoEmEdicao(null);
          }}
          title={contratoEmEdicao ? "Editar Contrato" : "Novo Contrato de Locação"}
        >
          <FormularioContrato
            imovelId={imovel.id}
            contrato={contratoEmEdicao}
            proprietarios={proprietariosParaContrato}
            onClose={() => {
              setModalContratoAberto(false);
              setContratoEmEdicao(null);
            }}
            onSuccess={() => {
              setModalContratoAberto(false);
              setContratoEmEdicao(null);
              window.location.reload();
            }}
          />
        </ModalContainer>
      )}

      {modalPosseAberto && (
        <ModalContainer
          isOpen={modalPosseAberto}
          onClose={() => setModalPosseAberto(false)}
          title="Vincular locador ao imóvel"
        >
          <EditorPosseImovel
            imovelId={imovel.id}
            proprietariosIniciais={proprietariosIniciaisModal}
            textoConfirmar="Salvar posse"
            onClose={() => setModalPosseAberto(false)}
            onSuccess={() => {
              setModalPosseAberto(false);
              window.location.reload();
            }}
          />
        </ModalContainer>
      )}

      {modalDespesaAberto && (
        <ModalContainer
          isOpen={modalDespesaAberto}
          onClose={() => setModalDespesaAberto(false)}
          title="Nova Despesa"
        >
          <FormularioDespesa
            imovelId={imovel.id}
            onClose={() => setModalDespesaAberto(false)}
            onSuccess={() => {
              setModalDespesaAberto(false);
              recarregarDespesas();
            }}
          />
        </ModalContainer>
      )}

      {despesaEmLiquidacao && (
        <ModalContainer
          isOpen
          onClose={() => setDespesaEmLiquidacao(null)}
          title="Registrar pagamento da despesa"
        >
          <FormularioLiquidarDespesa
            despesa={despesaEmLiquidacao}
            onClose={() => setDespesaEmLiquidacao(null)}
            onSuccess={() => {
              setDespesaEmLiquidacao(null);
              recarregarDespesas();
            }}
          />
        </ModalContainer>
      )}

      {modalMemoriaAberto && (
        <ModalContainer
          isOpen
          onClose={() => setModalMemoriaAberto(false)}
          title="Gerar Memória de Cálculo"
          largura="max-w-4xl"
        >
          <ModalGerarMemoriaCalculo
            imovelId={imovel.id}
            onClose={() => setModalMemoriaAberto(false)}
            onGerado={recarregarDespesas}
          />
        </ModalContainer>
      )}
    </div>
  );
}