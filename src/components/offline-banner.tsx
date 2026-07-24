import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    function onOffline() {
      setIsOffline(true);
    }
    function onOnline() {
      setIsOffline(false);
    }

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    // Initial check
    if (!navigator.onLine) {
      setIsOffline(true);
    }

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 z-50 sticky top-0">
      <WifiOff className="h-4 w-4" />
      <span>Connexion perdue. Vous êtes en mode hors-ligne. Les saisies seront sauvegardées localement (brouillon).</span>
    </div>
  );
}
