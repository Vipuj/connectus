export function formatIstDate(isoUtc: string): string {
  const date = new Date(isoUtc);
  if (isNaN(date.getTime())) return isoUtc;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export function formatIstTime(isoUtc: string): string {
  const date = new Date(isoUtc);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatIstFull(isoUtc: string): string {
  const date = new Date(isoUtc);
  if (isNaN(date.getTime())) return isoUtc;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatFee(feeInr: number): string {
  if (!feeInr || feeInr <= 0) return 'Free entry';
  return `₹${feeInr}`;
}

export function utcIsoToIstInput(isoUtc: string): string {
  const date = new Date(isoUtc);
  if (isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/**
 * Resizes image client-side to max 1600px and re-encodes via canvas to strip EXIF metadata.
 * Implements Blueprint Loophole #20.
 */
export async function resizeAndStripPoster(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Only JPG, PNG, and WEBP poster images are supported.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Poster file must be 5 MB or smaller.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid or corrupted image file.'));
      img.onload = () => {
        const MAX_DATA_URL_CHARS = 320000;
        const attempts: Array<{ maxDim: number; quality: number }> = [
          { maxDim: 1280, quality: 0.85 },
          { maxDim: 1080, quality: 0.78 },
          { maxDim: 920, quality: 0.72 },
          { maxDim: 760, quality: 0.65 },
          { maxDim: 640, quality: 0.58 },
        ];

        for (const { maxDim, quality } of attempts) {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas compression unavailable.'));
            return;
          }
          // Fill warm-paper white background in case source PNG/WEBP has alpha
          ctx.fillStyle = '#fef9ef';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          if (dataUrl.length <= MAX_DATA_URL_CHARS) {
            resolve(dataUrl);
            return;
          }
        }

        // Guaranteed final fallback within limit
        const fallbackCanvas = document.createElement('canvas');
        const ratio = Math.min(520 / img.width, 520 / img.height, 1);
        fallbackCanvas.width = Math.max(1, Math.round(img.width * ratio));
        fallbackCanvas.height = Math.max(1, Math.round(img.height * ratio));
        const fctx = fallbackCanvas.getContext('2d');
        if (!fctx) {
          reject(new Error('Canvas compression unavailable.'));
          return;
        }
        fctx.fillStyle = '#fef9ef';
        fctx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
        fctx.drawImage(img, 0, 0, fallbackCanvas.width, fallbackCanvas.height);
        resolve(fallbackCanvas.toDataURL('image/jpeg', 0.55));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Center-crops and resizes custom profile picture to 256x256 JPEG (~12-20KB) for fast Firestore & UI storage.
 */
export async function resizeAvatarImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Only JPG, PNG, and WEBP profile photos are supported.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Profile photo must be 5 MB or smaller.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read profile photo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid or corrupted image file.'));
      img.onload = () => {
        const MAX_CHARS = 70000;
        const attempts = [
          { size: 256, quality: 0.82 },
          { size: 224, quality: 0.72 },
          { size: 192, quality: 0.65 },
        ];
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;

        for (const { size, quality } of attempts) {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas compression unavailable.'));
            return;
          }
          ctx.fillStyle = '#fef9ef';
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          const url = canvas.toDataURL('image/jpeg', quality);
          if (url.length <= MAX_CHARS) {
            resolve(url);
            return;
          }
        }
        const fallback = document.createElement('canvas');
        fallback.width = 160;
        fallback.height = 160;
        const fctx = fallback.getContext('2d');
        if (!fctx) {
          reject(new Error('Canvas compression unavailable.'));
          return;
        }
        fctx.fillStyle = '#fef9ef';
        fctx.fillRect(0, 0, 160, 160);
        fctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, 160, 160);
        resolve(fallback.toDataURL('image/jpeg', 0.55));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
