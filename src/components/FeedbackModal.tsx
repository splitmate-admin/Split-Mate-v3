import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Send, Star, Sparkles, Info } from "lucide-react";

interface FeedbackModalProps {
  currentUser?: { name?: string; email?: string } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function FeedbackModal({ currentUser, isOpen, onClose, onSuccess }: FeedbackModalProps) {
  const [type] = useState<"feedback" | "suggestion" | "bug">("feedback");
  const [name, setName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMessage("Vui lòng nhập nội dung góp ý.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name ? name.trim() : (currentUser?.name || "Ẩn danh"),
          email: email ? email.trim() : (currentUser?.email || ""),
          type,
          content: content.trim(),
          rating,
        }),
      });

      if (!response.ok) {
        throw new Error("Không thể gửi phản hồi lúc này.");
      }

      setSubmitSuccess(true);
      setContent("");
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSubmitSuccess(false);
        onClose();
      }, 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Đã xảy ra lỗi khi kết nối với máy chủ.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            id="feedback-widget-card"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-[26rem] bg-white rounded-[24px] border border-slate-100 shadow-2xl overflow-hidden"
          >
            {/* Header with Gemini gradients */}
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-pink-500 flex items-center justify-center shadow-md">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-1.5 leading-none">
                    Góp Ý & Báo Lỗi
                  </h3>
                  <span className="text-[0.625rem] text-slate-400 font-medium">Bản quyền SplitMate</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Container */}
            <div className="p-5 max-h-[75vh] overflow-y-auto">
              {submitSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 text-center flex flex-col items-center justify-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 animate-bounce">
                    <Sparkles className="w-8 h-8 text-emerald-500 animate-pulse fill-emerald-200" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">Gửi Phản Hồi Thành Công!</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                      Cảm ơn sự đóng góp quý giá của bạn. Ý kiến của bạn đã được ghi lại trực tiếp trên hệ thống FAQ để Admin phản hồi sớm nhất !
                    </p>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                  {/* Content message */}
                  <div className="space-y-1">
                    <label className="text-[0.625rem] font-bold text-slate-500 flex justify-between" htmlFor="fb-content">
                      <span>Nội dung phản hồi <span className="text-rose-500">*</span></span>
                      <span className="text-[0.5625rem] text-slate-400">Tối đa 1000 ký tự</span>
                    </label>
                    <textarea
                      id="fb-content"
                      required
                      rows={4}
                      maxLength={1000}
                      placeholder="Hãy viết những cảm nghĩ, lỗi gặp phải hoặc góp ý của bạn để giúp chúng mình cải tiến sản phẩm..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 transition-all text-slate-800 resize-none leading-relaxed"
                    />
                  </div>

                  {errorMessage && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-600 text-[0.6875rem] p-2.5 rounded-xl flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0 ml-auto"
                    >
                      {submitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Đang gửi...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          <span>Gửi đóng góp</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer indicator */}
            <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 text-center">
              <p className="text-[0.625rem] text-slate-500 leading-normal">
                Phản hồi của bạn sẽ hiển thị công khai trên <strong>Trang FAQ</strong> để cùng trao đổi & giải đáp thắc mắc.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
