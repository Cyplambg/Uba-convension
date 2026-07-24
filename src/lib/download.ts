function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

export async function downloadFile(data: Uint8Array | ArrayBuffer, filename: string, mime: string) {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  const blob = new Blob([bytes], { type: mime });

  // Capacitor → service worker proxy
  const cap = (window as any).Capacitor?.isNativePlatform;
  if (cap) {
    try {
      const sw = navigator.serviceWorker.controller;
      if (sw) {
        const channel = new MessageChannel();
        await new Promise<void>((resolve, reject) => {
          channel.port1.onmessage = (e) => {
            if (e.data?.type === "DOWNLOAD_READY") {
              window.open(`/__download/${e.data.token}/${encodeURIComponent(filename)}`, "_blank");
              resolve();
            }
          };
          sw.postMessage(
            { type: "CACHE_DOWNLOAD", data: toBase64(bytes), filename, mime },
            [channel.port2] as any,
          );
          setTimeout(() => reject(new Error("timeout")), 10000);
        });
        return;
      }
    } catch {}
  }

  // Navigateur → blob download direct
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
