import React, { useMemo, useState } from "react";
import { Layers } from "lucide-react";
import { api } from "../../services/api";
import { criarDespesaParcelada } from "../../services/despesas";
import { dividirEmParcelas, formatarDataISO, NUMERO_MINIMO_PARCELAS, NUMERO_MAXIMO_PARCELAS } from "../../utils/parcelamento";
import { formatarMoeda } from "../../utils/formatacao";
import Button from "../Button";

const classeCampo = "w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none";

// Mostra como o valor total ficaria dividido antes de o usuário confirmar o lançamento — nenhum
// cálculo feito aqui é enviado à API; é só a prévia (quem grava de fato é o backend).
function PrevisaoParcelas({ parcelas, numeroParcelas }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-medium text-gray-600 mb-2">
        Prévia — {numeroParcelas} parcelas:
      </p>
      <ul className="max-h-36 overflow-y-auto divide-y divide-gray-200 text-sm">
        {parcelas.map((parcela) => (
          <li key={parcela.numero} className="flex justify-between py-1.5">
            <span className="text-gray-600">
              Parcela {parcela.numero}/{numeroParcelas} — venc. {formatarDataISO(parcela.dataVencimento).split("-").reverse().join("/")}
            </span>
            <span className="font-medium text-gray-900">{formatarMoeda(parcela.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FormularioDespesa({ imovelId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    idContratoLocacao: "", // A despesa é atrelada a um contrato no seu banco
    descricao: "",
    valor: "",
    tipo: "MANUTENCAO",
    dataVencimento: "",
  });

  // Lançamento parcelado (ex.: IPTU em 10x): quando ativo, "valor" passa a ser o TOTAL a dividir e
  // "dataVencimento" o vencimento da 1ª parcela — por isso reaproveitam os mesmos campos acima, em vez
  // de duplicar inputs, mantendo a tela simples mesmo com a opção nova.
  const [parcelado, setParcelado] = useState(false);
  const [numeroParcelas, setNumeroParcelas] = useState("");

  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [dataPagamento, setDataPagamento] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const alternarParcelado = (ativo) => {
    setParcelado(ativo);
    if (!ativo) setNumeroParcelas("");
    // Um comprovante não cabe num lançamento parcelado: cada parcela é paga (e tem seu próprio
    // comprovante) em um momento diferente, lá na aba de Despesas do imóvel.
    if (ativo) setArquivoSelecionado(null);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setArquivoSelecionado(e.target.files[0]);
      if (!dataPagamento) setDataPagamento(new Date().toISOString().slice(0, 10));
    } else {
      setArquivoSelecionado(null);
    }
  };

  // Prévia das parcelas: só recalcula quando os dados necessários já são válidos.
  const parcelasCalculadas = useMemo(() => {
    if (!parcelado) return null;

    const valorTotal = Number(formData.valor);
    const quantidade = Number(numeroParcelas);
    const quantidadeValida =
      Number.isInteger(quantidade) && quantidade >= NUMERO_MINIMO_PARCELAS && quantidade <= NUMERO_MAXIMO_PARCELAS;

    if (!(valorTotal > 0) || !quantidadeValida || !formData.dataVencimento) return null;

    return dividirEmParcelas(valorTotal, quantidade, formData.dataVencimento);
  }, [parcelado, formData.valor, formData.dataVencimento, numeroParcelas]);

  const validar = () => {
    if (parcelado) {
      const quantidade = Number(numeroParcelas);
      if (!Number.isInteger(quantidade) || quantidade < NUMERO_MINIMO_PARCELAS || quantidade > NUMERO_MAXIMO_PARCELAS) {
        return `Informe um número de parcelas entre ${NUMERO_MINIMO_PARCELAS} e ${NUMERO_MAXIMO_PARCELAS}.`;
      }
    }

    if (arquivoSelecionado && !dataPagamento) {
      return "Informe a data em que o pagamento foi efetuado.";
    }

    return null;
  };

  const salvarDespesaParcelada = async () => {
    await criarDespesaParcelada({
      idContratoLocacao: Number(formData.idContratoLocacao),
      descricao: formData.descricao,
      valorTotal: Number(formData.valor),
      tipo: formData.tipo,
      numeroParcelas: Number(numeroParcelas),
      dataPrimeiraParcela: formData.dataVencimento,
    });
  };

  // A despesa nasce sempre EM_ABERTO; a baixa (status PAGA) só acontece de fato ao anexar o
  // comprovante, na chamada seguinte. Parcelamentos nunca têm comprovante na criação (ver alternarParcelado).
  const salvarDespesaAvulsa = async () => {
    const token = localStorage.getItem("@gesimo:token");
    const resposta = await api.post(
      "/imoveis/despesas",
      {
        idContratoLocacao: Number(formData.idContratoLocacao),
        descricao: formData.descricao,
        valor: Number(formData.valor),
        tipo: formData.tipo,
        dataVencimento: formData.dataVencimento,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const idDespesa = resposta.data?.data?.id ?? resposta.data?.id;

    if (arquivoSelecionado) {
      const payloadArquivo = new FormData();
      payloadArquivo.append("file", arquivoSelecionado);
      payloadArquivo.append("dataPagamento", dataPagamento);
      await api.patch(`/imoveis/despesas/${idDespesa}/pagamento`, payloadArquivo, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const mensagemDeValidacao = validar();
    if (mensagemDeValidacao) {
      setErro(mensagemDeValidacao);
      return;
    }

    setErro(null);
    setEnviando(true);
    try {
      if (parcelado) await salvarDespesaParcelada();
      else await salvarDespesaAvulsa();

      onSuccess();
    } catch (erroRequisicao) {
      console.error("Erro ao criar despesa:", erroRequisicao);
      setErro(erroRequisicao.response?.data?.message || "Houve um erro ao salvar a despesa.");
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
            className={classeCampo}
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
            placeholder={parcelado ? "Ex: IPTU 2026" : "Ex: Conserto do encanamento"}
            className={classeCampo}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Tipo de Despesa
          </label>
          <select name="tipo" value={formData.tipo} onChange={handleChange} className={classeCampo}>
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
          <label className="block text-sm text-gray-700 mb-1">
            {parcelado ? "Valor TOTAL do parcelamento (R$)" : "Valor (R$)"}
          </label>
          <input
            type="number"
            step="0.01"
            name="valor"
            value={formData.valor}
            onChange={handleChange}
            required
            className={classeCampo}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">
            {parcelado ? "Vencimento da 1ª parcela" : "Data de Vencimento"}
          </label>
          <input
            type="date"
            name="dataVencimento"
            value={formData.dataVencimento}
            onChange={handleChange}
            required
            className={classeCampo}
          />
        </div>

        {parcelado && (
          <div>
            <label className="block text-sm text-gray-700 mb-1">Número de Parcelas</label>
            <input
              type="number"
              min={NUMERO_MINIMO_PARCELAS}
              max={NUMERO_MAXIMO_PARCELAS}
              value={numeroParcelas}
              onChange={(e) => setNumeroParcelas(e.target.value)}
              required
              placeholder="Ex: 10"
              className={classeCampo}
            />
          </div>
        )}
      </div>

      {/* Opção de parcelamento: despesas como o IPTU costumam ser pagas em várias cotas mensais. */}
      <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={parcelado}
          onChange={(e) => alternarParcelado(e.target.checked)}
          className="h-4 w-4"
        />
        <Layers size={16} className="text-gray-500" />
        Lançar em várias parcelas (ex.: IPTU)
      </label>

      {parcelado && parcelasCalculadas && (
        <PrevisaoParcelas parcelas={parcelasCalculadas} numeroParcelas={numeroParcelas} />
      )}

      {/* Sem parcelamento: a despesa é lançada como EM_ABERTO por padrão; anexar o comprovante aqui já a dá como paga. */}
      {!parcelado && (
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
                className={classeCampo}
              />
            </div>
          )}
        </div>
      )}

      {parcelado && (
        <p className="text-xs text-gray-500">
          Cada parcela nasce em aberto e é paga individualmente depois, na aba "Despesas" do imóvel —
          anexando o comprovante correspondente a cada vencimento.
        </p>
      )}

      {erro && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <div className="pt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} type="button" disabled={enviando}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : parcelado ? "Lançar Parcelas" : "Salvar Despesa"}
        </Button>
      </div>
    </form>
  );
}
