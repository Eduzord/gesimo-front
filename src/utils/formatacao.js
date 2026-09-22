// Formatação e leitura de valores no padrão brasileiro. Funções puras, sem dependência de React.

// "1234.5" -> "R$ 1.234,50"
export function formatarMoeda(valor) {
  const numero = Number(valor);
  return (Number.isFinite(numero) ? numero : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Datas de calendário chegam como "AAAA-MM-DD". Formata sem passar por Date, que aplicaria o fuso
// e poderia mostrar o dia anterior.
export function formatarData(iso) {
  if (!iso) return "-";
  const [ano, mes, dia] = String(iso).slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

// "12,5" ou "12.5" -> 12.5. Texto vazio ou inválido -> NaN.
export function paraNumero(texto) {
  const limpo = String(texto ?? "").trim().replace(",", ".");
  return limpo === "" ? NaN : Number(limpo);
}

// 12.5 -> "12,5" (para preencher campos de texto)
export function numeroParaCampo(numero) {
  return numero === null || numero === undefined ? "" : String(numero).replace(".", ",");
}

// Número com até 6 casas, sem zeros à direita ("0,2" em vez de "0,200000")
export function formatarDecimal(valor, casas = 6) {
  return Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: casas });
}
