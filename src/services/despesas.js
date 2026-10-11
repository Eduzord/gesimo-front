import { api } from "./api";

const corpo = (resposta) => resposta.data?.data ?? resposta.data;

// Lança o valor total já dividido em parcelas (ex.: IPTU em 10x). Cada parcela volta como uma
// despesa EM_ABERTO independente, com seu próprio vencimento — pronta para a aba "Despesas" do
// imóvel e para a Memória de Cálculo do mês em que vencer.
export const criarDespesaParcelada = async (payload) => corpo(await api.post("/imoveis/despesas/parceladas", payload));
