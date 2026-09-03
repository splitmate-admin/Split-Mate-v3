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
    question: "SplitMate là gì và hoạt động như thế nào?",
    answer: "SplitMate là ứng dụng chia tiền nhóm thông minh giúp ghi chép và tính toán chi tiêu chung của tập thể (chuyến đi du lịch, ăn chơi, liên hoan). Tất cả số tiền thừa thiếu của từng thành viên sẽ được gom lại và thanh toán thông qua một quỹ chung duy nhất (như Quỹ MoMo, tài khoản ngân hàng nhóm, hoặc tài khoản ngân hàng của một người thủ quỹ đại diện). Cách này giúp dòng tiền luôn rõ ràng, minh bạch và vô cùng dễ quản lý."
  },
  {
    category: "tech",
    question: "Tại sao SplitMate thanh toán qua Quỹ chung thay vì ghép đôi cấn trừ trực tiếp?",
    answer: "Phương thức thanh toán qua Quỹ chung giúp giảm thiểu tối đa sự rắc rối khi các thành viên phải tự ghép đôi cấn trừ nợ nần lẻ tẻ với nhau. Thành viên thiếu tiền chỉ cần chuyển khoản một lần vào tài khoản quỹ chung (quỹ momo, ngân hàng hoặc tài khoản của thủ quỹ), sau đó thủ quỹ sẽ thối lại chính xác cho những thành viên đã chi dư từ quỹ này. Quá trình này giúp mọi giao dịch luôn có đối soát rõ ràng và không bị nhầm lẫn."
  },
  {
    category: "privacy",
    question: "Cổng thanh toán này có an toàn không? Có liên kết ngân hàng không?",
    answer: "Hoàn toàn an toàn và bảo mật! Ứng dụng SplitMate chỉ là một công cụ ghi chép và tính toán độc lập, hoàn toàn KHÔNG yêu cầu hoặc thực hiện liên kết tài khoản ngân hàng hay ví điện tử của bạn vào hệ thống. Các ảnh mã QR hiển thị chỉ để giúp mọi người dễ dàng sao chép STK hoặc quét nhanh trên ứng dụng ngân hàng cá nhân của họ mà không lo rò rỉ thông tin riêng tư."
  },
  {
    category: "general",
    question: "Bạn bè của mình có thể vào nhóm tự điền STK mà không cần tạo tài khoản?",
    answer: "Hoàn toàn được! Thủ quỹ chỉ cần cấp một 'Mã Thành Viên' (Access Code) duy nhất cho mỗi người. Họ chỉ cần chọn cổng 'Đăng nhập Thành viên' bằng mã đó là có thể tự nhập số tài khoản cá nhân, xem số tiền mình cần đóng hoặc nhận lại, và tải ảnh xác thực chuyển khoản cực kỳ nhanh chóng."
  },
  {
    category: "general",
    question: "Dữ liệu ngoại tuyến (Offline) khác gì khi lưu trữ đồng bộ đám mây?",
    answer: "Chế độ Ngoại tuyến cho phép bạn dùng thử ứng dụng tức thì không cần đăng ký tài khoản, toàn bộ dữ liệu chỉ lưu trên trình duyệt của thiết bị đó (LocalStorage). Để bảo toàn dữ liệu lâu dài trên server, tránh mất mát khi vô tình xóa lịch sử trình duyệt, xin hãy đăng ký hoặc đăng nhập tài khoản Thủ quỹ để đồng bộ hệ thống cloud."
  },
  {
    category: "tech",
    question: "Tôi có thể chia đều chi phí cho cả nhóm hoặc chỉ một vài người được không?",
    answer: "Ứng dụng hỗ trợ tùy chọn chia chi phí vô cùng linh hoạt. Khi thêm một khoản chi mới, bạn hoàn toàn có thể chọn chia đều cho cả nhóm hoặc chỉ tích chọn những người thực sự tham gia khoản chi đó. Hệ thống sẽ tự động phân bổ chính xác số tiền chịu trách nhiệm cho từng người."
  },
  {
    category: "general",
    question: "Làm thế nào để thủ quỹ kiểm tra xem thành viên đã nộp tiền hay chưa?",
    answer: "Các thành viên sau khi chuyển tiền vào quỹ chung của thủ quỹ có thể chụp màn hình điện thoại và tải ảnh biên lai (Receipt) lên nhóm. Thủ quỹ chỉ cần vào phần 'Lịch sử thanh toán' trên website để duyệt biên nhận, đảm bảo số dư quỹ ngoài thực tế luôn trùng khớp hoàn hảo với hệ thống."
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
          <span>Về Khu Vực Làm Việc</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-550 via-purple-600 to-pink-500 shadow-md flex items-center justify-center text-white shrink-0 shadow-emerald-600/25">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div className="text-left">
            <h1 className="font-extrabold text-xl font-sans tracking-tight text-slate-800 leading-tight">
              Trung tâm FAQ & Giải Đáp
            </h1>
            <p className="text-xs text-slate-400 mt-1">Cơ sở dữ liệu hỗ trợ, hiến kế ý kiến đóng góp</p>
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
            <span>KÊNH HỖ TRỢ TRỰC TUYẾN</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white leading-snug">
            SplitMate lắng nghe bạn đóng góp ý tưởng & phản ánh sự cố hệ thống !
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Dưới đây là tủ câu hỏi chuẩn và hòm thư phản hồi cộng đồng được lưu trữ thời gian thực trên hệ thống. Nếu bạn có ý tưởng "hiến kế" hay ho hoặc báo cáo lỗi, hãy nhấn nút <strong>Góp Ý & Báo Lỗi</strong> bên dưới để gửi phản hồi ngay lập tức cho Admin!
          </p>
          <div className="pt-2">
            <button 
              onClick={() => setIsFeedbackOpen(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-tr from-emerald-600 via-purple-600 to-pink-500 hover:opacity-90 text-white font-bold text-sm py-2.5 px-6 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all active:scale-95 cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
              <Sparkles className="w-4 h-4" />
              <span>Góp Ý & Báo Lỗi</span>
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
            placeholder="Tìm kiếm câu hỏi, nội dung..."
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
            Tất cả
          </button>
          <button
            onClick={() => setActiveCategory("general")}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategory === "general"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-650/15"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50"
            }`}
          >
            Hỏi đáp chung
          </button>
          <button
            onClick={() => setActiveCategory("tech")}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategory === "tech"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50"
            }`}
          >
            Tính năng & Công nghệ
          </button>
          <button
            onClick={() => setActiveCategory("privacy")}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategory === "privacy"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50"
            }`}
          >
            Bảo mật & STK
          </button>
          <button
            onClick={() => setActiveCategory("community")}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCategory === "community"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Hòm thư cộng đồng ({feedbacks.length})</span>
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
              <span>CÂU HỎI THƯỜNG GẶP</span>
            </h3>

            {filteredStaticFaqs.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 p-8 rounded-2xl text-center text-slate-400 text-xs">
                Không tìm thấy câu hỏi chuẩn nào phù hợp từ khóa tìm kiếm.
              </div>
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
              <span>HÒM THƯ GÓP Ý & GIẢI ĐÁP CỘNG ĐỒNG</span>
            </h3>
          </div>

          {loadingFeedbacks ? (
            <div className="py-12 bg-white rounded-3xl border border-slate-100 shadow-xs flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-bold">Đang tải phản hồi từ hệ thống...</p>
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="bg-white border border-slate-100 p-12 rounded-3xl text-center space-y-3 shadow-xs">
              <p className="text-xs text-slate-400">Chưa có phản hồi nào trùng khớp hoặc hòm thư trống rỗng.</p>
              <p className="text-[0.625rem] text-slate-400">Bạn có thể gửi phản hồi đầu tiên bằng nút Góp ý kiến ở góc màn hình!</p>
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
                          <span>Góp ý</span>
                        </span>
                      ) : fb.type === "suggestion" ? (
                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 py-0.5 px-2 rounded-lg text-[0.625rem] font-extrabold border border-amber-100">
                          <Lightbulb className="w-3 h-3 text-amber-500" />
                          <span>Hiến kế</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 py-0.5 px-2 rounded-lg text-[0.625rem] font-extrabold border border-rose-100">
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                          <span>Báo lỗi</span>
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
                        {new Date(fb.createdAt).toLocaleDateString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>

                      {(fb.status === "replied" || fb.reply) ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-[0.5625rem] py-0.5 px-1.5 font-bold">
                          Đã giải đáp
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-700 border border-amber-100 rounded-md text-[0.5625rem] py-0.5 px-1.5 font-bold animate-pulse">
                          Chờ Admin xem
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Feedback Sender & Body */}
                  <div className="space-y-2 mb-3">
                    <p className="text-xs font-black flex items-center gap-1 text-slate-800">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{fb.name || "Ẩn danh"}</span>
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
                        <span>SplitMate Admin giải đáp:</span>
                      </p>
                      <p className="text-xs text-slate-700 font-semibold leading-relaxed pl-1">
                        {fb.reply}
                      </p>
                      {fb.repliedAt && (
                        <span className="text-[0.5625rem] text-slate-400 pl-1 block italic mt-1 font-medium">
                          Đã trả lời lúc: {new Date(fb.repliedAt).toLocaleDateString("vi-VN", {
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
