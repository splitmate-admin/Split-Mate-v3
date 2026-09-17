import { getLocale } from '../i18n/core';
import { ui } from '../i18n/core';
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  HelpCircle, Search, Filter, MessageSquare, AlertTriangle, Lightbulb, 
  ChevronRight, ChevronDown, CheckCircle, Clock, Trash2, Reply, Send, 
  X, ArrowLeft, Star, Sparkles, User, Calendar, ShieldAlert 
} from "lucide-react";
import { Feedback } from "../types";
import FeedbackModal from "./FeedbackModal";

interface FaqPageProps {
  isAdmin: boolean;
  currentUser?: { name?: string; email?: string } | null;
  onBack: () => void;
}

// Pre-defined static common FAQs
const STATIC_FAQS = [
  {
    category: "general",
    get question() { return ui('mbc533aed39'); },
    get answer() { return ui('m6bc7bd0e8c'); }
  },
  {
    category: "tech",
    get question() { return ui('mdbeeeb7c4c'); },
    get answer() { return ui('m4615b39176'); }
  },
  {
    category: "privacy",
    get question() { return ui('me1a2ce0e55'); },
    get answer() { return ui('m8820803a62'); }
  },
  {
    category: "general",
    get question() { return ui('md2af5c971b'); },
    get answer() { return ui('m844a9fe3ed'); }
  },
  {
    category: "general",
    get question() { return ui('mb6de6cdd07'); },
    get answer() { return ui('m1a9b647d08'); }
  },
  {
    category: "tech",
    get question() { return ui('m59af0c98c3'); },
    get answer() { return ui('m3e00c87ebd'); }
  },
  {
    category: "general",
    get question() { return ui('m6c76d18591'); },
    get answer() { return ui('me2376e5f96'); }
  }
];

