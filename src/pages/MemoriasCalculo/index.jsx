import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, FileSpreadsheet } from "lucide-react";
import LayoutPagina from "../../components/LayoutPagina";
import { ITEM_DASHBOARD } from "../../utils/breadcrumbs";
import Badge from "../../components/Badge";
import { api } from "../../services/api";
import { listarTodasMemoriasCalculo, baixarMemoriaCalculoExcel } from "../../services/memoriaCalculo";
import { baixarBlob } from "../../utils/download";
import { formatarMoeda } from "../../utils/formatacao";
import { mensagemDeErro } from "../../utils/erros";
import { mesAtual, competenciaParaData } from "../../utils/memoriaCalculo";

const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const competenciaPorExtenso = (competencia) => {
  const [ano, mes] = competencia.split("-").map(Number);
  return `${NOMES_MESES[mes - 1]} de ${ano}`;
};

const dataHoraDeGeracao = (criadoEm) =>
  new Date(criadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Consulta geral de todas as Memórias de Cálculo já geradas (qualquer imóvel) — abre por padrão
// mostrando só o mês vigente, com a opção de ver meses anteriores (histórico) ou filtrar por imóvel.
export default function MemoriasCalculo() {
  const [mes, setMes] = useState(mesAtual());
  const [verTodosOsMeses, setVerTodosOsMeses] = useState(false);
  const [idImovel, setIdImovel] = useState("");
  const [imoveis, setImoveis] = useState([]);

  const [memorias, setMemorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [baixandoId, setBaixandoId] = useState(null);

  useEffect(() => {
    api
      .get("/imoveis")
      .then((resposta) => setImoveis(resposta.data?.data ?? resposta.data ?? []))
      .catch((e) => console.error("Erro ao carregar imóveis para o filtro:", e));
  }, []);

  useEffect(() => {
    setCarregando(true);
    setErro(null);
    listarTodasMemoriasCalculo({
      ...(!verTodosOsMeses && { competencia: competenciaParaData(mes) }),
      ...(idImovel && { idImovel }),
    })
      .then(setMemorias)
      .catch((e) => {
        console.error("Erro ao carregar as memórias de cálculo:", e);
        setErro(mensagemDeErro(e, "Erro ao carregar as memórias de cálculo."));
      })
      .finally(() => setCarregando(false));
  }, [mes, verTodosOsMeses, idImovel]);

  const baixarExcel = async (memoria) => {
    setBaixandoId(memoria.id);
    try {
      const { blob, nomeArquivo } = await baixarMemoriaCalculoExcel(memoria.id);
      baixarBlob(blob, nomeArquivo);
    } catch (e) {
      console.error("Erro ao baixar a memória de cálculo:", e);
      alert(mensagemDeErro(e, "Erro ao baixar a memória de cálculo."));
    } finally {
      setBaixandoId(null);
    }
  };

  return (
    <LayoutPagina
      titulo="Memórias de Cálculo"
      descricao="Consulte as memórias de cálculo já geradas, do mês vigente ou de meses anteriores."
      trilha={[ITEM_DASHBOARD, { label: "Memórias de Cálculo" }]}
    >
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div>
            <label htmlFor="memorias-mes" className="block text-sm text-gray-700 mb-1">Mês</label>
            <input
              id="memorias-mes"
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              disabled={verTodosOsMeses}
              className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div>
            <label htmlFor="memorias-imovel" className="block text-sm text-gray-700 mb-1">Imóvel</label>
            <select
              id="memorias-imovel"
              value={idImovel}
              onChange={(e) => setIdImovel(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none min-w-[220px]"
            >
              <option value="">Todos os imóveis</option>
              {imoveis.map((imovel) => (
                <option key={imovel.id} value={imovel.id}>
                  {imovel.endereco ? `${imovel.endereco.rua}, ${imovel.endereco.numero ?? "S/N"}` : `Imóvel #${imovel.id}`}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 pb-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={verTodosOsMeses}
              onChange={(e) => setVerTodosOsMeses(e.target.checked)}
              className="h-4 w-4"
            />
            Ver todas as competências (histórico completo)
          </label>
        </div>

        {carregando && <p className="text-gray-500">Carregando memórias de cálculo...</p>}

        {!carregando && erro && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        {!carregando && !erro && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 font-medium">Imóvel</th>
                  <th className="px-4 py-3 font-medium">Competência</th>
                  <th className="px-4 py-3 font-medium">Total a Pagar</th>
                  <th className="px-4 py-3 font-medium">Gerado em</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {memorias.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <FileSpreadsheet size={24} className="text-gray-300" />
                        {verTodosOsMeses
                          ? "Nenhuma memória de cálculo foi gerada ainda."
                          : "Nenhuma memória de cálculo gerada para este mês. Marque \"Ver todas as competências\" para consultar meses anteriores."}
                      </div>
                    </td>
                  </tr>
                ) : (
                  memorias.map((memoria) => (
                    <tr key={memoria.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4">
                        <Link
                          to={`/imoveis/${memoria.idImovel}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {memoria.imovelEndereco}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-gray-900">
                        <div className="flex items-center gap-2">
                          {competenciaPorExtenso(memoria.competencia)}
                          {memoria.competencia === competenciaParaData(mesAtual()) && (
                            <Badge variant="ATIVO">Mês vigente</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-900 font-bold">{formatarMoeda(memoria.totalAPagar)}</td>
                      <td className="px-4 py-4 text-gray-500">{dataHoraDeGeracao(memoria.criadoEm)}</td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => baixarExcel(memoria)}
                          disabled={baixandoId === memoria.id}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-xs disabled:opacity-50"
                        >
                          <Download size={14} />
                          {baixandoId === memoria.id ? "Baixando..." : "Baixar Excel"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </LayoutPagina>
  );
}
