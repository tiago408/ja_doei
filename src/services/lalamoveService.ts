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

// Geocodifica um endereço em texto (ex: "Rua X, 123, Bairro, Cidade - SP") via Nominatim/OpenStreetMap,
// gratuito e sem necessidade de chave de API. Usado para obter lat/lng exigidos pela API da Lalamove.
export async function geocodeAddress(addressText: string): Promise<LalamoveCoordinates | null> {
  const query = addressText.trim();
  if (!query) return null;

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) return null;

  const results = (await response.json()) as Array<{ lat: string; lon: string }>;
  if (!results.length) return null;

  return { lat: Number(results[0].lat), lng: Number(results[0].lon), address: query };
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
