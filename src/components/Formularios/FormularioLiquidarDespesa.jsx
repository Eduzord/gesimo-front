import { useState } from "react";
import { api } from "../../services/api";
import Button from "../Button";
import { formatarMoeda } from "../../utils/formatacao";

// Dá baixa financeira em uma despesa já lançada (anexa comprovante + data de pagamento).
// Separado de FormularioDespesas porque aqui a despesa já existe: só fechamos o ciclo dela.
export default function FormularioLiquidarDespesa({ despesa, onClose, onSuccess }) {
  const [arquivo, setArquivo] = useState(null);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().slice(0, 10));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!arquivo) {
      setErro("Selecione o arquivo do comprovante.");
      return;
    }

    setErro(null);
    setEnviando(true);
    try {
      const token = localStorage.getItem("@gesimo:token");
      const payload = new FormData();
      payload.append("file", arquivo);
      payload.append("dataPagamento", dataPagamento);
      await api.patch(`/imoveis/despesas/${despesa.id}/pagamento`, payload, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      onSuccess();
    } catch (e) {
      console.error("Erro ao liquidar a despesa:", e);
      setErro("Erro ao registrar o pagamento. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-sm">
        <p className="font-medium text-gray-900">{despesa.descricao}</p>
        <p className="text-gray-500">Valor: {formatarMoeda(despesa.valor)}</p>
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-1">Comprovante</label>
        <input
          type="file"
          accept=".pdf,image/*"
          onChange={(e) => setArquivo(e.target.files?.[0] || null)}
          required
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-1">Data do Pagamento</label>
        <input
          type="date"
          value={dataPagamento}
          onChange={(e) => setDataPagamento(e.target.value)}
          required
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {erro && <p className="text-sm text-red-700">{erro}</p>}

      <div className="pt-4 flex justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onClose} disabled={enviando}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={enviando}>
          {enviando ? "Registrando..." : "Registrar pagamento"}
        </Button>
      </div>
    </form>
  );
}
