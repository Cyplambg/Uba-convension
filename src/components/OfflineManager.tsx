import { useEffect, useState } from "react";
import { toast } from "sonner";
import { syncOfflineData, getSyncQueueCount } from "@/lib/sync";
import { useQueryClient } from "@tanstack/react-query";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineManager() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(getSyncQueueCount());
  const qc = useQueryClient();

  useEffect(() => {
    // Vérifier périodiquement s'il y a des éléments en attente (utile quand on sauvegarde hors ligne)
    const interval = setInterval(() => {
      setPendingCount(getSyncQueueCount());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
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
      toast.warning("Mode hors-ligne activé. Vos saisies seront sauvegardées localement.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Essayer de synchroniser au chargement si on est online et qu'il y a des données
    if (navigator.onLine && getSyncQueueCount() > 0) {
      handleOnline();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [qc]);

  if (!isOffline && pendingCount === 0) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg transition-all ${
      isOffline ? "bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700" 
      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700"
    }`}>
      {isOffline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
      {isOffline 
        ? `Hors ligne${pendingCount > 0 ? ` (${pendingCount} en attente)` : ""}`
        : "Synchronisation..."}
    </div>
  );
}
