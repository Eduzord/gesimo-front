import { api } from "../services/api";

// Locador PF tem "nome"; PJ tem "razaoSocial" (e nome nulo)
export function nomeDoLocador(locador) {
  return locador?.nome || locador?.razaoSocial || "";
}

// No locatário o nome fica aninhado em pessoaFisica / pessoaJuridica
export function nomeDoLocatario(locatario) {
  return (
    locatario?.pessoaFisica?.nome ||
    locatario?.pessoaJuridica?.razaoSocial ||
    locatario?.nome ||
    locatario?.razaoSocial ||
    ""
  );
}

export function formatarPercentual(valor) {
  const numero = Number(valor);
  return `${(Number.isFinite(numero) ? numero : 0).toFixed(2).replace(".", ",")}%`;
}

// Soma os percentuais de propriedadeimovel (vindo da API), arredondando a 2 casas
export function somaPosse(propriedadeimovel = []) {
  const soma = propriedadeimovel.reduce((total, p) => total + (Number(p.percentualParticipacao) || 0), 0);
  return Math.round(soma * 100) / 100;
}

export function enderecoDoImovel(imovel) {
  const e = imovel?.endereco;
  if (!e) return `Imóvel #${imovel?.id ?? ""}`;
  return `${e.rua || "Endereço não informado"}, ${e.numero || "S/N"}${e.bairro ? ` - ${e.bairro}` : ""}`;
}

// Converte propriedadeimovel (API) para o formato usado pelo SeletorProprietarios
export function proprietariosParaEstado(propriedadeimovel = []) {
  return propriedadeimovel.map((p) => ({
    idLocador: String(p.idLocador),
    nomeLocador: "",
    percentualParticipacao: String(p.percentualParticipacao),
  }));
}

// Lista completa de proprietários que o backend espera no PATCH /imoveis/:id (substitui todos os vínculos)
export async function salvarProprietarios(imovelId, proprietarios) {
  await api.patch(`/imoveis/${imovelId}`, {
    proprietarios: proprietarios.map((p) => ({
      idLocador: Number(p.idLocador),
      percentualParticipacao: Number(String(p.percentualParticipacao).replace(",", ".")),
    })),
  });
}

// Mantido aqui para os imports existentes; a implementação agora é compartilhada em utils/erros.js
export { mensagemDeErro } from "./erros";
