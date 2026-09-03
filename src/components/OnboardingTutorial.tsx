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
      title: "Chào mừng bạn đến với SplitMate! 🚀",
      description: `Chào ${userName || "bạn"}, hệ thống quản lý chi tiêu nhóm thông minh đã sẵn sàng phục vụ bạn. Hãy để chúng tôi giúp bạn "sòng phẳng" hơn trong mọi cuộc vui.`,
      icon: <Rocket className="w-8 h-8 text-emerald-600" />,
      button: "Bắt đầu thôi",
      image: imgWelcome
    },
    {
      id: 2,
      title: "Bước 1: Tạo Nhóm Đầu Tiên",
      description: "Click vào nút '+' ở góc trên cùng để tạo không gian riêng cho nhóm của bạn (ví dụ: 'Du lịch Đà Lạt', 'Ăn uống cuối tuần').",
      icon: <Plus className="w-8 h-8 text-pink-600" />,
      button: "Tiếp theo",
      image: imgCreateGroup
    },
    {
      id: 3,
      title: "Bước 2: Thêm Thành Viên",
      description: "Thêm bạn bè vào danh sách. Hệ thống sẽ tự động cấp 'Mã truy cập' để họ có thể tự vào xem báo cáo và nộp biên lai.",
      icon: <Users className="w-8 h-8 text-emerald-600" />,
      button: "Tiếp theo",
      image: imgFriends
    },
    {
      id: 4,
      title: "Bước 3: Ghi Chép & Chia Tiền",
      description: "Nhập các khoản chi tiêu hàng ngày. SplitMate sẽ tự động tính toán 'ai nợ ai' một cách chính xác nhất.",
      icon: <Receipt className="w-8 h-8 text-orange-600" />,
      button: "Tiếp theo",
      image: imgCalculator
    },
    {
      id: 5,
      title: "Nguyên Tắc 'Sòng Phẳng'",
      description: "Để xóa nhóm thì nhóm phải sòng phẳng - tức là không còn khoản buộc phải thu, chi nào. Điều này giúp bảo vệ quyền lợi của mọi thành viên.",
      icon: <CheckCircle2 className="w-8 h-8 text-cyan-600" />,
      button: "Sẵn sàng trải nghiệm!",
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
              Dành 30 giây để bắt đầu hành trình sòng phẳng
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
