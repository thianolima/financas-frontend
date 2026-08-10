import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  X,
  ShieldCheck,
  Upload,
  ReceiptText,
  RefreshCw
} from 'lucide-react';

interface CartaoBackend {
  id: number;
  nome: string;
  bandeira: 'VISA' | 'MASTER' | string;
  diaVencimento: number;
  numeroFinal: string;
  titular: string;
  valorLimite: number;
  valorLimiteUtilizado?: number;
  cor: string;
  cartaoAdicional?: boolean;
}

interface LimiteCartaoResponse {
  cartaoId: number;
  valorLimite: number;
  valorLimiteUtilizado: number;
}

interface LimiteCartaoCalculado {
  valorLimite: number;
  valorLimiteUtilizado: number;
}

interface CartoesPageProps {
  onAbrirDespesasPorCartao?: (cartaoId: number, anomes: string) => void;
}

// Mapeamento aceitando chaves em Português e enums em Inglês
const GRADIENTS: Record<string, { label: string; class: string; dot: string; apiKey: string }> = {
  AZUL: { label: 'Azul Imperial', class: 'from-[#1e3a8a] to-[#3b82f6]', dot: 'bg-blue-600', apiKey: 'BLUE' },
  PRETO: { label: 'Black / Grafite', class: 'from-[#111827] to-[#4b5563]', dot: 'bg-gray-800', apiKey: 'BLACK' },
  ROXO: { label: 'Roxo Ultravioleta', class: 'from-[#4c1d95] to-[#8b5cf6]', dot: 'bg-purple-600', apiKey: 'PURPLE' },
  VERDE: { label: 'Verde Esmeralda', class: 'from-[#064e3b] to-[#10b981]', dot: 'bg-emerald-600', apiKey: 'GREEN' },
  VERMELHO: { label: 'Rubi / Vermelho', class: 'from-[#7f1d1d] to-[#ef4444]', dot: 'bg-red-600', apiKey: 'RED' },
  LARANJA: { label: 'Laranja Cobre', class: 'from-[#7c2d12] to-[#f97316]', dot: 'bg-orange-600', apiKey: 'ORANGE' },
  ROSA: { label: 'Rosa Pink', class: 'from-[#831843] via-[#db2777] to-[#f472b6]', dot: 'bg-pink-500', apiKey: 'PINK' },
  PRATA: { label: 'Prata Platinum', class: 'from-[#374151] via-[#9ca3af] to-[#e5e7eb]', dot: 'bg-slate-300', apiKey: 'SILVER' },
};

const obterGradientePorCor = (corKey: string) => {
  if (!corKey) return GRADIENTS.AZUL;
  const keyUpper = corKey.toUpperCase().trim();

  if (GRADIENTS[keyUpper]) return GRADIENTS[keyUpper];

  const encontrado = Object.values(GRADIENTS).find(g => g.apiKey === keyUpper);
  return encontrado || GRADIENTS.AZUL;
};

const BANDEIRA_CONFIG: Record<string, { label: string }> = {
  VISA: { label: 'Visa' },
  MASTER: { label: 'MASTER' },
};

const FORM_VAZIO = {
  nome: '',
  titular: '',
  cartaoAdicional: false,
  bandeira: 'VISA',
  diaVencimento: 10,
  numeroFinal: '',
  cor: 'ROXO',
  valorLimite: 'R$ 0,00'
};

