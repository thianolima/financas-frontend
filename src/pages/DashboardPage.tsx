import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Calendar, CreditCard, PieChart } from 'lucide-react';

const MESES_NOMES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

const CORES_DONUT = [
  '#0d9488', '#2563eb', '#f59e0b', '#e11d48', '#8b5cf6',
  '#14b8a6', '#f97316', '#334155', '#22c55e', '#ec4899',
  '#06b6d4', '#6366f1', '#d97706', '#dc2626', '#a855f7',
  '#0f766e', '#1d4ed8', '#b45309', '#be123c', '#7e22ce'
];

// --- Interfaces do endpoint /dashboard ---
interface DashboardRankingItem {
  categoriaNome: string;
  valorTotal: number;
  percentual: number;
}

interface DashboardTotalItem {
  tipoDespesa: 'AVULSO' | 'PARCELADO' | 'RECORRENTE' | 'TOTAL';
  valor: number;
  percentualDiferenca: number;
}

interface DashboardLimiteCartao {
  cartaoId: number;
  nome: string;
  bandeira: string;
  numeroFinal: string;
  titular: string;
  cor: string;
  valorLimite: number;
  valorLimiteUtilizado: number;
}

interface DashboardHistoricoItem {
  mes: number;
  valorTotal: number;
  projecao: boolean;
}

interface DashboardResponse {
  cardRankingCategorias: DashboardRankingItem[];
  cardDespesasPorCategoria: DashboardRankingItem[];
  cardTotaisDespesas: DashboardTotalItem[];
  cardLimitesCartoes: DashboardLimiteCartao[];
  cardDespesasPorHistorico: DashboardHistoricoItem[];
}

const DASHBOARD_RESPONSE_INICIAL: DashboardResponse = {
  cardRankingCategorias: [],
  cardDespesasPorCategoria: [],
  cardTotaisDespesas: [],
  cardLimitesCartoes: [],
  cardDespesasPorHistorico: [],
};

// Interface interna do gráfico
interface PontoHistoricoDespesa {
  mes: number;
  label: string;
  valor: number;
  isProjecao: boolean;
}

const obterGradientePorCor = (corKey: string) => {
  const keyUpper = (corKey || '').toUpperCase().trim();
  switch (keyUpper) {
    case 'PRETO':
    case 'BLACK':
      return 'from-slate-800 to-slate-950';
    case 'ROXO':
    case 'PURPLE':
      return 'from-purple-600 to-indigo-700';
    case 'VERDE':
    case 'GREEN':
      return 'from-emerald-600 to-teal-700';
    case 'VERMELHO':
    case 'RED':
      return 'from-rose-600 to-red-700';
    case 'LARANJA':
    case 'ORANGE':
      return 'from-orange-500 to-amber-600';
    case 'ROSA':
    case 'PINK':
      return 'from-pink-500 to-rose-500';
    case 'PRATA':
    case 'SILVER':
      return 'from-slate-400 to-slate-500';
    case 'AZUL':
    case 'BLUE':
      return 'from-blue-500 to-indigo-600';
    default:
      return 'from-blue-600 to-indigo-600';
  }
};

