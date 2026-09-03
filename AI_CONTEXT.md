# SPLITMATE PROJECT RULES & CONTEXT

## 1. Tổng quan dự án (Project Overview)
SplitMate là ứng dụng Web/PWA chia tiền nhóm và du lịch cực tốc, không ma sát tại Việt Nam.
- **Triết lý**: Không bắt buộc tải app, không bắt buộc đăng ký tài khoản cho thành viên thường. Nhập cuộc trong 1 giây qua link mời tự động ghi LocalStorage (`splitmate_groups`, `splitmate_current_group`).
- **Hệ thống nợ**: Áp dụng mô hình "Quỹ Nhóm Trung Gian" (1-to-N và N-to-1) và tính toán số nợ tối ưu giữa các thành viên. Tất cả thành viên nợ chuyển khoản vào 1 tài khoản VietQR của Thủ quỹ/Chủ nợ, Thủ quỹ tất toán cho các chủ nợ.

## 2. Công nghệ sử dụng (Tech Stack)
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS (Deploy qua Vercel / Cloud Run).
- **Backend & Middleware**: Express.js (`server.ts` & `/api/api-app.ts`).
- **Database & Storage**: Supabase (PostgreSQL + Supabase Storage).
- **AI Engine**: Gemini 2.0 Flash (JSON Mode) qua `@google/genai` SDK / Google AI Studio API.

## 3. Kiến trúc dữ liệu bắt buộc (Crucial Architectural Rules)
- **Realtime**: Dùng Supabase Realtime (WebSockets) để đồng bộ dữ liệu tức thì giữa các thiết bị thành viên trong cùng một nhóm.
- **Tối ưu Storage**: KHÔNG lưu chuỗi Base64 của ảnh hóa đơn vào database. Ảnh chụp từ camera/thư viện được nén ở client-side (Canvas compression) trước khi lưu/upload. File lưu vào Supabase Storage, chỉ lưu đường dẫn URL vào table database.
- **Client-side PDF & Export**: Tạo báo cáo Excel/PDF trực tiếp ở phía browser để giữ cho server Fast Origin Transfer nhẹ nhàng.
- **Quy đổi đa tiền tệ**: Quy đổi VND/USD/EUR/JPY ngay tại thời điểm nhập liệu (Conversion on Entry). Sổ cái database chỉ tính toán bằng tiền VND gốc để giữ cấu trúc nợ đơn giản.

## 4. Cấu trúc Database quan hệ (Multi-group Schema)
- Bảng `users`: `id` (UUID, primary key), `email` (text, unique), `display_name`, `avatar_url`.
- Bảng `groups`: `id` (UUID, primary key), `name`, `invite_code` (unique).
- Bảng `group_members` (Nhiều-Nhiều): `id` (UUID), `group_id` (foreign key), `user_id` (foreign key, nullable), `temp_name` (text), `role` (text: 'admin' | 'member').
- Bảng `expenses`: `id` (text/UUID), `group_id`, `description`, `amount`, `payer_id`, `participants` (JSON/Array), `date`, `receipt_url`.
- Bảng `settlements`: `id`, `group_id`, `from_member_id`, `to_member_id`, `amount`, `date`.

## 5. Các tính năng cốt lõi (Core Features Flow)
- **Magical Join Link**: Link dạng `/join/[code]` tự lưu mã nhóm vào `localStorage` và tự đăng nhập/vào nhóm không cần mật khẩu.
- **AI OCR Quét Ảnh & VietQR**:
  - Tự động nhận diện hóa đơn hoặc mã VietQR từ ảnh chụp/tải lên.
  - Tự động bóc tách tên chủ tài khoản / tên quán ăn (ví dụ: "Thanh toán Bún bò cô Thu", "Thanh toán NGUYEN VAN A") và điền vào nội dung chi phí.
  - Với mã QR tĩnh (không sẵn số tiền), hệ thống nhắc người dùng nhập số tiền và bấm **Thêm khoản chi** trước.
- **Thanh toán 1-Touch Bank Deep Linking**:
  - Khi quét mã VietQR, hệ thống trích xuất thông tin điền sẵn vào form.
  - **CHỈ SAU KHI** bấm **"Thêm khoản chi"** (lưu khoản chi thành công vào nhóm), banner thông báo MỚI hiển thị nút **"Chuyển sang App Ngân hàng / Ví Điện tử ngay"** (hoặc **"Mở App Ngân hàng để trả tiền"**) với số tiền chính xác vừa lưu để mở app ngân hàng chuyển khoản 1-chạm. Tránh việc người dùng thanh toán xong lại quên bấm lưu khoản chi.
  - **Kiểm tra Ngân hàng mặc định**:
    - **Nếu ĐÃ CÓ ngân hàng mặc định** (`localStorage.getItem('splitmate_default_bank')`): Tự động tổng hợp thông tin mã BIN, STK, số tiền và nội dung để tạo Deep Link và mở ngay ứng dụng ngân hàng (`window.location.href = deep_link_url`).
    - **Nếu CHƯA CÓ ngân hàng mặc định**: Hiển thị Bottom Sheet bo góc tròn lớn (`rounded-t-[32px]`) kèm hiệu ứng mờ nền (`backdrop-blur-sm`) cho phép chọn app ngân hàng/ví: MoMo (`momo`), Techcombank (`tcb`), Vietcombank (`vcb`), MB Bank (`mbb`), ZaloPay (`zalopay`), hoặc Ngân hàng khác (`vietqr`).
    - **Ghi nhớ mặc định**: Tích chọn checkbox "Đặt làm ngân hàng mặc định cho các lần sau" sẽ lưu mã ngân hàng vào `localStorage.setItem('splitmate_default_bank', selected_bank_code)`.
  - **Cơ chế Đổi mặc định**: Nút/Dòng chữ "Đổi ngân hàng mặc định" cho phép xóa cấu hình cũ (`localStorage.removeItem('splitmate_default_bank')`) và bật lại khay chọn ngân hàng.

## 6. Lệnh tự động hóa cục bộ của Nhà phát triển (Developer CLI)
- Chạy lệnh `npm run log "Nội dung task"` để kích hoạt file script `scripts/log-task.js` tự động đồng bộ tiến độ sửa lỗi/viết code lên Google Sheet của nhà phát triển. Không được nhầm lẫn công cụ này với tính năng trong app dành cho người dùng!
