import { useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState<string>('');
  const [senha, setSenha] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/tokens', {
        email,
        senha,
      });

      // Captura o accessToken do retorno da API
      const { accessToken } = response.data;

      if (accessToken) {
        onLoginSuccess(accessToken);
      } else {
        setError('Token não recebido da API.');
      }
    } catch (err: any) {
      console.error('Erro ao autenticar:', err);
      setError(
        err.response?.data?.message || 
        'Falha na autenticação. Verifique seu e-mail e senha.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 font-sans px-4">
      <div className="max-w-md w-full bg-[#091522] border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
        
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-wider text-white uppercase">
            Financeiro
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Insira suas credenciais para acessar a plataforma
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-3 rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-[#060f1a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Senha
            </label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#060f1a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#38bdf8] text-[#091522] hover:bg-sky-400 font-semibold py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-[#091522] border-t-transparent rounded-full animate-spin" />
            ) : (
              'Entrar no Sistema'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}