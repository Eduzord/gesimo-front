import React, { useState } from "react";
import Button from "../Button";
import { api } from "../../services/api";
import SeletorProprietarios, {
  calcularTotalPercentual,
  proprietariosSaoValidos,
} from "./SeletorProprietarios";
import ModalConfirmacaoPosse from "./ModalConfirmacaoPosse";
import { mensagemDeErro } from "../../utils/posse";

// Reutilizamos o InputGroup com a mesma estética limpa
const InputGroup = ({
  label,
  name,
  required,
  value,
  onChange,
  disabled,
  ...props
}) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      className={`px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
        disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white"
      }`}
      {...props}
    />
  </div>
);

// Novo SelectGroup para lidar com os Enums do Prisma
const SelectGroup = ({ label, name, required, value, onChange, options }) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
    >
      <option value="" disabled>
        Selecione...
      </option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export default function FormularioImovel({ onClose, onSuccess, initialData }) {
  const [loading, setLoading] = useState(false);
  const [enderecoBloqueado, setEnderecoBloqueado] = useState(false);
  const [proprietarios, setProprietarios] = useState([]);
  const [modalPosseAberto, setModalPosseAberto] = useState(false);

  // O estado reflete exatamente os nomes esperados pelo DTO
  const [formData, setFormData] = useState({
    inscricaoIPTU: "",
    inscricaoBombeiro: "",
    metragem: "",
    classificacao: "",
    tipologia: "",
    status: "DISPONIVEL", // Valor padrão otimista
    // Endereço
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  React.useEffect(() => {
    if (initialData) {
      let rua = initialData.endereco?.rua || "";
      let complemento = "";
      if (rua.includes(" - ")) {
        const parts = rua.split(" - ");
        complemento = parts.pop();
        rua = parts.join(" - ");
      }
      setFormData({
        inscricaoIPTU: initialData.inscricaoIPTU || "",
        inscricaoBombeiro: initialData.inscricaoBombeiro || "",
        metragem: initialData.metragem || "",
        classificacao: initialData.classificacao || "",
        tipologia: initialData.tipologia || "",
        status: initialData.status || "DISPONIVEL",
        cep: initialData.endereco?.cep || "",
        rua: rua,
        numero: initialData.endereco?.numero !== "S/N" ? initialData.endereco?.numero : "",
        complemento: complemento,
        bairro: initialData.endereco?.bairro || "",
        cidade: initialData.endereco?.cidade || "",
        estado: initialData.endereco?.estado || "",
      });

      if (Array.isArray(initialData.propriedadeimovel)) {
        setProprietarios(
          initialData.propriedadeimovel.map((p) => ({
            idLocador: p.idLocador,
            nomeLocador: "",
            percentualParticipacao: String(p.percentualParticipacao),
          })),
        );
      }
    }
  }, [initialData]);

  const buscarCep = async (cep) => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) {
      setEnderecoBloqueado(false);
      return;
    }

    try {
      const resposta = await fetch(
        `https://viacep.com.br/ws/${cepLimpo}/json/`,
      );
      const dados = await resposta.json();

      if (!dados.erro) {
        setFormData((prev) => ({
          ...prev,
          rua: dados.logradouro || "",
          bairro: dados.bairro || "",
          cidade: dados.localidade || "",
          estado: dados.uf || "", // O DTO pede 'estado' e não 'uf'
        }));

        setEnderecoBloqueado(!!dados.logradouro);
      } else {
        setEnderecoBloqueado(false);
      }
    } catch (erro) {
      console.error("Erro ao buscar CEP:", erro);
      setEnderecoBloqueado(false);
    }
  };

  const montarPayload = () => {
    // Se tiver complemento, junta com a rua para contornar a ausência da coluna no banco
    const ruaFormatada = formData.complemento
      ? `${formData.rua} - ${formData.complemento}`
      : formData.rua;

    // Montamos o Payload EXATAMENTE como o DTO `CriarImovelDto` exige
    return {
      ...(formData.inscricaoIPTU && {
        inscricaoIPTU: formData.inscricaoIPTU,
      }),
      ...(formData.inscricaoBombeiro && {
        inscricaoBombeiro: formData.inscricaoBombeiro,
      }),
      ...(formData.metragem && { metragem: formData.metragem }),
      classificacao: formData.classificacao,
      tipologia: formData.tipologia,
      status: formData.status,

      // O Endereço vai como um objeto aninhado
      endereco: {
        rua: ruaFormatada,
        numero: formData.numero || "S/N",
        bairro: formData.bairro,
        cidade: formData.cidade,
        estado: formData.estado,
        cep: formData.cep,
      },

      // Lista de locadores donos do imóvel e seus percentuais de participação
      proprietarios: proprietarios.map((p) => ({
        idLocador: Number(p.idLocador),
        percentualParticipacao: Number(String(p.percentualParticipacao).replace(",", ".")),
      })),
    };
  };

  const salvar = async () => {
    setLoading(true);
    try {
      const payload = montarPayload();
      const token = localStorage.getItem("@gesimo:token");
      if (initialData && initialData.id) {
        await api.patch(`/imoveis/${initialData.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post("/imoveis", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("🚨 ERRO DO BACK-END:");
      console.error(error.response?.data);
      alert(mensagemDeErro(error, "Ocorreu um erro ao salvar o imóvel. Verifique o console."));
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
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 max-h-[80vh] overflow-y-auto px-1"
    >
      {/* SEÇÃO: Classificação e Status */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-2">
          Características Principais
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <SelectGroup
            label="Classificação"
            name="classificacao"
            value={formData.classificacao}
            onChange={handleChange}
            required
            options={[
              { value: "RESIDENCIAL", label: "Residencial" },
              { value: "COMERCIAL", label: "Comercial" },
              { value: "RURAL", label: "Rural" },
              { value: "INDUSTRIAL", label: "Industrial" },
            ]}
          />
          <SelectGroup
            label="Tipologia"
            name="tipologia"
            value={formData.tipologia}
            onChange={handleChange}
            required
            options={[
              { value: "CASA", label: "Casa" },
              { value: "APARTAMENTO", label: "Apartamento" },
              { value: "TERRENO", label: "Terreno" },
              { value: "SALA_COMERCIAL", label: "Sala Comercial" },
              { value: "GALPAO", label: "Galpão" },
            ]}
          />
          <SelectGroup
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
            options={[
              { value: "DISPONIVEL", label: "Disponível" },
              { value: "ALUGADO", label: "Alugado" },
              { value: "VENDIDO", label: "Vendido" },
              { value: "INATIVO", label: "Inativo" },
            ]}
          />
        </div>
      </div>

      {/* SEÇÃO: Dados Físicos e Fiscais */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-2">
          Dados Fiscais e Dimensões
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <InputGroup
            label="Inscrição IPTU"
            name="inscricaoIPTU"
            value={formData.inscricaoIPTU}
            onChange={handleChange}
            placeholder="Opcional"
          />
          <InputGroup
            label="Inscrição Bombeiros"
            name="inscricaoBombeiro"
            value={formData.inscricaoBombeiro}
            onChange={handleChange}
            placeholder="Opcional"
          />
          <InputGroup
            label="Metragem"
            name="metragem"
            value={formData.metragem}
            onChange={handleChange}
            placeholder="Ex: 150m²"
          />
        </div>
      </div>

      {/* SEÇÃO: Endereço (Nested Object) */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-2">
          Endereço
        </h3>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3">
            <InputGroup
              label="CEP"
              name="cep"
              value={formData.cep}
              onChange={handleChange}
              onBlur={(e) => buscarCep(e.target.value)}
              required
              placeholder="00000-000"
            />
          </div>
          <div className="col-span-7">
            <InputGroup
              label="Rua / Logradouro"
              name="rua"
              value={formData.rua}
              onChange={handleChange}
              required
              disabled={enderecoBloqueado}
            />
          </div>
          <div className="col-span-2">
            <InputGroup
              label="Número"
              name="numero"
              value={formData.numero}
              onChange={handleChange}
              placeholder="S/N"
            />
          </div>

          {/* NOVA LINHA REORGANIZADA COM COMPLEMENTO */}
          <div className="col-span-4">
            <InputGroup
              label="Complemento"
              name="complemento"
              value={formData.complemento}
              onChange={handleChange}
              placeholder="Apto 101, Bloco B"
            />
          </div>
          <div className="col-span-4">
            <InputGroup
              label="Bairro"
              name="bairro"
              value={formData.bairro}
              onChange={handleChange}
              required
              disabled={enderecoBloqueado}
            />
          </div>
          <div className="col-span-2">
            <InputGroup
              label="Cidade"
              name="cidade"
              value={formData.cidade}
              onChange={handleChange}
              required
              disabled={enderecoBloqueado}
            />
          </div>
          <div className="col-span-2">
            <InputGroup
              label="Estado (UF)"
              name="estado"
              value={formData.estado}
              onChange={handleChange}
              required
              disabled={enderecoBloqueado}
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO: Proprietários (Posse Partilhada) */}
      <SeletorProprietarios proprietarios={proprietarios} onChange={setProprietarios} />

      {/* FOOTER */}
      <div className="flex justify-end gap-3 pt-4 border-t mt-2">
        <Button
          variant="secondary"
          onClick={onClose}
          type="button"
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Imóvel"}
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
