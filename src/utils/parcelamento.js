// Mesma lógica de divisão usada no backend (microsservico-imoveis/.../despesas/calculo/dividir-parcelas.ts),
// reaproveitada aqui só para a PRÉVIA que o usuário vê antes de confirmar o lançamento — quem de fato
// grava os valores é sempre a API; esta função nunca é usada para decidir o que vai para o banco.

export const NUMERO_MINIMO_PARCELAS = 2;
export const NUMERO_MAXIMO_PARCELAS = 60;

/**
 * Divide um valor total em parcelas mensais de valor igual, com o vencimento de cada uma um mês
 * após a anterior. A sobra da divisão em centavos vai para a ÚLTIMA parcela (a soma de todas bate
 * exatamente com o valor total), e o dia do vencimento é ajustado para o último dia do mês quando
 * o original não existir nele (ex.: dia 31 caindo em fevereiro).
 */
export function dividirEmParcelas(valorTotal, numeroParcelas, dataPrimeiraParcela) {
  const totalEmCentavos = Math.round(valorTotal * 100);
  const valorBaseEmCentavos = Math.floor(totalEmCentavos / numeroParcelas);
  const sobraEmCentavos = totalEmCentavos - valorBaseEmCentavos * numeroParcelas;

  return Array.from({ length: numeroParcelas }, (_, indice) => {
    const numero = indice + 1;
    const ehUltimaParcela = numero === numeroParcelas;
    const valorEmCentavos = ehUltimaParcela ? valorBaseEmCentavos + sobraEmCentavos : valorBaseEmCentavos;

    return {
      numero,
      valor: valorEmCentavos / 100,
      dataVencimento: somarMeses(dataPrimeiraParcela, indice),
    };
  });
}

function somarMeses(dataISO, quantidadeDeMeses) {
  // "dataISO" é uma string "AAAA-MM-DD" (o que o <input type="date"> devolve) — montamos a data em UTC
  // para não sofrer com o fuso horário do navegador, mesma convenção do restante do projeto.
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  const mesDestino = mes - 1 + quantidadeDeMeses;

  const ultimoDiaDoMesDestino = new Date(Date.UTC(ano, mesDestino + 1, 0)).getUTCDate();
  const diaAjustado = Math.min(dia, ultimoDiaDoMesDestino);

  return new Date(Date.UTC(ano, mesDestino, diaAjustado));
}

export function formatarDataISO(data) {
  return data.toISOString().slice(0, 10);
}
