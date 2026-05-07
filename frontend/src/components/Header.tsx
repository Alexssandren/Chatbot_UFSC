import { Menu, Bell } from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-4">
        <button className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md">
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-gray-800">Painel Administrativo</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>
      </div>
    </header>
  );
}
