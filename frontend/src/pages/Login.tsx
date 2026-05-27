import { useState, type FormEvent } from 'react';
import {
  Navigate,
  useLocation,
  useNavigate,
  type Location,
} from 'react-router-dom';
import { FileCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type LoginLocationState = {
  from?: Location;
};

function redirectPath(state: LoginLocationState | null): string {
  const pathname = state?.from?.pathname;
  if (pathname && pathname !== '/login') {
    return pathname + (state?.from?.search ?? '') + (state?.from?.hash ?? '');
  }
  return '/';
}

export function Login() {
  const { isAuthenticated, initialized, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LoginLocationState | null;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!initialized) return null;

  if (isAuthenticated) {
    const to = redirectPath(state);
    return <Navigate to={to} replace />;
  }

  const canSubmit =
    username.trim().length > 0 && password.length > 0 && !isSubmitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const ok = await login(username, password);
      if (!ok) {
        setError('Usuário ou senha inválidos.');
        return;
      }
      const to = redirectPath(state);
      navigate(to, { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-indigo-600">
          <div className="flex items-center gap-2 font-bold text-2xl">
            <FileCheck className="h-8 w-8" />
            <span>ValidaCert</span>
          </div>
          <p className="text-center text-sm text-gray-600">
            Acesso ao painel do orientador
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="login-username"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Usuário
            </label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Senha
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
