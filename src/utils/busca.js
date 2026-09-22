// Remove acentos e caixa para comparar textos ("João" casa com "joao")
export function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function somenteDigitos(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

// Verifica se um item casa com o termo digitado:
// - ignora maiúsculas/minúsculas e acentos;
// - várias palavras são combinadas com "E" (cada uma precisa aparecer em algum campo, em qualquer ordem);
// - um termo que parece documento/CEP ("123.456", "12.345/0001") também é comparado só pelos dígitos,
//   então funciona com ou sem pontuação.
export function correspondeABusca(termo, campos) {
  const palavras = normalizarTexto(termo).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return true;

  const textos = campos.filter((c) => c !== null && c !== undefined && c !== "").map(normalizarTexto);
  const textoCompleto = textos.join(" ");

  return palavras.every((palavra) => {
    if (textoCompleto.includes(palavra)) return true;

    const digitos = somenteDigitos(palavra);
    const pareceNumero = digitos.length > 0 && /^[\d.\-/]+$/.test(palavra);
    return pareceNumero && textos.some((texto) => somenteDigitos(texto).includes(digitos));
  });
}
