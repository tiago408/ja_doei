import { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { UserAddress } from '../types/database';
import { SIGNUP_VERIFICATION_MESSAGE, signUpWithEmail } from '../services/authService';
import { GoogleIcon } from './icons/GoogleIcon';

interface SignUpModalProps {
  logoSrc: string;
  isBusy?: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  onGoogleSignUp: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const EMPTY_ADDRESS: UserAddress = {
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: ''
};

const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

// Máscara (00) 00000-0000
const formatWhatsapp = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14A76C]';
const labelClass = 'text-[11px] font-semibold text-slate-600 block mb-1';

export function SignUpModal({
  logoSrc,
  isBusy = false,
  onClose,
  onSwitchToLogin,
  onGoogleSignUp,
  onSuccess,
  onError
}: SignUpModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState<UserAddress>(EMPTY_ADDRESS);
  const [cepError, setCepError] = useState('');
  const [isLookingUpCep, setIsLookingUpCep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateAddress = (field: keyof UserAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  // Busca o endereço no ViaCEP assim que o CEP tem 8 dígitos
  const handleCepChange = async (value: string) => {
    const masked = formatCep(value);
    setAddress((prev) => ({ ...prev, cep: masked }));
    setCepError('');

    const digits = masked.replace(/\D/g, '');
    if (digits.length !== 8) return;

    setIsLookingUpCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) throw new Error(`ViaCEP respondeu HTTP ${response.status}`);
      const data = (await response.json()) as {
        erro?: boolean | string;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };

      if (data.erro) {
        setCepError('CEP não encontrado. Confira o número digitado.');
        return;
      }

      setAddress((prev) => ({
        ...prev,
        logradouro: data.logradouro || prev.logradouro,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado
      }));
    } catch (error) {
      console.error('Erro ao consultar o ViaCEP:', error);
      setCepError('Não foi possível buscar o CEP agora. Preencha o endereço manualmente.');
    } finally {
      setIsLookingUpCep(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (whatsapp.replace(/\D/g, '').length < 10) {
      onError('Informe um WhatsApp válido com DDD.');
      return;
    }
    if (address.cep.replace(/\D/g, '').length !== 8) {
      onError('Informe um CEP válido com 8 dígitos.');
      return;
    }
    if (!address.cidade.trim() || !address.estado.trim()) {
      onError('Não foi possível identificar sua cidade. Confira o CEP informado.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUpWithEmail({ name, email, password, whatsapp, address });
      onSuccess(SIGNUP_VERIFICATION_MESSAGE);
      onClose();
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      const code = (error as { code?: string }).code;
      if (code === 'auth/email-already-in-use') {
        onError('Este e-mail já está cadastrado. Faça login para continuar.');
      } else if (code === 'auth/weak-password') {
        onError('A senha precisa ter pelo menos 6 caracteres.');
      } else {
        onError('Não foi possível criar sua conta. Verifique os dados e tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabled = isSubmitting || isBusy;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, y: 120 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 120 }}
        className="relative w-full sm:max-w-md bg-[#F5F0E1] rounded-t-[32px] sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar border-0 p-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 shadow-xs transition-all"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center pt-2 pb-4">
          <img src={logoSrc} alt="Já Doei" className="h-12 w-auto object-contain mb-2" />
          <p className="text-xs font-medium text-slate-500">Crie sua conta para doar e resgatar itens</p>
        </div>

        <div className="flex items-center gap-1.5 bg-white rounded-full p-1 border border-slate-200 shadow-2xs mb-5">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="flex-1 py-2 rounded-full text-xs font-bold text-slate-500 hover:text-slate-700 transition-all"
          >
            Entrar
          </button>
          <button
            type="button"
            className="flex-1 py-2 rounded-full text-xs font-bold bg-[#14A76C] text-white shadow-sm transition-all"
          >
            Criar Conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelClass}>Nome completo</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>WhatsApp</label>
            <input
              type="tel"
              required
              inputMode="numeric"
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatWhatsapp(e.target.value))}
              placeholder="(11) 91234-5678"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>CEP</label>
              <input
                type="text"
                required
                inputMode="numeric"
                value={address.cep}
                onChange={(e) => handleCepChange(e.target.value)}
                placeholder="00000-000"
                className={inputClass}
              />
              {isLookingUpCep && <p className="text-[10px] text-slate-500 mt-1">Buscando endereço...</p>}
              {cepError && <p className="text-[10px] text-rose-600 mt-1">{cepError}</p>}
            </div>
            <div>
              <label className={labelClass}>Número</label>
              <input
                type="text"
                required
                value={address.numero}
                onChange={(e) => updateAddress('numero', e.target.value)}
                placeholder="123"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Endereço</label>
            <input
              type="text"
              value={address.logradouro}
              onChange={(e) => updateAddress('logradouro', e.target.value)}
              placeholder="Rua, avenida..."
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Complemento</label>
            <input
              type="text"
              value={address.complemento || ''}
              onChange={(e) => updateAddress('complemento', e.target.value)}
              placeholder="Apto, bloco (opcional)"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className={labelClass}>Bairro</label>
              <input
                type="text"
                required
                value={address.bairro}
                onChange={(e) => updateAddress('bairro', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="col-span-1">
              <label className={labelClass}>Cidade</label>
              <input
                type="text"
                required
                value={address.cidade}
                onChange={(e) => updateAddress('cidade', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="col-span-1">
              <label className={labelClass}>Estado</label>
              <input
                type="text"
                required
                maxLength={2}
                value={address.estado}
                onChange={(e) => updateAddress('estado', e.target.value.toUpperCase())}
                className={`${inputClass} uppercase`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={disabled}
            className="w-full py-3 rounded-xl bg-[#14A76C] hover:bg-[#108958] active:scale-98 text-white text-xs font-bold shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Criando conta...' : 'Cadastrar e Começar'}
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] font-semibold text-slate-400 uppercase">ou</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={onGoogleSignUp}
            disabled={disabled}
            className="w-full py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <GoogleIcon className="w-4 h-4" />
            <span>Cadastrar com Google</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
}
