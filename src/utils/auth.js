// Lê o corpo (payload) de um JWT. Trata base64url e UTF-8 (nomes com acento, como "João").
export const parseJwt = (token) => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (caractere) => caractere.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (e) {
    return null;
  }
};

// Papel do usuário logado, salvo no login. Serve para esconder telas/botões: a autorização real é feita pelo servidor.
export const getRole = () => localStorage.getItem('@gesimo:role');

export const isAdmin = () => getRole() === 'ADMIN';

// A resposta do login traz só o token; nome e papel do usuário estão dentro dele. Copia esses dados para
// o localStorage (que o restante do front lê). É chamada no login e ao abrir o app, o que também corrige
// sessões antigas que ficaram salvas como "Usuário"/"USER".
export const sincronizarSessao = () => {
  const token = localStorage.getItem('@gesimo:token');
  const dados = token ? parseJwt(token) : null;
  if (!dados) return;

  if (dados.nome) localStorage.setItem('@gesimo:nome', dados.nome);
  if (dados.role) localStorage.setItem('@gesimo:role', dados.role);
};

export const isTokenValid = (token) => {
  if (!token) return false;
  const decoded = parseJwt(token);
  if (!decoded || !decoded.exp) return false;
  return decoded.exp * 1000 > Date.now();
};
