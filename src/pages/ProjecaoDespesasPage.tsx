import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import axios from 'axios';
import {
  Wallet,
  CreditCard,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface Cartao {
  id: number;
  nome: string;
  bandeira: string;
  diaVencimento: number;
}

interface Categoria {
  id: number;
  nome: string;
}

export default function ProjecaoDespesaPage() {
  const token = localStorage.getItem('@financeiro:token') || '';
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dadosApi, setDadosApi] = useState<any[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [barData, setBarData] = useState<any>(null);

  const [categorias, setCategorias] = useState<Categoria[]>([]);

  // Armazena o nó do mês selecionado atualmente (com todos os seus totais e despesas)
  const [mesSelecionadoInfo, setMesSelecionadoInfo] = useState<any | null>(null);

  // Controle da quantidade de meses da projeção (Default: 6 meses)
  const [qtdMesesProjecao, setQtdMesesProjecao] = useState<number>(6);

  // Estados para armazenar os filtros da tabela e dos cards
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroCartao, setFiltroCartao] = useState<string>('TODOS');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS');

  const formatarMesAno = (anoMesStr: string | number) => {
    const str = String(anoMesStr);
    if (str && str.length === 6) {
      const ano = str.substring(0, 4);
      const mes = str.substring(4, 6);
      return `${mes}/${ano}`;
    }
    return str;
  };

  // Retorna o padrão idêntico ao da tela de despesas: ANO - MÊS (Ex: 2026 - JUN)
  const obterNomeMesExtenso = (anoMesStr: string | number) => {
    const str = String(anoMesStr);
    if (str && str.length === 6) {
      const ano = str.substring(0, 4);
      const mesIdx = parseInt(str.substring(4, 6), 10) - 1;
      const mesesAbreviados = [
        'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
        'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
      ];
      return `${ano} - ${mesesAbreviados[mesIdx]}`;
    }
    return '';
  };

  // Garante a formatação exata dd/mm/aaaa sem problemas de fuso horário (UTC/Local)
  const formatarDataBR = (dataStr: string) => {
    if (!dataStr) return null;
    const partes = dataStr.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataStr;
  };

  // Busca a lista de cartões de crédito do usuário
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
        console.error('[DEBUG] Erro ao buscar cartões de crédito:', err);
      }
    }

    if (token) {
      fetchCartoes();
    }
  }, [token]);

  // Busca a lista de categorias do usuário
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
        console.error('[DEBUG] Erro ao buscar categorias:', err);
      }
    }

    if (token) {
      fetchCategorias();
    }
  }, [token]);

  // Busca os dados das despesas futuras
  useEffect(() => {
    async function fetchDespesasFuturas() {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(
          `/api/projecoes/despesas?meses=${qtdMesesProjecao}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        let listaDados: any[] | null = null;

        if (response.data && Array.isArray(response.data.data)) {
          listaDados = response.data.data;
        } else if (Array.isArray(response.data)) {
          listaDados = response.data;
        }

        if (listaDados && listaDados.length > 0) {
          setDadosApi(listaDados);

          const labelsFormatadas = listaDados.map((item) => formatarMesAno(item.anoMes));

          const valoresAvulso = listaDados.map((item) => item.valorTotalAvulso || 0);
          const valoresParcelado = listaDados.map((item) => item.valorTotalParcelado || 0);
          const valoresRecorrente = listaDados.map((item) => item.valorTotalRecorrente || 0);
          const valoresTotais = listaDados.map((item) => item.valorTotal || 0);

          const obterTextoPercentual = (value: number, context: any) => {
            const idx = context.dataIndex;
            const totalMes = valoresTotais[idx];
            if (totalMes === 0 || value === 0) return '';
            return `${((value / totalMes) * 100).toFixed(0)}%`;
          };

          setBarData({
            labels: labelsFormatadas,
            datasets: [
              {
                label: 'Avulso',
                data: valoresAvulso,
                backgroundColor: 'rgba(148, 163, 184, 0.9)',
                datalabels: {
                  anchor: 'center',
                  align: 'center',
                  color: '#ffffff',
                  font: { weight: 'black', size: 11 },
                  formatter: obterTextoPercentual,
                }
              },
              {
                label: 'Parcelado',
                data: valoresParcelado,
                backgroundColor: 'rgba(249, 115, 22, 0.85)',
                datalabels: {
                  anchor: 'center',
                  align: 'center',
                  color: '#ffffff',
                  font: { weight: 'black', size: 11 },
                  formatter: obterTextoPercentual,
                }
              },
              {
                label: 'Recorrente',
                data: valoresRecorrente,
                backgroundColor: 'rgba(14, 165, 233, 0.85)',
                datalabels: {
                  anchor: 'center',
                  align: 'center',
                  color: '#ffffff',
                  font: { weight: 'black', size: 11 },
                  formatter: obterTextoPercentual,
                }
              }
            ],
          });

          const currentAnoMes = mesSelecionadoInfo?.anoMes;
          const aindaExiste = listaDados.find((item) => String(item.anoMes) === String(currentAnoMes));

          if (aindaExiste) {
            setMesSelecionadoInfo(aindaExiste);
          } else {
            setMesSelecionadoInfo(listaDados[0]);
          }

        } else {
          setDadosApi([]);
          setBarData(null);
          setMesSelecionadoInfo(null);
          setError('Nenhum dado de projeção foi retornado pelo servidor.');
        }
      } catch (err: any) {
        console.error('[DEBUG] Erro capturado no catch do fetch:', err);
        setError('Falha ao carregar dados da projeção. Certifique-se de que o backend esteja ativo no endpoint atualizado.');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchDespesasFuturas();
    }
  }, [token, qtdMesesProjecao]);

  // Lógica de manipulação de retrocesso e avanço de meses através dos botões
  const handleRetrocederMes = () => {
    if (!mesSelecionadoInfo || dadosApi.length === 0) return;
    const indexAtual = dadosApi.findIndex((item) => String(item.anoMes) === String(mesSelecionadoInfo.anoMes));
    if (indexAtual > 0) {
      setMesSelecionadoInfo(dadosApi[indexAtual - 1]);
    }
  };

  const handleAvancarMes = () => {
    if (!mesSelecionadoInfo || dadosApi.length === 0) return;
    const indexAtual = dadosApi.findIndex((item) => String(item.anoMes) === String(mesSelecionadoInfo.anoMes));
    if (indexAtual !== -1 && indexAtual < dadosApi.length - 1) {
      setMesSelecionadoInfo(dadosApi[indexAtual + 1]);
    }
  };

  // Verifica as extremidades da listagem para desabilitar as setas
  const isPrimeiroMes = dadosApi.length === 0 || !mesSelecionadoInfo || String(dadosApi[0].anoMes) === String(mesSelecionadoInfo.anoMes);
  const isUltimoMes = dadosApi.length === 0 || !mesSelecionadoInfo || String(dadosApi[dadosApi.length - 1].anoMes) === String(mesSelecionadoInfo.anoMes);

  const listaDespesasBrutas = Array.isArray(mesSelecionadoInfo?.despesas) ? mesSelecionadoInfo.despesas : [];

  // Aplica os filtros de Tipo, Cartão e Categoria fixada
  const lancamentosFiltrados = listaDespesasBrutas.filter((despesa: any) => {
    // 1. Filtro por Tipo
    let atendeTipo = true;
    if (filtroTipo === 'AVULSO') atendeTipo = !despesa.parcelado && !despesa.recorrente;
    else if (filtroTipo === 'PARCELADO') atendeTipo = !!despesa.parcelado;
    else if (filtroTipo === 'RECORRENTE') atendeTipo = !!despesa.recorrente;

    // 2. Filtro por Cartão
    let atendeCartao = true;
    if (filtroCartao !== 'TODOS') {
      atendeCartao = String(despesa.cartaoId) === String(filtroCartao);
    }

    // 3. Filtro por Categoria (Compara com o nome da categoria vinda do Mock/Fixos)
    let atendeCategoria = true;
    if (filtroCategoria !== 'TODOS') {
      const categoriaSelecionada = categorias.find(c => String(c.id) === String(filtroCategoria));
      if (categoriaSelecionada) {
        atendeCategoria = String(despesa.categoriaNome).toUpperCase() === categoriaSelecionada.nome.toUpperCase();
      }
    }

    return atendeTipo && atendeCartao && atendeCategoria;
  });

  // --- CÁLCULO DINÂMICO DOS TOTAIS BASEADO NOS LANÇAMENTOS FILTRADOS ---
  const totalAvulsoFiltrado = lancamentosFiltrados
    .filter((d: any) => !d.parcelado && !d.recorrente)
    .reduce((soma: number, d: any) => soma + (d.valor || 0), 0);

  const totalParceladoFiltrado = lancamentosFiltrados
    .filter((d: any) => !!d.parcelado)
    .reduce((soma: number, d: any) => soma + (d.valor || 0), 0);

  const totalRecorrenteFiltrado = lancamentosFiltrados
    .filter((d: any) => !!d.recorrente)
    .reduce((soma: number, d: any) => soma + (d.valor || 0), 0);

  const totalGeralFiltrado = lancamentosFiltrados.reduce((soma: number, d: any) => soma + (d.valor || 0), 0);

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">

      {/* Cabeçalho Limpo - Apenas o título da tela */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projeção de Despesas</h1>
        </div>
      </div>

      <div className="space-y-6">

        {/* Painel do Gráfico */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Despesas Futuras</h2>
              <p className="text-xs text-slate-500">
                Projeção mensal segmentada por tipo de despesa com o valor total fixado no topo externo de cada coluna.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <label htmlFor="filtro-meses" className="text-sm font-medium text-slate-600 whitespace-nowrap">
                Projeção:
              </label>
              <select
                id="filtro-meses"
                value={qtdMesesProjecao}
                onChange={(e) => setQtdMesesProjecao(Number(e.target.value))}
                className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-orange-500 focus:border-orange-500 block p-2 font-semibold cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                  <option key={mes} value={mes}>
                    {mes} {mes === 1 ? 'mês' : 'meses'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-[350px] flex items-center justify-center">
            {loading ? (
              <div className="text-sm text-slate-500 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                Carregando dados da API...
              </div>
            ) : error ? (
              <div className="text-sm text-rose-500 text-center px-4">{error}</div>
            ) : barData ? (
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  layout: {
                    padding: {
                      top: 35,
                      bottom: 5
                    }
                  },
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top',
                      labels: { boxWidth: 12, font: { weight: 'bold', size: 12 } }
                    },
                    datalabels: { display: true },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const label = context.dataset.label || '';
                          const value = context.raw as number;
                          return ` ${label}: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        }
                      }
                    }
                  },
                  scales: {
                    x: {
                      stacked: true,
                      grid: { display: false }
                    },
                    y: {
                      stacked: true,
                      display: false,
                      grid: { display: false }
                    },
                  },
                }}
                plugins={[{
                  id: 'topTotalizer',
                  afterDatasetsDraw(chart) {
                    const { ctx } = chart;
                    ctx.save();
                    ctx.font = 'bold 11px sans-serif';
                    ctx.fillStyle = '#1e293b';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';

                    const meta = chart.getDatasetMeta(0);
                    const numeroDeColunas = meta.data.length;

                    for (let i = 0; i < numeroDeColunas; i++) {
                      let somaTotalColuna = 0;
                      let pixelTopoMaisAlto = chart.height;

                      chart.data.datasets.forEach((dataset, datasetIdx) => {
                        const valorfatia = dataset.data[i] as number || 0;
                        somaTotalColuna += valorfatia;

                        const barMeta = chart.getDatasetMeta(datasetIdx);
                        if (barMeta.data[i] && !barMeta.hidden) {
                          const coordenadaY = barMeta.data[i].y;
                          if (coordenadaY < pixelTopoMaisAlto) {
                            pixelTopoMaisAlto = coordenadaY;
                          }
                        }
                      });

                      const coordenadaX = meta.data[i].x;

                      if (somaTotalColuna > 0) {
                        const textoFormatado = `R$ ${somaTotalColuna.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`;

                        ctx.fillText(textoFormatado, coordenadaX, pixelTopoMaisAlto - 8);
                      }
                    }
                    ctx.restore();
                  }
                }]}
              />
            ) : (
              <div className="text-sm text-slate-400">Nenhum dado disponível.</div>
            )}
          </div>
        </div>

        {/* CONTAINER DE FILTROS */}
        {!loading && !error && mesSelecionadoInfo && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">

            {/* Cabeçalho Unificado - Filtro e Mês Referência (Formato: 2026 - JUN) */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm uppercase tracking-wider">
                <SlidersHorizontal size={18} className="text-slate-500" />
                <span>Filtros</span>
              </div>

              {/* Componente de Navegação de Mês alinhado na direita do cabeçalho */}
              <div className="flex items-center justify-between border border border-slate-200/80 bg-white rounded-lg h-9 px-2 shadow-sm min-w-[140px]">
                <button
                  onClick={handleRetrocederMes}
                  disabled={isPrimeiroMes}
                  className={`p-1 rounded transition-all cursor-pointer ${isPrimeiroMes
                    ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-orange-50 hover:text-orange-600'
                    }`}
                >
                  <ChevronLeft size={14} />
                </button>

                <span className="px-4 text-xs font-black text-slate-800 tracking-wider min-w-[90px] text-center select-none">
                  {obterNomeMesExtenso(mesSelecionadoInfo.anoMes)}
                </span>

                <button
                  onClick={handleAvancarMes}
                  disabled={isUltimoMes}
                  className={`p-1 rounded transition-all cursor-pointer ${isUltimoMes
                    ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-orange-50 hover:text-orange-600'
                    }`}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Grid apenas com os 3 Combos Restantes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro: Tipo de Despesa */}
              <div className="flex flex-col gap-1 w-full">
                <label htmlFor="combo-tipo" className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">
                  Tipo de Despesa
                </label>
                <select
                  id="combo-tipo"
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl p-2.5 outline-none font-semibold h-10 cursor-pointer shadow-xs focus:border-orange-500"
                >
                  <option value="TODOS">Todos os Tipos</option>
                  <option value="AVULSO">Apenas Avulsos</option>
                  <option value="PARCELADO">Apenas Parcelados</option>
                  <option value="RECORRENTE">Apenas Recorrentes</option>
                </select>
              </div>

              {/* Filtro: Categoria */}
              <div className="flex flex-col gap-1 w-full">
                <label htmlFor="combo-categoria" className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">
                  Categoria
                </label>
                <select
                  id="combo-categoria"
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl p-2.5 outline-none font-semibold h-10 cursor-pointer shadow-xs focus:border-orange-500"
                >
                  <option value="TODOS">Todas as Categorias</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro 2: Cartão de Crédito */}
              <div className="flex flex-col gap-1 w-full">
                <label htmlFor="combo-cartao" className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">
                  Cartão de Crédito
                </label>
                <select
                  id="combo-cartao"
                  value={filtroCartao}
                  onChange={(e) => setFiltroCartao(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl p-2.5 outline-none font-semibold h-10 cursor-pointer shadow-xs focus:border-orange-500"
                >
                  <option value="TODOS">Todos os Cartões</option>
                  {cartoes.map((cartao) => (
                    <option key={cartao.id} value={cartao.id}>
                      {cartao.nome}
                    </option>
                  ))}
                </select>
              </div>



            </div>
          </div>
        )}

        {/* QUADROS TOTAIS DINÂMICOS */}
        {!loading && !error && mesSelecionadoInfo && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Avulso</span>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
              </div>
              <div className="mt-2 text-xl font-black text-slate-950">
                {formatarMoeda(totalAvulsoFiltrado)}
              </div>
            </div>

            <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-700">Parcelado</span>
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              </div>
              <div className="mt-2 text-xl font-black text-orange-950">
                {formatarMoeda(totalParceladoFiltrado)}
              </div>
            </div>

            <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-700">Recorrente</span>
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
              </div>
              <div className="mt-2 text-xl font-black text-sky-950">
                {formatarMoeda(totalRecorrenteFiltrado)}
              </div>
            </div>

            <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800">Total Filtrado</span>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              </div>
              <div className="mt-2 text-xl font-black text-rose-950">
                {formatarMoeda(totalGeralFiltrado)}
              </div>
            </div>

          </div>
        )}

        {/* ESTRUTURA DA TABELA PADRONIZADA - Arredondada no topo e com rodapé de contagem */}
        {!loading && !error && mesSelecionadoInfo && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {lancamentosFiltrados.length > 0 ? (
                <table className="w-full text-sm text-left text-slate-600 table-fixed">
                  <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th scope="col" className="w-[35%] px-4 py-4">Descrição</th>
                      <th scope="col" className="w-[15%] px-4 py-4 text-center">Tipo</th>
                      <th scope="col" className="w-[20%] px-4 py-4 text-center">Categoria</th>
                      <th scope="col" className="w-[13%] px-4 py-4 text-center">Vencimento</th>
                      <th scope="col" className="w-[17%] px-4 py-4 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lancamentosFiltrados.map((despesa: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">

                        {/* Descrição */}
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
                              {despesa.observacao && (
                                <span className="text-[11px] text-slate-400 font-normal italic truncate mt-0.5">
                                  {despesa.observacao}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Tipo */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="inline-flex flex-col items-center justify-center vertical-middle">
                            {despesa.parcelado && (
                              <>
                                <span className="bg-orange-50 text-orange-700 text-[10px] font-extrabold px-2 py-0.5 rounded border border-orange-100 uppercase tracking-wider block text-center">
                                  Parcelado
                                </span>
                                {despesa.parcelaAtual && despesa.totalParcelas && (
                                  <span className="text-[10px] font-bold text-slate-400 mt-1 block text-center">
                                    {despesa.parcelaAtual} de {despesa.totalParcelas}
                                  </span>
                                )}
                              </>
                            )}
                            {despesa.recorrente && (
                              <span className="bg-sky-50 text-sky-700 text-[10px] font-extrabold px-2 py-0.5 rounded border border-sky-100 uppercase tracking-wider block text-center">
                                Recorrente
                              </span>
                            )}
                            {!despesa.parcelado && !despesa.recorrente && (
                              <span className="bg-slate-100 text-slate-600 text-[10px] font-extrabold px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider block text-center">
                                Avulso
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Categoria */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-700 text-center truncate">
                          {despesa.categoriaNome || <span className="text-slate-300">-</span>}
                        </td>

                        {/* Vencimento */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs font-medium text-slate-500 text-center">
                          {despesa.dataVencimento ? (
                            formatarDataBR(despesa.dataVencimento)
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Valor */}
                        <td className="px-4 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                          R$ {Number(despesa.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  Nenhuma despesa encontrada para este período.
                </div>
              )}
            </div>

            {/* RODAPÉ PADRONIZADO - Exibindo a contagem total de registros filtrados */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Exibindo {lancamentosFiltrados.length} {lancamentosFiltrados.length === 1 ? 'lançamento' : 'lançamentos'}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}