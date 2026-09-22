import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import LayoutPagina from "../../components/LayoutPagina";
import Button from "../../components/Button";
import TabelaIrrfCard from "../../components/Irrf/TabelaIrrfCard";
import useTabelasIrrf from "../../hooks/useTabelasIrrf";
import { isAdmin } from "../../utils/auth";
import { formatarData } from "../../utils/formatacao";
import { ROTULOS_SITUACAO, descreverVigencia } from "../../utils/irrf";

// Consulta das tabelas IRRF cadastradas (somente leitura, para todos os usuários).
// Abre na tabela vigente hoje; as demais versões (anteriores e futuras) ficam no seletor.
export default function Irrf() {
  const navigate = useNavigate();
  const { tabelas, carregando, erro } = useTabelasIrrf();
  const [escolhidaId, setEscolhidaId] = useState(null);

  const vigente = tabelas.find((t) => t.situacao === "VIGENTE") ?? null;
  const selecionada = tabelas.find((t) => t.id === escolhidaId) ?? vigente;
  const admin = isAdmin();

  const irParaGerenciar = admin ? (
    <Button variant="outline" icon={Settings} onClick={() => navigate("/irrf/gerenciar")}>
      Gerenciar tabelas
    </Button>
  ) : null;

  return (
    <LayoutPagina
      titulo="Tabelas IRRF"
      descricao="Tabela progressiva do Imposto de Renda Retido na Fonte usada nos cálculos do sistema."
    >
      {carregando && <p className="text-gray-500">Carregando tabelas...</p>}

      {!carregando && erro && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {erro}
        </div>
      )}

      {!carregando && !erro && tabelas.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-gray-900 font-medium mb-1">Nenhuma tabela IRRF cadastrada.</p>
          <p className="text-sm text-gray-500 mb-4">
            {admin
              ? "Cadastre a primeira tabela para que os cálculos de IRRF possam ser feitos."
              : "Peça a um administrador para cadastrar a tabela vigente."}
          </p>
          {irParaGerenciar}
        </div>
      )}

      {!carregando && !erro && tabelas.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="w-full sm:w-96">
              <label htmlFor="irrf-versao" className="block text-sm text-gray-700 mb-1">
                Versão da tabela
              </label>
              <select
                id="irrf-versao"
                value={selecionada?.id ?? ""}
                onChange={(e) => setEscolhidaId(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {!selecionada && <option value="">Selecione uma versão...</option>}
                {tabelas.map((tabela) => (
                  <option key={tabela.id} value={tabela.id}>
                    {descreverVigencia(tabela, formatarData)} · {ROTULOS_SITUACAO[tabela.situacao]}
                    {tabela.situacao === "VIGENTE" ? " (atual)" : ""}
                  </option>
                ))}
              </select>
            </div>
            {irParaGerenciar}
          </div>

          {!vigente && (
            <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">Não há tabela vigente para hoje.</p>
              <p>
                {admin
                  ? "Cadastre uma nova tabela em Gerenciar tabelas. Enquanto isso, o cálculo de IRRF será recusado."
                  : "Avise um administrador: enquanto não houver tabela vigente, o cálculo de IRRF será recusado."}
              </p>
            </div>
          )}

          {selecionada ? (
            <TabelaIrrfCard tabela={selecionada} />
          ) : (
            <p className="text-sm text-gray-500">Escolha uma versão para ver as faixas.</p>
          )}
        </div>
      )}
    </LayoutPagina>
  );
}
