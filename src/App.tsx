import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/DashboardPage';
import ProjecaoDespesaPage from './pages/ProjecaoDespesasPage';
import Profile from './pages/Profile';
import Login from './pages/LoginPage';
import DespesasPage from './pages/DespesasPage';
import { LayoutDashboard, User, ReceiptText, TrendingUp, Bell, Menu } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import axios from 'axios';

interface Notificacao {
  tipo: string;
  dataHoraCriacao: string;
  mensagem: string;
}

function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getGrupo(iso: string): 'hoje' | 'semana' | 'anteriores' {
  const now = new Date();
  const d = new Date(iso);
  const diffMs = now.getTime() - d.getTime();
  const diffDias = diffMs / (1000 * 60 * 60 * 24);
  if (diffDias < 1 && now.getDate() === d.getDate()) return 'hoje';
  if (diffDias <= 7) return 'semana';
  return 'anteriores';
}

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

function isTokenExpirado(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('@financeiro:token'));
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [bellOpen, setBellOpen] = useState<boolean>(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loadingNotif, setLoadingNotif] = useState<boolean>(false);
  const [newNotifCount, setNewNotifCount] = useState<number>(0);
  const sseRef = useRef<EventSource | null>(null);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'despesas', label: 'Despesas', icon: ReceiptText },
    { id: 'projecao', label: 'Projeção', icon: TrendingUp },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  const handleLoginSuccess = (novoToken: string) => {
    localStorage.setItem('@financeiro:token', novoToken);
    setToken(novoToken);
    setActivePage('dashboard');
  };

  const handleLogout = useCallback(() => {
    // Fecha o canal SSE antes de deslogar
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    localStorage.removeItem('@financeiro:token');
    setToken(null);
    setNotificacoes([]);
    setNewNotifCount(0);
  }, []);

  useEffect(() => {
    if (token && isTokenExpirado(token)) {
      handleLogout();
    }
  }, [token, handleLogout]);

  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Abre/fecha o canal SSE sempre que o token mudar
  useEffect(() => {
    if (!token) return;

    // Fecha conexão anterior caso exista
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    const url = `/api/notificacoes/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    sseRef.current = es;

    es.onmessage = (event) => {
      try {
        const nova: Notificacao = JSON.parse(event.data);
        setNotificacoes(prev => {
          // Evita duplicatas pela dataHoraCriacao
          const jaTem = prev.some(n => n.dataHoraCriacao === nova.dataHoraCriacao && n.tipo === nova.tipo);
          if (jaTem) return prev;
          return [nova, ...prev]; // mais recente no topo
        });
        // Incrementa badge de novas apenas com dropdown fechado
        setBellOpen(open => {
          if (!open) setNewNotifCount(c => c + 1);
          return open;
        });
      } catch {
        // dado não é JSON válido, ignora
      }
    };

    es.onerror = () => {
      // EventSource reconecta automaticamente; apenas loga em dev
      if (import.meta.env.DEV) console.warn('[SSE] Tentando reconectar...');
    };

    return () => {
      es.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchNotificacoes = useCallback(async () => {
    if (!token) return;
    setLoadingNotif(true);
    try {
      const response = await axios.get<Notificacao[]>('/api/notificacoes');
      const sorted = [...response.data].sort(
        (a, b) => new Date(b.dataHoraCriacao).getTime() - new Date(a.dataHoraCriacao).getTime()
      );
      setNotificacoes(sorted);
    } catch {
      setNotificacoes([]);
    } finally {
      setLoadingNotif(false);
    }
  }, [token]);

  // Carrega as notificações automaticamente assim que o token está disponível
  useEffect(() => {
    if (token && !isTokenExpirado(token)) {
      fetchNotificacoes();
    }
  }, [token, fetchNotificacoes]);

  const handleBellOpen = () => {
    const next = !bellOpen;
    setBellOpen(next);
    if (next) {
      setNewNotifCount(0); // zera badge de novas ao abrir
      fetchNotificacoes();
    }
  };

  const hoje = notificacoes.filter(n => getGrupo(n.dataHoraCriacao) === 'hoje');
  const semana = notificacoes.filter(n => getGrupo(n.dataHoraCriacao) === 'semana');
  const anteriores = notificacoes.filter(n => getGrupo(n.dataHoraCriacao) === 'anteriores');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'despesas': return <DespesasPage />;
      case 'projecao': return <ProjecaoDespesaPage />;
      case 'profile': return <Profile />;
      default: return <Dashboard />;
    }
  };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden antialiased">

      <Sidebar
        menuItems={menuItems}
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={isMobileMenuOpen}
        setIsOpen={setIsMobileMenuOpen}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header Superior - Borda removida */}
        <header className="bg-[#091522] lg:bg-slate-50/50 text-white lg:text-slate-800 h-16 px-4 lg:px-8 flex items-center justify-between lg:justify-end z-20 shrink-0">

          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 bg-slate-800 rounded focus:outline-none text-white"
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="flex items-center gap-4">

            <div className="relative">
              <button
                onClick={handleBellOpen}
                className="p-2 text-slate-400 lg:text-slate-600 hover:text-white lg:hover:text-slate-900 hover:bg-slate-800 lg:hover:bg-slate-200/70 rounded-xl relative transition-all cursor-pointer focus:outline-none"
              >
                <Bell
                  size={20}
                  fill="currentColor"
                  className={newNotifCount > 0 ? 'animate-[wiggle_0.4s_ease-in-out_infinite]' : ''}
                />
                {notificacoes.length > 0 && (
                  <span
                    className={`absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-orange-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-[#091522] lg:border-slate-50 ${
                      newNotifCount > 0 ? 'animate-ping-once ring-2 ring-orange-400/50' : ''
                    }`}
                  >
                    {notificacoes.length > 9 ? '9+' : notificacoes.length}
                  </span>
                )}
              </button>

              {bellOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
                  <div className="absolute right-0 mt-2 w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden text-slate-800 font-sans">

                    {/* Header */}
                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell size={16} className="text-orange-500" fill="currentColor" />
                        <span className="text-sm font-bold text-slate-800">Notificações</span>
                      </div>
                      {notificacoes.length > 0 && (
                        <span className="bg-orange-100 text-orange-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          {notificacoes.length} {notificacoes.length === 1 ? 'nova' : 'novas'}
                        </span>
                      )}
                    </div>

                    {/* Body */}
                    <div className="max-h-[420px] overflow-y-auto">
                      {loadingNotif ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                          <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-slate-400">Carregando...</span>
                        </div>
                      ) : notificacoes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                          <Bell size={28} className="text-slate-300" />
                          <span className="text-xs text-slate-400 font-medium">Nenhuma notificação</span>
                        </div>
                      ) : (
                        <>
                          {/* Hoje */}
                          {hoje.length > 0 && (
                            <div>
                              <div className="px-5 py-2 bg-slate-50 border-b border-slate-100">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hoje</span>
                              </div>
                              {hoje.map((n, i) => (
                                <div key={`hoje-${i}`} className={`px-5 py-4 ${i < hoje.length - 1 ? 'border-b border-slate-100' : ''} hover:bg-slate-50/80 transition-colors`}>
                                  <p className="text-sm font-semibold text-slate-900 leading-snug">{n.mensagem}</p>
                                  <span className="text-[11px] text-slate-400 font-medium mt-1.5 block">{formatarDataHora(n.dataHoraCriacao)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Últimos 7 dias */}
                          {semana.length > 0 && (
                            <div>
                              <div className="px-5 py-2 bg-slate-50 border-b border-slate-100 border-t border-t-slate-200">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Últimos 7 dias</span>
                              </div>
                              {semana.map((n, i) => (
                                <div key={`semana-${i}`} className={`px-5 py-4 ${i < semana.length - 1 ? 'border-b border-slate-100' : ''} hover:bg-slate-50/80 transition-colors`}>
                                  <p className="text-sm font-semibold text-slate-900 leading-snug">{n.mensagem}</p>
                                  <span className="text-[11px] text-slate-400 font-medium mt-1.5 block">{formatarDataHora(n.dataHoraCriacao)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Anteriores */}
                          {anteriores.length > 0 && (
                            <div>
                              <div className="px-5 py-2 bg-slate-50 border-b border-slate-100 border-t border-t-slate-200">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Anteriores</span>
                              </div>
                              {anteriores.map((n, i) => (
                                <div key={`ant-${i}`} className={`px-5 py-4 ${i < anteriores.length - 1 ? 'border-b border-slate-100' : ''} hover:bg-slate-50/80 transition-colors`}>
                                  <p className="text-sm font-semibold text-slate-900 leading-snug">{n.mensagem}</p>
                                  <span className="text-[11px] text-slate-400 font-medium mt-1.5 block">{formatarDataHora(n.dataHoraCriacao)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setActivePage('profile')}
              className="w-8 h-8 rounded-full bg-slate-700 lg:bg-slate-200 text-slate-300 lg:text-slate-700 hover:bg-orange-500 lg:hover:bg-orange-500 hover:text-white lg:hover:text-white font-bold text-xs flex items-center justify-center uppercase tracking-wider transition-colors shadow-xs cursor-pointer select-none border border-slate-600 lg:border-transparent focus:outline-none"
              title="Ver Perfil"
            >
              TL
            </button>
          </div>

        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          {renderPage()}
        </main>

      </div>
    </div>
  );
}

export default App;