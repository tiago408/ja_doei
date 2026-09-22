import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Ban, ChevronRight, EyeOff, Package, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import type { AdminReport } from '../../types/donation';
import {
  banReportedUser,
  deleteReportedDonation,
  dismissReport,
  fetchDonationSummary,
  fetchUserSummary,
  subscribeToPendingReports,
  type AdminDonationSummary,
  type AdminUserSummary
} from '../../services/adminService';

interface ReportDetails {
  donation: AdminDonationSummary | null;
  reportedUser: AdminUserSummary | null;
}

export function AdminReportsPanel() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [detailsByReportId, setDetailsByReportId] = useState<Record<string, ReportDetails>>({});

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

  // Busca o item e o usuário denunciados assim que uma nova denúncia aparece na fila
  useEffect(() => {
    const pendingReports = reports.filter((report) => !(report.id in detailsByReportId));
    if (pendingReports.length === 0) return;

    let isCancelled = false;
    void Promise.all(
      pendingReports.map(async (report) => {
        const [donation, reportedUser] = await Promise.all([
          fetchDonationSummary(report.donationId).catch(() => null),
          report.reportedUserId ? fetchUserSummary(report.reportedUserId).catch(() => null) : Promise.resolve(null)
        ]);
        return [report.id, { donation, reportedUser }] as const;
      })
    ).then((entries) => {
      if (isCancelled) return;
      setDetailsByReportId((current) => {
        const next = { ...current };
        for (const [reportId, details] of entries) next[reportId] = details;
        return next;
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [reports, detailsByReportId]);

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
      <button
        type="button"
        onClick={() => navigate('/?tab=profile')}
        className="mb-4 flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao perfil
      </button>

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
            const details = detailsByReportId[report.id];
            const donation = details?.donation;
            const reportedUser = details?.reportedUser;
            const isAlreadyBanned = reportedUser?.banned === true;

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

                {/* Contexto do item denunciado — clicável para abrir o item no app */}
                <button
                  type="button"
                  disabled={!report.donationId}
                  onClick={() => navigate(`/?viewItemId=${report.donationId}`)}
                  className="mt-3 flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-left transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-200">
                    {donation?.imageUrl ? (
                      <img src={donation.imageUrl} alt={donation.title} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-800">{donation?.title || report.donationTitle}</p>
                    <p className="text-[10px] text-slate-500">
                      {donation ? (
                        <>
                          {donation.category || 'Sem categoria'} · {donation.credits ?? '–'} Dodos · status: {donation.status || 'desconhecido'}
                        </>
                      ) : (
                        `ID: ${report.donationId || 'indisponível'} (item não encontrado)`
                      )}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </button>

                {/* Contexto do usuário denunciado — clicável para abrir o perfil (Quartinho da Bagunça) no app */}
                <button
                  type="button"
                  disabled={!report.reportedUserId}
                  onClick={() => navigate(`/?viewUserId=${report.reportedUserId}`)}
                  className="mt-2 flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-left transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200">
                    {reportedUser?.photoURL ? (
                      <img src={reportedUser.photoURL} alt={reportedUser.name || 'Usuário'} className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-800">
                      {reportedUser?.name || 'Usuário não encontrado'}
                      {isAlreadyBanned && (
                        <span className="ml-2 rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">
                          Banido
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {reportedUser?.email || `ID: ${report.reportedUserId || 'desconhecido'}`}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </button>

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
                    disabled={isBusy || !report.reportedUserId || isAlreadyBanned}
                    onClick={() => {
                      if (!report.reportedUserId) return;
                      void runAction(report.id, () => banReportedUser(report.reportedUserId!));
                    }}
                    className="flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold text-white hover:bg-black disabled:opacity-50"
                  >
                    <Ban className="h-3.5 w-3.5" /> {isAlreadyBanned ? 'Já Banido' : 'Banir Usuário'}
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
