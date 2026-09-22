import React, { useState } from "react";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Button from "../Button";

export default function DataTable({
  colunas,
  dados,
  onSearch,
  placeholderBusca = "Buscar...",
  botaoAcao,
  paginaAtual = 1,
  totalPaginas = 1,
  onPageChange,
  // Total de resultados da busca atual (exibido enquanto há termo digitado)
  totalResultados,
  // Mensagem do estado vazio; a página pode personalizar quando há busca ativa
  mensagemVazia = "Nenhum registro encontrado.",
  // Enquanto uma busca no servidor está em andamento, a tabela fica esmaecida
  carregando = false,
}) {
  const [valorBusca, setValorBusca] = useState("");

  const alterarBusca = (valor) => {
    setValorBusca(valor);
    if (onSearch) onSearch(valor);
  };

  const buscaAtiva = valorBusca.trim() !== "";

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 1. BARRA SUPERIOR: Busca e Botões */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-2">
        {/* Input de Busca com Ícone Embutido */}
        <div className="w-full sm:w-96">
          <div className="relative" role="search">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              inputMode="search"
              autoComplete="off"
              spellCheck={false}
              maxLength={100}
              placeholder={placeholderBusca}
              aria-label={placeholderBusca}
              value={valorBusca}
              onChange={(e) => alterarBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && valorBusca) alterarBusca("");
              }}
              className="w-full pl-10 pr-9 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all placeholder:text-gray-400"
            />
            {valorBusca && (
              <button
                type="button"
                onClick={() => alterarBusca("")}
                aria-label="Limpar busca"
                title="Limpar busca (Esc)"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Anuncia a quantidade de resultados para leitores de tela e para quem digita */}
          <p className="mt-1 h-4 text-xs text-gray-500" role="status" aria-live="polite">
            {buscaAtiva && totalResultados !== undefined && !carregando
              ? `${totalResultados} ${totalResultados === 1 ? "resultado" : "resultados"}`
              : ""}
          </p>
        </div>

        {/* Botão Dinâmico */}
        {botaoAcao && (
          <div className="shrink-0 w-full sm:w-auto">{botaoAcao}</div>
        )}
      </div>

      {/* 2. CORPO DA TABELA */}
      <div
        className={`bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col transition-opacity ${
          carregando ? "opacity-60" : ""
        }`}
        aria-busy={carregando}
      >
        {/* Removemos o overflow-hidden de cima e adicionamos min-h-[300px] aqui embaixo */}
        <div className="overflow-x-visible overflow-y-visible">
          <table className="w-full text-left border-collapse">
            {/* Cabeçalho */}
            <thead>
              <tr className="border-b border-gray-100 bg-white">
                {colunas.map((coluna, index) => (
                  <th
                    key={index}
                    className="py-4 px-6 text-sm font-medium text-gray-500 whitespace-nowrap"
                  >
                    {coluna.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Linhas */}
            <tbody>
              {dados?.map((linha, rowIndex) => (
                <tr
                  key={linha.id ?? rowIndex}
                  className="border-b border-gray-50 hover:bg-slate-50 transition-colors last:border-0"
                >
                  {colunas.map((coluna, colIndex) => (
                    <td
                      key={colIndex}
                      className="py-4 px-6 text-sm text-gray-800 whitespace-nowrap"
                    >
                      {/* O DataTable agora simplesmente renderiza o que a página mandar! */}
                      {linha[coluna.key]}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Estado Vazio */}
              {(!dados || dados.length === 0) && (
                <tr>
                  <td
                    colSpan={colunas.length}
                    className="py-12 text-center text-sm text-gray-400"
                  >
                    {mensagemVazia}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. PAGINAÇÃO DINÂMICA */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="ghost"
            onClick={() => onPageChange(paginaAtual - 1)}
            disabled={paginaAtual === 1}
            className="text-gray-600 font-medium text-sm gap-1 disabled:invisible"
          >
            <ChevronLeft size={16} /> Anterior
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPaginas }, (_, index) => index + 1).map(
              (numeroPagina) => (
                <button
                  key={numeroPagina}
                  onClick={() => onPageChange && onPageChange(numeroPagina)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg border text-sm shadow-sm transition-colors
                  ${
                    paginaAtual === numeroPagina
                      ? "border-gray-200 bg-gray-50 text-gray-800 font-bold"
                      : "border-transparent hover:bg-gray-50 text-gray-600 font-medium"
                  }`}
                >
                  {numeroPagina}
                </button>
              ),
            )}
          </div>

          <Button
            variant="ghost"
            onClick={() => onPageChange(paginaAtual + 1)}
            disabled={paginaAtual === totalPaginas}
            className="text-gray-600 font-medium text-sm gap-1 disabled:invisible"
          >
            Próxima <ChevronRight size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}
