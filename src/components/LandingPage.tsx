import { useMemo, useState } from 'react';
import { Apple, Bell, BookOpen, Camera, ChevronRight, Coins, MapPin, MessageCircle, Mic, QrCode, Search, Smartphone, Sparkles, Truck } from 'lucide-react';
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
            <div className="pointer-events-none absolute left-1/2 top-3 z-10 h-5 w-28 -translate-x-1/2 rounded-full bg-slate-950" />
            <div className="aspect-[9/19.5] overflow-hidden rounded-[30px] bg-[#F5F0E1] shadow-inner">
              <div className="h-full overflow-hidden bg-[#F7F2E6] text-slate-900">
                <header className="rounded-b-2xl bg-[#14A76C] px-4 pb-4 pt-8 text-white shadow-md">
                  <div className="mb-2 flex items-center justify-between">
                    <img src={logoImg} alt="Já Doei" className="h-8 w-auto object-contain" />
                    <div className="flex items-center gap-2">
                      <div className="flex max-w-[142px] items-center gap-1 truncate rounded-full border border-white/15 bg-white/10 px-2 py-1.5 text-[10px] font-bold text-white">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#FF8243]" />
                        <span className="truncate">Cotia, SP</span>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                        <Bell className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-white/20 bg-white/15 p-3 shadow-inner backdrop-blur-md">
                    <div className="flex min-w-0 items-center gap-3">
                      <img src={dodoMascoteImg} alt="Dodo" className="h-9 w-9 shrink-0 object-contain" />
                      <div className="min-w-0">
                        <span className="block text-[11px] font-medium uppercase tracking-wider text-emerald-100">Seus Dodos</span>
                        <div className="flex items-baseline gap-1.5 text-white">
                          <span className="text-2xl font-black tracking-tight">250</span>
                          <span className="text-xs font-semibold text-emerald-200">Dodos</span>
                        </div>
                        <span className="mt-0.5 block text-[10px] text-white/90 underline">O que é um Dodo? ⓘ</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 rounded-xl bg-[#FF8243] px-3 py-2 text-xs font-bold text-white shadow-md">
                      <Sparkles className="h-3.5 w-3.5" />
                      Ganhar mais
                    </div>
                  </div>
                </header>

                <div className="space-y-2.5 px-4 pt-3">
                  <div className="relative flex items-center">
                    <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
                    <div className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-400 shadow-sm">
                      Buscar itens no Já Doei...
                    </div>
                  </div>

                  <div className="relative min-h-[140px] overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-orange-50 p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                    <img
                      src="/dodo-box.jpeg"
                      alt="Dodô segurando uma caixa de papelão"
                      className="absolute right-0 top-0 h-full w-[46%] object-cover object-center mix-blend-multiply"
                    />
                    <div className="relative z-10 w-[58%] space-y-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FF8243] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                        <Coins className="h-3 w-3" />
                        Dica de Economia
                      </span>
                      <h3 className="pt-0.5 text-sm font-extrabold leading-tight tracking-tight text-slate-800">Conheça a Caixinha do Dodô!</h3>
                      <p className="text-[11px] font-medium leading-snug text-slate-600">Resgate múltiplos itens do mesmo doador e pague um único frete.</p>
                    </div>
                    <div className="relative z-10 mt-2 inline-flex items-center gap-1 rounded-full bg-[#14A76C] px-3 py-1.5 text-[11px] font-bold text-white shadow-md">
                      Entender como funciona
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { title: 'Livro Mundos Habitados', category: 'Livros', credits: 35, Icon: BookOpen, color: 'bg-amber-100 text-amber-700' },
                      { title: 'Microfone de Lapela', category: 'Eletrônicos', credits: 90, Icon: Mic, color: 'bg-sky-100 text-sky-700' }
                    ].map((item) => {
                      const ItemIcon = item.Icon;
                      return (
                        <article key={item.title} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                          <div className={`flex h-20 items-center justify-center ${item.color}`}>
                            <ItemIcon className="h-9 w-9" />
                          </div>
                          <div className="space-y-1 p-2.5">
                            <p className="line-clamp-2 min-h-[28px] text-[10px] font-black leading-tight text-slate-800">{item.title}</p>
                            <p className="truncate text-[9px] font-semibold text-slate-400">{item.category} · Cotia, SP</p>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-black text-[#14A76C]">{item.credits} Dodos</span>
                              <span className="rounded-full bg-[#FF8243] px-2 py-1 text-[9px] font-black text-white">Resgatar</span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
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