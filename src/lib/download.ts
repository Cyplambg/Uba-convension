export function downloadFile(data: Uint8Array | ArrayBuffer, filename: string, mime: string) {
  const blob = new Blob([data], { type: mime });
  const canShare = typeof navigator !== "undefined" && navigator.canShare?.({
    files: [new File([blob], filename, { type: mime })],
  });

  if (canShare) {
    navigator.share({ files: [new File([blob], filename, { type: mime })] }).catch(() => {});
    return;
  }

  const isWebView = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;
  if (isWebView) {
    const reader = new FileReader();
    reader.onload = () => {
      const w = window.open(reader.result as string, "_blank");
      if (!w) {
        const a = document.createElement("a");
        a.href = reader.result as string;
        a.download = filename;
        a.click();
      }
    };
    reader.readAsDataURL(blob);
    return;
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
