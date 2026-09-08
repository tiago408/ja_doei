import { AnimatePresence, motion } from 'motion/react';
import {
  X,
  Box,
  Compass,
  PackagePlus,
  PiggyBank,
  ChevronRight
} from 'lucide-react';

interface DodoBoxInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: Compass,
    title: 'Explore',
    description:
      'Encontrou algo legal no Feed? Visite o perfil do doador para ver outros desapegos dele.',
    iconClasses: 'bg-sky-100 text-sky-600'
  },
  {
    icon: PackagePlus,
    title: 'Junte',
    description:
      "Clique em 'Adicionar à Caixinha do Dodô' em até 4 itens do mesmo perfil.",
    iconClasses: 'bg-orange-100 text-[#FF8243]'
  },
  {
    icon: PiggyBank,
    title: 'Economize',
    description:
      'O sistema calcula as dimensões combinadas e gera uma etiqueta única com frete unificado no checkout!',
    iconClasses: 'bg-emerald-100 text-[#14A76C]'
  }
];

export function DodoBoxInfoModal({ isOpen, onClose }: DodoBoxInfoModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[92vw] max-w-md max-h-[85vh] overflow-y-auto rounded-3xl bg-white shadow-2xl flex flex-col border border-slate-200"
            role="dialog"
            aria-modal="true"
            aria-label="Como funciona a Caixinha do Dodô?"
          >
            {/* Hero Image */}
            <div className="relative pt-12 pb-4 px-4 flex justify-center items-center bg-amber-50/50 rounded-t-3xl border-b border-emerald-100/60">
              <img
                src="/dodo-box.jpeg"
                alt="Dodô segurando uma caixa de papelão"
                className="max-h-44 w-auto object-contain shrink-0 mix-blend-multiply"
              />
              <span className="absolute top-4 left-4 z-10 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-[#FF8243] text-white px-2.5 py-1 rounded-full shadow-xs">
                <Box className="w-3 h-3" />
                Dica de Economia
              </span>
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-sm text-slate-500 hover:text-slate-700 transition-all"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 no-scrollbar">
              <div className="space-y-1">
                <h2 className="text-base font-extrabold text-slate-800 tracking-tight">
                  Como funciona a Caixinha do Dodô?
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Um único frete para vários itens do mesmo doador. 📦
                </p>
              </div>

              <ol className="space-y-3">
                {STEPS.map((step, index) => (
                  <li key={step.title} className="flex items-start gap-3">
                    <div
                      className={`relative w-9 h-9 rounded-xl ${step.iconClasses} flex items-center justify-center shrink-0 shadow-2xs`}
                    >
                      <step.icon className="w-4.5 h-4.5" />
                      <span className="absolute -top-1.5 -left-1.5 w-4.5 h-4.5 rounded-full bg-slate-800 text-white text-[9px] font-black flex items-center justify-center shadow-2xs">
                        {index + 1}
                      </span>
                    </div>
                    <div className="pt-0.5">
                      <h3 className="text-xs font-extrabold text-slate-800">
                        {step.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 leading-snug font-medium">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Footer CTA */}
            <div className="sticky bottom-0 bg-white p-4 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-2xl bg-[#14A76C] hover:bg-[#118b5a] active:scale-[0.98] text-white text-sm font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <span>Entendi, quero explorar!</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
