
/**
 * Nén và giảm kích thước ảnh base64
 * @param base64 Strring ảnh base64 đầu vào
 * @param maxWidth Chiều rộng tối đa (mặc định 1024px)
 * @param quality Chất lượng nén từ 0.1 đến 1.0 (mặc định 0.7)
 */
export async function compressImage(base64: string, maxWidth = 1024, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Tính toán tỷ lệ để giảm kích thước nếu vượt quá maxWidth
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Vẽ ảnh lên canvas với kích thước mới
      ctx.drawImage(img, 0, 0, width, height);

      // Xuất ra base64 với chất lượng nén
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    img.onerror = (err) => reject(err);
  });
}
