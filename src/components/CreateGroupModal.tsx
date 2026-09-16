import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users, X, Plus, Coins } from "lucide-react";
import { Currency, SUPPORTED_CURRENCIES } from "../utils/i18n";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  newGroupName: string;
  setNewGroupName: (name: string) => void;
  newGroupCurrency?: Currency;
  setNewGroupCurrency?: (c: Currency) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  newGroupName,
  setNewGroupName,
  newGroupCurrency = "VND",
  setNewGroupCurrency,
  onSubmit,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
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
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Tạo nhóm chi tiêu mới</h3>
                  <p className="text-xs text-slate-500">Quản lý và chia tiền dễ dàng cùng bạn bè</p>
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
                  Tên nhóm chi tiêu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ví dụ: Du lịch Phú Quốc, Singapore Trip, ..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold outline-none transition-all placeholder:text-slate-400"
                  required
                />
              </div>

              {setNewGroupCurrency && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    Đơn vị tiền tệ nhóm
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.keys(SUPPORTED_CURRENCIES) as Currency[]).map((cur) => {
                      const info = SUPPORTED_CURRENCIES[cur];
                      const isSelected = newGroupCurrency === cur;
                      return (
                        <button
                          key={cur}
                          type="button"
                          onClick={() => setNewGroupCurrency(cur)}
                          className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                            isSelected
                              ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-extrabold shadow-xs"
                              : "bg-slate-50 border-slate-200 text-slate-600 font-semibold hover:bg-slate-100"
                          }`}
                        >
                          <span className="text-xs">{info.flag}</span>
                          <span className="text-[11px] leading-tight font-black">{info.code}</span>
                          <span className="text-[9px] text-slate-400 font-medium">({info.symbol})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim()}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-lg shadow-emerald-200 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo nhóm ngay</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

