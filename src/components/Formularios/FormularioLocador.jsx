// src/components/Formularios/FormularioLocador.jsx
import React, { useState, useEffect } from "react";
import Button from "../Button";
import { api } from "../../services/api";

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

export default function FormularioLocador({ onClose, onSuccess, initialData }) {
  const [tipoPessoa, setTipoPessoa] = useState("FISICA");
  const [loading, setLoading] = useState(false);
  const [enderecoBloqueado, setEnderecoBloqueado] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    nome: "",
    cpf: "",
    rg: "",
    razaoSocial: "",
    cnpj: "",
    inscricaoEstadual: "",
  });

  useEffect(() => {
    if (initialData) {
      const isPJ = !!initialData.cnpj || !!initialData.razaoSocial;
      setTipoPessoa(isPJ ? "JURIDICA" : "FISICA");

      setFormData({
        email: initialData.email || "",
        cep: initialData.endereco?.cep || "",
        logradouro: initialData.endereco?.logradouro || "",
        numero: initialData.endereco?.numero || "",
        complemento: initialData.endereco?.complemento || "",
        bairro: initialData.endereco?.bairro || "",
        cidade: initialData.endereco?.cidade || "",
        estado: initialData.endereco?.estado || "",
        nome: initialData.nome || "",
        cpf: initialData.cpf || "",
        rg: initialData.rg || "",
        razaoSocial: initialData.razaoSocial || "",
        cnpj: initialData.cnpj || "",
        inscricaoEstadual: initialData.inscricaoEstadual || "",
      });

      if (initialData.endereco?.logradouro) {
        setEnderecoBloqueado(true);
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
          estado: dados.uf || "",
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "cep") {
      buscarCep(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        tipoPessoa,
        email: formData.email,
        endereco: {
          cep: formData.cep,
          logradouro: formData.logradouro,
          numero: formData.numero,
          complemento: formData.complemento,
          bairro: formData.bairro,
          cidade: formData.cidade,
          estado: formData.estado,
        },
        ...(tipoPessoa === "FISICA"
          ? {
              nome: formData.nome,
              cpf: formData.cpf,
              rg: formData.rg,
            }
          : {
              razaoSocial: formData.razaoSocial,
              cnpj: formData.cnpj,
              inscricaoEstadual: formData.inscricaoEstadual,
            }),
      };

      const token = localStorage.getItem("@gesimo:token");
      if (initialData && initialData.id) {
        await api.patch(`/locadores/${initialData.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post("/locadores", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar locador:", error.response?.data || error);
      alert("Erro ao salvar locador. Verifique os dados.");
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
              <div className="col-span-2">
                <InputGroup
                  label="Nome completo"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  placeholder="Ex: João da Silva"
                />
              </div>
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
                placeholder="00.000.000-0"
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
                  placeholder="Ex: Imóveis Silva Ltda"
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
              name="estado"
              value={formData.estado}
              onChange={handleChange}
              required
              maxLength="2"
              placeholder="RJ"
              disabled={enderecoBloqueado}
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
          {loading ? "Salvando..." : "Salvar Locador"}
        </Button>
      </div>
    </form>
  );
}
