import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import LayoutPagina from "../../components/LayoutPagina";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import ModalContainer from "../../components/ModalContainer";
import FormularioTabelaIrrf from "../../components/Formularios/FormularioTabelaIrrf";
import useTabelasIrrf from "../../hooks/useTabelasIrrf";
import { excluirTabelaIrrf } from "../../services/irrf";
import { formatarData } from "../../utils/formatacao";
import { mensagemDeErro } from "../../utils/erros";
import { ROTULOS_SITUACAO, descreverVigencia, formVazio, tabelaParaForm } from "../../utils/irrf";

const AVISO_NOVA = "Os valores vieram da tabela vigente. Informe a data de início e ajuste apenas o que mudou.";
const AVISO_EM_VIGOR =
  "Esta tabela já está (ou já esteve) em vigor. Alterá-la muda o resultado de novos cálculos das competências desse período.";

// Cadastro e manutenção das tabelas IRRF (somente ADMIN; a rota e o menu já filtram, e o servidor confere de novo)
export default function GerenciarIrrf() {
  const { tabelas, carregando, erro, recarregar } = useTabelasIrrf();
  // { tabela } = editando; { tabela: null } = nova
  const [modal, setModal] = useState(null);

  const base = tabelas.find((t) => t.situacao === "VIGENTE") ?? tabelas[0] ?? null;

  const fecharModal = () => setModal(null);
  const salvou = () => {
    fecharModal();
    recarregar();
  };

  const excluir = async (tabela) => {
    const emVigor = tabela.situacao !== "FUTURA";
    const pergunta =
      `Excluir a tabela com vigência ${descreverVigencia(tabela, formatarData)}?` +
      (emVigor ? "\n\nEla já está (ou já esteve) em vigor: as competências desse período passarão a usar a tabela anterior." : "");

    if (!window.confirm(pergunta)) return;

    try {
      await excluirTabelaIrrf(tabela.id);
      recarregar();
    } catch (e) {
      console.error("Erro ao excluir a tabela IRRF:", e);
      alert(mensagemDeErro(e, "Erro ao excluir a tabela IRRF."));
    }
  };

  const formularioDoModal = () => {
    if (modal.tabela) {
      return { formInicial: tabelaParaForm(modal.tabela), tabelaId: modal.tabela.id, aviso: modal.tabela.situacao !== "FUTURA" ? AVISO_EM_VIGOR : null };
    }
    return base
      ? { formInicial: tabelaParaForm(base, { comoNova: true }), tabelaId: null, aviso: AVISO_NOVA }
      : { formInicial: formVazio(), tabelaId: null, aviso: null };
  };

  return (
    <LayoutPagina
      titulo="Gerenciar tabelas IRRF"
      descricao="Cadastre uma nova versão quando a tabela oficial mudar. Cada cálculo usa a versão vigente na data de competência."
    >
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Versões cadastradas</h2>
          <Button variant="primary" icon={Plus} onClick={() => setModal({ tabela: null })}>
            Nova tabela
          </Button>
        </div>

        {carregando && <p className="text-gray-500">Carregando tabelas...</p>}

        {!carregando && erro && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        {!carregando && !erro && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Vigência</th>
                  <th scope="col" className="px-4 py-3 font-medium">Descrição</th>
                  <th scope="col" className="px-4 py-3 font-medium">Faixas</th>
                  <th scope="col" className="px-4 py-3 font-medium">Situação</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tabelas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Nenhuma tabela cadastrada. Use "Nova tabela" para cadastrar a primeira.
                    </td>
                  </tr>
                )}

                {tabelas.map((tabela) => (
                  <tr key={tabela.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4 font-medium text-gray-900">{descreverVigencia(tabela, formatarData)}</td>
                    <td className="px-4 py-4 text-gray-500">{tabela.descricao || "—"}</td>
                    <td className="px-4 py-4 text-gray-500">{tabela.faixas.length}</td>
                    <td className="px-4 py-4">
                      <Badge variant={tabela.situacao}>{ROTULOS_SITUACAO[tabela.situacao]}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setModal({ tabela })}
                          disabled={!tabela.editavel}
                          title={tabela.editavel ? "Editar" : "Já usada em recibos: cadastre uma nova versão"}
                          aria-label={`Editar tabela com vigência ${descreverVigencia(tabela, formatarData)}`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-40 disabled:hover:text-gray-400 disabled:hover:bg-transparent"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => excluir(tabela)}
                          disabled={!tabela.editavel}
                          title={tabela.editavel ? "Excluir" : "Já usada em recibos: não pode ser excluída"}
                          aria-label={`Excluir tabela com vigência ${descreverVigencia(tabela, formatarData)}`}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-40 disabled:hover:text-gray-400 disabled:hover:bg-transparent"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <ModalContainer
          isOpen
          onClose={fecharModal}
          title={modal.tabela ? "Editar tabela IRRF" : "Nova tabela IRRF"}
          largura="max-w-4xl"
        >
          <FormularioTabelaIrrf {...formularioDoModal()} onClose={fecharModal} onSuccess={salvou} />
        </ModalContainer>
      )}
    </LayoutPagina>
  );
}
