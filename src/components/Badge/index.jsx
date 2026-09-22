// src/components/Badge/index.jsx
import React from "react";

export default function Badge({ variant = "default", children }) {
  // Dicionário de cores usando o Tailwind
  const styles = {
    // Status de Imóveis
    DISPONIVEL: "bg-blue-100 text-blue-700 border-blue-200",
    ALUGADO: "bg-emerald-100 text-emerald-700 border-emerald-200",
    VENDIDO: "bg-gray-100 text-gray-700 border-gray-200",
    INATIVO: "bg-red-100 text-red-700 border-red-200",
    NEGOCIACAO: "bg-orange-100 text-orange-700 border-orange-200",
    
    // Status de Contratos
    ATIVO: "bg-emerald-100 text-emerald-700 border-emerald-200",
    ENCERRADO: "bg-gray-100 text-gray-700 border-gray-200",
    CANCELADO: "bg-red-100 text-red-700 border-red-200",

    // Situação de uma versão da tabela IRRF
    VIGENTE: "bg-emerald-100 text-emerald-700 border-emerald-200",
    FUTURA: "bg-blue-100 text-blue-700 border-blue-200",
    ENCERRADA: "bg-gray-100 text-gray-700 border-gray-200",

    // Status Gerais / Default
    default: "bg-gray-100 text-gray-600 border-gray-200"
  };

  // Seleciona a cor baseada na prop variant, ou usa o default se não achar
  const colorClass = styles[variant] || styles.default;

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
      {children}
    </span>
  );
}