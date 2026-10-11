import { useState } from "react";
import Button from "../Button";
import { api } from "../../services/api";
import { prepararInformeRendimentos, baixarInformeRendimentosPdf } from "../../services/informeRendimentos";
import { buscarContaBancariaPadrao } from "../../services/contaBancaria";
import { baixarBlob } from "../../utils/download";
import { mensagemDeErro } from "../../utils/erros";
import { nomeDoLocador, documentoDoLocador, nomeDoLocatario, documentoDoLocatario, enderecoDoImovel } from "../../utils/posse";

const classeCampo = "w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white";

const anosDisponiveis = () => {
  const atual = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => atual - i); // ano vigente + 5 anteriores
};

// Modal compartilhado entre a tela do Imóvel e a do Locador. Um dos dois (imóvel ou locador) já vem
// fixo, dependendo de onde o usuário clicou em "Gerar Informe de Rendimentos"; o outro vira um seletor:
// - a partir do Imóvel: "imovelId" fixo, escolhe-se o PROPRIETÁRIO (posse partilhada pode ter mais de um);
// - a partir do Locador: "locadorId" (+ nome/documento, já conhecidos na tela) fixo, escolhe-se o IMÓVEL.
export default function ModalGerarInformeRendimentos({
  imovelId,
  proprietarios = [], // [{id, nome}] — só usado quando imovelId vem fixo
  locadorId,
  locadorNome,
  locadorDocumento,
  imoveis = [], // lista de imóveis do locador — só usado quando locadorId vem fixo
  onClose,
}) {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [imovelEscolhido, setImovelEscolhido] = useState(imovelId ? String(imovelId) : "");
  const [locadorEscolhido, setLocadorEscolhido] = useState(
    locadorId ? String(locadorId) : proprietarios.length === 1 ? String(proprietarios[0].id) : "",
  );
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(null);

  const gerarEBaixar = async (e) => {
    e.preventDefault();

    if (!imovelEscolhido || !locadorEscolhido) {
      setErro("Selecione o imóvel e o proprietário.");
      return;
    }

    setErro(null);
    setGerando(true);
    try {
      // Nome/documento do locador: já vêm prontos quando a tela de origem é a do próprio locador;
      // senão, resolve agora (mesmo padrão já usado em outras telas do sistema).
      let nomeLocador = locadorNome;
      let documentoLocador = locadorDocumento;
      if (!nomeLocador) {
        const resposta = await api.get(`/locadores/${locadorEscolhido}`);
        const locador = resposta.data?.data ?? resposta.data;
        nomeLocador = nomeDoLocador(locador);
        documentoLocador = documentoDoLocador(locador);
      }

      // A prévia diz qual contrato (e portanto qual locatário) é o "representativo" do ano escolhido —
      // só se sabe isso depois de consultar as memórias de cálculo já geradas.
      const previa = await prepararInformeRendimentos({ idImovel: imovelEscolhido, idLocador: locadorEscolhido, ano });

      let nomeLocatario;
      let documentoLocatario;
      if (previa.contrato?.idLocatario) {
        const resposta = await api.get(`/locatarios/${previa.contrato.idLocatario}`);
        const locatario = resposta.data?.data ?? resposta.data;
        nomeLocatario = nomeDoLocatario(locatario);
        documentoLocatario = documentoDoLocatario(locatario);
      }

      const contaPadrao = await buscarContaBancariaPadrao();

      const { blob, nomeArquivo } = await baixarInformeRendimentosPdf({
        idImovel: imovelEscolhido,
        idLocador: locadorEscolhido,
        ano,
        nomeLocador,
        documentoLocador,
        ...(nomeLocatario && { nomeLocatario, documentoLocatario }),
        ...(contaPadrao && { nomeAdministradora: contaPadrao.titular, documentoAdministradora: contaPadrao.documentoTitular }),
      });

      baixarBlob(blob, nomeArquivo);
      onClose();
    } catch (erroRequisicao) {
      console.error("Erro ao gerar o informe de rendimentos:", erroRequisicao);
      setErro(mensagemDeErro(erroRequisicao, "Erro ao gerar o informe de rendimentos."));
    } finally {
      setGerando(false);
    }
  };

  return (
    <form onSubmit={gerarEBaixar} className="p-6 space-y-4">
      <p className="text-sm text-gray-500">
        Gera o Comprovante Anual de Rendimentos de Aluguéis, a partir das Memórias de Cálculo já geradas
        para o ano escolhido.
      </p>

      <div>
        <label htmlFor="informe-ano" className="block text-sm text-gray-700 mb-1">Ano-calendário</label>
        <select id="informe-ano" value={ano} onChange={(e) => setAno(Number(e.target.value))} className={classeCampo}>
          {anosDisponiveis().map((anoOpcao) => (
            <option key={anoOpcao} value={anoOpcao}>{anoOpcao}</option>
          ))}
        </select>
      </div>

      {!imovelId && (
        <div>
          <label htmlFor="informe-imovel" className="block text-sm text-gray-700 mb-1">Imóvel</label>
          <select id="informe-imovel" value={imovelEscolhido} onChange={(e) => setImovelEscolhido(e.target.value)} className={classeCampo}>
            <option value="">Selecione o imóvel...</option>
            {imoveis.map((imovel) => (
              <option key={imovel.id} value={String(imovel.id)}>{enderecoDoImovel(imovel)}</option>
            ))}
          </select>
          {imoveis.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">Este locador não está vinculado a nenhum imóvel.</p>
          )}
        </div>
      )}

      {!locadorId && (
        <div>
          <label htmlFor="informe-locador" className="block text-sm text-gray-700 mb-1">Proprietário</label>
          <select id="informe-locador" value={locadorEscolhido} onChange={(e) => setLocadorEscolhido(e.target.value)} className={classeCampo}>
            <option value="">Selecione o proprietário...</option>
            {proprietarios.map((proprietario) => (
              <option key={proprietario.id} value={String(proprietario.id)}>{proprietario.nome}</option>
            ))}
          </select>
        </div>
      )}

      {erro && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <div className="pt-4 flex justify-end gap-3 border-t">
        <Button variant="secondary" type="button" onClick={onClose} disabled={gerando}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={gerando}>
          {gerando ? "Gerando..." : "Gerar e baixar PDF"}
        </Button>
      </div>
    </form>
  );
}
