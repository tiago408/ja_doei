// Cliente para as Cloud Functions da Lalamove (cotação e criação de corrida para itens grandes).
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';
import type { FreightOption } from '../types/donation';

const functionsClient = getFunctions(app);

export type LalamoveVehicleType = 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';

export interface LalamoveCoordinates {
  lat: number;
  lng: number;
  address?: string;
}

export interface LalamoveQuoteResult {
  quotationId: string | null;
  currency: string;
  lalamoveValue: number;
  finalValue: number;
  serviceType: string;
  expiresAt: string | null;
  stopIds: string[];
}

export interface LalamoveOrderContact {
  name: string;
  phone: string;
}

export interface LalamoveOrderResult {
  orderId: string | null;
  status: string | null;
  shareLink: string | null;
}

interface BrasilApiCepResponse {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
}

// Coordenadas centrais de fallback por cidade/UF, usadas quando a geocodificação não retorna nada
// (garante que a Lalamove sempre receba lat/lng numéricos válidos, mesmo que aproximados)
const FALLBACK_CITY_COORDINATES: Record<string, LalamoveCoordinates> = {
  'cotia-sp': { lat: -23.6035, lng: -46.9188 },
  'sao paulo-sp': { lat: -23.5505, lng: -46.6333 }
};
const DEFAULT_FALLBACK_COORDINATES = FALLBACK_CITY_COORDINATES['sao paulo-sp'];

function resolveFallbackCoordinates(city?: string, state?: string): LalamoveCoordinates {
  const normalizedCity = (city || '').trim().toLowerCase();
  const normalizedState = (state || '').trim().toLowerCase();
  const fallback = FALLBACK_CITY_COORDINATES[`${normalizedCity}-${normalizedState}`] || DEFAULT_FALLBACK_COORDINATES;
  return { ...fallback, address: [city, state].filter(Boolean).join(', ') || 'São Paulo, SP (estimado)' };
}

// Busca o endereço completo (rua, bairro, cidade, UF) a partir do CEP via BrasilAPI, gratuita e sem chave
async function fetchAddressFromCep(cepDigits: string): Promise<BrasilApiCepResponse | null> {
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cepDigits}`);
    if (!response.ok) return null;
    return (await response.json()) as BrasilApiCepResponse;
  } catch (error) {
    console.error('Erro ao consultar BrasilAPI CEP:', error);
    return null;
  }
}

// Geocodifica um endereço em texto via Nominatim/OpenStreetMap (gratuito, sem chave de API)
async function geocodeWithNominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        // Nota: navegadores bloqueiam a sobrescrita manual do header User-Agent por segurança;
        // este valor só é aplicado quando a chamada roda em ambiente Node (ex: Cloud Function).
        'User-Agent': 'JaDoeiApp/1.0 (contato@jadoei.app)'
      }
    });
    if (!response.ok) return null;

    const results = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (!results.length) return null;

    return { lat: Number(results[0].lat), lng: Number(results[0].lon) };
  } catch (error) {
    console.error('Erro ao geocodificar via Nominatim:', error);
    return null;
  }
}

// Converte um CEP em lat/lng: BrasilAPI resolve o endereço completo, o Nominatim geocodifica esse
// endereço, e se ambos falharem cai para coordenadas centrais da cidade/UF (nunca retorna null,
// garantindo que a cotação da Lalamove sempre receba valores numéricos).
export async function geocodePostalCode(cep: string): Promise<LalamoveCoordinates> {
  const cepDigits = cep.replace(/\D/g, '');
  const cepData = cepDigits.length === 8 ? await fetchAddressFromCep(cepDigits) : null;

  if (cepData) {
    const fullAddress = [cepData.street, cepData.neighborhood, cepData.city, cepData.state, 'Brasil']
      .filter(Boolean)
      .join(', ');
    const geocoded = await geocodeWithNominatim(fullAddress);
    if (geocoded) return { ...geocoded, address: fullAddress };

    console.error('Nominatim não retornou coordenadas para o endereço da BrasilAPI; usando fallback.', { cepDigits, fullAddress });
    return resolveFallbackCoordinates(cepData.city, cepData.state);
  }

  console.error('BrasilAPI não retornou endereço para o CEP informado; usando fallback.', { cepDigits });
  return resolveFallbackCoordinates();
}

// Geocodifica um endereço em texto livre (sem CEP disponível), com o mesmo fallback de segurança
export async function geocodeAddress(addressText: string): Promise<LalamoveCoordinates> {
  const query = addressText.trim();
  const geocoded = query ? await geocodeWithNominatim(`${query}, Brasil`) : null;
  if (geocoded) return { ...geocoded, address: query };

  console.error('Nominatim não retornou coordenadas para o endereço em texto livre; usando fallback.', { query });
  return resolveFallbackCoordinates();
}


// Chama a Cloud Function `quoteLalamove` (cotação Sandbox + margem de 20% já aplicada no backend)
export async function quoteLalamoveFreight(
  origin: LalamoveCoordinates,
  destination: LalamoveCoordinates,
  vehicleType: LalamoveVehicleType = 'VAN'
): Promise<LalamoveQuoteResult> {
  const callQuote = httpsCallable<
    { origin: LalamoveCoordinates; destination: LalamoveCoordinates; vehicleType: LalamoveVehicleType },
    LalamoveQuoteResult
  >(functionsClient, 'quoteLalamove');

  const response = await callQuote({ origin, destination, vehicleType });
  return response.data;
}

// Chama a Cloud Function `createLalamoveOrder`, disparada assim que o pagamento do frete é confirmado
export async function createLalamoveOrder(
  quote: Pick<LalamoveQuoteResult, 'quotationId' | 'stopIds'>,
  sender: LalamoveOrderContact,
  recipient: LalamoveOrderContact
): Promise<LalamoveOrderResult> {
  if (!quote.quotationId) {
    throw new Error('quotationId ausente: cote o frete novamente antes de confirmar o pagamento.');
  }

  const callCreateOrder = httpsCallable<
    { quotationId: string; stopIds: string[]; sender: LalamoveOrderContact; recipient: LalamoveOrderContact },
    LalamoveOrderResult
  >(functionsClient, 'createLalamoveOrder');

  const response = await callCreateOrder({
    quotationId: quote.quotationId,
    stopIds: quote.stopIds,
    sender,
    recipient
  });
  return response.data;
}

// Converte a cotação da Lalamove no formato FreightOption já usado pela tela de checkout
export function toFreightOption(quote: LalamoveQuoteResult): FreightOption {
  return {
    id: 'lalamove_partner',
    category: 'padrao',
    categoryLabel: 'Contratação externa',
    name: 'Carreto & Utilitário (Lalamove)',
    carrierName: 'Lalamove',
    price: quote.finalValue,
    deliveryTime: 'Retirada agendada via chat',
    icon: '🚛',
    type: 'standard'
  };
}
