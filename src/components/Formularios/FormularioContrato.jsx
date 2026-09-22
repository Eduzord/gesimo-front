import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import Button from "../Button";
import { Search } from "lucide-react";
import { mensagemDeErro, nomeDoLocador, nomeDoLocatario, formatarPercentual } from "../../utils/posse";

// ==========================================
// SUBCOMPONENTE: BUSCADOR COM FILTRO LOCAL
// ==========================================
const BuscadorPessoa = ({ label, placeholder, endpoint, obterNome, onSelecionar }) => {
  const [busca, setBusca] = useState("");
  const [todosDados, setTodosDados] = useState([]); // Guarda a lista inteira do banco
  const [resultados, setResultados] = useState([]); // Guarda apenas os filtrados
  const [selecionado, setSelecionado] = useState(null);
  const [foco, setFoco] = useState(false);

  // 1. Busca TODOS os registros UMA única vez quando o componente carrega
  useEffect(() => {
    const buscarTodos = async () => {
      try {
        const token = localStorage.getItem("@gesimo:token");
        const resposta = await api.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Garante que é um array
        const dados = resposta.data.data || resposta.data || [];

        // 👇 ADICIONE ESTA LINHA PARA INVESTIGARMOS 👇
        console.log(`🕵️ Dados recebidos da rota ${endpoint}:`, dados);

        setTodosDados(dados);
      } catch (erro) {
        console.error(`Erro ao buscar dados de ${endpoint}:`, erro);
      }
    };

    buscarTodos();
  }, [endpoint]);

  // 2. Filtra localmente via JavaScript sempre que a pessoa digitar algo
  useEffect(() => {
    if (busca.length < 1) {
      setResultados([]);
      return;
    }

    const termoBusca = busca.toLowerCase();

    // Filtra a lista completa que está na memória
    const filtrados = todosDados.filter(
      (pessoa) => obterNome(pessoa).toLowerCase().includes(termoBusca),
    );

    setResultados(filtrados);
  }, [busca, todosDados]);

  const handleSelecionar = (pessoa) => {
    setSelecionado(pessoa);
    setBusca(obterNome(pessoa));
    setFoco(false);
    onSelecionar(pessoa.id); // Envia o ID para o formulário pai
  };

  return (
    <div className="relative">
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={selecionado ? obterNome(selecionado) : busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setSelecionado(null); // Limpa a seleção se o usuário voltar a digitar
            onSelecionar("");
          }}
          onFocus={() => setFoco(true)}
          onBlur={() => setTimeout(() => setFoco(false), 200)} // Delay para dar tempo de clicar na lista
          placeholder={placeholder}
          className="w-full p-2 pl-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
      </div>

      {/* Dropdown de Resultados */}
      {foco && resultados.length > 0 && !selecionado && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {resultados.map((pessoa) => (
            <li
              key={pessoa.id}
              onClick={() => handleSelecionar(pessoa)}
              className="p-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0"
            >
              {obterNome(pessoa)}{" "}
              <span className="text-gray-400 text-xs ml-2">
                (ID: {pessoa.id})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ==========================================
// FORMULÁRIO PRINCIPAL
// ==========================================
// "proprietarios": [{ id, nome, percentual }] do imóvel. Quando informado, o locador do contrato
// só pode ser um deles (regra validada também no backend).
// "locatarioFixo": { id, nome } quando o contrato é aberto a partir da tela de um locatário.
export default function FormularioContrato({ imovelId, contrato, proprietarios = [], locatarioFixo, onClose, onSuccess }) {
  const modoEdicao = Boolean(contrato);
  const restringirLocador = !modoEdicao && proprietarios.length > 0;

  const [formData, setFormData] = useState({
    idLocador:
      contrato?.idLocador?.toString() ||
      (proprietarios.length === 1 ? String(proprietarios[0].id) : ""),
    idLocatario: contrato?.idLocatario?.toString() || (locatarioFixo ? String(locatarioFixo.id) : ""),
    dataInicio: contrato?.dataInicio ? contrato.dataInicio.slice(0, 10) : "",
    dataFim: contrato?.dataFim ? contrato.dataFim.slice(0, 10) : "",
    dataReajuste: contrato?.dataReajuste ? contrato.dataReajuste.slice(0, 10) : "",
    valorAluguel: contrato?.valorAluguel ?? "",
    comissaoPercentual: contrato?.comissao
      ? String(Number(contrato.comissao) * 100)
      : "",
  });

  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleComissaoChange = (e) => {
    const { value } = e.target;
    // Aceita apenas dígitos e um único separador decimal (. ou ,)
    if (/^[0-9]*[.,]?[0-9]*$/.test(value)) {
      setFormData((prev) => ({ ...prev, comissaoPercentual: value }));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setArquivoSelecionado(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!modoEdicao && (!formData.idLocador || !formData.idLocatario)) {
      alert("Por favor, busque e selecione o Locador e o Locatário na lista.");
      return;
    }

    const comissao =
      Number(String(formData.comissaoPercentual).replace(",", ".")) / 100;

    if (!formData.comissaoPercentual || Number.isNaN(comissao)) {
      alert("Por favor, informe um valor de comissão válido.");
      return;
    }

    try {
      const token = localStorage.getItem("@gesimo:token");

      if (modoEdicao) {
        // Atualiza os dados de um contrato existente
        await api.patch(
          `/imoveis/contratos/${contrato.id}/dados`,
          {
            dataInicio: formData.dataInicio,
            dataFim: formData.dataFim || undefined,
            dataReajuste: formData.dataReajuste || undefined,
            valorAluguel: Number(formData.valorAluguel),
            comissao,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        onSuccess();
        return;
      }

      // 1. Cria o contrato no banco
      const payloadContrato = {
        idImovel: Number(imovelId),
        idLocador: Number(formData.idLocador),
        idLocatario: Number(formData.idLocatario),
        dataInicio: formData.dataInicio,
        dataFim: formData.dataFim || undefined,
        dataReajuste: formData.dataReajuste || undefined,
        valorAluguel: Number(formData.valorAluguel),
        comissao,
      };

      const respostaContrato = await api.post("/imoveis/contratos", payloadContrato, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const novoContratoId = respostaContrato.data.id;

      // 2. Anexa o arquivo (se existir)
      if (arquivoSelecionado) {
        const payloadArquivo = new FormData();
        payloadArquivo.append("file", arquivoSelecionado);

        await api.patch(
          `/imoveis/contratos/${novoContratoId}/arquivo`,
          payloadArquivo,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          },
        );

        // 🌟 A MÁGICA ENTRA AQUI 🌟
        // Já que um contrato foi criado E um arquivo foi anexado, o imóvel está alugado!
        await api.patch(
          `/imoveis/${imovelId}`,
          { status: "ALUGADO" },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }

      // Conclui e recarrega a página (que já vai voltar com a Badge vermelha de "Alugado")
      onSuccess();
    } catch (erro) {
      console.error("Erro ao salvar contrato:", erro);
      alert(mensagemDeErro(erro, "Houve um erro. Verifique o console."));
    }
  };
  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-visible">
      <div className="grid grid-cols-2 gap-4">
        {modoEdicao ? (
          <>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Locador (Proprietário)
              </label>
              <div className="w-full p-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 text-sm">
                {contrato.locador?.nome || `ID ${contrato.idLocador}`}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Locatário (Inquilino)
              </label>
              <div className="w-full p-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 text-sm">
                {contrato.locatario?.nome || `ID ${contrato.idLocatario}`}
              </div>
            </div>
          </>
        ) : (
          <>
            {restringirLocador ? (
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Locador (Proprietário)
                </label>
                <select
                  name="idLocador"
                  value={formData.idLocador}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">Selecione um proprietário...</option>
                  {proprietarios.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.nome} ({formatarPercentual(p.percentual)})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <BuscadorPessoa
                label="Locador (Proprietário)"
                placeholder="Digite o nome do locador..."
                endpoint="/locadores"
                obterNome={nomeDoLocador}
                onSelecionar={(id) =>
                  setFormData((prev) => ({ ...prev, idLocador: id }))
                }
              />
            )}

            {locatarioFixo ? (
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Locatário (Inquilino)
                </label>
                <div className="w-full p-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 text-sm">
                  {locatarioFixo.nome}
                </div>
              </div>
            ) : (
              <BuscadorPessoa
                label="Locatário (Inquilino)"
                placeholder="Digite o nome do inquilino..."
                endpoint="/locatarios"
                obterNome={nomeDoLocatario}
                onSelecionar={(id) =>
                  setFormData((prev) => ({ ...prev, idLocatario: id }))
                }
              />
            )}
          </>
        )}

        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Data Início
          </label>
          <input
            type="date"
            name="dataInicio"
            value={formData.dataInicio}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Data Fim (Opcional)
          </label>
          <input
            type="date"
            name="dataFim"
            value={formData.dataFim}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Data Reajuste (Opcional)
          </label>
          <input
            type="date"
            name="dataReajuste"
            value={formData.dataReajuste}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Valor do Aluguel (R$)
          </label>
          <input
            type="number"
            step="0.01"
            name="valorAluguel"
            value={formData.valorAluguel}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Comissão do Corretor
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              name="comissaoPercentual"
              value={formData.comissaoPercentual}
              onChange={handleComissaoChange}
              placeholder="7"
              required
              className="w-full p-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="absolute right-3 top-2.5 text-gray-400 text-sm">
              %
            </span>
          </div>
        </div>
      </div>

      {!modoEdicao && (
        <div className="pt-2 border-t border-gray-100 mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Anexar PDF do Contrato
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
      )}

      <div className="pt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} type="button">
          Cancelar
        </Button>
        <Button variant="primary" type="submit">
          {modoEdicao ? "Salvar Alterações" : "Salvar e Enviar"}
        </Button>
      </div>
    </form>
  );
}
