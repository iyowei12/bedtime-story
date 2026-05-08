export const compressImage = (file: File, maxSize: number = 1200): Promise<string> => {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = ev => {
      const im = new Image();
      im.onload = () => {
        const ratio = Math.min(maxSize / im.width, maxSize / im.height, 1);
        const c = document.createElement('canvas');
        c.width = Math.round(im.width * ratio);
        c.height = Math.round(im.height * ratio);
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(im, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.85));
        } else {
          reject(new Error('Canvas ctx is null'));
        }
      };
      im.onerror = reject;
      im.src = ev.target?.result as string;
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
};
