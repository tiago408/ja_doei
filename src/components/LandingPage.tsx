import { useMemo, useState } from 'react';
import { Apple, Camera, MessageCircle, QrCode, Smartphone, Truck } from 'lucide-react';
import logoImg from '../assets/logo.png';
import simboloImg from '../assets/simbolo.png';
import dodoMascoteImg from '../assets/dodo-mascote.png';

interface LandingPageProps {
  onOpenWebApp: () => void;
}

export function LandingPage({ onOpenWebApp }: LandingPageProps) {
  const [isQrOpen, setIsQrOpen] = useState(false);
  const appUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'https://jadoei.app';
    return window.location.origin;
  }, []);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(appUrl)}`;

  return (
    <main className="min-h-screen bg-[#F5F0E1] text-slate-900">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-6 xl:px-8">
        <div className="flex items-center gap-3">
          <img src={simboloImg} alt="Já Doei" className="h-12 w-auto object-contain" />
        </div>

        <div className="relative flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenWebApp}
            className="text-xs font-bold text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline"
          >
            Ver WebApp no Desktop
          </button>
          <button
            type="button"
            onClick={() => setIsQrOpen((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full bg-[#14A76C] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#108958]"
          >
            <QrCode className="h-4 w-4" />
            Acessar via Celular
          </button>

          {isQrOpen && (
            <div className="absolute right-0 top-14 z-20 w-72 rounded-2xl border border-emerald-100 bg-white p-4 text-center shadow-2xl">
              <p className="mb-3 text-xs font-bold text-slate-700">Escaneie para abrir no smartphone</p>
              <img src={qrCodeUrl} alt="QR Code para acessar o Já Doei" className="mx-auto h-44 w-44 rounded-xl border border-slate-100" />
              <p className="mt-3 break-all text-[10px] font-medium text-slate-400">{appUrl}</p>
            </div>
          )}
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-104px)] w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 pb-16 xl:grid-cols-[1fr_480px] xl:px-8">
        <div>
          <span className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#14A76C] shadow-sm">
            Economia circular na sua região
          </span>

          <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.98] tracking-normal text-slate-950 xl:text-6xl">
            A plataforma de doação e economia circular.
          </h1>

          <p className="mt-6 max-w-2xl text-xl font-medium leading-relaxed text-slate-600">
            Desapegue do que não usa mais e resgate itens incríveis na sua região.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-3 rounded-2xl bg-slate-950 px-5 py-3 text-left text-white shadow-xl shadow-slate-900/15 opacity-90"
              title="Em breve"
            >
              <Apple className="h-6 w-6" />
              <span>
                <span className="block text-[10px] font-bold uppercase text-slate-300">Em breve na</span>
                <span className="block text-sm font-extrabold">App Store</span>
              </span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-3 rounded-2xl bg-slate-950 px-5 py-3 text-left text-white shadow-xl shadow-slate-900/15 opacity-90"
              title="Em breve"
            >
              <Smartphone className="h-6 w-6" />
              <span>
                <span className="block text-[10px] font-bold uppercase text-slate-300">Em breve no</span>
                <span className="block text-sm font-extrabold">Google Play</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIsQrOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-extrabold text-[#14A76C] shadow-sm transition hover:border-[#14A76C]"
            >
              <QrCode className="h-5 w-5" />
              Abrir por QR Code
            </button>
          </div>

          <div className="mt-12 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { icon: Camera, title: 'Anuncie em 1 minuto', copy: 'Tire foto do item e publique sem custos.' },
              { icon: MessageCircle, title: 'Combine pelo Chat', copy: 'Converse em tempo real com quem quer doar ou receber.' },
              { icon: Truck, title: 'Logística Descomplicada', copy: 'Retirada no local ou carreto agendado via Lalamove para itens grandes.' }
            ].map((step) => {
              const StepIcon = step.icon;
              return (
                <article key={step.title} className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-sm">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#14A76C]/10 text-[#14A76C]">
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <h2 className="text-sm font-black text-slate-900">{step.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.copy}</p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="relative hidden justify-center xl:flex">
          <div className="absolute -left-8 top-16 h-40 w-40 rounded-full bg-[#FF8243]/20 blur-3xl" />
          <div className="absolute -right-10 bottom-20 h-48 w-48 rounded-full bg-[#14A76C]/20 blur-3xl" />
          <div className="relative w-[330px] rounded-[42px] border-[10px] border-slate-950 bg-slate-950 p-2 shadow-2xl shadow-slate-900/30">
            <div className="overflow-hidden rounded-[30px] bg-[#F5F0E1]">
              <div className="flex items-center justify-between bg-white px-4 py-4">
                <img src={logoImg} alt="Já Doei" className="h-7 w-auto object-contain" />
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#14A76C]/10 text-xs font-black text-[#14A76C]">JD</div>
              </div>
              <div className="space-y-3 p-4">
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <img src={dodoMascoteImg} alt="Dodô" className="mx-auto h-28 w-28 object-contain" />
                  <p className="mt-2 text-center text-xs font-black text-slate-800">Feed de desapegos perto de você</p>
                </div>
                {['Cadeira de escritório', 'Livro infantil', 'Mesa lateral'].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                    <div className={`h-12 w-12 rounded-xl ${index === 0 ? 'bg-emerald-100' : index === 1 ? 'bg-orange-100' : 'bg-sky-100'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-slate-800">{item}</p>
                      <p className="text-[10px] font-semibold text-slate-400">Cotia, SP · disponível</p>
                    </div>
                    <span className="rounded-full bg-[#FF8243] px-2 py-1 text-[10px] font-black text-white">Resgatar</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 border-t border-slate-200 px-6 py-6 text-xs font-semibold text-slate-500 xl:px-8">
        <span>© {new Date().getFullYear()} Já Doei. Todos os direitos reservados.</span>
        <div className="flex items-center gap-5">
          <a href="#termos" className="hover:text-slate-900">Termos de Uso</a>
          <a href="#privacidade" className="hover:text-slate-900">Política de Privacidade</a>
        </div>
      </footer>
    </main>
  );
}