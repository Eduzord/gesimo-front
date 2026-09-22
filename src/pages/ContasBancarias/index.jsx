import { useState } from "react";
import { Pencil, Plus, Power, Star, Trash2 } from "lucide-react";
import LayoutPagina from "../../components/LayoutPagina";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import ModalContainer from "../../components/ModalContainer";
import FormularioContaBancaria from "../../components/Formularios/FormularioContaBancaria";
import useContasBancarias from "../../hooks/useContasBancarias";
import {
  tornarContaBancariaPadrao,
  reativarContaBancaria,
  inativarContaBancaria,
  excluirContaBancariaDefinitivo,
} from "../../services/contaBancaria";
import { mensagemDeErro } from "../../utils/erros";
import { isAdmin } from "../../utils/auth";

// Catálogo de contas de depósito. Qualquer usuário autenticado pode cadastrar/editar/inativar; a exclusão
// definitiva (histórico) fica só para ADMIN, como em outras telas de gerenciamento do sistema.
export default function ContasBancarias() {
  const [status, setStatus] = useState("ATIVO");
  const { contas, carregando, erro, recarregar } = useContasBancarias(status);
  // { conta } = editando; { conta: null } = nova
  const [modal, setModal] = useState(null);

  const fecharModal = () => setModal(null);
  const salvou = () => {
    fecharModal();
    recarregar();
  };

  const tornarPadrao = async (conta) => {
    try {
      await tornarContaBancariaPadrao(conta.id);
      recarregar();
    } catch (e) {
      console.error("Erro ao marcar a conta como padrão:", e);
      alert(mensagemDeErro(e, "Erro ao marcar a conta como padrão."));
    }
  };

  const excluirDefinitivo = async (conta) => {
    if (!window.confirm(`Excluir definitivamente a conta "${conta.descricao}"? Memórias de cálculo já geradas mantêm os dados fotografados no momento em que foram criadas.`)) return;

    try {
      await excluirContaBancariaDefinitivo(conta.id);
      recarregar();
    } catch (e) {
      console.error("Erro ao excluir a conta bancária:", e);
      alert(mensagemDeErro(e, "Erro ao excluir a conta bancária."));
    }
  };

  const alternarAtiva = async (conta) => {
    const confirmar = conta.status === "ATIVO"
      ? window.confirm(`Inativar a conta "${conta.descricao}"? Ela deixa de aparecer como opção ao gerar memórias de cálculo.`)
      : true;
    if (!confirmar) return;

    try {
      if (conta.status === "ATIVO") await inativarContaBancaria(conta.id);
      else await reativarContaBancaria(conta.id);
      recarregar();
    } catch (e) {
      console.error("Erro ao alterar o status da conta bancária:", e);
      alert(mensagemDeErro(e, "Erro ao alterar o status da conta bancária."));
    }
  };

  return (
    <LayoutPagina
      titulo="Contas Bancárias"
      descricao="Contas de depósito que podem ser selecionadas ao gerar uma memória de cálculo. A conta marcada com estrela é a sugerida por padrão."
    >
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Contas cadastradas</h2>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white"
              aria-label="Filtrar por status"
            >
              <option value="ATIVO">Ativas</option>
              <option value="INATIVO">Inativas</option>
            </select>
          </div>
          <Button variant="primary" icon={Plus} onClick={() => setModal({ conta: null })}>
            Nova conta
          </Button>
        </div>

        {carregando && <p className="text-gray-500">Carregando contas...</p>}

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
                  <th scope="col" className="px-4 py-3 font-medium">Descrição</th>
                  <th scope="col" className="px-4 py-3 font-medium">Banco</th>
                  <th scope="col" className="px-4 py-3 font-medium">Agência/Conta</th>
                  <th scope="col" className="px-4 py-3 font-medium">Titular</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Nenhuma conta {status === "ATIVO" ? "ativa" : "inativa"} cadastrada.
                    </td>
                  </tr>
                )}

                {contas.map((conta) => (
                  <tr key={conta.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4 font-medium text-gray-900">
                      <div className="flex items-center gap-1.5">
                        {conta.padrao && <Star size={14} className="text-amber-500 fill-amber-500" aria-label="Conta padrão" />}
                        {conta.descricao}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-500">{conta.banco}</td>
                    <td className="px-4 py-4 text-gray-500">{conta.agencia} / {conta.numeroConta}</td>
                    <td className="px-4 py-4 text-gray-500">{conta.titular}</td>
                    <td className="px-4 py-4">
                      <Badge variant={conta.status}>{conta.status === "ATIVO" ? "Ativa" : "Inativa"}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1">
                        {conta.status === "ATIVO" && !conta.padrao && (
                          <button
                            type="button"
                            onClick={() => tornarPadrao(conta)}
                            title="Marcar como padrão"
                            aria-label={`Marcar ${conta.descricao} como conta padrão`}
                            className="p-2 text-gray-400 hover:text-amber-500 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <Star size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setModal({ conta })}
                          title="Editar"
                          aria-label={`Editar ${conta.descricao}`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => alternarAtiva(conta)}
                          title={conta.status === "ATIVO" ? "Inativar" : "Reativar"}
                          aria-label={`${conta.status === "ATIVO" ? "Inativar" : "Reativar"} ${conta.descricao}`}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <Power size={16} />
                        </button>
                        {isAdmin() && (
                          <button
                            type="button"
                            onClick={() => excluirDefinitivo(conta)}
                            title="Excluir definitivamente (ADMIN)"
                            aria-label={`Excluir definitivamente ${conta.descricao}`}
                            className="p-2 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
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
        <ModalContainer isOpen onClose={fecharModal} title={modal.conta ? "Editar conta bancária" : "Nova conta bancária"} largura="max-w-3xl">
          <FormularioContaBancaria conta={modal.conta} onClose={fecharModal} onSuccess={salvou} />
        </ModalContainer>
      )}
    </LayoutPagina>
  );
}
