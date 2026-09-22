import type { DonationItem, FreightOption } from '../types/donation';

export const FREIGHT_OPTIONS: FreightOption[] = [
  {
    id: 'lalamove_partner',
    category: 'padrao',
    categoryLabel: 'Contratação externa',
    name: 'Carreto & Utilitário',
    carrierName: 'Parceiro de transporte',
    price: 0,
    deliveryTime: 'Cotação em tempo real',
    icon: '🚛',
    type: 'standard'
  },
  {
    id: 'ja_doei_express',
    category: 'padrao',
    categoryLabel: 'Opções Padrão / Econômica',
    name: 'Envio Padrão (Loggi/Partner)',
    carrierName: 'Loggi',
    price: 12.90,
    deliveryTime: '1 a 2 dias úteis',
    icon: '🚚',
    type: 'standard',
    badge: 'Padrão Selecionado'
  },
  {
    id: 'correios',
    category: 'padrao',
    categoryLabel: 'Opções Padrão / Econômica',
    name: 'Correios Econômico',
    carrierName: 'Correios',
    price: 9.90,
    deliveryTime: '3 a 5 dias úteis',
    icon: '📦',
    type: 'standard'
  },
];

// Default mock products
export const INITIAL_ITEMS: DonationItem[] = [
  {
    id: '1',
    title: 'Cadeira Ergonômica Presidente',
    category: 'Móveis',
    credits: 150,
    location: 'Perdizes, SP',
    imageUrl: 'https://images.pexels.com/photos/1957477/pexels-photo-1957477.jpeg?auto=compress&cs=tinysrgb&w=600',
    description: 'Cadeira de escritório ergonômica presidente com ajuste de altura a gás, mecanismo relax e apoio para a lombar. Apresenta excelente estado.',
    condition: 'Usado - Excelente estado',
    createdAt: 'Hoje',
    isFeatured: true,
    donorName: 'Fernanda Lima',
    donorAvatar: 'https://images.pexels.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
  },
  {
    id: '2',
    title: 'Tênis Infantil Tam 28',
    category: 'Calçados',
    credits: 20,
    location: 'Vila Mariana, SP',
    imageUrl: 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=600',
    description: 'Tênis infantil muito confortável e leve, pouco usado. Solado intacto, ótimo para caminhadas e escola.',
    condition: 'Usado - Bom estado',
    createdAt: 'Ontem',
    donorName: 'Carlos Mendes',
    donorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150'
  },
  {
    id: '3',
    title: 'Tablet 10 polegadas',
    category: 'Eletrônicos',
    credits: 80,
    location: 'Moema, SP',
    imageUrl: 'https://images.pexels.com/photos/1334597/pexels-photo-1334597.jpeg?auto=compress&cs=tinysrgb&w=600',
    description: 'Tablet para estudos ou leitura em ótimo estado. Tela sem trincos, bateria durando bem e acompanha cabo original.',
    condition: 'Seminovo - Funcionando 100%',
    createdAt: 'Há 2 dias',
    donorName: 'Roberto Alves',
    donorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150'
  },
  {
    id: '4',
    title: 'Jaqueta Jeans Oversized',
    category: 'Roupas',
    credits: 30,
    location: 'Pinheiros, SP',
    imageUrl: 'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=600',
    description: 'Jaqueta jeans unissex tamanho G em ótimo estado de conservação. Ideal para dias de meia-estação, sem rasgos nem manchas.',
    condition: 'Seminovo - Excelente estado',
    createdAt: 'Há 3 dias',
    donorName: 'Mariana Silva',
    donorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
  },
  {
    id: '5',
    title: 'Coleção de Livros HP',
    category: 'Livros',
    credits: 25,
    location: 'Jardins, SP',
    imageUrl: 'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=600',
    description: 'Coleção completa com capas preservadas e páginas amareladas pelo tempo, sem rabiscos.',
    condition: 'Seminovo - Conservado',
    createdAt: 'Há 1 dia',
    donorName: 'Lucas Torres',
    donorAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=150'
  },
  {
    id: '6',
    title: 'Jogo de Panelas Inox',
    category: 'Casa & Cozinha',
    credits: 45,
    location: 'Santana, SP',
    imageUrl: 'https://images.pexels.com/photos/5824901/pexels-photo-5824901.jpeg?auto=compress&cs=tinysrgb&w=600',
    description: 'Conjunto com 4 panelas em aço inoxidável com fundo duplo. Totalmente higienizadas e prontas para uso.',
    condition: 'Usado - Higienizado',
    createdAt: 'Hoje',
    donorName: 'Ana Paula',
    donorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150'
  }
];

export const DONATION_CATEGORIES = [
  'Música & Instrumentos',
  'Casa, Cozinha & Utensílios',
  'Móveis & Decoração',
  'Eletrônicos & Tecnologia',
  'Esporte & Lazer',
  'Brinquedos & Jogos',
  'Moda & Acessórios',
  'Papelaria & Escritório',
  'Livros & Mídias',
  'Outros'
] as const;

export const CATEGORIES = ['Todas', ...DONATION_CATEGORIES];

// Categorias de vestuário/acessórios que exibem o seletor de tamanho no cadastro
export const APPAREL_CATEGORIES: string[] = ['Moda & Acessórios'];

export const CLOTHING_KIDS_SIZE_OPTIONS = [
  'Prematuro', 'RN', '0-3 meses', '3-6 meses', '6-12 meses', '12 a 18 meses',
  '18 a 24 meses', 'Tamanho 2', 'Tamanho 3', 'Tamanho 4', 'Tamanho 6', 'Tamanho 8',
  'Tamanho 10', 'Tamanho 12'
];

export const CLOTHING_ADULT_SIZE_OPTIONS = [
  'Tamanho Único', 'PP', 'P', 'M', 'G', 'GG', 'XGG / Plus Size'
];

export const SHOE_SIZE_OPTIONS = [
  ...Array.from({ length: 45 - 16 + 1 }, (_, i) => String(16 + i)),
  'Infantil / Diversos'
];
