import Sidebar from '@/components/Sidebar';
import EwsPanel from '@/components/EwsPanel';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:block h-full">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              Command Center Aceh Tengah
            </span>
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
              🟢 Online
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Right Panel - EWS */}
      <div className="hidden xl:block w-72 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        <EwsPanel />
      </div>
    </div>
  );
}
