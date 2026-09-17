import { ui } from '../i18n/core';
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Plus, 
  Users, 
  Receipt, 
  ArrowRight, 
  CheckCircle2, 
  Rocket,
  X
} from "lucide-react";

import imgWelcome from "../assets/images/onboarding_welcome_1781579580779.jpg";
import imgCreateGroup from "../assets/images/onboarding_create_group_1781579597389.jpg";
import imgFriends from "../assets/images/onboarding_friends_1781579615289.jpg";
import imgCalculator from "../assets/images/onboarding_calculator_1781579631064.jpg";
import imgSettleDelete from "../assets/images/onboarding_settle_delete_1781579814695.jpg";

interface OnboardingTutorialProps {
  onClose: () => void;
  onStart: () => void;
  userName?: string;
}

export default function OnboardingTutorial({ onClose, onStart, userName }: OnboardingTutorialProps) {
  const [step, setStep] = useState(1);

  const steps = [
    {
      id: 1,
      get title() { return ui('m0f5119a1a4'); },
      description: ui('mcdbce1a1a1', { v0: userName || ui('me8f0432213') }),
      icon: <Rocket className="w-8 h-8 text-emerald-600" />,
      get button() { return ui('m5424f31b98'); },
      image: imgWelcome
    },
    {
      id: 2,
      get title() { return ui('mfe3fbaa63f'); },
      get description() { return ui('me23f113d91'); },
      icon: <Plus className="w-8 h-8 text-pink-600" />,
      get button() { return ui('mf202ea2312'); },
      image: imgCreateGroup
    },
    {
      id: 3,
      get title() { return ui('m93a9767468'); },
      get description() { return ui('me01fc63165'); },
      icon: <Users className="w-8 h-8 text-emerald-600" />,
      get button() { return ui('mf202ea2312'); },
      image: imgFriends
    },
    {
      id: 4,
      get title() { return ui('m72800b74a4'); },
      get description() { return ui('mb39745b104'); },
      icon: <Receipt className="w-8 h-8 text-orange-600" />,
      get button() { return ui('mf202ea2312'); },
      image: imgCalculator
    },
    {
      id: 5,
      get title() { return ui('m3b71e1d97b'); },
      get description() { return ui('mda09b14052'); },
      icon: <CheckCircle2 className="w-8 h-8 text-cyan-600" />,
      get button() { return ui('mfde19f005d'); },
      image: imgSettleDelete
    }
  ];

  const currentStep = steps.find(s => s.id === step) || steps[0];

  const handleNext = () => {
    if (step < steps.length) {
      setStep(step + 1);
    } else {
      onStart();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-[32px] shadow-2xl max-w-lg w-full overflow-hidden relative border border-slate-100"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="h-48 overflow-hidden relative">
          <img 
            src={currentStep.image} 
            alt="Tutorial" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover grayscale-[20%] brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
        </div>

        <div className="p-8 pt-0 text-center space-y-6">
          <div className="flex justify-center -mt-8 relative z-20">
            <div className="p-4 bg-white rounded-3xl shadow-xl border border-slate-50 ring-8 ring-white">
              {currentStep.icon}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
              {currentStep.title}
            </h2>
            <p className="text-slate-500 text-base leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          <div className="flex items-center justify-center gap-1.5 py-2">
            {steps.map(s => (
              <div 
                key={s.id}
                className={`h-1.5 transition-all duration-300 rounded-full ${s.id === step ? "w-8 bg-emerald-600" : "w-1.5 bg-slate-200"}`}
              />
            ))}
          </div>

          <div className="pt-2">
            <button 
              onClick={handleNext}
              className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-black py-4 px-6 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2 group"
            >
              <span>{currentStep.button}</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
            <p className="mt-4 text-[0.6875rem] font-bold text-slate-400 uppercase tracking-widest">
              {ui('m83e79e0e82')}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
