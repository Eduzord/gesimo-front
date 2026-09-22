import React, { useState } from "react";
import Button from "../Button";
import SeletorProprietarios, {
  calcularTotalPercentual,
  proprietariosSaoValidos,
} from "./SeletorProprietarios";
import ModalConfirmacaoPosse from "./ModalConfirmacaoPosse";
import { mensagemDeErro, salvarProprietarios } from "../../utils/posse";

// Edita só a lista de proprietários (posse partilhada) de um imóvel e salva com PATCH /imoveis/:id.
// Regras: soma > 100% é barrada; soma < 100% pede confirmação; o backend valida de novo.
export default function EditorPosseImovel({
  imovelId,
  proprietariosIniciais,
  idsTravados = [],
  textoConfirmar = "Salvar posse",
  onClose,
  onSuccess,
}) {
  const [proprietarios, setProprietarios] = useState(proprietariosIniciais);
  const [modalPosseAberto, setModalPosseAberto] = useState(false);
  const [loading, setLoading] = useState(false);

  const total = Math.round(calcularTotalPercentual(proprietarios) * 100) / 100;

  const salvar = async () => {
    setLoading(true);
    try {
      await salvarProprietarios(imovelId, proprietarios);
      onSuccess();
    } catch (erro) {
      console.error("Erro ao salvar proprietários do imóvel:", erro);
      alert(mensagemDeErro(erro, "Erro ao salvar a posse do imóvel. Verifique o console."));
      setModalPosseAberto(false);
    } finally {
      setLoading(false);
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

    if (total > 100) {
      alert("A soma dos percentuais de participação não pode exceder 100%. Ajuste os valores para continuar.");
      return;
    }

    if (proprietarios.length > 0 && total < 100) {
      setModalPosseAberto(true);
      return;
    }

    await salvar();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <SeletorProprietarios
        proprietarios={proprietarios}
        onChange={setProprietarios}
        idsTravados={idsTravados}
      />

      <div className="pt-4 flex justify-end gap-3 border-t">
        <Button variant="secondary" onClick={onClose} type="button" disabled={loading}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? "Salvando..." : textoConfirmar}
        </Button>
      </div>

      <ModalConfirmacaoPosse
        isOpen={modalPosseAberto}
        totalPercentual={total}
        loading={loading}
        onCancelar={() => setModalPosseAberto(false)}
        onConfirmar={salvar}
      />
    </form>
  );
}