export default function Dashboard() {
  const token = localStorage.getItem('@financeiro:token') || '';
  const [anoAtual, setAnoAtual] = useState<number>(() => new Date().getFullYear());
  const [mesAtual, setMesAtual] = useState<number>(() => new Date().getMonth() + 1);
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);
  const [erroDashboard, setErroDashboard] = useState<string | null>(null);
  const [dadosDashboard, setDadosDashboard] = useState<DashboardResponse>(DASHBOARD_RESPONSE_INICIAL);

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const totaisDespesas = useMemo(() => {
    const totais = dadosDashboard.cardTotaisDespesas;
    const encontrar = (tipo: DashboardTotalItem['tipoDespesa']) =>
      totais.find((t) => t.tipoDespesa === tipo) ?? { tipoDespesa: tipo, valor: 0, percentualDiferenca: 0 };
    return {
      avulso: encontrar('AVULSO'),
      parcelado: encontrar('PARCELADO'),
      recorrente: encontrar('RECORRENTE'),
      total: encontrar('TOTAL'),
    };
  }, [dadosDashboard.cardTotaisDespesas]);

  const despesasPorCategoriaMes = useMemo(() => {
    return dadosDashboard.cardDespesasPorCategoria.map((item) => ({
      categoria: item.categoriaNome,
      valorTotal: item.valorTotal,
      percentual: item.percentual,
    }));
  }, [dadosDashboard.cardDespesasPorCategoria]);

  const totalDespesasCategoriaMes = useMemo(
    () => despesasPorCategoriaMes.reduce((acc, item) => acc + item.valorTotal, 0),
    [despesasPorCategoriaMes]
  );

  const donutCategorias = useMemo(() => {
    if (totalDespesasCategoriaMes <= 0) {
      return [] as Array<{
        categoria: string;
        valorTotal: number;
        percentual: number;
        cor: string;
        strokeLength: number;
        strokeOffset: number;
      }>;
    }

    let acumulado = 0;
    return despesasPorCategoriaMes.map((item, index) => {
      const percentual = item.percentual / 100;
      const strokeLength = percentual * 100;
      const segmento = {
        categoria: item.categoria,
        valorTotal: item.valorTotal,
        percentual,
        cor: CORES_DONUT[index % CORES_DONUT.length],
        strokeLength,
        strokeOffset: acumulado,
      };
      acumulado += strokeLength;
      return segmento;
    });
  }, [despesasPorCategoriaMes, totalDespesasCategoriaMes]);

  // Mapeamento direto do histórico via response do backend
  const historicoDespesasPontos = useMemo<PontoHistoricoDespesa[]>(() => {
    return (dadosDashboard.cardDespesasPorHistorico || []).map((item) => {
      const nomeMes = MESES_NOMES[item.mes - 1] || '';
      const label = nomeMes ? nomeMes.charAt(0) + nomeMes.slice(1).toLowerCase() : '';
      return {
        mes: item.mes,
        label,
        valor: item.valorTotal,
        isProjecao: item.projecao,
      };
    });
  }, [dadosDashboard.cardDespesasPorHistorico]);

  const historicoPossuiProjecao = useMemo(
    () => historicoDespesasPontos.some((ponto) => ponto.isProjecao),
    [historicoDespesasPontos]
  );

  const chartPoints = useMemo(() => {
    const valores = historicoDespesasPontos.map((ponto) => ponto.valor);
    if (valores.length === 0) return [];
    const max = Math.max(...valores);
    const min = Math.min(...valores);
    const range = max - min || 1;

    const padding = 28;
    const heightRange = 40;

    return valores.map((val) => {
      const pct = padding + (1 - (val - min) / range) * heightRange;
      return pct;
    });
  }, [historicoDespesasPontos]);

  const xPoints = useMemo(() => {
    const quantidade = historicoDespesasPontos.length;
    if (quantidade <= 1) return [150];

    const inicio = 50;
    const fim = 250;
    const passo = (fim - inicio) / (quantidade - 1);

    return historicoDespesasPontos.map((_, idx) => inicio + passo * idx);
  }, [historicoDespesasPontos]);

  const historicoLinePath = useMemo(() => {
    const indicesReais = historicoDespesasPontos
      .map((ponto, idx) => (!ponto.isProjecao ? idx : -1))
      .filter((idx) => idx >= 0);

    if (indicesReais.length < 2) return '';

    let path = `M ${xPoints[indicesReais[0]]} ${chartPoints[indicesReais[0]]}`;
    for (let i = 1; i < indicesReais.length; i++) {
      const idx = indicesReais[i];
      path += ` L ${xPoints[idx]} ${chartPoints[idx]}`;
    }

    return path;
  }, [chartPoints, historicoDespesasPontos, xPoints]);

  const historicoFillPath = useMemo(() => {
    const indicesReais = historicoDespesasPontos
      .map((ponto, idx) => (!ponto.isProjecao ? idx : -1))
      .filter((idx) => idx >= 0);

    if (indicesReais.length < 2) return '';

    const primeiroIdx = indicesReais[0];
    let path = `M ${xPoints[primeiroIdx]} 100 L ${xPoints[primeiroIdx]} ${chartPoints[primeiroIdx]}`;
    for (let i = 1; i < indicesReais.length; i++) {
      const idx = indicesReais[i];
      path += ` L ${xPoints[idx]} ${chartPoints[idx]}`;
    }
    const ultimoIdx = indicesReais[indicesReais.length - 1];
    path += ` L ${xPoints[ultimoIdx]} 100 Z`;

    return path;
  }, [chartPoints, historicoDespesasPontos, xPoints]);

  const projecaoLinePath = useMemo(() => {
    if (!historicoPossuiProjecao) return '';

    const indicesProjecao = historicoDespesasPontos
      .map((ponto, idx) => (ponto.isProjecao ? idx : -1))
      .filter((idx) => idx >= 0);

    const primeiroIndiceProjecao = indicesProjecao[0];
    const inicioLinha = Math.max(primeiroIndiceProjecao - 1, 0);

    let path = `M ${xPoints[inicioLinha]} ${chartPoints[inicioLinha]}`;
    indicesProjecao.forEach((idx) => {
      path += ` L ${xPoints[idx]} ${chartPoints[idx]}`;
    });

    return path;
  }, [chartPoints, historicoDespesasPontos, historicoPossuiProjecao, xPoints]);

  const buscarDadosDashboard = useCallback(async () => {
    if (!token) {
      setDadosDashboard(DASHBOARD_RESPONSE_INICIAL);
      setErroDashboard('Token de autenticação não encontrado.');
      setLoadingDashboard(false);
      return;
    }

    try {
      setLoadingDashboard(true);
      setErroDashboard(null);

      const dataReferencia = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`;

      const responseDashboard = await axios.get(`/api/dashboard?datareferencia=${dataReferencia}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDadosDashboard(responseDashboard.data as DashboardResponse);
    } catch (error: unknown) {
      console.error('Erro ao carregar dados do dashboard:', error);
      if (axios.isAxiosError(error)) {
        setErroDashboard(error.response?.data?.message || 'Falha ao carregar dados do dashboard.');
      } else {
        setErroDashboard('Falha ao carregar dados do dashboard.');
      }
    } finally {
      setLoadingDashboard(false);
    }
  }, [anoAtual, mesAtual, token]);

  useEffect(() => {
    void buscarDadosDashboard();
  }, [buscarDadosDashboard]);

  const limiteProximoMesAtingido = useMemo(() => {
    const hoje = new Date();
    const anoLimite = hoje.getFullYear();
    const mesLimite = hoje.getMonth() + 1;
    return anoAtual > anoLimite || (anoAtual === anoLimite && mesAtual >= mesLimite);
  }, [anoAtual, mesAtual]);

  const handlePrevMonth = () => {
    if (mesAtual === 1) {
      setMesAtual(12);
      setAnoAtual((prev) => prev - 1);
    } else {
      setMesAtual((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (limiteProximoMesAtingido) return;
    if (mesAtual === 12) {
      setMesAtual(1);
      setAnoAtual((prev) => prev + 1);
    } else {
      setMesAtual((prev) => prev + 1);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Seja bem-vindo!
          </h1>
          <p className="text-slate-500 text-sm md:text-base mt-1">
            Controle sua vida financeira de forma simples e eficiente.
          </p>
        </div>

        <div className="flex items-center bg-white rounded-xl p-1 border border-slate-200/80 shadow-xs self-start sm:self-center">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg cursor-pointer transition-all"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="px-4 text-xs font-black text-slate-800 tracking-wider min-w-22.5 text-center select-none">
            {anoAtual} - {MESES_NOMES[mesAtual - 1]}
          </div>
          <button
            onClick={handleNextMonth}
            disabled={limiteProximoMesAtingido}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent rounded-lg cursor-pointer transition-all"
            aria-label="Próximo mês"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {erroDashboard && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm font-semibold">
          {erroDashboard}
        </div>
      )}

      {/* Cards de Resumo Superior */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-50/40 border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Avulso</span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
          </div>
          <div className="mt-2 text-xl font-black text-slate-900">{loadingDashboard ? '...' : formatarMoeda(totaisDespesas.avulso.valor)}</div>
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full bg-white border border-slate-200 px-2.5 py-1 text-[10px] font-extrabold text-slate-900 tracking-wide uppercase">
              {loadingDashboard ? 'carregando...' : `${totaisDespesas.avulso.percentualDiferenca > 0 ? '+' : ''}${totaisDespesas.avulso.percentualDiferenca.toFixed(2).replace('.', ',')}% vs. mês anterior`}
            </span>
          </div>
        </div>

        <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-700">Parcelado</span>
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          </div>
          <div className="mt-2 text-xl font-black text-orange-950">{loadingDashboard ? '...' : formatarMoeda(totaisDespesas.parcelado.valor)}</div>
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full bg-white border border-orange-200 px-2.5 py-1 text-[10px] font-extrabold text-orange-950 tracking-wide uppercase">
              {loadingDashboard ? 'carregando...' : `${totaisDespesas.parcelado.percentualDiferenca > 0 ? '+' : ''}${totaisDespesas.parcelado.percentualDiferenca.toFixed(2).replace('.', ',')}% vs. mês anterior`}
            </span>
          </div>
        </div>

        <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">Recorrente</span>
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
          </div>
          <div className="mt-2 text-xl font-black text-sky-950">{loadingDashboard ? '...' : formatarMoeda(totaisDespesas.recorrente.valor)}</div>
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full bg-white border border-sky-200 px-2.5 py-1 text-[10px] font-extrabold text-sky-950 tracking-wide uppercase">
              {loadingDashboard ? 'carregando...' : `${totaisDespesas.recorrente.percentualDiferenca > 0 ? '+' : ''}${totaisDespesas.recorrente.percentualDiferenca.toFixed(2).replace('.', ',')}% vs. mês anterior`}
            </span>
          </div>
        </div>

        <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">Total de Despesa</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          </div>
          <div className="mt-2 text-xl font-black text-rose-950">{loadingDashboard ? '...' : formatarMoeda(totaisDespesas.total.valor)}</div>
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full bg-white border border-rose-200 px-2.5 py-1 text-[10px] font-extrabold text-rose-950 tracking-wide uppercase">
              {loadingDashboard ? 'carregando...' : `${totaisDespesas.total.percentualDiferenca > 0 ? '+' : ''}${totaisDespesas.total.percentualDiferenca.toFixed(2).replace('.', ',')}% vs. mês anterior`}
            </span>
          </div>
        </div>
      </div>

      {/* LINHA 1: Histórico + Limites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Histórico de Despesas */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-50 text-teal-600 rounded-xl">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-900">Histórico de Despesas</h2>
              <p className="text-xs text-slate-500">Últimos 3 meses no período selecionado.</p>
            </div>
          </div>

          <div className="relative w-full h-52 select-none my-auto">
            <div
              className="absolute inset-0 grid gap-2.5 z-0"
              style={{ gridTemplateColumns: `repeat(${historicoDespesasPontos.length}, minmax(0, 1fr))` }}
            >
              {historicoDespesasPontos.map((ponto, idx) => (
                <div
                  key={`compact-${ponto.mes}-${idx}`}
                  className={`rounded-2xl border flex flex-col justify-between items-center py-3 px-2 shadow-xs ${ponto.isProjecao
                    ? 'bg-blue-50/60 border-blue-200/80'
                    : 'bg-slate-50/40 border-slate-200/70'
                    }`}
                >
                  <span className={`font-bold text-sm ${ponto.isProjecao ? 'text-blue-700' : 'text-slate-600'}`}>
                    {ponto.label}
                  </span>

                  <div className="h-8 w-full" />

                  <span className={`font-extrabold text-xs md:text-sm tracking-tight text-center ${ponto.isProjecao ? 'text-blue-900' : 'text-slate-800'}`}>
                    {formatarMoeda(ponto.valor)}
                  </span>
                </div>
              ))}
            </div>

            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              viewBox="0 0 300 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="curveGradientCompact" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {historicoFillPath && <path d={historicoFillPath} fill="url(#curveGradientCompact)" />}

              {historicoLinePath && (
                <path
                  d={historicoLinePath}
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {projecaoLinePath && (
                <path
                  d={projecaoLinePath}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="6 5"
                />
              )}
            </svg>

            <div className="absolute inset-0 pointer-events-none z-20">
              {historicoDespesasPontos.map((ponto, idx) => {
                const xPct = `${(xPoints[idx] / 300) * 100}%`;
                const yPct = `${chartPoints[idx]}%`;
                return (
                  <div
                    key={`compact-point-${idx}`}
                    className={`absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2 ${ponto.isProjecao ? 'bg-blue-600 ring-2 ring-blue-200' : 'bg-teal-600'
                      }`}
                    style={{ left: xPct, top: yPct }}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
              Realizadas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              Projeção
            </span>
          </div>
        </div>

        {/* Limites de Cartões */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-900">Limites de Cartões</h2>
              <p className="text-xs text-slate-500">Utilização do limite de crédito disponível.</p>
            </div>
          </div>

          <div className="space-y-3.5 my-auto">
            {loadingDashboard ? (
              <div className="text-center py-4 text-xs text-slate-400 font-semibold">Carregando cartões...</div>
            ) : dadosDashboard.cardLimitesCartoes.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400 font-semibold">Nenhum cartão encontrado.</div>
            ) : dadosDashboard.cardLimitesCartoes.map((cartao) => {
              const percentual = cartao.valorLimite > 0 ? (cartao.valorLimiteUtilizado / cartao.valorLimite) * 100 : 0;
              const gradiente = obterGradientePorCor(cartao.cor);

              return (
                <div key={cartao.cartaoId} className="space-y-1">
                  <div className="flex items-start justify-between gap-2 text-xs md:text-sm font-bold text-slate-700">
                    <span className="min-w-0 truncate">{cartao.nome} <span className="text-[10px] text-slate-400 font-semibold">({cartao.bandeira} • {cartao.numeroFinal})</span></span>
                    <span className="text-[11px] text-slate-500 font-semibold">{percentual.toFixed(0)}%</span>
                  </div>

                  <div className="relative w-full h-2 rounded-full overflow-hidden bg-slate-100/80 border border-slate-200/30">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${gradiente} transition-all duration-500`}
                      style={{ width: `${Math.min(100, percentual)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>Utilizado: <span className="text-slate-800">{formatarMoeda(cartao.valorLimiteUtilizado)}</span></span>
                    <span>Limite: <span className="text-slate-800">{formatarMoeda(cartao.valorLimite)}</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* LINHA 2: Despesas por Categoria */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-6">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <div className="p-2 bg-cyan-50 text-cyan-700 rounded-xl">
            <PieChart size={20} />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900">Despesas por Categoria</h2>
            <p className="text-xs md:text-sm text-slate-500">Visão geral consolidada do mês selecionado.</p>
          </div>
        </div>

        {loadingDashboard ? (
          <div className="text-center py-12 text-xs text-slate-400 font-semibold">Carregando categorias...</div>
        ) : totalDespesasCategoriaMes <= 0 ? (
          <div className="text-center py-12 text-xs text-slate-400 font-semibold">Sem despesas no mês selecionado.</div>
        ) : (
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 py-2">

            {/* Donut centralizado */}
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-xs">
                <circle
                  cx="60"
                  cy="60"
                  r="44"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="12"
                />
                {donutCategorias.map((segmento) => (
                  <circle
                    key={`donut-${segmento.categoria}`}
                    cx="60"
                    cy="60"
                    r="44"
                    fill="none"
                    stroke={segmento.cor}
                    strokeWidth="12"
                    strokeLinecap="butt"
                    pathLength={100}
                    strokeDasharray={`${segmento.strokeLength} ${100 - segmento.strokeLength}`}
                    strokeDashoffset={-segmento.strokeOffset}
                    transform="rotate(-90 60 60)"
                    className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                  />
                ))}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
                <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">TOTAL</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  {formatarMoeda(totalDespesasCategoriaMes)}
                </span>
                <span className="text-[11px] font-bold text-slate-400 mt-1">
                  {donutCategorias.length} categorias
                </span>
              </div>
            </div>

            {/* Grid de Legendas */}
            <div className="w-full flex-1 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {donutCategorias.map((segmento) => (
                  <div
                    key={`legend-${segmento.categoria}`}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: segmento.cor }} />
                      <span className="font-bold text-xs text-slate-700 truncate" title={segmento.categoria}>
                        {segmento.categoria}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-xs text-slate-900 block">{formatarMoeda(segmento.valorTotal)}</span>
                      <span className="text-[10px] font-extrabold text-slate-400">
                        {(segmento.percentual * 100).toFixed(1).replace('.', ',')}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}