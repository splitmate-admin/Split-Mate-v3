import { ui } from '../i18n/core';
import React from "react";
import { X, Zap, Landmark, Camera, QrCode, Link, MousePointer2, Users, User, Sparkles, Share2, FileText, Cloud, CheckCircle2, ShieldCheck, Download } from "lucide-react";

interface InstructionViewProps {
  onClose: () => void;
  mode?: 'login' | 'one-time';
}

const appSteps = [
  {
    get title() { return ui('m1a2606f78e'); },
    get description() { return ui('maac816a590'); },
    icon: Zap,
    get illustration() { return (
      <div className="relative w-full h-full bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-md w-3/4 mb-4 relative z-10 border border-slate-200 self-start ml-2">
          <div className="w-16 h-2 bg-slate-200 rounded-full mb-2"></div>
          <div className="bg-blue-50 text-blue-600 text-[11px] p-2 rounded-lg border border-blue-100 flex items-center gap-1.5 font-semibold truncate">
             <Link className="w-3 h-3 flex-shrink-0"/> <span className="truncate">splitmate.space/join...</span>
          </div>
          <div className="absolute -bottom-4 -right-2 text-slate-800 animate-bounce">
             <MousePointer2 className="w-6 h-6 fill-white" />
          </div>
        </div>
        
        <div className="bg-emerald-50 rounded-xl p-3 shadow-lg w-3/4 border border-emerald-100 flex flex-col items-center gap-2 self-end mr-2">
           <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
             <Users className="w-5 h-5" />
           </div>
           <div className="font-bold text-slate-800 text-sm">{ui('m8f22fbb2e4')}</div>
           <div className="bg-emerald-500 text-white text-[10px] px-3 py-1 rounded-full font-bold">{ui('m5be886c9e6')}</div>
        </div>
      </div>
    ); }
  },
  {
    get title() { return ui('mf598b91b25'); },
    get description() { return ui('mf06f9b08ff'); },
    icon: Landmark,
    get illustration() { return (
      <div className="relative w-full h-full bg-emerald-50 flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute top-4 left-6 bg-white p-2 rounded-full shadow-sm border border-slate-200 z-10"><User className="w-5 h-5 text-slate-400" /></div>
        <div className="absolute bottom-4 left-10 bg-white p-2 rounded-full shadow-sm border border-slate-200 z-10"><User className="w-5 h-5 text-slate-400" /></div>
        <div className="absolute top-8 right-6 bg-white p-2 rounded-full shadow-sm border border-slate-200 z-10"><User className="w-5 h-5 text-slate-400" /></div>
        
        <div className="absolute w-0.5 h-12 bg-emerald-300 border-dashed transform -rotate-45 top-10 left-16"></div>
        <div className="absolute w-0.5 h-12 bg-emerald-300 border-dashed transform rotate-[60deg] bottom-14 left-20"></div>
        <div className="absolute w-12 h-0.5 bg-emerald-300 border-dashed transform rotate-12 top-14 right-16"></div>

        <div className="relative z-20 bg-white rounded-full shadow-xl border-[5px] border-emerald-100 flex flex-col items-center justify-center w-28 h-28">
           <div className="bg-emerald-500 text-white rounded-full p-2.5 mb-1 shadow-inner">
             <Landmark className="w-6 h-6" />
           </div>
           <span className="text-[11px] font-black text-slate-700">{ui('m67f51c7250')}</span>
        </div>
      </div>
    ); }
  },
  {
    get title() { return ui('m14ea3dfa65'); },
    get description() { return ui('mf21659b3bc'); },
    icon: Camera,
    get illustration() { return (
      <div className="relative w-full h-full bg-slate-50 flex items-center justify-center gap-4 p-4">
        <div className="bg-white w-24 h-32 shadow-md border border-slate-200 p-2 relative overflow-hidden flex flex-col gap-1.5 rounded">
           <div className="w-full h-1.5 bg-slate-200 rounded"></div>
           <div className="w-3/4 h-1.5 bg-slate-200 rounded mb-2"></div>
           <div className="flex justify-between"><div className="w-8 h-1 bg-slate-100"></div><div className="w-6 h-1 bg-slate-200"></div></div>
           <div className="flex justify-between"><div className="w-10 h-1 bg-slate-100"></div><div className="w-4 h-1 bg-slate-200"></div></div>
           <div className="flex justify-between"><div className="w-6 h-1 bg-slate-100"></div><div className="w-8 h-1 bg-slate-200"></div></div>
           <div className="mt-auto border-t border-dashed border-slate-300 pt-1.5 flex justify-between">
             <div className="w-8 h-1.5 bg-slate-300"></div>
             <div className="w-10 h-1.5 bg-emerald-400"></div>
           </div>

           <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" style={{ top: '60%' }}></div>
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white rounded-full p-1.5 shadow-lg">
             <Sparkles className="w-4 h-4" />
           </div>
        </div>

        <div className="flex flex-col gap-1 items-center justify-center">
            <span className="text-[10px] font-bold text-slate-400">{ui('ma1210435fa')}</span>
        </div>
        
        <div className="relative">
          <div className="bg-white rounded-xl shadow-md border border-blue-200 p-3 flex flex-col items-center w-20 relative z-10">
            <div className="w-full h-8 bg-blue-500 rounded-md mb-2 flex items-center justify-center">
                <span className="text-[7px] text-white font-bold">{ui('m2a1e1626c7')}</span>
            </div>
            <div className="w-full h-1 bg-slate-100 mb-1"></div>
            <div className="w-3/4 h-1 bg-slate-100 mb-2"></div>
            <div className="text-blue-600 bg-blue-50 p-1.5 rounded-full mt-1 border border-blue-100">
                <Share2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    ); }
  },
  {
    get title() { return ui('m3253091e4b'); },
    get description() { return ui('mb775531ed8'); },
    icon: QrCode,
    get illustration() { return (
      <div className="relative w-full h-full bg-emerald-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-4 shadow-2xl flex flex-col items-center justify-center w-36 relative mt-2">
          <div className="absolute -top-3.5 bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-wider shadow-sm">
            {ui('m3dfe83f462')}</div>
          <QrCode className="w-20 h-20 text-slate-800 mt-2" />
          <div className="mt-3 text-center">
            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">{ui('m9d5a6614ca')}</div>
            <div className="text-sm font-black text-emerald-600">{ui('ma12116f49d')}</div>
          </div>
        </div>
        
        <div className="absolute bottom-4 right-4 bg-white rounded-2xl p-2.5 shadow-lg border border-slate-100 flex items-center gap-2 max-w-[140px]">
          <div className="bg-red-100 p-2 rounded-xl text-red-600 flex-shrink-0">
             <FileText className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1 w-full">
            <div className="text-[10px] font-bold text-slate-700">{ui('m8cfb17e054')}</div>
            <div className="w-1/2 h-1 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    ); }
  }
];

const oneTimeSteps = [
  {
    get title() { return ui('m15b47c7ad7'); },
    get description() { return ui('m84994cb747'); },
    icon: Zap,
    get illustration() { return (
      <div className="relative w-full h-full bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-emerald-100 flex items-center gap-3 w-4/5">
          <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-sm shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-black text-slate-800">{ui('m9df264b5fe')}</div>
            <div className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {ui('m7893bd8ed4')}</div>
          </div>
        </div>
      </div>
    ); }
  },
  {
    get title() { return ui('mbe27b7ebcf'); },
    get description() { return ui('m91dc67e142'); },
    icon: FileText,
    get illustration() { return (
      <div className="relative w-full h-full bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-3 shadow-md border border-slate-200 w-3/4 flex flex-col gap-2">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <span className="text-xs font-black text-slate-800">{ui('ma0daa19f65')}</span>
            <span className="text-xs font-extrabold text-emerald-600">{ui('mbe17f45666')}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{ui('maf242f7f60')}</span>
            <span className="font-bold text-slate-700">{ui('m8a9f94f757')}</span>
          </div>
        </div>
      </div>
    ); }
  },
  {
    get title() { return ui('m911292cdcd'); },
    get description() { return ui('me67548d447'); },
    icon: QrCode,
    get illustration() { return (
      <div className="relative w-full h-full bg-emerald-600 flex items-center justify-center p-4 gap-3">
        <div className="bg-white rounded-2xl p-3 shadow-xl flex flex-col items-center justify-center w-28">
          <QrCode className="w-14 h-14 text-slate-800" />
          <span className="text-[10px] font-black text-emerald-600 mt-1">{ui('m3dfe83f462')}</span>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-xl flex items-center gap-2">
          <div className="bg-red-100 text-red-600 p-2 rounded-xl">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-800">{ui('m5ac70f011f')}</div>
            <div className="text-[9px] text-slate-500">{ui('m1bb44c4561')}</div>
          </div>
        </div>
      </div>
    ); }
  },
  {
    get title() { return ui('m5d8194d0cb'); },
    get description() { return ui('m99d94069cb'); },
    icon: Cloud,
    get illustration() { return (
      <div className="relative w-full h-full bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex items-center gap-3 w-4/5 shadow-2xl">
          <div className="bg-emerald-500 text-white p-3 rounded-2xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-black text-white">{ui('m969f9aa2d5')}</div>
            <div className="text-[10px] text-emerald-400 font-semibold">{ui('m906fec7483')}</div>
          </div>
        </div>
      </div>
    ); }
  }
];

export default function InstructionView({ onClose, mode }: InstructionViewProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const steps = mode === 'one-time' ? oneTimeSteps : appSteps;

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 bg-slate-50/95 backdrop-blur-md p-6 overflow-y-auto flex flex-col items-center justify-center font-sans animate-in fade-in duration-200">
      <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 bg-white rounded-full shadow-sm border border-slate-200">
        <X className="h-5 w-5" />
      </button>
      
      <div className="max-w-md w-full">
        <h2 className="text-2xl font-black mb-8 text-center text-slate-800 tracking-tight">
          {mode === 'one-time' ? ui('m6168249368') : ui('mb74aebd58a')}
        </h2>
        
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 text-emerald-600 p-3.5 rounded-2xl shadow-sm border border-emerald-200/50">
              <step.icon className="h-7 w-7" />
            </div>
            <h3 className="text-lg leading-tight font-black text-slate-800">{step.title}</h3>
          </div>
          <p className="text-sm font-medium leading-relaxed text-slate-600">{step.description}</p>
          <div className="w-full h-56 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 overflow-hidden relative">
            {step.illustration}
          </div>
        </div>

        <div className="flex justify-between items-center mt-8 px-2">
          <button 
            onClick={prevStep} 
            disabled={currentStep === 0}
            className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-600 disabled:opacity-30 font-bold text-sm transition-all"
          >
            {ui('m8a09e03d20')}</button>
          
          <div className="flex gap-1.5">
            {steps.map((_, idx) => (
               <div key={idx} className={`h-2 rounded-full transition-all ${idx === currentStep ? 'w-6 bg-emerald-500' : 'w-2 bg-slate-300'}`}></div>
            ))}
          </div>

          <button 
            onClick={nextStep} 
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all"
          >
            {currentStep === steps.length - 1 ? ui('mbdc2a3debc') : ui('mf202ea2312')}
          </button>
        </div>
      </div>
    </div>
  );
}

