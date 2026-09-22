import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "../Button";
import CampoDecimal from "../CampoDecimal";
import { aplicarReajusteContrato } from "../../services/memoriaCalculo";
import { formatarMoeda, paraNumero } from "../../utils/formatacao";
import { mensagemDeErro } from "../../utils/erros";

const classeInput = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none";

// Aplica de fato o reajuste (grava o histórico e atualiza o valorAluguel do contrato) — uma ação própria
// e auditável, separada da geração da memória. "onAplicado" recebe {indice, percentual, valorAnterior}
// para o modal de memória usar como retrato, e o valorAluguel/dataReajuste atualizados do contrato.
export default function FormularioAplicarReajuste({ idContrato, valorAluguelAtual, onAplicado, onCancelar }) {
  const [indice, setIndice] = useState("IGPM");
  const [percentual, setPercentual] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const valorNovoPrevisto = () => {
    const pct = paraNumero(percentual);
    return Number.isFinite(pct) ? valorAluguelAtual * (1 + pct / 100) : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pct = paraNumero(percentual);
    if (!Number.isFinite(pct)) {
      setErro("Informe a variação do índice.");
      return;
    }

    setErro(null);
    setEnviando(true);
    try {
      const resultado = await aplicarReajusteContrato(idContrato, { indice, percentual: pct });
      onAplicado(resultado);
    } catch (e) {
      console.error("Erro ao aplicar o reajuste:", e);
      setErro(mensagemDeErro(e, "Erro ao aplicar o reajuste."));
    } finally {
      setEnviando(false);
    }
  };

  const previsto = valorNovoPrevisto();

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-start gap-2 text-sm text-amber-800">
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
        <p>
          Este contrato está no mês do seu aniversário de reajuste. Você pode aplicá-lo agora (o valor do
          aluguel do contrato é atualizado de verdade) para que a memória deste mês já use o valor reajustado.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label htmlFor="reajuste-indice" className="block text-xs text-gray-600 mb-1">Índice</label>
          <select id="reajuste-indice" value={indice} onChange={(e) => setIndice(e.target.value)} className={`${classeInput} bg-white`}>
            <option value="IGPM">IGP-M</option>
            <option value="IPCA">IPCA</option>
            <option value="INCC">INCC</option>
            <option value="OUTRO">Outro</option>
          </select>
        </div>
        <div>
          <label htmlFor="reajuste-percentual" className="block text-xs text-gray-600 mb-1">Variação do índice</label>
          <CampoDecimal id="reajuste-percentual" sufixo="%" placeholder="0,00" value={percentual} onChange={setPercentual} />
        </div>
        <div>
          <span className="block text-xs text-gray-600 mb-1">Novo valor do aluguel</span>
          <div className="px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm text-gray-700">
            {previsto !== null ? formatarMoeda(previsto) : "—"}
          </div>
        </div>
      </div>

      {erro && <p className="text-sm text-red-700">{erro}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" type="button" onClick={onCancelar} disabled={enviando}>
          Agora não
        </Button>
        <Button variant="primary" type="submit" disabled={enviando}>
          {enviando ? "Aplicando..." : "Aplicar reajuste"}
        </Button>
      </div>
    </form>
  );
}