export default function FaqPage({ isAdmin, currentUser, onBack }: FaqPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "general" | "tech" | "privacy" | "community">("all");
  const [openStaticIndex, setOpenStaticIndex] = useState<number | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  
  // Community Feedbacks state
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);

  // Load feedbacks on mount
  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    setLoadingFeedbacks(true);
    try {
      const res = await fetch("/api/feedbacks");
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data);
      }
    } catch (err) {
      console.error("Lỗi tải feedbacks:", err);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  // Filters static & community FAQs
  const filteredStaticFaqs = STATIC_FAQS.filter((faq) => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
    return matchesSearch && matchesCategory && activeCategory !== "community";
  });

  const filteredFeedbacks = feedbacks.filter((fb) => {
    const matchesSearch = 
      (fb.name && fb.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      fb.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fb.reply && fb.reply.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = activeCategory === "all" || activeCategory === "community";
    return matchesSearch && matchesCategory;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-4xl mx-auto px-4 pt-14 pb-6 md:py-10 text-left font-sans"
    >
      {/* Header and Branding */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-emerald-650 hover:text-emerald-800 font-extrabold text-sm transition-all focus:outline-none cursor-pointer self-start sm:self-center"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{ui('me7a64a0c4e')}</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-550 via-purple-600 to-pink-500 shadow-md flex items-center justify-center text-white shrink-0 shadow-emerald-600/25">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div className="text-left">
            <h1 className="font-extrabold text-xl font-sans tracking-tight text-slate-800 leading-tight">
              {ui('m7523bd8627')}</h1>
            <p className="text-xs text-slate-400 mt-1">{ui('m0c39b3e378')}</p>
          </div>
        </div>
      </div>



      {/* Hero Banner Grid layout */}
      <div className="bg-gradient-to-r from-slate-900 to-emerald-950 p-6 md:p-8 rounded-3xl text-white mb-8 relative overflow-hidden shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-emerald-900/40 via-transparent to-transparent -z-10" />
        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="max-w-2xl relative space-y-3.5">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-400/30 rounded-full py-1 px-3 text-[0.625rem] font-black text-emerald-300">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{ui('mda622e6bc8')}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white leading-snug">
            {ui('m7bee811de9')}</h2>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            {ui('m2ec42b1d36')}<strong>{ui('m83b54f6596')}</strong> {ui('m6ccfbf3d4c')}</p>
          <div className="pt-2">
            <button 
              onClick={() => setIsFeedbackOpen(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-tr from-emerald-600 via-purple-600 to-pink-500 hover:opacity-90 text-white font-bold text-sm py-2.5 px-6 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all active:scale-95 cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
              <Sparkles className="w-4 h-4" />
              <span>{ui('m83b54f6596')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Search & Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        {/* Search bar input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={ui('m64b69935c8')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 text-slate-800 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-start sm:justify-end">
          <button
            onClick={() => setActiveCategory("all")}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategory === "all"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-650/15"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50"
            }`}
          >
            {ui('mf7a578dcbd')}</button>
          <button
            onClick={() => setActiveCategory("general")}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategory === "general"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-650/15"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50"
            }`}
          >
            {ui('m176abe3c5c')}</button>
          <button
            onClick={() => setActiveCategory("tech")}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategory === "tech"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50"
            }`}
          >
            {ui('m27fb150fc6')}</button>
          <button
            onClick={() => setActiveCategory("privacy")}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategory === "privacy"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50"
            }`}
          >
            {ui('m89d8b70915')}</button>
          <button
            onClick={() => setActiveCategory("community")}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCategory === "community"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{ui('m6a70876453')}{feedbacks.length})</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Static Standard FAQs (if not filtered only to community) */}
        {activeCategory !== "community" && (
          <div className="md:col-span-6 space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 mb-1.5 pl-1">
              <HelpCircle className="w-4.5 h-4.5 text-emerald-500" />
              <span>{ui('m91bb5bcf9b')}</span>
            </h3>

            {filteredStaticFaqs.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 p-8 rounded-2xl text-center text-slate-400 text-xs">
                {ui('m5f214fdcfb')}</div>
            ) : (
              <div className="space-y-3">
                {filteredStaticFaqs.map((faq, idx) => {
                  const isOpen = openStaticIndex === idx;
                  return (
                    <div 
                      key={idx}
                      className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-all"
                    >
                      <button
                        onClick={() => setOpenStaticIndex(isOpen ? null : idx)}
                        className="w-full text-left p-4 flex items-center justify-between gap-3 focus:outline-none group cursor-pointer"
                      >
                        <span className="text-xs font-extrabold text-slate-800 group-hover:text-emerald-600 transition-colors">
                          {faq.question}
                        </span>
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
                        )}
                      </button>
                      
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="overflow-hidden border-t border-slate-100"
                          >
                            <p className="p-4 bg-slate-50/70 text-slate-600 text-xs leading-relaxed font-medium">
                              {faq.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* RIGHT COLUMN / CORE LIST: Live Community feedbacks box */}
        <div className={activeCategory === "community" ? "md:col-span-12" : "md:col-span-6 space-y-4"}>
          <div className="flex items-center justify-between pl-1 mb-1.5">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <MessageSquare className="w-4.5 h-4.5 text-emerald-500" />
              <span>{ui('mc4a519a12c')}</span>
            </h3>
          </div>

          {loadingFeedbacks ? (
            <div className="py-12 bg-white rounded-3xl border border-slate-100 shadow-xs flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-bold">{ui('mbc5368eb65')}</p>
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="bg-white border border-slate-100 p-12 rounded-3xl text-center space-y-3 shadow-xs">
              <p className="text-xs text-slate-400">{ui('m470b7580fe')}</p>
              <p className="text-[0.625rem] text-slate-400">{ui('m5a8824be94')}</p>
            </div>
          ) : (
            <div className="space-y-4.5">
              {filteredFeedbacks.map((fb) => (
                <div 
                  key={fb.id}
                  className={`bg-white border border-slate-150 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xs hover:border-slate-350 transition-colors ${
                    (fb.status === "replied" || fb.reply) ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-rose-450"
                  }`}
                >
                  {/* Card Badge Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      {/* Logo Type badge */}
                      {fb.type === "feedback" ? (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 py-0.5 px-2 rounded-lg text-[0.625rem] font-extrabold border border-emerald-100">
                          <MessageSquare className="w-3 h-3 text-emerald-500" />
                          <span>{ui('m321214768b')}</span>
                        </span>
                      ) : fb.type === "suggestion" ? (
                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 py-0.5 px-2 rounded-lg text-[0.625rem] font-extrabold border border-amber-100">
                          <Lightbulb className="w-3 h-3 text-amber-500" />
                          <span>{ui('mb6ecf2f764')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 py-0.5 px-2 rounded-lg text-[0.625rem] font-extrabold border border-rose-100">
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                          <span>{ui('m0048ce06bf')}</span>
                        </span>
                      )}

                      {/* Stars count if any */}
                      {fb.rating && (
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {Array.from({ length: fb.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Date and status */}
                    <div className="flex items-center gap-2">
                      <span className="text-[0.625rem] text-slate-400 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(fb.createdAt).toLocaleDateString(getLocale(), {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>

                      {(fb.status === "replied" || fb.reply) ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-[0.5625rem] py-0.5 px-1.5 font-bold">
                          {ui('m639b9f59ee')}</span>
                      ) : (
                        <span className="bg-amber-50 text-amber-700 border border-amber-100 rounded-md text-[0.5625rem] py-0.5 px-1.5 font-bold animate-pulse">
                          {ui('m4652be094d')}</span>
                      )}
                    </div>
                  </div>

                  {/* Feedback Sender & Body */}
                  <div className="space-y-2 mb-3">
                    <p className="text-xs font-black flex items-center gap-1 text-slate-800">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{fb.name || ui('m7f0ab3a994')}</span>
                      {fb.email && isAdmin && (
                        <span className="text-[0.625rem] text-slate-400 font-normal ml-1">({fb.email})</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100/40">
                      {fb.content}
                    </p>
                  </div>

                  {/* Admin Reply Section */}
                  {fb.reply ? (
                    <div className="bg-emerald-50/40 border border-emerald-100/60 p-3.5 rounded-xl space-y-1 text-left mt-2.5">
                      <p className="text-[0.6875rem] font-extrabold text-emerald-700 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 fill-emerald-100" />
                        <span>{ui('me613712cbb')}</span>
                      </p>
                      <p className="text-xs text-slate-700 font-semibold leading-relaxed pl-1">
                        {fb.reply}
                      </p>
                      {fb.repliedAt && (
                        <span className="text-[0.5625rem] text-slate-400 pl-1 block italic mt-1 font-medium">
                          {ui('m6048c81d51')}{new Date(fb.repliedAt).toLocaleDateString(getLocale(), {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  ) : null}


                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <FeedbackModal 
        currentUser={currentUser}
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        onSuccess={() => {
          setActiveCategory("community");
          fetchFeedbacks();
        }}
      />
    </motion.div>
  );
}
