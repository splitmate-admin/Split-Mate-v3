import React from "react";
import { X, Zap, Landmark, Camera, QrCode, Link, MousePointer2, Users, User, Sparkles, Share2, FileText, Cloud, CheckCircle2, ShieldCheck, Download } from "lucide-react";

interface InstructionViewProps {
  onClose: () => void;
  mode?: 'login' | 'one-time';
}

const appSteps = [
  {
    title: "Vào nhóm trong 1 giây",
    description: "Không cần tải app, không cần tạo tài khoản. Bạn chỉ cần click vào đường link Trưởng nhóm gửi qua Zalo là tự động vào thẳng nhóm để bắt đầu chi tiêu.",
    icon: Zap,
    illustration: (
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
           <div className="font-bold text-slate-800 text-sm">Nhóm Vũng Tàu</div>
           <div className="bg-emerald-500 text-white text-[10px] px-3 py-1 rounded-full font-bold">Tham gia ngay</div>
        </div>
      </div>
    )
  },
  {
    title: "Gom tiền về Quỹ chung",
    description: "Loại bỏ việc chuyển khoản chéo lẻ tẻ. Toàn bộ nợ được gom về một Quỹ chung duy nhất, mỗi người chỉ cần chuyển khoản 1 lần là sạch nợ.",
    icon: Landmark,
    illustration: (
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
           <span className="text-[11px] font-black text-slate-700">Quỹ chung</span>
        </div>
      </div>
    )
  },
  {
    title: "Quét hóa đơn AI (AI Scan)",
    description: "Chụp hóa đơn để AI tự động điền số tiền và ngày phát sinh hoặc share hóa đơn chuyển khoản từ app ngân hàng",
    icon: Camera,
    illustration: (
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
            <span className="text-[10px] font-bold text-slate-400">HOẶC</span>
        </div>
        
        <div className="relative">
          <div className="bg-white rounded-xl shadow-md border border-blue-200 p-3 flex flex-col items-center w-20 relative z-10">
            <div className="w-full h-8 bg-blue-500 rounded-md mb-2 flex items-center justify-center">
                <span className="text-[7px] text-white font-bold">App Ngân hàng</span>
            </div>
            <div className="w-full h-1 bg-slate-100 mb-1"></div>
            <div className="w-3/4 h-1 bg-slate-100 mb-2"></div>
            <div className="text-blue-600 bg-blue-50 p-1.5 rounded-full mt-1 border border-blue-100">
                <Share2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "VietQR 1 chạm & Đòi nợ tự động",
    description: "Quét mã QR chứa sẵn số tiền lẻ chính xác để thanh toán trong 3 giây. File pdf tổng hợp đầy đủ thông tin thanh toán.",
    icon: QrCode,
    illustration: (
      <div className="relative w-full h-full bg-emerald-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-4 shadow-2xl flex flex-col items-center justify-center w-36 relative mt-2">
          <div className="absolute -top-3.5 bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-wider shadow-sm">
            VietQR 1 chạm
          </div>
          <QrCode className="w-20 h-20 text-slate-800 mt-2" />
          <div className="mt-3 text-center">
            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">Thanh toán</div>
            <div className="text-sm font-black text-emerald-600">125.000đ</div>
          </div>
        </div>
        
        <div className="absolute bottom-4 right-4 bg-white rounded-2xl p-2.5 shadow-lg border border-slate-100 flex items-center gap-2 max-w-[140px]">
          <div className="bg-red-100 p-2 rounded-xl text-red-600 flex-shrink-0">
             <FileText className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1 w-full">
            <div className="text-[10px] font-bold text-slate-700">Tổng kết.pdf</div>
            <div className="w-1/2 h-1 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }
];

const oneTimeSteps = [
  {
    title: "Trải nghiệm tức thì không cần tài khoản",
    description: "Bắt đầu tạo nhóm và chia tiền ngay mà không cần tạo tài khoản hay tải ứng dụng.",
    icon: Zap,
    illustration: (
      <div className="relative w-full h-full bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-emerald-100 flex items-center gap-3 w-4/5">
          <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-sm shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-black text-slate-800">Dùng Thử 1 Lần</div>
            <div className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Không cần Đăng ký
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Thêm hóa đơn và chia tiền",
    description: "Nhập chi tiêu nhanh chóng, hệ thống tự động tính toán đối soát công nợ công bằng và minh bạch cho từng thành viên.",
    icon: FileText,
    illustration: (
      <div className="relative w-full h-full bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-3 shadow-md border border-slate-200 w-3/4 flex flex-col gap-2">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <span className="text-xs font-black text-slate-800">Ăn uống hải sản</span>
            <span className="text-xs font-extrabold text-emerald-600">450.000đ</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>4 người chia đều</span>
            <span className="font-bold text-slate-700">112.500đ/người</span>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Tải file PDF & Bạn bè thanh toán",
    description: "Xuất báo cáo PDF tổng kết chi tiết đẹp mắt và thanh toán trực tiếp qua mã VietQR 1 chạm.",
    icon: QrCode,
    illustration: (
      <div className="relative w-full h-full bg-emerald-600 flex items-center justify-center p-4 gap-3">
        <div className="bg-white rounded-2xl p-3 shadow-xl flex flex-col items-center justify-center w-28">
          <QrCode className="w-14 h-14 text-slate-800" />
          <span className="text-[10px] font-black text-emerald-600 mt-1">VietQR 1 chạm</span>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-xl flex items-center gap-2">
          <div className="bg-red-100 text-red-600 p-2 rounded-xl">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-800">Báo cáo PDF</div>
            <div className="text-[9px] text-slate-500">Tải về máy 1s</div>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Dễ dàng đăng ký chính thức",
    description: "Khi cần lưu trữ vĩnh viễn trên Đám mây (Cloud), bạn có thể đăng ký tài khoản bất kỳ lúc nào.",
    icon: Cloud,
    illustration: (
      <div className="relative w-full h-full bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex items-center gap-3 w-4/5 shadow-2xl">
          <div className="bg-emerald-500 text-white p-3 rounded-2xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-black text-white">Lưu Đám Mây Cloud</div>
            <div className="text-[10px] text-emerald-400 font-semibold">Đăng ký chính thức 1s</div>
          </div>
        </div>
      </div>
    )
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
          {mode === 'one-time' ? 'Trải Nghiệm Dùng 1 Lần' : 'Giới thiệu Splitmate'}
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
            Quay lại
          </button>
          
          <div className="flex gap-1.5">
            {steps.map((_, idx) => (
               <div key={idx} className={`h-2 rounded-full transition-all ${idx === currentStep ? 'w-6 bg-emerald-500' : 'w-2 bg-slate-300'}`}></div>
            ))}
          </div>

          <button 
            onClick={nextStep} 
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all"
          >
            {currentStep === steps.length - 1 ? 'Sẵn sàng ngay' : 'Tiếp theo'}
          </button>
        </div>
      </div>
    </div>
  );
}

