import { ui } from '../i18n/core';
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, X, UserCheck } from "lucide-react";

interface OfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestName: string;
  setGuestName: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const OfflineModal: React.FC<OfflineModalProps> = ({
  isOpen,
  onClose,
  guestName,
  setGuestName,
  onSubmit,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">{ui('mb51d5c1bf3')}</h3>
                  <p className="text-xs text-slate-500 font-medium">{ui('m1f565ece87')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {ui('m0584ac8bde')}</label>
                <input
                  type="text"
                  autoFocus
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={ui('mc68f609a64')}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm font-semibold outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="bg-amber-50/70 border border-amber-200/60 p-3 rounded-2xl text-xs text-amber-900 leading-relaxed font-medium">
                💡 <span className="font-bold">{ui('mc3b6f0d6b1')}</span> {ui('mb5a47543b1')}</div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {ui('m34ca764caf')}</button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{ui('mf7c086d770')}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
