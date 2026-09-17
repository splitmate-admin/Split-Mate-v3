import { ui } from '../i18n/core';
import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import { VIETNAM_BANKS, BankOption } from "../utils/banks";

interface SearchableBankSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export const SearchableBankSelect: React.FC<SearchableBankSelectProps> = ({
  value,
  onChange,
  className = "",
  placeholder = ui('m01c2a95f12')
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter banks based on search term
  const filteredBanks = VIETNAM_BANKS.filter((bank) => {
    const nameLower = bank.name.toLowerCase();
    const codeLower = bank.code.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return nameLower.includes(searchLower) || codeLower.includes(searchLower);
  });

  const selectedBank = VIETNAM_BANKS.find((b) => b.code === value) || VIETNAM_BANKS.find((b) => b.code === "VCB");

  const handleSelect = (bankCode: string) => {
    onChange(bankCode);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Selector Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer flex items-center justify-between"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedBank && (
            <div className="w-8 h-5 bg-white border border-slate-100 rounded-md flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={`https://api.vietqr.io/img/${selectedBank.code.toLowerCase()}.png`}
                alt={selectedBank.code}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          <span className="truncate">{selectedBank ? selectedBank.name : ui('m70f73ee14e')}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-fade-in">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-1.5 bg-slate-50/50">
            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none outline-none py-1 text-xs text-slate-700 placeholder-slate-400 font-medium"
              autoFocus
            />
          </div>

          {/* Banks List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
            {filteredBanks.length > 0 ? (
              filteredBanks.map((bank) => {
                const isSelected = bank.code === value;
                return (
                  <button
                    key={bank.code}
                    type="button"
                    onClick={() => handleSelect(bank.code)}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between transition-colors hover:bg-slate-50 cursor-pointer ${
                      isSelected ? "text-emerald-600 bg-emerald-50/30" : "text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-8 h-5 bg-slate-50 border border-slate-100/60 rounded-md flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src={`https://api.vietqr.io/img/${bank.code.toLowerCase()}.png`}
                          alt={bank.code}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <span className="truncate pr-4">{bank.name}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                {ui('mb457a7b2d9')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
