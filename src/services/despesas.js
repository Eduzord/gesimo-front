import { api } from "./api";

const corpo = (resposta) => resposta.data?.data ?? resposta.data;

// Lança um conjunto de parcelas já definidas (ex.: IPTU em 10x). Cada parcela volta como uma
// despesa EM_ABERTO independente, com seu próprio vencimento — pronta para a aba "Despesas" do
// imóvel e para a Memória de Cálculo do mês em que vencer.
export const criarDespesaParcelada = async (payload) => corpo(await api.post("/imoveis/despesas/parceladas", payload));

// Cancela e remove uma despesa em aberto. O backend bloqueia (400) a exclusão de uma despesa já PAGA
// — o caixa já foi movimentado — então isso só deve ser oferecido ao usuário para despesas EM_ABERTO.
export const excluirDespesa = async (id) => corpo(await api.delete(`/imoveis/despesas/${id}`));
