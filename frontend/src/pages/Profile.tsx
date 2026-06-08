import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { api, type PublicUser } from '../services/api';

export function Profile() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const me = await api.getCurrentUser();
        if (!me) {
          setError('Sessao expirada. Faca login novamente.');
          return;
        }
        setUser(me);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao carregar perfil.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-pulse rounded-full bg-indigo-200" />
        <p className="text-sm text-gray-600">Carregando perfil...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error ?? 'Perfil indisponivel.'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Perfil do orientador</h2>
        <p className="text-sm text-gray-500">Dados da sessao autenticada (somente leitura).</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
            <User className="h-7 w-7" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{user.displayName}</p>
            <p className="text-sm text-gray-500">@{user.username}</p>
          </div>
        </div>

        <dl className="space-y-4">
          <div>
            <dt className="text-sm text-gray-500">Nome de exibicao</dt>
            <dd className="font-medium text-gray-900">{user.displayName}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Usuario</dt>
            <dd className="font-medium text-gray-900">{user.username}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Papel no sistema</dt>
            <dd className="font-medium text-gray-900">{user.role}</dd>
          </div>
        </dl>

        <p className="mt-6 text-xs text-gray-500">
          Integracao com dados completos do Moodle pode ser adicionada em versao futura.
        </p>
      </div>
    </div>
  );
}
