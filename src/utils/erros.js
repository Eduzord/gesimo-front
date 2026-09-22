// Extrai a mensagem devolvida pelo backend (400 de validação, 404, 409...). O NestJS manda "message" como
// texto ou como lista de textos; a lista vira um texto com uma mensagem por linha.
export function mensagemDeErro(erro, padrao) {
  const mensagem = erro?.response?.data?.message;
  if (Array.isArray(mensagem)) return mensagem.join("\n");
  return mensagem || padrao;
}
