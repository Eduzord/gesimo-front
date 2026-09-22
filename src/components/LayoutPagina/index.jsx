import { useEffect, useState } from "react";
import Sidebar from "../Sidebar";
import Header from "../Header";
import Footer from "../Footer";

// Casca padrão das páginas: Sidebar (com o estado do menu lembrado), Header, título e Footer.
// As páginas mais antigas repetem esse bloco por conta própria; as novas usam este componente.
export default function LayoutPagina({ titulo, descricao, children }) {
  const [menuAberto, setMenuAberto] = useState(() => {
    const preferenciaSalva = localStorage.getItem("@gesimo:menuAberto");
    return preferenciaSalva !== null ? JSON.parse(preferenciaSalva) : true;
  });
  const nome = localStorage.getItem("@gesimo:nome") || "Usuário";

  useEffect(() => {
    localStorage.setItem("@gesimo:menuAberto", JSON.stringify(menuAberto));
  }, [menuAberto]);

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} nome={nome} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header nome={nome} />

        <main className="p-8 max-w-7xl mx-auto w-full flex-1 flex flex-col">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">{titulo}</h1>
            {descricao && <p className="text-gray-500 text-sm">{descricao}</p>}
          </div>

          {children}

          <div className="flex-1"></div>
          <Footer />
        </main>
      </div>
    </div>
  );
}
