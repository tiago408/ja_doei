import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Heart,
  Search,
  Plus,
  Home,
  User,
  MapPin,
  Coins,
  Sparkles,
  X,
  Check,
  Award,
  PackageCheck,
  Gift,
  Bell,
  Filter,
  CheckCircle2,
  AlertCircle,
  Truck,
  Store,
  MessageCircle,
  Send,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Info,
  QrCode,
  CreditCard,
  Copy,
  Box,
  Clock,
  Calculator,
  HelpCircle,
  FileText,
  Bot,
  LogOut,
  Camera,
  LocateFixed,
  Inbox,
  Pencil,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
  deleteDoc,
  getDoc,
  setDoc,
  updateDoc,
  increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { db, storage, auth } from './firebase';
import { evaluateItemWithGemini } from './aiPricingService';
import logoImg from './assets/logo.png';
import simboloImg from './assets/simbolo.png';

// Item Interface
interface DonationItem {
  id: string;
  title: string;
  category: string;
  credits: number;
  location: string;
  imageUrl: string;
  description?: string;
  condition?: string;
  createdAt: string;
  isFavorite?: boolean;
  isRedeemed?: boolean;
  isFeatured?: boolean;
  status?: 'available' | 'reserved' | 'express_accepted' | 'in_transit' | 'completed';
  donorName?: string;
  donorAvatar?: string;
  userId?: string | null;
  receiverId?: string | null;
  userLocation?: string;
  isLargeItem?: boolean;
}

export interface FreightOption {
  id: string;
  category: 'padrao';
  categoryLabel: string;
  name: string;
  carrierName: string;
  price: number;
  deliveryTime: string;
  icon: string;
  type: 'express' | 'standard';
  badge?: string;
}

