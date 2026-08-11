import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Calendar, CreditCard, Trophy, PieChart } from 'lucide-react';

const MESES_NOMES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const CATEGORIAS_MOCK = [
  'Alimentacao',
  'Transporte',
  'Moradia',
  'Saude',
  'Lazer',
  'Educacao',
  'Assinaturas',
  'Compras',
  'Pets',
  'Viagens',
  'Farmacia',
  'Servicos',
  'Impostos',
  'Manutencao',
  'Outros',
];

const CORES_CATEGORIAS = [
  'bg-emerald-500',
  'bg-indigo-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
];

const CORES_TRACK_CATEGORIAS = [
  'bg-emerald-100/50',
  'bg-indigo-100/50',
  'bg-amber-100/50',
  'bg-rose-100/50',
  'bg-sky-100/50',
];

const CORES_DONUT = [
  '#0d9488',
  '#2563eb',
  '#f59e0b',
  '#e11d48',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#334155',
  '#22c55e',
  '#ec4899',
];


interface TotaisPorTipo {
  avulso: number;
  parcelado: number;
  recorrente: number;
  total: number;
}

interface RankingDespesaItem {
  categoria: string;
  qtdLancamentos: number;
  valorTotal: number;
}

interface CartaoBackend {
  id: number;
  nome: string;
  bandeira: string;
  numeroFinal: string;
  valorLimite: number;
  cor: string;
}

interface LimiteCartaoCalculado {
  valorLimite: number;
  valorLimiteUtilizado: number;
}

interface DespesaMesAtualItem {
  categoriaNome?: string | null;
  valor?: number;
}

interface ProjecaoMesInfo {
  anoMes: string | number;
  valorTotal?: number;
}

interface PontoHistoricoDespesa {
  ano: number;
  mes: number;
  label: string;
  valor: number;
  isAtual: boolean;
  isProjecao: boolean;
}

interface MesPeriodoInfo {
  ano: number;
  mes: number;
  anoMes: string;
}

const TOTAIS_INICIAIS: TotaisPorTipo = {
  avulso: 0,
  parcelado: 0,
  recorrente: 0,
  total: 0,
};

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
    default:
      return 'from-blue-600 to-indigo-600';
  }
};

