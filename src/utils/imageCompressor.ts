/**
 * Tiện ích nén hình ảnh phía client bằng HTML5 Canvas.
 * Giúp giảm dung lượng ảnh base64 xuống mức thấp (< 100KB) trước khi lưu vào database,
 * tránh các lỗi nghẽn payload (413 Payload Too Large) trên các hosting serverless như Vercel.
 */

/**
 * Nén hình ảnh từ đối tượng tệp tin File.
 * Mặc định tối đa 800px và chất lượng 0.75 để đảm bảo độ sắc nét đọc QR và hóa đơn.
 */
export function compressImage(
  file: File,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Nếu tệp tin không phải hình ảnh, ném lỗi
    if (!file.type.startsWith("image/")) {
      reject(new Error("Tệp tải lên không phải là hình ảnh hợp lệ."));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Tính toán giữ nguyên tỷ lệ khung hình
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string); // Fallback về ảnh gốc nếu không có context canvas
          return;
        }

        // Vẽ ảnh lên canvas đã thu nhỏ kích thước
        ctx.drawImage(img, 0, 0, width, height);
        
        // Xuất ra định dạng image/jpeg để tận dụng tối đa chất lượng nén
        // Giúp nén ảnh chụp camera hoặc ảnh chụp màn hình PNG 3-5MB xuống còn ~80-120KB
        const outputType = "image/jpeg";
        const compressedBase64 = canvas.toDataURL(outputType, quality);
        
        console.log(`[COMPRESS] Đã nén ảnh thành công từ ${Math.round(file.size / 1024)}KB xuống còn ~${Math.round(compressedBase64.length * 0.75 / 1024)}KB (giảm khoảng ${Math.round((file.size - compressedBase64.length * 0.75) / file.size * 100)}%)`);
        resolve(compressedBase64);
      };
      img.onerror = (err) => {
        reject(err);
      };
    };
    reader.onerror = (err) => {
      reject(err);
    };
  });
}

/**
 * Nén hình ảnh từ một chuỗi base64 có sẵn.
 */
export function compressBase64Image(
  base64Str: string,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Nếu chuỗi rỗng hoặc không phải base64, trả về ngay
    if (!base64Str || !base64Str.startsWith("data:image")) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      // Lấy định dạng MIME từ chuỗi gốc
      const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,/);
      const mimeType = matches ? matches[1] : "image/jpeg";
      
      const compressedBase64 = canvas.toDataURL(mimeType, quality);
      console.log(`[COMPRESS] Đã nén thành công chuỗi base64 từ ${Math.round(base64Str.length / 1024)} ký tự xuống ${Math.round(compressedBase64.length / 1024)} ký tự.`);
      resolve(compressedBase64);
    };
    img.onerror = (err) => {
      reject(err);
    };
  });
}
