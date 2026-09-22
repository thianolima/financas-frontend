import { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Edit2,
  Trash2,
  X,
  Search,
  Filter,
  Tag,
  HelpCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Bot,
} from 'lucide-react';

interface RegraTermo {
  id: number;
  regraId: number;
  termoBusca: string;
}

interface Regra {
  id: number;
  categoriaId: number;
  descricao: string;
  termos: RegraTermo[];
  tags?: string[];
}

interface Categoria {
  id: number;
  nome: string;
}

const FORM_VAZIO = {
  descricao: '',
  categoriaId: '',
  termos: [] as string[],
  tags: [] as string[],
};

type Aba = 'regras' | 'categorias' | 'tags';

export default function RegraPage() {
  const token = localStorage.getItem('@financeiro:token') || '';

  const [regras, setRegras] = useState<Regra[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [aba, setAba] = useState<Aba>('regras');
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 50;

  const [modalAberto, setModalAberto] = useState(false);
  const [regraParaEditar, setRegraParaEditar] = useState<Regra | null>(null);
  const [confirmacaoExcluir, setConfirmacaoExcluir] = useState<Regra | null>(null);

  const [form, setForm] = useState(FORM_VAZIO);
  const [novoTermo, setNovoTermo] = useState('');
  const [novaTag, setNovaTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const fetchRegras = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/regras', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(response.data)) {
        setRegras(response.data);
      }
    } catch (err) {
      console.error('Erro ao buscar regras:', err);
      setError('Falha ao carregar regras.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRegras();
  }, [fetchRegras]);

  useEffect(() => {
    async function fetchCategorias() {
      try {
        const response = await axios.get('/api/categorias', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (Array.isArray(response.data)) {
          setCategorias(response.data);
        }
      } catch (err) {
        console.warn('Endpoint /api/categorias indisponível.', err);
      }
    }
    if (token) fetchCategorias();
  }, [token]);

  const nomeCategoria = (categoriaId: number) =>
    categorias.find((c) => c.id === categoriaId)?.nome ?? `Categoria ${categoriaId}`;

  const regrasFiltradas = useMemo(() => {
    return regras.filter((r) => {
      const buscaMatch =
        !busca.trim() ||
        r.descricao.toLowerCase().includes(busca.toLowerCase()) ||
        r.termos.some((t) => t.termoBusca.toLowerCase().includes(busca.toLowerCase()));
      const categoriaMatch = filtroCategoria === 'Todas' || String(r.categoriaId) === filtroCategoria;
      return buscaMatch && categoriaMatch;
    });
  }, [regras, busca, filtroCategoria]);

  const totalPaginas = Math.max(1, Math.ceil(regrasFiltradas.length / itensPorPagina));
  const indiceInicial = (paginaAtual - 1) * itensPorPagina;
  const regrasPaginadas = regrasFiltradas.slice(indiceInicial, indiceInicial + itensPorPagina);

  const handleBuscaChange = (valor: string) => {
    setBusca(valor);
    setPaginaAtual(1);
  };

  const handleFiltroCategoriaChange = (valor: string) => {
    setFiltroCategoria(valor);
    setPaginaAtual(1);
  };

  const abrirNovo = () => {
    setRegraParaEditar(null);
    setForm({ ...FORM_VAZIO, categoriaId: categorias[0] ? String(categorias[0].id) : '' });
    setNovoTermo('');
    setNovaTag('');
    setErrors({});
    setModalAberto(true);
  };

  const abrirEditar = (r: Regra) => {
    setRegraParaEditar(r);
    setForm({
      descricao: r.descricao,
      categoriaId: String(r.categoriaId),
      termos: r.termos.map((t) => t.termoBusca),
      tags: r.tags ? [...r.tags] : [],
    });
    setNovoTermo('');
    setNovaTag('');
    setErrors({});
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setRegraParaEditar(null);
  };

  const adicionarTermo = () => {
    const termo = novoTermo.trim().toUpperCase();
    if (!termo) return;
    if (form.termos.includes(termo)) {
      setNovoTermo('');
      return;
    }
    setForm((f) => ({ ...f, termos: [...f.termos, termo] }));
    setNovoTermo('');
  };

  const removerTermo = (termo: string) => {
    setForm((f) => ({ ...f, termos: f.termos.filter((t) => t !== termo) }));
  };

  const adicionarTag = () => {
    const tag = novaTag.trim().toUpperCase();
    if (!tag) return;
    if (form.tags.includes(tag)) {
      setNovaTag('');
      return;
    }
    setForm((f) => ({ ...f, tags: [...f.tags, tag] }));
    setNovaTag('');
  };

  const removerTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  };

  const validar = () => {
    const e: Record<string, string> = {};
    if (!form.descricao.trim()) e.descricao = 'Descrição é obrigatória.';
    if (!form.categoriaId) e.categoriaId = 'Categoria é obrigatória.';
    if (form.termos.length === 0) e.termos = 'Adicione ao menos um termo de busca.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSalvar = async () => {
    if (!validar()) return;

    const payload = {
      categoriaId: Number(form.categoriaId),
      descricao: form.descricao.toUpperCase().trim(),
      termos: form.termos,
    };

    try {
      if (regraParaEditar) {
        await axios.put(`/api/regras/${regraParaEditar.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast('Regra atualizada com sucesso!');
      } else {
        await axios.post('/api/regras', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast('Regra cadastrada com sucesso!');
      }
      fecharModal();
      fetchRegras();
    } catch (err: any) {
      console.error('Erro ao salvar regra:', err);
      showToast(err.response?.data?.message || 'Erro ao salvar a regra.');
    }
  };

  const handleExcluir = async (r: Regra) => {
    try {
      await axios.delete(`/api/regras/${r.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfirmacaoExcluir(null);
      showToast('Regra excluída com sucesso!');
      fetchRegras();
    } catch (err: any) {
      console.error('Erro ao excluir regra:', err);
      showToast(err.response?.data?.message || 'Erro ao excluir a regra.');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gerenciamento de Regras</h1>
          <p className="text-sm text-slate-500">Cadastre regras para categorizar despesas automaticamente.</p>
        </div>
        <button
          onClick={abrirNovo}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm cursor-pointer transition-colors whitespace-nowrap self-start sm:self-center"
        >
          + Nova Regra
        </button>
      </div>

      {/* Abas */}
      <div className="flex items-center gap-6 border-b border-slate-200">
        {([
          { id: 'regras', label: 'Regras' },
          { id: 'categorias', label: 'Categorias' },
          { id: 'tags', label: 'Tags' },
        ] as { id: Aba; label: string }[]).map((item) => (
          <button
            key={item.id}
            onClick={() => setAba(item.id)}
            className={`pb-3 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
              aba === item.id
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {aba !== 'regras' ? (
        <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-2">
          <Tag size={28} className="text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">
            {aba === 'categorias' ? 'Gerenciamento de Categorias' : 'Gerenciamento de Tags'}
          </p>
          <p className="text-xs text-slate-400">Em breve. Ainda não há endpoint disponível no backend.</p>
        </div>
      ) : (
        <>
          {/* Filtros */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 font-bold text-sm uppercase tracking-wider">
              <Filter size={16} className="text-slate-500" />
              <span>Filtros</span>
            </div>
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-bold tracking-wide text-slate-500 uppercase mb-1.5">Buscar</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => handleBuscaChange(e.target.value)}
                    placeholder="Buscar regra ou termo..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              </div>
              <div className="lg:w-64">
                <label className="block text-[10px] font-bold tracking-wide text-slate-500 uppercase mb-1.5">Categoria</label>
                <select
                  value={filtroCategoria}
                  onChange={(e) => handleFiltroCategoriaChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer"
                >
                  <option value="Todas">Todas as Categorias</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tabela de regras */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-2 justify-center">
                  <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Carregando regras do servidor...</span>
                </div>
              ) : error ? (
                <div className="text-center py-12 text-rose-500 font-semibold">{error}</div>
              ) : (
                <table className="w-full text-sm text-left text-slate-600 table-fixed">
                  <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th scope="col" className="w-[25%] px-3 py-3 text-left">Descrição</th>
                      <th scope="col" className="w-[18%] px-3 py-3 text-center">Categoria</th>
                      <th scope="col" className="w-[45%] px-3 py-3 text-left">Termos</th>
                      <th scope="col" className="w-[12%] px-3 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {regrasPaginadas.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-10 text-center text-sm text-slate-400">
                          Nenhuma regra encontrada.
                        </td>
                      </tr>
                    ) : (
                      regrasPaginadas.map((r) => {
                        const termosVisiveis = r.termos.slice(0, 6);
                        const restante = r.termos.length - termosVisiveis.length;
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-3 py-3 font-semibold text-slate-700 uppercase truncate">{r.descricao}</td>
                            <td className="px-3 py-3 text-center">
                              <span className="text-xs font-semibold text-slate-700 uppercase">{nomeCategoria(r.categoriaId)}</span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {termosVisiveis.map((termoObj) => (
                                  <span key={termoObj.id} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 border border-slate-200">
                                    {termoObj.termoBusca}
                                  </span>
                                ))}
                                {restante > 0 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 border border-slate-200">
                                    +{restante}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => showToast(`Em breve: sugestões automáticas para ${r.descricao}.`)}
                                  className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                  title="Sugerir termos automaticamente"
                                >
                                  <Bot size={16} />
                                </button>
                                <button
                                  onClick={() => abrirEditar(r)}
                                  className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                                  title="Editar regra"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => setConfirmacaoExcluir(r)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Excluir regra"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Rodapé de paginação */}
            {!loading && !error && (
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
                  Exibindo de <span className="font-bold text-slate-800">{regrasFiltradas.length > 0 ? indiceInicial + 1 : 0}</span> a{' '}
                  <span className="font-bold text-slate-800">{Math.min(indiceInicial + regrasPaginadas.length, regrasFiltradas.length)}</span> de um total de{' '}
                  <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">{regrasFiltradas.length} regras</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-slate-400 select-none">Página <span className="text-slate-700 font-bold">{paginaAtual}</span> de <span className="text-slate-700 font-bold">{totalPaginas}</span></span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPaginaAtual((prev) => Math.max(prev - 1, 1))} disabled={paginaAtual === 1} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"><ChevronLeft size={16} /></button>
                    <button onClick={() => setPaginaAtual((prev) => Math.min(prev + 1, totalPaginas))} disabled={paginaAtual === totalPaginas} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"><ChevronRight size={16} /></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal de criação/edição */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 flex flex-col space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
                {regraParaEditar ? 'Alterar Regra' : 'Nova Regra'}
              </h3>
              <button
                onClick={fecharModal}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 text-orange-700 text-xs font-medium rounded-xl px-3 py-3">
                <HelpCircle size={15} className="shrink-0 mt-0.5" />
                <span>Como funciona? Descrições que contiverem um dos termos serão renomeadas e categorizadas automaticamente.</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wide text-slate-500 uppercase mb-1.5">
                  Renomear / Descrição
                </label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex.: AUTO POSTO ADILSON"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                    errors.descricao ? 'border-rose-300' : 'border-slate-200'
                  }`}
                />
                {errors.descricao && <p className="text-xs text-rose-500 mt-1">{errors.descricao}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wide text-slate-500 uppercase mb-1.5">
                  Categoria
                </label>
                <select
                  value={form.categoriaId}
                  onChange={(e) => setForm((f) => ({ ...f, categoriaId: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
                {errors.categoriaId && <p className="text-xs text-rose-500 mt-1">{errors.categoriaId}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wide text-slate-500 uppercase mb-1.5">
                  Texto Contendo (Termos de Busca)
                </label>
                <p className="text-xs text-slate-400 mb-2">Adicione termos que aparecem na descrição da fatura.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novoTermo}
                    onChange={(e) => setNovoTermo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        adicionarTermo();
                      }
                    }}
                    placeholder="Ex.: ADILSON AUTO"
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <button
                    type="button"
                    onClick={adicionarTermo}
                    className="px-4 py-2.5 rounded-xl bg-sky-50 text-sky-600 text-sm font-semibold hover:bg-sky-100 transition-colors cursor-pointer shrink-0"
                  >
                    Adicionar
                  </button>
                </div>
                {errors.termos && <p className="text-xs text-rose-500 mt-1">{errors.termos}</p>}

                {form.termos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {form.termos.map((termo) => (
                      <span
                        key={termo}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg"
                      >
                        {termo}
                        <button
                          type="button"
                          onClick={() => removerTermo(termo)}
                          className="text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
              <button
                onClick={fecharModal}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                className="px-4 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmacaoExcluir && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 flex flex-col space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Excluir Regra</h3>
            <p className="text-sm text-slate-500">
              Tem certeza que deseja excluir a regra <span className="font-semibold text-slate-700">{confirmacaoExcluir.descricao}</span>? Essa ação não poderá ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmacaoExcluir(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleExcluir(confirmacaoExcluir)}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[100] bg-[#091522] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700">
          <ShieldCheck size={16} className="text-emerald-400" />
          {toastMsg}
        </div>
      )}
    </div>
  );
}