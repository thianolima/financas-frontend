import { useState, useMemo } from 'react';
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

interface Regra {
  id: number;
  descricao: string;
  categoria: string;
  termos: string[];
  tags: string[];
}

interface CategoriaConfig {
  label: string;
}

// Mock: ainda não existem endpoints no backend para Regras, Categorias e Tags.
const CATEGORIAS: Record<string, CategoriaConfig> = {
  Alimentação: { label: 'Alimentação' },
  Transporte: { label: 'Transporte' },
  Assinaturas: { label: 'Assinaturas' },
  Casa: { label: 'Casa' },
  Saúde: { label: 'Saúde' },
  Lazer: { label: 'Lazer' },
  Vestuário: { label: 'Vestuário' },
  Taxas: { label: 'Taxas' },
  'Compras Online': { label: 'Compras Online' },
  Educação: { label: 'Educação' },
  Viagem: { label: 'Viagem' },
  Veículo: { label: 'Veículo' },
  Serviços: { label: 'Serviços' },
  Pet: { label: 'Pet' },
  Impostos: { label: 'Impostos' },
  Seguros: { label: 'Seguros' },
  Presentes: { label: 'Presentes' },
};

// Mock extraído das regras/termos reais cadastrados hoje no banco, para simular a tela final.
const REGRAS_MOCK: Regra[] = [
  { id: 1, descricao: 'AUTO POSTO ADILSON', categoria: 'Transporte', termos: ['ADILSON AUTO'], tags: ['COMBUSTIVEL'] },
  { id: 2, descricao: 'DIARISTA MARIA CLAUDIA', categoria: 'Casa', termos: ['PIX MARIA CLAUDIA'], tags: ['SERVICO'] },
  { id: 3, descricao: 'MARAVILHAS DO LAR', categoria: 'Casa', termos: ['MARAVILHAS D', 'MARAVILHAS DO LAR'], tags: ['MERCADO'] },
  { id: 5, descricao: 'CPFL - COMPANHIA PAULISTA', categoria: 'Casa', termos: ['COMPANHIA PAULISTA', 'CPFL'], tags: ['ENERGIA'] },
  { id: 8, descricao: 'DROGAMAX', categoria: 'Saúde', termos: ['DROGAMAX'], tags: ['FARMACIA'] },
  { id: 12, descricao: 'TAXAS DO CARTAO', categoria: 'Taxas', termos: ['ENCARGOS', 'IOF', 'JUROS'], tags: ['CARTAO'] },
  { id: 15, descricao: 'UBER', categoria: 'Transporte', termos: ['UBER'], tags: ['CITY', 'ONIX', 'BIZ'] },
  { id: 19, descricao: 'MERCADO LIVRE', categoria: 'Compras Online', termos: ['MERCADOLIVRE', 'MP*'], tags: ['ECOMMERCE'] },
  { id: 23, descricao: 'BLUE TREE RESORT', categoria: 'Viagem', termos: ['BLUE TREE'], tags: ['HOTEL'] },
  { id: 24, descricao: 'AMAZON', categoria: 'Compras Online', termos: ['AMAZON'], tags: ['ECOMMERCE'] },
  { id: 30, descricao: 'HOSTINGER', categoria: 'Assinaturas', termos: ['HOSTINGERCOMB'], tags: ['STREAMING'] },
  { id: 34, descricao: 'RENNER', categoria: 'Vestuário', termos: ['RENNER'], tags: ['ROUPAS'] },
  { id: 54, descricao: 'GERAL - ALIMENTACAO', categoria: 'Alimentação', termos: ['ACOUGUE', 'PADARIA', 'SUPER MERCADO', 'SUPERMERCADO'], tags: ['MERCADO'] },
  { id: 59, descricao: 'GERAL - RESTAURANTE', categoria: 'Lazer', termos: ['RESTAURANTE', 'LANCHONETE', 'PIZZARIA', 'HAMBURGUERIA'], tags: ['RESTAURANTES'] },
  { id: 61, descricao: 'IFOOD', categoria: 'Alimentação', termos: ['IFD'], tags: ['DELIVERY'] },
  { id: 79, descricao: 'NETFLIX', categoria: 'Assinaturas', termos: ['NETFLIX'], tags: ['STREAMING'] },
  { id: 82, descricao: 'AULA DE BATERIA', categoria: 'Educação', termos: ['PIX RODRIGO GONCALVES'], tags: ['CURSO'] },
  { id: 112, descricao: 'GERAL - VIAGEM', categoria: 'Viagem', termos: ['ALBERGUE', 'HOTEL', 'POUSADA', 'RESORT'], tags: ['HOTEL'] },
  { id: 282, descricao: 'PORTO SEGURO', categoria: 'Seguros', termos: ['PORTO SEGURO'], tags: ['SEGURO'] },
  { id: 294, descricao: 'CACAU SHOW', categoria: 'Lazer', termos: ['CACAU'], tags: ['DELIVERY', 'RESTAURANTES'] },
];

const FORM_VAZIO = {
  descricao: '',
  categoria: 'Alimentação',
  termos: [] as string[],
  tags: [] as string[],
};

type Aba = 'regras' | 'categorias' | 'tags';

