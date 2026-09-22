// src/components/ModalContainer/index.jsx
import React from 'react';
import { X } from 'lucide-react';

// "largura" recebe uma classe de largura máxima do Tailwind (ex.: "max-w-4xl") para formulários mais largos
export default function ModalContainer({ isOpen, onClose, title, children, largura = 'max-w-2xl' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${largura} overflow-hidden flex flex-col max-h-[90vh]`}>
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo dinâmico (O formulário específico entra aqui) */}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}