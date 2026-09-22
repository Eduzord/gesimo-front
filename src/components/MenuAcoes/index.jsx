import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

export default function MenuAcoes({ opcoes }) {
  const [aberto, setAberto] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickFora(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  // Opções marcadas com "atalho: true" também aparecem como botão de ícone ao lado do menu,
  // chamando exatamente o mesmo onClick da opção
  const atalhos = opcoes.filter((opcao) => opcao.atalho && opcao.icon);

  return (
    // 'relative' é essencial aqui para o posicionamento do menu
    <div className="relative inline-flex items-center gap-1" ref={menuRef}>
      {atalhos.map((opcao) => (
        <button
          key={opcao.label}
          type="button"
          onClick={opcao.onClick}
          title={opcao.label}
          aria-label={opcao.label}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <opcao.icon size={18} />
        </button>
      ))}

      <button
        onClick={() => setAberto(!aberto)}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
      >
        <MoreVertical size={18} />
      </button>

      {aberto && (
        // A chave aqui é z-[100] e overflow-visible no pai da tabela
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl ring-1 ring-black ring-opacity-10 z-[100] py-1 border border-gray-100">
          {opcoes.map((opcao, index) => (
            <button
              key={index}
              onClick={() => {
                opcao.onClick();
                setAberto(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2
                ${opcao.danger 
                  ? 'text-red-600 hover:bg-red-50 font-medium' 
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              {opcao.icon && <opcao.icon size={16} />}
              {opcao.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}