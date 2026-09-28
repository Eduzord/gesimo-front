import React, { useState } from "react";
import { api } from "../../services/api";
import Button from "../Button";
import SeletorProprietarios, {
  calcularTotalPercentual,
  proprietariosSaoValidos,
} from "./SeletorProprietarios";
import ModalConfirmacaoPosse from "./ModalConfirmacaoPosse";
import { mensagemDeErro } from "../../utils/posse";

// Mesmas opções usadas no cadastro (FormularioImovel.jsx) — mantenha as duas listas em sincronia.
const OPCOES_CLASSIFICACAO = [
  { value: "RESIDENCIAL", label: "Residencial" },
  { value: "COMERCIAL", label: "Comercial" },
  { value: "RURAL", label: "Rural" },
  { value: "INDUSTRIAL", label: "Industrial" },
];
const OPCOES_TIPOLOGIA = [
  { value: "CASA", label: "Casa" },
  { value: "APARTAMENTO", label: "Apartamento" },
  { value: "TERRENO", label: "Terreno" },
  { value: "SALA_COMERCIAL", label: "Sala Comercial" },
  { value: "GALPAO", label: "Galpão" },
  { value: "LOJA", label: "Loja" },
];
const OPCOES_STATUS = [
  { value: "DISPONIVEL", label: "Disponível" },
  { value: "ALUGADO", label: "Alugado" },
  { value: "VENDIDO", label: "Vendido" },
  { value: "INATIVO", label: "Inativo" },
];

export default function FormularioEdicaoImovel({ imovel, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    metragem: imovel?.metragem || '',
    inscricaoIPTU: imovel?.inscricaoIPTU || '',
    inscricaoBombeiro: imovel?.inscricaoBombeiro || '',
    classificacao: imovel?.classificacao || '',
    tipologia: imovel?.tipologia || '',
    status: imovel?.status || 'DISPONIVEL',
  });

  const [proprietarios, setProprietarios] = useState(
    Array.isArray(imovel?.propriedadeimovel)
      ? imovel.propriedadeimovel.map((p) => ({
          idLocador: p.idLocador,
          nomeLocador: "",
          percentualParticipacao: String(p.percentualParticipacao),
        }))
      : [],
  );
  const [modalPosseAberto, setModalPosseAberto] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const salvar = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("@gesimo:token");

      // O Payload exato como o Swagger exige (tudo como String)
      const payload = {
        metragem: formData.metragem ? String(formData.metragem) : null,
        inscricaoIPTU: formData.inscricaoIPTU ? String(formData.inscricaoIPTU) : null,
        inscricaoBombeiro: formData.inscricaoBombeiro ? String(formData.inscricaoBombeiro) : null,
        classificacao: formData.classificacao,
        tipologia: formData.tipologia,
        status: formData.status,
        proprietarios: proprietarios.map((p) => ({
          idLocador: Number(p.idLocador),
          percentualParticipacao: Number(String(p.percentualParticipacao).replace(",", ".")),
        })),
      };

      await api.patch(`/imoveis/${imovel.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      onSuccess();
      onClose();
    } catch (erro) {
      console.error("Erro ao atualizar imóvel:", erro);
      alert(mensagemDeErro(erro, "Erro ao salvar as informações. Verifique o console."));
    } finally {
      setLoading(false);
      setModalPosseAberto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!proprietariosSaoValidos(proprietarios)) {
      alert(
        "Cada proprietário adicionado precisa ter um locador escolhido na lista e um percentual de participação maior que zero.",
      );
      return;
    }

    const totalPosse = Math.round(calcularTotalPercentual(proprietarios) * 100) / 100;

    if (totalPosse > 100) {
      alert("A soma dos percentuais de participação não pode exceder 100%. Ajuste os valores para continuar.");
      return;
    }

    if (proprietarios.length > 0 && totalPosse < 100) {
      setModalPosseAberto(true);
      return;
    }

    await salvar();
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Classificação</label>
          <select
            name="classificacao"
            value={formData.classificacao}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="" disabled>Selecione...</option>
            {OPCOES_CLASSIFICACAO.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Tipologia</label>
          <select
            name="tipologia"
            value={formData.tipologia}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="" disabled>Selecione...</option>
            {OPCOES_TIPOLOGIA.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            {OPCOES_STATUS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          {/* Note que mudei o type para "text" pois o Swagger aceita coisas como "150m2" */}
          <label className="block text-sm text-gray-700 mb-1">Metragem</label>
          <input 
            type="text" 
            name="metragem" 
            value={formData.metragem} 
            onChange={handleChange} 
            placeholder="Ex: 150m2"
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Inscrição IPTU</label>
          <input 
            type="text" 
            name="inscricaoIPTU" 
            value={formData.inscricaoIPTU} 
            onChange={handleChange} 
            placeholder="Ex: IPTU-999888"
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Inscrição Bombeiros</label>
          <input 
            type="text" 
            name="inscricaoBombeiro" 
            value={formData.inscricaoBombeiro} 
            onChange={handleChange} 
            placeholder="Ex: BOMB-123"
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
          />
        </div>
      </div>

      <div className="pt-2">
        <SeletorProprietarios proprietarios={proprietarios} onChange={setProprietarios} />
      </div>

      <div className="pt-6 flex justify-end gap-3 border-t">
        <Button variant="secondary" onClick={onClose} type="button" disabled={loading}>Cancelar</Button>
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>

      <ModalConfirmacaoPosse
        isOpen={modalPosseAberto}
        totalPercentual={Math.round(calcularTotalPercentual(proprietarios) * 100) / 100}
        loading={loading}
        onCancelar={() => setModalPosseAberto(false)}
        onConfirmar={salvar}
      />
    </form>
  );
}