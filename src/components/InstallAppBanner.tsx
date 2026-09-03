import React, { useState } from 'react';
import { Download, X, Share, PlusSquare, CheckCircle2 } from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { motion, AnimatePresence } from 'motion/react';

export function InstallAppBanner() {
  const { isInstallable, isIos, promptInstall, hasDeferredPrompt } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  if (!isInstallable || dismissed) return null;

  const handleClickInstall = () => {
    if (hasDeferredPrompt) {
      promptInstall();
    } else {
      // Show iOS Safari Step-by-Step Guide
      setShowIosGuide(true);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!showIosGuide && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="InstallAppBanner fixed bottom-16 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 pointer-events-auto"
          >
            <div className="bg-emerald-600 rounded-2xl shadow-2xl p-4 text-white border border-emerald-500/50 flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl shrink-0">
                <Download className="w-6 h-6 animate-bounce" />
              </div>
              <div className="flex-1">
                <h4 className="font-extrabold text-sm mb-0.5 tracking-wide uppercase">Thêm vào Màn hình chính</h4>
                <p className="text-[11px] text-emerald-50 font-medium leading-relaxed">
                  Trải nghiệm mượt như App gốc. Nếu không có thông báo tự động, mở menu trình duyệt (⋮ hoặc ⎋) chọn <strong>"Thêm vào MH chính"</strong>.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleClickInstall}
                  className="bg-white text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-all whitespace-nowrap cursor-pointer"
                >
                  Thêm Ngay
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors active:scale-95 cursor-pointer"
                >
                  <X className="w-4 h-4 text-emerald-100" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Safari Guide Modal */}
      <AnimatePresence>
        {showIosGuide && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-slate-800 relative overflow-hidden"
            >
              <button
                onClick={() => setShowIosGuide(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Thêm vào MH Chính (Thủ công)</h3>
                  <p className="text-xs text-slate-500 font-medium">Hướng dẫn nhanh cho trình duyệt của bạn</p>
                </div>
              </div>

              <div className="space-y-3 my-4 text-xs">
                {isIos ? (
                  <>
                    <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                        1
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">
                          Bấm nút <span className="text-emerald-600 inline-flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Chia sẻ <Share className="w-3.5 h-3.5 inline" /></span> ở thanh công cụ Safari.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                        2
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">
                          Chọn <span className="text-emerald-600 inline-flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">"Thêm vào MH chính" <PlusSquare className="w-3.5 h-3.5 inline" /></span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                        3
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">
                          Nhấn <span className="text-emerald-600 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">"Thêm"</span> ở góc trên bên phải.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                        1
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">
                          Nhấn vào biểu tượng menu <span className="text-emerald-600 font-black bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">⋮ (3 chấm)</span> ở góc trên trình duyệt.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                        2
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">
                          Chọn mục <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">"Thêm vào Màn hình chính"</span> hoặc <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">"Cài đặt ứng dụng"</span>.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setShowIosGuide(false)}
                className="w-full py-3 bg-emerald-600 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> Đã hiểu, Thêm Ngay
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

