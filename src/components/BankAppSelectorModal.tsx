import { ui } from '../i18n/core';
import React, { useState } from "react";
import { Search, X, QrCode, AlertTriangle } from "lucide-react";
import { VIETNAM_BANKS, BankOption } from "../utils/banks";
import { isInAppBrowser } from "../utils/vietqr";

interface BankAppSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBank: (bank: BankOption) => void;
  showRememberOption?: boolean;
  setDefaultBank?: boolean;
  onToggleSetDefaultBank?: (val: boolean) => void;
}

export const BankAppSelectorModal: React.FC<BankAppSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectBank,
  showRememberOption = false,
  setDefaultBank = false,
  onToggleSetDefaultBank,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const handleImageError = (code: string) => {
    setImageErrorMap((prev) => ({ ...prev, [code]: true }));
  };

  const filteredBanks = VIETNAM_BANKS.filter((b) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      b.name.toLowerCase().includes(term) ||
      b.fullName.toLowerCase().includes(term) ||
      b.code.toLowerCase().includes(term) ||
      (b.shortCode && b.shortCode.toLowerCase().includes(term))
    );
  });

  const popularBanks = filteredBanks.filter((b) => b.isPopular);
  const otherBanks = filteredBanks.filter((b) => !b.isPopular);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-xs animate-fade-in">
      {/* Backdrop overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Bottom Sheet Container */}
      <div className="relative w-full max-w-md bg-white rounded-t-[32px] p-5 pb-7 shadow-2xl z-10 animate-in slide-in-from-bottom-6 duration-300 max-h-[88vh] flex flex-col">
        {/* Grabber bar */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 shrink-0" />

        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                {ui('mb6096433b0')}</h3>
              <p className="text-[0.6875rem] font-medium text-slate-500">
                {ui('m600fa21fad')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zalo / Facebook Messenger In-App Browser Warning */}
        {isInAppBrowser() && (
          <div className="mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5 shrink-0 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-extrabold text-[11px] leading-tight text-amber-900">
                {ui('mfe4629fab8')}</p>
              <p className="text-[10px] text-amber-800 leading-normal">
                {ui('m26a4061094')}<strong>{ui('m5f050fb887')}</strong> {ui('m1747b4872e')}<strong>{ui('m1920f8ad4a')}</strong> {ui('mc045f75ad9')}</p>
            </div>
          </div>
        )}

        {/* Search Input Box */}
        <div className="relative mb-4 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={ui('m6671928637')}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-emerald-500 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            autoFocus
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              {ui('maa1d94fc16')}</button>
          )}
        </div>

        {/* Scrollable Bank List Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 custom-scrollbar">
          {/* Section 1: Đề xuất (Popular) */}
          {popularBanks.length > 0 && (
            <div>
              <h4 className="text-xs font-black text-slate-800 mb-2.5 flex items-center gap-1.5 px-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                {ui('m769bfe0482')}</h4>
              <div className="grid grid-cols-3 gap-2.5">
                {popularBanks.map((bank) => (
                  <BankCardItem
                    key={bank.code}
                    bank={bank}
                    hasImageError={!!imageErrorMap[bank.code]}
                    onImageError={() => handleImageError(bank.code)}
                    onClick={() => onSelectBank(bank)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Ứng dụng khác (Other Apps) */}
          {otherBanks.length > 0 && (
            <div>
              <h4 className="text-xs font-black text-slate-800 mb-2.5 flex items-center gap-1.5 px-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                {ui('m1a6a4ea9c6')}</h4>
              <div className="grid grid-cols-3 gap-2.5">
                {otherBanks.map((bank) => (
                  <BankCardItem
                    key={bank.code}
                    bank={bank}
                    hasImageError={!!imageErrorMap[bank.code]}
                    onImageError={() => handleImageError(bank.code)}
                    onClick={() => onSelectBank(bank)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredBanks.length === 0 && (
            <div className="py-10 text-center space-y-2">
              <p className="text-xs font-bold text-slate-500">
                {ui('m28b185f2d5')}{searchTerm}"
              </p>
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-xs text-emerald-600 font-extrabold hover:underline cursor-pointer"
              >
                {ui('m1d1681fc25')}</button>
            </div>
          )}
        </div>

        {/* Remember Default Option */}
        {showRememberOption && onToggleSetDefaultBank && (
          <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-2 shrink-0 px-1">
            <input
              id="set-default-bank-check"
              type="checkbox"
              checked={setDefaultBank}
              onChange={(e) => onToggleSetDefaultBank(e.target.checked)}
              className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
            />
            <label
              htmlFor="set-default-bank-check"
              className="text-xs text-slate-600 font-bold select-none cursor-pointer"
            >
              {ui('m3379222b2e')}</label>
          </div>
        )}
      </div>
    </div>
  );
};

interface BankCardItemProps {
  bank: BankOption;
  hasImageError: boolean;
  onImageError: () => void;
  onClick: () => void;
}

const BankCardItem: React.FC<BankCardItemProps> = ({
  bank,
  hasImageError,
  onImageError,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-100 hover:border-emerald-400 hover:bg-emerald-50/20 active:scale-95 transition-all bg-white hover:shadow-sm cursor-pointer group h-24 w-full"
    >
      {/* Bank Logo Container */}
      <div className="w-10 h-10 flex items-center justify-center mb-1.5 shrink-0 relative">
        {!hasImageError ? (
          <img
            src={`https://api.vietqr.io/img/${bank.code.toLowerCase()}.png`}
            alt={bank.name}
            onError={onImageError}
            className="w-9 h-9 object-contain group-hover:scale-110 transition-transform duration-200"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black shadow-3xs ${
              bank.badgeColor || "bg-emerald-600 text-white"
            }`}
          >
            {bank.shortCode || bank.name.substring(0, 3).toUpperCase()}
          </div>
        )}
      </div>

      {/* Bank Short Display Name */}
      <span className="text-[11px] font-bold text-slate-800 text-center line-clamp-1 group-hover:text-emerald-700 transition-colors px-1">
        {bank.name}
      </span>
    </button>
  );
};
