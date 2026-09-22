import { useState } from "react";
import Button from "../Button";
import { criarContaBancaria, atualizarContaBancaria } from "../../services/contaBancaria";
import { mensagemDeErro } from "../../utils/erros";

const classeInput = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none";
const classeLabel = "block text-sm text-gray-700 mb-1";

const paraForm = (conta) => ({
  descricao: conta?.descricao || "",
  titular: conta?.titular || "",
  documentoTitular: conta?.documentoTitular || "",
  banco: conta?.banco || "",
  codigoBanco: conta?.codigoBanco || "",
  agencia: conta?.agencia || "",
  numeroConta: conta?.numeroConta || "",
  tipoConta: conta?.tipoConta || "CORRENTE",
  tipoChavePix: conta?.tipoChavePix || "",
  chavePix: conta?.chavePix || "",
  padrao: conta?.padrao || false,
});

// Cria (sem contaId) ou edita (com contaId) uma conta bancária de depósito
export default function FormularioContaBancaria({ conta, onClose, onSuccess }) {
  const [form, setForm] = useState(paraForm(conta));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const alterar = (campo, valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const payload = {
      ...form,
      tipoChavePix: form.tipoChavePix || undefined,
      chavePix: form.chavePix || undefined,
      codigoBanco: form.codigoBanco || undefined,
    };

    try {
      if (conta) await atualizarContaBancaria(conta.id, payload);
      else await criarContaBancaria(payload);
      onSuccess();
    } catch (e) {
      console.error("Erro ao salvar a conta bancária:", e);
      setErro(mensagemDeErro(e, "Erro ao salvar a conta bancária."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={classeLabel} htmlFor="conta-descricao">Descrição</label>
        <input
          id="conta-descricao"
          type="text"
          required
          maxLength={100}
          placeholder="Ex.: Conta Estilo Administração de Imóveis"
          value={form.descricao}
          onChange={(e) => alterar("descricao", e.target.value)}
          className={classeInput}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={classeLabel} htmlFor="conta-titular">Titular</label>
          <input
            id="conta-titular"
            type="text"
            required
            maxLength={150}
            value={form.titular}
            onChange={(e) => alterar("titular", e.target.value)}
            className={classeInput}
          />
        </div>
        <div>
          <label className={classeLabel} htmlFor="conta-documento">CPF/CNPJ do titular</label>
          <input
            id="conta-documento"
            type="text"
            required
            maxLength={20}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            value={form.documentoTitular}
            onChange={(e) => alterar("documentoTitular", e.target.value)}
            className={classeInput}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className={classeLabel} htmlFor="conta-banco">Banco</label>
          <input
            id="conta-banco"
            type="text"
            required
            maxLength={100}
            value={form.banco}
            onChange={(e) => alterar("banco", e.target.value)}
            className={classeInput}
          />
        </div>
        <div>
          <label className={classeLabel} htmlFor="conta-codigo-banco">Código</label>
          <input
            id="conta-codigo-banco"
            type="text"
            maxLength={10}
            placeholder="033"
            value={form.codigoBanco}
            onChange={(e) => alterar("codigoBanco", e.target.value)}
            className={classeInput}
          />
        </div>
        <div>
          <label className={classeLabel} htmlFor="conta-tipo">Tipo</label>
          <select
            id="conta-tipo"
            value={form.tipoConta}
            onChange={(e) => alterar("tipoConta", e.target.value)}
            className={`${classeInput} bg-white`}
          >
            <option value="CORRENTE">Corrente</option>
            <option value="POUPANCA">Poupança</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={classeLabel} htmlFor="conta-agencia">Agência</label>
          <input
            id="conta-agencia"
            type="text"
            required
            maxLength={20}
            value={form.agencia}
            onChange={(e) => alterar("agencia", e.target.value)}
            className={classeInput}
          />
        </div>
        <div>
          <label className={classeLabel} htmlFor="conta-numero">Conta</label>
          <input
            id="conta-numero"
            type="text"
            required
            maxLength={30}
            value={form.numeroConta}
            onChange={(e) => alterar("numeroConta", e.target.value)}
            className={classeInput}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={classeLabel} htmlFor="conta-tipo-pix">Chave PIX (opcional)</label>
          <select
            id="conta-tipo-pix"
            value={form.tipoChavePix}
            onChange={(e) => alterar("tipoChavePix", e.target.value)}
            className={`${classeInput} bg-white`}
          >
            <option value="">Sem chave PIX</option>
            <option value="CPF">CPF</option>
            <option value="CNPJ">CNPJ</option>
            <option value="EMAIL">E-mail</option>
            <option value="TELEFONE">Telefone</option>
            <option value="ALEATORIA">Aleatória</option>
          </select>
        </div>
        {form.tipoChavePix && (
          <div>
            <label className={classeLabel} htmlFor="conta-chave-pix">Chave</label>
            <input
              id="conta-chave-pix"
              type="text"
              required
              maxLength={140}
              value={form.chavePix}
              onChange={(e) => alterar("chavePix", e.target.value)}
              className={classeInput}
            />
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={form.padrao}
          onChange={(e) => alterar("padrao", e.target.checked)}
        />
        Marcar como conta padrão (sugerida ao gerar uma memória de cálculo)
      </label>

      {erro && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 whitespace-pre-line">
          {erro}
        </div>
      )}

      <div className="pt-4 flex justify-end gap-3 border-t">
        <Button variant="secondary" onClick={onClose} type="button" disabled={salvando}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : conta ? "Salvar alterações" : "Cadastrar conta"}
        </Button>
      </div>
    </form>
  );
}
