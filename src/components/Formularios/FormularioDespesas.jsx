import { useState } from "react";
import { Layers } from "lucide-react";
import { api } from "../../services/api";
import { criarDespesaParcelada } from "../../services/despesas";
import { dividirEmParcelas, formatarDataISO, NUMERO_MINIMO_PARCELAS, NUMERO_MAXIMO_PARCELAS } from "../../utils/parcelamento";
import { formatarData, formatarMoeda, numeroParaCampo, paraNumero } from "../../utils/formatacao";
import CampoDecimal from "../CampoDecimal";
import Button from "../Button";

const classeCampo = "w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none";

// Converte o resultado de dividirEmParcelas (números/Date, só uma sugestão) no formato que os campos
// editáveis do formulário usam (texto em pt-BR, data em "AAAA-MM-DD") — o usuário ajusta a partir daqui.
function paraParcelasEditaveis(parcelasSugeridas) {
  return parcelasSugeridas.map((parcela) => ({
    numero: parcela.numero,
    valor: numeroParaCampo(parcela.valor),
    dataVencimento: formatarDataISO(parcela.dataVencimento),
  }));
}

function rotuloContrato(contrato) {
  const periodo = contrato.dataInicio
    ? ` (${formatarData(contrato.dataInicio)}${contrato.dataFim ? ` a ${formatarData(contrato.dataFim)}` : ""})`
    : "";
  return `Contrato #${contrato.id} — ${contrato.status}${periodo}`;
}

