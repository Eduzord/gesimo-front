// src/pages/Login/index.jsx
import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom"; // Ferramenta para mudar de página
import { Eye, EyeOff } from "lucide-react"; // Ícones minimalistas para a senha
import { api } from "../../services/api";
import { sincronizarSessao } from "../../utils/auth";
import estilos from "./login.module.css";
import logo from "../../assets/logo.png";

export default function Login() {
  const navegar = useNavigate();
  const location = useLocation();

  // Estados do formulário
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(location.state?.mensagem || "");
  const [carregando, setCarregando] = useState(false);

  // Estado para controlar se a senha está visível ou oculta
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Função disparada ao clicar no botão Entrar
  const realizarLogin = async (evento) => {
    evento.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      // Faz a chamada real para o Gateway rodando na porta 4000
      // Nota para a equipe: O backend do Eduardo precisa estar rodando para isso funcionar!
      const resposta = await api.post("/auth/login", {
        email: email,
        senha: senha,
      });

      console.log("DADOS RECEBIDOS DO BACKEND:", resposta.data);
      // Extrai o token gerado pelo backend do Eduardo
      const token = resposta.data.token || resposta.data.accessToken || resposta.data.access_token;

      if (token) {
        // Salva o token no navegador para manter o usuário logado
        localStorage.setItem("@gesimo:token", token);

        // NOVO: Tentamos pegar o nome do usuário do payload do backend. 
        const nomeUsuario = resposta.data.user?.nome || resposta.data.nome || 'Usuário';
        const roleUsuario = resposta.data.user?.role || resposta.data.role || 'USER';
        
        localStorage.setItem('@gesimo:nome', nomeUsuario);
        localStorage.setItem('@gesimo:role', roleUsuario);

        // O login só devolve o token: nome e papel reais vêm do payload do JWT e prevalecem sobre os padrões acima
        sincronizarSessao();

        // Autoriza e redireciona para o Dashboard
        navegar("/dashboard");
      } else {
        setErro("Token não retornado pelo servidor.");
      }
    } catch (error) {
      console.error("Erro no login:", error);
      // Tratamento de erro elegante para o usuário
      if (error.response && error.response.status === 401) {
        setErro("E-mail ou senha incorretos. Tente novamente.");
      } else {
        setErro(
          "Erro ao conectar com o servidor. Verifique se o back-end está rodando.",
        );
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-white">
      {/* Coluna Esquerda: Imagem */}
      <div className={`w-1/2 h-full ${estilos.fundoImagem}`}></div>

      {/* Coluna Direita: Formulário */}
      <div className="w-1/2 h-full flex flex-col justify-center items-center">
        <div className="w-full max-w-md px-8">
          <div className="flex flex-col items-center mb-10">
            <img src={logo} alt="Logo Gesimo" className="w-32 mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Bem-vindo de volta
            </h1>
            <p className="text-gray-500">Faça login para continuar</p>
          </div>

          <form onSubmit={realizarLogin} className="flex flex-col gap-5">
            {/* Input E-mail */}
            <div className="flex flex-col">
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-900 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="admin@gesimo.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="px-4 py-3 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>

            {/* Input Senha com o Ícone (Olhinho) */}
            <div className="flex flex-col relative">
              <label
                htmlFor="senha"
                className="text-sm font-medium text-gray-900 mb-1"
              >
                Senha<span className="text-red-500">*</span>
              </label>

              <div className="relative flex items-center">
                <input
                  id="senha"
                  // Alterna o tipo do input baseado no estado
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all pr-12"
                />
                {/* Botão de revelar a senha posicionado de forma absoluta dentro do input */}
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Opções extras */}
            <div className="flex justify-between items-center mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-600"
                />
                <span className="text-sm text-gray-700">
                  Manter-se conectado
                </span>
              </label>
              <button
                type="button"
                className="text-sm text-blue-600 hover:underline"
              >
                Esqueceu sua senha?
              </button>
            </div>

            {/* Mensagem de Erro Dinâmica */}
            {erro && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-200 text-center">
                {erro}
              </div>
            )}

            {/* Botão de Submit */}
            <button
              type="submit"
              disabled={carregando}
              className={`w-full bg-blue-600 text-white font-medium py-3 rounded-md hover:bg-blue-700 disabled:bg-blue-400 ${estilos.botaoEntrar}`}
            >
              {carregando ? "Validando..." : "Entrar"}
            </button>

            {/* Link para Cadastro */}
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Ainda não tem uma conta?{" "}
                <Link to="/cadastro" className="text-blue-600 font-medium hover:underline">
                  Cadastre-se
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
