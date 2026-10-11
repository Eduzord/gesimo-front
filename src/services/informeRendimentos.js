import { api } from "./api";

const corpo = (resposta) => resposta.data?.data ?? resposta.data;

// Prévia (JSON) do Informe de Rendimentos: os 12 meses do ano + totais, a partir das Memórias de
// Cálculo já geradas para esse locador, nesse imóvel. Usada para descobrir o contrato/locatário
// "representativo" do ano antes de pedir o PDF (ver ModalGerarInformeRendimentos).
export const prepararInformeRendimentos = async ({ idImovel, idLocador, ano }) =>
  corpo(await api.get("/imoveis/informe-rendimentos", { params: { idImovel, idLocador, ano } }));

// Baixa o PDF. Nome/documento de locador, locatário e administradora são resolvidos no FRONT (vêm de
// outros microsserviços) e enviados como query params — o backend só os usa para exibição/impressão,
// igual à Memória de Cálculo.
export const baixarInformeRendimentosPdf = async (params) => {
  const resposta = await api.get("/imoveis/informe-rendimentos/pdf", { params, responseType: "blob" });
  const disposicao = resposta.headers["content-disposition"] || "";
  const nomeUtf8 = disposicao.match(/filename\*=UTF-8''([^;]+)/)?.[1];
  const nomeArquivo = nomeUtf8
    ? decodeURIComponent(nomeUtf8)
    : disposicao.match(/filename="(.+)"/)?.[1] || "informe-de-rendimentos.pdf";
  return { blob: resposta.data, nomeArquivo };
};
