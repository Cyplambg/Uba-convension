import { useEffect, useState } from "react";
import { toast } from "sonner";
import { syncOfflineData, getSyncQueueCount } from "@/lib/sync";
import { useQueryClient } from "@tanstack/react-query";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineBanner() {
  const [isClient, setIsClient] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const qc = useQueryClient();

  // S'assurer qu'on est côté client
  useEffect(() => {
    setIsClient(true);
    setIsOffline(!navigator.onLine);
    setPendingCount(getSyncQueueCount());
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    // Vérifier périodiquement s'il y a des éléments en attente (utile quand on sauvegarde hors ligne)
    const interval = setInterval(() => {
      setPendingCount(getSyncQueueCount());
    }, 2000);
    return () => clearInterval(interval);
  }, [isClient]);

  useEffect(() => {
    if (!isClient) return;
    
    const handleOnline = async () => {
      setIsOffline(false);
      
      const count = getSyncQueueCount();
      if (count > 0) {
        toast.info("Connexion rétablie. Synchronisation en cours...");
        const res = await syncOfflineData();
        if (res.success && res.count > 0) {
          toast.success(`${res.count} saisie(s) synchronisée(s) avec succès !`);
          setPendingCount(0);
          qc.invalidateQueries();
        } else if (!res.success) {
          toast.error("Échec de la synchronisation. L'application réessaiera.");
        }
      } else {
        toast.success("Connexion internet rétablie.");
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast.warning("Mode hors-ligne activé. Vos saisies sont enregistrées localement.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check pour online sync
    if (navigator.onLine && getSyncQueueCount() > 0) {
      handleOnline();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [qc, isClient]);

  // Ne rien afficher pendant le SSR ou si pas de bannière nécessaire
  if (!isClient || (!isOffline && pendingCount === 0)) return null;

  return (
    <div className={`px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 z-50 sticky top-0 transition-all ${
      isOffline 
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-b border-amber-300 dark:border-amber-700" 
        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-b border-emerald-300 dark:border-emerald-700"
    }`}>
      {isOffline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
      {isOffline 
        ? <span>Mode hors-ligne.{pendingCount > 0 ? ` ${pendingCount} saisie(s) en attente.` : " Saisies locales activées."}</span>
        : <span>Synchronisation en cours...</span>}
    </div>
  );
}
