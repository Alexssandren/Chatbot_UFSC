import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileCheck, Users, LogOut } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../context/AuthContext';

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems: { to: string; icon: typeof LayoutDashboard; label: string; end?: boolean }[] = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/students', icon: Users, label: 'Alunos' },
  ];

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const initial = user?.username?.charAt(0).toUpperCase() ?? '?';

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
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
            {initial}
          </div>
          <div className="text-sm min-w-0">
            <p className="font-medium text-gray-900 truncate">{user?.username ?? '—'}</p>
            <p className="text-gray-500 text-xs">Admin</p>
          </div>
        </div>
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