export default function Dashboard() {
  const token = localStorage.getItem('@financeiro:token') || '';
  const [anoAtual, setAnoAtual] = useState<number>(() => new Date().getFullYear());
  const [mesAtual, setMesAtual] = useState<number>(() => new Date().getMonth() + 1);
  const [loadingTotais, setLoadingTotais] = useState<boolean>(true);
  const [erroTotais, setErroTotais] = useState<string | null>(null);
  const [totaisMesAtual, setTotaisMesAtual] = useState<TotaisPorTipo>(TOTAIS_INICIAIS);
  const [totaisMesAnterior, setTotaisMesAnterior] = useState<TotaisPorTipo>(TOTAIS_INICIAIS);

  const [cartoes, setCartoes] = useState<CartaoBackend[]>([]);
  const [limitesPorCartao, setLimitesPorCartao] = useState<Record<number, LimiteCartaoCalculado>>({});
  const [loadingCartoes, setLoadingCartoes] = useState<boolean>(true);

  const [despesasMesAtual, setDespesasMesAtual] = useState<DespesaMesAtualItem[]>([]);
  const [loadingDespesas, setLoadingDespesas] = useState<boolean>(true);
  const [totaisHistoricoPorAnoMes, setTotaisHistoricoPorAnoMes] = useState<Record<string, number>>({});
  const [projecoesPorAnoMes, setProjecoesPorAnoMes] = useState<Record<string, number>>({});
  const [, setLoadingProjecao] = useState<boolean>(false);

  const formatarAnoMes = (ano: number, mes: number) => `${ano}${String(mes).padStart(2, '0')}`;

  const obterMesAnterior = (ano: number, mes: number) => {
    if (mes === 1) {
      return { ano: ano - 1, mes: 12 };
    }

    return { ano, mes: mes - 1 };
  };

  const adicionarMeses = (ano: number, mes: number, delta: number) => {
    const data = new Date(ano, mes - 1 + delta, 1);
    return {
      ano: data.getFullYear(),
      mes: data.getMonth() + 1,
    };
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const rankingTop5Mock = useMemo<RankingDespesaItem[]>(() => {
    const semente = anoAtual * 100 + mesAtual;

    return CATEGORIAS_MOCK.map((categoria, index) => {
      const score = ((semente + index * 37) % 100) + 1;
      const qtdLancamentos = Math.max(3, Math.round(score / 4));
      const fatorCategoria = (index % 5) + 1;
      const valorTotal = Number((qtdLancamentos * fatorCategoria * 24.6 + score * 11.2).toFixed(2));

      return {
        categoria,
        qtdLancamentos,
        valorTotal,
      };
    })
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, 5);
  }, [anoAtual, mesAtual]);

  const rankingCategoriasExibicao = useMemo(() => {
    if (despesasMesAtual.length > 0) {
      const agrupado: Record<string, number> = {};
      despesasMesAtual.forEach((d) => {
        const cat = d.categoriaNome || 'Outros';
        agrupado[cat] = (agrupado[cat] || 0) + (d.valor || 0);
      });

      return Object.entries(agrupado)
        .map(([categoria, valorTotal]) => ({
          categoria,
          valorTotal,
          qtdLancamentos: despesasMesAtual.filter(d => (d.categoriaNome || 'Outros') === categoria).length,
        }))
        .sort((a, b) => b.valorTotal - a.valorTotal)
        .slice(0, 5);
    }

    return rankingTop5Mock;
  }, [despesasMesAtual, rankingTop5Mock]);

  const totalRankingRealOuMock = useMemo(
    () => rankingCategoriasExibicao.reduce((soma, item) => soma + item.valorTotal, 0),
    [rankingCategoriasExibicao]
  );

  const totalMensalParaPercentual = useMemo(() => {
    return totaisMesAtual.total > 0 ? totaisMesAtual.total : totalRankingRealOuMock;
  }, [totaisMesAtual.total, totalRankingRealOuMock]);

  const despesasPorCategoriaMes = useMemo(() => {
    if (despesasMesAtual.length === 0) {
      return [] as Array<{ categoria: string; valorTotal: number }>;
    }

    const agrupado: Record<string, number> = {};
    despesasMesAtual.forEach((item) => {
      const categoria = item.categoriaNome || 'Outros';
      agrupado[categoria] = (agrupado[categoria] || 0) + (item.valor || 0);
    });

    return Object.entries(agrupado)
      .map(([categoria, valorTotal]) => ({ categoria, valorTotal }))
      .sort((a, b) => b.valorTotal - a.valorTotal);
  }, [despesasMesAtual]);

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
      const percentual = item.valorTotal / totalDespesasCategoriaMes;
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

  const hoje = useMemo(() => new Date(), []);
  const anoMesAtualReal = useMemo(() => {
    return Number(formatarAnoMes(hoje.getFullYear(), hoje.getMonth() + 1));
  }, [hoje]);
  const mesSelecionadoEhAtual = useMemo(() => {
    return Number(formatarAnoMes(anoAtual, mesAtual)) === anoMesAtualReal;
  }, [anoAtual, mesAtual, anoMesAtualReal]);

  const formatarLabelMes = (ano: number, mes: number) => {
    const nomeCompleto = MESES_NOMES[mes - 1];
    const nomeFormatado = nomeCompleto.charAt(0) + nomeCompleto.slice(1).toLowerCase();
    return `${nomeFormatado}/${String(ano).slice(-2)}`;
  };

  const periodoHistorico = useMemo<MesPeriodoInfo[]>(() => {
    const periodo: MesPeriodoInfo[] = [];
    for (let delta = -2; delta <= 0; delta++) {
      const data = adicionarMeses(anoAtual, mesAtual, delta);
      periodo.push({
        ano: data.ano,
        mes: data.mes,
        anoMes: formatarAnoMes(data.ano, data.mes),
      });
    }

    return periodo;
  }, [anoAtual, mesAtual]);

  const periodoCompletoGrafico = useMemo<MesPeriodoInfo[]>(() => {
    if (!mesSelecionadoEhAtual) {
      return periodoHistorico;
    }

    const mesAnterior = adicionarMeses(anoAtual, mesAtual, -1);
    const mesSelecionado = { ano: anoAtual, mes: mesAtual };
    const proximoMes = adicionarMeses(anoAtual, mesAtual, 1);

    return [
      {
        ano: mesAnterior.ano,
        mes: mesAnterior.mes,
        anoMes: formatarAnoMes(mesAnterior.ano, mesAnterior.mes),
      },
      {
        ano: mesSelecionado.ano,
        mes: mesSelecionado.mes,
        anoMes: formatarAnoMes(mesSelecionado.ano, mesSelecionado.mes),
      },
      {
        ano: proximoMes.ano,
        mes: proximoMes.mes,
        anoMes: formatarAnoMes(proximoMes.ano, proximoMes.mes),
      },
    ];
  }, [mesSelecionadoEhAtual, periodoHistorico, anoAtual, mesAtual]);

  const historicoDespesasPontos = useMemo<PontoHistoricoDespesa[]>(() => {
    return periodoCompletoGrafico.map((mesInfo) => {
      const anoMesNumber = Number(mesInfo.anoMes);
      const isProjecao = anoMesNumber > anoMesAtualReal;
      const valor = isProjecao
        ? (projecoesPorAnoMes[mesInfo.anoMes] ?? 0)
        : (totaisHistoricoPorAnoMes[mesInfo.anoMes] ?? 0);

      return {
        ano: mesInfo.ano,
        mes: mesInfo.mes,
        label: formatarLabelMes(mesInfo.ano, mesInfo.mes),
        valor,
        isAtual: mesInfo.ano === hoje.getFullYear() && mesInfo.mes === hoje.getMonth() + 1,
        isProjecao,
      };
    });
  }, [periodoCompletoGrafico, anoMesAtualReal, projecoesPorAnoMes, totaisHistoricoPorAnoMes, hoje]);

  const historicoPossuiProjecao = useMemo(
    () => historicoDespesasPontos.some((ponto) => ponto.isProjecao),
    [historicoDespesasPontos]
  );

  const chartPoints = useMemo(() => {
    const valores = historicoDespesasPontos.map((ponto) => ponto.valor);
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

  const cartoesExibicao = useMemo(() => {
    if (cartoes.length > 0) {
      return cartoes.map(c => {
        const limiteInfo = limitesPorCartao[c.id] || { valorLimite: c.valorLimite || 5000, valorLimiteUtilizado: 0 };
        return {
          id: c.id,
          nome: c.nome,
          bandeira: c.bandeira,
          numeroFinal: c.numeroFinal,
          valorLimite: limiteInfo.valorLimite,
          valorLimiteUtilizado: limiteInfo.valorLimiteUtilizado,
          cor: c.cor
        };
      });
    }

    // Mock cards
    return [
      { id: 101, nome: 'Nubank Ultravioleta', bandeira: 'MASTER', numeroFinal: '4321', valorLimite: 6000, valorLimiteUtilizado: 2450.90, cor: 'ROXO' },
      { id: 102, nome: 'Visa Infinite XP', bandeira: 'VISA', numeroFinal: '9876', valorLimite: 15000, valorLimiteUtilizado: 8720.00, cor: 'PRETO' },
      { id: 103, nome: 'Inter Black', bandeira: 'MASTER', numeroFinal: '5566', valorLimite: 10000, valorLimiteUtilizado: 1200.40, cor: 'VERDE' },
    ];
  }, [cartoes, limitesPorCartao]);

  const calcularVariacaoPercentual = (atual: number, anterior: number) => {
    if (anterior === 0) {
      return atual > 0 ? 100 : 0;
    }

    return ((atual - anterior) / anterior) * 100;
  };

  const formatarVariacao = (atual: number, anterior: number) => {
    const percentual = calcularVariacaoPercentual(atual, anterior);
    const percentualArredondado = Math.round(percentual);
    const prefixo = percentualArredondado > 0 ? '+' : '';
    return `${prefixo}${percentualArredondado.toLocaleString('pt-BR')}% vs. mês anterior`;
  };

  const buscarTotaisPorAnoMes = useCallback(async (anoMes: string): Promise<TotaisPorTipo> => {
    const params = new URLSearchParams({
      anomes: anoMes,
      pagina: '0',
      tamanho: '1',
    });

    const response = await axios.get(`/api/despesas?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return {
      avulso: Number(response.data?.valorTotalAvulso || 0),
      parcelado: Number(response.data?.valorTotalParcelado || 0),
      recorrente: Number(response.data?.valorTotalRecorrente || 0),
      total: Number(response.data?.valorTotal || 0),
    };
  }, [token]);

  const buscarCartoesDashboard = useCallback(async () => {
    if (!token) {
      setLoadingCartoes(false);
      return;
    }
    try {
      setLoadingCartoes(true);
      const response = await axios.get('/api/cartoes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(response.data)) {
        const cartoesAtuais = response.data;
        setCartoes(cartoesAtuais);

        const resultados = await Promise.allSettled(
          cartoesAtuais.map((cartao) => axios.get(`/api/cartoes/${cartao.id}/limite`, {
            headers: { Authorization: `Bearer ${token}` },
          }))
        );

        const valores: Record<number, LimiteCartaoCalculado> = {};
        resultados.forEach((resultado, index) => {
          if (resultado.status !== 'fulfilled') return;
          const cartaoAtual = cartoesAtuais[index];
          const data = resultado.value.data;
          const valorLimite = Number(data.valorLimite ?? cartaoAtual.valorLimite ?? 0);
          const valorUtilizado = Number(data.valorLimiteUtilizado ?? 0);

          valores[cartaoAtual.id] = {
            valorLimite: Number.isFinite(valorLimite) ? valorLimite : 0,
            valorLimiteUtilizado: Number.isFinite(valorUtilizado) ? valorUtilizado : 0,
          };
        });
        setLimitesPorCartao(valores);
      }
    } catch (error) {
      console.error('Erro ao buscar cartões no dashboard:', error);
    } finally {
      setLoadingCartoes(false);
    }
  }, [token]);

  const buscarDadosDashboard = useCallback(async () => {
    if (!token) {
      setTotaisMesAtual(TOTAIS_INICIAIS);
      setTotaisMesAnterior(TOTAIS_INICIAIS);
      setTotaisHistoricoPorAnoMes({});
      setProjecoesPorAnoMes({});
      setErroTotais('Token de autenticação não encontrado.');
      setLoadingTotais(false);
      setLoadingDespesas(false);
      return;
    }

    try {
      setLoadingTotais(true);
      setLoadingDespesas(true);
      setErroTotais(null);

      const anoMesAtual = formatarAnoMes(anoAtual, mesAtual);
      const mesAnterior = obterMesAnterior(anoAtual, mesAtual);
      const anoMesAnterior = formatarAnoMes(mesAnterior.ano, mesAnterior.mes);
      const mesesHistorico = periodoCompletoGrafico.filter((item) => Number(item.anoMes) <= anoMesAtualReal);

      const respostasHistorico = await Promise.all(
        mesesHistorico.map(async (item) => {
          try {
            const dados = await buscarTotaisPorAnoMes(item.anoMes);
            return { anoMes: item.anoMes, total: dados.total };
          } catch {
            return { anoMes: item.anoMes, total: 0 };
          }
        })
      );

      const mapaHistorico = respostasHistorico.reduce<Record<string, number>>((acc, item) => {
        acc[item.anoMes] = Number.isFinite(item.total) ? item.total : 0;
        return acc;
      }, {});

      // Garante explicitamente zero para meses do período sem retorno da API.
      periodoHistorico.forEach((item) => {
        if (Number(item.anoMes) <= anoMesAtualReal && mapaHistorico[item.anoMes] === undefined) {
          mapaHistorico[item.anoMes] = 0;
        }
      });

      setTotaisHistoricoPorAnoMes(mapaHistorico);

      const dadosAtual = await buscarTotaisPorAnoMes(anoMesAtual).catch(() => TOTAIS_INICIAIS);
      const dadosAnterior = await buscarTotaisPorAnoMes(anoMesAnterior).catch(() => TOTAIS_INICIAIS);

      setTotaisMesAtual(dadosAtual);
      setTotaisMesAnterior(dadosAnterior);

      const params = new URLSearchParams({
        anomes: anoMesAtual,
        pagina: '0',
        tamanho: '2000',
      });
      const response = await axios.get(`/api/despesas?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data && Array.isArray(response.data.despesas)) {
        setDespesasMesAtual(response.data.despesas);
      } else {
        setDespesasMesAtual([]);
      }

      if (mesSelecionadoEhAtual) {
        setLoadingProjecao(true);
        try {
          const responseProjecao = await axios.get('/api/projecoes/despesas?meses=1', {
            headers: { Authorization: `Bearer ${token}` },
          });

          let dadosProjecao: ProjecaoMesInfo[] = [];
          if (Array.isArray(responseProjecao.data?.data)) {
            dadosProjecao = responseProjecao.data.data;
          } else if (Array.isArray(responseProjecao.data)) {
            dadosProjecao = responseProjecao.data;
          }

          const proximoMes = adicionarMeses(anoAtual, mesAtual, 1);
          const chaveProximoMes = formatarAnoMes(proximoMes.ano, proximoMes.mes);
          const mapaProjecoes: Record<string, number> = {
            [chaveProximoMes]: 0,
          };

          dadosProjecao.forEach((item) => {
            const chave = String(item.anoMes);
            if (mapaProjecoes[chave] !== undefined) {
              const valor = Number(item.valorTotal ?? 0);
              mapaProjecoes[chave] = Number.isFinite(valor) ? valor : 0;
            }
          });

          setProjecoesPorAnoMes(mapaProjecoes);
        } catch (error) {
          console.error('Erro ao carregar projeção de despesas no dashboard:', error);
          const proximoMes = adicionarMeses(anoAtual, mesAtual, 1);
          const chaveProximoMes = formatarAnoMes(proximoMes.ano, proximoMes.mes);
          const mapaFallback: Record<string, number> = {
            [chaveProximoMes]: 0,
          };
          setProjecoesPorAnoMes(mapaFallback);
        } finally {
          setLoadingProjecao(false);
        }
      } else {
        setProjecoesPorAnoMes({});
        setLoadingProjecao(false);
      }
    } catch (error: unknown) {
      console.error('Erro ao carregar dados do dashboard:', error);
      if (axios.isAxiosError(error)) {
        setErroTotais(error.response?.data?.message || 'Falha ao carregar dados do dashboard.');
      } else {
        setErroTotais('Falha ao carregar dados do dashboard.');
      }
    } finally {
      setLoadingTotais(false);
      setLoadingDespesas(false);
    }
  }, [anoAtual, mesAtual, token, buscarTotaisPorAnoMes, periodoHistorico, periodoCompletoGrafico, anoMesAtualReal, mesSelecionadoEhAtual]);

  useEffect(() => {
    const carregar = async () => {
      await Promise.all([buscarDadosDashboard(), buscarCartoesDashboard()]);
    };

    void carregar();
  }, [buscarDadosDashboard, buscarCartoesDashboard]);

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

      {erroTotais && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm font-semibold">
          {erroTotais}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-50/40 border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Avulso</span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
          </div>
          <div className="mt-2 text-xl font-black text-slate-900">{loadingTotais ? '...' : formatarMoeda(totaisMesAtual.avulso)}</div>
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full bg-white border border-slate-200 px-2.5 py-1 text-[10px] font-extrabold text-slate-900 tracking-wide uppercase">
              {loadingTotais ? 'comparando mês anterior...' : formatarVariacao(totaisMesAtual.avulso, totaisMesAnterior.avulso)}
            </span>
          </div>
        </div>

        <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-700">Parcelado</span>
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          </div>
          <div className="mt-2 text-xl font-black text-orange-950">{loadingTotais ? '...' : formatarMoeda(totaisMesAtual.parcelado)}</div>
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full bg-white border border-orange-200 px-2.5 py-1 text-[10px] font-extrabold text-orange-950 tracking-wide uppercase">
              {loadingTotais ? 'comparando mês anterior...' : formatarVariacao(totaisMesAtual.parcelado, totaisMesAnterior.parcelado)}
            </span>
          </div>
        </div>

        <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">Recorrente</span>
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
          </div>
          <div className="mt-2 text-xl font-black text-sky-950">{loadingTotais ? '...' : formatarMoeda(totaisMesAtual.recorrente)}</div>
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full bg-white border border-sky-200 px-2.5 py-1 text-[10px] font-extrabold text-sky-950 tracking-wide uppercase">
              {loadingTotais ? 'comparando mês anterior...' : formatarVariacao(totaisMesAtual.recorrente, totaisMesAnterior.recorrente)}
            </span>
          </div>
        </div>

        <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">Total de Despesa</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          </div>
          <div className="mt-2 text-xl font-black text-rose-950">{loadingTotais ? '...' : formatarMoeda(totaisMesAtual.total)}</div>
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full bg-white border border-rose-200 px-2.5 py-1 text-[10px] font-extrabold text-rose-950 tracking-wide uppercase">
              {loadingTotais ? 'comparando mês anterior...' : formatarVariacao(totaisMesAtual.total, totaisMesAnterior.total)}
            </span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Card: Ranking de Despesas */}
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-xl">
                  <Trophy size={18} />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-bold text-slate-900">Ranking de Despesas</h2>
                  <p className="text-xs text-slate-500">Top 5 categorias de despesas no período.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3.5">
              {loadingDespesas ? (
                <div className="text-center py-4 text-xs text-slate-400 font-semibold">Carregando despesas...</div>
              ) : rankingCategoriasExibicao.map((item, index) => {
                const percentual = totalMensalParaPercentual > 0 ? (item.valorTotal / totalMensalParaPercentual) * 100 : 0;
                const corProgresso = CORES_CATEGORIAS[index % CORES_CATEGORIAS.length];
                const corTrack = CORES_TRACK_CATEGORIAS[index % CORES_TRACK_CATEGORIAS.length];

                return (
                  <div key={item.categoria} className="space-y-1">
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="font-bold text-slate-800">{item.categoria}</span>
                      <span className="font-extrabold text-slate-900">{formatarMoeda(item.valorTotal)}</span>
                    </div>

                    <div className={`relative w-full h-2 rounded-full overflow-hidden ${corTrack}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${corProgresso}`}
                        style={{ width: `${Math.min(100, percentual)}%` }}
                      />
                    </div>

                    <div className="flex justify-end">
                      <span className="text-[11px] font-semibold text-slate-500">
                        {percentual.toFixed(1).replace('.', ',')}% do total do mês
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card: Distribuição por Categoria */}
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-cyan-50 text-cyan-700 rounded-xl">
                <PieChart size={18} />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-bold text-slate-900">Despesas por Categoria</h2>
                <p className="text-xs text-slate-500">Distribuição do mês selecionado.</p>
              </div>
            </div>

            {loadingDespesas ? (
              <div className="text-center py-8 text-xs text-slate-400 font-semibold">Carregando categorias...</div>
            ) : totalDespesasCategoriaMes <= 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 font-semibold">Sem despesas no mês selecionado.</div>
            ) : (
              <>
                <div className="flex items-center justify-center py-1">
                  <div className="relative w-44 h-44">
                    <svg viewBox="0 0 120 120" className="w-full h-full">
                      <circle
                        cx="60"
                        cy="60"
                        r="42"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="16"
                      />
                      {donutCategorias.map((segmento) => (
                        <circle
                          key={`donut-${segmento.categoria}`}
                          cx="60"
                          cy="60"
                          r="42"
                          fill="none"
                          stroke={segmento.cor}
                          strokeWidth="16"
                          strokeLinecap="butt"
                          pathLength={100}
                          strokeDasharray={`${segmento.strokeLength} ${100 - segmento.strokeLength}`}
                          strokeDashoffset={-segmento.strokeOffset}
                          transform="rotate(-90 60 60)"
                        />
                      ))}
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-3">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Total</span>
                      <span className="text-sm font-black text-slate-900 text-center">{formatarMoeda(totalDespesasCategoriaMes)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-36 overflow-y-auto pr-1">
                  {donutCategorias.map((segmento) => (
                    <div key={`legend-${segmento.categoria}`} className="flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: segmento.cor }} />
                        <span className="font-semibold text-slate-700 truncate">{segmento.categoria}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-slate-900">{formatarMoeda(segmento.valorTotal)}</span>
                        <span className="block text-[10px] font-semibold text-slate-500">
                          {(segmento.percentual * 100).toFixed(1).replace('.', ',')}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Card: Histórico de Despesas (Compacto) */}
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-4 xl:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-teal-50 text-teal-600 rounded-xl">
                  <Calendar size={18} />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-bold text-slate-900">Histórico de Despesas</h2>
                  <p className="text-xs text-slate-500">Últimos 3 meses no período selecionado.</p>
                </div>
              </div>
            </div>

            <div className="relative w-full h-56 md:h-60 select-none">
              <div
                className="absolute inset-0 grid gap-2.5 z-0"
                style={{ gridTemplateColumns: `repeat(${historicoDespesasPontos.length}, minmax(0, 1fr))` }}
              >
                {historicoDespesasPontos.map((ponto) => (
                  <div
                    key={`compact-${ponto.ano}-${ponto.mes}-${ponto.isProjecao ? 'proj' : 'real'}`}
                    className={`rounded-2xl border flex flex-col justify-between items-center py-4 px-2 shadow-xs ${
                      ponto.isProjecao
                        ? 'bg-blue-50/60 border-blue-200/80'
                        : 'bg-slate-50/40 border-slate-200/70'
                    }`}
                  >
                    <span className={`font-bold text-xl ${ponto.isProjecao ? 'text-blue-700' : 'text-slate-600'}`}>
                      {MESES_NOMES[ponto.mes - 1].charAt(0) + MESES_NOMES[ponto.mes - 1].slice(1).toLowerCase()}
                    </span>

                    <div className="h-11 w-full" />

                    <span className={`font-extrabold text-base tracking-tight text-center ${ponto.isProjecao ? 'text-blue-900' : 'text-slate-800'}`}>
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
                      className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2 ${
                        ponto.isProjecao ? 'bg-blue-600 ring-2 ring-blue-200' : 'bg-teal-600'
                      }`}
                      style={{ left: xPct, top: yPct }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex flex-col items-start gap-2.5 text-[11px] font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                Projeção das despesas
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                Despesas já realizadas
              </span>
            </div>
          </div>

          {/* Card: Limites de Cartões */}
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between xl:col-span-2">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <h2 className="text-base md:text-lg font-bold text-slate-900">Limites de Cartões</h2>
                    <p className="text-xs text-slate-500">Utilização do limite de crédito disponível.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3.5">
                {loadingCartoes ? (
                  <div className="text-center py-4 text-xs text-slate-400 font-semibold">Carregando cartões...</div>
                ) : cartoesExibicao.map((cartao) => {
                  const percentual = cartao.valorLimite > 0 ? (cartao.valorLimiteUtilizado / cartao.valorLimite) * 100 : 0;
                  const gradiente = obterGradientePorCor(cartao.cor);

                  return (
                    <div key={cartao.id} className="space-y-1">
                      <div className="flex items-start justify-between gap-2 text-xs md:text-sm font-bold text-slate-700">
                        <span className="min-w-0 wrap-break-word">{cartao.nome} <span className="text-[10px] text-slate-400 font-semibold">({cartao.bandeira} • {cartao.numeroFinal})</span></span>
                        <span className="text-[11px] text-slate-500 font-semibold">{percentual.toFixed(0)}%</span>
                      </div>

                      <div className="relative w-full h-2.5 rounded-full overflow-hidden bg-slate-100/80 border border-slate-200/30">
                        <div
                          className={`h-full rounded-full bg-linear-to-r ${gradiente} transition-all duration-500`}
                          style={{ width: `${Math.min(100, percentual)}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] md:text-[11px] font-bold text-slate-500">
                        <span>Utilizado: <span className="text-slate-800">{formatarMoeda(cartao.valorLimiteUtilizado)}</span></span>
                        <span>Limite: <span className="text-slate-800">{formatarMoeda(cartao.valorLimite)}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}