import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertCircle, RefreshCw, QrCode, Sparkles } from 'lucide-react';
import jsQR from 'jsqr';
import { parseVietQR, VietQRData } from '../utils/vietqr';

export const LiveCamera = ({ 
  onCapture, 
  onQrScan,
}: { 
  onCapture: (file: File) => void;
  onQrScan?: (data: VietQRData) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');
  
  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Trình duyệt của bạn không hỗ trợ camera.');
      return;
    }
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError('');
    } catch (err) {
      console.error('Error accessing camera:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Quyền truy cập máy ảnh bị từ chối.');
      } else {
        setError('Không thể mở camera. Vui lòng cấp quyền truy cập máy ảnh hoặc tải lên hình ảnh thay thế.');
      }
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Run once on mount

  // Cleanup stream when unmounting or changing stream
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [stream]);

  // Real-time QR scanner using jsQR (runs continuously)
  useEffect(() => {
    if (!stream || !videoRef.current) return;
    
    let active = true;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const checkFrame = () => {
      if (!active) return;
      
      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          
          if (code && code.data) {
            const parsed = parseVietQR(code.data);
            if (parsed && onQrScan) {
              onQrScan(parsed);
              active = false;
              return;
            }
          }
        }
      }
      
      if (active) {
        requestAnimationFrame(checkFrame);
      }
    };
    
    const handleId = requestAnimationFrame(checkFrame);
    return () => {
      active = false;
      cancelAnimationFrame(handleId);
    };
  }, [stream, onQrScan]);

  const takePhoto = () => {
    if (!videoRef.current || !stream) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      
      // Tự động kiểm tra xem ảnh vừa chụp có chứa mã QR hay không
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        
        if (code && code.data) {
          const parsed = parseVietQR(code.data);
          if (parsed && onQrScan) {
            onQrScan(parsed);
            return; // Nếu là mã VietQR hợp lệ, xử lý điền form trực tiếp và bỏ qua quét hóa đơn AI
          }
        }
      } catch (e) {
        console.error("Lỗi khi quét QR từ ảnh chụp:", e);
      }

      // Nếu không phát hiện mã QR, tiếp tục luồng quét hóa đơn AI thông thường
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "receipt_scan.jpg", { type: "image/jpeg" });
          onCapture(file);
        }
      }, 'image/jpeg', 0.9);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-emerald-950 rounded-[2.5rem] overflow-hidden">
      {/* Smart Camera Badge Header */}
      {!error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg text-white">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-[11px] font-black tracking-wide text-slate-100">Camera Quét AI & VietQR</span>
        </div>
      )}

      {error ? (
        <div className="text-white text-center p-5 text-xs font-medium space-y-4 z-10 max-w-[90%]">
          <div className="mx-auto w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-300">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="font-extrabold text-slate-100">Không thể mở máy ảnh</p>
          </div>
          <div className="flex flex-col gap-2 pt-1 w-full max-w-[160px] mx-auto">
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); startCamera(); }} 
              className="flex items-center justify-center gap-1.5 text-white font-black text-xs bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              Thử lại camera
            </button>
          </div>
        </div>
      ) : (
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Real-time Viewfinder overlay for QR & Receipt */}
      {!error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="relative w-60 h-60 border-2 border-emerald-400/70 rounded-3xl bg-transparent flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.25)]">
            {/* Corner highlights */}
            <div className="absolute -top-[3px] -left-[3px] w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl" />
            <div className="absolute -top-[3px] -right-[3px] w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl" />
            <div className="absolute -bottom-[3px] -left-[3px] w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl" />
            <div className="absolute -bottom-[3px] -right-[3px] w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl" />
            
            {/* Scanning line animation */}
            <div 
              className="absolute top-2 inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] rounded-full z-10" 
              style={{
                animation: "scanMotion 2.2s infinite ease-in-out"
              }} 
            />
            
            <div className="text-[10px] text-emerald-300 font-bold bg-slate-950/80 px-3 py-1 rounded-full border border-emerald-500/30 shadow-xs absolute -bottom-10 backdrop-blur-md flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Đưa mã VietQR hoặc Hóa đơn vào khung hình</span>
            </div>
          </div>
        </div>
      )}
      
      {!error && (
        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center pb-2 z-20">
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); takePhoto(); }}
            className="w-16 h-16 rounded-full bg-white/20 border-[3px] border-white flex items-center justify-center backdrop-blur-md active:scale-95 transition-all shadow-xl cursor-pointer hover:bg-white/30"
            title="Chụp ảnh / Quét AI"
          >
            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-inner">
              <Camera className="w-6 h-6 text-emerald-600" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