export default function CartoesPage({ onAbrirDespesasPorCartao }: CartoesPageProps) {
  const token = localStorage.getItem('@financeiro:token') || '';

  const getAnoMesAtual = () => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const [cartoes, setCartoes] = useState<CartaoBackend[]>([]);
  const [limitesPorCartao, setLimitesPorCartao] = useState<Record<number, LimiteCartaoCalculado>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [cartaoParaEditar, setCartaoParaEditar] = useState<CartaoBackend | null>(null);
  const [confirmacaoExcluir, setConfirmacaoExcluir] = useState<CartaoBackend | null>(null);
  const [excluindo, setExcluindo] = useState<boolean>(false);
  const [modalFaturaCartao, setModalFaturaCartao] = useState<CartaoBackend | null>(null);
  const [faturaArquivo, setFaturaArquivo] = useState<File | null>(null);
  const [faturaAnoMes, setFaturaAnoMes] = useState<string>(() => getAnoMesAtual());
  const [faturaErrors, setFaturaErrors] = useState<Record<string, string>>({});
  const [importandoFatura, setImportandoFatura] = useState<boolean>(false);
  const [faturaUploadResponse, setFaturaUploadResponse] = useState<{ url: string } | null>(null);

  const [form, setForm] = useState(FORM_VAZIO);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const fetchCartoes = useCallback(async () => {
    if (!token) {
      setError('Token de autenticação não encontrado.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/cartoes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(response.data)) {
        setCartoes(response.data);
      }
    } catch (err: any) {
      console.error('Erro ao buscar cartões:', err);
      setError(err.response?.data?.message || 'Erro ao carregar lista de cartões.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchLimitesUtilizados = useCallback(async (cartoesAtuais: CartaoBackend[]) => {
    if (!token) return;
    if (!cartoesAtuais.length) {
      setLimitesPorCartao({});
      return;
    }

    const resultados = await Promise.allSettled(
      cartoesAtuais.map((cartao) => axios.get(`/api/cartoes/${cartao.id}/limite`, {
        headers: { Authorization: `Bearer ${token}` },
      }))
    );

    const valores: Record<number, LimiteCartaoCalculado> = {};

    resultados.forEach((resultado, index) => {
      if (resultado.status !== 'fulfilled') return;

      const cartaoAtual = cartoesAtuais[index];
      const data = resultado.value.data as Partial<LimiteCartaoResponse>;
      const cartaoId = cartaoAtual.id;
      const valorLimite = Number(data.valorLimite ?? cartaoAtual.valorLimite ?? 0);
      const valorUtilizado = Number(data.valorLimiteUtilizado ?? 0);

      valores[cartaoId] = {
        valorLimite: Number.isFinite(valorLimite) ? valorLimite : 0,
        valorLimiteUtilizado: Number.isFinite(valorUtilizado) ? valorUtilizado : 0,
      };
    });

    setLimitesPorCartao(valores);
  }, [token]);

  useEffect(() => {
    fetchCartoes();
  }, [fetchCartoes]);

  useEffect(() => {
    fetchLimitesUtilizados(cartoes);
  }, [cartoes, fetchLimitesUtilizados]);

  const abrirNovo = () => {
    setCartaoParaEditar(null);
    setForm(FORM_VAZIO);
    setErrors({});
    setModalAberto(true);
  };

  const abrirEditar = (c: CartaoBackend) => {
    setCartaoParaEditar(c);
    const limiteSeguro = typeof c.valorLimite === 'number' ? c.valorLimite : 0;
    setForm({
      nome: c.nome || '',
      titular: c.titular || '',
      cartaoAdicional: Boolean(c.cartaoAdicional),
      bandeira: c.bandeira || 'VISA',
      diaVencimento: c.diaVencimento || 10,
      numeroFinal: c.numeroFinal || '',
      cor: c.cor || 'ROXO',
      valorLimite: limiteSeguro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    });
    setErrors({});
    setModalAberto(true);
  };

  const validar = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório.';
    if (form.nome.trim().length > 255) e.nome = 'Máximo de 255 caracteres.';
    if (!form.titular.trim()) e.titular = 'Titular é obrigatório.';
    if (!form.numeroFinal.trim()) e.numeroFinal = 'Número final é obrigatório.';
    if (!/^\d{4}$/.test(form.numeroFinal.trim())) e.numeroFinal = 'Informe exatamente 4 dígitos numéricos.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSalvar = async () => {
    if (!validar()) return;
    const limiteLimpo = form.valorLimite.replace(/[^\d,]/g, '').replace(',', '.');
    const valorLimiteFinal = parseFloat(limiteLimpo) || 0;

    const payload = {
      nome: form.nome.toUpperCase().trim(),
      bandeira: form.bandeira.toUpperCase().trim(),
      diaVencimento: Number(form.diaVencimento),
      numeroFinal: form.numeroFinal.trim(),
      titular: form.titular.toUpperCase().trim(),
      valorLimite: valorLimiteFinal,
      cor: form.cor.toUpperCase().trim(),
      cartaoAdicional: form.cartaoAdicional
    };

    try {
      if (cartaoParaEditar) {
        await axios.put(`/api/cartoes/${cartaoParaEditar.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast('Cartão atualizado com sucesso!');
      } else {
        await axios.post('/api/cartoes', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast('Cartão cadastrado com sucesso!');
      }
      setModalAberto(false);
      fetchCartoes();
    } catch (err: any) {
      console.error('Erro ao salvar cartão:', err);
      showToast(err.response?.data?.message || 'Erro ao salvar o cartão.');
    }
  };

  const handleExcluir = async (c: CartaoBackend) => {
    if (!token) return;
    try {
      setExcluindo(true);
      await axios.delete(`/api/cartoes/${c.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfirmacaoExcluir(null);
      showToast('Cartão excluído com sucesso!');
      fetchCartoes();
    } catch (err: any) {
      console.error('Erro ao excluir cartão:', err);
      showToast(err.response?.data?.message || 'Erro ao excluir o cartão.');
    } finally {
      setExcluindo(false);
    }
  };

  const handleNumeroFinal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 4);
    setForm(f => ({ ...f, numeroFinal: v }));
  };

  const handleInputChangeLimite = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (!value) {
      setForm(f => ({ ...f, valorLimite: 'R$ 0,00' }));
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    const formatted = numericValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    setForm(f => ({ ...f, valorLimite: formatted }));
  };

  const handleVerDespesas = (cartao: CartaoBackend) => {
    if (!onAbrirDespesasPorCartao) {
      showToast(`Nao foi possivel abrir despesas de ${cartao.nome}.`);
      return;
    }

    onAbrirDespesasPorCartao(cartao.id, getAnoMesAtual());
  };

  const abrirModalImportacaoFatura = (cartao: CartaoBackend) => {
    setFaturaArquivo(null);
    setFaturaAnoMes(getAnoMesAtual());
    setFaturaErrors({});
    setFaturaUploadResponse(null);
    setModalFaturaCartao(cartao);
  };

  const fecharModalImportacaoFatura = () => {
    if (importandoFatura) return;
    setModalFaturaCartao(null);
    setFaturaArquivo(null);
    setFaturaAnoMes(getAnoMesAtual());
    setFaturaErrors({});
    setFaturaUploadResponse(null);
  };

  const validarFormularioFatura = () => {
    const e: Record<string, string> = {};

    if (!faturaArquivo) {
      e.arquivo = 'Selecione uma planilha .xlsx.';
    } else if (!faturaArquivo.name.toLowerCase().endsWith('.xlsx')) {
      e.arquivo = 'Apenas arquivo .xlsx e permitido.';
    }

    if (!faturaAnoMes.trim()) {
      e.anoMes = 'Informe o ano/mes no formato YYYYMM.';
    } else {
      const anoMes = faturaAnoMes.replace(/\D/g, '').slice(0, 6);
      if (!/^\d{6}$/.test(anoMes)) {
        e.anoMes = 'Ano/mes deve conter 6 digitos (YYYYMM).';
      } else {
        const mes = Number(anoMes.slice(4, 6));
        if (mes < 1 || mes > 12) {
          e.anoMes = 'Mes invalido. Use valores entre 01 e 12.';
        }
      }
    }

    setFaturaErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAnoMesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorLimpo = e.target.value.replace(/\D/g, '').slice(0, 6);
    setFaturaAnoMes(valorLimpo);
    setFaturaErrors(prev => ({ ...prev, anoMes: '' }));
  };

  const handleArquivoFaturaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0] || null;
    setFaturaArquivo(arquivo);
    setFaturaErrors(prev => ({ ...prev, arquivo: '' }));
  };

  const handleImportarFatura = async () => {
    if (!modalFaturaCartao) return;

    if (!token) {
      showToast('Token de autenticacao nao encontrado.');
      return;
    }

    if (!validarFormularioFatura() || !faturaArquivo) return;

    try {
      setImportandoFatura(true);

      const response = await axios.post(
        `/api/cartao/${modalFaturaCartao.id}/fatura/upload`,
        {
          anoMes: faturaAnoMes,
          nomeArquivo: faturaArquivo.name,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const payload = response.data as { url?: string };
      if (!payload?.url) {
        throw new Error('URL de upload nao retornada pelo backend.');
      }

      setFaturaUploadResponse({ url: payload.url });

      const uploadUrl = import.meta.env.DEV
        ? (() => {
          const parsed = new URL(payload.url);
          return `/s3-upload${parsed.pathname}${parsed.search}`;
        })()
        : payload.url;

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/csv',
        },
        body: faturaArquivo,
      });

      if (!uploadResponse.ok) {
        throw new Error('Falha ao enviar arquivo para o S3.');
      }

      showToast('Upload da fatura realizado com sucesso!');
      setModalFaturaCartao(null);
      setFaturaArquivo(null);
      setFaturaAnoMes(getAnoMesAtual());
      setFaturaErrors({});
      setFaturaUploadResponse(null);
    } catch (err: any) {
      console.error('Erro ao importar fatura:', err);
      showToast(err.response?.data?.message || err.message || 'Erro ao importar fatura.');
    } finally {
      setImportandoFatura(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">

      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[100] bg-[#091522] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700">
          <ShieldCheck size={16} className="text-emerald-400" />
          {toastMsg}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cartões de Crédito</h1>
          <p className="text-sm text-slate-500">Gerencie os cartões utilizados nas despesas do sistema.</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm cursor-pointer transition-colors whitespace-nowrap self-start sm:self-center"
        >
          <Plus size={16} />
          Novo Cartão
        </button>
      </div>

      {/* Grid de Cartões (Volta para 4 colunas em telas maiores) */}
      {loading ? (
        <div className="text-center py-20 text-slate-500 flex flex-col items-center gap-3 justify-center">
          <RefreshCw size={28} className="animate-spin text-orange-500" />
          <span>Carregando cartões do servidor...</span>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-6 text-center text-sm font-medium">
          {error}
        </div>
      ) : cartoes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-20 gap-4">
          <CreditCard size={48} className="text-slate-200" />
          <p className="text-slate-400 font-medium text-sm">Nenhum cartão cadastrado.</p>
          <button onClick={abrirNovo} className="text-orange-500 font-semibold text-sm hover:underline cursor-pointer">
            Adicionar primeiro cartão
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {cartoes.map(c => {
            const bandeiraLabel = BANDEIRA_CONFIG[c.bandeira]?.label || c.bandeira;
            const gradienteConfig = obterGradientePorCor(c.cor);
            const isAdicional = Boolean(c.cartaoAdicional);
            const limiteDoEndpoint = limitesPorCartao[c.id];
            const limiteTotal = limiteDoEndpoint?.valorLimite ?? (Number(c.valorLimite) || 0);
            const valorLimiteUtilizadoPayload = c.valorLimiteUtilizado;
            const temLimiteUtilizadoNoPayload = valorLimiteUtilizadoPayload !== undefined
              && valorLimiteUtilizadoPayload !== null
              && Number.isFinite(Number(valorLimiteUtilizadoPayload));
            const limiteUtilizado = temLimiteUtilizadoNoPayload
              ? Number(valorLimiteUtilizadoPayload)
              : (limiteDoEndpoint?.valorLimiteUtilizado ?? 0);
            const limiteDisponivel = Math.max(limiteTotal - limiteUtilizado, 0);
            const percentualUso = limiteTotal > 0 ? Math.min((limiteUtilizado / limiteTotal) * 100, 100) : 0;
            const percentualUsoLabel = `${percentualUso.toFixed(1).replace('.', ',')}%`;

            return (
              <div key={c.id} className="flex flex-col gap-3">
                {/* Visual do Cartão */}
                <div className={`relative rounded-2xl bg-gradient-to-br ${gradienteConfig.class} p-5 h-44 flex flex-col justify-between shadow-lg overflow-hidden select-none`}>
                  <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
                  <div className="absolute -bottom-8 -right-2 w-40 h-40 rounded-full bg-white/5" />

                  <div className="flex items-start justify-between z-10">
                    <div className="p-2 bg-white/10 rounded-lg flex items-center gap-2">
                      <CreditCard size={18} className="text-white/90" />
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[9px] text-white/60 font-bold uppercase tracking-wider">{bandeiraLabel}</span>
                    </div>
                  </div>

                  <div className="z-10">
                    <div className="w-8 h-6 rounded-md border border-yellow-300/30 bg-yellow-400/20 mb-2" />
                    <div className="text-white text-xs font-bold leading-tight truncate mb-1" title={c.nome}>{c.nome}</div>
                    <div className="text-white/50 text-[10px] tracking-[0.3em] font-mono">
                      &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; {c.numeroFinal}
                    </div>

                    {/* Linha inferior com Titular à esquerda e Pill ADICIONAL à direita */}
                    <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-1.5 gap-2">
                      <span className="text-white/90 font-mono text-[9px] uppercase tracking-wider truncate" title={c.titular}>
                        {c.titular}
                      </span>

                      {isAdicional && (
                        <span className="text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full border backdrop-blur-md bg-amber-400/20 text-amber-200 border-amber-300/30 shrink-0">
                          Adicional
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Limite Utilizado</span>
                    <span className="text-[11px] font-extrabold text-slate-700">{percentualUsoLabel}</span>
                  </div>

                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-orange-400 to-orange-500 transition-all duration-500"
                      style={{ width: `${percentualUso}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                    <span>
                      Utilizado: {limiteUtilizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    <span>
                      Disponivel: {limiteDisponivel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>

                {/* Barra de Ações do Cartão */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleVerDespesas(c)}
                      title="Despesas"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer text-xs font-bold whitespace-nowrap"
                    >
                      <ReceiptText size={13} />
                      Despesas
                    </button>

                    <button
                      onClick={() => !isAdicional && abrirModalImportacaoFatura(c)}
                      disabled={isAdicional}
                      title={isAdicional ? 'Indisponível para cartões adicionais' : 'Importar Fatura'}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${isAdicional
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                        }`}
                    >
                      <Upload size={13} />
                      Imp. Fatura
                    </button>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => abrirEditar(c)} title="Editar" className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-sky-100 hover:text-sky-600 transition-colors cursor-pointer">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => setConfirmacaoExcluir(c)} title="Excluir" className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-colors cursor-pointer">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Novo/Editar */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-50 rounded-lg">
                  <CreditCard size={16} className="text-orange-500" />
                </div>
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
                  {cartaoParaEditar ? 'Alterar Cartão' : 'Novo Cartão'}
                </h3>
              </div>
              <button onClick={() => setModalAberto(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">
                  Nome do Cartão <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={255}
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: NUBANK ULTRAVIOLETA, CARTAO DA OBRA..."
                  className={`p-2.5 border rounded-xl outline-none font-semibold text-slate-800 bg-slate-50 focus:bg-white transition-colors text-sm uppercase ${errors.nome ? 'border-rose-400' : 'border-slate-200 focus:border-orange-400'}`}
                />
                {errors.nome && <span className="text-rose-500 text-[10px] font-semibold">{errors.nome}</span>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">
                  Titular (Nome impresso no Cartão) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={255}
                  value={form.titular}
                  onChange={e => setForm(f => ({ ...f, titular: e.target.value.toUpperCase() }))}
                  placeholder="Ex: THIAGO LIMA"
                  className={`p-2.5 border rounded-xl outline-none font-semibold text-slate-800 bg-slate-50 focus:bg-white transition-colors text-sm uppercase tracking-widest ${errors.titular ? 'border-rose-400' : 'border-slate-200 focus:border-orange-400'}`}
                />
                {errors.titular && <span className="text-rose-500 text-[10px] font-semibold">{errors.titular}</span>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">
                    Bandeira <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.bandeira}
                    onChange={e => setForm(f => ({ ...f, bandeira: e.target.value }))}
                    className="p-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none font-semibold text-slate-800 focus:border-orange-400 focus:bg-white transition-colors h-10 cursor-pointer"
                  >
                    <option value="VISA">Visa</option>
                    <option value="MASTER">Mastercard</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">
                    Dia Vencimento <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.diaVencimento}
                    onChange={e => setForm(f => ({ ...f, diaVencimento: Number(e.target.value) }))}
                    className="p-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none font-semibold text-slate-800 focus:border-orange-400 focus:bg-white transition-colors h-10 cursor-pointer"
                  >
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">
                    4 Últimos Dígitos <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm tracking-widest pointer-events-none select-none">&bull;&bull;&bull;&bull; </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={form.numeroFinal}
                      onChange={handleNumeroFinal}
                      placeholder="0000"
                      className={`w-full pl-16 p-2.5 border rounded-xl outline-none font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white transition-colors text-sm tracking-widest ${errors.numeroFinal ? 'border-rose-400' : 'border-slate-200 focus:border-orange-400'}`}
                    />
                  </div>
                  {errors.numeroFinal && <span className="text-rose-500 text-[10px] font-semibold">{errors.numeroFinal}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">
                    Limite do Cartão <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.valorLimite}
                    onChange={handleInputChangeLimite}
                    placeholder="R$ 0,00"
                    className="p-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none font-black text-slate-800 focus:border-orange-400 focus:bg-white transition-colors text-sm h-10"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-700 text-xs">Cartão Adicional</span>
                  <span className="text-[10px] text-slate-400">Ative se o cartão for uma via adicional</span>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, cartaoAdicional: !f.cartaoAdicional }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${form.cartaoAdicional ? 'bg-orange-500' : 'bg-slate-300'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${form.cartaoAdicional ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">Cor do Cartão</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                  {Object.entries(GRADIENTS).map(([key, value]) => {
                    const isSelected = form.cor === key || form.cor === value.apiKey;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, cor: key }))}
                        className={`w-6 h-6 rounded-full ${value.dot} cursor-pointer transition-transform relative focus:outline-none ${isSelected ? 'scale-125 ring-2 ring-orange-400 ring-offset-2' : 'hover:scale-110'}`}
                        title={value.label}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setModalAberto(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer">Cancelar</button>
              <button onClick={handleSalvar} className="px-5 py-2 text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 rounded-xl shadow-sm cursor-pointer">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Excluir */}
      {confirmacaoExcluir && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black uppercase text-rose-700 tracking-wider">Excluir Cartão</h3>
              <button onClick={() => setConfirmacaoExcluir(null)} disabled={excluindo} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-slate-700 font-medium">Deseja excluir permanentemente o cartão:</p>
              <p className="text-sm font-black text-slate-900">"{confirmacaoExcluir.nome}"?</p>
              <p className="text-xs text-slate-400 mt-1">Esta ação não pode ser desfeita. As despesas vinculadas não serão afetadas.</p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                onClick={() => setConfirmacaoExcluir(null)}
                disabled={excluindo}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleExcluir(confirmacaoExcluir)}
                disabled={excluindo}
                className="px-5 py-2 text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50 rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                {excluindo ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" /> Excluindo...
                  </>
                ) : (
                  'Sim, Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Importar Fatura */}
      {modalFaturaCartao && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 rounded-lg">
                  <Upload size={16} className="text-emerald-600" />
                </div>
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Importar Fatura</h3>
              </div>
              <button
                onClick={fecharModalImportacaoFatura}
                disabled={importandoFatura}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">
                  Arquivo da Fatura (.xlsx) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleArquivoFaturaChange}
                  disabled={importandoFatura}
                  className="p-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-emerald-700 hover:file:bg-emerald-200"
                />
                {faturaArquivo && (
                  <p className="text-[11px] text-slate-500">Arquivo selecionado: <span className="font-semibold text-slate-700">{faturaArquivo.name}</span></p>
                )}
                {faturaErrors.arquivo && <span className="text-rose-500 text-[10px] font-semibold">{faturaErrors.arquivo}</span>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">
                  Ano/Mes (YYYYMM) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={faturaAnoMes}
                  onChange={handleAnoMesChange}
                  placeholder="202607"
                  disabled={importandoFatura}
                  className={`p-2.5 border rounded-xl outline-none font-semibold text-slate-800 bg-slate-50 focus:bg-white transition-colors text-sm ${faturaErrors.anoMes ? 'border-rose-400' : 'border-slate-200 focus:border-emerald-400'}`}
                />
                {faturaErrors.anoMes && <span className="text-rose-500 text-[10px] font-semibold">{faturaErrors.anoMes}</span>}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500">Cartao selecionado</p>
                <p className="text-sm font-semibold text-slate-700">{modalFaturaCartao.nome}</p>
                {faturaUploadResponse?.url && (
                  <p className="text-[10px] text-emerald-700 mt-1">URL de upload gerada para esta tentativa.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                onClick={fecharModalImportacaoFatura}
                disabled={importandoFatura}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportarFatura}
                disabled={importandoFatura}
                className="px-5 py-2 text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                {importandoFatura ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" /> Enviando...
                  </>
                ) : (
                  'Importar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}