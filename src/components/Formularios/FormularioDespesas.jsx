import React, { useState } from "react";
import { api } from "../../services/api";
import Button from "../Button";

export default function FormularioDespesa({ imovelId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    idContratoLocacao: "", // A despesa é atrelada a um contrato no seu banco
    descricao: "",
    valor: "",
    tipo: "MANUTENCAO",
    dataVencimento: "",
  });

  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [dataPagamento, setDataPagamento] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setArquivoSelecionado(e.target.files[0]);
      if (!dataPagamento) setDataPagamento(new Date().toISOString().slice(0, 10));
    } else {
      setArquivoSelecionado(null);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (arquivoSelecionado && !dataPagamento) {
      alert("Informe a data em que o pagamento foi efetuado.");
      return;
    }

    setEnviando(true);
    try {
      const token = localStorage.getItem("@gesimo:token");

      const payloadDespesa = {
        idContratoLocacao: Number(formData.idContratoLocacao),
        descricao: formData.descricao,
        valor: Number(formData.valor),
        tipo: formData.tipo,
        dataVencimento: formData.dataVencimento,
      };

      // A despesa nasce sempre EM_ABERTO; a baixa (status PAGA) só acontece de fato
      // ao anexar o comprovante, na chamada seguinte.
      const resposta = await api.post("/imoveis/despesas", payloadDespesa, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const idDespesa = resposta.data?.data?.id ?? resposta.data?.id;

      if (arquivoSelecionado) {
        const payloadArquivo = new FormData();
        payloadArquivo.append("file", arquivoSelecionado);
        payloadArquivo.append("dataPagamento", dataPagamento);
        await api.patch(
          `/imoveis/despesas/${idDespesa}/pagamento`,
          payloadArquivo,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          },
        );
      }

      onSuccess();
    } catch (erro) {
      console.error("Erro ao criar despesa:", erro);
      alert("Houve um erro ao salvar a despesa.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* ID do Contrato (No futuro pode ser um Select que busca os contratos do imóvel) */}
        <div>
          <label className="block text-sm text-gray-700 mb-1">
            ID do Contrato
          </label>
          <input
            type="number"
            name="idContratoLocacao"
            value={formData.idContratoLocacao}
            onChange={handleChange}
            required
            placeholder="Ex: 1"
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Descrição</label>
          <input
            type="text"
            name="descricao"
            value={formData.descricao}
            onChange={handleChange}
            required
            placeholder="Ex: Conserto do encanamento"
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Tipo de Despesa
          </label>
          <select
            name="tipo"
            value={formData.tipo}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="ALUGUEL">Aluguel</option>
            <option value="CONDOMINIO">Condomínio</option>
            <option value="IPTU">IPTU</option>
            <option value="TAXA_BOMBEIRO">Taxa Bombeiro</option>
            <option value="SEGURO_INCENDIO">Seguro Incêndio</option>
            <option value="MANUTENCAO">Manutenção</option>
            <option value="OUTRA">Outra</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Valor (R$)</label>
          <input
            type="number"
            step="0.01"
            name="valor"
            value={formData.valor}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Data de Vencimento
          </label>
          <input
            type="date"
            name="dataVencimento"
            value={formData.dataVencimento}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* A despesa é lançada como EM_ABERTO por padrão; anexar o comprovante aqui já a dá como paga. */}
      <div className="pt-2 border-t border-gray-100 mt-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Anexar Comprovante / Boleto (opcional — já registra como paga)
          </label>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={handleFileChange}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {arquivoSelecionado && (
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
        )}
      </div>

      <div className="pt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} type="button" disabled={enviando}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar Despesa"}
        </Button>
      </div>
    </form>
  );
}
