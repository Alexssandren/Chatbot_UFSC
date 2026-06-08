import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileCheck, Users, LogOut, UserCircle } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../context/AuthContext';

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems: { to: string; icon: typeof LayoutDashboard; label: string; end?: boolean }[] = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/students', icon: Users, label: 'Alunos' },
    { to: '/profile', icon: UserCircle, label: 'Meu perfil' },
  ];

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const label = user?.displayName ?? user?.username ?? '—';
  const initial = label.charAt(0).toUpperCase();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex md:flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
          <FileCheck className="h-6 w-6" />
          <span>ValidaCert</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              twMerge(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 space-y-3">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="flex w-full items-center gap-3 rounded-md px-1 py-1 text-left hover:bg-gray-50"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
            {initial}
          </div>
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-gray-900">{label}</p>
            <p className="text-xs text-gray-500">Orientador — ver perfil</p>
          </div>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
