import { api } from "./api";

const corpo = (resposta) => resposta.data?.data ?? resposta.data;

// Dados para montar o modal: contrato ativo, proprietários, despesas em aberto e a memória do mês (se já existir)
export const prepararMemoriaCalculo = async (idImovel, competencia) =>
  corpo(await api.get(`/imoveis/memoria-calculo/imovel/${idImovel}/preparacao`, { params: { competencia } }));

export const listarMemoriasCalculo = async (idImovel) =>
  corpo(await api.get(`/imoveis/memoria-calculo/imovel/${idImovel}/historico`));

export const gerarMemoriaCalculo = async (payload) => corpo(await api.post("/imoveis/memoria-calculo", payload));

export const buscarMemoriaCalculo = async (id) => corpo(await api.get(`/imoveis/memoria-calculo/${id}`));

// Baixa o Excel e devolve o Blob pronto para o navegador salvar.
// O "filename*" (RFC 5987, UTF-8) tem prioridade sobre o "filename" plain para preservar acentos/espaços
// (ex.: "Memória Cálculo Julho 2026.xlsx"); o plain é só um fallback ASCII.
export const baixarMemoriaCalculoExcel = async (id) => {
  const resposta = await api.get(`/imoveis/memoria-calculo/${id}/excel`, { responseType: "blob" });
  const disposicao = resposta.headers["content-disposition"] || "";
  const nomeUtf8 = disposicao.match(/filename\*=UTF-8''([^;]+)/)?.[1];
  const nomeArquivo = nomeUtf8
    ? decodeURIComponent(nomeUtf8)
    : disposicao.match(/filename="(.+)"/)?.[1] || `memoria-calculo-${id}.xlsx`;
  return { blob: resposta.data, nomeArquivo };
};

export const listarDespesasDoImovel = async (idImovel, emAberto) =>
  corpo(await api.get(`/imoveis/despesas/imovel/${idImovel}`, { params: emAberto ? { emAberto: true } : {} }));

export const aplicarReajusteContrato = async (idContrato, dados) =>
  corpo(await api.patch(`/imoveis/contratos/${idContrato}/reajuste`, dados));

export const listarReajustesContrato = async (idContrato) =>
  corpo(await api.get(`/imoveis/contratos/${idContrato}/reajustes`));
