import React, { useState } from "react";
import Button from "../Button";
import { api } from "../../services/api";

// Adicionamos a lógica visual para quando o campo estiver desabilitado (disabled)
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

export default function FormularioLocatario({ onClose, onSuccess, initialData }) {
  const [tipoPessoa, setTipoPessoa] = useState("FISICA");
  const [loading, setLoading] = useState(false);
  const [enderecoBloqueado, setEnderecoBloqueado] = useState(false); // Controla o bloqueio

  // Separamos logradouro, numero e complemento
  const [formData, setFormData] = useState({
    email: "",
    telefone: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    nome: "",
    cpf: "",
    rg: "",
    estadoCivil: "",
    profissaoRamo: "",
    razaoSocial: "",
    cnpj: "",
    inscricaoEstadual: "",
    observacoes: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  React.useEffect(() => {
    if (initialData) {
      setTipoPessoa(initialData.pessoaFisica ? "FISICA" : "JURIDICA");
      
      const cepMatch = initialData.endereco?.match(/CEP:\s*([\d-]+)/);
      const cep = cepMatch ? cepMatch[1] : "";
      
      setFormData({
        email: initialData.email || "",
        telefone: initialData.telefone || "",
        cep: cep,
        logradouro: "", 
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        uf: "",
        nome: initialData.pessoaFisica?.nome || "",
        cpf: initialData.pessoaFisica?.cpf || "",
        rg: initialData.pessoaFisica?.rg || "",
        estadoCivil: initialData.pessoaFisica?.estadoCivil || "",
        profissaoRamo: initialData.pessoaFisica?.profissaoRamo || "",
        razaoSocial: initialData.pessoaJuridica?.razaoSocial || "",
        cnpj: initialData.pessoaJuridica?.cnpj || "",
        inscricaoEstadual: initialData.pessoaJuridica?.inscricaoEstadual || "",
        observacoes: initialData.observacoes || "",
      });

      if (cep) {
        buscarCep(cep);
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
          logradouro: dados.logradouro || "",
          bairro: dados.bairro || "",
          cidade: dados.localidade || "",
          uf: dados.uf || "",
        }));

        // Se a API retornou o nome da rua, bloqueia os campos.
        // Se for um CEP genérico (só cidade/estado), deixa digitar a rua.
        setEnderecoBloqueado(!!dados.logradouro);
      } else {
        setEnderecoBloqueado(false);
      }
    } catch (erro) {
      console.error("Erro ao buscar CEP:", erro);
      setEnderecoBloqueado(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Juntamos o endereço para bater com a string única exigida pelo backend
      const complementoFormatado = formData.complemento
        ? ` - ${formData.complemento}`
        : "";
      const enderecoCompleto = `${formData.logradouro}, ${formData.numero}${complementoFormatado}, ${formData.bairro}, ${formData.cidade} - ${formData.uf}, CEP: ${formData.cep}`;

      // Montamos o Payload achatado, exatamente como o DTO pede
      const payload = {
        email: formData.email,
        telefone: formData.telefone,
        endereco: enderecoCompleto,
        tipo: tipoPessoa, // "FISICA" ou "JURIDICA" - Obrigatório pelo DTO

        // Espalhamos os dados na raiz do objeto dependendo do tipo selecionado
        ...(tipoPessoa === "FISICA"
          ? {
              nome: formData.nome,
              cpf: formData.cpf,
              rg: formData.rg,
              estadoCivil: formData.estadoCivil,
              profissaoRamo: formData.profissaoRamo || undefined,
            }
          : {
              razaoSocial: formData.razaoSocial,
              cnpj: formData.cnpj,
              inscricaoEstadual: formData.inscricaoEstadual,
            }),
      };

      const token = localStorage.getItem("@gesimo:token");
      if (initialData && initialData.id) {
        await api.patch(`/locatarios/${initialData.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post("/locatarios", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      // 👇 MUDAMOS AQUI PARA VER A RESPOSTA EXATA DO NESTJS
      console.error("🚨 ERRO 400 DO BACK-END:");
      console.error(error.response?.data);

      alert(
        "Ocorreu um erro ao tentar salvar o locatário. Olhe o console (F12) para detalhes.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 max-h-[80vh] overflow-y-auto px-1"
    >
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-2">
          Dados Pessoais
        </h3>
        <div className="flex items-center gap-6 mb-4">
          <label className="text-sm font-medium text-gray-700 mr-2">
            Tipo de Pessoa
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tipoPessoa"
              value="FISICA"
              checked={tipoPessoa === "FISICA"}
              onChange={() => setTipoPessoa("FISICA")}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Física</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tipoPessoa"
              value="JURIDICA"
              checked={tipoPessoa === "JURIDICA"}
              onChange={() => setTipoPessoa("JURIDICA")}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Jurídica</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {tipoPessoa === "FISICA" ? (
            <>
              <InputGroup
                label="Nome completo"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
                placeholder="Ex: Diana Cardoso Pereira"
              />
              <InputGroup
                label="CPF"
                name="cpf"
                value={formData.cpf}
                onChange={handleChange}
                required
                placeholder="000.000.000-00"
              />
              <InputGroup
                label="RG"
                name="rg"
                value={formData.rg}
                onChange={handleChange}
                required
                placeholder="00.000.000-0"
              />
              <InputGroup
                label="Estado Civil"
                name="estadoCivil"
                value={formData.estadoCivil}
                onChange={handleChange}
                placeholder="Ex: Solteira"
              />
            </>
          ) : (
            <>
              <div className="col-span-2">
                <InputGroup
                  label="Razão Social"
                  name="razaoSocial"
                  value={formData.razaoSocial}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Associação de Moradores Ltda"
                />
              </div>
              <InputGroup
                label="CNPJ"
                name="cnpj"
                value={formData.cnpj}
                onChange={handleChange}
                required
                placeholder="00.000.000/0000-00"
              />
              <InputGroup
                label="Inscrição Estadual"
                name="inscricaoEstadual"
                value={formData.inscricaoEstadual}
                onChange={handleChange}
                placeholder="00.000.00-0"
              />
            </>
          )}
          <InputGroup
            label="Telefone"
            name="telefone"
            value={formData.telefone}
            onChange={handleChange}
            required
            placeholder="(00) 00000-0000"
          />
          <InputGroup
            label="E-mail"
            name="email"
            value={formData.email}
            onChange={handleChange}
            type="email"
            required
            placeholder="email@exemplo.com"
          />
        </div>
      </div>

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
          <div className="col-span-9">
            <InputGroup
              label="Logradouro"
              name="logradouro"
              value={formData.logradouro}
              onChange={handleChange}
              required
              placeholder="Rua, Avenida, etc."
              disabled={enderecoBloqueado}
            />
          </div>
          <div className="col-span-4">
            <InputGroup
              label="Número"
              name="numero"
              value={formData.numero}
              onChange={handleChange}
              required
              placeholder="Ex: 123"
            />
          </div>
          <div className="col-span-8">
            <InputGroup
              label="Complemento"
              name="complemento"
              value={formData.complemento}
              onChange={handleChange}
              placeholder="Apto 101, Bloco B (Opcional)"
            />
          </div>
          <div className="col-span-5">
            <InputGroup
              label="Bairro"
              name="bairro"
              value={formData.bairro}
              onChange={handleChange}
              required
              disabled={enderecoBloqueado}
            />
          </div>
          <div className="col-span-5">
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
              label="UF"
              name="uf"
              value={formData.uf}
              onChange={handleChange}
              required
              placeholder="RJ"
              disabled={enderecoBloqueado}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-2">
          Informações Complementares
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {tipoPessoa === "FISICA" && (
            <InputGroup
              label="Profissão"
              name="profissaoRamo"
              value={formData.profissaoRamo}
              onChange={handleChange}
              placeholder="Ex: Analista (opcional)"
            />
          )}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              rows={3}
              placeholder="Alguma observação sobre o locatário"
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      </div>

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
          {loading ? "Salvando..." : "Salvar Locatário"}
        </Button>
      </div>
    </form>
  );
}
