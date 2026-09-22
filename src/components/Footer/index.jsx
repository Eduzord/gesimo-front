// src/components/Footer/index.jsx
import React from 'react';
import { Home } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-12 flex flex-col items-center justify-center gap-2 pb-8">
      <div className="flex items-center gap-2 text-gray-700 font-bold text-xl tracking-tight">
        <Home size={24} className="text-blue-600" />
        <span>GESIMO</span>
      </div>
      <p className="text-xs text-gray-400">© 2026, Eduardo Oliveira</p>
    </footer>
  );
}