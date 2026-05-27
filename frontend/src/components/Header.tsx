import { Menu, Bell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Header() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-4">
        <button className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md">
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-gray-800">Painel Administrativo</h1>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:inline text-sm text-gray-600">
          {user?.displayName ?? user?.username}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative" type="button">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>
      </div>
    </header>
  );
}