export default function FormularioDespesa({ imovelId, contratos = [], onClose, onSuccess }) {
  // Mais recente primeiro: é o que normalmente se quer lançar uma despesa nova, por isso também é o
  // pré-selecionado por padrão (ver estado inicial de idContratoLocacao, abaixo).
  const contratosOrdenados = [...contratos].sort((a, b) => Number(b.id) - Number(a.id));

  const [formData, setFormData] = useState({
    idContratoLocacao: contratosOrdenados[0] ? String(contratosOrdenados[0].id) : "",
    descricao: "",
    valor: "",
    tipo: "MANUTENCAO",
    dataVencimento: "",
  });

  // Lançamento parcelado (ex.: IPTU em 10x): quando ativo, "valor" passa a ser o TOTAL a dividir e
  // "dataVencimento" o vencimento sugerido da 1ª parcela — por isso reaproveitam os mesmos campos
  // acima, em vez de duplicar inputs, mantendo a tela simples mesmo com a opção nova.
  const [parcelado, setParcelado] = useState(false);
  const [numeroParcelas, setNumeroParcelas] = useState("");
  // As parcelas abaixo nascem da sugestão automática (valor total ÷ quantidade), mas o usuário pode
  // editar o valor e o vencimento de qualquer uma antes de confirmar — por isso vivem num estado
  // próprio, e não são recalculadas o tempo todo a partir dos campos acima (isso apagaria as edições).
  const [parcelas, setParcelas] = useState([]);
  // Guarda de quais dados (valor total + quantidade + 1º vencimento) a lista acima foi gerada, para
  // só regenerar quando algum desses três realmente mudar — nunca a cada edição de uma parcela.
  const [origemDasParcelas, setOrigemDasParcelas] = useState(null);

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
    if (!ativo) {
      setNumeroParcelas("");
      setParcelas([]);
      setOrigemDasParcelas(null);
    }
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

  // Regenera a sugestão de parcelas quando o valor total, a quantidade ou o 1º vencimento mudam —
  // feito durante a própria renderização (padrão recomendado pelo React para "ajustar um estado
  // quando outro muda"), não em um useEffect, para não desenhar por um instante a lista antiga.
  // Qualquer edição feita diretamente numa parcela (ver atualizarParcela) não altera esses três
  // valores de origem, então sobrevive normalmente — só uma mudança neles gera a lista de novo.
  const origemAtualDasParcelas = parcelado ? `${formData.valor}|${numeroParcelas}|${formData.dataVencimento}` : null;
  if (parcelado && origemAtualDasParcelas !== origemDasParcelas) {
    setOrigemDasParcelas(origemAtualDasParcelas);

    const valorTotal = Number(formData.valor);
    const quantidade = Number(numeroParcelas);
    const quantidadeValida =
      Number.isInteger(quantidade) && quantidade >= NUMERO_MINIMO_PARCELAS && quantidade <= NUMERO_MAXIMO_PARCELAS;

    setParcelas(
      valorTotal > 0 && quantidadeValida && formData.dataVencimento
        ? paraParcelasEditaveis(dividirEmParcelas(valorTotal, quantidade, formData.dataVencimento))
        : [],
    );
  }

  const atualizarParcela = (indice, campos) =>
    setParcelas((atual) => atual.map((parcela, i) => (i === indice ? { ...parcela, ...campos } : parcela)));

  const somaDasParcelas = parcelas.reduce((total, p) => total + (paraNumero(p.valor) || 0), 0);
  const somaDiferenteDoTotal = parcelado && parcelas.length > 0 && Math.abs(somaDasParcelas - Number(formData.valor)) >= 0.01;

  const validar = () => {
    if (!formData.idContratoLocacao) {
      return "Selecione o contrato ao qual esta despesa pertence.";
    }

    if (parcelado) {
      if (parcelas.length < NUMERO_MINIMO_PARCELAS) {
        return "Preencha o valor total, a quantidade e o 1º vencimento para gerar as parcelas.";
      }
      const parcelaInvalida = parcelas.find((p) => !Number.isFinite(paraNumero(p.valor)) || paraNumero(p.valor) <= 0 || !p.dataVencimento);
      if (parcelaInvalida) {
        return `Revise o valor e o vencimento da parcela ${parcelaInvalida.numero}: ambos são obrigatórios e o valor deve ser maior que zero.`;
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
      tipo: formData.tipo,
      parcelas: parcelas.map((p) => ({
        valor: paraNumero(p.valor),
        dataVencimento: p.dataVencimento,
      })),
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
        <div>
          <label className="block text-sm text-gray-700 mb-1">Contrato</label>
          {contratosOrdenados.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Este imóvel não tem nenhum contrato cadastrado. Cadastre um contrato antes de lançar despesas.
            </p>
          ) : (
            <select
              name="idContratoLocacao"
              value={formData.idContratoLocacao}
              onChange={handleChange}
              required
              className={`${classeCampo} bg-white`}
            >
              {contratosOrdenados.map((contrato) => (
                <option key={contrato.id} value={String(contrato.id)}>
                  {rotuloContrato(contrato)}
                </option>
              ))}
            </select>
          )}
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
            {parcelado ? "Vencimento sugerido da 1ª parcela" : "Data de Vencimento"}
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

      {parcelado && parcelas.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-600 mb-2">
            Parcelas geradas automaticamente — ajuste o valor ou o vencimento de qualquer uma, se precisar:
          </p>
          <div className="max-h-56 overflow-y-auto space-y-2">
            {parcelas.map((parcela, indice) => (
              <div key={parcela.numero} className="grid grid-cols-[4.5rem,1fr,1fr] gap-2 items-center">
                <span className="text-xs text-gray-500">{parcela.numero}/{parcelas.length}</span>
                <CampoDecimal
                  prefixo="R$"
                  value={parcela.valor}
                  onChange={(valor) => atualizarParcela(indice, { valor })}
                  aria-label={`Valor da parcela ${parcela.numero}`}
                />
                <input
                  type="date"
                  value={parcela.dataVencimento}
                  onChange={(e) => atualizarParcela(indice, { dataVencimento: e.target.value })}
                  aria-label={`Vencimento da parcela ${parcela.numero}`}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            ))}
          </div>
          <p className={`mt-2 text-xs ${somaDiferenteDoTotal ? "text-amber-700" : "text-gray-500"}`}>
            Soma das parcelas: {formatarMoeda(somaDasParcelas)}
            {somaDiferenteDoTotal && ` — diferente do valor total informado (${formatarMoeda(formData.valor)})`}
          </p>
        </div>
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
        <Button variant="primary" type="submit" disabled={enviando || contratosOrdenados.length === 0}>
          {enviando ? "Salvando..." : parcelado ? "Lançar Parcelas" : "Salvar Despesa"}
        </Button>
      </div>
    </form>
  );
}