const FREIGHT_OPTIONS: FreightOption[] = [
  {
    id: 'lalamove_partner',
    category: 'padrao',
    categoryLabel: 'Contratação externa',
    name: 'Carreto & Utilitário (Lalamove Partner)',
    carrierName: 'Lalamove Partner',
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
const INITIAL_ITEMS: DonationItem[] = [
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

const DONATION_CATEGORIES = [
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

const CATEGORIES = ['Todas', ...DONATION_CATEGORIES];

// Simple Google "G" logo used on the Auth Modal social button
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.5-1.9 14.3-5.1l-6.6-5.4C29.6 35.4 26.9 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.6 5.1C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.6 5.4C39.9 36.6 44 31 44 24c0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}

interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt: Date | null;
  read: boolean;
}

export default function App() {
  // Splash Screen State
  const [showSplash, setShowSplash] = useState<boolean>(true);

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  // App state
  const [items, setItems] = useState<DonationItem[]>(INITIAL_ITEMS);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Loads donations from Firestore in real time and merges them with the local mock feed
  useEffect(() => {
    const donationsRef = collection(db, 'donations');
    const donationsQuery = query(donationsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(donationsQuery, (snapshot) => {
      const firestoreItems: DonationItem[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title,
          category: data.category,
          credits: data.credits,
          location: data.location,
          condition: data.condition,
          imageUrl: data.imageUrl || data.image,
          description: data.description,
          createdAt: 'Hoje',
          isFeatured: data.isFeatured || false,
          status: data.status || 'available',
          donorName: data.donorName || data.userName || 'Você',
          donorAvatar: data.donorAvatar,
          userId: data.userId || null,
          receiverId: data.receiverId || null,
          userLocation: data.userLocation || data.location || undefined,
          isLargeItem: data.isLargeItem === true,
          isFavorite: false,
          isRedeemed: ['reserved', 'completed'].includes(data.status || 'available')
        };
      });

      setItems((prev) => {
        const mockOnly = prev.filter((item) => INITIAL_ITEMS.some((mock) => mock.id === item.id));
        return [...firestoreItems, ...mockOnly];
      });
    }, (error) => {
      console.error('Erro ao carregar doações do Firestore:', error);
    });

    return () => unsubscribe();
  }, []);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'favorites' | 'profile'>('home');

  // Auth State
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [user, setUser] = useState<{
    uid: string;
    name: string;
    email: string;
    photoURL?: string | null;
    city?: string;
    location?: string;
  } | null>(null);
  const [authName, setAuthName] = useState<string>('');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authWhatsapp, setAuthWhatsapp] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      return;
    }

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const nextNotifications: AppNotification[] = snapshot.docs
        .map((notificationDoc) => {
          const data = notificationDoc.data();
          const createdAt = data.createdAt?.toDate?.() ?? null;
          return {
            id: notificationDoc.id,
            title: data.title || 'Nova notificação',
            message: data.message || data.text || '',
            createdAt,
            read: data.read === true
          };
        })
        .sort((first, second) => {
          const firstTime = first.createdAt?.getTime() ?? 0;
          const secondTime = second.createdAt?.getTime() ?? 0;
          return secondTime - firstTime;
        });

      setNotifications(nextNotifications);
    }, (error) => {
      console.error('Erro ao sincronizar notificações:', error);
      setNotifications([]);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Edit Profile State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);
  const [editProfileName, setEditProfileName] = useState<string>('');
  const [editProfilePhotoPreview, setEditProfilePhotoPreview] = useState<string>('');
  const [editProfilePhotoFile, setEditProfilePhotoFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  const profileDonations = useMemo(
    () => (user
      ? items.filter((item) => item.userId === user.uid && (!item.status || item.status === 'available'))
      : []),
    [items, user]
  );

  const hasUnreadNotifications = notifications.some((notification) => !notification.read);
  const safeUserCredits = Math.max(-30, userCredits);

  // Keeps the logged-in user (name, email, photo) in sync with Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profileSnapshot = await getDoc(doc(db, 'users', firebaseUser.uid));
        const profile = profileSnapshot.exists() ? profileSnapshot.data() : {};
        const nextUser = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'Usuário Já Doei',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL,
          city: profile.city,
          location: profile.location
        };
        setUser(nextUser);
        if (nextUser.city || nextUser.location) {
          setNewLocation(nextUser.city?.trim() || nextUser.location?.trim() || 'São Paulo, SP');
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const profileLocation = getProfileLocation();
    if (profileLocation && !newLocation.trim()) {
      setNewLocation(profileLocation);
      return;
    }
    if (profileLocation && ['São Paulo, SP', 'Cotia, SP', 'Localização atual', 'Localização atual (GPS)', ''].includes(newLocation.trim())) {
      setNewLocation(profileLocation);
    }
  }, [user?.uid, user?.city, user?.location]);

  // Syncs the credits balance in real time from the users/{uid} Firestore document
  useEffect(() => {
    if (!user?.uid) {
      setUserCredits(0);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setUserCredits(snap.data().credits ?? 0);
      }
    }, (error) => {
      console.error('Erro ao sincronizar créditos do usuário:', error);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Requires the user to be logged in before proceeding; opens AuthModal otherwise
  const requireAuth = () => {
    if (!user) {
      setIsAuthOpen(true);
      return false;
    }
    return true;
  };

  // Creates the users/{uid} Firestore document with the 150-credit test balance on first signup only
  const ensureUserDocument = async (uid: string, name: string, email: string, photoURL?: string | null) => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name,
        email,
        photoURL: photoURL || null,
        credits: 150,
        createdAt: serverTimestamp()
      });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsAuthSubmitting(true);
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      await ensureUserDocument(
        credential.user.uid,
        credential.user.displayName || 'Usuário Já Doei',
        credential.user.email || '',
        credential.user.photoURL
      );
      setIsAuthOpen(false);
    } catch (error) {
      console.error('Erro ao entrar com Google:', error);
      showToast('Não foi possível entrar com o Google. Tente novamente.', 'error');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsAuthSubmitting(true);
      const credential = await signInWithEmailAndPassword(auth, authEmail, authPassword);
      await ensureUserDocument(
        credential.user.uid,
        credential.user.displayName || 'Usuário Já Doei',
        credential.user.email || '',
        credential.user.photoURL
      );
      setIsAuthOpen(false);
      setAuthEmail('');
      setAuthPassword('');
    } catch (error) {
      console.error('Erro ao entrar:', error);
      showToast('E-mail ou senha inválidos.', 'error');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsAuthSubmitting(true);
      const credential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      const displayName = authName.trim();
      if (displayName) {
        await updateProfile(credential.user, { displayName });
        setUser({
          uid: credential.user.uid,
          name: displayName,
          email: credential.user.email || '',
          photoURL: credential.user.photoURL
        });
      }
      await ensureUserDocument(
        credential.user.uid,
        displayName || 'Usuário Já Doei',
        credential.user.email || '',
        credential.user.photoURL
      );
      setIsAuthOpen(false);
      setAuthName('');
      setAuthEmail('');
      setAuthWhatsapp('');
      setAuthPassword('');
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      showToast('Não foi possível criar sua conta. Verifique os dados e tente novamente.', 'error');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.read) {
      try {
        await updateDoc(doc(db, 'notifications', notification.id), { read: true });
      } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
      }
    }

    setIsNotificationsModalOpen(false);
    setActiveTab('profile');
  };

  // Opens the Edit Profile modal pre-filled with the current name and photo
  const handleOpenEditProfile = () => {
    if (!user) return;
    setEditProfileName(user.name);
    setEditProfilePhotoPreview(user.photoURL || '');
    setEditProfilePhotoFile(null);
    setIsEditProfileOpen(true);
  };

  const handleEditProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditProfilePhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditProfilePhotoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Uploads the new photo (if any) to Storage, then syncs Auth + Firestore with the updated profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !user) return;

    setIsSavingProfile(true);
    try {
      let photoURL = user.photoURL || null;

      if (editProfilePhotoFile) {
        const photoRef = ref(storage, `profile_pictures/${auth.currentUser.uid}`);
        const uploadSnapshot = await uploadBytes(photoRef, editProfilePhotoFile);
        photoURL = await getDownloadURL(uploadSnapshot.ref);
      }

      const displayName = editProfileName.trim() || user.name;

      await updateProfile(auth.currentUser, { displayName, photoURL });
      await setDoc(doc(db, 'users', user.uid), { name: displayName, photoURL }, { merge: true });

      setUser({ ...user, name: displayName, photoURL });
      setIsEditProfileOpen(false);
      showToast('✅ Perfil atualizado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      showToast('Não foi possível atualizar o perfil. Tente novamente.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Modals & Interactivity Flows
  const [isDonateModalOpen, setIsDonateModalOpen] = useState<boolean>(false);
  const [isEarnModalOpen, setIsEarnModalOpen] = useState<boolean>(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState<boolean>(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<DonationItem | null>(null);
  const [selectedItemForRedeem, setSelectedItemForRedeem] = useState<DonationItem | null>(null);
  // Shipping & Logística state
  const [cepInput, setCepInput] = useState<string>('01310-100');
  const [isCepCalculated, setIsCepCalculated] = useState<boolean>(true);
  const [isCalculatingCep, setIsCalculatingCep] = useState<boolean>(false);
  const [selectedFreightId, setSelectedFreightId] = useState<string>('ja_doei_express');

  // Checkout Payment simulation & Monetization state
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [cardNumber, setCardNumber] = useState<string>('4532 8892 1029 3841');
  const [cardName, setCardName] = useState<string>('MARIANA A SILVA');
  const [cardExpiry, setCardExpiry] = useState<string>('12/28');
  const [cardCvv, setCardCvv] = useState<string>('892');
  const [isInsuranceSelected, setIsInsuranceSelected] = useState<boolean>(false);

  // Premium & Store (Quartinho da Bagunça) State
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState<boolean>(false);
  const [baguncaDonor, setBaguncaDonor] = useState<{
    name: string;
    avatar?: string;
    location?: string;
    bio?: string;
  } | null>(null);

  const [chatModalItem, setChatModalItem] = useState<DonationItem | null>(null);
  const [chatInputText, setChatInputText] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'donor'; text: string; time: string }>>([]);

  // Help Center & Chat IA state
  interface SuccessRedeemData {
    item: DonationItem;
    orderNumber: string;
    creditsUsed: number;
    freightPrice: number;
    cashComplement: number;
    insuranceFee: number;
    totalCashPaid: number;
    deliveryType: 'standard';
    carrierName: string;
    freightType: string;
    freightName: string;
  }
  const [successRedeemData, setSuccessRedeemData] = useState<SuccessRedeemData | null>(null);

  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [activeHelpTab, setActiveHelpTab] = useState<'geral' | 'faq' | 'resgatar' | 'doar'>('geral');
  const [isHelpShippingModalOpen, setIsHelpShippingModalOpen] = useState<boolean>(false);
  const [activeShippingHelpTab, setActiveShippingHelpTab] = useState<'express' | 'traditional'>('express');
  const [isChatIaOpen, setIsChatIaOpen] = useState<boolean>(false);
  const [chatIaInput, setChatIaInput] = useState<string>('');
  const [chatIaMessages, setChatIaMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: 'Olá! Sou a Assistente Virtual do Já Doei. 🤖 Como posso te ajudar hoje? Você pode me perguntar sobre frete, créditos, complemento em R$, doação ou assinatura premium!',
      time: '14:48'
    }
  ]);

  const handleSendIaMessage = (textToSend?: string) => {
    const query = (textToSend || chatIaInput).trim();
    if (!query) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsgUser = { sender: 'user' as const, text: query, time: userTime };

    setChatIaMessages((prev) => [...prev, newMsgUser]);
    if (!textToSend) setChatIaInput('');

    setTimeout(() => {
      const qLower = query.toLowerCase();
      let replyText = 'Entendi sua dúvida! O Já Doei conecta doadores e recebedores via sistema de créditos e logística 100% gerenciada por parceiros (Uber, Lalamove e Loggi). Se precisar de mais informações, consulte nossas abas de ajuda no menu!';

      if (qLower.includes('frete') || qLower.includes('entrega') || qLower.includes('envio') || qLower.includes('transport')) {
        replyText = '🚚 O frete é pago exclusivamente pelo recebedor no checkout e operado por entregadores parceiros (Uber Flash, Lalamove Moto/Utilitário e Correios). A coleta é feita diretamente na porta do doador sem nenhum custo para quem doa!';
      } else if (qLower.includes('crédito') || qLower.includes('credito') || qLower.includes('saldo') || qLower.includes('expir')) {
        replyText = '🪙 Cada doação aprovada te concede créditos acumulativos! Seus créditos NUNCA expiram. Ao faltar créditos para resgatar algo, você pode usar o Complemento em R$ (até 30% em dinheiro ou 40% para Assinantes Premium).';
      } else if (qLower.includes('premium') || qLower.includes('clube') || qLower.includes('assin')) {
        replyText = '💎 O Clube Já Doei Premium custa R$ 19,90/mês e te dá 40% de limite no complemento em dinheiro, 1 destaque grátis de desapego por mês, logística prioritária e selo VIP!';
      } else if (qLower.includes('doar') || qLower.includes('embalar') || qLower.includes('coleta') || qLower.includes('proibido')) {
        replyText = '📦 Para doar, clique no botão central "+ Doar". Embale o item em caixa de papelão ou sacola reforçada. É proibido doar medicamentos, armas, produtos inflamáveis ou itens ilícitos.';
      } else if (qLower.includes('seguro') || qLower.includes('troca') || qLower.includes('garantia') || qLower.includes('danific')) {
        replyText = '🛡️ O Seguro de Troca custa apenas R$ 1,99 e garante reembolso total dos seus créditos e do valor do frete caso o item chegue danificado ou diferente do anunciado.';
      }

      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatIaMessages((prev) => [...prev, { sender: 'bot', text: replyText, time: botTime }]);
    }, 350);
  };

  // New Item Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Música & Instrumentos');
  const [newCredits, setNewCredits] = useState<number>(100);
  const [newLocation, setNewLocation] = useState('São Paulo, SP');
  const [newCondition, setNewCondition] = useState('Usado - Excelente');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIsFeatured, setNewIsFeatured] = useState<boolean>(false);
  const [isLargeItem, setIsLargeItem] = useState<boolean>(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);
  const [isPricingAnalyzing, setIsPricingAnalyzing] = useState<boolean>(false);
  const [isPricingLoading, setIsPricingLoading] = useState<boolean>(false);
  const [aiSuggested, setAiSuggested] = useState<boolean>(false);
  const [pricingJustification, setPricingJustification] = useState<string>('');
  const [newCreditsBase, setNewCreditsBase] = useState<number>(100);
  const [creditsMin, setCreditsMin] = useState<number>(80);
  const [creditsMax, setCreditsMax] = useState<number>(120);
  const [pricingError, setPricingError] = useState<string>('');
  const [isCategoryManuallySelected, setIsCategoryManuallySelected] = useState<boolean>(false);
  const [requiresModeration, setRequiresModeration] = useState<boolean>(false);
  const [donateStep, setDonateStep] = useState<number>(1);
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [newExtraPhotos, setNewExtraPhotos] = useState<string[]>([]);
  const [isSubmittingDonation, setIsSubmittingDonation] = useState<boolean>(false);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'publishing'>('idle');
  const pricingRequestId = useRef(0);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setNewTitle('');
    setNewCategory('Música & Instrumentos');
    setNewCredits(100);
    setNewLocation('São Paulo, SP');
    setNewCondition('Usado - Excelente');
    setNewImageUrl('');
    setNewDescription('');
    setNewIsFeatured(false);
    setIsLargeItem(false);
    setIsAnalyzingImage(false);
    setIsPricingAnalyzing(false);
    setIsPricingLoading(false);
    setAiSuggested(false);
    setPricingJustification('');
    setNewCreditsBase(100);
    setCreditsMin(80);
    setCreditsMax(120);
    setPricingError('');
    setIsCategoryManuallySelected(false);
    setRequiresModeration(false);
    setDonateStep(1);
    setIsLocatingGps(false);
    setNewExtraPhotos([]);
    setIsSubmittingDonation(false);
    setNewImageFile(null);
    setUploadPhase('idle');
  };

  useEffect(() => {
    if (isDonateModalOpen) {
      setDonateStep(1);
    }
  }, [isDonateModalOpen]);

  const handleCalculatePricing = async (
    conditionOverride = newCondition,
    categoryOverride = newCategory
  ) => {
    const requestId = ++pricingRequestId.current;
    if (!newTitle.trim() || !categoryOverride.trim()) {
      setIsPricingAnalyzing(false);
      setIsPricingLoading(false);
      setNewCredits(0);
      setNewCreditsBase(0);
      setCreditsMin(0);
      setCreditsMax(0);
      setPricingError('');
      setRequiresModeration(false);
      setPricingJustification('Digite o título e selecione a categoria para obter uma avaliação de mercado.');
      return;
    }

    setIsPricingAnalyzing(true);
    setIsPricingLoading(true);
    setPricingError('');
    setNewCredits(0);
    setNewCreditsBase(0);
    setCreditsMin(0);
    setCreditsMax(0);
    try {
      const pricing = await evaluateItemWithGemini(newTitle.trim(), categoryOverride, conditionOverride);
      if (requestId !== pricingRequestId.current) return;
      if (!pricing) throw new Error('O Gemini não retornou uma avaliação válida');
      setNewCredits(pricing.credits);
      setNewCreditsBase(pricing.credits);
      if (DONATION_CATEGORIES.includes(pricing.category as (typeof DONATION_CATEGORIES)[number])) {
        setNewCategory(pricing.category);
      }
      setCreditsMin(pricing.credits);
      setCreditsMax(pricing.credits);
      setRequiresModeration(false);
      setPricingJustification(pricing.justification);
    } catch (error) {
      if (requestId !== pricingRequestId.current) return;
      console.error('Gemini indisponível; precificação não calculada:', error);
      setNewCredits(0);
      setNewCreditsBase(0);
      setCreditsMin(0);
      setCreditsMax(0);
      setPricingJustification('');
      setPricingError('Não foi possível estimar automaticamente. Digite o título e categoria para calcular.');
    } finally {
      if (requestId === pricingRequestId.current) {
        setIsPricingAnalyzing(false);
        setIsPricingLoading(false);
      }
    }
  };

  // Toast System
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  const getProfileLocation = () => user?.city?.trim() || user?.location?.trim() || 'Cotia, SP';

  const formatReverseGeocodedLocation = (address: Record<string, string>) => {
    const neighborhood = address.suburb || address.neighbourhood || address.quarter;
    const city = address.city || address.town || address.village || address.municipality;
    const state = address.state_code || address.state;
    if (neighborhood && city && state) return `${neighborhood}, ${city} - ${state}`;
    if (neighborhood && city) return `${neighborhood}, ${city}`;
    if (city && state) return `${city}, ${state}`;
    return getProfileLocation();
  };

  const handleUseGps = () => {
    setIsLocatingGps(true);
    let settled = false;
    const finishWithFallback = () => {
      if (settled) return;
      settled = true;
      const profileLocation = getProfileLocation();
      setNewLocation(profileLocation);
      setIsLocatingGps(false);
      showToast(`📍 Usando sua localização cadastrada: ${profileLocation}`, 'info');
    };
    const timeoutId = window.setTimeout(finishWithFallback, 2000);

    if (!navigator.geolocation) {
      window.clearTimeout(timeoutId);
      finishWithFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      if (settled) return;
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`,
          { headers: { Accept: 'application/json' } }
        );
        if (!response.ok) throw new Error(`Geocodificação retornou HTTP ${response.status}`);
        const data = await response.json() as { address?: Record<string, string> };
        if (!data.address) throw new Error('Resposta de geocodificação sem endereço');
        window.clearTimeout(timeoutId);
        settled = true;
        const realLocation = formatReverseGeocodedLocation(data.address);
        setNewLocation(realLocation);
        setIsLocatingGps(false);
        showToast(`📍 Localização atualizada via GPS: ${realLocation}`, 'success');
      } catch (error) {
        console.error('Erro na geocodificação reversa:', error);
        finishWithFallback();
      }
    }, (error) => {
      console.warn('GPS indisponível:', error);
      window.clearTimeout(timeoutId);
      finishWithFallback();
    }, { enableHighAccuracy: true, timeout: 1800, maximumAge: 300000 });
  };

  const getDisplayLocation = (item: DonationItem) => {
    const location = item.location?.trim();
    if (location && location !== 'Localização atual' && location !== 'Localização atual (GPS)') {
      return location;
    }
    return item.userLocation || getProfileLocation();
  };

  const handleAiSuggestion = async (selectedUrl?: string) => {
    const finalUrl = (selectedUrl ?? newImageUrl ?? '').trim();
    if (!finalUrl) {
      setIsAnalyzingImage(false);
      setAiSuggested(false);
      return;
    }

    setIsAnalyzingImage(true);
    setAiSuggested(false);

    const requestId = ++pricingRequestId.current;
    try {
      const analysis = await Promise.race([
        evaluateItemWithGemini(newTitle || 'Item fotografado', newCategory, newCondition),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('Tempo limite da análise de imagem excedido')), 3500);
        })
      ]);
      if (requestId !== pricingRequestId.current) return;
      if (!analysis || !analysis.title.trim() || !analysis.category.trim() || analysis.credits <= 0) {
        throw new Error('A IA não retornou título, categoria e créditos válidos');
      }

      const normalizedCategory = DONATION_CATEGORIES.includes(
        analysis.category as (typeof DONATION_CATEGORIES)[number]
      ) ? analysis.category : 'Outros';
      setPricingError('');
      if (!newTitle.trim()) setNewTitle(analysis.title);
      if (!isCategoryManuallySelected) setNewCategory(normalizedCategory);
      if (normalizedCategory === 'Móveis & Decoração') setIsLargeItem(true);
      setNewDescription(analysis.justification);
      setNewCredits(analysis.credits);
      setNewCreditsBase(analysis.credits);
      setCreditsMin(analysis.credits);
      setCreditsMax(analysis.credits);
      setNewCondition('Usado - Excelente');
      setPricingJustification('Valor estimado pelo Gemini Vision com base no mercado brasileiro.');
      setAiSuggested(true);
      setDonateStep(2);
    } catch (error) {
      if (requestId !== pricingRequestId.current) return;
      console.error('Falha na leitura da foto pelo Gemini Vision:', error);
      setNewDescription('');
      setNewCredits(0);
      setNewCreditsBase(0);
      setCreditsMin(0);
      setCreditsMax(0);
      setPricingError('Não foi possível estimar automaticamente. Digite o título e categoria para calcular.');
      setAiSuggested(false);
      setDonateStep(2);
      showToast('A leitura por foto falhou. Digite o título do item para continuar.', 'error');
      window.setTimeout(() => titleInputRef.current?.focus(), 0);
    } finally {
      if (requestId === pricingRequestId.current) setIsAnalyzingImage(false);
    }
  };

  const handleCreditsStep = (delta: number) => {
    if (creditsMin <= 0 || creditsMax <= 0) return;
    setNewCredits((prev) => Math.min(creditsMax, Math.max(creditsMin, prev + delta)));
  };

  const handleCreditsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    if (Number.isNaN(raw)) return;
    setNewCredits(Math.min(creditsMax, Math.max(creditsMin, raw)));
  };

  // First-donation bonus: +15% of the item's credits, granted only before the user's first donation
  const isFirstDonation = useMemo(
    () => !items.some((i) => (user ? i.userId === user.uid : false) || i.donorName === 'Você'),
    [items, user]
  );
  const firstDonationBonus = isFirstDonation ? Math.round(newCredits * 0.15) : 0;

  // Sets the chosen photo (upload, camera or preset) and kicks off the AI simulation
  const handlePhotoSelected = (url: string) => {
    setNewImageUrl(url);
    void handleAiSuggestion(url);
  };

  const resizeImageForAnalysis = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let scale = Math.min(1, 800 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Não foi possível preparar a imagem para análise'));
        return;
      }

      let quality = 0.7;
      let compressed = '';
      do {
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        compressed = canvas.toDataURL('image/jpeg', quality);
        if (compressed.length * 0.75 > 200 * 1024) {
          if (quality > 0.3) quality = Math.max(0.3, quality - 0.1);
          else scale *= 0.8;
        }
      } while (compressed.length * 0.75 > 200 * 1024 && scale > 0.1);
      resolve(compressed);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível ler a foto capturada'));
    };
    image.src = objectUrl;
  });

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewImageFile(file);
    setIsAnalyzingImage(true);
    void resizeImageForAnalysis(file)
      .then((compressedImage) => handlePhotoSelected(compressedImage))
      .catch((error) => {
        console.error('Erro ao comprimir imagem para análise:', error);
        setIsAnalyzingImage(false);
        showToast('Não foi possível preparar a foto. Tente novamente.', 'error');
      });
    e.target.value = '';
  };

  const MAX_EXTRA_PHOTOS = 4;

  // Reads up to the remaining slots of extra (complementary) photos
  const handleExtraPhotosFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remainingSlots = MAX_EXTRA_PHOTOS - newExtraPhotos.length;
    files.slice(0, remainingSlots).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setNewExtraPhotos((prev) => [...prev, reader.result as string].slice(0, MAX_EXTRA_PHOTOS));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveExtraPhoto = (index: number) => {
    setNewExtraPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle favorite
  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextFav = !item.isFavorite;
          showToast(
            nextFav ? `"${item.title}" adicionado aos favoritos!` : `Item removido dos favoritos.`,
            'info'
          );
          return { ...item, isFavorite: nextFav };
        }
        return item;
      })
    );
  };

  // Filtered Items (Sorted with Cadeira Ergonômica / Featured items first)
  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const isAvailableInFeed = !item.status || item.status === 'available';
      const matchesCategory =
        selectedCategory === 'Todas' || item.category === selectedCategory;
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());
      return isAvailableInFeed && matchesCategory && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      const aIsCadeira = a.title.toLowerCase().includes('cadeira ergonômica');
      const bIsCadeira = b.title.toLowerCase().includes('cadeira ergonômica');
      if (aIsCadeira && !bIsCadeira) return -1;
      if (!aIsCadeira && bIsCadeira) return 1;

      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;

      return 0;
    });
  }, [items, selectedCategory, searchQuery]);

  const favoriteItems = useMemo(() => {
    return items.filter((item) => item.isFavorite);
  }, [items]);

  const redeemedItems = useMemo(() => {
    return items.filter((item) => item.isRedeemed);
  }, [items]);

  const profileHistoryItems = useMemo(() => {
    if (!user) return [];
    return items.filter(
      (item) =>
        (item.receiverId === user.uid || item.userId === user.uid) &&
        ['reserved', 'in_transit', 'completed'].includes(item.status || 'available')
    );
  }, [items, user]);

  const currentSelectedFreight = useMemo(() => {
    return FREIGHT_OPTIONS.find((f) => f.id === selectedFreightId) || FREIGHT_OPTIONS[0];
  }, [selectedFreightId]);

  // Open Product Details
  const handleOpenDetails = (item: DonationItem) => {
    setSelectedItemForDetails(item);
    setSelectedFreightId(item.isLargeItem ? 'lalamove_partner' : 'ja_doei_express');
    setIsCepCalculated(true);
  };

  const handleDeleteDonation = async (item: DonationItem) => {
    if (!user || item.userId !== user.uid) return;
    if (!window.confirm('Tem certeza que deseja excluir esta doação?')) return;

    try {
      await deleteDoc(doc(db, 'donations', item.id));
      setItems((prev) => prev.filter((currentItem) => currentItem.id !== item.id));
      setSelectedItemForDetails((currentItem) => (
        currentItem?.id === item.id ? null : currentItem
      ));
      showToast('Doação excluída com sucesso.', 'success');
    } catch (error) {
      console.error('Erro ao excluir doação:', error);
      showToast('Não foi possível excluir a doação. Tente novamente.', 'error');
    }
  };

  // Calculate Freight
  const handleCalculateFreight = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!cepInput.trim()) {
      showToast('Por favor, informe o CEP para calcular o frete.', 'error');
      return;
    }
    setIsCalculatingCep(true);
    setTimeout(() => {
      setIsCalculatingCep(false);
      setIsCepCalculated(true);
      showToast(`🚚 Frete calculado com sucesso para o CEP ${cepInput}!`, 'success');
    }, 500);
  };

  // Copy PIX Code
  const handleCopyPixCode = () => {
    const pixKey = `00020126580014BR.GOV.BCB.PIX0136jadoei-frete-pagamento-20265204000053039865405${currentSelectedFreight.price.toFixed(2)}5802BR`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pixKey);
    }
    showToast('📋 Código PIX "Copia e Cola" copiado com sucesso!', 'success');
  };

  // Start Chat with Donor
  const handleStartChat = (item: DonationItem) => {
    setChatModalItem(item);
    setChatMessages([
      {
        sender: 'donor',
        text: `Olá! Sou ${item.donorName || 'o doador'}. O item "${item.title}" ainda está disponível! Como posso te ajudar?`,
        time: 'Agora'
      }
    ]);
  };

  // Send Chat Message
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim() || !chatModalItem) return;

    const userText = chatInputText.trim();
    setChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: userText, time: 'Agora' }
    ]);
    setChatInputText('');

    // Simulated Donor Reply after 1 sec
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'donor',
          text: `Com certeza! Podemos combinar a entrega via ${currentSelectedFreight.name}. Fique à vontade para concluir o resgate com seus créditos!`,
          time: 'Agora'
        }
      ]);
    }, 1000);
  };

  // Open Quartinho da Bagunça
  const handleOpenBagunca = (donorName: string, donorAvatar?: string, location?: string) => {
    setBaguncaDonor({
      name: donorName,
      avatar: donorAvatar,
      location: location || 'São Paulo, SP',
      bio: donorName === 'Você' || donorName === 'Mariana Silva'
        ? 'Meu Quartinho da Bagunça: desapegando com carinho para dar vida nova a objetos e apoiar a comunidade! 🌿'
        : `Quartinho da Bagunça de ${donorName}. Todos os desapegos revisados para circular na comunidade Já Doei.`
    });
  };

  // Submit New Donation
  const handleCreateDonation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (donateStep === 1) {
      if (!newImageUrl) {
        showToast('Tire uma foto para a IA calcular os créditos.', 'error');
        return;
      }
      setDonateStep(2);
      return;
    }

    if (donateStep === 2) {
      if (!newTitle.trim()) {
        showToast('Por favor, informe o título do item.', 'error');
        return;
      }
      setDonateStep(3);
      return;
    }

    if (!newTitle.trim()) {
      showToast('Por favor, informe o título do item.', 'error');
      return;
    }

    if (newCredits <= 0) {
      showToast('Aguarde a avaliação da IA antes de publicar o item.', 'error');
      return;
    }

    if (isSubmittingDonation) return;

    const fallbackImg = 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb0?w=500';
    const donationCredits = newCredits;

    setIsSubmittingDonation(true);

    // Upload the cover photo to Firebase Storage, falling back to a stock image on any failure
    let finalImageUrl = newImageUrl.trim() || fallbackImg;
    if (newImageFile) {
      setUploadPhase('uploading');
      try {
        const imageRef = ref(storage, `donations_images/${Date.now()}_${newImageFile.name}`);
        const uploadSnapshot = await uploadBytes(imageRef, newImageFile);
        finalImageUrl = await getDownloadURL(uploadSnapshot.ref);
      } catch (error) {
        console.error('Erro ao enviar imagem para o Firebase Storage:', error);
        finalImageUrl = newImageUrl.trim() || fallbackImg;
      }
    }

    const donationPayload = {
      title: newTitle.trim(),
      category: newCategory,
      credits: donationCredits,
      location: newLocation.trim() || 'São Paulo, SP',
      userLocation: getProfileLocation(),
      condition: newCondition,
      image: finalImageUrl,
      imageUrl: finalImageUrl,
      description: newDescription.trim() || 'Item doado recentemente na comunidade em ótimo estado.',
      isFeatured: newIsFeatured,
      isLargeItem,
      status: 'available',
      userId: user?.uid || null,
      userName: user?.name || 'Você',
      donorName: user?.name || 'Você',
      donorAvatar: user?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
    };

    setUploadPhase('publishing');

    let savedToFirestore = true;
    try {
      await addDoc(collection(db, 'donations'), {
        ...donationPayload,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao salvar doação no Firestore:', error);
      savedToFirestore = false;
    }

    // Always fall back to local state so the flow never gets stuck, even if Firestore fails
    if (!savedToFirestore) {
      setItems((prev) => [
        {
          id: Date.now().toString(),
          ...donationPayload,
          createdAt: 'Hoje',
          isFavorite: false,
          isRedeemed: false,
          status: 'available'
        },
        ...prev
      ]);
    }

    // Reset Form
    setNewTitle('');
    setNewCategory('Música & Instrumentos');
    setNewCredits(0);
    setNewCreditsBase(0);
    setCreditsMin(0);
    setCreditsMax(0);
    setPricingError('');
    setIsPricingLoading(false);
    setNewImageUrl('');
    setNewImageFile(null);
    setNewExtraPhotos([]);
    setNewCondition('Usado - Excelente');
    setPricingJustification('');
    setPricingError('');
    setIsPricingAnalyzing(false);
    setNewDescription('');
    setNewIsFeatured(false);
    setIsLargeItem(false);
    setIsCategoryManuallySelected(false);
    setAiSuggested(false);
    setIsAnalyzingImage(false);
    setIsSubmittingDonation(false);
    setUploadPhase('idle');
    setDonateStep(1);
    setIsDonateModalOpen(false);

    showToast(
      savedToFirestore
        ? `🎉 Doação cadastrada com sucesso! ${newIsFeatured ? '🔥 Item destacado no topo!' : ''} Os créditos serão liberados após a confirmação da entrega.`
        : `🎉 Doação salva localmente! Ela será sincronizada assim que a conexão for restabelecida.`,
      'success'
    );
  };

  // Confirm Redeem (Confirmação Troca Final)
  const handleConfirmDonationDelivery = async (item: DonationItem) => {
    if (!user || !item.userId) {
      showToast('Não foi possível identificar o doador deste item.', 'error');
      return;
    }

    if (!window.confirm('Confirmar o recebimento desta doação?')) return;

    try {
      await updateDoc(doc(db, 'donations', item.id), { status: 'completed' });
      await updateDoc(doc(db, 'users', item.userId), {
        credits: increment(item.credits)
      });
      await addDoc(collection(db, 'notifications'), {
        userId: item.userId,
        title: 'Créditos liberados',
        message: `Créditos de ${item.title} foram liberados após a confirmação de ${user.name}.`,
        createdAt: serverTimestamp(),
        read: false
      });
      setItems((prev) => prev.map((currentItem) => (
        currentItem.id === item.id
          ? { ...currentItem, status: 'completed', isRedeemed: true }
          : currentItem
      )));
      setSuccessRedeemData(null);
      showToast(`Entrega confirmada. +${item.credits} créditos foram liberados ao doador.`, 'success');
    } catch (error) {
      console.error('Erro ao concluir doação:', error);
      showToast('Não foi possível confirmar a entrega. Tente novamente.', 'error');
    }
  };

  const handleConfirmItemReceived = async (item: DonationItem) => {
    if (!user || !item.receiverId || item.receiverId !== user.uid) {
      showToast('Você precisa estar vinculado a este resgate para confirmar a entrega.', 'error');
      return;
    }

    if (!window.confirm('Confirmar que você recebeu este item?')) return;

    try {
      await updateDoc(doc(db, 'donations', item.id), {
        status: 'completed'
      });

      if (item.userId) {
        await updateDoc(doc(db, 'users', item.userId), {
          credits: increment(item.credits)
        });

        await addDoc(collection(db, 'notifications'), {
          userId: item.userId,
          title: 'Entrega confirmada',
          message: `A entrega de ${item.title} foi confirmada por ${user.name}.`,
          createdAt: serverTimestamp(),
          read: false
        });
      }

      setItems((prev) => prev.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, status: 'completed', isRedeemed: true }
          : currentItem
      ));

      showToast('Entrega confirmada. Os créditos do doador foram liberados.', 'success');
    } catch (error) {
      console.error('Erro ao confirmar recebimento do item:', error);
      showToast('Não foi possível confirmar o recebimento. Tente novamente.', 'error');
    }
  };

  const handleCallLalamove = (item: DonationItem) => {
    const lalamoveUrl = new URL('https://www.lalamove.com/pt-br/');
    lalamoveUrl.searchParams.set('pickupAddress', item.location);
    lalamoveUrl.searchParams.set('item', item.title);
    window.open(lalamoveUrl.toString(), '_blank', 'noopener,noreferrer');
  };

  const handleConfirmRedeem = async () => {
    if (!selectedItemForRedeem || !user) return;

    const itemCredits = selectedItemForRedeem.credits;
    const donorId = selectedItemForRedeem.userId;

    if (!donorId) {
      showToast('Não foi possível identificar o doador deste item.', 'error');
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const currentCredits = Number(userSnap.data()?.credits ?? userCredits);
      const limitePermitido = -Math.round(itemCredits * 0.30);
      const nextCredits = currentCredits - itemCredits;

      if (nextCredits < limitePermitido) {
        showToast(
          'Saldo insuficiente. Você precisa de mais créditos! Que tal publicar um desapego agora para ganhar créditos?',
          'error'
        );
        return;
      }

      await updateDoc(userRef, {
        credits: nextCredits
      });
      await updateDoc(doc(db, 'donations', selectedItemForRedeem.id), {
        status: 'reserved',
        receiverId: user.uid,
      });
      await addDoc(collection(db, 'notifications'), {
        userId: donorId,
        title: 'Item resgatado',
        message: `Seu item ${selectedItemForRedeem.title} foi solicitado por ${user.name}!`,
        createdAt: serverTimestamp(),
        read: false
      });

      setUserCredits(nextCredits);
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemForRedeem.id
            ? {
                ...item,
                isRedeemed: true,
                status: 'reserved',
                receiverId: user.uid,
              }
            : item
        )
      );

      const redeemedItem = selectedItemForRedeem;
      const orderNumber = `#JD-${Math.floor(1000 + Math.random() * 9000)}`;

      setSelectedItemForRedeem(null);
      setSelectedItemForDetails(null);
      setActiveTab('profile');
      setSuccessRedeemData({
        item: redeemedItem,
        orderNumber,
        creditsUsed: itemCredits,
        freightPrice: currentSelectedFreight.price,
        cashComplement: 0,
        insuranceFee: isInsuranceSelected ? 3.90 : 0,
        totalCashPaid: isInsuranceSelected ? currentSelectedFreight.price + 3.90 : currentSelectedFreight.price,
        deliveryType: 'standard',
        carrierName: currentSelectedFreight.carrierName || currentSelectedFreight.name,
        freightType: currentSelectedFreight.type,
        freightName: currentSelectedFreight.name,
      });

      showToast('Resgate realizado com sucesso. O doador foi notificado.', 'success');
    } catch (error) {
      console.error('Erro ao confirmar resgate:', error);
      showToast('Não foi possível confirmar o resgate. Tente novamente.', 'error');
    }
  };

  // Claim Bonus Credits
  const handleClaimBonus = async (amount: number, reason: string) => {
    if (user?.uid) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { credits: increment(amount) });
      } catch (error) {
        console.error('Erro ao atualizar créditos do usuário no Firestore:', error);
        setUserCredits((prev) => prev + amount);
      }
    } else {
      setUserCredits((prev) => prev + amount);
    }
    showToast(`✨ Parabéns! +${amount} Créditos adicionados (${reason}).`, 'success');
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#e2ded0] flex justify-center items-start sm:py-4 text-slate-800 antialiased select-none">
      
      {/* Container Principal (Responsivo) */}
      <div className="w-full max-w-md bg-[#F5F0E1] min-h-screen sm:min-h-[844px] sm:rounded-[32px] sm:shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* SPLASH SCREEN (Tela de Abertura) */}
        <AnimatePresence>
          {showSplash && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="fixed inset-y-0 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col bg-[#F5F0E1] p-6 text-center"
            >
              {/* Topo fixo */}
              <div className="pt-4">
                <span className="inline-block rounded-full bg-[#14A76C]/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-[#14A76C]">
                  ECONOMIA CIRCULAR & DESAPEGO
                </span>
              </div>

              {/* Centro Absoluto - Garante o símbolo no meio exato da tela */}
              <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 transform flex-col items-center justify-center gap-3 w-full max-w-xs px-4">
                <img src={simboloImg} alt="Já Doei" className="h-24 w-auto object-contain" />
                <p className="text-xs font-bold tracking-wider text-slate-700">
                  TROQUE, RESGATE, ECONOMIZE CIRCULANDO.
                </p>
              </div>

              {/* Rodapé fixo na base */}
              <div className="mt-auto pb-4">
                <p className="text-[11px] text-slate-400">Carregando desapegos...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`absolute top-16 left-4 right-4 z-50 p-3.5 rounded-2xl shadow-xl flex items-start gap-3 border text-xs font-medium backdrop-blur-md ${
                toastMessage.type === 'error'
                  ? 'bg-rose-900/90 border-rose-700 text-rose-100'
                  : toastMessage.type === 'info'
                  ? 'bg-sky-900/90 border-sky-700 text-sky-100'
                  : 'bg-emerald-950/90 border-emerald-700 text-emerald-100'
              }`}
            >
              {toastMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <span className="flex-1 leading-relaxed">{toastMessage.text}</span>
              <button
                onClick={() => setToastMessage(null)}
                className="text-white/60 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar flex flex-col pb-28">
          
          {/* HEADER (Fixed Top Design in Forest Green #14A76C) */}
          <header className="bg-[#14A76C] rounded-b-2xl shadow-md p-4 pt-safe text-white shrink-0">
            {/* Top row with Logo, Location & Notifications */}
            <div className="flex items-center justify-between mb-3">
              {/* Logo Container */}
              <div className="flex items-center h-9">
                <img
                  src={logoImg}
                  alt="Logo Já Doei"
                  className="h-8 w-auto object-contain"
                />
              </div>

              {/* Location & Notifications */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 font-bold text-xs text-white bg-white/10 px-2.5 py-1.5 rounded-full border border-white/15">
                  <MapPin className="w-3.5 h-3.5 text-[#FF8243]" />
                  <span>São Paulo, SP</span>
                </div>

                <button
                  onClick={() => setIsNotificationsModalOpen(true)}
                  className="relative p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white active:scale-95"
                  title="Notificações"
                >
                  <Bell className="w-4 h-4" />
                  {hasUnreadNotifications && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-[#14A76C]"></span>
                  )}
                </button>
              </div>
            </div>

            {/* Translucent Card: Credits Balance */}
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF8243] flex items-center justify-center text-white shadow-sm shrink-0">
                  <Coins className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-emerald-100 font-medium block">
                    Seus créditos
                  </span>
                  <div className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                    <span>{safeUserCredits}</span>
                    <span className="text-xs font-semibold text-emerald-200">
                      Créditos
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button: Ganhar mais / Entrar (#FF8243) */}
              <button
                onClick={() => (user ? setIsEarnModalOpen(true) : setIsAuthOpen(true))}
                className="bg-[#FF8243] hover:bg-[#ff712b] active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md transition-all flex items-center gap-1 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{user ? 'Ganhar mais' : 'Entrar para resgatar'}</span>
              </button>
            </div>
          </header>

          {/* MAIN CONTENT AREA BY ACTIVE TAB */}
          {activeTab === 'home' || activeTab === 'search' ? (
            <>
              {/* SEARCH BAR */}
              <div className="px-4 mt-4">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar itens no Já Doei..."
                    className="w-full pl-10 pr-9 py-2.5 bg-white rounded-full text-xs font-medium text-slate-800 placeholder-slate-400 border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#14A76C]/40 focus:border-[#14A76C] transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* PROMOTIONAL BANNERS CAROUSEL */}
              <div className="mt-3.5 px-4">
                <div className="flex gap-3.5 overflow-x-auto no-scrollbar snap-x snap-mandatory py-1 -mx-4 px-4">
                  {/* Banner 1: Especial Volta às Aulas 🎒 */}
                  <div 
                    onClick={() => {
                      setSelectedCategory('Livros & Mídia');
                      setSearchQuery('');
                    }}
                    className="snap-center shrink-0 w-[88%] sm:w-[320px] rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[165px] p-4 text-white group cursor-pointer border-0 transition-all active:scale-[0.98]"
                  >
                    {/* Background Image */}
                    <img 
                      src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80"
                      alt="Volta às Aulas"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Dark Gradient Overlay for perfect text legibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

                    {/* Banner Content */}
                    <div className="relative z-10 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-[#FF8243] text-white px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                          🎒 Campanha Social
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold text-white tracking-tight leading-tight drop-shadow-sm pt-0.5">
                        Volta às Aulas para Todos!
                      </h3>
                      <p className="text-[11px] font-medium text-slate-200 leading-snug line-clamp-2 drop-shadow-xs">
                        Desapegue de mochilas, estojos e livros ou ajude quem precisa.
                      </p>
                    </div>

                    <div className="relative z-10 mt-2 flex items-center justify-between pt-1 border-t border-white/10">
                      <span className="text-[10px] font-bold text-orange-200">Doe ou Resgate</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCategory('Livros & Mídia');
                          setSearchQuery('');
                        }}
                        className="bg-[#14A76C] hover:bg-[#118b5a] active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md transition-all flex items-center gap-1"
                      >
                        <span>Ver itens escolares</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Banner 2: Clube Já Doei Premium 💎 */}
                  <div 
                    onClick={() => setIsPremiumModalOpen(true)}
                    className="snap-center shrink-0 w-[88%] sm:w-[320px] rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[165px] p-4 text-white group cursor-pointer border-0 transition-all active:scale-[0.98]"
                  >
                    {/* Background Image */}
                    <img 
                      src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=800&q=80"
                      alt="Clube Já Doei Premium"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Dark Gradient Overlay for perfect text legibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-purple-950/50 to-transparent" />

                    {/* Banner Content */}
                    <div className="relative z-10 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 via-purple-500 to-indigo-500 text-white px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                          Clube Premium
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold text-white tracking-tight leading-tight drop-shadow-sm pt-0.5">
                        Sua conta rende mais!
                      </h3>
                      <p className="text-[11px] font-medium text-slate-200 leading-snug line-clamp-2 drop-shadow-xs">
                        Até 40% de complemento em R$ + Acesso antecipado aos melhores desapegos.
                      </p>
                    </div>

                    <div className="relative z-10 mt-2 flex items-center justify-between pt-1 border-t border-white/10">
                      <span className="text-[10px] font-bold text-amber-300">Economia no frete</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsPremiumModalOpen(true);
                        }}
                        className="bg-[#14A76C] hover:bg-[#118b5a] active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md transition-all flex items-center gap-1"
                      >
                        <span>Assinar por R$ 19,90</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Banner 3: Roupas & Moda Consciente 🧥 */}
                  <div 
                    onClick={() => {
                      setSelectedCategory('Vestuário');
                      setSearchQuery('');
                    }}
                    className="snap-center shrink-0 w-[88%] sm:w-[320px] rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[165px] p-4 text-white group cursor-pointer border-0 transition-all active:scale-[0.98]"
                  >
                    {/* Background Image */}
                    <img 
                      src="https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80"
                      alt="Roupas & Moda Consciente"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Dark Gradient Overlay for perfect text legibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-emerald-950/45 to-transparent" />

                    {/* Banner Content */}
                    <div className="relative z-10 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600/90 text-white px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1 backdrop-blur-xs">
                          🌱 Sustentabilidade
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold text-white tracking-tight leading-tight drop-shadow-sm pt-0.5">
                        Renove seu Armário
                      </h3>
                      <p className="text-[11px] font-medium text-slate-200 leading-snug line-clamp-2 drop-shadow-xs">
                        Milhares de roupas e calçados disponíveis para resgate.
                      </p>
                    </div>

                    <div className="relative z-10 mt-2 flex items-center justify-between pt-1 border-t border-white/10">
                      <span className="text-[10px] font-bold text-emerald-300">Moda Circular</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCategory('Vestuário');
                          setSearchQuery('');
                        }}
                        className="bg-white/90 hover:bg-white active:scale-95 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-md transition-all flex items-center gap-1"
                      >
                        <span>Explorar Moda</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-900" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* CATEGORIES CAROUSEL */}
              <div className="mt-4 px-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 tracking-wide">
                    Categorias
                  </span>
                  {selectedCategory !== 'Todas' && (
                    <button
                      onClick={() => setSelectedCategory('Todas')}
                      className="text-[11px] font-semibold text-[#14A76C] hover:underline"
                    >
                      Limpar filtro
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
                  {CATEGORIES.map((category) => {
                    const isSelected = selectedCategory === category;
                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-[#14A76C] text-white shadow-md'
                            : 'bg-white text-slate-600 hover:bg-slate-50 shadow-xs hover:shadow-sm'
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MAIN FEED (2-Column Grid) */}
              <div className="px-4 mt-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Doações disponíveis</span>
                    <span className="text-xs font-normal text-slate-500 bg-white/80 px-2 py-0.5 rounded-full border border-slate-200/60 shadow-2xs">
                      {filteredItems.length}
                    </span>
                  </h2>
                </div>

                {filteredItems.length === 0 ? (
                  <div className="bg-white/80 rounded-2xl p-8 text-center border border-dashed border-slate-300 my-4 shadow-xs">
                    <Filter className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-600 mb-3">
                      Nenhum item encontrado nesta busca ou categoria.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedCategory('Todas');
                        setSearchQuery('');
                      }}
                      className="bg-[#14A76C] text-white text-xs font-bold px-4 py-2 rounded-full shadow-sm"
                    >
                      Ver todas as doações
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleOpenDetails(item)}
                        className={`flex flex-col justify-between p-2.5 bg-white rounded-2xl relative group cursor-pointer transition-all ${
                          item.isFeatured
                            ? 'shadow-[0_8px_25px_rgba(255,130,67,0.12)]'
                            : 'shadow-sm hover:shadow-md'
                        }`}
                      >
                        <div>
                          {/* Image + Favorite overlay */}
                          <div className="relative aspect-4/3 w-full bg-slate-100 rounded-xl overflow-hidden">
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            
                            {/* Category or Featured Badge */}
                            {item.isFeatured ? (
                              <span className="absolute top-2 left-2 bg-amber-500/10 text-amber-600 text-[10px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md z-10 border border-amber-500/20">
                                🔥 Destaque
                              </span>
                            ) : (
                              <span className="absolute top-1.5 left-1.5 bg-slate-900/70 backdrop-blur-md text-white text-[9px] font-semibold px-2 py-0.5 rounded-full z-10">
                                {item.category}
                              </span>
                            )}

                            {/* Floating Credits Badge over Image */}
                            <div className="absolute bottom-1.5 left-1.5 bg-[#FF7A38] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex items-center shadow-xs z-10">
                              <Coins className="w-3.5 h-3.5 text-white inline mr-1 shrink-0" />
                              <span>{item.credits} Créditos</span>
                            </div>

                            {/* Heart favorite button */}
                            <button
                              onClick={(e) => toggleFavorite(item.id, e)}
                              className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-white/80 backdrop-blur-sm text-slate-700 hover:text-rose-500 hover:bg-white transition-all shadow-xs active:scale-90 z-10"
                              title="Favoritar"
                            >
                              <Heart
                                className={`w-3.5 h-3.5 ${
                                  item.isFavorite
                                    ? 'fill-rose-500 text-rose-500'
                                    : ''
                                }`}
                              />
                            </button>

                            {/* Redeemed Watermark overlay if applicable */}
                            {item.isRedeemed && (
                              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-2 text-center z-20">
                                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-md flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  Resgatado
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Title & Info Area */}
                          <div className="mt-1.5">
                            <h3 className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug group-hover:text-[#14A76C] transition-colors">
                              {item.title}
                            </h3>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{getDisplayLocation(item)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Full Width Resgatar Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetails(item);
                          }}
                          disabled={item.isRedeemed}
                          className={`w-full mt-2 py-1.5 text-xs font-medium rounded-lg text-white transition-colors text-center active:scale-98 ${
                            item.isRedeemed
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-[#14A76C] hover:bg-[#108656]'
                          }`}
                        >
                          {item.isRedeemed ? 'Resgatado' : 'Resgatar'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : activeTab === 'favorites' ? (
            /* FAVORITES VIEW */
            <div className="p-4">
              <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <span>Seus itens favoritos ({favoriteItems.length})</span>
              </h2>

              {favoriteItems.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 mt-4">
                  <Heart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-xs font-bold text-slate-700 mb-1">
                    Nenhum favorito salvo
                  </h3>
                  <p className="text-[11px] text-slate-500 mb-4">
                    Clique no ícone de coração dos cards para salvar itens de seu interesse.
                  </p>
                  <button
                    onClick={() => setActiveTab('home')}
                    className="bg-[#14A76C] text-white text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    Explorar doações
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {favoriteItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleOpenDetails(item)}
                      className="flex flex-col justify-between p-2.5 bg-white rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all border-0"
                    >
                      <div>
                        <div className="relative aspect-4/3 bg-slate-100 rounded-xl overflow-hidden">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                          {/* Floating Credits Badge over Image */}
                          <div className="absolute bottom-1.5 left-1.5 bg-[#FF7A38] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex items-center shadow-xs z-10">
                            <Coins className="w-3.5 h-3.5 text-white inline mr-1 shrink-0" />
                            <span>{item.credits} Créditos</span>
                          </div>
                          <button
                            onClick={(e) => toggleFavorite(item.id, e)}
                            className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-white/80 text-rose-500 shadow-sm z-10"
                          >
                            <Heart className="w-3.5 h-3.5 fill-rose-500" />
                          </button>
                        </div>
                        <div className="mt-1.5">
                          <h3 className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{getDisplayLocation(item)}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetails(item);
                        }}
                        className="w-full mt-2 py-1.5 text-xs font-medium rounded-lg bg-[#14A76C] hover:bg-[#108656] text-white transition-colors text-center active:scale-98"
                      >
                        Resgatar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* PROFILE VIEW */
            <div className="p-4 space-y-4">
              {/* Profile Card */}
              {user ? (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleOpenEditProfile}
                    className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#14A76C] to-[#FF8243] p-0.5 shadow-md shrink-0"
                    title="Editar perfil"
                  >
                    <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        user.name
                          .split(' ')
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      )}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-xs">
                      <Pencil className="w-2.5 h-2.5" />
                    </span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-bold text-slate-800 truncate">
                        {user.name}
                      </h2>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${
                        isPremium 
                          ? 'bg-amber-100 text-amber-900 border-amber-300' 
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}>
                        {isPremium ? '👑 Assinante Premium' : 'Membro Ouro 🌟'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{user.email} • São Paulo, SP</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="bg-[#FF8243]/10 text-[#FF8243] text-xs font-bold px-2.5 py-0.5 rounded-lg border border-[#FF8243]/20">
                        {safeUserCredits} Créditos
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handleOpenEditProfile}
                      className="p-2 rounded-full text-slate-400 hover:text-[#14A76C] hover:bg-emerald-50 transition-all"
                      title="Editar Perfil"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="p-2 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                      title="Sair"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-sm font-bold text-slate-800">Você ainda não entrou</h2>
                    <p className="text-[11px] text-slate-500">Entre ou cadastre-se para doar e resgatar itens.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAuthOpen(true)}
                    className="px-3 py-2 rounded-xl bg-[#14A76C] hover:bg-[#108958] active:scale-98 text-white text-xs font-bold shadow-sm transition-all shrink-0"
                  >
                    Entrar
                  </button>
                </div>
              )}

              {/* CLUBE JÁ DOEI PREMIUM BANNER */}
              <div className="bg-gradient-to-r from-amber-500 via-[#FF8243] to-amber-600 rounded-2xl p-4 text-white shadow-md space-y-2 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full">
                    Clube Já Doei Premium
                  </span>
                  <span className="text-xs font-black bg-white text-slate-900 px-2 py-0.5 rounded-md shadow-xs">
                    R$ 19,90/mês
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-black">
                    {isPremium ? '🎉 Você é Assinante VIP Premium!' : 'Complemente até 40% em R$ nas trocas!'}
                  </h3>
                  <p className="text-[11px] text-amber-50 leading-tight">
                    {isPremium 
                      ? 'Aproveite fretes prioritários, 40% de limite de complemento e selo exclusivo.' 
                      : 'Desbloqueie até 40% em dinheiro ao faltar créditos, suporte prioritário e selo VIP.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPremiumModalOpen(true)}
                  className="w-full py-2 bg-white text-[#FF8243] hover:bg-amber-50 font-black text-xs rounded-xl shadow-sm transition-all active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-[#FF8243]" />
                  <span>{isPremium ? 'Gerenciar Minha Assinatura' : 'Assinar Clube Premium por R$ 19,90'}</span>
                </button>
              </div>

              {/* MEU QUARTINHO DA BAGUNÇA BUTTON */}
              <button
                type="button"
                onClick={() => handleOpenBagunca('Mariana Silva', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150', 'São Paulo, SP')}
                className="w-full p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-[#FF8243]/50 transition-all flex items-center justify-between group active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF8243]/10 text-[#FF8243] flex items-center justify-center">
                    <Store className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-bold text-slate-800 group-hover:text-[#FF8243] transition-colors">
                      Meu Quartinho da Bagunça
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Sua lojinha virtual de desapegos compartilhados na comunidade.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* CENTRAL DE AJUDA & REGRAS BUTTON */}
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(true)}
                className="w-full p-3.5 bg-emerald-50/90 hover:bg-emerald-100/90 rounded-2xl border-2 border-[#14A76C]/40 hover:border-[#14A76C] shadow-xs transition-all flex items-center justify-between group active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#14A76C] text-white flex items-center justify-center shadow-xs">
                    <HelpCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-extrabold text-slate-800 group-hover:text-[#14A76C] transition-colors flex items-center gap-1.5">
                      <span>Central de Ajuda & Regras</span>
                      <span className="text-[9px] bg-[#14A76C] text-white px-2 py-0.2 rounded-full font-bold">
                        Suporte 24/7
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-600 font-medium">
                      Dúvidas sobre frete, créditos, complemento em R$, doação e regras.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#14A76C] group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => setIsHelpShippingModalOpen(true)}
                className="w-full p-3.5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200/90 shadow-xs transition-all flex items-center justify-between group active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF8243]/10 text-[#FF8243] flex items-center justify-center">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-bold text-slate-800 group-hover:text-[#FF8243] transition-colors">
                      Como enviar meu desapego?
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Guia rápido sobre envio expresso e tradicional.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* REVER SPLASH SCREEN BUTTON */}
              <button
                type="button"
                onClick={() => setShowSplash(true)}
                className="w-full p-3.5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200/90 shadow-xs transition-all flex items-center justify-between group active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shadow-xs">
                    <Sparkles className="w-5 h-5 text-[#FF8243]" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-bold text-slate-800 group-hover:text-[#14A76C] transition-colors">
                      Rever Tela de Abertura (Splash)
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Testar a animação e apresentação do app novamente
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                  <PackageCheck className="w-4 h-4 text-[#14A76C] mx-auto mb-1" />
                  <span className="block text-xs font-extrabold text-slate-800">
                    {profileDonations.length}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Doações</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                  <Gift className="w-4 h-4 text-[#FF8243] mx-auto mb-1" />
                  <span className="block text-xs font-extrabold text-slate-800">
                    {redeemedItems.length}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Resgates</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                  <Award className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                  <span className="block text-xs font-extrabold text-slate-800">
                    18 kg
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Reutilizado</span>
                </div>
              </div>

              {/* Published donations */}
              {user && (
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                    <span>Minhas doações publicadas</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {profileDonations.length} itens
                    </span>
                  </h3>

                  {profileDonations.length === 0 ? (
                    <p className="text-[11px] text-slate-500 text-center py-4">
                      Você ainda não publicou nenhuma doação. Clique em + Doar para começar!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {profileDonations.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleOpenDetails(item)}
                          className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100 text-left hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-10 h-10 rounded-lg object-cover shrink-0"
                          />
                          <span className="flex-1 min-w-0">
                            <span className="block text-xs font-semibold text-slate-800 truncate">
                              {item.title}
                            </span>
                            <span className="block text-[10px] text-slate-500 truncate">
                              {item.category} · {item.credits} créditos
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDeleteDonation(item);
                            }}
                            className="p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                            title="Excluir Doação"
                            aria-label="Excluir Doação"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* History Section */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                  <span>Histórico de trocas & resgates</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {profileHistoryItems.length} itens
                  </span>
                </h3>

                {profileHistoryItems.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-4">
                    Você ainda não resgatou nenhum item.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {profileHistoryItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-semibold text-slate-800 truncate">
                              {item.title}
                            </h4>
                            <span className="text-[10px] text-slate-500">{getDisplayLocation(item)}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            item.status === 'completed'
                              ? 'text-emerald-600 bg-emerald-50'
                              : 'text-amber-600 bg-amber-50'
                          }`}>
                            {item.status === 'completed'
                              ? 'Concluído'
                              : item.status === 'in_transit'
                              ? 'Em trânsito'
                              : 'Reservado'}
                          </span>
                        </div>

                        {(item.status === 'reserved' || item.status === 'in_transit') && user?.uid === item.receiverId && (
                          <div className="w-full">
                            <button
                              type="button"
                              onClick={() => void handleConfirmItemReceived(item)}
                              className="w-full px-2 py-1.5 rounded-md bg-[#14A76C] text-white text-[10px] font-bold"
                            >
                              Confirmar Recebimento do Item
                            </button>
                          </div>
                        )}

                        {item.isLargeItem && user?.uid === item.receiverId && (
                          <button
                            type="button"
                            onClick={() => handleCallLalamove(item)}
                            className="w-full px-2 py-2 rounded-md bg-[#14A76C] hover:bg-[#108958] text-white text-[10px] font-bold transition-colors"
                          >
                            Chamar Carreto Lalamove
                          </button>
                        )}

                        {item.status === 'reserved' && user?.uid === item.userId && (
                          <span className="inline-flex items-center w-fit px-2 py-1 rounded-md text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200">
                            Aguardando confirmação de quem recebeu
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* FLOATING ACTION BUTTON (FAB) - Quick Donate */}
        {(activeTab === 'home' || activeTab === 'search') && (
          <button
            type="button"
            onClick={() => { if (requireAuth()) { resetForm(); setIsDonateModalOpen(true); } }}
            className="fixed bottom-20 right-4 z-40 bg-[#14A76C] hover:bg-[#108958] text-white shadow-xl rounded-full p-4 flex items-center gap-1.5 active:scale-95 transition-all"
            title="Doar item"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs font-bold pr-0.5">Doar</span>
          </button>
        )}

        {/* BOTTOM NAVIGATION BAR */}
        <nav className="sticky bottom-0 left-0 right-0 z-30 w-full bg-white border-t border-slate-100 px-3 py-1.5 flex items-center justify-around">
            {/* Home */}
            <button
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-full transition-all ${
                activeTab === 'home'
                  ? 'text-[#14A76C] font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px]">Início</span>
            </button>

            {/* Search */}
            <button
              onClick={() => setActiveTab('search')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-full transition-all ${
                activeTab === 'search'
                  ? 'text-[#14A76C] font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Search className="w-5 h-5" />
              <span className="text-[10px]">Buscar</span>
            </button>

            {/* CENTRAL FLOATING BUTTON: "+ Doar" */}
            <div className="relative -top-5 flex flex-col items-center">
              <button
                onClick={() => { if (requireAuth()) { resetForm(); setIsDonateModalOpen(true); } }}
                className="w-12 h-12 rounded-full bg-[#14A76C] hover:bg-[#108958] active:scale-95 text-white shadow-md flex items-center justify-center border-4 border-[#F5F0E1] transition-all group"
                title="Doar um item"
              >
                <Plus className="w-6 h-6 text-white stroke-[2.5]" />
              </button>
              <span className="text-[10px] font-bold text-[#14A76C] -mt-0.5">
                Doar
              </span>
            </div>

            {/* Favorites */}
            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-full transition-all relative ${
                activeTab === 'favorites'
                  ? 'text-[#14A76C] font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Heart className="w-5 h-5" />
              <span className="text-[10px]">Favoritos</span>
              {favoriteItems.length > 0 && (
                <span className="absolute top-1 right-1.5 w-2 h-2 bg-[#FF8243] rounded-full"></span>
              )}
            </button>

            {/* Profile */}
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-full transition-all ${
                activeTab === 'profile'
                  ? 'text-[#14A76C] font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px]">Perfil</span>
            </button>
        </nav>

        {/* MODAL 1: TELA DE DETALHES DO PRODUTO */}
        <AnimatePresence>
          {selectedItemForDetails && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-2 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, y: 120 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 120 }}
                className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl p-0 shadow-2xl max-h-[90vh] flex flex-col border-0 overflow-hidden"
              >
                {/* Scrollable Modal Body */}
                <div className="overflow-y-auto no-scrollbar flex-1 flex flex-col">
                  {/* Large Product Photo with Overlay Actions */}
                <div className="relative aspect-16/10 w-full bg-slate-100 overflow-hidden shrink-0">
                  <img
                    src={selectedItemForDetails.imageUrl}
                    alt={selectedItemForDetails.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/30 pointer-events-none"></div>

                  {/* Top Bar inside Details */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedItemForDetails(null)}
                      className="px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md active:scale-90 transition-all flex items-center gap-1 text-xs font-bold"
                      title="Voltar"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Voltar</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => toggleFavorite(selectedItemForDetails.id, e)}
                        className="p-2 rounded-full bg-white/90 text-slate-700 hover:text-rose-500 hover:bg-white shadow-md active:scale-90 transition-all"
                        title="Favoritar"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            selectedItemForDetails.isFavorite
                              ? 'fill-rose-500 text-rose-500'
                              : ''
                          }`}
                        />
                      </button>

                      <button
                        onClick={() => setSelectedItemForDetails(null)}
                        className="p-2 rounded-full bg-white/90 text-slate-700 hover:text-slate-900 hover:bg-white shadow-md active:scale-90 transition-all"
                        title="Fechar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Category & Badge over photo */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <span className="bg-[#14A76C] text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                      {selectedItemForDetails.category}
                    </span>
                    <span className="bg-[#FF7A38] text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md flex items-center">
                      <Coins className="w-4 h-4 text-white inline mr-1.5 shrink-0" />
                      <span>{selectedItemForDetails.credits} Créditos</span>
                    </span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-4 space-y-4 flex-1">
                  
                  {/* Title & Location & Condition */}
                  <div>
                    <h2 className="text-base font-extrabold text-slate-800 leading-tight mb-1">
                      {selectedItemForDetails.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {/* Location Badge */}
                      <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <MapPin className="w-3.5 h-3.5 text-[#FF8243]" />
                        <span>{selectedItemForDetails.location}</span>
                      </div>

                      {/* Condition / Estado de Conservação */}
                      <div className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#14A76C]" />
                        <span>{selectedItemForDetails.condition || 'Seminovo - Excelente estado'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Donor Info Card & Quartinho da Bagunça */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={selectedItemForDetails.donorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
                          alt={selectedItemForDetails.donorName}
                          className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-xs"
                        />
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                            Doador responsável
                          </span>
                          <h4 className="text-xs font-bold text-slate-800">
                            {selectedItemForDetails.donorName || 'Mariana Silva'}
                          </h4>
                        </div>
                      </div>

                      <button
                        onClick={() => handleStartChat(selectedItemForDetails)}
                        className="px-3 py-1.5 rounded-xl border border-[#14A76C]/40 text-[#14A76C] bg-white hover:bg-emerald-50 font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95 shadow-2xs shrink-0"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-[#14A76C]" />
                        <span>Conversar</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleOpenBagunca(
                          selectedItemForDetails.donorName || 'Mariana Silva',
                          selectedItemForDetails.donorAvatar,
                          selectedItemForDetails.location
                        )
                      }
                      className="w-full py-2 px-3 bg-[#FF8243]/10 hover:bg-[#FF8243]/20 text-[#FF8243] text-xs font-bold rounded-xl border border-[#FF8243]/30 flex items-center justify-center gap-2 transition-all active:scale-98 shadow-2xs"
                    >
                      <Store className="w-4 h-4 text-[#FF8243]" />
                      <span>Entrar no Quartinho da Bagunça de {selectedItemForDetails.donorName || 'Mariana Silva'}</span>
                    </button>
                  </div>

                  {/* Detailed Description */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Descrição do Item
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-200/70">
                      {selectedItemForDetails.description ||
                        'Item doado em ótimo estado para reutilização na comunidade.'}
                    </p>
                  </div>

                  {/* Shipping / Delivery Radio Options */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Opções de Frete / Logística
                      </h3>
                      {currentSelectedFreight && (
                        <span className="text-[10px] font-bold text-[#14A76C] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {currentSelectedFreight.id === 'lalamove_partner'
                            ? 'Frete a pagar direto à Lalamove'
                            : currentSelectedFreight.price === 0
                            ? 'Grátis'
                            : `R$ ${currentSelectedFreight.price.toFixed(2).replace('.', ',')}`}
                        </span>
                      )}
                    </div>

                    {/* CEP Input Row */}
                    <form onSubmit={handleCalculateFreight} className="mb-3 flex items-center gap-2">
                      <div className="relative flex-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={cepInput}
                          onChange={(e) => setCepInput(e.target.value)}
                          placeholder="CEP (Ex: 01310-100)"
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#14A76C]/40"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isCalculatingCep}
                        className="px-3.5 py-1.5 rounded-xl bg-[#14A76C] hover:bg-[#108958] text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
                      >
                        {isCalculatingCep ? (
                          <span className="animate-spin text-xs">🌀</span>
                        ) : (
                          <Calculator className="w-3.5 h-3.5" />
                        )}
                        <span>{isCalculatingCep ? 'Calculando...' : 'Calcular Frete'}</span>
                      </button>
                    </form>

                    {/* Organized Selectable Shipping Radio Options */}
                    {isCepCalculated && (
                      <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar pr-1">
                        {/* [Opções Padrão / Econômica] */}
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                            Opções Padrão / Econômica
                          </span>
                          <div className="space-y-1.5">
                            {FREIGHT_OPTIONS.filter((f) => selectedItemForDetails.isLargeItem
                              ? f.id === 'lalamove_partner'
                              : f.id !== 'lalamove_partner').map((opt) => (
                              <label
                                key={opt.id}
                                onClick={() => setSelectedFreightId(opt.id)}
                                className={`p-2.5 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                                  selectedFreightId === opt.id
                                    ? 'border-[#14A76C] bg-emerald-50/60 shadow-2xs'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="radio"
                                    name="freightOption"
                                    checked={selectedFreightId === opt.id}
                                    onChange={() => setSelectedFreightId(opt.id)}
                                    className="accent-[#14A76C] shrink-0"
                                  />
                                  <span className="text-base shrink-0">{opt.icon}</span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-bold text-slate-800 truncate">
                                        {opt.name}
                                      </span>
                                      {opt.badge && (
                                        <span className="text-[9px] font-extrabold text-[#14A76C] bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300 shrink-0">
                                          {opt.badge}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-500 block">
                                      {opt.id === 'lalamove_partner'
                                        ? 'Cotação em tempo real baseada na distância e modelo do veículo (Fiorino, Pick-up ou Caminhão)'
                                        : `(${opt.deliveryTime})`}
                                    </span>
                                  </div>
                                </div>
                                <span className={`text-xs font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shrink-0 ml-1 ${opt.id === 'lalamove_partner' ? 'text-amber-700' : 'text-slate-900'}`}>
                                  {opt.id === 'lalamove_partner'
                                    ? 'Frete a pagar direto à Lalamove'
                                    : `R$ ${opt.price.toFixed(2).replace('.', ',')}`}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                </div>
                </div>

                {/* Primary Action Buttons - Sticky Footer */}
                <div className="sticky bottom-0 bg-white p-4 border-t border-slate-200 z-10 space-y-2 shrink-0 shadow-lg">
                  {user && selectedItemForDetails.userId === user.uid && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteDonation(selectedItemForDetails)}
                      className="w-full py-2.5 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Excluir Doação</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsHelpShippingModalOpen(true)}
                    className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Como enviar meu desapego?</span>
                  </button>
                  <button
                    onClick={() => {
                      if (!requireAuth()) return;
                      const itemToRedeem = selectedItemForDetails;
                      setSelectedItemForDetails(null);
                      setSelectedItemForRedeem(itemToRedeem);
                    }}
                    className="w-full py-3 rounded-2xl bg-[#14A76C] hover:bg-[#108958] active:scale-98 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Avançar para Pagamento</span>
                    <Coins className="w-4 h-4 text-emerald-200" />
                  </button>

                  <button
                    onClick={() => handleStartChat(selectedItemForDetails)}
                    className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <MessageCircle className="w-4 h-4 text-slate-500" />
                    <span>Conversar com Doador</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 2: CONFIRMAÇÃO DE RESGATE (FLUXO FINAL) */}
        <AnimatePresence>
          {selectedItemForRedeem && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, y: 120 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 120 }}
                className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border-0"
              >
                {/* Fixed Header Bar */}
                <div className="p-4 pb-3 border-b border-slate-100 shrink-0 bg-white z-10 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const itemToDetails = selectedItemForRedeem;
                          setSelectedItemForRedeem(null);
                          setSelectedItemForDetails(itemToDetails);
                        }}
                        className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center justify-center shrink-0"
                        title="Voltar aos Detalhes do Produto"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>

                      <div className="w-8 h-8 rounded-full bg-[#14A76C]/10 flex items-center justify-center text-[#14A76C] shrink-0">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">
                          Confirmação de Resgate
                        </h3>
                        <span className="text-[10px] text-slate-500 block">
                          Verifique os detalhes da sua troca
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedItemForRedeem(null)}
                      className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                      title="Fechar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Flow Navigation Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const itemToDetails = selectedItemForRedeem;
                      setSelectedItemForRedeem(null);
                      setSelectedItemForDetails(itemToDetails);
                    }}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/80 flex items-center justify-center gap-1.5 transition-all active:scale-98 shadow-2xs"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#14A76C]" />
                    <span>Voltar aos detalhes do produto (alterar frete)</span>
                  </button>
                </div>

                {/* Resumo Discriminado do Resgate e Complemento em R$ */}
                {(() => {
                  const itemCost = selectedItemForRedeem.credits;
                  const limitePermitido = -Math.round(itemCost * 0.30);
                  const maxMissingAllowed = Math.round(itemCost * 0.30);
                  const safeItemCredits = Math.max(limitePermitido, userCredits);
                  const missingCredits = Math.max(0, itemCost - safeItemCredits);
                  const canRedeemWithComplement = missingCredits <= maxMissingAllowed;

                  const creditsUsed = Math.max(0, Math.min(safeItemCredits, itemCost));
                  const cashComplement = (itemCost - creditsUsed) * 1.00;
                  const freightFee = currentSelectedFreight.price;
                  const insuranceFee = isInsuranceSelected ? 3.90 : 0;
                  const totalCashToPay = cashComplement + freightFee + insuranceFee;

                  return (
                    <>
                      {/* Scrollable Modal Content */}
                      <div className="overflow-y-auto p-4 space-y-3.5 flex-1 no-scrollbar">
                        {/* Resumo do Item */}
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                          <img
                            src={selectedItemForRedeem.imageUrl}
                            alt={selectedItemForRedeem.title}
                            className="w-14 h-14 rounded-xl object-cover shrink-0 shadow-xs"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 truncate">
                              {selectedItemForRedeem.title}
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              Localização: {selectedItemForRedeem.location}
                            </p>
                            <span className="inline-flex items-center bg-[#FF7A38] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-2xs mt-1">
                              <Coins className="w-3.5 h-3.5 text-white inline mr-1 shrink-0" />
                              <span>Custo: {selectedItemForRedeem.credits} Créditos</span>
                            </span>
                          </div>
                        </div>

                        {/* Opção de Frete Escolhida (Transferida da Tela de Detalhes) */}
                        <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{currentSelectedFreight.icon}</span>
                            <div>
                              <span className="text-[9px] text-emerald-800 font-extrabold uppercase tracking-wider block">
                                Opção de Frete Escolhida
                              </span>
                              <span className="font-bold text-slate-800 block text-xs">
                                {currentSelectedFreight.name}
                              </span>
                              <span className="text-[10px] text-slate-600 block">
                                {currentSelectedFreight.id === 'lalamove_partner'
                                  ? 'Cotação em tempo real'
                                  : `${currentSelectedFreight.deliveryTime} • ${currentSelectedFreight.price === 0
                                  ? 'Grátis'
                                  : `R$ ${currentSelectedFreight.price.toFixed(2).replace('.', ',')}`}`}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              const itemToDetails = selectedItemForRedeem;
                              setSelectedItemForRedeem(null);
                              setSelectedItemForDetails(itemToDetails);
                            }}
                            className="text-[10px] font-bold text-[#14A76C] hover:underline bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs shrink-0"
                          >
                            Alterar
                          </button>
                        </div>

                        {/* Pagamento do Frete (Simulação) */}
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span>Pagamento do Frete</span>
                              <span className="text-[10px] font-extrabold text-[#FF8243] bg-[#FF8243]/10 px-2 py-0.5 rounded-full">
                                {currentSelectedFreight.id === 'lalamove_partner'
                                  ? 'Frete externo'
                                  : `R$ ${currentSelectedFreight.price.toFixed(2).replace('.', ',')}`}
                              </span>
                            </span>
                          </div>

                          {/* Payment Method Tabs */}
                          <div className="grid grid-cols-2 gap-1 bg-slate-200/70 p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('pix')}
                              className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                paymentMethod === 'pix'
                                  ? 'bg-white text-[#14A76C] shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>PIX</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setPaymentMethod('card')}
                              className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                paymentMethod === 'card'
                                  ? 'bg-white text-[#14A76C] shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Cartão de Crédito</span>
                            </button>
                          </div>

                          {/* PIX Option View */}
                          {paymentMethod === 'pix' ? (
                            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center space-y-2">
                              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800">
                                <QrCode className="w-4 h-4 text-[#14A76C]" />
                                <span>QR Code PIX Simulado</span>
                              </div>

                              {/* Stylized QR Code Component */}
                              <div className="w-24 h-24 mx-auto bg-slate-900 rounded-xl p-2 flex flex-col justify-between shadow-inner relative">
                                <div className="grid grid-cols-5 gap-1 h-full w-full">
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-emerald-400 rounded-xs"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-emerald-400 rounded-xs"></div>
                                  <div className="bg-[#14A76C] rounded-xs"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-emerald-400 rounded-xs"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-[#FF8243] rounded-xs"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-emerald-400 rounded-xs"></div>
                                  <div className="bg-[#14A76C] rounded-xs"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-emerald-400 rounded-xs"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-[#FF8243] rounded-xs"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-[#14A76C] rounded-xs"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-emerald-400 rounded-xs"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-white rounded-xs"></div>
                                  <div className="bg-emerald-400 rounded-xs"></div>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <span className="bg-[#14A76C] text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow">
                                    JÁ DOEI
                                  </span>
                                </div>
                              </div>

                              <p className="text-[10px] text-slate-500 leading-tight">
                                Copie o código abaixo para pagar via PIX no seu banco:
                              </p>

                              <button
                                type="button"
                                onClick={handleCopyPixCode}
                                className="w-full py-2 bg-[#14A76C]/10 hover:bg-[#14A76C]/20 text-[#14A76C] text-xs font-bold rounded-xl border border-[#14A76C]/30 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar Código PIX (Copia e Cola)</span>
                              </button>
                            </div>
                          ) : (
                            /* Credit Card Option View */
                            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                                  Número do Cartão
                                </label>
                                <input
                                  type="text"
                                  value={cardNumber}
                                  onChange={(e) => setCardNumber(e.target.value)}
                                  placeholder="4532 0000 0000 8892"
                                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:bg-white focus:outline-none"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                                    Validade (MM/AA)
                                  </label>
                                  <input
                                    type="text"
                                    value={cardExpiry}
                                    onChange={(e) => setCardExpiry(e.target.value)}
                                    placeholder="12/28"
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                                    CVV
                                  </label>
                                  <input
                                    type="password"
                                    value={cardCvv}
                                    onChange={(e) => setCardCvv(e.target.value)}
                                    placeholder="123"
                                    maxLength={4}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                                  Nome Impresso no Cartão
                                </label>
                                <input
                                  type="text"
                                  value={cardName}
                                  onChange={(e) => setCardName(e.target.value)}
                                  placeholder="MARIANA A SILVA"
                                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none"
                                />
                              </div>

                              <div className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 p-1.5 rounded-md">
                                <ShieldCheck className="w-3.5 h-3.5 text-[#14A76C] shrink-0" />
                                <span>Simulação segura de transação.</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Optional Protection Checkbox (Módulo de Seguro) */}
                        <div 
                          onClick={() => setIsInsuranceSelected(!isInsuranceSelected)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                            isInsuranceSelected
                              ? 'bg-emerald-50 border-[#14A76C] shadow-2xs'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isInsuranceSelected}
                            onChange={(e) => setIsInsuranceSelected(e.target.checked)}
                            className="mt-0.5 accent-[#14A76C] w-4 h-4 cursor-pointer"
                          />
                          <div className="text-xs">
                            <span className="font-extrabold text-slate-800 flex items-center gap-1">
                              <span>🛡️ Adicionar Proteção de Troca Segura</span>
                              <span className="text-[#14A76C] bg-emerald-100 px-1.5 py-0.2 rounded text-[10px] font-black">
                                + R$ 3,90
                              </span>
                            </span>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Garante reembolso imediato e reenvio sem custo caso o item venha danificado ou diferente do anunciado.
                            </p>
                          </div>
                        </div>

                        {/* Premium Advantage Banner in Checkout */}
                        <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                          isPremium 
                            ? 'bg-amber-50 border-amber-300 text-amber-900' 
                            : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                        }`}>
                          <div className="flex items-center gap-1.5">
                            <Sparkles className={`w-4 h-4 ${isPremium ? 'text-[#FF8243]' : 'text-[#14A76C]'}`} />
                            <span>
                              {isPremium 
                                ? '⭐ Sua conta Premium permite completar até 40% em R$!' 
                                : 'Permite completar até 30% em R$'}
                            </span>
                          </div>
                          {!isPremium && (
                            <button
                              type="button"
                              onClick={() => setIsPremiumModalOpen(true)}
                              className="text-[10px] font-extrabold text-white bg-[#FF8243] hover:bg-[#ff712b] px-2 py-1 rounded-md shrink-0 shadow-2xs"
                            >
                              Virar 40% Premium
                            </button>
                          )}
                        </div>

                        {/* Resumo Discriminado Box */}
                        <div className="text-xs text-slate-700 space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                          <div className="flex justify-between items-center text-slate-600 font-medium">
                            <span className="text-left text-slate-600 pr-2">Créditos do Item:</span>
                            <span className="text-right shrink-0 font-black text-slate-800">{itemCost} Créditos</span>
                          </div>

                          <div className="flex justify-between items-center text-emerald-700 font-semibold">
                            <span className="text-left pr-2">Créditos Utilizados:</span>
                            <span className="text-right shrink-0 font-bold">-{creditsUsed} Cts</span>
                          </div>

                          {cashComplement > 0 && (
                            <div className="flex justify-between items-center text-[#FF8243] font-bold">
                              <span className="text-left pr-2">Complemento R$ ({missingCredits} Cts):</span>
                              <span className="text-right shrink-0">R$ {cashComplement.toFixed(2).replace('.', ',')}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center text-slate-600">
                            <span className="text-left text-slate-600 pr-2 truncate">Frete Escolhido ({currentSelectedFreight.name}):</span>
                            <span className="text-right shrink-0 font-bold text-slate-800">
                              R$ {freightFee.toFixed(2).replace('.', ',')}
                            </span>
                          </div>

                          {isInsuranceSelected && (
                            <div className="flex justify-between items-center text-emerald-800 font-semibold">
                              <span className="text-left pr-2">Proteção Seguro (Troca Segura):</span>
                              <span className="text-right shrink-0 font-bold">R$ 3,90</span>
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black text-slate-900">
                            <span className="text-left pr-2">Total em R$ a Pagar:</span>
                            <span className="text-right shrink-0 text-base text-[#FF8243]">
                              R$ {totalCashToPay.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Sticky Action Footer */}
                      <div className="sticky bottom-0 bg-white p-4 border-t border-slate-200 z-10 shrink-0 shadow-lg">
                        {!canRedeemWithComplement ? (
                          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-center space-y-2">
                            <p className="text-xs text-rose-700 font-semibold">
                              Saldo insuficiente. Você precisa de mais créditos! Que tal publicar um desapego agora para ganhar créditos?
                            </p>
                            <p className="text-[10px] text-slate-600">
                              {isPremium
                                ? 'Acumule mais créditos doando itens ou fazendo check-in!'
                                : 'Assine o Clube Premium para liberar até 40% de complemento em R$!'}
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                              {!isPremium && (
                                <button
                                  type="button"
                                  onClick={() => setIsPremiumModalOpen(true)}
                                  className="flex-1 py-2 bg-[#FF8243] text-white text-xs font-bold rounded-xl shadow-xs"
                                >
                                  Seja Premium (40%)
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedItemForRedeem(null);
                                  setIsEarnModalOpen(true);
                                }}
                                className="flex-1 py-2 bg-[#14A76C] text-white text-xs font-bold rounded-xl shadow-xs"
                              >
                                Ganhar Créditos
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedItemForRedeem(null)}
                              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmRedeem}
                              className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-[#14A76C] hover:bg-[#108958] text-white text-xs font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-4 h-4" />
                              <span>Confirmar Resgate (R$ {totalCashToPay.toFixed(2).replace('.', ',')})</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 3: CONVERSAR COM DOADOR (SIMULATION CHAT) */}
        <AnimatePresence>
          {chatModalItem && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-2 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, y: 120 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 120 }}
                className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl p-4 shadow-2xl h-[75vh] flex flex-col border-0"
              >
                {/* Chat Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setChatModalItem(null)}
                      className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all shrink-0"
                      title="Voltar"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <img
                      src={chatModalItem.donorAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'}
                      alt={chatModalItem.donorName}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">
                        {chatModalItem.donorName || 'Doador'}
                      </h3>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Item: {chatModalItem.title}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setChatModalItem(null)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2.5 my-2">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        msg.sender === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] p-2.5 rounded-2xl text-xs ${
                          msg.sender === 'user'
                            ? 'bg-[#14A76C] text-white rounded-br-2xs'
                            : 'bg-slate-100 text-slate-800 rounded-bl-2xs border border-slate-200/60'
                        }`}
                      >
                        <p>{msg.text}</p>
                        <span
                          className={`text-[9px] block text-right mt-1 ${
                            msg.sender === 'user' ? 'text-emerald-100' : 'text-slate-400'
                          }`}
                        >
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <form
                  onSubmit={handleSendChatMessage}
                  className="pt-2 border-t border-slate-100 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    placeholder="Escreva uma mensagem..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#14A76C]/40"
                  />
                  <button
                    type="submit"
                    className="p-2.5 bg-[#14A76C] text-white rounded-xl hover:bg-[#108958] active:scale-95 transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 4: DONATE NEW ITEM (+ DOAR) - 3-Step Wizard */}
        <AnimatePresence>
          {isDonateModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-hidden">
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="w-[calc(100%-2rem)] max-w-md max-h-[85vh] flex flex-col justify-between rounded-3xl p-5 mx-auto bg-white shadow-2xl overflow-hidden box-border"
              >
                {/* Header */}
                <div className="w-full max-w-full box-border flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#14A76C]/10 flex items-center justify-center text-[#14A76C] shrink-0">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-800">
                        Cadastrar nova doação
                      </h2>
                      <span className="text-[10px] text-emerald-600 font-semibold block">
                        Ganhe +15% de créditos bônus na sua primeira doação concluída! ✨
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { resetForm(); setIsDonateModalOpen(false); }}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="w-full max-w-full box-border mb-3 shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-500">
                      Passo {donateStep} de 3
                    </span>
                    <span className="text-[10px] font-semibold text-[#14A76C]">
                      {donateStep === 1 ? 'Foto & IA' : donateStep === 2 ? 'Informações' : 'Revisão'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full max-w-full box-border rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-[#14A76C] rounded-full transition-all duration-300"
                      style={{ width: `${(donateStep / 3) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleCreateDonation} className="w-full max-w-full box-border flex flex-col flex-1 min-h-0">
                  <div className="w-full max-w-full box-border flex-1 overflow-y-auto no-scrollbar space-y-3">
                    {/* STEP 1: Photo & AI reading */}
                    {donateStep === 1 && (
                      <div className="w-full max-w-full box-border space-y-3">
                        <p className="text-xs font-semibold text-slate-700 text-center px-2">
                          Passo 1: Tire uma foto e descubra quantos créditos vale seu item ✨
                        </p>

                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          id="photo-upload"
                          onChange={handlePhotoFileChange}
                        />

                        {newImageUrl ? (
                          <div className="relative w-full max-w-full box-border rounded-2xl overflow-hidden border border-slate-200">
                            <img
                              src={newImageUrl}
                              alt="Pré-visualização da foto do item"
                              className="w-full max-w-full box-border h-44 object-cover"
                            />
                            {isAnalyzingImage && (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45 text-white">
                                <span className="flex items-center gap-2 rounded-full bg-slate-900/75 px-3 py-2 text-xs font-bold">
                                  <Sparkles className="w-4 h-4 animate-pulse" />
                                  Analisando imagem com IA...
                                </span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setNewImageUrl('');
                                setNewImageFile(null);
                                setIsAnalyzingImage(false);
                                setAiSuggested(false);
                              }}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/60 text-white hover:bg-slate-900/80 transition-all"
                              title="Remover foto"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            {aiSuggested && (
                              <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 shadow-lg">
                                <Sparkles className="w-3 h-3" />
                                Créditos sugeridos pela IA ✨
                              </span>
                            )}
                          </div>
                        ) : (
                          <label
                            htmlFor="photo-upload"
                            className="flex flex-col items-center justify-center gap-2 w-full max-w-full box-border h-44 rounded-2xl border-2 border-dashed border-[#14A76C]/40 bg-emerald-50/50 text-[#14A76C] cursor-pointer hover:bg-emerald-50 transition-all"
                          >
                            <div className="w-14 h-14 rounded-full bg-[#14A76C] text-white flex items-center justify-center shadow-md">
                              <Camera className="w-7 h-7" />
                            </div>
                            <span className="text-sm font-bold">Tirar Foto do Item</span>
                            <span className="text-[10px] text-slate-500 font-medium text-center px-6">
                              Tire uma foto do item agora (fotos da galeria não são permitidas por segurança)
                            </span>
                          </label>
                        )}

                        {isAnalyzingImage && (
                          <div className="flex items-center gap-2 rounded-xl border border-[#14A76C]/20 bg-emerald-50 p-2 text-[11px] font-semibold text-[#14A76C]">
                            <Sparkles className="w-4 h-4 animate-pulse" />
                            <span>Analisando imagem via IA...</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* STEP 2: Info & +-20% credit range */}
                    {donateStep === 2 && (
                      <div className="w-full max-w-full box-border space-y-3">
                        <p className="text-xs font-semibold text-slate-700 text-center px-2">
                          Passo 2: Confirme as informações do seu desapego
                        </p>

                        {newImageUrl && (
                          <div className="relative w-full max-w-full box-border rounded-2xl overflow-hidden border border-slate-200">
                            <img
                              src={newImageUrl}
                              alt="Pré-visualização da foto do item"
                              className="w-full max-w-full box-border h-28 object-cover"
                            />
                            <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 shadow-lg">
                              <Sparkles className="w-3 h-3" />
                              Capa/IA
                            </span>
                          </div>
                        )}

                        {/* Complementary photos gallery */}
                        <div className="w-full max-w-full box-border">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Fotos Complementares (Opcional - até 4 fotos)
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            id="extra-photos-upload"
                            onChange={handleExtraPhotosFileChange}
                          />
                          <div className="flex flex-wrap gap-2">
                            {newExtraPhotos.map((photo, index) => (
                              <div key={index} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                                <img src={photo} alt={`Foto complementar ${index + 1}`} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExtraPhoto(index)}
                                  className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-slate-900/60 text-white hover:bg-slate-900/80 transition-all"
                                  title="Remover foto"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            {newExtraPhotos.length < MAX_EXTRA_PHOTOS && (
                              <label
                                htmlFor="extra-photos-upload"
                                className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:border-[#14A76C]/50 flex items-center justify-center cursor-pointer transition-all shrink-0"
                              >
                                <Plus className="w-5 h-5" />
                              </label>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Título do item *
                          </label>
                          <input
                            type="text"
                            ref={titleInputRef}
                            value={newTitle}
                            onChange={(e) => {
                              setNewTitle(e.target.value);
                              setPricingError('');
                            }}
                            onBlur={() => {
                              if (newTitle.trim().length >= 3) void handleCalculatePricing();
                            }}
                            placeholder="Ex: Vaso de Cerâmica, Jaqueta Jeans..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#14A76C]/40"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Categoria
                          </label>
                          <select
                            value={newCategory}
                            onChange={(e) => {
                              const category = e.target.value;
                              setNewCategory(category);
                              setIsCategoryManuallySelected(true);
                              setPricingError('');
                              setIsLargeItem(category === 'Móveis & Decoração');
                              void handleCalculatePricing(newCondition, category);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#14A76C]/40"
                          >
                            {DONATION_CATEGORIES.map((category) => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                        </div>

                        <label className="flex items-start gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-[11px] font-semibold text-amber-900 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isLargeItem}
                            onChange={(event) => setIsLargeItem(event.target.checked)}
                            className="mt-0.5 accent-[#FF8243]"
                          />
                          <span>Item de Grande Porte / Pesado (Exige furgão ou carreto Lalamove)</span>
                        </label>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Estado de Conservação
                          </label>
                          <select
                            value={newCondition}
                            onChange={(e) => {
                              setNewCondition(e.target.value);
                              setPricingError('');
                              void handleCalculatePricing(e.target.value);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#14A76C]/40"
                          >
                            <option value="Novo na caixa">Novo na caixa</option>
                            <option value="Usado - Excelente">Usado - Excelente</option>
                            <option value="Usado - Marcas de uso">Usado - Marcas de uso</option>
                            <option value="Para conserto/peças">Para conserto/peças</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Bairro / Localização
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={newLocation}
                              onChange={(e) => setNewLocation(e.target.value)}
                              placeholder="Ex: Pinheiros, SP"
                              className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#14A76C]/40"
                            />
                            <button
                              type="button"
                              onClick={handleUseGps}
                              disabled={isLocatingGps}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#14A76C] hover:bg-emerald-50 disabled:opacity-60 transition-all"
                              title="Usar minha localização atual"
                            >
                              <LocateFixed className={`w-4 h-4 ${isLocatingGps ? 'animate-spin' : ''}`} />
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            No app final, este campo utilizará seu CEP ou GPS para calcular o frete exato.
                          </p>
                        </div>

                        {/* Credits Card with +-20% lock */}
                        <div className="w-full max-w-full box-border p-3 rounded-2xl border border-[#14A76C]/20 bg-emerald-50/40">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="block text-[11px] font-bold text-slate-700">
                              Valor em Créditos
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800 px-2 py-0.5 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              {!pricingError && newCreditsBase > 0
                                ? `Base da IA: ${newCreditsBase}`
                                : 'Aguardando título...'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCreditsStep(-5)}
                              disabled={creditsMin <= 0 || creditsMax <= 0 || newCredits <= creditsMin}
                              className="w-9 h-9 shrink-0 rounded-full bg-white border border-slate-200 text-slate-600 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 active:scale-95 transition-all"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              value={newCredits}
                              min={creditsMin}
                              max={creditsMax}
                              onChange={handleCreditsInputChange}
                              className="flex-1 text-center px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#14A76C]/40"
                            />
                            <button
                              type="button"
                              onClick={() => handleCreditsStep(5)}
                              disabled={creditsMax <= 0 || newCredits >= creditsMax}
                              className="w-9 h-9 shrink-0 rounded-full bg-white border border-slate-200 text-slate-600 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 active:scale-95 transition-all"
                            >
                              +
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1.5 text-center">
                            {isPricingLoading
                              ? 'Avaliando item com IA...'
                              : creditsMin > 0 && creditsMax > 0
                              ? `Faixa permitida: ${creditsMin} a ${creditsMax} créditos (±20%)`
                              : 'Aguardando título...'}
                          </p>
                          {pricingJustification && !isPricingAnalyzing && (
                            <p className="mt-2 text-[10px] leading-snug text-slate-500">
                              {pricingJustification}
                            </p>
                          )}
                          {pricingError && !isPricingAnalyzing && (
                            <p className="mt-2 text-[10px] leading-snug text-rose-600">
                              {pricingError}
                            </p>
                          )}
                          {requiresModeration && (
                            <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] font-semibold text-amber-800">
                              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span>Item sujeito a análise da moderação antes da publicação</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Observações do Item (Opcional)
                          </label>
                          <textarea
                            rows={2}
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            placeholder="Conte mais detalhes, motivo do desapego, avarias ou especificações..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#14A76C]/40 resize-none"
                          ></textarea>
                        </div>

                      </div>
                    )}


                    {/* STEP 3: Review & Publish */}
                    {donateStep === 3 && (
                      <div className="w-full max-w-full box-border space-y-3">
                        <p className="text-xs font-semibold text-slate-700 text-center px-2">
                          Passo 3: Revise e publique sua doação
                        </p>

                        <div className="w-full max-w-full box-border rounded-2xl border border-slate-200 overflow-hidden">
                          {newImageUrl && (
                            <img
                              src={newImageUrl}
                              alt="Pré-visualização da foto do item"
                              className="w-full max-w-full box-border h-36 object-cover"
                            />
                          )}
                          <div className="p-3 space-y-1">
                            <h3 className="text-sm font-bold text-slate-800">
                              {newTitle || 'Título do item'}
                            </h3>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <MapPin className="w-3 h-3" />
                              <span>{newLocation || 'Localização não informada'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Camera className="w-3 h-3" />
                              <span>{1 + newExtraPhotos.length} foto{newExtraPhotos.length === 0 ? '' : 's'} anexada{newExtraPhotos.length === 0 ? '' : 's'}</span>
                            </div>
                            {newExtraPhotos.length > 0 && (
                              <div className="flex gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                                {newExtraPhotos.map((photo, index) => (
                                  <img
                                    key={index}
                                    src={photo}
                                    alt={`Foto complementar ${index + 1}`}
                                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Credits breakdown card */}
                        <div className="w-full max-w-full box-border p-3 rounded-2xl border border-[#14A76C]/20 bg-emerald-50/40 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-600">
                            <span>Créditos do Item</span>
                            <span className="font-semibold text-slate-800">{newCredits ?? 'Aguardando'} créditos</span>
                          </div>
                          {isFirstDonation && (
                            <div className="flex items-center justify-between text-[11px] text-slate-600">
                              <span>Bônus da 1ª Doação (15%)</span>
                              <span className="font-semibold text-[#14A76C]">+{firstDonationBonus} créditos</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-1.5 border-t border-[#14A76C]/20 text-xs font-bold text-slate-800">
                            <span>Total a receber</span>
                            <span className="flex items-center gap-1 text-[#14A76C]">
                              <Coins className="w-3.5 h-3.5" />
                              {newCredits !== null ? newCredits + firstDonationBonus : 'Aguardando'} créditos
                            </span>
                          </div>
                        </div>

                        {/* Highlight Checkbox (Módulo de Destaque) */}
                        <div
                          onClick={() => setNewIsFeatured(!newIsFeatured)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                            newIsFeatured
                              ? 'bg-amber-50 border-[#FF8243] shadow-2xs'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={newIsFeatured}
                            onChange={(e) => setNewIsFeatured(e.target.checked)}
                            className="mt-0.5 accent-[#FF8243] w-4 h-4 cursor-pointer"
                          />
                          <div className="text-xs">
                            <span className="font-extrabold text-slate-800 flex items-center gap-1">
                              <span>🔥 Destacar no topo por 7 dias</span>
                              <span className="text-white bg-[#FF8243] px-1.5 py-0.2 rounded text-[10px] font-black">
                                R$ 4,90
                              </span>
                            </span>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Posiciona seu desapego em primeiro lugar no feed com selo especial de Destaque para desapegar 3x mais rápido!
                            </p>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400 text-center px-2">
                          Os créditos e o bônus serão liberados na sua conta assim que a entrega do produto for confirmada pelo recebedor.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Wizard Footer Navigation */}
                  <div className="w-full max-w-full box-border flex items-center gap-2 pt-3 mt-1 border-t border-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={() => setDonateStep((prev) => Math.max(1, prev - 1))}
                      disabled={donateStep === 1 || isSubmittingDonation}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Voltar
                    </button>

                    {donateStep < 3 ? (
                      <button
                        type="submit"
                        className="flex-1 px-5 py-2.5 rounded-xl bg-[#14A76C] hover:bg-[#108958] text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                      >
                        <span>Continuar</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isSubmittingDonation}
                        className="flex-1 px-5 py-2.5 rounded-xl bg-[#14A76C] hover:bg-[#108958] text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isSubmittingDonation ? (
                          <>
                            <span className="animate-spin text-xs">🌀</span>
                            <span>{uploadPhase === 'uploading' ? 'Enviando imagem...' : 'Publicando...'}</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Publicar Doação</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: NOTIFICATIONS CENTER */}
        <AnimatePresence>
          {isNotificationsModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full sm:max-w-md max-h-[80vh] bg-white rounded-2xl p-5 shadow-2xl flex flex-col gap-3 border border-slate-200 overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#14A76C]/10 flex items-center justify-center text-[#14A76C] shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Notificações
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsNotificationsModalOpen(false)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">
                      Você não possui notificações no momento.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto no-scrollbar">
                    {notifications.map((notification) => {
                      const isDeliveryNotification = notification.title.toLowerCase().includes('envio');
                      const isCreditNotification = notification.title.toLowerCase().includes('crédito');
                      const NotificationIcon = isDeliveryNotification
                        ? Truck
                        : isCreditNotification
                        ? Sparkles
                        : PackageCheck;
                      const iconBg = isDeliveryNotification
                        ? 'bg-[#FF8243]/10'
                        : isCreditNotification
                        ? 'bg-sky-50'
                        : 'bg-[#14A76C]/10';
                      const iconColor = isDeliveryNotification
                        ? 'text-[#FF8243]'
                        : isCreditNotification
                        ? 'text-sky-600'
                        : 'text-[#14A76C]';
                      return (
                        <div
                          key={notification.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => void handleNotificationClick(notification)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              void handleNotificationClick(notification);
                            }
                          }}
                          className={`p-3 rounded-xl border border-slate-200 flex items-start gap-2.5 ${notification.read ? 'bg-slate-50' : 'bg-emerald-50/40'}`}
                        >
                          <div className={`w-8 h-8 rounded-full ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
                            <NotificationIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-slate-800">
                              {notification.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 leading-snug">
                              {notification.message}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-0.5 block">
                              {notification.createdAt
                                ? notification.createdAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                                : 'Agora'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 5: EARN MORE CREDITS (GANHAR MAIS) */}
        <AnimatePresence>
          {isEarnModalOpen && (

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full sm:max-w-md bg-white rounded-2xl p-5 shadow-2xl flex flex-col gap-4 border border-slate-200"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEarnModalOpen(false)}
                      className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all shrink-0"
                      title="Voltar"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="w-7 h-7 rounded-full bg-[#FF8243]/10 flex items-center justify-center text-[#FF8243] shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Como ganhar mais créditos
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsEarnModalOpen(false)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {/* Option 1 */}
                  <div
                    onClick={() => {
                      setIsEarnModalOpen(false);
                      if (requireAuth()) { resetForm(); setIsDonateModalOpen(true); }
                    }}
                    className="p-3 rounded-xl border border-slate-200 hover:border-[#14A76C] bg-slate-50 hover:bg-emerald-50/50 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#14A76C]">
                        Doar um item
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Cadastre desapegos para a comunidade
                      </p>
                    </div>
                    <span className="bg-[#14A76C] text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                      +50 Cts
                    </span>
                  </div>

                  {/* Option 2 */}
                  <div
                    onClick={() => handleClaimBonus(15, 'Check-in Diário')}
                    className="p-3 rounded-xl border border-slate-200 hover:border-[#FF8243] bg-slate-50 hover:bg-amber-50/50 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#FF8243]">
                        Check-in Diário
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Acesse a plataforma diariamente
                      </p>
                    </div>
                    <span className="bg-[#FF8243] text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                      +15 Cts
                    </span>
                  </div>

                  {/* Option 3 */}
                  <div
                    onClick={() => handleClaimBonus(30, 'Indicação de Amigo')}
                    className="p-3 rounded-xl border border-slate-200 hover:border-sky-500 bg-slate-50 hover:bg-sky-50/50 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-sky-600">
                        Convidar Amigos
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Compartilhe seu código de convite
                      </p>
                    </div>
                    <span className="bg-sky-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                      +30 Cts
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsEarnModalOpen(false)}
                  className="w-full py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl"
                >
                  Fechar
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 6: QUARTINHO DA BAGUNÇA (LOJINHA PESSOAL DO DOADOR) */}
        <AnimatePresence>
          {baguncaDonor && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-2 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, y: 120 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 120 }}
                className="w-full sm:max-w-md bg-[#F5F0E1] rounded-t-[32px] sm:rounded-3xl shadow-2xl h-[85vh] flex flex-col border-0 overflow-hidden"
              >
                {/* Store Header Banner */}
                <div className="bg-gradient-to-r from-[#14A76C] to-emerald-700 text-white p-4 relative shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={() => setBaguncaDonor(null)}
                      className="px-2.5 py-1 rounded-full bg-black/20 text-white hover:bg-black/35 transition-all text-xs font-bold flex items-center gap-1 shadow-2xs active:scale-95"
                      title="Voltar"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Voltar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBaguncaDonor(null)}
                      className="p-1.5 rounded-full bg-black/20 text-white hover:bg-black/35 transition-all shadow-2xs active:scale-95"
                      title="Fechar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={
                        baguncaDonor.avatar ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
                      }
                      alt={baguncaDonor.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
                    />
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-200 flex items-center gap-1">
                        <Store className="w-3 h-3" />
                        Quartinho da Bagunça
                      </span>
                      <h2 className="text-base font-black text-white">{baguncaDonor.name}</h2>
                      <span className="text-xs text-emerald-100 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#FF8243]" />
                        {baguncaDonor.location}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-emerald-50 mt-3 italic bg-black/10 p-2 rounded-xl border border-white/10">
                    "{baguncaDonor.bio}"
                  </p>
                </div>

                {/* Store Feed Grid */}
                <div className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>Desapegos no Quartinho</span>
                      <span className="bg-[#14A76C] text-white text-[10px] px-2 py-0.2 rounded-full font-bold">
                        {
                          items.filter(
                            (i) =>
                              i.donorName === baguncaDonor.name ||
                              (baguncaDonor.name === 'Mariana Silva' && i.donorName === 'Você')
                          ).length
                        }
                      </span>
                    </h3>
                  </div>

                  {(() => {
                    const donorItems = items.filter(
                      (i) =>
                        i.donorName === baguncaDonor.name ||
                        (baguncaDonor.name === 'Mariana Silva' && i.donorName === 'Você')
                    );

                    if (donorItems.length === 0) {
                      return (
                        <div className="bg-white/80 rounded-2xl p-6 text-center border border-dashed border-slate-300 my-4">
                          <PackageCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-xs font-medium text-slate-600 mb-2">
                            Este doador ainda não possui outros desapegos cadastrados no Quartinho.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setBaguncaDonor(null);
                              if (requireAuth()) { resetForm(); setIsDonateModalOpen(true); }
                            }}
                            className="bg-[#14A76C] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm"
                          >
                            Doar um item agora
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-2 gap-3">
                        {donorItems.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              setBaguncaDonor(null);
                              handleOpenDetails(item);
                            }}
                            className="flex flex-col justify-between p-2.5 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all group cursor-pointer border-0"
                          >
                            <div>
                              <div className="relative aspect-4/3 w-full bg-slate-100 rounded-xl overflow-hidden">
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <span className="absolute top-1.5 left-1.5 bg-slate-900/70 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full z-10">
                                  {item.category}
                                </span>
                                {/* Floating Credits Badge over Image */}
                                <div className="absolute bottom-1.5 left-1.5 bg-[#FF7A38] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex items-center shadow-xs z-10">
                                  <Coins className="w-3.5 h-3.5 text-white inline mr-1 shrink-0" />
                                  <span>{item.credits} Créditos</span>
                                </div>
                              </div>
                              <div className="mt-1.5">
                                <h4 className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">
                                  {item.title}
                                </h4>
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{getDisplayLocation(item)}</span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setBaguncaDonor(null);
                                handleOpenDetails(item);
                              }}
                              className="w-full mt-2 py-1.5 text-xs font-medium rounded-lg bg-[#14A76C] hover:bg-[#108656] text-white transition-colors text-center active:scale-98"
                            >
                              Resgatar
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <div className="p-3 bg-white border-t border-slate-200/80 shrink-0">
                  <button
                    type="button"
                    onClick={() => setBaguncaDonor(null)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-98"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                    <span>Voltar para a Comunidade</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 7: CLUBE JÁ DOEI PREMIUM SUBSCRIPTION */}
        <AnimatePresence>
          {isPremiumModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full sm:max-w-md bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 border-b border-slate-100 shrink-0 bg-white z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPremiumModalOpen(false)}
                      className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all shrink-0"
                      title="Voltar"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-[#FF8243] text-white flex items-center justify-center shadow-sm shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-800">
                        Clube Já Doei Premium
                      </h2>
                      <span className="text-[10px] text-[#FF8243] font-bold block">
                        Assinatura Mensal por R$ 19,90/mês
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPremiumModalOpen(false)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Main Benefits List - Scrollable */}
                <div className="p-4 space-y-3 overflow-y-auto flex-1 no-scrollbar">
                  <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-2">
                    <h3 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#FF8243]" />
                      <span>Vantagens Exclusivas da Assinatura:</span>
                    </h3>

                    <ul className="text-xs text-slate-700 space-y-2 pt-1">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#14A76C] shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-slate-900">Complemento de até 40% em R$:</strong> Ao faltar créditos para um resgate, parcele até 40% em dinheiro (usuários comuns têm até 30%).
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#14A76C] shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-slate-900">1 Destaque Grátis por Mês:</strong> Destaque 1 desapego no topo do feed por 7 dias grátis (economia de R$ 4,90/mês).
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#14A76C] shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-slate-900">Prioridade de Logística:</strong> Atendimento expresso para agendamento com parceiros de frete (Uber Flash/Lalamove/Loggi).
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#14A76C] shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-slate-900">Selo Exclusivo no Perfil:</strong> Destaque-se na comunidade com a insígnia VIP "Assinante Premium".
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Status Box */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Seu plano atual</span>
                      <span className="font-extrabold text-slate-800">
                        {isPremium ? '👑 Clube Premium (R$ 19,90/mês)' : 'Plano Gratuito Comum'}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isPremium ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {isPremium ? 'Ativo' : 'Básico'}
                    </span>
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="sticky bottom-0 bg-white p-4 border-t border-slate-100 z-10 shrink-0 flex items-center gap-2 shadow-lg">
                  <button
                    type="button"
                    onClick={() => setIsPremiumModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 border border-slate-200"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isPremium) {
                        setIsPremium(false);
                        showToast('Assinatura do Clube Premium cancelada.', 'info');
                      } else {
                        setIsPremium(true);
                        showToast('🎉 Parabéns! Você agora é membro do Clube Já Doei Premium (40% complemento liberado)!', 'success');
                      }
                      setIsPremiumModalOpen(false);
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold shadow-md transition-all active:scale-95 ${
                      isPremium
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-gradient-to-r from-amber-500 to-[#FF8243] hover:from-amber-600 hover:to-[#ff712b] text-white'
                    }`}
                  >
                    {isPremium ? 'Cancelar Assinatura' : 'Assinar por R$ 19,90/mês'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* MODAL DE CENTRAL DE AJUDA & REGRAS */}
          {isHelpModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-2 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, y: 120 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 120 }}
                className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl p-0 shadow-2xl max-h-[90vh] flex flex-col border-0 overflow-hidden"
              >
                {/* Header with Navigation & Close */}
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsHelpModalOpen(false)}
                      className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                      title="Voltar"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-[#14A76C]" />
                        <span>Central de Ajuda & Regras</span>
                      </h2>
                      <p className="text-[10px] text-slate-300">Como podemos te ajudar hoje?</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsHelpModalOpen(false)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 4 Navigable Tabs Header */}
                <div className="bg-slate-100 border-b border-slate-200 px-2 py-1.5 flex gap-1 overflow-x-auto no-scrollbar shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveHelpTab('geral')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1 ${
                      activeHelpTab === 'geral'
                        ? 'bg-[#14A76C] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>1. Geral</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveHelpTab('faq')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1 ${
                      activeHelpTab === 'faq'
                        ? 'bg-[#14A76C] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>2. Dúvidas Frequentes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveHelpTab('resgatar')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1 ${
                      activeHelpTab === 'resgatar'
                        ? 'bg-[#14A76C] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>3. Sobre Resgatar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveHelpTab('doar')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1 ${
                      activeHelpTab === 'doar'
                        ? 'bg-[#14A76C] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>4. Sobre Doar</span>
                  </button>
                </div>

                {/* Tab Content Body - Scrollable */}
                <div className="p-4 overflow-y-auto flex-1 no-scrollbar space-y-4">
                  {/* TAB 1: GERAL */}
                  {activeHelpTab === 'geral' && (
                    <div className="space-y-3">
                      <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80 space-y-2">
                        <h3 className="text-xs font-extrabold text-[#14A76C] flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4" />
                          <span>Como o Já Doei funciona em 3 passos:</span>
                        </h3>
                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                          <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                            <span className="w-5 h-5 bg-[#14A76C] text-white font-bold text-[10px] rounded-full flex items-center justify-center mx-auto mb-1">1</span>
                            <span className="text-[10px] font-bold text-slate-800 block">Doar Desapegos</span>
                            <span className="text-[9px] text-slate-500">Anuncie itens sem uso</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                            <span className="w-5 h-5 bg-[#FF8243] text-white font-bold text-[10px] rounded-full flex items-center justify-center mx-auto mb-1">2</span>
                            <span className="text-[10px] font-bold text-slate-800 block">Ganhar Créditos</span>
                            <span className="text-[9px] text-slate-500">Saldo acumulativo</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                            <span className="w-5 h-5 bg-sky-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center mx-auto mb-1">3</span>
                            <span className="text-[10px] font-bold text-slate-800 block">Resgatar</span>
                            <span className="text-[9px] text-slate-500">Frete na sua porta</span>
                          </div>
                        </div>
                      </div>

                      {/* Categorias e Documentos Oficiais */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Documentos e Termos de Uso</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-slate-600 shrink-0" />
                            <div>
                              <span className="text-xs font-bold text-slate-800 block">Termos de Serviço</span>
                              <span className="text-[9px] text-slate-500">Direitos e obrigações</span>
                            </div>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-2.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div>
                              <span className="text-xs font-bold text-slate-800 block">Privacidade</span>
                              <span className="text-[9px] text-slate-500">Proteção de dados LGPD</span>
                            </div>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-2.5">
                            <Award className="w-4 h-4 text-amber-500 shrink-0" />
                            <div>
                              <span className="text-xs font-bold text-slate-800 block">Código de Ética</span>
                              <span className="text-[9px] text-slate-500">Respeito na comunidade</span>
                            </div>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-2.5">
                            <Truck className="w-4 h-4 text-sky-600 shrink-0" />
                            <div>
                              <span className="text-xs font-bold text-slate-800 block">Segurança de Frete</span>
                              <span className="text-[9px] text-slate-500">Logística de parceiros</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: DÚVIDAS FREQUENTES */}
                  {activeHelpTab === 'faq' && (
                    <div className="space-y-2.5">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                        <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                          <Coins className="w-4 h-4 text-[#FF8243]" />
                          <span>Como funcionam os Créditos Já Doei?</span>
                        </h4>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Cada doação aprovada te premia com créditos proporcionais ao valor estimado do item. Você acumula saldo e pode trocá-lo por qualquer outro produto disponível na plataforma.
                        </p>
                      </div>

                      <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/70 space-y-1">
                        <h4 className="text-xs font-extrabold text-[#14A76C] flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-[#14A76C]" />
                          <span>Quando meus créditos expiram?</span>
                        </h4>
                        <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                          <strong>NUNCA!</strong> Seus créditos não possuem data de expiração e permanecem seguros no seu saldo para usar quando desejar.
                        </p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                        <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-amber-500" />
                          <span>O que são os Selos de Doador?</span>
                        </h4>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          São medalhas de engajamento social: <strong>Selo Bronze</strong> (1ª doação), <strong>Selo Prata</strong> (5 doações), <strong>Selo Ouro</strong> (10+ doações) e <strong>👑 Assinante Premium</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: SOBRE RESGATAR */}
                  {activeHelpTab === 'resgatar' && (
                    <div className="space-y-2.5">
                      <div className="p-3 bg-sky-50/70 rounded-2xl border border-sky-200 space-y-1">
                        <h4 className="text-xs font-extrabold text-sky-900 flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-sky-600" />
                          <span>Como funciona o Pagamento de Frete?</span>
                        </h4>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          O frete é 100% pago pelo recebedor no momento do checkout. Operamos exclusivamente com parceiros de logística oficiais (Uber Flash, Lalamove e Correios).
                        </p>
                      </div>

                      <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-1">
                        <h4 className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                          <Calculator className="w-4 h-4 text-[#FF8243]" />
                          <span>Complemento em R$ (30% vs 40%)</span>
                        </h4>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          Se faltar créditos para resgatar um item, você pode pagar a diferença em dinheiro:
                          <br />• <strong>Usuários Comuns:</strong> Complemento em R$ de até 30% do valor dos créditos.
                          <br />• <strong>👑 Clube Premium:</strong> Complemento em R$ ampliado para até 40%!
                        </p>
                      </div>

                      <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-1">
                        <h4 className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-[#14A76C]" />
                          <span>Como funciona o Seguro de Troca (R$ 1,99)?</span>
                        </h4>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          Ao adicionar o Seguro de Troca por R$ 1,99 no checkout, você garante reembolso total dos seus créditos e do valor do frete caso o produto chegue danificado ou diferente do anunciado.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: SOBRE DOAR */}
                  {activeHelpTab === 'doar' && (
                    <div className="space-y-2.5">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                        <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                          <Box className="w-4 h-4 text-[#14A76C]" />
                          <span>Como embalar o item para envio?</span>
                        </h4>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Coloque o produto em uma caixa de papelão limpa ou sacola reforçada lacrada. Adicione jornal ou plástico bolha para proteger itens frágeis.
                        </p>
                      </div>

                      <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-1">
                        <h4 className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-[#14A76C]" />
                          <span>Coleta Automática do Uber/Lalamove</span>
                        </h4>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          Quem resgata o item paga e agenda a coleta. O motorista parceiro vai até a sua porta para retirar a encomenda no horário combinado. <strong>Você não paga nada pela coleta!</strong>
                        </p>
                      </div>

                      <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 space-y-1">
                        <h4 className="text-xs font-extrabold text-rose-800 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          <span>O que NÃO pode ser doado?</span>
                        </h4>
                        <p className="text-[11px] text-rose-900 leading-relaxed font-medium">
                          🚫 Medicamentos e cosméticos abertos.
                          <br />🚫 Alimentos vencidos ou abertos.
                          <br />🚫 Armas, explosivos e produtos inflamáveis.
                          <br />🚫 Itens roubados, adulterados ou ilícitos.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* FOOTER CARD: FALE COM A GENTE (CHAT IA) */}
                  <div className="mt-4 p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl text-white shadow-md space-y-2.5 border border-slate-700 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#14A76C] flex items-center justify-center text-white shadow-xs">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-white">
                            Fale com a Assistente Virtual (Atendimento IA)
                          </h4>
                          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Atendimento 24/7 • Respostas instantâneas
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Tire suas dúvidas em tempo real sobre fretes, créditos, assinatura do Clube Premium ou doações.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsHelpModalOpen(false);
                        setIsChatIaOpen(true);
                      }}
                      className="w-full py-2.5 bg-[#14A76C] hover:bg-[#108958] active:scale-98 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Iniciar Chat com a IA</span>
                    </button>
                  </div>
                </div>

                {/* Sticky Modal Close Footer */}
                <div className="sticky bottom-0 bg-white p-3 border-t border-slate-200 z-10 shrink-0 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setIsHelpModalOpen(false)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                  >
                    Fechar Central de Ajuda
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* MODAL DE CHAT COM ASSISTENTE VIRTUAL IA */}
          {isChatIaOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-2 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, y: 120 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 120 }}
                className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl p-0 shadow-2xl h-[88vh] sm:h-[620px] flex flex-col border-0 overflow-hidden"
              >
                {/* Chat IA Header */}
                <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsChatIaOpen(false);
                        setIsHelpModalOpen(true);
                      }}
                      className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                      title="Voltar"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-[#14A76C] flex items-center justify-center text-white font-bold text-xs shadow-xs">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                        <span>Assistente Virtual Já Doei</span>
                        <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-2 py-0.2 rounded-full border border-emerald-500/30">
                          IA
                        </span>
                      </h2>
                      <span className="text-[9.5px] text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Sempre online • Pergunta e Resposta
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsChatIaOpen(false)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Suggestion Chips */}
                <div className="bg-slate-100 border-b border-slate-200 p-2 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSendIaMessage("Como funciona o frete?")}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-[#14A76C] text-[10px] font-bold rounded-lg border border-slate-200/90 whitespace-nowrap active:scale-95 transition-all"
                  >
                    🚚 Como funciona o frete?
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendIaMessage("Quando meus créditos expiram?")}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-[#14A76C] text-[10px] font-bold rounded-lg border border-slate-200/90 whitespace-nowrap active:scale-95 transition-all"
                  >
                    🪙 Quando meus créditos expiram?
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendIaMessage("O que é o Complemento em R$?")}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-[#14A76C] text-[10px] font-bold rounded-lg border border-slate-200/90 whitespace-nowrap active:scale-95 transition-all"
                  >
                    💵 Complemento em R$?
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendIaMessage("O que é o Seguro de Troca?")}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-[#14A76C] text-[10px] font-bold rounded-lg border border-slate-200/90 whitespace-nowrap active:scale-95 transition-all"
                  >
                    🛡️ Seguro de Troca?
                  </button>
                </div>

                {/* Messages Body */}
                <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
                  {chatIaMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'bot' && (
                        <div className="w-7 h-7 rounded-full bg-[#14A76C] text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl text-xs space-y-1 shadow-2xs ${
                          msg.sender === 'user'
                            ? 'bg-[#14A76C] text-white rounded-tr-xs font-medium'
                            : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/80'
                        }`}
                      >
                        <p className="leading-relaxed">{msg.text}</p>
                        <span
                          className={`block text-[9px] text-right font-medium ${
                            msg.sender === 'user' ? 'text-emerald-100' : 'text-slate-400'
                          }`}
                        >
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input Footer */}
                <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    value={chatIaInput}
                    onChange={(e) => setChatIaInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendIaMessage();
                      }
                    }}
                    placeholder="Digite sua pergunta sobre o app..."
                    className="flex-1 bg-slate-100 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#14A76C] text-slate-800 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendIaMessage()}
                    className="p-2.5 bg-[#14A76C] hover:bg-[#108958] active:scale-95 text-white rounded-xl shadow-xs transition-all flex items-center justify-center"
                    title="Enviar"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* MODAL DE CONFIRMAÇÃO DE SUCESSO DO RESGATE */}
          {successRedeemData && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-2 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 40 }}
                className="w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl p-5 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar border-0"
              >
                {/* Header Icon + Celebration */}
                <div className="flex flex-col items-center text-center space-y-2 pt-2 pb-1">
                  <div className="relative flex items-center justify-center my-1">
                    <div className="absolute w-16 h-16 bg-[#14A76C]/20 rounded-full animate-ping opacity-40" />
                    <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#14A76C] border-2 border-[#14A76C]/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 z-10">
                      <CheckCircle2 className="w-9 h-9 text-[#14A76C]" />
                    </div>
                  </div>
                  
                  <h2 className="text-lg font-extrabold text-slate-800 pt-1">
                    Resgate Confirmado! 🎉
                  </h2>
                  <p className="text-xs text-slate-500 font-medium max-w-[280px]">
                    Sua doação já está sendo preparada pelo doador.
                  </p>
                </div>

                {/* Order Summary Card */}
                <div className="my-4 p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 text-xs">
                    <span className="font-semibold text-slate-500">Número do Pedido:</span>
                    <span className="font-bold text-slate-800 bg-slate-200/70 px-2 py-0.5 rounded-md font-mono text-[11px]">
                      {successRedeemData.orderNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={successRedeemData.item.imageUrl}
                      alt={successRedeemData.item.title}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200"
                    />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <h3 className="text-xs font-bold text-slate-800 line-clamp-1">
                        {successRedeemData.item.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate">
                        Doador(a): {successRedeemData.item.donorName || 'Mariana Silva'}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded-full">
                          {successRedeemData.freightName}
                        </span>
                        <div className="text-[10px] font-semibold text-white bg-[#FF7A38] px-2.5 py-0.5 rounded-full inline-flex items-center shadow-2xs">
                          <Coins className="w-3.5 h-3.5 text-white inline mr-1 shrink-0" />
                          <span>{successRedeemData.creditsUsed} Créditos</span>
                          {successRedeemData.totalCashPaid > 0 && (
                            <span className="ml-1 text-amber-100">+ R$ {successRedeemData.totalCashPaid.toFixed(2).replace('.', ',')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status / Próximos Passos Banner */}
                {(() => {
                  return (
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 my-3 flex items-center gap-3">
                      <div className="bg-emerald-500 text-white p-2 rounded-xl text-lg">📦</div>
                      <div>
                        <p className="text-xs font-bold text-emerald-900">Status: Envio Padrão / Coleta Agendada</p>
                        <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                          O doador foi notificado e tem até 48h para embalar e agendar a entrega do item.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Action Buttons */}
                <div className="space-y-2 mt-auto">
                  <button
                    type="button"
                    onClick={() => void handleConfirmDonationDelivery(successRedeemData.item)}
                    className="w-full py-3 px-4 bg-[#FF8243] hover:bg-[#e96f2f] active:scale-98 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar recebimento da doação</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessRedeemData(null);
                      setActiveTab('profile');
                    }}
                    className="w-full py-3 px-4 bg-[#14A76C] hover:bg-[#108958] active:scale-98 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <span>Acompanhar no Meu Perfil</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSuccessRedeemData(null);
                      setActiveTab('home');
                    }}
                    className="w-full py-2.5 px-4 text-slate-500 hover:text-slate-800 font-semibold text-xs rounded-xl transition-all text-center"
                  >
                    Voltar para o Feed Principal
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: EDITAR PERFIL */}
        <AnimatePresence>
          {isEditProfileOpen && user && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full sm:max-w-md bg-white rounded-2xl p-5 shadow-2xl flex flex-col gap-4 border border-slate-200"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-800">Editar Perfil</h3>
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(false)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="profile-photo-upload"
                    onChange={handleEditProfilePhotoChange}
                  />
                  <div className="flex justify-center">
                    <label
                      htmlFor="profile-photo-upload"
                      className="relative w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden hover:border-[#14A76C]/50 transition-all"
                      title="Alterar foto de perfil"
                    >
                      {editProfilePhotoPreview ? (
                        <img src={editProfilePhotoPreview} alt="Pré-visualização do perfil" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-6 h-6 text-slate-400" />
                      )}
                      <span className="absolute bottom-0 inset-x-0 bg-slate-900/60 text-white text-[9px] font-bold text-center py-0.5">
                        Alterar
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nome de exibição</label>
                    <input
                      type="text"
                      required
                      value={editProfileName}
                      onChange={(e) => setEditProfileName(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14A76C]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="w-full py-3 rounded-xl bg-[#14A76C] hover:bg-[#108958] active:scale-98 text-white text-xs font-bold shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: LOGIN E CADASTRO */}
        <AnimatePresence>
          {isAuthOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, y: 120 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 120 }}
                className="relative w-full sm:max-w-md bg-[#F5F0E1] rounded-t-[32px] sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar border-0 p-6"
              >
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 shadow-xs transition-all"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Topo */}
                <div className="flex flex-col items-center text-center pt-2 pb-4">
                  <img src={simboloImg} alt="Já Doei" className="h-12 w-auto object-contain mb-2" />
                  <p className="text-xs font-medium text-slate-500">
                    Entre para doar ou resgatar itens
                  </p>
                </div>

                {/* Abas: Entrar / Criar Conta */}
                <div className="flex items-center gap-1.5 bg-white rounded-full p-1 border border-slate-200 shadow-2xs mb-5">
                  <button
                    type="button"
                    onClick={() => setAuthTab('login')}
                    className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
                      authTab === 'login' ? 'bg-[#14A76C] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthTab('signup')}
                    className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
                      authTab === 'signup' ? 'bg-[#14A76C] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Criar Conta
                  </button>
                </div>

                {authTab === 'login' ? (
                  <form
                    onSubmit={handleEmailLogin}
                    className="space-y-3"
                  >
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14A76C]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Senha</label>
                      <input
                        type="password"
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14A76C]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isAuthSubmitting}
                      className="w-full py-3 rounded-xl bg-[#14A76C] hover:bg-[#108958] active:scale-98 text-white text-xs font-bold shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isAuthSubmitting ? 'Entrando...' : 'Entrar'}
                    </button>

                    <div className="flex items-center gap-3 py-1">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">ou</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isAuthSubmitting}
                      className="w-full py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <GoogleIcon className="w-4 h-4" />
                      <span>Continuar com Google</span>
                    </button>
                  </form>
                ) : (
                  <form
                    onSubmit={handleEmailSignup}
                    className="space-y-3"
                  >
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nome completo</label>
                      <input
                        type="text"
                        required
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14A76C]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14A76C]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">WhatsApp</label>
                      <input
                        type="tel"
                        required
                        value={authWhatsapp}
                        onChange={(e) => setAuthWhatsapp(e.target.value)}
                        placeholder="(11) 91234-5678"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14A76C]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Senha</label>
                      <input
                        type="password"
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14A76C]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isAuthSubmitting}
                      className="w-full py-3 rounded-xl bg-[#14A76C] hover:bg-[#108958] active:scale-98 text-white text-xs font-bold shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isAuthSubmitting ? 'Criando conta...' : 'Cadastrar e Começar'}
                    </button>

                    <div className="flex items-center gap-3 py-1">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">ou</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isAuthSubmitting}
                      className="w-full py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <GoogleIcon className="w-4 h-4" />
                      <span>Cadastrar com Google</span>
                    </button>
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: CENTRAL DE AJUDA DE ENVIO */}
        <AnimatePresence>
          {isHelpShippingModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.96 }}
                className="relative w-full sm:max-w-md bg-[#F5F0E1] rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setIsHelpShippingModalOpen(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 shadow-xs transition-all z-10"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="p-5 pb-4">
                  <div className="flex flex-col items-center text-center mb-5 pt-2">
                    <div className="w-12 h-12 rounded-2xl bg-[#14A76C]/10 text-[#14A76C] flex items-center justify-center mb-2">
                      <Truck className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-800">Como funciona o envio do produto</h3>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white rounded-full p-1 border border-slate-200 shadow-2xs mb-4">
                    <button
                      type="button"
                      onClick={() => setActiveShippingHelpTab('express')}
                      className={`flex-1 py-2 rounded-full text-[11px] font-bold transition-all ${
                        activeShippingHelpTab === 'express' ? 'bg-[#14A76C] text-white shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Expresso
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveShippingHelpTab('traditional')}
                      className={`flex-1 py-2 rounded-full text-[11px] font-bold transition-all ${
                        activeShippingHelpTab === 'traditional' ? 'bg-[#14A76C] text-white shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Tradicional
                    </button>
                  </div>

                  {activeShippingHelpTab === 'express' ? (
                    <div className="space-y-3 text-left">
                      <div className="rounded-2xl bg-white p-3 border border-slate-200">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#14A76C] mb-2">Aceite rápido</p>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Você tem até 15 minutos para confirmar o aceite e liberar a coleta.
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white p-3 border border-slate-200">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#14A76C] mb-2">Preparo</p>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Embale o item imediatamente em sacola ou caixa lacrada e identifique com o nome e endereço do recebedor.
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white p-3 border border-slate-200">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#14A76C] mb-2">Coleta</p>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          O motorista irá até o seu endereço. Verifique a placa e o nome no app e entregue o pacote com segurança.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-left">
                      <div className="rounded-2xl bg-white p-3 border border-slate-200">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#14A76C] mb-2">Etiqueta</p>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Baixe a etiqueta ou QR Code em <span className="font-bold text-slate-700">Minhas Doações &gt; Aguardando Envio</span>.
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white p-3 border border-slate-200">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#14A76C] mb-2">Embalagem</p>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Acondicione o produto em caixa de papelão selada e fixe a etiqueta na parte externa.
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white p-3 border border-slate-200">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#14A76C] mb-2">Postagem</p>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Leve o pacote ao ponto de postagem indicado dentro do prazo limite e guarde o comprovante.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 rounded-2xl border border-[#FF8243]/25 bg-[#FF8243]/10 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#FF8243] mb-2">Recomendação de segurança</p>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Grave um vídeo rápido ou tire foto do produto já embalado antes do envio para registrar o estado e evitar dúvidas futuras.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsHelpShippingModalOpen(false)}
                    className="mt-5 w-full py-3 rounded-xl bg-[#14A76C] hover:bg-[#108958] active:scale-98 text-white text-xs font-bold shadow-md transition-all"
                  >
                    Falar com o Suporte
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}