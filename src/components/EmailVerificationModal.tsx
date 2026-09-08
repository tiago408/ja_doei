import { useState } from 'react';
import { motion } from 'motion/react';
import { MailCheck, X } from 'lucide-react';
import { resendVerificationEmail } from '../services/authService';

interface EmailVerificationModalProps {
  email?: string | null;
  onClose: () => void;
  onFeedback: (message: string, type: 'success' | 'info' | 'error') => void;
}

export function EmailVerificationModal({ email, onClose, onFeedback }: EmailVerificationModalProps) {
  const [isSending, setIsSending] = useState(false);

  const handleResend = async () => {
    setIsSending(true);
    try {
      const sent = await resendVerificationEmail();
      if (sent) {
        onFeedback('E-mail de confirmação reenviado. Confira sua caixa de entrada e o spam.', 'success');
      } else {
        onFeedback('Seu e-mail já está confirmado!', 'success');
        onClose();
      }
    } catch (error) {
      console.error('Erro ao reenviar e-mail de confirmação:', error);
      onFeedback('Não foi possível reenviar agora. Tente novamente em alguns minutos.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.96 }}
        className="relative w-[92vw] max-w-sm bg-[#F5F0E1] rounded-3xl shadow-2xl border border-slate-200/80 p-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 shadow-xs transition-all"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#14A76C]/10 text-[#14A76C] flex items-center justify-center mb-3">
            <MailCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-800 mb-2">Confirme seu e-mail</h3>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Para garantir a segurança da comunidade, clique no botão de confirmação que enviamos para o seu e-mail antes
            de realizar seu primeiro resgate.
          </p>
          {email && <p className="text-[11px] font-bold text-slate-700 mt-2 break-all">{email}</p>}
        </div>

        <button
          type="button"
          onClick={handleResend}
          disabled={isSending}
          className="w-full mt-5 py-3 rounded-xl bg-[#14A76C] hover:bg-[#108958] active:scale-98 text-white text-xs font-bold shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSending ? 'Enviando...' : 'Reenviar E-mail de Confirmação'}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
        >
          Fechar
        </button>
      </motion.div>
    </div>
  );
}
