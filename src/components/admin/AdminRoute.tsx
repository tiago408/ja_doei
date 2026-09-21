import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { checkUserIsAdmin } from '../../services/adminService';

type AdminAccessStatus = 'checking' | 'authorized' | 'unauthorized';

// Rota protegida: só renderiza os filhos se o usuário autenticado tiver role 'admin' no Firestore
export function AdminRoute({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AdminAccessStatus>('checking');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setStatus('unauthorized');
        return;
      }
      try {
        const isAdmin = await checkUserIsAdmin(firebaseUser.uid);
        setStatus(isAdmin ? 'authorized' : 'unauthorized');
      } catch (error) {
        console.error('Erro ao verificar permissão de administrador:', error);
        setStatus('unauthorized');
      }
    });
    return () => unsubscribe();
  }, []);

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-semibold text-slate-500">Verificando permissões...</p>
      </div>
    );
  }

  if (status === 'unauthorized') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
