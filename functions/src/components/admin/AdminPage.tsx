import { AdminReportsPanel } from './AdminReportsPanel';

// Página raiz do Painel Administrativo — conteúdo inicial é a moderação de denúncias
export function AdminPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminReportsPanel />
    </div>
  );
}
