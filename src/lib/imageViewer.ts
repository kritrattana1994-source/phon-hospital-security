/**
 * Utility functions for viewing and downloading evidence photos in all browsers
 * Safely handles Base64 Data URLs (which browsers block when navigated to via <a target="_blank">)
 * as well as standard HTTP/HTTPS links (Google Drive, Cloud Storage, etc.)
 */

export function openFullImage(url?: string | null, title?: string) {
  if (!url) return;

  // Handle Base64 Data URL safely by converting to Blob URL
  if (url.startsWith("data:image")) {
    try {
      const parts = url.split(",");
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);

      const newWin = window.open(blobUrl, "_blank");
      if (!newWin) {
        // If popup blocker intervened, fallback to downloading
        downloadImage(url, title);
      }
      return;
    } catch (e) {
      console.warn("Failed to convert data URL to Blob URL:", e);
      // Fallback: write to new window document
      try {
        const fallbackWin = window.open("", "_blank");
        if (fallbackWin) {
          fallbackWin.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${title || "รูปภาพหลักฐาน รพ.พล"}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  body { margin: 0; background: #0b0f19; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
                  img { max-width: 100%; max-height: 100vh; object-fit: contain; box-shadow: 0 10px 30px rgba(0,0,0,0.8); }
                </style>
              </head>
              <body>
                <img src="${url}" alt="ภาพขนาดเต็ม" />
              </body>
            </html>
          `);
          fallbackWin.document.close();
          return;
        }
      } catch (docErr) {
        console.warn("Document write fallback failed:", docErr);
      }
    }
  }

  // Standard Web URL (Google Drive, HTTPS, etc.)
  window.open(url, "_blank", "noopener,noreferrer");
}

export function downloadImage(url?: string | null, filename?: string) {
  if (!url) return;
  const safeFilename = `${(filename || "evidence_photo").replace(/[^a-zA-Z0-9ก-๙-_]/g, "_")}.jpg`;

  if (url.startsWith("data:image")) {
    const a = document.createElement("a");
    a.href = url;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  // Remote URL
  fetch(url)
    .then((res) => res.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = safeFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    })
    .catch(() => {
      window.open(url, "_blank");
    });
}
