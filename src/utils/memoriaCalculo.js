import { paraNumero } from "./formatacao";

// Lógica pura do modal de geração da Memória de Cálculo (sem React), para poder validar sem montar a UI.

// "2026-07" (o que o <input type="month"> usa) <-> "2026-07-01" (o que a API espera)
export const mesAtual = () => new Date().toISOString().slice(0, 7);
export const competenciaParaData = (anoMes) => `${anoMes}-01`;
export const dataParaCompetencia = (data) => String(data ?? "").slice(0, 7);

// O contrato está no mês do seu aniversário de reajuste?
export function estaNoMesDeReajuste(dataReajusteContrato, anoMes) {
  return Boolean(dataReajusteContrato) && dataParaCompetencia(dataReajusteContrato) === anoMes;
}

export const TIPOS_DESPESA = [
  { value: "ALUGUEL", label: "Aluguel" },
  { value: "CONDOMINIO", label: "Condomínio" },
  { value: "IPTU", label: "IPTU" },
  { value: "TAXA_BOMBEIRO", label: "Taxa de Bombeiro (Tx. Incêndio)" },
  { value: "SEGURO_INCENDIO", label: "Seguro Incêndio" },
  { value: "MANUTENCAO", label: "Manutenção" },
  { value: "OUTRA", label: "Outra" },
];

export const novaDespesaExtraVazia = () => ({
  tipo: "IPTU",
  descricao: "",
  valor: "",
  dataVencimento: "",
  aplicacao: "RATEIO",
  idLocadorEspecifico: "",
});

export const novoAjusteManualVazio = () => ({
  idLocador: "",
  tipo: "DESCONTO",
  descricao: "",
  valor: "",
});

// Estado inicial do modal a partir do que /preparacao devolveu
export function estadoInicial(preparacao) {
  return {
    proprietariosExtra: Object.fromEntries(
      (preparacao?.proprietarios ?? []).map((p) => [String(p.idLocador), { numeroDependentes: "0" }]),
    ),
    despesasSelecionadas: {},
    despesasNovas: [],
    ajustesManuais: [],
    idContaBancaria: "",
    reajuste: null, // preenchido só depois de aplicar um reajuste (ver FormularioAplicarReajuste)
  };
}

function validarDespesaNova(despesa, indice) {
  const erros = [];
  if (!despesa.descricao.trim()) erros.push(`Descrição da despesa extra ${indice + 1} é obrigatória.`);
  if (!Number.isFinite(paraNumero(despesa.valor)) || paraNumero(despesa.valor) <= 0) {
    erros.push(`Valor da despesa extra ${indice + 1} deve ser maior que zero.`);
  }
  if (!despesa.dataVencimento) erros.push(`Vencimento da despesa extra ${indice + 1} é obrigatório.`);
  if (despesa.aplicacao === "LOCADOR_ESPECIFICO" && !despesa.idLocadorEspecifico) {
    erros.push(`Escolha o proprietário que recebe o reembolso da despesa extra ${indice + 1}.`);
  }
  return erros;
}

function validarAjuste(ajuste, indice) {
  const erros = [];
  if (!ajuste.idLocador) erros.push(`Escolha o proprietário do ajuste ${indice + 1}.`);
  if (!ajuste.descricao.trim()) erros.push(`Descrição do ajuste ${indice + 1} é obrigatória.`);
  if (!Number.isFinite(paraNumero(ajuste.valor)) || paraNumero(ajuste.valor) <= 0) {
    erros.push(`Valor do ajuste ${indice + 1} deve ser maior que zero.`);
  }
  return erros;
}

export function validarModal(estado) {
  const erros = [];

  estado.despesasNovas.forEach((d, i) => erros.push(...validarDespesaNova(d, i)));
  estado.ajustesManuais.forEach((a, i) => erros.push(...validarAjuste(a, i)));

  return erros;
}

// Estado do modal -> corpo esperado por POST /imoveis/memoria-calculo
export function montarPayload({ idImovel, anoMes, proprietariosComNome, estado }) {
  const despesasExtras = [
    ...Object.entries(estado.despesasSelecionadas).map(([idDespesa, sel]) => ({
      origem: "EXISTENTE",
      idDespesa: Number(idDespesa),
      aplicacao: sel.aplicacao,
      ...(sel.aplicacao === "LOCADOR_ESPECIFICO" && { idLocadorEspecifico: Number(sel.idLocadorEspecifico) }),
    })),
    ...estado.despesasNovas.map((d) => ({
      origem: "NOVA",
      tipo: d.tipo,
      descricao: d.descricao.trim(),
      valor: paraNumero(d.valor),
      dataVencimento: d.dataVencimento,
      aplicacao: d.aplicacao,
      ...(d.aplicacao === "LOCADOR_ESPECIFICO" && { idLocadorEspecifico: Number(d.idLocadorEspecifico) }),
    })),
  ];

  const ajustesManuais = estado.ajustesManuais.map((a) => ({
    idLocador: Number(a.idLocador),
    tipo: a.tipo,
    descricao: a.descricao.trim(),
    valor: paraNumero(a.valor),
  }));

  return {
    idImovel: Number(idImovel),
    competencia: competenciaParaData(anoMes),
    proprietarios: proprietariosComNome.map((p) => ({
      idLocador: Number(p.idLocador),
      nome: p.nome,
      documento: p.documento || undefined,
      numeroDependentes: Number(estado.proprietariosExtra[String(p.idLocador)]?.numeroDependentes || 0),
    })),
    ...(despesasExtras.length > 0 && { despesasExtras }),
    ...(ajustesManuais.length > 0 && { ajustesManuais }),
    ...(estado.idContaBancaria && { contaBancaria: estado.contaBancariaEscolhida }),
    ...(estado.reajuste && { reajuste: estado.reajuste }),
  };
}
