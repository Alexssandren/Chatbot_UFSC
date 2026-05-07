import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileCheck } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export function Sidebar() {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    // Podemos adicionar mais itens no futuro
  ];

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
            className={({ isActive }) => twMerge(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive 
                ? 'bg-indigo-50 text-indigo-700' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
            P
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-900">Prof. Orientador</p>
            <p className="text-gray-500 text-xs">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
