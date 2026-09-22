import { api } from "./api";

// Acesso à API das tabelas IRRF (via gateway). O token é anexado pelo interceptor de api.js.
const corpo = (resposta) => resposta.data?.data ?? resposta.data;

// Versões da tabela, da mais recente para a mais antiga, cada uma com situação (VIGENTE/FUTURA/ENCERRADA)
export const listarTabelasIrrf = async () => corpo(await api.get("/irrf/tabelas"));

export const criarTabelaIrrf = async (dados) => corpo(await api.post("/irrf/tabelas", dados));

export const atualizarTabelaIrrf = async (id, dados) => corpo(await api.patch(`/irrf/tabelas/${id}`, dados));

export const excluirTabelaIrrf = async (id) => corpo(await api.delete(`/irrf/tabelas/${id}`));
