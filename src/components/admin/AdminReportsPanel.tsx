import { useEffect, useState } from 'react';
import { Ban, EyeOff, ShieldCheck, Trash2 } from 'lucide-react';
import type { AdminReport } from '../../types/donation';
import {
  banReportedUser,
  deleteReportedDonation,
  dismissReport,
  subscribeToPendingReports
} from '../../services/adminService';

export function AdminReportsPanel() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToPendingReports(
      (nextReports) => {
        setReports(nextReports);
        setIsLoading(false);
      },
      (error) => {
        console.error('Erro ao carregar denúncias pendentes:', error);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const runAction = async (reportId: string, action: () => Promise<void>) => {
    setPendingActionId(reportId);
    try {
      await action();
    } catch (error) {
      console.error('Erro ao executar ação de moderação:', error);
      window.alert('Não foi possível concluir a ação. Tente novamente.');
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-[#14A76C]" />
        <div>
          <h1 className="text-lg font-black text-slate-800">Moderação de Denúncias</h1>
          <p className="text-xs text-slate-500">Painel Administrativo · Já Doei</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Carregando denúncias...</p>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <ShieldCheck className="mx-auto mb-2 h-9 w-9 text-emerald-500" />
          <p className="text-sm font-semibold text-slate-600">Nenhuma denúncia pendente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const isBusy = pendingActionId === report.id;
            return (
              <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-extrabold text-slate-900">{report.donationTitle}</h2>
                    <p className="mt-1 text-xs font-bold text-amber-700">Motivo: {report.reason}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">
                    Pendente
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  <strong>Detalhes:</strong> {report.details || 'Nenhum detalhe informado.'}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Denunciado por: <strong>{report.reporterName}</strong>
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Item: {report.donationId || 'indisponível'} · Autor: {report.reportedUserId || 'desconhecido'}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void runAction(report.id, () => deleteReportedDonation(report))}
                    className="flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir Item
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void runAction(report.id, () => dismissReport(report.id))}
                    className="flex items-center gap-1 rounded-xl bg-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                  >
                    <EyeOff className="h-3.5 w-3.5" /> Ignorar Denúncia
                  </button>
                  <button
                    type="button"
                    disabled={isBusy || !report.reportedUserId}
                    onClick={() => {
                      if (!report.reportedUserId) return;
                      void runAction(report.id, () => banReportedUser(report.reportedUserId!));
                    }}
                    className="flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold text-white hover:bg-black disabled:opacity-50"
                  >
                    <Ban className="h-3.5 w-3.5" /> Banir Usuário
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
