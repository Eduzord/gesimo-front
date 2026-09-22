import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, MapPin, User, Mail, Phone, Home, Plus, FileText, Receipt } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import FormularioLocador from '../../components/Formularios/FormularioLocador';
import FormularioAtribuirImovel from '../../components/Formularios/FormularioAtribuirImovel';
import ModalContainer from '../../components/ModalContainer';
import { api } from '../../services/api';
import {
  enderecoDoImovel,
  formatarPercentual,
  mensagemDeErro,
  nomeDoLocador,
  proprietariosParaEstado,
  salvarProprietarios,
  somaPosse,
} from '../../utils/posse';

export default function DetalhesLocador() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditInit = new URLSearchParams(location.search).get('edit') === 'true';

  const [locador, setLocador] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(isEditInit);
  const [modalAtribuirAberto, setModalAtribuirAberto] = useState(false);
  const [imoveis, setImoveis] = useState([]);

  const [nomeUsuario, setNomeUsuario] = useState("");
  const [menuAberto, setMenuAberto] = useState(() => {
    const preferenciaSalva = localStorage.getItem("@gesimo:menuAberto");
    return preferenciaSalva !== null ? JSON.parse(preferenciaSalva) : true;
  });

  useEffect(() => {
    setNomeUsuario(localStorage.getItem("@gesimo:nome") || "Usuário");
  }, []);

  const carregarDetalhes = async () => {
    try {
      const token = localStorage.getItem("@gesimo:token");
      const resposta = await api.get(`/locadores/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLocador(resposta.data.data || resposta.data);
    } catch (erro) {
      console.error("Erro ao carregar detalhes do locador:", erro);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (id) carregarDetalhes();
  }, [id]);

  // Imóveis em que este locador é proprietário (com todos os proprietários e percentuais de cada um)
  const carregarImoveis = async () => {
    try {
      const resposta = await api.get(`/imoveis/locador/${id}`);
      const dados = resposta.data?.data || resposta.data || [];
      setImoveis(Array.isArray(dados) ? dados : []);
    } catch (erro) {
      console.error("Erro ao carregar imóveis do locador:", erro);
    }
  };

  useEffect(() => {
    if (id) carregarImoveis();
  }, [id]);

  const percentualDoLocador = (imovel) => {
    const vinculo = (imovel.propriedadeimovel || []).find((p) => String(p.idLocador) === String(id));
    return vinculo ? vinculo.percentualParticipacao : 0;
  };

  // Remove o locador da lista de proprietários do imóvel. Os demais mantêm seus percentuais.
  const desvincularImovel = async (imovel) => {
    const restantes = (imovel.propriedadeimovel || []).filter((p) => String(p.idLocador) !== String(id));
    const totalRestante = somaPosse(restantes);

    let aviso = "";
    if (restantes.length > 0 && totalRestante < 100) {
      aviso += `\n\nA posse do imóvel ficará com ${formatarPercentual(totalRestante)} atribuídos.`;
    }
    if (restantes.length === 0) {
      aviso += "\n\nO imóvel ficará sem nenhum proprietário vinculado.";
    }
    if (imovel.status === "ALUGADO") {
      aviso += "\n\nAtenção: este imóvel está alugado.";
    }

    if (!window.confirm(`Desvincular este locador do imóvel "${enderecoDoImovel(imovel)}"?${aviso}`)) return;

    try {
      await salvarProprietarios(imovel.id, proprietariosParaEstado(restantes));
      carregarImoveis();
    } catch (erro) {
      console.error("Erro ao desvincular imóvel:", erro);
      alert(mensagemDeErro(erro, "Erro ao desvincular o imóvel."));
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Deseja realmente apagar este locador?")) {
      try {
        const token = localStorage.getItem("@gesimo:token");
        await api.delete(`/locadores/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        navigate('/locadores');
      } catch (erro) {
        console.error("Erro ao apagar locador:", erro);
        alert("Erro ao apagar locador");
      }
    }
  };

  const handleHardDelete = async () => {
    if (window.confirm("ATENÇÃO: Deseja apagar este locador PERMANENTEMENTE? (Hard Delete)")) {
      try {
        const token = localStorage.getItem("@gesimo:token");
        await api.delete(`/locadores/${id}/hard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        navigate('/locadores');
      } catch (erro) {
        console.error("Erro ao apagar locador permanentemente:", erro);
        alert("Erro ao apagar locador permanentemente");
      }
    }
  };

  if (carregando) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center font-sans">
        <p className="text-gray-500">Carregando informações...</p>
      </div>
    );
  }

  if (!locador) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center font-sans">
        <p className="text-red-500">Locador não encontrado.</p>
      </div>
    );
  }

  const isPJ = locador.tipoPessoa === "JURIDICA";
  const nomeExibicao = isPJ ? locador.razaoSocial || "N/A" : locador.nome || "N/A";
  const documentoExibicao = isPJ ? locador.cnpj || "N/A" : locador.cpf || "N/A";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} nome={nomeUsuario} />
      
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header nome={nomeUsuario} />

        <main className="p-8 max-w-7xl mx-auto w-full flex-1">
          
          <button 
            onClick={() => navigate('/locadores')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar para lista
          </button>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    {nomeExibicao}
                  </h1>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <MapPin size={16} />
                  <span>
                    {locador.endereco?.rua || locador.endereco?.logradouro || "Endereço não informado"}, {locador.endereco?.numero || "S/N"} - {locador.endereco?.cidade || ""} / {locador.endereco?.estado || ""}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                {/* Ações ainda não implementadas */}
                <Button variant="outline" icon={Receipt}>Gerar Recibo de Aluguel</Button>
                <Button variant="outline" icon={FileText}>Gerar Informe de Rendimentos</Button>
                <Button variant="secondary" icon={Edit} onClick={() => setModalEdicaoAberto(true)}>Editar</Button>
                <Button variant="primary" icon={Trash2} onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white border-none">Apagar</Button>
                {localStorage.getItem("@gesimo:role") === "ADMIN" && (
                  <Button variant="primary" icon={Trash2} onClick={handleHardDelete} className="bg-red-900 hover:bg-red-950 text-white border-none">Remoção Definitiva</Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-6 border-t border-gray-100">
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-500 mb-1"><User size={16}/><span>{isPJ ? "CNPJ" : "CPF"}</span></div>
                <div className="font-medium text-gray-900">{documentoExibicao}</div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-500 mb-1"><Mail size={16}/><span>Email</span></div>
                <div className="font-medium text-gray-900">{locador.email || "N/A"}</div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-500 mb-1"><Phone size={16}/><span>Telefone</span></div>
                <div className="font-medium text-gray-900">{locador.telefone || "N/A"}</div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-500 mb-1"><Home size={16}/><span>Imóveis</span></div>
                <div className="font-medium text-gray-900">{imoveis.length} vinculados</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Imóveis vinculados</h2>
              <Button variant="primary" icon={Plus} onClick={() => setModalAtribuirAberto(true)}>
                Atribuir imóvel
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-medium">Imóvel</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Participação do locador</th>
                    <th className="px-4 py-3 font-medium">Posse total atribuída</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {imoveis.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-gray-500 italic">
                        Nenhum imóvel vinculado a este locador.
                      </td>
                    </tr>
                  ) : (
                    imoveis.map((imovel) => (
                      <tr key={imovel.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-4">
                          <button
                            onClick={() => navigate(`/imoveis/${imovel.id}`)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-left"
                          >
                            {enderecoDoImovel(imovel)}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={imovel.status}>{imovel.status}</Badge>
                        </td>
                        <td className="px-4 py-4 text-gray-900 font-medium">
                          {formatarPercentual(percentualDoLocador(imovel))}
                        </td>
                        <td className="px-4 py-4 text-gray-500">
                          {formatarPercentual(somaPosse(imovel.propriedadeimovel))}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => desvincularImovel(imovel)}
                            className="text-red-600 hover:text-red-800 font-medium text-xs"
                          >
                            Desvincular
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <ModalContainer isOpen={modalEdicaoAberto} onClose={() => setModalEdicaoAberto(false)} title="Editar Locador">
        <FormularioLocador initialData={locador} onClose={() => setModalEdicaoAberto(false)} onSuccess={carregarDetalhes} />
      </ModalContainer>

      {modalAtribuirAberto && (
        <ModalContainer isOpen={modalAtribuirAberto} onClose={() => setModalAtribuirAberto(false)} title="Atribuir imóvel ao locador">
          <FormularioAtribuirImovel
            locador={{ id: locador.id, nome: nomeDoLocador(locador) }}
            idsImoveisVinculados={imoveis.map((i) => i.id)}
            onClose={() => setModalAtribuirAberto(false)}
            onSuccess={() => {
              setModalAtribuirAberto(false);
              carregarImoveis();
            }}
          />
        </ModalContainer>
      )}
    </div>
  );
}
