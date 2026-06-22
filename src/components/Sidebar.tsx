import { LogOut } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarProps {
  menuItems: MenuItem[];
  activePage: string;
  setActivePage: (page: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onLogout: () => void;
}

export default function Sidebar({ menuItems, activePage, setActivePage, isOpen, setIsOpen, onLogout }: SidebarProps) {
  return (
    <>
      {/* Overlay de clique para fechar no Mobile */}
      {isOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar com largura de w-56 */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 lg:relative
        flex flex-col bg-[#091522] text-slate-300 transition-all duration-300 ease-in-out
        w-56 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Cabeçalho da Barra Lateral - Linha divisória removida para futura logo */}
        <div className="p-6 flex items-center justify-center h-16 shrink-0">
          <span className="font-black tracking-wider text-white uppercase text-sm">
            Financeiro
          </span>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer
                  ${isActive
                    ? 'bg-[#38bdf8] text-[#091522] font-semibold'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-white'}
                `}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Rodapé limpo: apenas o botão de sair essencial */}
        <div className="p-4 border-t border-slate-800 bg-[#060f1a]">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 transition-colors focus:outline-none cursor-pointer"
          >
            <LogOut size={18} />
            <span>Sair do Sistema</span>
          </button>
        </div>

      </aside>
    </>
  );
}