import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, MapPin, User, Mail, Phone, FileText, Plus, Receipt, Calculator } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import FormularioLocatario from '../../components/Formularios/FormularioLocatario';
import FormularioVincularImovel from '../../components/Formularios/FormularioVincularImovel';
import ModalGerarMemoriaCalculo from '../../components/Formularios/ModalGerarMemoriaCalculo';
import ModalContainer from '../../components/ModalContainer';
import { api } from '../../services/api';
import { enderecoDoImovel, nomeDoLocatario } from '../../utils/posse';

export default function DetalhesLocatario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditInit = new URLSearchParams(location.search).get('edit') === 'true';

  const [locatario, setLocatario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(isEditInit);
  const [modalVincularAberto, setModalVincularAberto] = useState(false);
  const [modalMemoriaAberto, setModalMemoriaAberto] = useState(false);
  const [contratos, setContratos] = useState([]);

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
      const resposta = await api.get(`/locatarios/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLocatario(resposta.data.data || resposta.data);
    } catch (erro) {
      console.error("Erro ao carregar detalhes do locatário:", erro);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (id) carregarDetalhes();
  }, [id]);

  // O locatário só se liga a um imóvel por meio de contratos de locação
  const carregarContratos = async () => {
    try {
      const resposta = await api.get('/imoveis/contratos', { params: { idLocatario: id } });
      const dados = resposta.data?.data || resposta.data || [];
      setContratos(Array.isArray(dados) ? dados : []);
    } catch (erro) {
      console.error("Erro ao carregar contratos do locatário:", erro);
    }
  };

  useEffect(() => {
    if (id) carregarContratos();
  }, [id]);

  const formatarData = (data) => (data ? new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-');
  const contratosAtivos = contratos.filter((c) => c.status === 'ATIVO');

  const handleDelete = async () => {
    if (window.confirm("Deseja realmente apagar (inativar) este locatário?")) {
      try {
        const token = localStorage.getItem("@gesimo:token");
        await api.delete(`/locatarios/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        navigate('/locatarios');
      } catch (erro) {
        console.error("Erro ao apagar locatário:", erro);
        alert("Erro ao apagar locatário");
      }
    }
  };

  const handleHardDelete = async () => {
    if (window.confirm("ATENÇÃO: Deseja apagar este locatário PERMANENTEMENTE? (Hard Delete)")) {
      try {
        const token = localStorage.getItem("@gesimo:token");
        await api.delete(`/locatarios/${id}/hard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        navigate('/locatarios');
      } catch (erro) {
        console.error("Erro ao apagar locatário permanentemente:", erro);
        alert("Erro ao apagar locatário permanentemente");
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

  if (!locatario) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center font-sans">
        <p className="text-red-500">Locatário não encontrado.</p>
      </div>
    );
  }

  const isPF = !!locatario.pessoaFisica;
  const nomeExibicao = isPF ? locatario.pessoaFisica.nome : locatario.pessoaJuridica?.razaoSocial || "N/A";
  const docExibicao = isPF ? locatario.pessoaFisica.cpf : locatario.pessoaJuridica?.cnpj || "N/A";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} nome={nomeUsuario} />
      
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header nome={nomeUsuario} />

        <main className="p-8 max-w-7xl mx-auto w-full flex-1">
          
          <button 
            onClick={() => navigate('/locatarios')}
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
                    {locatario.endereco || "Endereço não informado"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                {/* Recibo de aluguel: ainda não implementado */}
                <Button variant="outline" icon={Receipt}>Gerar Recibo de Aluguel</Button>
                <span title={contratosAtivos.length === 0 ? "Este locatário não tem um contrato ativo." : ""}>
                  <Button
                    variant="outline"
                    icon={Calculator}
                    disabled={contratosAtivos.length === 0}
                    onClick={() => setModalMemoriaAberto(true)}
                  >
                    Gerar Memória de Cálculo
                  </Button>
                </span>
                <Button variant="secondary" icon={Edit} onClick={() => setModalEdicaoAberto(true)}>Editar</Button>
                <Button variant="primary" icon={Trash2} onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white border-none">Apagar</Button>
                {localStorage.getItem("@gesimo:role") === "ADMIN" && (
                  <Button variant="primary" icon={Trash2} onClick={handleHardDelete} className="bg-red-900 hover:bg-red-950 text-white border-none">Remoção Definitiva</Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-6 border-t border-gray-100">
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-500 mb-1"><User size={16}/><span>{isPF ? "CPF" : "CNPJ"}</span></div>
                <div className="font-medium text-gray-900">{docExibicao}</div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-500 mb-1"><Mail size={16}/><span>Email</span></div>
                <div className="font-medium text-gray-900">{locatario.email || "N/A"}</div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-500 mb-1"><Phone size={16}/><span>Telefone</span></div>
                <div className="font-medium text-gray-900">{locatario.telefone || "N/A"}</div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-500 mb-1"><FileText size={16}/><span>Contratos</span></div>
                <div className="font-medium text-gray-900">{contratosAtivos.length} ativos</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Imóveis / contratos</h2>
              <Button variant="primary" icon={Plus} onClick={() => setModalVincularAberto(true)}>
                Vincular a imóvel
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-medium">Imóvel</th>
                    <th className="px-4 py-3 font-medium">Valor Aluguel</th>
                    <th className="px-4 py-3 font-medium">Início</th>
                    <th className="px-4 py-3 font-medium">Fim</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contratos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-gray-500 italic">
                        Nenhum imóvel vinculado a este locatário.
                      </td>
                    </tr>
                  ) : (
                    contratos.map((contrato) => (
                      <tr key={contrato.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-4">
                          <button
                            onClick={() => navigate(`/imoveis/${contrato.idImovel}`)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-left"
                          >
                            {enderecoDoImovel(contrato.imovel || { id: contrato.idImovel })}
                          </button>
                        </td>
                        <td className="px-4 py-4 text-gray-900 font-medium">
                          {Number(contrato.valorAluguel).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="px-4 py-4 text-gray-500">{formatarData(contrato.dataInicio)}</td>
                        <td className="px-4 py-4 text-gray-500">{formatarData(contrato.dataFim)}</td>
                        <td className="px-4 py-4">
                          <Badge variant={contrato.status}>{contrato.status}</Badge>
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

      <ModalContainer isOpen={modalEdicaoAberto} onClose={() => setModalEdicaoAberto(false)} title="Editar Locatário">
        <FormularioLocatario initialData={locatario} onClose={() => setModalEdicaoAberto(false)} onSuccess={carregarDetalhes} />
      </ModalContainer>

      {modalVincularAberto && (
        <ModalContainer isOpen={modalVincularAberto} onClose={() => setModalVincularAberto(false)} title="Vincular locatário a um imóvel">
          <FormularioVincularImovel
            locatario={{ id: locatario.id, nome: nomeDoLocatario(locatario) }}
            onClose={() => setModalVincularAberto(false)}
            onSuccess={() => {
              setModalVincularAberto(false);
              carregarContratos();
            }}
          />
        </ModalContainer>
      )}

      {modalMemoriaAberto && contratosAtivos.length > 0 && (
        <ModalContainer
          isOpen
          onClose={() => setModalMemoriaAberto(false)}
          title="Gerar Memória de Cálculo"
          largura="max-w-4xl"
        >
          <ModalGerarMemoriaCalculo
            imovelId={contratosAtivos[0].idImovel}
            onClose={() => setModalMemoriaAberto(false)}
          />
        </ModalContainer>
      )}
    </div>
  );
}
