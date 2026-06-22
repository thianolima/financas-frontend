import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/DashboardPage';
import ProjecaoDespesaPage from './pages/ProjecaoDespesasPage';
import Profile from './pages/Profile';
import Login from './pages/LoginPage';
import DespesasPage from './pages/DespesasPage';
import { LayoutDashboard, User, ReceiptText, TrendingUp, Bell, Menu } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import axios from 'axios';

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
    localStorage.removeItem('@financeiro:token');
    setToken(null);
  }, []);

  useEffect(() => {
    if (token && isTokenExpirado(token)) {
      handleLogout();
    }
  }, [token, handleLogout]);

  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

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
                onClick={() => setBellOpen(!bellOpen)}
                className="p-2 text-slate-400 lg:text-slate-600 hover:text-white lg:hover:text-slate-900 hover:bg-slate-800 lg:hover:bg-slate-200/70 rounded-xl relative transition-all cursor-pointer focus:outline-none"
              >
                <Bell size={20} fill="currentColor" />
                <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-orange-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-[#091522] lg:border-slate-50">
                  2
                </span>
              </button>

              {bellOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden text-slate-800 font-sans">
                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <span>Notificações</span>
                      <span className="text-orange-500 text-[10px] lowercase normal-case font-normal">2 novas</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto text-xs">
                      <div className="p-4 bg-slate-50/60">
                        <p className="font-bold text-slate-900">Processamento Concluído</p>
                        <p className="text-slate-600 mt-0.5 leading-relaxed">A reclassificação em lote de 15 despesas foi finalizada com sucesso.</p>
                        <span className="text-[10px] text-slate-400 font-medium block mt-1">Há 5 min</span>
                      </div>
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