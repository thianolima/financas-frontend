export default function Profile() {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900">Meu <span className="text-sky-500">Perfil</span></h1>
      <p className="text-slate-500 -mt-4 text-sm">Gerencie suas informações pessoais e preferências</p>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-300 text-slate-700 font-bold text-2xl flex items-center justify-center">
            T
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">thianolima@hotmail.com</h2>
            <p className="text-sm text-slate-400">thianolima@hotmail.com</p>
          </div>
        </div>
        <div className="flex gap-8 text-center bg-slate-50 p-4 rounded-xl border border-slate-100 w-full md:w-auto justify-around">
          <div>
            <div className="text-2xl font-bold text-slate-800">0</div>
            <div className="text-xs text-slate-500 font-medium uppercase">Cursos Completos</div>
          </div>
          <div className="border-l border-slate-200 pl-8">
            <div className="text-2xl font-bold text-slate-800">5</div>
            <div className="text-xs text-slate-500 font-medium uppercase">Atividades</div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <h3 className="font-bold text-slate-800">👤 Informações Adicionais</h3>
          <button className="text-xs bg-sky-100 text-sky-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-sky-200 transition-colors">
            Editar Perfil
          </button>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-400 uppercase">Biografia</h4>
          <p className="text-sm text-slate-600 mt-1 italic">Nenhuma biografia adicionada.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase">LinkedIn</span>
            <p className="text-sm text-sky-600 truncate mt-1">linkedin.com/in/thiano-lima</p>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase">GitHub</span>
            <p className="text-sm text-sky-600 truncate mt-1">github.com/thianolima</p>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase">Website</span>
            <p className="text-sm text-slate-400 mt-1">—</p>
          </div>
        </div>
      </div>
    </div>
  );
}