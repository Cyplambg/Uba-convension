import { supabase } from "@/integrations/supabase/client";

const SYNC_QUEUE_KEY = "uba_offline_sync_queue";

export type SyncPayload = {
  agency_id: string;
  year: number;
  month: number;
  cc: number;
  ce: number;
  pm: number;
};

// Vérifier si on est côté client
const isClient = typeof window !== "undefined";

// Ajouter des données à la file d'attente hors-ligne
export const addToSyncQueue = (payloads: SyncPayload | SyncPayload[]) => {
  if (!isClient) return;
  
  const existingStr = localStorage.getItem(SYNC_QUEUE_KEY);
  const queue: SyncPayload[] = existingStr ? JSON.parse(existingStr) : [];
  
  if (Array.isArray(payloads)) {
    queue.push(...payloads);
  } else {
    queue.push(payloads);
  }

  // Dedupliquer en gardant la dernière saisie pour un (agency_id, year, month) donné
  const deduplicated = new Map<string, SyncPayload>();
  for (const item of queue) {
    const key = `${item.agency_id}_${item.year}_${item.month}`;
    deduplicated.set(key, item);
  }

  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(Array.from(deduplicated.values())));
};

// Obtenir le nombre d'éléments en attente
export const getSyncQueueCount = (): number => {
  if (!isClient) return 0;
  
  const existingStr = localStorage.getItem(SYNC_QUEUE_KEY);
  if (!existingStr) return 0;
  try {
    return JSON.parse(existingStr).length;
  } catch {
    return 0;
  }
};

// Synchroniser les données hors-ligne
export const syncOfflineData = async (): Promise<{ success: boolean; count: number }> => {
  if (!isClient) return { success: true, count: 0 };
  
  const existingStr = localStorage.getItem(SYNC_QUEUE_KEY);
  if (!existingStr) return { success: true, count: 0 };
  
  try {
    const queue: SyncPayload[] = JSON.parse(existingStr);
    if (queue.length === 0) return { success: true, count: 0 };

    // Envoyer en masse à Supabase
    const { error } = await supabase
      .from("conventions")
      .upsert(queue, { onConflict: "agency_id,year,month" });

    if (error) throw error;

    // Si succès, vider la file
    localStorage.removeItem(SYNC_QUEUE_KEY);
    return { success: true, count: queue.length };
  } catch (error) {
    console.error("Erreur lors de la synchronisation hors-ligne:", error);
    return { success: false, count: 0 };
  }
};
