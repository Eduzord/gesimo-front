import { numeroParaCampo, paraNumero } from "./formatacao";

// Lógica pura do formulário de tabela IRRF (sem React), espelhando as regras do backend
// (microsservico-imoveis/src/modules/irrf/calculo/validar-tabela.ts) para o usuário ver os problemas
// antes de enviar. O backend continua sendo quem decide.

export const ROTULOS_SITUACAO = { VIGENTE: "Vigente", FUTURA: "Futura", ENCERRADA: "Encerrada" };

// "01/05/2025 até 31/12/2025" ou "01/05/2025 em diante"
export function descreverVigencia(tabela, formatarData) {
  return tabela.vigenciaFim
    ? `${formatarData(tabela.vigenciaInicio)} até ${formatarData(tabela.vigenciaFim)}`
    : `${formatarData(tabela.vigenciaInicio)} em diante`;
}

export const faixaVazia = () => ({ valorAte: "", aliquota: "", parcelaADeduzir: "" });

export const formVazio = () => ({
  vigenciaInicio: "",
  descricao: "",
  deducaoDependente: "",
  faixas: [faixaVazia(), faixaVazia()],
  usarRedutor: false,
  redutor: { limiteIsencao: "", limiteSuperior: "", constante: "", coeficiente: "" },
});

// Converte uma tabela vinda da API para o estado do formulário.
// "comoNova" limpa vigência e descrição, para criar uma versão nova a partir de outra já cadastrada.
export function tabelaParaForm(tabela, { comoNova = false } = {}) {
  return {
    vigenciaInicio: comoNova ? "" : tabela.vigenciaInicio,
    descricao: comoNova ? "" : tabela.descricao || "",
    deducaoDependente: numeroParaCampo(tabela.deducaoDependente),
    faixas: tabela.faixas.map((f) => ({
      valorAte: numeroParaCampo(f.valorAte),
      aliquota: numeroParaCampo(f.aliquota),
      parcelaADeduzir: numeroParaCampo(f.parcelaADeduzir),
    })),
    usarRedutor: Boolean(tabela.redutor),
    redutor: tabela.redutor
      ? {
          limiteIsencao: numeroParaCampo(tabela.redutor.limiteIsencao),
          limiteSuperior: numeroParaCampo(tabela.redutor.limiteSuperior),
          constante: numeroParaCampo(tabela.redutor.constante),
          coeficiente: numeroParaCampo(tabela.redutor.coeficiente),
        }
      : formVazio().redutor,
  };
}

// Limite inferior ("De") de cada faixa: 0,00 na primeira e "Até" da anterior + 0,01 nas demais.
// Devolve null quando o "Até" anterior ainda não foi preenchido.
export function limiteInferior(faixas, indice) {
  if (indice === 0) return 0;
  const anterior = paraNumero(faixas[indice - 1].valorAte);
  return Number.isFinite(anterior) ? (Math.round(anterior * 100) + 1) / 100 : null;
}

// Frase de apoio: se a primeira faixa tem alíquota 0, informa até quanto vai a isenção
export function resumoIsencao(faixas) {
  const primeira = faixas[0];
  const ate = paraNumero(primeira?.valorAte);
  return paraNumero(primeira?.aliquota) === 0 && Number.isFinite(ate) ? ate : null;
}

// Lista de problemas (vazia = ok), com os mesmos textos do backend
export function validarForm(form) {
  const erros = [];
  const { faixas } = form;

  if (!form.vigenciaInicio) erros.push("Informe a data de início da vigência.");

  const deducao = paraNumero(form.deducaoDependente);
  if (!Number.isFinite(deducao)) erros.push("Informe a dedução por dependente (use 0 se não houver).");
  else if (deducao < 0) erros.push("A dedução por dependente não pode ser negativa.");

  if (faixas.length === 0) {
    erros.push("Informe ao menos uma faixa.");
  }

  let limiteAnterior = -1;
  faixas.forEach((faixa, indice) => {
    const numero = indice + 1;
    const ehUltima = indice === faixas.length - 1;
    const temTeto = String(faixa.valorAte).trim() !== "";
    const ate = paraNumero(faixa.valorAte);
    const aliquota = paraNumero(faixa.aliquota);
    const parcela = paraNumero(faixa.parcelaADeduzir);

    if (!ehUltima && !temTeto) {
      erros.push(`A faixa ${numero} precisa de um limite "Até"; só a última faixa fica sem limite.`);
    }
    if (temTeto && !Number.isFinite(ate)) {
      erros.push(`O limite "Até" da faixa ${numero} não é um número válido.`);
    } else if (temTeto && ate <= 0) {
      erros.push(`O limite "Até" da faixa ${numero} deve ser maior que zero.`);
    } else if (temTeto && limiteAnterior >= 0 && Math.round(ate * 100) <= limiteAnterior) {
      erros.push(`O limite "Até" da faixa ${numero} deve ser maior que o da faixa anterior.`);
    }
    if (!Number.isFinite(aliquota) || aliquota < 0 || aliquota > 100) {
      erros.push(`A alíquota da faixa ${numero} deve estar entre 0% e 100%.`);
    }
    if (!Number.isFinite(parcela) || parcela < 0) {
      erros.push(`A parcela a deduzir da faixa ${numero} deve ser um valor maior ou igual a zero.`);
    }

    if (temTeto && Number.isFinite(ate)) limiteAnterior = Math.round(ate * 100);
  });

  if (form.usarRedutor) {
    const { limiteIsencao, limiteSuperior, constante, coeficiente } = form.redutor;
    const valores = [limiteIsencao, limiteSuperior, constante, coeficiente].map(paraNumero);

    if (valores.some((v) => !Number.isFinite(v) || v < 0)) {
      erros.push("Preencha os quatro campos do redutor com números maiores ou iguais a zero.");
    } else if (valores[1] <= valores[0]) {
      erros.push("No redutor, o limite superior deve ser maior que o limite de isenção total.");
    }
  }

  return erros;
}

// Estado do formulário -> corpo aceito pela API
export function formParaPayload(form) {
  return {
    vigenciaInicio: form.vigenciaInicio,
    descricao: form.descricao.trim() || undefined,
    deducaoDependente: paraNumero(form.deducaoDependente),
    faixas: form.faixas.map((f, indice) => ({
      // a última faixa não tem limite, mesmo que o campo tenha ficado preenchido
      valorAte: indice === form.faixas.length - 1 || String(f.valorAte).trim() === "" ? null : paraNumero(f.valorAte),
      aliquota: paraNumero(f.aliquota),
      parcelaADeduzir: paraNumero(f.parcelaADeduzir),
    })),
    redutor: form.usarRedutor
      ? {
          limiteIsencao: paraNumero(form.redutor.limiteIsencao),
          limiteSuperior: paraNumero(form.redutor.limiteSuperior),
          constante: paraNumero(form.redutor.constante),
          coeficiente: paraNumero(form.redutor.coeficiente),
        }
      : null,
  };
}