export default function RegraPage() {
  const [regras, setRegras] = useState<Regra[]>(REGRAS_MOCK);
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

  const regrasFiltradas = useMemo(() => {
    return regras.filter((r) => {
      const buscaMatch =
        !busca.trim() ||
        r.descricao.toLowerCase().includes(busca.toLowerCase()) ||
        r.termos.some((t) => t.toLowerCase().includes(busca.toLowerCase()));
      const categoriaMatch = filtroCategoria === 'Todas' || r.categoria === filtroCategoria;
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
    setForm(FORM_VAZIO);
    setNovoTermo('');
    setNovaTag('');
    setErrors({});
    setModalAberto(true);
  };

  const abrirEditar = (r: Regra) => {
    setRegraParaEditar(r);
    setForm({ descricao: r.descricao, categoria: r.categoria, termos: [...r.termos], tags: [...r.tags] });
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
    const termo = novoTermo.trim().toLowerCase();
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
    if (form.termos.length === 0) e.termos = 'Adicione ao menos um termo de match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSalvar = () => {
    if (!validar()) return;

    if (regraParaEditar) {
      setRegras((prev) =>
        prev.map((r) =>
          r.id === regraParaEditar.id
            ? { ...r, descricao: form.descricao.toUpperCase().trim(), categoria: form.categoria, termos: form.termos, tags: form.tags }
            : r
        )
      );
      showToast('Regra atualizada com sucesso!');
    } else {
      const novaRegra: Regra = {
        id: Math.max(0, ...regras.map((r) => r.id)) + 1,
        descricao: form.descricao.toUpperCase().trim(),
        categoria: form.categoria,
        termos: form.termos,
        tags: form.tags,
      };
      setRegras((prev) => [...prev, novaRegra]);
      showToast('Regra cadastrada com sucesso!');
    }
    fecharModal();
  };

  const handleExcluir = (r: Regra) => {
    setRegras((prev) => prev.filter((item) => item.id !== r.id));
    setConfirmacaoExcluir(null);
    setPaginaAtual((prev) => {
      const restantes = regrasFiltradas.filter((item) => item.id !== r.id).length;
      const novoTotalPaginas = Math.max(1, Math.ceil(restantes / itensPorPagina));
      return Math.min(prev, novoTotalPaginas);
    });
    showToast('Regra excluída com sucesso!');
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
                  {Object.keys(CATEGORIAS).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tabela de regras */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600 table-fixed">
                <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="w-[20%] px-3 py-3 text-left">Descrição</th>
                    <th scope="col" className="w-[14%] px-3 py-3 text-center">Categoria</th>
                    <th scope="col" className="w-[14%] px-3 py-3 text-center">Tags</th>
                    <th scope="col" className="w-[40%] px-3 py-3 text-left">Termos</th>
                    <th scope="col" className="w-[12%] px-3 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {regrasPaginadas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-10 text-center text-sm text-slate-400">
                        Nenhuma regra encontrada.
                      </td>
                    </tr>
                  ) : (
                    regrasPaginadas.map((r) => {
                      const cat = CATEGORIAS[r.categoria] ?? CATEGORIAS.Alimentação;
                      const termosVisiveis = r.termos.slice(0, 6);
                      const restante = r.termos.length - termosVisiveis.length;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3 py-3 font-semibold text-slate-700 uppercase truncate">{r.descricao}</td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-xs font-semibold text-slate-700 uppercase">{cat.label}</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {r.tags.length > 0 && (
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-sky-50 text-sky-700 border border-sky-100 max-w-20 truncate" title={r.tags[0]}>
                                  {r.tags[0]}
                                </span>
                                {r.tags.length > 1 && <span className="text-[10px] font-bold text-sky-600">+{r.tags.length - 1}</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {termosVisiveis.map((termo) => (
                                <span key={termo} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 border border-slate-200">
                                  {termo}
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
            </div>

            {/* Rodapé de paginação */}
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
                  placeholder="Ex.: IFOOD"
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
                  value={form.categoria}
                  onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer"
                >
                  {Object.keys(CATEGORIAS).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wide text-slate-500 uppercase mb-1.5">
                  Texto Contendo
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
                    placeholder="Ex.: pizzaria"
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <button
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

              <div>
                <label className="block text-[10px] font-bold tracking-wide text-slate-500 uppercase mb-1.5">
                  Tags
                </label>
                <p className="text-xs text-slate-400 mb-2">Adicione tags automáticas para essa categoria (ex.: DELIVERY, CITY, ONIX).</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novaTag}
                    onChange={(e) => setNovaTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        adicionarTag();
                      }
                    }}
                    placeholder="Ex.: DELIVERY"
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <button
                    onClick={adicionarTag}
                    className="px-4 py-2.5 rounded-xl bg-sky-50 text-sky-600 text-sm font-semibold hover:bg-sky-100 transition-colors cursor-pointer shrink-0"
                  >
                    Adicionar
                  </button>
                </div>

                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {form.tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-sky-700 bg-sky-50 border border-sky-100 px-2.5 py-1.5 rounded-full"
                      >
                        {tag}
                        <button
                          onClick={() => removerTag(tag)}
                          className="text-sky-400 hover:text-rose-500 cursor-pointer"
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
