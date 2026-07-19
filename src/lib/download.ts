function arrToBase64(arr: number[]): string {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < arr.length; i += chunk) {
    binary += String.fromCharCode(...arr.slice(i, i + chunk));
  }
  return btoa(binary);
}

function isCapacitor(): boolean {
  return typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform;
}

function swDownload(data: Uint8Array, filename: string, mime: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const sw = navigator.serviceWorker.controller;
    if (!sw) return reject(new Error("No SW controller"));

    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      if (event.data?.type === "DOWNLOAD_READY") {
        const url = `/__download/${event.data.token}/${encodeURIComponent(filename)}`;
        const win = window.open(url, "_blank");
        if (!win) {
          window.location.href = url;
        }
        resolve();
      }
    };

    sw.postMessage(
      { type: "CACHE_DOWNLOAD", data: arrToBase64(Array.from(data)), filename, mime },
      [channel.port2] as any,
    );

    setTimeout(() => reject(new Error("SW download timeout")), 10000);
  });
}

async function trySwDownload(data: Uint8Array, filename: string, mime: string): Promise<boolean> {
  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      await swDownload(data, filename, mime);
      return true;
    }
  } catch {
  }
  return false;
}

export async function downloadFile(data: Uint8Array | ArrayBuffer, filename: string, mime: string) {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;

  if (isCapacitor()) {
    if (await trySwDownload(bytes, filename, mime)) return;
  }

  const blob = new Blob([bytes], { type: mime });

  if (navigator.share) {
    try {
      await navigator.share({
        title: filename,
        files: [new File([blob], filename, { type: mime })],
      });
      return;
    } catch {
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
