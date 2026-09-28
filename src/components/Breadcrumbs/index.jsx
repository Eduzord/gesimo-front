import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

// Trilha de navegação para as sub-páginas do sistema. "itens" é um array de
// { label, path? }: o último item é a página atual (sem link); os anteriores
// que tiverem "path" viram links clicáveis. O primeiro item normalmente é o
// Dashboard — use a constante ITEM_DASHBOARD de "utils/breadcrumbs" para não repetir o texto/rota.
//
// Existe principalmente para deixar claro, de relance, o que se está vendo — por
// exemplo, se a pessoa aberta é um Locador ou um Locatário ("Locadores > Ana Souza"
// vs. "Locatários > Ana Souza"), já que as duas telas de detalhe são bem parecidas.
export default function Breadcrumbs({ itens = [] }) {
  if (itens.length === 0) return null;

  return (
    <nav aria-label="Trilha de navegação" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
        {itens.map((item, indice) => {
          const ultimo = indice === itens.length - 1;
          return (
            <li key={`${item.label}-${indice}`} className="flex items-center gap-1.5">
              {indice > 0 && <ChevronRight size={14} className="text-gray-300 shrink-0" aria-hidden="true" />}
              {!ultimo && item.path ? (
                <Link
                  to={item.path}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  {indice === 0 && <Home size={13} className="shrink-0" />}
                  {item.label}
                </Link>
              ) : (
                <span
                  className={ultimo ? "font-medium text-gray-700" : "flex items-center gap-1"}
                  aria-current={ultimo ? "page" : undefined}
                >
                  {indice === 0 && <Home size={13} className="shrink-0" />}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
