import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Trash2,
  Edit2,
  RefreshCw,
  X,
  Wallet,
  CreditCard,
  Bot
} from 'lucide-react';

interface Despesa {
  id: number;
  cartaoId: number | null;
  cartaoNome: string | null;
  categoriaId: number | null;
  categoriaNome: string | null;
  descricao: string;
  parcelaAtual: number | null;
  totalParcelas: number | null;
  dataDespesa: string | null;
  dataVencimento: string | null;
  valor: number;
  observacao: string | null;
  recorrente: boolean;
  avulso: boolean;
  parcelado: boolean;
}

interface Cartao {
  id: number;
  nome: string;
}

export default function DespesasPage() {
  const token = localStorage.getItem('@financeiro:token') || '';

  // Estados dos Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS');
  const [filtroCartao, setFiltroCartao] = useState<string>('TODOS');

  // Período de Busca
  const [anoAtual, setAnoAtual] = useState<number>(2026);
  const [mesAtual, setMesAtual] = useState<number>(6);

  // Controle de Dados da API
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [categorias, setCategorias] = useState<{ id: number; nome: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Totais retornados do Backend
  const [totalGeral, setTotalGeral] = useState<number>(0);
  const [totalAvulso, setTotalAvulso] = useState<number>(0);
  const [totalParcelado, setTotalParcelado] = useState<number>(0);
  const [totalRecorrente, setTotalRecorrente] = useState<number>(0);

  // Controle de Paginação
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [totalPaginas, setTotalPaginas] = useState<number>(1);
  const [totalItens, setTotalItens] = useState<number>(0);
  const itensPorPagina = 50;

  // Estados de Interface e CRUD
  const [itensSelecionados, setItensSelecionados] = useState<number[]>([]);
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [despesaParaEditar, setDespesaParaEditar] = useState<Despesa | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Estados do Formulário de Despesa
  const [formDescricao, setFormDescricao] = useState<string>('');
  const [formValor, setFormValor] = useState<string>('R$ 0,00');
  const [formDataDespesa, setFormDataDespesa] = useState<string>('2026-06-03');
  const [formDataVencimento, setFormDataVencimento] = useState<string>('2026-06-10');
  const [formCategoria, setFormCategoria] = useState<string>('');
  const [formCartao, setFormCartao] = useState<string>('');
  const [formTipo, setFormTipo] = useState<string>('AVULSO');
  const [formParcelaAtual, setFormParcelaAtual] = useState<string>('0');
  const [formTotalParcelas, setFormTotalParcelas] = useState<string>('0');
  const [formObservacao, setFormObservacao] = useState<string>('');

  // ESTADOS DO NOVO MODAL: NOVA REGRA AUTOMÁTICA
  const [modalRegraAberto, setModalRegraAberto] = useState<boolean>(false);
  const [formRegraDescricao, setFormRegraDescricao] = useState<string>('');
  const [formRegraCategoria, setFormRegraCategoria] = useState<string>('');
  const [formRegraTermo, setFormRegraTermo] = useState<string>('');

  const MESES_NOMES = [
    'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
  ];

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Busca lista de cartões do usuário
  useEffect(() => {
    async function fetchCartoes() {
      try {
        const response = await axios.get('/api/cartoes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (Array.isArray(response.data)) {
          setCartoes(response.data);
        }
      } catch (err) {
        console.error('Erro ao buscar cartões:', err);
      }
    }
    if (token) fetchCartoes();
  }, [token]);

  // Busca categorias
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
        console.warn('Endpoint /api/categorias indisponível. Usando extração dinâmica.');
      }
    }
    if (token) fetchCategorias();
  }, [token]);

  // Função de busca com paginação e filtros estáveis
  const fetchDespesas = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);

      const anoMesStr = `${anoAtual}${String(mesAtual).padStart(2, '0')}`;
      const params = new URLSearchParams({
        anomes: anoMesStr,
        pagina: String(paginaAtual - 1),
        tamanho: String(itensPorPagina),
      });

      if (filtroTipo !== 'TODOS') params.append('tipo', filtroTipo);
      if (filtroCategoria !== 'TODOS') params.append('categoria', filtroCategoria);
      if (filtroCartao !== 'TODOS') {
        params.append('cartao', filtroCartao === 'SEM_CARTAO' ? 'SEM_CARTAO' : filtroCartao);
      }

      const response = await axios.get(`/api/despesas?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = response.data;
      if (data) {
        setDespesas(data.despesas || []);
        setTotalItens(data.totalRegistros || 0);
        setTotalPaginas(data.totalPaginas || 1);
        setTotalGeral(data.valorTotal || 0);
        setTotalAvulso(data.valorTotalAvulso || 0);
        setTotalParcelado(data.valorTotalParcelado || 0);
        setTotalRecorrente(data.valorTotalRecorrente || 0);
      }
    } catch (err: any) {
      console.error('Erro ao carregar despesas:', err);
      setError(err.response?.data?.message || 'Falha ao carregar despesas.');
    } finally {
      setLoading(false);
    }
  }, [token, anoAtual, mesAtual, paginaAtual, filtroTipo, filtroCategoria, filtroCartao, itensPorPagina]);

  useEffect(() => {
    fetchDespesas();
  }, [fetchDespesas]);

  const listaCategorias = categorias.length > 0
    ? categorias
    : despesas.reduce((acc: { id: number; nome: string }[], d) => {
      if (d.categoriaId) {
        const nome = d.categoriaNome || `Categoria ${d.categoriaId}`;
        if (!acc.some(c => c.id === d.categoriaId)) {
          acc.push({ id: d.categoriaId, nome });
        }
      }
      return acc;
    }, [] as { id: number; nome: string }[]);

  const handlePrevMonth = () => {
    if (mesAtual === 1) {
      setMesAtual(12);
      setAnoAtual(prev => prev - 1);
    } else {
      setMesAtual(prev => prev - 1);
    }
    setPaginaAtual(1);
  };

  const handleNextMonth = () => {
    if (mesAtual === 12) {
      setMesAtual(1);
      setAnoAtual(prev => prev + 1);
    } else {
      setMesAtual(prev => prev + 1);
    }
    setPaginaAtual(1);
  };

  const handleInputChangeValor = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (!value) {
      setFormValor('R$ 0,00');
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    const formatted = numericValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    setFormValor(formatted);
  };

  const handleNovaDespesa = () => {
    setDespesaParaEditar(null);
    setFormDescricao('');
    setFormValor('R$ 0,00');
    setFormDataDespesa(`${anoAtual}-${String(mesAtual).padStart(2, '0')}-03`);
    setFormDataVencimento(`${anoAtual}-${String(mesAtual).padStart(2, '0')}-10`);
    setFormCategoria('');
    setFormCartao('');
    setFormTipo('AVULSO');
    setFormParcelaAtual('0');
    setFormTotalParcelas('0');
    setFormObservacao('');
    setModalAberto(true);
  };

  const handleAlterarDespesa = (despesa: Despesa) => {
    setDespesaParaEditar(despesa);
    setFormDescricao(despesa.descricao || '');
    setFormValor(despesa.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    setFormDataDespesa(despesa.dataDespesa || `${anoAtual}-${String(mesAtual).padStart(2, '0')}-03`);
    setFormDataVencimento(despesa.dataVencimento || `${anoAtual}-${String(mesAtual).padStart(2, '0')}-10`);
    setFormCategoria(despesa.categoriaId?.toString() || '');
    setFormCartao(despesa.cartaoId?.toString() || '');
    setFormTipo(despesa.parcelado ? 'PARCELADO' : despesa.recorrente ? 'RECORRENTE' : 'AVULSO');
    setFormParcelaAtual(despesa.parcelaAtual?.toString() || '0');
    setFormTotalParcelas(despesa.totalParcelas?.toString() || '0');
    setFormObservacao(despesa.observacao || '');
    setModalAberto(true);
  };

  // Função gatilho para a criação da regra automática abrindo o novo modal
  const handleCriarRegraAutomatica = (despesa: Despesa) => {
    setFormRegraDescricao(despesa.descricao || '');
    setFormRegraTermo(despesa.descricao || '');

    // Se a despesa já possui uma categoria válida, seleciona ela, senão pega a primeira da lista padrão
    if (despesa.categoriaId) {
      setFormRegraCategoria(despesa.categoriaId.toString());
    } else if (listaCategorias.length > 0) {
      setFormRegraCategoria(listaCategorias[0].id.toString());
    } else {
      setFormRegraCategoria('');
    }

    setModalRegraAberto(true);
  };

  // Salva a regra automática via POST /api/regras com Bearer Token
  const handleSalvarRegra = async () => {
    if (!formRegraTermo.trim()) {
      alert('O campo Termo Busca é obrigatório.');
      return;
    }
    if (!formRegraCategoria) {
      alert('O campo Categoria é obrigatório.');
      return;
    }

    const payload = {
      categoriaId: Number(formRegraCategoria),
      descricao: formRegraDescricao,
      termoBusca: formRegraTermo.trim(),
    };

    try {
      const response = await axios.post('/api/regras', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 200 || response.status === 201) {
        setModalRegraAberto(false);
      } else {
        setToastMessage('Erro ao salvar a regra.');
      }
    } catch (err: any) {
      console.error('Erro ao salvar regra:', err);
      setToastMessage(err.response?.data?.message || 'Erro ao salvar a regra.');
    }
  };

  const handleSalvar = async () => {
    const valorLimpo = formValor.replace(/[^\d,]/g, '').replace(',', '.');
    const valorFinal = parseFloat(valorLimpo);

    const payload = {
      cartaoId: formCartao ? Number(formCartao) : null,
      categoriaId: formCategoria ? Number(formCategoria) : null,
      descricao: formDescricao,
      parcelaAtual: formTipo === 'PARCELADO' ? Number(formParcelaAtual) : 0,
      totalParcelas: formTipo === 'PARCELADO' ? Number(formTotalParcelas) : 0,
      dataDespesa: formDataDespesa,
      dataVencimento: formDataVencimento,
      valor: valorFinal,
      observacao: formObservacao || null,
      recorrente: formTipo === 'RECORRENTE',
    };

    try {
      const url = despesaParaEditar ? `/api/despesas/${despesaParaEditar.id}` : `/api/despesas`;
      const method = despesaParaEditar ? 'put' : 'post';

      const response = await axios({
        method,
        url,
        data: payload,
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200 || response.status === 201) {
        setModalAberto(false);
        if (!despesaParaEditar) setPaginaAtual(1);
        fetchDespesas();
      } else {
        setToastMessage('Erro ao salvar');
      }
    } catch (err) {
      console.error(err);
      setToastMessage('Erro ao salvar');
    }
  };

  const todosDaPaginaSelecionados = despesas.length > 0 &&
    despesas.every(d => itensSelecionados.includes(d.id));

  const handleSelecionarTodos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const idsDaPagina = despesas.map(d => d.id);
      setItensSelecionados(prev => Array.from(new Set([...prev, ...idsDaPagina])));
    } else {
      const idsDaPagina = despesas.map(d => d.id);
      setItensSelecionados(prev => prev.filter(id => !idsDaPagina.includes(id)));
    }
  };

  const handleSelecionarItem = (id: number) => {
    if (itensSelecionados.includes(id)) {
      setItensSelecionados(prev => prev.filter(item => item !== id));
    } else {
      setItensSelecionados(prev => [...prev, id]);
    }
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const indiceInicial = (paginaAtual - 1) * itensPorPagina;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gerenciamento de Despesas</h1>
          <p className="text-sm text-slate-500">Consulte, filtre e gerencie as despesas do sistema de forma dinâmica.</p>
        </div>
        <button
          onClick={handleNovaDespesa}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm cursor-pointer transition-colors whitespace-nowrap self-start sm:self-center"
        >
          + Nova Despesa
        </button>
      </div>

      {/* Setor de Filtros */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 pb-2 font-bold text-sm uppercase tracking-wider">
            <SlidersHorizontal size={16} className="text-slate-500" />
            <span>Filtros</span>
          </div>

          <div className="flex items-center bg-white rounded-xl p-1 border border-slate-200/80 shadow-xs">
            <button onClick={handlePrevMonth} className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg cursor-pointer transition-all">
              <ChevronLeft size={16} />
            </button>
            <div className="px-4 text-xs font-black text-slate-800 tracking-wider min-w-[90px] text-center select-none">
              {anoAtual} - {MESES_NOMES[mesAtual - 1]}
            </div>
            <button onClick={handleNextMonth} className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg cursor-pointer transition-all">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">TIPO DE DESPESA</label>
            <select
              value={filtroTipo}
              onChange={(e) => { setFiltroTipo(e.target.value); setPaginaAtual(1); }}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl p-2.5 outline-none font-semibold h-10 cursor-pointer shadow-xs focus:border-orange-500"
            >
              <option value="TODOS">Todos os Tipos</option>
              <option value="AVULSO">Avulso</option>
              <option value="PARCELADO">Parcelado</option>
              <option value="RECORRENTE">Recorrente</option>
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">CATEGORIA</label>
            <select
              value={filtroCategoria}
              onChange={(e) => { setFiltroCategoria(e.target.value); setPaginaAtual(1); }}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl p-2.5 outline-none font-semibold h-10 cursor-pointer shadow-xs focus:border-orange-500"
            >
              <option value="TODOS">Todas as Categorias</option>
              {listaCategorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">Cartão de Crédito</label>
            <select
              value={filtroCartao}
              onChange={(e) => { setFiltroCartao(e.target.value); setPaginaAtual(1); }}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl p-2.5 outline-none font-semibold h-10 cursor-pointer shadow-xs focus:border-orange-500"
            >
              <option value="TODOS">Todos os Cartões</option>
              {cartoes.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Dinâmicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-50/40 border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Avulso</span><span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span></div>
          <div className="mt-2 text-xl font-black text-slate-900">{loading ? '...' : formatarMoeda(totalAvulso)}</div>
        </div>
        <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-orange-700">Parcelado</span><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span></div>
          <div className="mt-2 text-xl font-black text-orange-950">{loading ? '...' : formatarMoeda(totalParcelado)}</div>
        </div>
        <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-sky-700">Recorrente</span><span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span></div>
          <div className="mt-2 text-xl font-black text-sky-950">{loading ? '...' : formatarMoeda(totalRecorrente)}</div>
        </div>
        <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-rose-800">Total do Mês</span><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span></div>
          <div className="mt-2 text-xl font-black text-rose-950">{loading ? '...' : formatarMoeda(totalGeral)}</div>
        </div>
      </div>

      {/* Ações em Lote */}
      {itensSelecionados.length > 0 && (
        <div className="bg-[#091522] text-white rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md border border-slate-800 transition-all">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-300">
              <span className="text-white font-bold text-sm">{itensSelecionados.length}</span> selecionados
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => alert('Categorizando...')} className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-sky-400 px-3 py-2 rounded-lg border border-slate-700 cursor-pointer">
              <RefreshCw size={14} /> Categorizar Automático
            </button>
            <button onClick={() => setItensSelecionados([])} className="text-xs text-slate-400 hover:text-white font-medium cursor-pointer pl-2">Cancelar</button>
          </div>
        </div>
      )}

      {/* Tabela Principal */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-2 justify-center">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Carregando despesas do servidor...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-rose-500 font-semibold">{error}</div>
          ) : despesas.length > 0 ? (
            <table className="w-full text-sm text-left text-slate-600 table-fixed">
              <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th scope="col" className="w-[5%] px-6 py-4 text-center">
                    <input type="checkbox" checked={todosDaPaginaSelecionados} onChange={handleSelecionarTodos} className="w-4 h-4 text-sky-500 bg-slate-100 border-slate-300 rounded focus:ring-sky-400 cursor-pointer" />
                  </th>
                  <th scope="col" className="w-[35%] px-4 py-4">Descrição</th>
                  <th scope="col" className="w-[14%] px-4 py-4 text-center">Tipo</th>
                  <th scope="col" className="w-[16%] px-4 py-4 text-center">Categoria</th>
                  <th scope="col" className="w-[12%] px-4 py-4 text-center">Vencimento</th>
                  <th scope="col" className="w-[12%] px-6 py-4 text-right">Valor</th>
                  <th scope="col" className="w-[11%] px-4 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {despesas.map((despesa) => {
                  const tipoStr = despesa.parcelado ? 'PARCELADO' : despesa.recorrente ? 'RECORRENTE' : 'AVULSO';
                  return (
                    <tr key={despesa.id} className={`hover:bg-slate-50/70 transition-colors ${itensSelecionados.includes(despesa.id) ? 'bg-sky-50/10' : ''}`}>
                      <td className="px-6 py-4 text-center">
                        <input type="checkbox" checked={itensSelecionados.includes(despesa.id)} onChange={() => handleSelecionarItem(despesa.id)} className="w-4 h-4 text-sky-500 bg-slate-100 border-slate-300 rounded focus:ring-sky-400 cursor-pointer" />
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900 truncate">
                        <div className="flex items-center gap-3">
                          {despesa.cartaoId ? (
                            <div className="p-1.5 bg-orange-50 text-orange-500 border border-orange-100 rounded-lg shrink-0" title={despesa.cartaoNome ? `Cartão: ${despesa.cartaoNome}` : 'Cartão de Crédito'}>
                              <CreditCard size={14} />
                            </div>
                          ) : (
                            <div className="p-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg shrink-0" title="Origem: Dinheiro / Pix / Débito em Conta">
                              <Wallet size={14} />
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="truncate">{despesa.descricao || 'Sem descrição'}</span>
                            {despesa.observacao && <span className="text-[11px] text-slate-400 font-normal italic truncate mt-0.5">{despesa.observacao}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${tipoStr === 'PARCELADO' ? 'bg-orange-50 text-orange-700 border-orange-100' : tipoStr === 'RECORRENTE' ? 'bg-sky-50 text-sky-700 border-sky-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {tipoStr}
                          </span>
                          {tipoStr === 'PARCELADO' && typeof despesa.parcelaAtual === 'number' && despesa.totalParcelas && (
                            <span className="text-[11px] font-bold text-slate-400 mt-0.5">{despesa.parcelaAtual} de {despesa.totalParcelas}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-700 text-center">{despesa.categoriaNome || <span className="text-slate-300">-</span>}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-medium text-slate-500 text-center">{despesa.dataVencimento ? despesa.dataVencimento.split('-').reverse().join('/') : 'N/A'}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">{formatarMoeda(despesa.valor)}</td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* 🤖 Botão Criar Regra de Classificação Automática */}
                          <button
                            onClick={() => handleCriarRegraAutomatica(despesa)}
                            className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-purple-100 hover:text-purple-600 cursor-pointer transition-colors"
                            title="Criar regra de classificação automática para esta despesa"
                          >
                            <Bot size={13} />
                          </button>

                          {/* 📝 Botão Alterar */}
                          <button
                            onClick={() => handleAlterarDespesa(despesa)}
                            className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-sky-100 hover:text-sky-600 cursor-pointer transition-colors"
                            title="Alterar dados desta despesa"
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* 🗑️ Botão Excluir */}
                          <button
                            onClick={() => confirm('Deseja realmente excluir esta despesa?')}
                            className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-rose-100 hover:text-rose-600 cursor-pointer transition-colors"
                            title="Excluir esta despesa permanentemente"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-slate-400 font-medium">Nenhuma despesa encontrada para este período.</div>
          )}
        </div>

        {/* Rodapé Dinâmico */}
        {!loading && !error && (
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
              Exibindo de <span className="font-bold text-slate-800">{totalItens > 0 ? indiceInicial + 1 : 0}</span> a{' '}
              <span className="font-bold text-slate-800">{Math.min(indiceInicial + despesas.length, totalItens)}</span> de um total de{' '}
              <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">{totalItens} despesas</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-slate-400 select-none">Página <span className="text-slate-700 font-bold">{paginaAtual}</span> de <span className="text-slate-700 font-bold">{totalPaginas}</span></span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))} disabled={paginaAtual === 1} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"><ChevronLeft size={16} /></button>
                <button onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))} disabled={paginaAtual === totalPaginas} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"><ChevronRight size={16} /></button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE CADASTRO / ALTERAÇÃO DE DESPESA */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-100 flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
                {despesaParaEditar ? 'Alterar Despesa' : 'Nova Despesa'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">Descrição</label>
                <input type="text" value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} className="p-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none font-semibold text-slate-800 focus:border-orange-400 focus:bg-white transition-colors" placeholder="Ex: Mercado Compre Bem" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">Valor</label>
                <input type="text" value={formValor} onChange={handleInputChangeValor} className="p-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none font-black text-slate-800 focus:border-orange-400 focus:bg-white transition-colors text-sm" placeholder="R$ 0,00" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">Tipo de Despesa</label>
                <select value={formTipo} onChange={(e) => setFormTipo(e.target.value)} className="p-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none font-semibold text-slate-800 focus:border-orange-400 focus:bg-white transition-colors h-10 cursor-pointer">
                  <option value="AVULSO">Avulso (À vista / Mensal único)</option>
                  <option value="PARCELADO">Parcelado (Cartão / Carnê)</option>
                  <option value="RECORRENTE">Recorrente / Fixo</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">Data da Despesa</label>
                <input type="date" value={formDataDespesa} onChange={(e) => setFormDataDespesa(e.target.value)} className="p-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none font-semibold text-slate-800 focus:border-orange-400 focus:bg-white transition-colors" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">Vencimento</label>
                <input type="date" value={formDataVencimento} onChange={(e) => setFormDataVencimento(e.target.value)} className="p-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none font-semibold text-slate-800 focus:border-orange-400 focus:bg-white transition-colors" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">Categoria</label>
                <select
                  value={formCategoria}
                  onChange={(e) => setFormCategoria(e.target.value)}
                  className="p-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none font-semibold text-slate-800 focus:border-orange-400 focus:bg-white transition-colors h-10 cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  {listaCategorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">Cartão de Crédito</label>
                <select value={formCartao} onChange={(e) => setFormCartao(e.target.value)} className="p-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none font-semibold text-slate-800 focus:border-orange-400 focus:bg-white transition-colors h-10 cursor-pointer">
                  <option value="">Nenhum (PIX / Débito)</option>
                  {cartoes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              {formTipo === 'PARCELADO' && (
                <div className="sm:col-span-2 grid grid-cols-2 gap-4 bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-orange-800 uppercase tracking-wide text-[10px]">Parcela Atual</label>
                    <input type="number" min="1" value={formParcelaAtual} onChange={(e) => setFormParcelaAtual(e.target.value)} className="p-2 border border-orange-200 bg-white rounded-lg outline-none font-semibold text-slate-800 focus:border-orange-400" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-orange-800 uppercase tracking-wide text-[10px]">Total Parcelas</label>
                    <input type="number" min="1" value={formTotalParcelas} onChange={(e) => setFormTotalParcelas(e.target.value)} className="p-2 border border-orange-200 bg-white rounded-lg outline-none font-semibold text-slate-800 focus:border-orange-400" />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">Observações</label>
                <input type="text" value={formObservacao} onChange={(e) => setFormObservacao(e.target.value)} className="p-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none font-semibold text-slate-800 focus:border-orange-400 focus:bg-white transition-colors" placeholder="Informações adicionais..." />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setModalAberto(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer">Cancelar</button>
              <button onClick={handleSalvar} className="px-4 py-2 text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 rounded-xl shadow-sm cursor-pointer">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* NOVO MODAL: TELA DE NOVA REGRA AUTOMÁTICA */}
      {modalRegraAberto && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-100 flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Nova Regra</h3>
              <button onClick={() => setModalRegraAberto(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-1 gap-4 text-xs">
              {/* Campo Termo - Obrigatório */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">
                  Termo Busca <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={250}
                  required
                  value={formRegraTermo}
                  onChange={(e) => setFormRegraTermo(e.target.value)}
                  className="p-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none font-semibold text-slate-800 focus:border-orange-400 focus:bg-white transition-colors"
                  placeholder="Ex: POSTO PETROBRAS"
                />
              </div>

              {/* Campo Categoria - Obrigatório (Sem a opção de Selecione) */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">
                  Categoria <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formRegraCategoria}
                  required
                  onChange={(e) => setFormRegraCategoria(e.target.value)}
                  className="p-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none font-semibold text-slate-800 focus:border-orange-400 focus:bg-white transition-colors h-10 cursor-pointer"
                >
                  {listaCategorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>

              {/* Campo Descrição Substituta */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">Descrição Substituta</label>
                <input
                  type="text"
                  maxLength={250}
                  value={formRegraDescricao}
                  onChange={(e) => setFormRegraDescricao(e.target.value)}
                  className="p-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none font-semibold text-slate-800 focus:border-orange-400 focus:bg-white transition-colors"
                  placeholder="Ex: Combustível Carro"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setModalRegraAberto(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer">Cancelar</button>
              <button onClick={handleSalvarRegra} className="px-4 py-2 text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 rounded-xl shadow-sm cursor-pointer">Salvar Regra</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}