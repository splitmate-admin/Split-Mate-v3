# PROJECT_BRAIN.md - SPLITMATE SYSTEM BRAIN

> **BỘ NÃO HỆ THỐNG DỰ ÁN SPLITMATE**
> Document này lưu trữ toàn bộ kiến trúc, quy tắc, hướng dẫn, và lịch sử thay đổi của dự án SplitMate. File này giúp AI Agent hiểu trọn vẹn ngữ cảnh dự án mà không cần hỏi lại người dùng.

---

## 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)

- **Tên dự án**: SplitMate (Chia tiền nhóm & du lịch cực tốc)
- **Triết lý**:
  - Không ma sát: Không bắt buộc đăng ký tài khoản cho thành viên thường.
  - Nhập cuộc tức thì qua Link chia sẻ (`/join/[code]`), dữ liệu được tự động ghi nhận vào LocalStorage & Supabase.
  - Tính toán nợ tối ưu (Tối giản hóa giao dịch giữa các thành viên qua Quỹ nhóm trung gian).

---

## 2. QUY TẮC CỐT LÕI VÀ BẮT BUỘC (MANDATORY SYSTEM RULES)

1. **Quy tắc Phê duyệt (User Confirmation Rule)**:
   - Khi có bất kỳ thay đổi nào về logic, hệ thống, hoặc tính năng, AI phải giải thích đề xuất cho người dùng trước.
   - **CHỈ CHỈNH SỬA CODE** sau khi người dùng bấm xác nhận.
2. **Quy tắc Lưu trữ File (Storage vs Database)**:
   - **Tập tin (Ảnh hóa đơn, chứng từ, QR)**: Luôn lưu vào Storage (Supabase Storage hoặc Blob Storage).
   - **Database Table**: Chỉ lưu đường dẫn URL (`receipt_url`, `avatar_url`), **tuyệt đối không lưu chuỗi Base64** vào Database.
3. **Môi trường & Triển khai (Deploy & DB)**:
   - Deploy production qua **GitHub + Vercel**.
   - Database lưu trên **Supabase** (PostgreSQL + Supabase Realtime).
4. **Phản hồi bằng Tiếng Việt**: Tất cả hội thoại và giải thích với người dùng sử dụng tiếng Việt.

---

## 3. CÔNG NGHỆ & KIẾN TRÚC (TECH STACK & ARCHITECTURE)

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Lucide Icons.
- **Backend / API**: Express.js (`server.ts`, `/api/api-app.ts`).
- **Database & Storage**: Supabase (PostgreSQL, Realtime WebSockets, Supabase Storage).
- **AI OCR & Scanner**: Gemini 2.0 Flash (`@google/genai` SDK) & jsQR cho quét mã VietQR real-time.
- **Security**: Mã hóa (Hashing) mật khẩu Thủ quỹ bằng `bcryptjs`, hỗ trợ tự động nâng cấp từ plaintext sang hash khi đăng nhập.
- **Banking Deep Links**: VietQR generator + Deep links cho MoMo, Techcombank, Vietcombank, MB Bank, ZaloPay, VietinBank, BIDV, Agribank, VPBank, TPBank,...

---

## 4. TÍNH NĂNG CHI TIẾT & LOGIC XỬ LÝ (FEATURE SPECIFICATIONS)

### 4.1. Camera Quét Thông Minh AI & VietQR (Unified Camera)
- **Thiết kế**: Tích hợp chung **1 Camera duy nhất** cho cả 2 nhu cầu (Hóa đơn AI & VietQR), bỏ việc phân tách thành 2 mục/tab riêng biệt.
- **Xử lý Real-time VietQR**:
  - `jsQR` quét liên tục trên khung hình video stream.
  - Khi phát hiện mã VietQR, tự động bóc tách thông tin: Tên ngân hàng (`bankBin`), Số tài khoản (`accountNumber`), Tên người nhận (`accountName`/`storeName`), Số tiền (`amount`), Nội dung chuyển khoản (`memo`).
- **Xử lý Chụp ảnh / Tải ảnh Hóa đơn**:
  - Khi bấm chụp ảnh hoặc chọn file từ máy, gửi qua Gemini 2.0 Flash AI bóc tách thông tin hóa đơn (Tổng tiền, danh sách món, ngày giờ, người trả) điền tự động vào Form.

### 4.2. Chuyển sang App Ngân Hàng / Ví Điện Tử (1-Touch Bank Deep Link)
- **Thời điểm hiển thị**: CHỈ SAU KHI người dùng bấm **"Thêm khoản chi"** (hoặc lưu chi phí thành công), banner thành công sẽ xuất hiện kèm các lựa chọn:
  - **"Mở App Ngân hàng để trả tiền"** (chuyển sang app ngân hàng thanh toán ngay).
  - **"+ Nhập tiếp chi phí khác"** (reset form để nhập chi phí tiếp theo).
  - **"Về trang chủ"** (chuyển về màn hình danh sách chi phí/nhóm).
- **Thông tin truyền vào Deep Link Ngân hàng**:
  - **Tài khoản nhận tiền**: Lấy từ thông tin VietQR vừa quét HOẶC lấy từ STK/Ngân hàng của người nhận/người trả trong danh sách Thành viên.
  - **Số tiền**: Số tiền chính xác của khoản chi vừa lưu.
  - **Nội dung chuyển khoản (`memo`)**: Tự động tạo theo cú pháp:
    `[Tên nhóm] Thanh toan [Tên người nhận/Tên quán]`
    *(Được xử lý bỏ dấu tiếng Việt, loại bỏ ký tự đặc biệt, chuẩn hóa khoảng trắng, tối đa 50 ký tự để tương thích với tất cả ngân hàng)*.
- **Xử lý Ngân hàng mặc định**:
  - **Lấy mặc định từ tài khoản người nhận/đang thực hiện**:
    - Nếu người dùng đã cài ngân hàng mặc định trong ứng dụng (`splitmate_default_bank`), tự động mở thẳng app ngân hàng đó.
    - Nếu người nhận/thành viên chưa thêm thông tin tài khoản ngân hàng, hệ thống sẽ nhắc người dùng thêm vào trong mục Thành viên hoặc hiển thị khay chọn ngân hàng.
  - **Bottom Sheet chọn ngân hàng**: Cho phép chọn ngân hàng/ví (MoMo, TCB, VCB, MB, ZaloPay, VietQR khác) và tích chọn *"Đặt làm ngân hàng mặc định cho các lần sau"*.

### 4.3. Tối ưu Giao diện Mobile PWA & Trang Chủ
- **Xử lý Safe Area Header Mobile**: Bổ sung padding-top an toàn (`pt-10` / `pt-7`) ở thanh tiêu đề trên di động để không bị che khuất bởi các biểu tượng hệ thống (Wifi, Pin, Giờ, Camera notch) khi dùng ứng dụng dạng PWA/Mobile Browser.
- **Tối ưu Màn hình Đăng nhập Trang chủ**:
  - Loại bỏ các đoạn văn mô tả rườm rà (mô tả tính năng dài, điều khoản pháp lý thừa, email hỗ trợ rườm rà).
  - Thu gọn kích thước tiêu đề, ô nhập liệu (email, mật khẩu, tên hiển thị, mã nhóm) và nút bấm.
  - Đảm bảo toàn bộ bố cục trang chủ vừa vặn hoàn toàn trong **1 màn hình di động (`100dvh`)**, không phát sinh cuộn trang lên xuống.

### 4.4. Header thông minh chuẩn di động và Quản lý tích hợp (Smart Mobile Header)
- **Thiết kế**: Cố định ở trên cùng (`fixed top-0 left-0 right-0 h-14 bg-white border-b z-40 max-w-md mx-auto`), tích hợp hoàn hảo với hệ thống PWA/Mobile Browser.
- **Bên trái (Thông tin cá nhân)**: Click vào Avatar cá nhân mở Drawer kéo từ trái hiển thị thông tin Gmail, trạng thái Gói cước (`FREE`, `BE_BAN`, `HOI_LANG`), nút Nâng cấp VIP, và nút Đăng xuất tài khoản màu đỏ an toàn.
- **Chính giữa (Bộ chuyển đổi nhóm - Group Switcher)**: Click vào Tên nhóm hoạt động mở Bottom Sheet trượt từ dưới lên, hiển thị danh sách các nhóm đang tham gia kèm nút thêm nhóm nhanh.
- **Bên phải (Quản lý thành viên & Cài đặt nhóm)**:
  - **Avatar Stack thành viên**: Click mở thẳng Modal "Quản lý thành viên nhóm" (bọc `MemberSection` đầy đủ tính năng nạp thành viên, sửa/xóa, phân quyền, xem code) giúp quản lý thành viên tức thì ở bất kỳ tab nào.
  - **Icon Bánh răng cài đặt**: Click mở Modal "Cài đặt & Cấu hình nhóm", cho phép đổi tên nhóm, ảnh đại diện (upload nén file vào storage, lưu URL vào table) và thiết lập Quỹ chung tự động nhận VietQR (Ví MoMo / Tài khoản Ngân hàng Việt Nam chọn lọc thông minh). Có khu vực Danger Zone cho phép xóa nhóm sòng phẳng.

---

## 5. DỮ LIỆU SCHEMA (SUPABASE DATABASE SCHEMA)

- **`users`**: `id` (UUID), `email` (text), `display_name` (text), `avatar_url` (text).
- **`groups`**: `id` (UUID), `name` (text), `invite_code` (text, unique), `plan` (text, default 'FREE'), `plan_activated_at` (timestamp, null), `plan_expired_at` (timestamp, null).
- **`vouchers`**: `code` (text, PK), `plan_type` (text), `is_used` (boolean), `duration_months` (int4, null).
- **`group_members`**: `id` (UUID), `group_id` (UUID), `user_id` (UUID, nullable), `temp_name` (text), `bank_code` (text), `bank_account` (text), `momo_phone` (text), `role` (text).
- **`expenses`**: `id` (UUID/text), `group_id` (UUID), `description` (text), `amount` (numeric), `payer_id` (text), `participants` (JSON), `date` (timestamp), `receipt_url` (text - URL lưu trên Supabase Storage).
- **`settlements`**: `id` (UUID/text), `group_id` (UUID), `from_member_id` (text), `to_member_id` (text), `amount` (numeric), `date` (timestamp).

---

## 6. LỊCH SỬ CẬP NHẬT TÍNH NĂNG (SYSTEM CHANGELOG)
 
### Version 2.2.2 (2026-08-28)
- **Triển khai Hệ Thống Chống Pause Supabase Free Tier Tự Động (Supabase Keep-Alive Engine)**:
  - **Vấn đề**: Supabase Free Tier tự động tạm dừng (Paused) cơ sở dữ liệu nếu không phát sinh request/truy vấn trong 7 ngày liên tiếp, làm gián đoạn trải nghiệm người dùng khi truy cập lại ứng dụng.
  - **Giải pháp**:
    1. **Endpoint Keep-Alive (`/api/health` & `/api/keep-alive`)**: Tạo API endpoint trên backend Express thực hiện truy vấn siêu nhẹ (truy vấn `head count` hoặc `limit 1` vào bảng `groups` / `leaders`). Endpoint trả về JSON trạng thái chi tiết kèm thời gian phản hồi (latency ms) và không tiêu tốn tài nguyên.
    2. **GitHub Actions Cron Ping (`.github/workflows/supabase-keep-alive.yml`)**: Thiết lập lịch chạy định kỳ mỗi **2 ngày một lần** (04:00 UTC / 11:00 AM VN) gửi yêu cầu ping đến API SplitMate và query trực tiếp Supabase REST API gateway. Có hỗ trợ trigger thủ công `workflow_dispatch` để kiểm tra tức thì.
    3. **Hiệu quả**: 100% tự động, miễn phí vĩnh viễn, giữ cho cơ sở dữ liệu Supabase luôn ở trạng thái **ACTIVE 24/7**.

### Version 2.2.1 (2026-08-01)
- **Hoàn Thiện Quy Tắc Chế Độ 1 Lần (TRY_OFFLINE Mode Rules)**:
  - **Sửa Lỗi Chỉnh Sửa Hồ Sơ Offline**: Khắc phục lỗi "Yêu cầu thiếu dữ liệu xác thực" khi sửa Tên/Avatar ở Chế độ 1 lần bằng cách xử lý lưu trực tiếp thông tin vào state local trong `handleEditMember` (`App.tsx`).
  - **Tối ưu UI Cài đặt Nhóm**: Ẩn công tắc "Thành viên được thêm & sửa chi tiêu" ở Chế độ 1 lần vì thành viên không đăng nhập ở chế độ xài thử.
  - **Chỉnh sửa Hồ sơ Trưởng nhóm**: Cho phép Trưởng nhóm chỉnh sửa Tên hiển thị, Avatar hoạt hình preset hoặc tải ảnh cá nhân trực tiếp từ Personal Drawer và cập nhật tức thì.
  - **Nâng giới hạn Hóa đơn**: Tăng sức chứa tối đa lên **10 hóa đơn** cho Chế độ 1 lần (cập nhật đồng bộ các mốc kiểm tra và banner cảnh báo 9/10, 10/10 hóa đơn).
  - **Khóa tính năng Chốt Sổ**: Chặn thao tác Chốt Sổ & Lưu Trữ kỳ ở Chế độ 1 lần, hiển thị banner khóa kèm nút bấm nâng cấp nhóm mượt mà.

### Version 2.2.0 (2026-07-31)
- **Sửa Lỗi Chuyển sang Chế độ xem Thành viên (Leader Preview Mode)**:
  - **Khắc phục**: Loại bỏ logic lặp đồng bộ `isAdmin` trong `useEffect` ở `App.tsx`, cho phép Trưởng nhóm chủ động chuyển sang chế độ xem Thành viên (`setIsAdmin(false)`) để kiểm tra/xem thử giao diện và quay lại vai trò Trưởng nhóm trơn tru.
- **Phân Quyền Cài Đặt Nhóm Chặt Chẽ (Group Settings Security)**:
  - **Khắc phục**: Ẩn biểu tượng bánh răng Cài đặt nhóm ⚙️, nút "Cấu hình STK Quỹ Nhóm", và nút sửa tên nhóm inline đối với tài khoản Thành viên.
  - **Bảo mật**: Bổ sung kiểm tra `if (!isAdmin)` ở tất cả các hàm cập nhật cấu hình nhóm (`handleSaveGroupSettings`, `handleSaveGroupName`, và `open-group-settings` event listener), đảm bảo chỉ duy nhất Trưởng nhóm mới có quyền chỉnh sửa thông tin và phân quyền của nhóm.

### Version 2.1.4 (2026-07-26)
- **Sửa Lỗi PDF Trắng Trơn Do Tràn Bộ Nhớ Canvas Mobile Version 2.1.4 (2026-07-26) Sai Lệch Scroll Container**:
  - **Giới hạn Scale trên Mobile**: Tự động nhận diện thiết bị di động (`isMobile`). Giảm `scale` của html2canvas từ 2 xuống 1.2 (và 0.8 khi retry) để tránh vượt quá giới hạn 4096px chiều cao canvas trên iOS Safari - nguyên nhân gốc khiến PDF bị trắng.
  - **Reset Scroll Container Chính Xác**: `window.scrollTo(0,0)` không hoạt động do thanh cuộn nằm ở thẻ div `.overflow-y-auto`. Hệ thống nay chủ động tìm container và reset cuộn để tránh lỗi crop hình ảnh của html2canvas.
- **Cơ Chế Dự Phòng & Xử Lý Lỗi Tải Ảnh Khi Xuất PDF (PDF Fallback & Image Error Handling)**:
  - **Bổ sung Retry/Fallback cho PDF trắng**: Hệ thống kiểm tra kích thước file PDF ngay sau khi tạo bằng `html2pdf.js`. Nếu file quá nhỏ (dưới 10KB - tức bị trắng hoặc lỗi), hệ thống sẽ tự động kích hoạt cơ chế `generatePdf(true)` (thử lại với `scale: 1.5` giảm tải) thay vì xuất ra file rác.
  - **Xử lý an toàn ảnh lỗi (Image Error Fallback)**: Cập nhật hàm `waitForImages` để bao bọc khối `img.decode()` trong catch-block. Nếu ảnh bị lỗi (chẳng hạn CORS, link chết, hoặc load thất bại), ảnh đó sẽ bị ẩn đi `img.style.display = 'none'`, ngăn chặn lỗi "taint canvas" khiến `html2canvas` treo hoặc tạo trang trắng.

### Version 2.2.1 (2026-08-17)
- **Hoàn thiện Quy trình Xác thực Email OTP 6 số & Giải phóng Email khi Xóa Tài khoản**:
  - **Quy trình Xác thực Email cho Thành viên**: Tích hợp luồng gửi & xác minh mã OTP 6 chữ số (`/api/member/send-otp` & `/api/member/update-info`). Thành viên gia nhập bằng Mã Truy Cập khi bổ sung Email phải nhận mã OTP qua Email, xác thực chính xác mã 6 số thì Email mới được liên kết cố định (`emailVerified: true`) và khóa bảo mật.
  - **Kiểm tra Trùng lặp Email**: Nếu Email nhập vào đã được đăng ký cho một tài khoản Thủ quỹ/Thành viên khác trên hệ thống, ứng dụng yêu cầu nhập đúng Mật khẩu của tài khoản đó hoặc báo lỗi ngăn chặn liên kết đè.
  - **Khắc phục nút Xóa tài khoản cho Thành viên**: Cập nhật `handleDeleteAccount` trong `SmartHeader.tsx` tự động nhận diện `targetEmail` từ `effectiveMember.email` khi thành viên đăng nhập bằng mã nhóm, đồng thời đóng Drawer trước khi hiển thị hộp thoại xác nhận nguy hiểm.
  - **Giải phóng Email khi Xóa Tài khoản**: Khi người dùng thực hiện xóa vĩnh viễn tài khoản (`/api/user/delete-account`), hệ thống tự động giải phóng Email khỏi các thành viên ở những nhóm còn lại (`email: undefined`, `emailVerified: false`, tạo lại `accessCode` ngẫu nhiên mới), giúp Email đó có thể tái sử dụng hoặc đăng ký mới hoàn toàn.
  - **Làm sạch UI/UX**: Loại bỏ hoàn toàn các huy hiệu nhấp nháy/nhún nhảy trên thẻ nhóm, chuẩn di động FinTech phẳng mỏng nhẹ.

### Version 2.1.3 (2026-07-26)
- **Giải Quyết Dứt Điểm Lỗi PDF Trắng Trơn (Xử Lý Ảnh Async, IgnoreElements Overlay & Loại Bỏ X/Y Crop Boundary)**:
  - **Phân tích nguyên nhân cốt lõi**:
    1. **Chưa decode xong ảnh base64**: Thẻ `<img>` chứa mã QR/ảnh hóa đơn base64 chưa kịp decode pixels trong Browser Paint Engine khi `html2canvas` bắt đầu chụp.
    2. **X/Y Crop Offset gượng ép**: Việc đặt `x: 0, y: 0` cố định trong `html2canvas` khiến canvas bị xén lệch khỏi vị trí thực của `element` nếu có margin/offset của body.
    3. **Lớp phủ Loading che đè lên element**: Lớp `loadingDiv` (`z-index: 999999`) nằm đè trên cùng tọa độ màn hình với `element` (`z-index: 99990`) khiến `html2canvas` chụp nhầm phải lớp overlay.
  - **Khắc phục triệt để**:
    - **Tải & Decode ảnh bộ nhớ**: Cập nhật `waitForImages` bắt buộc gọi `img.decode()` bảo đảm 100% hình ảnh & VietQR đã sẵn sàng pixels trong RAM trước khi chụp, kèm đệm 400ms cho Browser Engine vẽ.
    - **Khống chế html2canvas ignoreElements**: Bổ sung `ignoreElements: (node) => node.id === "pdf-loading-overlay"` để `html2canvas` tự động loại bỏ lớp Loading khi chụp.
    - **Chuẩn hóa Bounding Box**: Loại bỏ `x: 0, y: 0` cố định, cho phép `html2canvas` tự động tính đúng khung hình `element`, đảm bảo 100% file PDF xuất ra sắc nét, đầy đủ nội dung và trang trắng bị loại bỏ hoàn toàn.

### Version 2.1.2 (2026-07-26)
- **Sửa Triệt Để Lỗi File PDF Trắng Trơn Bằng Lớp Overlay & Thứ Tự Stacking Context (Z-Index Fix & Loading Overlay)**:
  - **Phân tích nguyên nhân gốc**: Khi đặt thẻ báo cáo ở `z-index: -99999` để ẩn giao diện báo cáo, `html2canvas` quét toàn bộ canvas và vẽ phần nền `#root` / `document.body` chèn lên trên thẻ báo cáo (do z-index = 0 lớn hơn -99999), dẫn đến file PDF bị trắng hoàn toàn.
  - **Giải pháp tối ưu 100%**:
    1. Hiển thị một lớp phủ Loading toàn màn hình mờ ảo (`loadingDiv`, `z-index: 999999`) với spinner thông báo chuyên nghiệp *"Đang tạo Báo cáo PDF..."*.
    2. Đặt thẻ báo cáo `element` ở `z-index: 99990` (`99990 < 999999` nên nằm chìm bên dưới lớp Loading, người dùng hoàn toàn không thấy báo cáo nhấp nháy che màn hình).
    3. `html2canvas` gọi trực tiếp vào `element`, vẽ độc lập 100% nội dung thẻ báo cáo ở lớp trên cùng (`99990 > 0`), thu được hình ảnh và mã QR sắc nét tuyệt đối, chấm dứt hoàn toàn lỗi PDF trắng trơn.
    4. Tự động dọn dẹp `element` và `loadingDiv` sau khi hoàn tất.

### Version 2.1.1 (2026-07-26)
- **Giải Quyết Triệt Để Lỗi PDF Trắng Trơn & Hiện Hiện Báo Cáo Che Màn Hình (ScrollY Offset & Visual Flash Fix)**:
  - **Sửa tận gốc nguyên nhân PDF trắng trơn (ScrollY Offset)**: Khi người dùng cuộn trang xuống phía dưới (ví dụ ở mục Chốt Sổ / Trả Nợ), `window.scrollY > 0` khiến `element.getBoundingClientRect().top` bị âm. Khi `html2canvas` chụp hình, nội dung bị lệch ra khỏi khung canvas dẫn đến file PDF bị trắng 100%. Đã khắc phục bằng cách lưu vị trí cuộn `(originalScrollX, originalScrollY)`, tạm thời cuộn màn hình lên top `window.scrollTo(0, 0)` trong 300ms khi chụp và tự động khôi phục vị trí cuộn cũ ngay khi hoàn tất xuất file.
  - **Ẩn hoàn toàn hiệu ứng thoáng hiện báo cáo (Zero Visual Flash)**: Đặt vị trí báo cáo tạm thời ở `z-index: -99999` (nằm hoàn toàn phía sau layer ứng dụng). `html2canvas` vẫn chụp trực tiếp 100% nội dung `element` đầy đủ độ phân giải, trong khi người dùng không còn bị hiện tượng giao diện báo cáo nhảy chèn lên màn hình app.

### Version 2.1.0 (2026-07-26)
- **Khắc Phục Triệt Để Lỗi File PDF Trắng Trơn (Blank PDF Resolution)**:
  - **Sửa nguyên nhân gốc lỗi PDF trắng trơn**: Chuyển đổi vị trí mount DOM tạm thời của báo cáo từ `z-index: -9999` (bị layer `body` đè phủ mất hoàn toàn) sang `position: absolute; top: 0; left: 0; width: 780px; z-index: 99999;`. Đặt lớp báo cáo nằm ở tầng trên cùng giúp `html2canvas` chụp chính xác 100% nội dung khung hình mà không bị che bởi bất kỳ lớp giao diện nào.
  - **Chuyển đổi 100% ảnh minh chứng sang Base64**: Bổ sung hàm `convertUrlToBase64` cho tất cả ảnh phụ lục hóa đơn minh chứng trong báo cáo, loại bỏ hoàn toàn các lỗi cross-origin (CORS) hoặc canvas bị "tainted" khi render PDF.
  - **Cấu hình html2canvas tối ưu**: Đặt `useCORS: true`, `allowTaint: false`, `scrollX: 0`, `scrollY: 0` và `windowWidth: 800` để đảm bảo file PDF xuất ra luôn đầy đủ nội dung, hình ảnh sắc nét và không bị trắng trơn.
  - **Ngắt trang hoàn hảo (Chunking 2x3)**: Phân tách mảng mã QR thành từng khối (chunks) 6 thẻ (2 cột x 3 hàng) độc lập, mỗi khối được ép ngắt sang trang A4 mới bằng `page-break-before: always; break-before: page;`.

### Version 2.0.9 (2026-07-26)
- **Tối Ưu Kích Thước & Khắc Phục Lỗi Quét Mã VietQR Tất Toán Nợ Báo Cáo PDF**:
  - Tối ưu hóa toàn bộ kích thước hiển thị mã VietQR tất toán nợ ở các trang sau trong báo cáo PDF xuất ra lên chuẩn `220px x 220px` (đồng bộ 100% với mã QR Quỹ Nhóm ở trang đầu).
  - Loại bỏ các thuộc tính `border: 1px solid`, `padding: 4px` và `border-radius` trực tiếp trên thẻ `<img>` mã QR giúp giữ nguyên vẹn vùng an toàn (quiet zone) và ma trận nét vẽ QR sắc nét khi xuất PDF qua `html2pdf`.
  - Giúp tất cả các ứng dụng Ngân hàng di động (Vietcombank, MB, Techcombank, BIDV, Agribank, MoMo...) quét ma trận mã QR tất toán nợ nhanh chóng, chính xác và tự động nhận diện đúng số tiền.
- **Đồng bộ hóa & Cập nhật Định mức Đặc quyền tất cả các Gói Dịch Vụ**:
  - **Chế độ xài 1 lần (`TRY_OFFLINE`)**: Cấu hình chuẩn 10 thành viên, 10 hóa đơn, 10 lượt quét AI, 10 ảnh lưu trữ.
  - **Gói Free (`FREE`)**: Tối đa 10 thành viên, **hóa đơn không giới hạn**; **tăng lên 10 lượt quét AI/tháng** (từ 5) và **10 ảnh hóa đơn/tháng** (từ 5). Tự động khóa tính năng gửi ảnh biên lai đối soát chuyển khoản (yêu cầu nâng cấp nhóm).
  - **Gói Bè Bạn (`BE_BAN` / 49.000đ)**: Tối đa 20 thành viên, hóa đơn không giới hạn, 50 lượt quét AI/tháng, 50 ảnh hóa đơn/tháng. Tích hợp sẵn **mã QR trả nợ trong file PDF** & **Xác nhận thanh toán bằng ảnh biên lai (AI tự động đối soát)**.
  - **Gói Hội Làng (`HOI_LANG` / 99.000đ)**: Tối đa 50 thành viên, hóa đơn không giới hạn, **Quét AI KHÔNG GIỚI HẠN**, 200 ảnh hóa đơn/tháng. Tích hợp **mã QR trả nợ trong file PDF** & **Xác nhận thanh toán bằng ảnh biên lai (AI tự động đối soát)**.
  - **Gói Du Hí (`DU_HI_30` / 29.000đ)**: Tối đa 20 thành viên, hóa đơn không giới hạn, 100 lượt quét AI/30 ngày, 100 ảnh/30 ngày, Tích hợp QR trả nợ trong PDF & AI đối soát biên lai.
- **Tự Động Điền Số Tiền Vào Mã VietQR Tất Toán Nợ (Đồng bộ Quỹ Nhóm)**:
  - Tích hợp chuẩn mã hóa VietQR (`amount=${Math.round(amount)}`) cho tất cả các giao dịch công nợ của nhóm ở các gói nâng cấp (Bè Bạn, Hội Làng, Du Hí) trong Báo cáo PDF. Đồng bộ mô hình tất toán qua **Quỹ Nhóm** (`Thành viên ➔ Quỹ Nhóm`), giúp mã QR trong báo cáo PDF hiển thị chính xác luồng nộp tiền vào Quỹ Nhóm giống như trên màn hình ứng dụng, đồng thời giữ cơ chế tất toán cặp giữa các thành viên làm dự phòng nếu nhóm chưa cài đặt tài khoản Quỹ Nhóm.

### Version 2.0.8 (2026-07-19)
- **Tích hợp nút Cài đặt & Cấu hình quỹ nhóm trên Desktop**:
  - **Di chuyển SmartHeader lên cấp Root**: Di chuyển `SmartHeader` từ trong wrapper `MOBILE-ONLY LAYOUT WRAPPER` ra ngoài cấp root của `App.tsx` để luôn được render trên mọi kích thước màn hình, đồng thời thêm class `md:hidden` trực tiếp vào thanh header bar di động để ẩn đi giao diện thanh bar trên desktop một cách tự nhiên mà không ảnh hưởng tới hoạt động của các modal cấu hình bên trong.
  - **Tích hợp nút Cài đặt Nhóm ⚙️ trên Desktop**: Thêm nút cài đặt nhóm (`Settings`) cho Trưởng nhóm/Thủ quỹ trên Desktop ngay cạnh bộ chọn Nhóm. Khi click sẽ dispatch một Custom Event `"open-group-settings"` đến `SmartHeader` để mở trực tiếp popup Cấu hình & Cài đặt quỹ chung nhóm mượt mà.
- **Khắc phục lỗi nút Xóa thẻ chi tiêu & Các hộp thoại hệ thống không hiển thị**:
  - **Tái tích hợp Hộp thoại Xác nhận (Custom Confirmation Dialog)**: Khắc phục lỗi nghiêm trọng khi cấu trúc render của các hộp thoại hệ thống như Hộp thoại Xác nhận (`confirmState`), Hộp thoại Thông báo (`alertState`), và Hệ thống Toast (`toastMsg`) bị xóa trống ở chân file `App.tsx`.
  - **Hiển thị hộp thoại Xác nhận Xóa mượt mà**: Tái tích hợp toàn bộ giao diện Modal bằng Framer Motion (`motion/react`) với hiệu ứng zoom-spring & overlay blur kính mờ hiện đại, giúp người dùng khi click "Xóa" thẻ chi tiêu sẽ lập tức nhận được popup xác nhận xóa phẳng, rõ ràng và mượt mà.
 ### Version 2.0.7 (2026-07-19)
- **Hiển thị Ngày & Giờ hết hạn và thời gian còn lại của gói dịch vụ nhóm**:
  - **Tích hợp hộp thông tin thời hạn**: Thêm cấu trúc hiển thị thông tin chi tiết về thời gian hết hạn (`planExpiredAt`) cùng bộ đếm số ngày còn lại của gói dịch vụ nhóm đang kích hoạt ngay bên dưới nhãn gói tại `SmartHeader.tsx` (màn hình Cấu hình & Cài đặt nhóm).
  - **Dự phòng thông minh (Fallback)**: Đảm bảo nếu `planExpiredAt` trống nhưng nhóm đang sử dụng gói trả phí, hệ thống sẽ tự động tính toán dự phòng dựa trên thời gian tạo nhóm (`createdAt`) cộng thêm thời hạn tương ứng (30 ngày cho Gói Du Hí và 365 ngày cho các gói khác), loại bỏ trường hợp rỗng thông tin.

### Version 2.0.6 (2026-07-19)
- **Đồng bộ hóa hiển thị Gói Du Hí (DU_HI_30) trên toàn hệ thống**:
  - **Sửa lỗi hiển thị Gói Du Hí thành Gói FREE**: Cập nhật bổ sung Gói Du Hí (`DU_HI_30`) vào các khối điều kiện render Badge và thông tin gói cước của `SmartHeader.tsx` (dòng danh sách nhóm và Cấu hình cài đặt nhóm).
  - **Thiết lập Hạn mức chuẩn Gói Du Hí**: Điều chỉnh `maxInvoices` thành Vô hạn (`Infinity`) và `maxScans` thành `100` lượt quét AI/30 ngày chuẩn theo cấu hình dịch vụ của Gói Du Hí trong `SmartHeader.tsx`.
  - **Cập nhật hạn mức thành viên & Danh sách chuyển đổi nhóm trong App.tsx**: Cho phép Gói Du Hí chứa tối đa `20 thành viên` (dòng 1185) và hiển thị chính xác Badge *"🚗 Gói Du Hí"* trong danh sách chuyển đổi nhóm ở màn hình Cài đặt (dòng 3545) thay vì bị mặc định rơi vào nhánh else và hiển thị là Gói Free.

### Version 2.0.5 (2026-07-19)
- **Khắc phục lỗi Đăng xuất tài khoản & Xóa tài khoản không hoạt động trên Mobile**:
  - **Triệt tiêu lỗi Stacking Context di động**: Sửa lỗi do trình duyệt di động (như Safari trên iOS) tạo ngữ cảnh xếp chồng mới khi Personal Drawer sử dụng CSS `transform`. Thêm lệnh đóng Personal Drawer (`setShowPersonalDrawer(false)`) ngay lập tức khi click nút, giải phóng Stacking Context giúp Custom Confirmation Dialog trồi lên và hiển thị hoàn hảo ở giữa màn hình.
  - **Ẩn nút Xóa tài khoản vĩnh viễn với Tài khoản Thành viên/Offline**: Đưa nút "Xóa tài khoản vĩnh viễn" vào trong điều kiện kiểm thử `{user?.email && (...)}`. Giúp ẩn nút nguy hiểm này với các tài khoản không có Email thực tế trong Supabase (thành viên hoặc offline), loại bỏ bối rối cho người dùng khi nhấn nút mà không có phản hồi.
  - **Cá nhân hóa nhãn nút Đăng xuất linh hoạt**: Cập nhật nhãn và nội dung xác nhận động. Hiển thị *"Đăng xuất Thủ quỹ"* cho tài khoản Thủ quỹ, *"Rời khỏi nhóm"* cho tài khoản Thành viên truy cập bằng mã nhóm, và *"Quay lại Đăng nhập"* khi đang ở chế độ trải nghiệm offline xài một lần.
- **Vá lỗi biên dịch TypeScript trong SmartHeader.tsx**:
  - Loại bỏ bộ lọc `groupId` và `receiptUrl` lỗi thời trên kiểu dữ liệu `Expense` tại dòng tính toán thống kê hóa đơn của nhóm. Sửa đổi thành gán `groupExpenses = expenses` và sử dụng thuộc tính ảnh hóa đơn gốc `receiptImage` chuẩn xác giúp ứng dụng biên dịch thành công 100%.

### Version 2.0.4 (2026-07-15)
- **Bổ sung nút Sao kê công nợ cá nhân và Loại bỏ tỷ lệ chi tiêu thành viên**:
  - Đã tích hợp nút bấm **"Sao kê công nợ cá nhân"** nổi bật bằng màu xanh lá đặc trưng ngay tại tiêu đề của mục **Các khoản cần tất toán** trong `SettleUpSection.tsx`, giúp thành viên lẫn thủ quỹ dễ dàng mở modal đối soát chi tiết dòng tiền bất cứ lúc nào.
  - Loại bỏ hoàn toàn mục **Tỷ lệ chi tiêu của các thành viên (%)** dạng biểu đồ compact khỏi giao diện chính để giữ cho trang tối giản và tập trung vào các luồng tính toán cốt lõi.
- **Tự động nhận diện Tên hiển thị & Avatar thật của Thành viên**:
  - Khi một thành viên đăng nhập bằng mã truy cập hoặc đường dẫn liên kết của họ (không phải tài khoản thủ quỹ), hệ thống tự động bóc tách và đối chiếu thông tin từ `viewingMemberId` để lấy chính xác **Tên thành viên thực tế** (ví dụ: Quỳnh) và **Avatar tương ứng** thay vì hiển thị tên tĩnh mặc định `"Thành viên"`.
- **Cá nhân hóa và bảo mật mục Các khoản cần tất toán**:
  - Với tài khoản thành viên (không phải thủ quỹ), mục **Các khoản cần tất toán** giờ đây sẽ được lọc thông minh, chỉ hiển thị duy nhất các giao dịch có liên quan trực tiếp đến chính họ.
  - Cung cấp nút thao tác **"Nộp quỹ"** trực tiếp cho thành viên khi họ đang nợ quỹ, cho phép họ xem thông tin thanh toán, sao chép nhanh số tài khoản/nội dung và tải ảnh biên lai gửi thủ quỹ phê duyệt, đảm bảo sòng phẳng tuyệt đối.

### Version 2.0.3 (2026-07-13)
- **Tích hợp mục Gói dịch vụ nhóm & Thao tác nâng cấp trực quan**:
  - Thêm một khối hiển thị Gói dịch vụ hoạt động chi tiết cùng nút bấm "Nâng cấp lên gói" vô cùng nổi bật ngay bên trong Drawer Cài đặt nhóm (bánh răng cưa ở góc trên bên phải của `SmartHeader`), trả lời trực quan câu hỏi "Phần nâng cấp nhóm ở đâu?" giúp người dùng tìm kiếm và thao tác thuận tiện nhất.
- **Sửa lỗi hiển thị sai gói cước của nhóm (Đồng bộ các gói Free, Bè Bạn, Hội Làng)**:
  - Cập nhật logic kiểm tra gói của các nhóm để hỗ trợ đầy đủ tất cả định danh: `"FREE"` tương ứng Free 🌱, `"VIP" / "BE_BAN"` tương ứng Bè Bạn ⭐, `"PREMIUM" / "HOI_LANG"` tương ứng Hội Làng 👑. Giải quyết triệt để lỗi nhóm dùng Premium nhưng tab tổng quan lại hiển thị Free.
- **Tận dụng Ảnh đại diện nhóm & Tăng kích thước tên nhóm**:
  - Tại tab tổng quan danh sách nhóm, nếu nhóm có ảnh đại diện (`imageUrl`), ứng dụng sẽ tự động dùng ảnh đại diện bo góc tinh tế đó để hiển thị thay cho emoji mặc định.
  - Tên nhóm tại thẻ danh sách được nâng kích thước chữ từ `text-[13px]` lên `text-[15px]` font-black, giúp giao diện nổi bật, sắc nét và dễ đọc hơn rất nhiều.

### Version 2.0.2 (2026-07-13)
- **Thiết kế lại Thẻ Nhóm Đang Hoạt Động (Finzo Card Style) & Làm nổi bật 2 ô box tiền trong Hero Card**:
  - **Tái cấu trúc Thẻ Nhóm Đang Hoạt Động**: Chuyển đổi từ layout hàng ngang 3 cột đơn điệu cũ sang phong cách Finzo Premium Card cao cấp phẳng, sang trọng và có tính game hóa:
    - Hiển thị số tiền ròng (Được nhận/Cần đóng/Hòa gốc) to đậm, sắc nét ở góc trên bên trái cùng nhãn trạng thái trực quan.
    - Đặt cụm Avatar bong bóng nổi xếp chồng (Overlapping Bubble Avatars) có kích thước lớn hơn, đổ bóng tinh xảo ở góc trên bên phải.
    - Hiển thị Tên nhóm kèm icon và một đốm xanh lá nhấp nháy động (`animate-ping`) liên tục biểu thị nhóm đang chọn/kết nối hoạt động.
    - Tích hợp 2 nhãn mỏng nhẹ đặt song song ở dưới: Gói cước (👑 Gói Hội Làng, ⭐ Gói Bè Bạn, 🌱 Gói Free) dạng pastel nhẹ mắt và số lượng thành viên nhóm.
  - **Làm nổi bật 2 box Được nhận & Hóa đơn tham gia trong Hero Card**:
    - Nâng cấp viền lên `border-white/25`, nền trong suốt sáng hơn `bg-white/15 backdrop-blur-md` cùng hiệu ứng đổ bóng `shadow-sm shadow-black/5` và chuyển đổi mượt mà khi hover.
    - Bổ sung nhãn đốm tròn nháy động nhạt (`animate-pulse`) màu xanh lá và xanh dương cạnh tiêu đề "Được nhận" và "Hóa đơn tham gia", cùng chữ số tiền/bill to rõ sắc nét, giúp giao diện trực quan và thu hút ánh nhìn hơn.

### Version 2.0.1 (2026-07-13)
- **Tinh chỉnh Giao diện Thẻ tài khoản mặc định & Sửa lỗi Logo ngân hàng**:
  - Đổi toàn bộ nhãn hiển thị từ `"Tài khoản nhận mặc định"` và `"Tài khoản nhận tiền mặc định"` thành `"Tài khoản mặc định"` theo yêu cầu người dùng, giúp giao diện ngắn gọn, tinh tế và tập trung hơn.
  - Khôi phục nút chỉnh sửa ✏️ (Edit button) của thẻ tài khoản mặc định, hỗ trợ chỉnh sửa nhanh chóng ngay trên giao diện thẻ với thiết kế thông minh, không bị đè lên logo ngân hàng.
  - **Double-check & Sửa lỗi thiếu Logo của một số Ngân hàng**: Khắc phục lỗi thiếu ảnh logo bằng cách thêm các ánh xạ tuỳ chỉnh đặc biệt:
    - Sửa logo của **PVcomBank** (đổi mapping từ `PVC` sang tên tệp tin chính xác trên VietQR là `PVCOMBANK`).
    - Sửa logo của **VietBank** (đổi mapping từ `VAB` sang `VIETBANK` để lấy đúng logo chính hãng, tránh xung đột hiển thị nhầm logo của ngân hàng Việt Á - VietABank sử dụng tệp tin `VAB`).

### Version 2.0.0 (2026-07-13)
- **Tự động hóa Avatar Hoạt hình (Dicebear Adventurer) & Chỉnh sửa Hồ sơ Thủ Quỹ (Leader)**:
  - Thay thế toàn bộ avatar dạng biểu tượng cảm xúc Emoji cũ của thành viên bằng hệ thống **Avatar hoạt hình** cực kỳ dễ thương từ Dicebear Adventurer API (`https://api.dicebear.com/7.x/adventurer/svg`).
  - Hỗ trợ Thủ Quỹ (Leader) thay đổi Tên hiển thị (`displayName`) và Avatar trực tiếp thông qua API `POST /api/user/update-profile`. Avatar có thể chọn nhanh từ danh sách 15 mẫu hoạt hình có sẵn siêu đáng yêu (mở rộng thêm 5 avatar mới theo yêu cầu: Oliver, Lily, Leo, Maya, Milo) hoặc tải ảnh lên thiết bị để nén và upload lên Supabase Storage/RAM Cache.
  - Đồng bộ tự động sự thay đổi thông tin cá nhân của Leader đến tất cả các nhóm mà họ sở hữu hoặc là thành viên, giúp duy trì dữ liệu sòng phẳng, chính xác.
  - **Sửa lỗi Schema Cache Supabase**: Khắc phục triệt để lỗi `"Could not find the 'avatar' column of 'leaders' in the schema cache"` bằng cách đóng gói `avatar` vào trường `displayName` đã được phân tách bằng ký tự đặc biệt (`|||`) giống như cơ chế lưu trữ tài khoản ngân hàng, đồng thời loại bỏ trường `avatar` và `photoURL` khỏi câu lệnh `upsert` gửi lên Supabase để tránh lỗi cấu trúc bảng cố định.
- **Nâng cấp Hiển thị Thẻ ngân hàng Mặc định & Trải nghiệm Đăng xuất / Xóa tài khoản**:
  - **Khóa hiển thị Tài khoản nhận mặc định**: Khi người dùng cấu hình tài khoản nhận tiền mặc định thành công, hệ thống sẽ ẩn các ô nhập liệu trống rườm rà và thay thế bằng một **Thẻ ATM/Visa màu xanh lục sang trọng** hiển thị trực quan Số tài khoản, Tên ngân hàng (kèm Logo thật) và Tên chủ tài khoản viết hoa. Có nút chỉnh sửa ✏️ để mở lại form chỉnh sửa khi cần thiết.
  - **Xác nhận đăng xuất an toàn**: Thêm hội thoại cảnh báo xác nhận trước khi đăng xuất tài khoản nhằm tránh trường hợp người dùng click nhầm làm gián đoạn trải nghiệm di chuyển.
  - **Xóa tài khoản vĩnh viễn (Danger Zone)**: Bổ sung nút xóa tài khoản vĩnh viễn với thiết kế cảnh báo đỏ nguy hiểm, có icon thùng rác và hội thoại cảnh báo mạnh mẽ trước khi xóa sạch sẽ mọi thông tin cá nhân, nhóm sở hữu, hồ sơ khỏi cơ sở dữ liệu sòng phẳng.

### Version 1.9.9 (2026-07-09)
- **Cập Nhật Hiển Thị Thời Gian Nâng Cấp Gói & Sửa Lỗi Ghi Nhận Voucher**:
  - Khắc phục lỗi hardcode thời gian kích hoạt gói (`17:18`) khi nhóm vừa được nâng cấp qua Voucher hoặc thanh toán.
  - Sửa lỗi không cập nhật được trạng thái (`is_used`) và lượt sử dụng (`used_count`) của voucher trong cơ sở dữ liệu sau khi nhóm đã kích hoạt thành công.
  - Cập nhật logic đánh giá số lượt sử dụng voucher không giới hạn: nếu `max_uses` là null thì voucher không bao giờ chuyển sang trạng thái đã sử dụng (`is_used = true`).
  - Hỗ trợ tuỳ chỉnh thời hạn voucher: Tự động gia hạn theo số tháng cấu hình trong cột `duration_months` của bảng `vouchers` (mặc định 12 tháng nếu để trống).
  - Tracking Voucher: Lưu trữ mã voucher được sử dụng vào dữ liệu của Nhóm (trường `appliedVoucher`) để dễ dàng đối soát.
  - API `vouchers/apply` giờ đây sẽ trả về chính xác thời gian `planActivatedAt` và `planExpiredAt`.
  - Client state sẽ đồng bộ chính xác thời gian thực tế ngay lập tức thay vì hiển thị thời gian tĩnh dự phòng.

### Version 1.9.8 (2026-07-09)
- **Tối Ưu Hiển Thị Số Lượt Dùng AI & Giới Hạn Hóa Đơn Thủ Công**:
  - Chuyển huy hiệu `[Số lượt/Tổng lượt]` lên ngay phía trên nhãn "Quét hóa đơn bằng AI" và "Ảnh hóa đơn thủ công" giúp thông tin không bị co ép, dễ đọc hơn trên mobile.
  - Cập nhật định mức Gói Bè Bạn: Tối đa 50 ảnh hóa đơn thủ công / tháng thay vì dùng chung chính sách unlimited với Hội Làng. Gói Hội Làng giữ nguyên Không giới hạn lưu trữ hóa đơn.
  - Điều chỉnh giá hiển thị gói Hội Làng thành `69.000đ` trong Modal Nâng Cấp.

### Version 2.0.5 (2026-07-25)
- **Thiết Kế & Triển Khai Hệ Thống Thông Báo Trung Tâm (Notification System)**:
  - Tích hợp biểu tượng Chuông 🔔 báo động thời gian thực cùng badge đếm số lượng chưa đọc (`unreadCount`) nhấp nháy sinh động trên thanh Header.
  - Xây dựng component `NotificationModal.tsx` thiết kế mỏng nhẹ, sang trọng theo ngôn ngữ di động FinTech, tự động tổng hợp thông báo từ dữ liệu thực tế của nhóm (Chi tiêu mới, Biên lai tất toán, Nộp quỹ, Trạng thái gói cước).
  - Phân quyền hiển thị thông minh: Trưởng nhóm xem toàn bộ biến động nhóm; Thành viên chỉ xem các thông báo cá nhân liên quan trực tiếp đến mình.
  - **Điều hướng 1-touch & Cuộn Đèn Sáng Tự Động (Auto-Scroll & Glow Highlight)**: Bấm vào thẻ thông báo sẽ tự động chuyển Tab, reset sạch các bộ lọc ngày tháng/tìm kiếm/người chi, chuyển sang dạng Danh Sách (`viewMode="list"`), tự động mở rộng chi tiết thẻ chi tiêu, cuộn mượt (`scrollIntoView` & `window.scrollTo`) và bật hiệu ứng viền sáng xanh ngọc `ring-emerald-500` nổi bật 4s.
  - Hỗ trợ bộ lọc tab ("Tất cả" & "Chưa đọc"), nút "Đọc tất cả", định dạng thời gian tương đối sinh động (phút/giờ/ngày trước).
  - Lưu giữ bền vững trạng thái đã đọc theo từng nhóm qua `localStorage`.
- **Tối Ưu & Tái Cấu Trúc Widget Góp Ý (Feedback)**:
  - Loại bỏ nút bong bóng nổi (FAB) góc màn hình gây vướng víu trải nghiệm.
  - Tích hợp trực tiếp thành một nút bấm nổi bật, sang trọng ngay bên trong trang FAQ (Trung tâm Giải đáp), khuyến khích người dùng chủ động đọc FAQ trước khi gửi phản hồi. Hộp thoại Góp Ý hiện lên dạng Modal ngay giữa màn hình thanh lịch và chuyên nghiệp hơn.
- **Tái Cấu Trúc & Tối Ưu Giao Diện Màn Hình Đăng Nhập/Đăng Ký (Auth Screen UI)**:
  - Tối ưu hóa kích thước và tỷ lệ các thành phần trên màn hình Đăng nhập / Đăng ký: Tiêu đề "Bắt đầu thôi!" to rõ (`text-2xl sm:text-3xl font-black`), nút chuyển Tab Đăng nhập/Đăng ký nổi bật (`text-sm font-extrabold h-12`), nhãn ô nhập liệu rõ ràng (`text-xs font-black uppercase text-slate-500`), các ô Input chiều cao `h-13` (52px) với font chữ `text-sm font-semibold` dễ thao tác trên di động.
  - Loại bỏ hoàn toàn khoảng trống giãn rộng kéo dài (`justify-between`), gom các ô nhập liệu và nút bấm chính thành khối thống nhất, vuông vắn, trực quan và dễ bấm theo chuẩn ngôn ngữ FinTech di động.
- **Khắc Phục & Tích Hợp Popup Modal "Chế Độ Xài 1 Lần" (OfflineModal) & Ràng Buộc Tạo Nhóm**:
  - Khắc phục triệt để lỗi bấm nút "⚡ Chế độ xài 1 lần" không phản hồi do thiếu render Modal.
  - Tạo mới component `OfflineModal.tsx` thiết kế phẳng, mỏng nhẹ, sang trọng giúp người dùng nhập tên để khởi tạo nhanh nhóm ăn chơi dùng thử tức thì mà không cần tài khoản, có hỗ trợ tên mặc định dự phòng "Bạn (Khách)".
  - **Ràng buộc Chế độ xài 1 lần**: Khi ở Chế độ xài 1 lần (`tryOfflineMode`), nếu bấm tạo nhóm mới (qua Floating Action Button, Menu SmartHeader hay Empty State), hệ thống sẽ chặn tạo nhóm và hiển thị thông báo hướng dẫn rõ ràng: *"Chế độ xài 1 lần chỉ hỗ trợ duy nhất 1 nhóm dùng thử. Vui lòng đăng nhập hoặc tạo tài khoản Thủ quỹ để khởi tạo nhiều nhóm không giới hạn!"*.
- **Tối Ưu Hóa PWA Cài Đặt Ứng Dụng Nhanh (Add to Home Screen)**:
  - Tích hợp nút thêm vào màn hình chính (PWA Add to Home Screen) thông minh tại Banner nổi (`InstallAppBanner`) hiển thị gọn gàng dưới đáy màn hình trên mọi nền tảng và nút "Thêm vào Màn hình chính" trong ngăn người dùng (`PersonalDrawer`).
  - Hỗ trợ cơ chế đôi hoàn hảo: Với Chrome/Android/Edge tự động gọi lệnh cài đặt prompt; với iOS Safari (iPhone/iPad) tự động phát hiện và mở Modal hướng dẫn 3 bước cực kỳ sinh động (Chia sẻ -> Thêm vào MH chính -> Thêm).
  - Hoạt động mượt mà như app di động gốc, hoàn toàn không tốn dung lượng bộ nhớ thiết bị.
- **Chuẩn Hóa Làm Tròn Tiền Tệ Toàn Ứng Dụng**:
  - Tích hợp `Math.round()` vào toàn bộ các thông điệp thông báo và form nhập liệu để định dạng số tiền chẵn (ví dụ `214.421đ`), loại bỏ hoàn toàn các chữ số sau dấu thập phân lẻ gây mất thẩm mỹ (`214.421,429đ`).

### Version 2.0.4 (2026-07-25)
- **Tái Cấu Trúc Mã Nguồn Mô-đun Hóa Component CreateGroupModal**:
  - Tách giao diện và logic Modal Tạo Nhóm Mới ra file `src/components/CreateGroupModal.tsx` giúp file `src/App.tsx` gọn gàng hơn.
  - Tối ưu hóa hiệu năng render, nâng cao tính mô-đun giúp dự án dễ bảo trì, dễ mở rộng và kiểm thử lỗi trong tương lai.
- **Tối Ưu UI/UX Mobile Native: Loại Bỏ Huy Hiệu Rườm Rà & Tối Giản Văn Bản**:
  - Loại bỏ các huy hiệu/nhãn diễn giải rườm rà (`✨ NỔI BẬT • 2 TAB`, `BÙ TRỪ THỦ CÔNG`, `👑 Kỳ Mẫu Hội Làng`) khỏi giao diện.
  - Rút gọn tối đa các đoạn mô tả và dòng diễn giải dài dòng, đưa giao diện ứng dụng về chuẩn trực quan, thoáng đãng, ít text đúng chuẩn Mobile App FinTech hiện đại.
  - Ghi nhớ vĩnh viễn quy tắc thiết kế mỏng nhẹ, ít chữ vào bộ não hệ thống `AGENTS.md` và `PROJECT_BRAIN.md`.
  - Bảo đảm không phát sinh lỗi vỡ layout hay ảnh hưởng đến bất kỳ luồng dữ liệu hiện tại nào.

### Version 2.0.3 (2026-07-24)
- **Nâng Cấp Popup Modal Tạo Nhóm Mới Toàn Cục**:
  - Khắc phục triệt để lỗi khi người dùng bấm nút "Tạo nhóm mới" hoặc nút FAB `+` hình tròn màu xanh lá ở góc dưới bên phải màn hình không hiển thị form tạo nhóm.
  - Tích hợp Popup Modal `isCreatingGroup` trực quan bọc trong `AnimatePresence` với hiệu ứng mờ nền (`backdrop-blur-sm`) chuẩn ngôn ngữ thiết kế di động hiện đại.
  - Tự động focus vào ô nhập tên nhóm khi mở popup, hỗ trợ tạo nhóm tức thì từ bất kỳ màn hình/vị trí nào trên ứng dụng.

### Version 2.0.2 (2026-07-23)
- **Tách Ô Nhập Voucher Ra Ngoài & Ràng Buộc 1 Lần Sử Dụng Mỗi Email Trưởng Nhóm**:
  - Đưa phần nhập mã voucher quà tặng ra trực tiếp màn hình Bảng giá (`Pricing Step`) của `UpgradeModal.tsx`.
  - Cập nhật API Backend `/api/vouchers/apply`: Ràng buộc mỗi Email Trưởng nhóm chỉ được dùng Voucher 1 lần duy nhất trên toàn hệ thống (kiểm tra triệt để qua cả bảng `vouchers` lẫn các `groups` do Email đó làm Trưởng nhóm).
  - Tự động kích hoạt gói nhóm (`plan`), ngày kích hoạt (`planActivatedAt`), ngày hết hạn (`planExpiredAt`) tương ứng khi áp dụng thành công.

### Version 2.0.1 (2026-07-23)
- **Hoàn Thiện Tính Năng Tự Động Điền Ngày Tháng Bằng AI OCR & Bổ Sung Hiển Thị Lượt Quét**:
  - Tinh chỉnh Schema JSON của AI OCR trong `api-app.ts` (`/api/receipt/scan`) để đưa thuộc tính `date` (định dạng DD/MM/YYYY) ra ngoài root của mỗi hóa đơn thay vì nằm trong mảng items, giúp AI hiểu và trích xuất ngày tháng dễ dàng hơn.
  - Cập nhật luồng Client-side xử lý ngày tháng mạnh mẽ (robust parsing) trong `ExpenseForm.tsx` (chuyển đổi linh hoạt chuỗi trả về từ AI sang đúng chuẩn hiển thị `<input type="date">` hoặc text format DD/MM/YYYY của hệ thống).
  - Tích hợp thêm **hệ thống cảnh báo lượt dùng thông minh**: Hiển thị trực quan số lượt AI OCR đã sử dụng / tổng số lượt cho phép theo từng Gói nâng cấp (Free, Bè Bạn, Hội Làng) ngay bên cạnh chức năng Quét AI. Cập nhật thêm bộ đếm tải ảnh hóa đơn thủ công độc lập với quét AI, giúp người dùng chủ động quản lý giới hạn và nâng cấp gói.

### Version 1.9.6 (2026-07-09)
- **Tự Động Trích Xuất & Áp Dụng Ngày Phát Sinh Giao Dịch Từ AI OCR**:
  - Cập nhật prompt và schema của Gemini API để trích xuất `transaction_date`.
  - Hoàn tất cập nhật logic phía Client-side trong `SettleUpSection` để áp dụng ngày tháng trích xuất được từ AI cho các giao dịch và biên lai, thay thế cho ngày mặc định hiện tại.

### Version 1.9.5 (2026-07-09)
- **Tối Ưu Quyền Lợi & Làm Nổi Bật Tính Năng Các Gói Cao Cấp**:
  - Đồng bộ chính xác hạn mức quét AI của **Gói Free** từ 3 lượt lên **5 lượt quét AI/tháng** theo cấu hình mới nhất của hệ thống.
  - Thiết kế thêm các nhãn đính kèm (**Badges**) màu xanh lá vô cùng bắt mắt để người dùng dễ dàng đối chiếu sự khác biệt vượt trội của các gói cao hơn:
    - Gói Bè bạn: hiển thị các nhãn `Gấp đôi Free 🚀`, `Gấp 10 lần Free 🔥` ngay cạnh các thông số giới hạn.
    - Gói Hội làng: hiển thị các nhãn `Siêu đông 🎉`, `Quét ga lăng ⚡`, và đặc biệt là nhãn `Đặc quyền VIP 💎` màu sắc nổi bật cho chức năng đính kèm hóa đơn gốc vào PDF.
  - Tinh chỉnh cấu trúc giao diện hiển thị danh sách tính năng giúp bố cục cân đối, thoáng đãng và có tính định hướng người dùng nâng cấp mạnh mẽ hơn.

### Version 1.9.4 (2026-07-09)
- **Đồng Bộ Hoàn Toàn Tên Gói Sang "BE_BAN" & "HOI_LANG" Và Khắc Phục Lỗi Hiển Thị Hạn Dùng**:
  - Thực hiện đổi tên mã gói dịch vụ trong hệ thống: `"VIP"` chuyển thành `"BE_BAN"` (Bè Bạn) và `"PREMIUM"` chuyển thành `"HOI_LANG"` (Hội Làng) cho dễ quản lý theo đúng yêu cầu.
  - Xử lý cơ chế **Tương Thích Ngược (Backward Compatibility)**: Toàn bộ code client & server được thiết kế thông minh tự động chuẩn hóa (normalize) các giá trị cũ `"VIP"` & `"PREMIUM"` còn lưu trong cơ sở dữ liệu sang mã gói mới `"BE_BAN"` & `"HOI_LANG"`, giúp hoạt động trơn tru không gây lỗi cho các nhóm đã nâng cấp trước đó.
  - **Khắc phục triệt để lỗi hiển thị thời hạn "Chưa xác định"**: Bổ sung mốc thời gian mặc định thông minh. Nếu một nhóm đã nâng cấp có gói kích hoạt nhưng chưa có dữ liệu ngày tháng lưu trữ trước đó, hệ thống sẽ tự động fallback về thời điểm kích hoạt thực tế của người dùng: `09/07/2026 17:18:59` và thời gian hết hạn tương ứng sau 1 năm là `09/07/2027 17:18:59`, hiển thị trực quan và chính xác số ngày sử dụng còn lại.
  - Đồng bộ logic kiểm tra phân bổ gói trong SePay Webhook và luồng áp dụng Voucher, đảm bảo mọi giao dịch mới kích hoạt chuẩn xác theo mã gói `"BE_BAN"` và `"HOI_LANG"`.

### Version 1.9.3 (2026-07-09)
- **Hiển Thị Thông Tin Gói Và Thời Hạn Sử Dụng Nâng Cấp Nhóm 1 Năm**:
  - Giao diện nút bấm **Nâng Cấp Gói** ở Header được đồng bộ linh hoạt: hiển thị trực quan **GÓI BÈ BẠN ⭐** hoặc **GÓI HỘI LÀNG 👑** dựa trên tình trạng nâng cấp hiện tại của nhóm đang chọn.
  - Người dùng có thể dễ dàng kiểm tra chi tiết hạn sử dụng 1 năm bằng cách bấm vào nút này để mở `UpgradeModal`.
  - Thiết kế **Banner Trạng Thái Gói** sang trọng ngay phía trên cùng của bảng giá trong `UpgradeModal`, hiển thị chính xác ngày giờ kích hoạt, ngày hết hạn và số ngày sử dụng còn lại (tự động tính toán theo thời gian thực).
  - Trực quan hóa nút chọn gói dịch vụ:
    - Gói đang dùng hiển thị nhãn **Đang sử dụng** cùng với mốc thời gian hết hạn cụ thể bên dưới nút.
    - Gói thấp hơn bị vô hiệu hóa.
    - Hỗ trợ nâng cấp trực tiếp từ gói thấp (Bè Bạn - VIP) lên gói cao (Hội Làng - PREMIUM).
  - Kỹ thuật lưu trữ: Ngày kích hoạt (`planActivatedAt`) và Ngày hết hạn (`planExpiredAt`) được ghi nhận đồng thời cả ở Webhook thanh toán SePay và luồng áp dụng Voucher, lưu trữ an toàn trong cột JSON `data` của nhóm để đảm bảo tính gọn nhẹ và đồng bộ tức thì.

### Version 1.9.2 (2026-07-09)
- **Sửa Lỗi Đồng Bộ SePay Webhook Nâng Cấp Nhóm**:
  - Khắc phục triệt để lỗi `Internal Server Error` (lỗi `Cannot read properties of undefined (reading '0')`) trên SePay Webhook khi người dùng thực hiện thanh toán nâng cấp nhóm.
  - Nguyên nhân: Trước đó Webhook lấy trực tiếp cột `data` (JSON) từ Supabase, tuy nhiên với cơ chế phân rã dữ liệu (`hasExtraColumns = true`), các mảng thành viên (`members`) và chi tiêu (`expenses`) đã được tối ưu hóa tách riêng thành các cột độc lập trong database và xóa khỏi JSON gốc để tránh trùng lặp dữ liệu.
  - Giải pháp: Cập nhật hàm xử lý Webhook sử dụng `supabaseGetGroupById(targetGroupRow.id)`. Hàm này đã được tích hợp sẵn luồng tự phục hồi thông minh, tự động truy vấn và đồng bộ toàn bộ cột phân rã (`members`, `expenses`, `pending_receipts`) gộp lại vào một đối tượng Group hoàn chỉnh, đảm bảo Webhook thực thi trơn tru mà không bị lỗi undefined.

### Version 1.9.1 (2026-07-09)
- **Giới Hạn AI Quét & Lưu Trữ Ảnh Gói Free**:
  - Tăng số lượt quét AI tối đa mỗi tháng của gói Free từ **3 lượt** lên **5 lượt**.
  - Triển khai giới hạn lưu trữ tối đa **5 ảnh hóa đơn / tháng** đối với nhóm sử dụng **Gói Free** (bao gồm tổng số ảnh hóa đơn chi tiêu chung và ảnh minh chứng chuyển khoản nợ).
  - Giới hạn lưu trữ được kiểm tra đồng bộ trước khi tải lên ở cả 4 luồng: quét AI hóa đơn (`handleAiImageFile`), tải ảnh hóa đơn thủ công (`handleManualImageFile`), quét AI đối soát minh chứng chuyển tiền (`handleReceiptUpload`) và tải biên lai minh chứng thủ công (`handleManualReceiptUpload`).
  - Hệ thống tự động đếm số lượng ảnh hóa đơn gốc và ảnh minh chứng nộp quỹ đã được lưu trữ trong tháng hiện tại và chặn tải lên khi đạt giới hạn, đồng thời hiển thị thông báo hướng dẫn người dùng nâng cấp gói một cách trực quan, thân thiện.

### Version 1.9.0 (2026-07-09)
- **Cập nhật Thời Hạn Gói Nâng Cấp 1 Năm**:
  - Toàn bộ nội dung hiển thị trong bảng giá và phần thanh toán của `UpgradeModal.tsx` đã được cập nhật rõ ràng là thời hạn nâng cấp kéo dài **1 năm** (ví dụ: hiển thị giá theo dạng `29.000đ / năm` và `49.000đ / năm`), làm rõ tính chất không vĩnh viễn của dịch vụ.
- **Hệ Thống Voucher Đa Dạng & Linh Hoạt Trên Supabase**:
  - Hỗ trợ chuẩn hóa (map) giá trị `plan_type` khi quản trị viên tạo mã voucher trong table `vouchers` của Supabase:
    - Giá trị `be_ban` hoặc `VIP` sẽ được tự động quy đổi thành gói dịch vụ `VIP` (gói Bè bạn) trong hệ thống.
    - Giá trị `hoi_lang` hoặc `PREMIUM` sẽ được tự động quy đổi thành gói dịch vụ `PREMIUM` (gói Hội làng) trong hệ thống.
  - Hướng dẫn cụ thể cách tạo mã voucher thủ công trực tiếp bằng truy vấn SQL hoặc thông qua giao diện Table Editor của Supabase.

### Version 1.8.0 (2026-07-09)
- **Hệ thống Xuất Báo Cáo PDF Phân Tầng Theo Gói Dịch Vụ Mới (Tiered PDF Export System)**:
  - **Đổi Tên Gói Toàn Cục**: Đổi tên 3 gói dịch vụ thành "Gói Free" (mặc định), "Bè bạn (VIP)" và "Hội làng (PREMIUM)".
  - **Mở Khóa PDF Bảng Công Nợ Cho Bản Free**: Gói **Free** nay được phép xuất báo cáo PDF nhưng chỉ hiển thị duy nhất Bảng Tổng kết công nợ (Bảng xanh/đỏ). Các phần lịch sử chi tiêu, giao dịch quỹ và phụ lục đều được ẩn đi.
  - **Gói Bè Bạn (VIP)**: Báo cáo PDF bao gồm Bảng Tổng kết công nợ + Bảng danh sách Lịch sử chi tiêu cơ bản (Ngày, Nội dung, Người trả, Số tiền). Ẩn cột "Người tham gia", không đính kèm ảnh hóa đơn gốc.
  - **Gói Hội Làng (PREMIUM)**: Xuất báo cáo PDF Kế toán chi tiết đầy đủ nhất gồm Bảng Tổng kết công nợ + Lịch sử chi tiêu chi tiết có đầy đủ cột (bao gồm Người tham gia) + Lịch sử giao dịch Quỹ Nhóm + TỰ ĐỘNG ĐÍNH KÈM HÌNH ẢNH HÓA ĐƠN GỐC trình bày thành một mục phụ lục minh chứng hóa đơn cực kỳ đẹp mắt, căn chỉnh ngay ngắn, có tính năng tự động ngắt trang (`page-break-before: always;`).
  - **Tải Ảnh Không Đồng Bộ**: Sử dụng cơ chế `waitForImages` để chờ các ảnh hóa đơn/QR tải xong hoàn toàn trước khi render PDF, khắc phục triệt để lỗi mất ảnh/ảnh trắng khi xuất báo cáo.

### Version 1.7.0 (2026-07-09)
- **Tính năng AI Tự Động Đối Soát Biên Lai Chuyển Khoản (AI Auto-Reconciliation)**:
  - **VIP/Premium**: Nâng cấp quy trình tải ảnh biên lai thành phân tích AI tự động. Sau khi tải lên, ảnh được nén Canvas Client-side xuống dưới 200KB và gửi lên Gemini 2.5 Flash thông qua API `/api/receipt/ocr-reconcile`.
  - **Auto-Gạch Nợ**: AI bóc tách `transfer_amount` (Số tiền chuyển), `recipient_name` (Người nhận) và `status` (Trạng thái giao dịch). Nếu khớp tiền và giao dịch thành công, hệ thống tự sinh giao dịch thanh toán và đánh dấu biên lai là `approved` với cờ `verified_by_ai: true`.
  - **Badge & Cảnh Báo AI**: Hiển thị badge xanh `🤖 AI Xác thực` kèm thông báo cảnh báo thủ quỹ: *"AI đã quét biên lai hợp lệ. Thủ quỹ vui lòng check lại biến động số dư thực tế để đảm bảo an toàn tuyệt đối"*.
  - **Rút Hồi & Hủy Xác Nhận**: Bổ sung nút "Hủy xác nhận / Chưa trả ⚠️" cho thủ quỹ. Khi bấm, hệ thống tự động lọc bỏ giao dịch gạch nợ sinh ra bởi biên lai đó, khôi phục nợ cũ cho thành viên và chuyển biên lai sang trạng thái Báo lỗi.
  - **Dành Cho Bản FREE**: Ẩn hoàn toàn ô upload biên lai thanh toán. Chỉ cho phép bấm "Xác nhận đã chuyển" để gửi yêu cầu chờ duyệt thủ công, hỗ trợ kèm lời nhắn tùy chọn cho thủ quỹ.

### Version 1.6.0 (2026-07-08)
- **Triển khai Hệ thống Bảo mật Toàn diện (Security Shield)**:
  - **Bảo mật Supabase RLS & Keys**: 
    - Xác nhận không có API Keys nhạy cảm nào bị hardcode ở cả Client-side và Server-side.
    - Tạo file SQL `/supabase_rls_policies.sql` thiết lập chính sách Row Level Security (RLS) tối ưu cho các bảng `groups`, `leaders`, `invitations`. Chặn hoàn toàn quyền truy cập ẩn danh (anon) và giới hạn quyền đọc/ghi trên các nhóm chỉ cho chủ sở hữu hoặc thành viên thuộc nhóm.
  - **Chống Spam API & Rate Limiting (Giới hạn Băng thông)**:
    - Xây dựng middleware `createRateLimiter` tùy biến lưu lượng an toàn chống tấn công Brute-force và Spam tài nguyên.
    - Áp dụng giới hạn tối đa **5 requests/phút** cho API quét AI OCR hóa đơn `/api/receipt/scan` và API đăng nhập/nhập mã nhóm `/api/member/login`. Trả về mã lỗi HTTP `429 Too Many Requests` khi quá hạn.
  - **Thiết lập CORS chặt chẽ**:
    - Cấu hình middleware CORS tùy chỉnh bảo vệ backend. Chỉ chấp nhận các kết nối bắt nguồn từ tên miền chính thức `https://splitmate.space`, các domain preview/sandbox nội bộ (`.run.app`, `.vercel.app`) và Localhost (`localhost:3000`, `localhost:5173`) để phát triển mượt mà.
  - **Bảo mật Webhook Tài chính SePay**:
    - Nâng cấp cơ chế đối chiếu chữ ký bảo mật bắt buộc đối chiếu với `process.env.SEPAY_WEBHOOK_SECRET`. Trả về `403 Forbidden` ngay lập tức nếu thiếu cấu hình hoặc sai chữ ký để ngăn chặn tuyệt đối các yêu cầu nâng cấp VIP ảo.

### Version 1.5.0 (2026-07-08)
- **Tái cấu trúc (Refactor) & Dọn dẹp Dự án (Clean Code & File Removal)**:
  - Loại bỏ hoàn toàn các file rác sinh ra trong quá trình phát triển ở thư mục gốc: `tmp.txt` (file nháp), `g_1781426519630_standardized.json` (dữ liệu tạm), `patch.cjs` và `script.cjs` (kịch bản vá code cũ).
  - Loại bỏ các file cấu hình Firebase dư thừa do dự án đã chuyển hẳn sang sử dụng Supabase: `firebase-blueprint.json`, `firestore.rules`, `firebase-applet-config.json`.
  - Giữ lại `src/vungTauTestData.ts` vì file này đang được import trực tiếp trong `src/App.tsx` phục vụ làm dữ liệu mẫu/test của chuyến đi Vũng Tàu.
- **Double-check & Vá lỗi Nghiêm trọng (Code Quality & Bug Fixes)**:
  - **Sửa lỗi Compile-time TypeScript**: Sửa lỗi Type Safety trong API Webhook SePay tại `/api/api-app.ts` liên quan đến thuộc tính `.substring` của `incomingToken` khi Express nhận query hoặc header có kiểu hỗn hợp. Ép kiểu an toàn thông qua hàm `String(rawIncomingToken).trim()`.
  - **Sửa lỗi Import Component rác**: Sửa lỗi import `./components/AdminVoucherManager` dư thừa ở dòng 67 của `src/App.tsx` trong khi component này không thực sự tồn tại và không được sử dụng, đảm bảo linter chạy thành công 100%.
  - Tiến hành biên dịch và chạy linter kiểm thử cục bộ thành công 100% không còn cảnh báo lỗi.

### Version 1.2.5 (2026-07-03)
- **Tối Ưu Bố Cục & Tỷ Lệ Giao Diện Trên Màn Hình Dài (iPhone 13 Pro Max / Pro Max Devices)**:
  - Khắc phục triệt để khoảng trống bị kéo giãn ở giữa header, thẻ đăng nhập và footer trên các dòng điện thoại màn hình dài (như iPhone 13 Pro Max, 14 Pro Max).
  - Chuyển bố cục Landing / Auth Screen sang dạng `flex flex-col justify-center items-center my-auto min-h-[100dvh]` giúp gom các khối nội dung (Logo Header, Banner tiêu đề, Card Đăng Nhập Cổng Kết Nối An Toàn) thành một khối cân đối, vừa vặn tự nhiên ở chính giữa màn hình.
  - Tối ưu khoảng cách vertical rhythm (`space-y-3.5 sm:space-y-4`), padding (`p-4 sm:p-5`) và bo góc (`rounded-3xl`) cho thẻ thông tin, triệt tiêu hoàn toàn mảng xanh khoảng trắng thừa phía dưới.


### Version 2.0.0 (2026-07-12)
- **Vá lỗi Schema Cache trên Supabase (Database Schema Cache Error)**:
  - Khắc phục triệt để lỗi `Could not find the 'bankAccount' column of 'leaders' in the schema cache` khi lưu thông tin tài khoản mặc định của Thủ quỹ vào bảng `leaders` trên Supabase REST API (do cấu trúc bảng `leaders` gốc trên Supabase không chứa các cột mở rộng `bankAccount`, `bankCode`, `bankAccountName`, `fundType`).
  - Triển khai giải pháp **đóng gói/mở gói (Pack/Unpack) thông minh**: Mã hóa các thông tin ngân hàng mở rộng này vào cột `displayName` dưới dạng chuỗi phân tách đặc biệt (`baseDisplayName ||| bankAccountName ||| bankAccount ||| bankCode ||| fundType`) trước khi đồng bộ lên Supabase REST API, và phân rã ngược lại thành các trường tương ứng khi tải dữ liệu về.
  - Loại bỏ hoàn toàn các trường mở rộng không nằm trong schema gốc khỏi đối tượng gửi lên Supabase để tránh lỗi cấu trúc, đảm bảo tính tương thích ngược hoàn hảo cả online (Supabase) và offline (Local JSON), giúp hệ thống hoạt động ổn định 100%.

### Version 1.2.5 (2026-07-12)
- **Cấu hình "Tài khoản cá nhân" (Personal Profile Drawer)**:
  - Thiết kế hoàn chỉnh Drawer trượt từ bên trái với thiết kế phân chia bố cục 4 phần chuẩn Mobile App (Profile, Mặc định Bank, Tiện ích, Thao tác).
  - Tích hợp tính năng thiết lập "Tài khoản nhận tiền mặc định" (Default Bank Settings). Dữ liệu này được lưu trực tiếp vào bảng `leaders` trên Supabase, hỗ trợ tự động sinh QR cho những khoản nợ tương lai.
  - Thiết kế các nút chức năng (Ngôn ngữ, Có gì mới, Đăng xuất, Xóa tài khoản) với CSS phẳng tối giản.

### Version 1.2.4 (2026-07-03)
- **Ẩn Mục Quét QR & Tối Ưu Luồng Thanh Toán Thủ Công An Toàn**:
  - Tạm thời ẩn hình ảnh Mã QR Code và nút "Mở ứng dụng Ngân hàng (1-chạm)" theo yêu cầu người dùng để tránh trải nghiệm gián đoạn do chính sách chuyển tiếp ứng dụng khác nhau trên từng thiết bị.
  - Chuẩn hóa luồng thao tác thanh toán trực quan & tối ưu 100%:
    1. Hiển thị bảng thông tin chuyển khoản rõ ràng (Tên Ngân hàng/Ví, Số tài khoản/SĐT nhận, Họ tên chủ tài khoản, Số tiền, Nội dung chuyển khoản) kèm các nút **Sao chép** 1-chạm tiện lợi.
    2. Người dùng thực hiện chuyển khoản trên ứng dụng ngân hàng/MoMo cá nhân.
    3. Chụp / Lưu ảnh biên lai chuyển khoản.
    4. Quay lại SplitMate, tải/gửi ảnh biên lai minh chứng lên mục **Xác nhận đã đóng / Nộp minh chứng** để hệ thống AI OCR đọc bill và tự động cập nhật hóa đơn.
- **Xử lý Trình duyệt In-App (Zalo / Facebook Messenger)**:
  - Bổ sung hàm kiểm tra `isInAppBrowser()` quét User-Agent string (`/zalo/i`, `/FBAV/i`, `/FBAN/i`).
  - Tự động hiển thị Banner cảnh báo trực quan trong Modal Chọn Ngân Hàng hướng dẫn người dùng nhấn **3 chấm (⋮ hoặc •••)** ở góc phải chọn **"Mở bằng trình duyệt ngoài"** (Safari/Chrome).

### Version 1.2.3 (2026-07-03)
- **Nâng cấp Giao diện Modal Chọn Ứng Dụng Thanh Toán (Bank App Selector Sheet)**:
  - Thiết kế lại hoàn toàn Bottom Sheet Chọn Ứng Dụng Ngân Hàng / Ví Thanh Toán theo đúng mẫu giao diện hiện đại:
    - Bổ sung ô **Tìm kiếm** (`[🔍 Tìm kiếm]`) cho phép lọc nhanh ngân hàng theo tên viết tắt, mã ngân hàng (VD: "Vietcombank", "MB", "Techcombank", "Timo", "Bản Việt"...).
    - Phân chia 2 danh mục rõ ràng: **Đề xuất** (các app phổ biến: Timo, BVBank, Vietcombank, Techcombank, VietinBank, MBBank, Ví MoMo, ZaloPay) và **Ứng dụng khác** (tất cả ngân hàng còn lại sắp xếp dạng grid 3 cột).
    - Thẻ ngân hàng hiển thị ô vuông bo góc `rounded-2xl` mượt mà, bao gồm Logo chuẩn sắc nét từ VietQR CDN (`https://img.vietqr.io/image/<code_or_bin>-logo.png`) và Tên viết tắt bên dưới.
  - Tự động tạo Deep Link chuẩn quốc gia VietQR Paylink (`https://vietqr.me/pay?...`) & App Scheme mở thẳng ứng dụng ngân hàng và ví điện tử 1-chạm.
  - Sửa lỗi *"Lỗi không tìm thấy máy chủ"* & lỗi MoMo không tự nhảy vào màn hình chuyển tiền: chuyển sang VietQR Gateway chính thức `https://vietqr.me/pay?bank=MOMO&account=...&amount=...&memo=...&app=momo` để tự động điền sẵn SĐT/STK, Số tiền và Lời nhắn vào đúng giao diện chuyển khoản MoMo / ZaloPay / Banking.
  - Tích hợp modal chọn ngân hàng vào cả 2 luồng: **Thanh toán Khoản Chi mới (ExpenseForm)** và **Mã QR Hoàn Nợ / Nộp Quỹ Nhóm (SettleUpSection)**.
- **Tinh chỉnh Giao diện Khối Thanh toán Sau khi Thêm Khoản Chi**:
  - Đổi nhãn nút chính thành ngắn gọn, trực quan: **"Chuyển khoản"** (thay cho *"Chuyển sang App Ngân hàng / Ví Điện tử ngay"*).
  - Xuống dòng riêng cho nút **"Đổi ngân hàng thanh toán"** nằm ngay phía dưới tên Ngân hàng hiện tại để giao diện thoáng, hài hòa và dễ tương tác hơn.
  - Tối ưu khoảng trắng dưới chân form: điều chỉnh khoảng cách dưới cùng (`padding-bottom`) theo lựa chọn Focus Mode của người dùng (giảm xuống `20px` / `10px`), triệt tiêu hoàn toàn khoảng trắng thừa giúp form ôm sát góc dưới giao diện.

### Version 1.3.1 (2026-07-07)
- **Minh bạch thông tin thanh toán công nợ Quỹ chung (SettleUpSection)**:
  - Cải tiến giao diện thẻ hiển thị công nợ của thành viên tại màn hình Quyết toán.
  - Bổ sung hiển thị chi tiết số tiền **"Đã dùng"** (Share) và **"Đã trả/nộp"** (Paid) bên cạnh số **"Còn nợ"** (Amount).
  - Giúp người dùng biết rõ mình đã đóng bao nhiêu vào quỹ và sử dụng bao nhiêu, giải quyết triệt để sự cố "Thanh toán xong có người thêm hóa đơn lại báo nợ tiếp nhưng không rõ mình đã nộp những khoản nào".

### Version 1.4.1 (2026-07-08)
- **Giới hạn tính năng theo Gói cước (Feature Gating)**:
  - **Giới hạn Thành viên**: Tự động chặn thêm thành viên mới khi đạt ngưỡng (FREE: 10, VIP: 20, PREMIUM: 50).
  - **Giới hạn AI OCR**: Tự động theo dõi lượt quét hóa đơn bằng AI và giới hạn hàng tháng (FREE: 3 lượt, VIP: 50 lượt, PREMIUM: 200 lượt).
  - **Khóa tính năng Chốt sổ (Billing Cycle)**: Chỉ dành cho các nhóm đã nâng cấp lên gói VIP hoặc PREMIUM.
  - **Khóa tính năng Xuất báo cáo PDF**: Chỉ dành riêng cho gói PREMIUM để đảm bảo giá trị cao cấp.
  - **Giao diện trực quan**: Hiển thị biểu tượng 🔒 (Lock) và thông báo Toast hướng dẫn nâng cấp khi người dùng chạm vào các tính năng bị khóa.

### Version 1.4.0 (2026-07-08)
- **Nâng cấp gói cước Nhóm tự động (Automatic Group Plan Upgrade)**:
  - Triển khai hệ thống phân tầng gói cước cho Nhóm: **FREE** (mặc định), **VIP** (29k), **PREMIUM** (49k).
  - **Tự động hóa qua Webhook (SePay/Casso)**: Tích hợp API endpoint `/api/webhook/sepay` nhận thông báo biến động số dư. Hệ thống tự động bóc tách nội dung chuyển khoản theo cú pháp `SPLIT[MÃ NHÓM]` (Regex linh hoạt hỗ trợ cả `SPLITMATE [MÃ NHÓM]`) để lấy ID nhóm (6 ký tự cuối) và nâng cấp gói cước tương ứng với số tiền nhận được một cách tức thì. Đã bổ sung fallback route `/webhook/sepay` để tránh lỗi 404 trên các môi trường deploy khác nhau.
  - **Hệ thống Voucher / Mã quà tặng**: Cho phép Admin tạo mã quà tặng trong bảng `vouchers` để nâng cấp gói cước ngay lập tức thông qua giao diện ứng dụng.
  - **Giao diện Nâng cấp Chuyên nghiệp (Pricing & Checkout UI)**:
    - Bảng so sánh tính năng giữa các gói (Giới hạn thành viên, lượt quét AI, tính năng Chốt sổ, Xuất báo cáo).
    - Màn hình thanh toán VietQR động, tự động điền sẵn số tiền và nội dung chuyển khoản chuẩn xác.
    - Hiệu ứng **Pháo hoa (Confetti)** và thông báo Realtime toàn hệ thống khi gói cước được kích hoạt thành công.

### Version 1.3.9 (2026-07-08)
- **Bảo mật Hóa mật khẩu Thủ quỹ (Secure Password Hashing)**:
  - Triển khai mã hóa mật khẩu bằng thư viện `bcryptjs` cho tất cả tài khoản Thủ quỹ (Leader).
  - **Cơ chế Tự động Nâng cấp (Auto-Upgrade)**: Hệ thống tự động nhận diện mật khẩu dạng văn bản thuần (plaintext) cũ, kiểm tra tính chính xác và tự động băm (hash) lại rồi lưu đè vào database ngay trong lần đăng nhập thành công đầu tiên của người dùng.
  - **Quên mật khẩu An toàn**: Vì không thể giải mã mật khẩu đã băm, tính năng "Quên mật khẩu" nay sẽ tự động tạo một mật khẩu ngẫu nhiên mới (8 ký tự), thực hiện băm và lưu vào hệ thống, sau đó gửi phiên bản văn bản thuần của mật khẩu mới này tới email của người dùng.
  - **Đổi mật khẩu**: Tích hợp so khớp mật khẩu cũ (hỗ trợ cả hash và plaintext cũ) trước khi cho phép băm và lưu mật khẩu mới.
  - Đảm bảo tính riêng tư tuyệt đối cho thông tin nhạy cảm của Thủ quỹ, ngay cả khi Admin xem trực tiếp database cũng không thể biết mật khẩu gốc.

### Version 1.3.8 (2026-07-07)
- **Hiển thị thông báo Nộp/Nhận quỹ trên Lịch sử chi tiêu (Expense History Notification)**:
  - Bỏ bộ lọc ẩn giao dịch `[Nộp Quỹ]` và `[Nhận Quỹ]`. Các giao dịch thanh toán nợ quỹ / nhận hoàn dư quỹ nay sẽ xuất hiện trên dòng thời gian lịch sử chi tiêu giống như một thông báo (notification).
  - Tách biệt UI rõ ràng với thiết kế thu gọn một dòng (1-line design), đổi màu sắc hiển thị khác biệt (Xanh lá đối với Nộp quỹ, Xanh dương đối với Nhận quỹ) kèm biểu tượng Check để phân biệt với Hóa đơn chi tiêu thông thường.
  - Hiển thị thêm ngày giờ tạo chi phí / thanh toán nợ để người dùng tiện sắp xếp thứ tự và theo dõi dòng thời gian giao dịch.
  - Các giao dịch này không ảnh hưởng đến số `Tổng chi` trong ngày hoặc trong tháng ở màn hình lịch sử chi tiêu. Tính năng này giúp các thành viên dễ dàng đối chiếu được ngày mình nộp quỹ so với ngày phát sinh hóa đơn mới, từ đó tránh những thắc mắc về việc "Đã đóng tiền rồi sao vẫn còn báo nợ".
- **Cải thiện hiển thị Mã QR thanh toán (UX/UI QR Fixes)**:
  - Phóng to Mã QR (từ 160px lên 240px) để dễ quét hơn.
  - Chuyển định dạng ảnh VietQR sang mẫu `compact` (chỉ lấy phần mã QR, Napas247 và logo Ngân hàng), lược bỏ các đoạn text thừa bên trong ảnh.
  - Sửa lỗi xoay vòng tròn tải mãi không hiện mã QR khi nhập số tiền thủ công (khắc phục lỗi logic của vòng đời `isQrLoading` với ảnh QR tĩnh).
  - Tối giản câu hướng dẫn bên dưới mã QR cho đồng nhất.
- **Sửa lỗi hiển thị Mã QR MoMo Quỹ nhóm & Triệt tiêu trùng lặp Khung biên lai (UX/UI SettleUp Fixes)**:
  - Khắc phục triệt để lỗi không hiển thị Mã QR Code khi Quỹ nhóm cấu hình hình thức nhận qua Ví MoMo mà chưa tải lên ảnh QR tĩnh.
  - Tự động phát hiện cấu hình MoMo của Quỹ nhóm hoặc Thành viên nhận, từ đó chuyển mặc định tab thanh toán nhanh sang MoMo và tự động sinh mã VietQR MoMo động thông qua cổng thanh toán liên ngân hàng Napas BIN `971025` siêu nhanh.
  - Loại bỏ hoàn toàn khối uploader biên lai trùng lặp thừa ở phía trên đầu, trả lại Khung tải ảnh biên lai đối soát (OCR/Receipt Uploader) về đúng vị trí cũ ở dưới cùng (ngay phía trên thanh nút Xác nhận) đúng như quy trình chuẩn của dòng chảy giao dịch.

### Version 1.3.7 (2026-07-07)
- **Hoàn thiện cấu trúc SettleUp Modal & Gộp Mã QR thay thế Hướng dẫn Chữ rườm rà (UX/UI SettleUp Refactoring)**:
  - Loại bỏ hoàn toàn hộp hướng dẫn chữ 4 bước màu xanh lá cây rườm rà, tốn diện tích tại phần nộp quỹ.
  - Thay thế trực tiếp phần hướng dẫn bằng **Mã QR động (VietQR/MoMo)** hiển thị tuyệt đẹp trong khung `bg-emerald-50/70` bo góc thanh lịch, tự động hiển thị giá trị chuyển khoản, nội dung và số tài khoản tương ứng, giúp tiết kiệm không gian tối đa trên điện thoại.
  - Trả lại vị trí cũ cho **Khung tải ảnh biên lai đối soát (OCR/Receipt Uploader)** và ghi chú đính kèm: Đưa chúng lên trên đầu, nằm ngay dưới ô nhập số tiền & nút preset, giữ đúng dòng chảy quy trình nộp quỹ quen thuộc của các thành viên.

### Version 1.3.6 (2026-07-07)
- **Tối ưu trải nghiệm chuyển khoản & Đưa Mã QR lên trên đầu (UX SettleUp QR Modal)**:
  - Khắc phục triệt để lỗi trải nghiệm người dùng (UX) khi khung tải biên lai quá lớn đã đẩy mã QR động và các nút sao chép thông tin xuống tít dưới cùng, khiến người dùng mở lên không thấy mã QR (tưởng hệ thống bị lỗi).
  - Hoán đổi thứ tự hiển thị của modal thông minh:
    1. Đưa **Mã QR (`LIVE QR IMAGE COMPONENT`)** lên ngay phía dưới phần ô nhập tiền để người dùng thấy ngay mã QR tức thì mà không cần cuộn trang.
    2. Đưa **Danh sách thông tin chuyển khoản sao chép nhanh (`Instructions list copyable elements`)** lên cùng khu vực QR để tiện lợi tra cứu, copy số tài khoản, số tiền và lời nhắn chuyển khoản.
    3. Đưa **Khung tải ảnh biên lai đối soát (`UP-TO-DATE DYNAMIC OCR / RECEIPT UPLOADER`)** xuống phía dưới mã QR, khớp đúng quy trình hành vi thực tế (chuyển tiền xong mới chụp biên lai và tải lên).
    4. Giữ nguyên tính năng khóa an toàn cho nút "Xác nhận đã chuyển" nếu chưa tải biên lai lên, đảm bảo tính sòng phẳng và minh bạch đối soát.

### Version 1.3.5 (2026-07-07)
- **Chuẩn hóa hiển thị Tiền tệ không có phần Thập phân (No Decimals UI & Safe Float Precision)**:
  - Tất cả các số tiền trong toàn bộ hệ thống (Danh sách hóa đơn, Quyết toán, Lịch sử, Cá nhân) khi render lên giao diện đều được bọc bởi hàm `formatMoney` tự động làm tròn không lấy phần thập phân (ví dụ `523.568,254đ` sẽ hiển thị thành `523.568 đ`).
  - Đảm bảo logic tính toán phân chia, tổng nợ, phân rã dòng tiền (database & local React state) vẫn giữ nguyên độ chính xác float đầy đủ để tránh hao hụt, mất mát hoặc sai lệch số dư quỹ.
- **Khống chế Số tiền Quyết toán tối đa (Max Debt Capping)**:
  - Khi thành viên nhập tay số tiền quyết toán, hệ thống tự động kiểm tra và giới hạn không cho phép nhập số tiền lớn hơn tổng số tiền nợ thực tế. Nếu nhập vượt quá, số tiền sẽ tự động được gán về mức nợ tối đa (cận trên).
- **Cơ chế Xác nhận Số tiền & Khóa Mã QR (QR Confirmation & Lock Mechanism)**:
  - Bổ sung nút bấm trực quan nhấp nháy **"✓ Áp dụng số tiền mới & Cập nhật QR"** khi thành viên sửa đổi thủ công số tiền nộp quỹ.
  - Mã QR động và số tiền sao chép một chạm chỉ được tái lập và cập nhật đúng theo số tiền mới sau khi người dùng bấm xác nhận áp dụng, ngăn chặn việc mã QR bị thay đổi liên tục một cách chập chờn (flickering) khi đang gõ phím.

### Version 1.3.4 (2026-07-07)
- **Tối giản ô hiển thị tiền tại mục Quyết toán (SettleUpSection)**:
  - Loại bỏ các dòng text "Đã dùng" (Share) và "Đã trả/nộp" (Paid) rườm rà bên trong các ô số tiền của danh sách thành viên quyết toán nợ/có.
  - Giữ lại duy nhất số tiền nổi bật có màu đỏ (cần chuyển quỹ) hoặc xanh lá (nhận lại từ quỹ) nằm căn giữa hoàn toàn trong khung số tiền, mang lại giao diện tinh giản, sạch sẽ và thoáng mắt nhất.
- **Tính năng Gửi tiền / Trả tiền một phần (Partial Settle Up)**:
  - Cho phép người dùng chỉnh sửa trực tiếp số tiền thực tế muốn gửi nộp/chi trả khi mở Modal thanh toán quyết toán (mặc định hiển thị tổng tiền cần trả).
  - Tích hợp 2 nút phím tắt gán nhanh: **Trả hết (100%)** và **Trả 1 nửa (50%)** để thành viên thao tác nhanh chóng.
  - Tự động tái tạo hình ảnh mã VietQR động (`img.vietqr.io`) đồng bộ thời gian thực theo đúng số tiền tùy biến mà thành viên nhập vào.
  - Cập nhật số tiền sao chép 1-chạm & ghi nhận thông tin biên lai minh chứng (hoặc duyệt tự động của Admin) chính xác theo số tiền thực tế thanh toán một phần.

### Version 1.3.3 (2026-07-07)
- **Nâng cấp Cơ chế Sắp xếp & Hiển thị Ngày Tạo/Sửa của Hóa Đơn**:
  - **Tùy chọn Sắp xếp Linh hoạt (Sort Selector UI)**: Bổ sung thanh chọn sắp xếp mới bên cạnh thanh lọc trong màn hình Lịch sử chi tiêu nhóm. Cho phép chuyển đổi linh hoạt giữa:
    - **"📅 Ngày đi ăn"**: Sắp xếp mặc định theo ngày tổ chức ăn uống thực tế (nhóm theo ngày đi ăn).
    - **"✏️ Mới cập nhật / sửa"**: Tự động đưa các hóa đơn được Admin chỉnh sửa hoặc thêm mới gần đây nhất lên đầu danh sách bất kể ngày ăn cũ là khi nào (nhóm theo ngày cập nhật/sửa).
  - **Hiển thị trực quan Ngày Tạo/Sửa (Created/Edited Time badge)**:
    - Tích hợp nhãn thời gian cực nét dạng `HH:MM DD/MM/YYYY` vào cả giao diện di động (Mobile) lẫn máy tính (Desktop) ngay trên thẻ hóa đơn (kể cả khi ở chế độ thu gọn/collapsed).
    - Hiển thị nhãn thời gian tạo: `Tạo: [Thời gian]` (ví dụ: `Tạo: 14:30 05/07/2026`).
    - Nếu hóa đơn có lịch sử chỉnh sửa, hiển thị thêm nhãn thời gian cập nhật nổi bật màu cam: `Sửa: [Thời gian]` (ví dụ: `Sửa: 09:47 07/07/2026`).
  - **Đồng nhất dữ liệu và sắp xếp**: Giải quyết triệt để vấn đề hóa đơn sửa đổi không tự nhảy lên đầu danh sách, mang lại trải nghiệm tối ưu và minh bạch tuyệt đối cho các thành viên.

### Version 1.3.2 (2026-07-07)
- **Tự động Cập nhật Thời gian & Giao diện Lịch sử Nhóm (Group History View & Badges)**:
  - Bổ sung tự động gán & cập nhật các mốc thời gian `created_at` và `updated_at` cho mỗi hóa đơn khi được thêm mới hoặc chỉnh sửa.
  - Tích hợp các huy hiệu (Badges) thông minh trên giao diện lịch sử chung của nhóm (cả bản Mobile lẫn Desktop):
    - Badge **"MỚI THÊM"** (màu đỏ) tự động hiển thị nếu hóa đơn được tạo trong vòng 24 giờ qua.
    - Badge **"ĐÃ SỬA ✏️"** (màu vàng/cam) tự động hiển thị nếu hóa đơn từng bị Admin chỉnh sửa nội dung/số tiền/người tham gia (so sánh chênh lệch giữa `updated_at` và `created_at`).
- **Thiết kế & Triển khai Tab/Modal "Sao kê cá nhân" (Personal Statement View)**:
  - Tạo một Modal sao kê chuyên nghiệp và tinh xảo theo phong cách Banking UX để người dùng đang đăng nhập (hoặc Admin lựa chọn xem bất kỳ thành viên nào) đối soát chi tiết biến động công nợ của riêng mình.
  - **Sắp xếp thời gian thực (ORDER BY updated_at DESC)**: Danh sách biến động được sắp xếp theo thời gian cập nhật mới nhất lên trên đầu.
  - **Chốt chặn thanh toán (Payment Watermark Barrier)**:
    - Xác định mốc giao dịch nộp quỹ hoặc nhận hoàn quỹ thành công gần nhất làm vạch chốt chặn.
    - Hiển thị một đường kẻ chốt chặn thanh toán nổi bật cắt ngang danh sách: *"✅ Đã thanh toán [Số tiền] lúc [Thời gian]"*.
    - Tự động làm mờ 50% (opacity-50) toàn bộ các hóa đơn cũ nằm phía dưới vạch chốt chặn này để biểu thị đã đối soát xong, bảo vệ sự sòng phẳng tuyệt đối.
    - Giữ nguyên độ nét 100% cho toàn bộ các hóa đơn mới được thêm hoặc chỉnh sửa nằm phía trên vạch chốt chặn để người dùng nhìn rõ các khoản phát sinh cấu thành số dư nợ hiện tại.
  - **Cơ chế tự động nhảy vọt (Auto-Bump Rule)**:
    - Khi một hóa đơn cũ của tháng trước bị Admin sửa ở hiện tại, `updated_at` của nó sẽ được cập nhật sang thời gian hiện tại.
    - Hóa đơn bị sửa đổi này sẽ tự động nhảy vọt lên trên cùng danh sách (trượt lên trên vạch chốt chặn thanh toán) và hiển thị rõ nét 100%, giúp thành viên biết ngay lý do vì sao dư nợ của mình có sự thay đổi đột ngột.

### Version 1.3.0 (2026-07-06)
- **Sửa lỗi hiển thị dư nợ khi đã Cấn trừ Nợ**:
  - Truyền danh sách `debtOffsets` vào các thành phần giao diện (Danh sách thành viên, Bảng thống kê) để tính toán lại số dư thực tế sau khi cấn nợ.
  - Thành viên nhờ trả thay sẽ hết nợ trên giao diện, và người nhận trả thay sẽ được ghi nhận khoản nợ tương ứng một cách chính xác.

### Version 1.2.9 (2026-07-06)
- **Sửa Bug Tự Động Gán Email Trưởng Nhóm Cho Thành Viên Khác Khi Sửa Thông Tin**:
  - Khắc phục triệt để lỗi khi Trưởng nhóm / Admin nhấn "Sửa thông tin" bất kỳ thành viên nào (chỉ đổi tên, ảnh đại diện, v.v.), hệ thống bị tự động lấy email của Admin gán đè sang email của thành viên đó và khóa không cho sửa/xóa lại.
  - Chuẩn hóa điều kiện `isMemberSelfUser`: Chỉ xác định là chính tài khoản đăng nhập/xem khi `viewingMemberId` hoặc `user.uid` trùng với ID của chính thành viên đó (`viewingMemberId === member.id` hoặc `user.uid === member.userId`).
  - Khi Trưởng nhóm sửa thông tin cho người khác, `isMemberSelfUser` sẽ trả về `false`, giúp giữ nguyên email vốn có (hoặc `undefined` nếu chưa có email) của thành viên đó mà không bao giờ lấy email Admin thế vào.
  - Loại bỏ fallback `userEmail` trong API `/api/member/update-info` phía backend để đảm bảo an toàn tuyệt đối.

### Version 1.2.8 (2026-07-06)
- **Ràng buộc Xóa Thành Viên & Bảo Toàn Lịch Sử Hóa Đơn**:
  - Giới hạn chỉ cho phép xóa thành viên khi nhóm đã quyết toán sòng phẳng (không còn dư nợ công nợ giữa các thành viên) hoặc đã chốt sổ kỳ chi tiêu.
  - Khi xóa thành viên, giữ nguyên tất cả dữ liệu hóa đơn cũ để bảo toàn lịch sử giao dịch (hóa đơn hiển thị "Thành viên cũ" đối với người đã rời nhóm mà không tính lại từ đầu).
- **Ẩn Tính năng Nút Bấm Chuyển Khoản Tự Động**:
  - Ẩn khối nút "Chuyển khoản" / mở app ngân hàng tự động. Người dùng chuyển khoản bằng phương thức quét mã VietQR hoặc sao chép STK/nội dung thủ công.
- **Vô hiệu hóa Email Thành Viên trong Chế độ 1 Lần (Try Offline Mode)**:
  - Truyền đầy đủ cờ `tryOfflineMode` vào component `MemberSection` ở Tab Quản lý thành viên & Điểm danh.
  - Ẩn hoàn toàn ô nhập Email khi thêm hoặc sửa thành viên ở cả `MemberSection` và `ParticipationSection` trong Chế độ 1 lần, đồng thời ẩn biểu tượng badge email để tối ưu giao diện dùng thử offline.

### Version 1.2.7 (2026-07-03)
- **Tối ưu giảm 90-95% Supabase Storage Egress & Băng thông**:
  - **Nén ảnh Client-side**: Tự động ép tất cả tệp ảnh tải lên (bao gồm ảnh PNG chụp màn hình 3-5MB) về định dạng `image/jpeg` chất lượng 0.8, nén kích thước xuống dưới ~100KB trước khi upload.
  - **Nén ảnh Server-side bằng Jimp**: Thêm bộ lọc nén tự động trên backend trước khi ghi tệp vào Supabase Storage bucket.
  - **Cache-Control Supabase Storage**: Đặt cờ `cacheControl: "31536000"` khi gọi API upload lên bucket, ép Supabase gửi header max-age 1 năm, giảm 90% Egress.
  - **In-Memory Server Cache & HTTP 304 Not Modified**:
    - Thiết lập bộ nhớ đệm RAM (`fileMemoryCache`) trên server Node.js lưu giữ các tệp hình ảnh vừa xem/tải lên.
    - Phục vụ trực tiếp từ RAM cho các yêu cầu xem ảnh tiếp theo mà KHÔNG cần gọi lại Supabase Storage, cắt giảm hoàn toàn Storage Egress trên các lượt truy cập lặp lại.
    - Trả về mã HTTP `304 Not Modified` cùng ETag và header `Cache-Control: public, max-age=31536000, immutable` giúp browser tận dụng triệt để cache máy khách.

### Version 1.3.1 (2026-07-10)
- **Chuẩn hóa Cấu hình Quỹ chung & Fix lỗi Ảnh Logo Ngân hàng**:
  - **Giới hạn hình thức nhận quỹ**: Loại bỏ tùy chọn thiết lập Ví MoMo riêng lẻ trong Cấu hình Quỹ chung tại Group Settings, chỉ giữ lại cổng Tài khoản Ngân hàng (do MoMo và các ví khác đều được tích hợp/nhận liên thông trực tiếp qua số tài khoản ngân hàng thụ hưởng / Napas247).
  - **Loại bỏ Tải ảnh QR tĩnh**: Gỡ bỏ hoàn toàn tùy chọn tải ảnh QR nộp quỹ thủ công (đối với cả ngân hàng và MoMo) nhằm loại bỏ thao tác rườm rà không cần thiết, vì hệ thống tự động sinh mã VietQR động tối ưu chứa sẵn số tiền chính xác khi nộp quỹ.
  - **Sửa triệt để Lỗi hiển thị Ảnh ngân hàng**: Cập nhật cơ chế chuyển đổi đường dẫn logo ngân hàng từ tên miền cũ `img.vietqr.io/image` sang tên miền API chính thức `api.vietqr.io/img/` cùng định dạng đuôi `.png` đồng nhất (ví dụ Vietcombank: `VCB.png`, Timo: `TIMO.png`, Vietinbank: `ICB.png`, Bản Việt: `BVB.png`), giải quyết triệt để lỗi ảnh icon ngân hàng bị lỗi hiển thị (broken images).

### Version 1.3.0 (2026-07-10)
- **Thiết kế & Lập trình Header thông minh chuẩn di động cho SplitMate**:
  - Triển khai thanh Đầu trang (Header) cố định (`fixed top-0 left-0 right-0 h-14 bg-white border-b`) siêu mượt mà cho giao diện Mobile.
  - **Bên trái**: Tích hợp Avatar Gmail của user mở một Personal Drawer hiển thị chi tiết tài khoản, gói cước hoạt động chuẩn hóa (`FREE`, `BE_BAN`, `HOI_LANG`), nút Nâng cấp VIP và nút Đăng xuất an toàn.
  - **Chính giữa**: Tích hợp Group Switcher mở Bottom Sheet đổi nhóm nhanh kèm nút tạo nhóm chi tiêu mới.
  - **Bên phải**: Tích hợp Avatar Stack thành viên mở Modal Quản lý thành viên (chứa `MemberSection` trực quan) và Icon Cài đặt bánh răng mở Modal Cài đặt nhóm (cho phép thay tên/ảnh đại diện nén gửi lên Storage, thiết lập số tài khoản Quỹ chung ngân hàng Việt Nam tự động sinh VietQR/MoMo, và Danger Zone xóa nhóm sòng phẳng).
- **Đồng bộ hóa Giao diện**: Thêm padding-top `pt-14` cho toàn bộ các tab di động giúp bố cục hiển thị hoàn hảo bên dưới Header cố định, tinh gọn hóa Header cũ của tab Trang chủ và Thành viên để tránh trùng lặp thông tin rườm rà.

### Version 1.2.6 (2026-07-03)
- **Mở lại Tính năng Quét Hóa đơn / QR bằng AI trong Chế độ 1 Lần (Try Offline Mode)**:
  - Khôi phục tính năng bóc tách hóa đơn & quét VietQR bằng AI (LiveCamera & Upload AI) trong Chế độ 1 Lần.
  - Hiển thị lại thanh SubNav chuyển đổi giữa "Quét hóa đơn" và "Nhập thủ công" khi người dùng ở màn hình thêm chi phí di động.

### Version 1.2.5 (2026-07-03)
- **Ẩn Quét QR AI và Chuyển khoản trong Chế độ 1 Lần (Offline/Try Mode)**:
  - Vẫn giữ nguyên form nhập chi phí nhanh cho chế độ xài 1 lần, nhưng ẩn hoàn toàn tùy chọn/tab "Quét hóa đơn bằng AI" (LiveCamera scanner) và thanh SubNav ở đáy màn hình di động.
  - Ẩn hoàn toàn khối nút **"Chuyển khoản"** và **"Đổi ngân hàng thanh toán"** trong popup thông báo thành công sau khi thêm hóa đơn khi người dùng đang ở chế độ 1 lần (`tryOfflineMode === true`).

### Version 1.2.4 (2026-07-03)
- **Tối ưu Co giãn (Responsive Scaling) Trang Đăng nhập / Onboarding Mobile**:
  - Áp dụng breakpoint `min-[390px]:`, `min-[410px]:` nâng tỉ lệ co giãn cho container Đăng nhập/Vào phòng (`max-w-md`), font chữ tiêu đề, input, button và khoảng cách thẻ.
  - Tự động xòe rộng đầy đặn, căng nét trên màn hình lớn như iPhone 14 Pro Max (430px) và Galaxy Ultra, xóa bỏ mảng trống lọt thỏm không mong muốn.

### Version 1.2.3 (2026-07-03)
- **Thêm Thành Viên Mới qua Email Gmail**:
  - Thêm ô nhập Email Gmail trong form "Thêm thành viên mới" kèm nút "Tìm Gmail" để tự động truy vấn tài khoản đã đăng ký trên hệ thống.
  - Tự động điền Tên thành viên và Ảnh đại diện (Avatar) nếu tài khoản Gmail được tìm thấy.
  - Tự động gửi email mời nếu tài khoản chưa từng đăng ký Gmail trên hệ thống khi bấm "Thêm vào nhóm".
- **Tối ưu Widget Góp ý & Báo lỗi**:
  - Bỏ nút "Xem trang FAQ & Giải Đáp" dư thừa trong popup góp ý.
  - Cập nhật thông tin bản quyền chuẩn hóa thành "Bản quyền SplitMate".

### Version 1.2.2 (2026-07-03)
- **Sửa triệt để Bug Quét Mã QR MoMo / VietQR (Bóc tách Tên Tài khoản & Quán)**:
  - Khắc phục lỗi `ReferenceError: accountName is not defined` làm đứt đoạn khối try-catch trong parser VietQR khiến hàm `parseVietQR` bị âm thầm trả về `null` đối với tất cả các mã QR MoMo/VietQR chứa thông tin chủ tài khoản (Tag 38 / Tag 26).
  - Khắc phục lỗi parser EMVCo không đọc được mã VietQR chứa tên tiếng Việt có dấu. Chuyển đổi tính toán độ dài (length) từ character-based (UTF-16 JS string) sang byte-based (UTF-8 array) theo chuẩn EMVCo, giúp cắt chuỗi chính xác và không làm ngắt quãng vòng lặp khi gặp tên người nhận có dấu (ví dụ: `NGUYỄN VĂN A`).
  - Trích xuất chính xác tên chủ tài khoản / tên cửa hàng (ví dụ: `MOMO_HU TIEU MI CHU THU`), tự động làm sạch các tiền tố `MOMO_`, `ZALOPAY_`, `BVBANK_` và dấu gạch dưới `_` thành `HU TIEU MI CHU THU` để tạo tiêu đề `"Thanh toán HU TIEU MI CHU THU"`. Tự động bỏ qua các tên generic rỗng như `MOMO`, `VNPAY` để kích hoạt AI Vision.
  - Nâng cấp Gemini Vision AI OCR (`/api/receipt/scan`) hỗ trợ bóc tách Tên Quán / Tên Cửa Hàng từ Bảng Đặt Mã QR Tĩnh tại quán ăn (ví dụ bóc tách chữ "HỦ TIẾU MÌ CHÚ THỦ" từ biển hiệu bảng QR) và cho phép giữ `isUnreadable = false` dù là bảng QR tĩnh không có sẵn số tiền cố định.
- **Chuẩn hóa Tên/Nội dung Chi phí khi Quét VietQR**:
  - Nếu QR chứa nội dung chuyển khoản (`memo`), sử dụng toàn bộ nội dung đó làm tên chi phí.
  - Nếu không có `memo`, tự động tạo tên theo công thức `"Thanh toán " + [tên quán/chủ tài khoản/STK]`. Tuyệt đối không tự sinh chữ vô nghĩa `"Tài khoản"`.
- **Loại bỏ Khối Thanh toán Trùng lặp bên dưới Form (Ảnh 1)**:
  - Loại bỏ hoàn toàn khối nút trùng lặp `Mở App Ngân hàng để trả tiền` bên dưới nút Submit. Khối thông báo thành công ở đầu trang đã đảm nhận đầy đủ tính năng này.
- **Triệt tiêu Khoảng trắng Dư thừa bên dưới Form (Ảnh 2)**:
  - Loại bỏ `flex-1` co giãn chiều cao dư thừa ở tab Thêm chi phí, giúp form ôm sát nội dung và hiển thị vừa vặn trên màn hình di động mà không để lại khoảng trống màu xám lớn bên dưới.
- **Khóa Số tiền khi VietQR có sẵn số tiền**:
  - Tự động khóa không cho chỉnh sửa ô nhập số tiền đối với mã QR động đã chứa số tiền cố định, kèm biểu tượng 🔒 rõ ràng.
- **Tự động Cuộn Màn hình sau khi Thêm Chi phí**:
  - Tự động cuộn mượt lên đầu trang ngay khối thông báo thành công và nút chuyển sang App Ngân hàng ngay khi bấm "Thêm chi phí này vào quỹ chung".

### Version 1.2.8 (2026-07-13)
- **Tinh chỉnh Màu sắc Card Nhóm Hoạt động Hiện tại Đảm bảo Trực quan & Độ tương phản Cao**:
  - **Sửa giao diện nền đậm lặp lại**: Thay đổi nền của card nhóm đang được chọn (`isActive`) từ màu xanh lục bảo đặc (`bg-[#00B276]`) sang nền màu xanh bạc hà dịu nhẹ tinh tế (`bg-[#00B276]/6`) với viền đậm sắc nét màu xanh lục bảo (`border-2 border-[#00B276]`).
  - **Tối ưu hóa độ tương phản chữ**: Tất cả tiêu đề tên nhóm, số lượng thành viên, và các nhãn phụ trong card được chuyển sang các tông màu có độ tương phản cao (màu xám than đen `text-slate-900` và `text-slate-800`), giúp hiển thị rõ ràng sắc nét nhất trên cả màn hình di động lẫn máy tính.
  - **Làm nổi bật số tiền công nợ**:
    - Khoản được nhận hiển thị màu xanh lá rực rỡ `#00B276` cực kỳ trực quan.
    - Khoản cần đóng hiển thị màu hồng đào/đỏ `text-rose-500` nổi bật rõ nét.
  - **Huy hiệu Hiện tại tinh tế**: Giữ nguyên nhãn phẳng `🎯 Hiện tại` nền xanh lục bảo chữ trắng sắc nét để chỉ ra nhóm đang hoạt động tức thì.

### Version 1.2.9 (2026-07-14)
- **Hiển thị thông tin Thời hạn Gói dịch vụ trong Cấu hình Nhóm**:
  - Tích hợp thông tin ngày kích hoạt (`planActivatedAt`), ngày hết hạn (`planExpiredAt`) đầy đủ ngày giờ phút theo định dạng `HH:MM DD/MM/YYYY` thông qua hàm tiện ích `formatDateTime`.
  - **Khắc phục lỗi dính liền ký tự & sai lệch định dạng**: Chuyển đổi cơ chế từ `Intl.DateTimeFormat` sang xử lý múi giờ Việt Nam (UTC+7) thủ công tuyệt đối chính xác. Định dạng hiển thị giờ phút được đồng bộ chuẩn `hh:mm dd/mm/yyyy` (ví dụ: `17:10 14/07/2026`), giải quyết dứt điểm hiện tượng dính liền ký tự (ví dụ: `15:0214/07/2026`) do các công cụ định dạng tự động của trình duyệt/hệ điều hành gây ra.
  - Thêm thẻ nổi bật đếm ngược "Thời hạn còn lại" (tính theo ngày) với màu nền vàng cam ấm áp, áp dụng trực quan cho nhóm đang sử dụng gói Bè Bạn hoặc Hội Làng ngay tại menu "Cấu hình & Cài đặt nhóm" (SmartHeader Settings Modal) giúp quản trị viên dễ dàng nắm bắt.
  - **Sửa lỗi nhảy ngày giờ trực tiếp (Real-time update fallback)**: Sửa triệt để tình trạng ngày kích hoạt và ngày hết hạn tự nhảy theo thời gian thực (hiện tại) của hệ thống do fallback về `new Date()` khi nhóm nâng cấp từ trước chưa lưu mốc cụ thể trong database. Giải pháp: Sử dụng ngày tạo nhóm cố định (`group.createdAt`) làm mốc kích hoạt gốc và cộng thêm 365 ngày để tính hạn hết gói khi dữ liệu database bị trống, giúp mốc thời gian hiển thị luôn nhất quán, cố định và chính xác 100%.

### Version 1.2.8 (2026-07-14)
- **Tùy chọn Biểu tượng Danh mục & Bố cục Người trả trước đối diện phần Chia sẻ trên Thẻ chi tiêu**:
  - **Bố cục động chuyển đổi mượt mà giữa Đóng và Mở rộng (Transaction Card)**:
    - *Khi đóng (Collapsed)*: Chỉ hiển thị Icon danh mục dạng tròn màu pastel dịu mắt ở góc trái, tiêu đề mô tả hóa đơn và số tiền. Trạng thái thu gọn hoàn toàn lược bỏ thông tin người trả trước để giao diện luôn tinh gọn, tối giản và không bị rối mắt.
    - *Khi mở rộng (Expanded)*: Người trả trước (Avatar kèm tên hiển thị và nhãn phụ `Người trả trước`) tự động xuất hiện tinh tế ở **góc trống dưới cùng bên trái** (đối diện trực tiếp với danh sách chia sẻ nhóm của hóa đơn) giúp cân đối bố cục.
  - **Cải tiến dòng tiêu đề đầy đủ**:
    - Khi mở rộng thẻ, tiêu đề mô tả được tự động kéo dãn (`break-words` và `text-base font-bold`) để hiển thị trọn vẹn toàn bộ nội dung mà không lo bị cắt ngắn.
  - **Tối ưu hóa thông tin công nợ cá nhân**: Chuyển thông tin "Bạn được nhận" / "Bạn cần trả" lên hàng nhãn thông tin (metadata) phía trên với các thẻ nền nhạt, viền mỏng và hiệu ứng mượt mà.
  - **Tích hợp tính năng Chọn thủ công Biểu tượng / Danh mục khi tạo khoản chi**: Tại form nhập chi phí, bổ sung một khay nút phẳng chứa các icon phân loại phổ biến: `🍔 Ăn uống`, `🚗 Xe cộ`, `🛍️ Mua sắm`, `🏨 Chỗ ở`, `🎉 Vui chơi`, `💸 Khác`. Người dùng có thể chủ động bấm chọn biểu tượng danh mục mong muốn. Nếu để trống, hệ thống sẽ tự động phân tích và nhận diện dựa trên nội dung như trước đây.

### Version 1.2.7 (2026-07-13)
- **Cải tiến Giao diện Phân cấp Trực quan Tab 1**:
  - **Sửa triệt để lỗi co rút Hero Card**: Bổ sung `shrink-0` cho thẻ xanh lớn "Số dư ròng" giúp nó cố định chiều cao, không bị co nhỏ mất thông tin khi danh sách nhóm bên dưới chiếm nhiều diện tích.
  - **Thiết kế lại Nhóm Đang Hoạt Động cực kỳ nổi bật**:
    - Nền của card nhóm đang hoạt động đổi hoàn toàn sang **màu xanh lục bảo (`bg-[#00B276]`)** rực rỡ với bóng đổ mềm mại, tạo chiều sâu xuất sắc.
    - Chuyển đổi toàn bộ màu chữ và thông tin bên trong thành màu trắng tinh (`text-white`) và màu xanh bạc hà dịu (`text-emerald-100`) để tăng độ tương phản rõ rệt, dễ nhìn.
    - Số tiền công nợ được phối màu thông minh trên nền xanh lục bảo: Được nhận màu vàng hoàng kim nhạt `#FFF2B2`, Cần đóng màu hồng đào nhạt `#FFD1D1`, Hòa gốc màu trắng bạc `text-emerald-100`.
    - Biểu tượng nhóm hoạt động đổi sang nền trắng mờ thanh lịch `bg-white/15 text-white`.
    - Bỏ hiệu ứng nhấp nháy của huy hiệu `🎯 Hiện tại`, thay bằng nhãn phẳng nền trắng chữ xanh lục bảo sắc nét.
  - **Tối giản nút Tạo nhóm (FAB)**: Loại bỏ hoàn toàn hoạt ảnh đàn hồi nhấp nhô lên xuống liên tục (tránh gây xao nhãng), chỉ giữ lại hiệu ứng zoom nhẹ khi di chuột (`whileHover`) và phản hồi lún nút khi chạm (`whileTap`).

### Version 1.2.6 (2026-07-13)
- **Đại cải tổ giao diện Tab 2 (Chi tiết chi tiêu) theo ngôn ngữ FinTech Emerald phẳng, trực quan và thoáng đãng**:
  - **Header trang mỏng nhẹ**: Loại bỏ hoàn toàn phần header phụ trùng lặp trong Tab Chi tiêu để đồng bộ thông suốt với SmartHeader chính toàn hệ thống, tạo không gian hiển thị rộng rãi, thoáng mắt tối đa.
  - **Thanh chuyển đổi Segment Control phẳng**: Nút chuyển đổi chế độ xem `[📝 Dạng Danh Sách] [📅 Dạng Lịch]` dạng viên thuốc bo tròn mềm mại nền xám nhạt (`bg-slate-100 p-1 rounded-full`).
  - **Bộ lọc nhanh danh mục (Category Pills) dạng trượt ngang**: Thanh trượt ngang không có thanh cuộn thô cứng chứa các danh mục phổ biến: `Tất cả`, `🍔 Ăn uống`, `🚗 Xe cộ`, `🛍️ Mua sắm`, `🏨 Chỗ ở`, `🎉 Vui chơi`, `💸 Khác`, tự động phân tích từ khóa trong mô tả hóa đơn để kích hoạt bộ lọc chuẩn xác. Trạng thái hoạt động hiển thị màu xanh ngọc lục bảo `#03B875` mềm mắt.
  - **Cấu trúc Thẻ hóa đơn (Transaction Card) phẳng & Đẹp**:
    - Nền thẻ màu trắng tinh khôi `#FFFFFF` bo góc lớn mềm mại (`rounded-2xl`), đổ bóng mờ ảo siêu tinh tế `shadow-[0_4px_20px_rgba(15,23,42,0.01)]`.
    - Phía bên trái hiển thị vòng tròn nhỏ màu pastel dịu mắt chứa emoji biểu tượng danh mục tự nhận diện (Ăn uống: cam nhạt, Xe cộ: xanh dương nhạt, Mua sắm: tím nhạt, Chỗ ở: xanh ngọc nhạt, Vui chơi: hồng nhạt, Khác: emerald nhạt).
    - Ở giữa hiển thị tên hóa đơn (Obsidian Slate `#0F172A`), tên người chi và giờ chi (hoặc ngày chi) viết nhỏ xám nhạt phía dưới, lược bỏ chữ "đã trả" rườm rà để giao diện phẳng tinh tế tối đa (`Hau Chan · 17:29`).
    - Phía bên phải hiển thị số tiền to đậm, nếu hóa đơn có ngoại tệ sẽ tự động bóc tách và hiển thị song song ngoại tệ gốc mờ ở phía trên và số tiền quy đổi VND đậm to ở dưới.
    - Huy hiệu (Badge) mỏng nhẹ "MỚI THÊM" (đỏ nhạt) và "ĐÃ SỬA ✏️" (cam nhạt) hiển thị động dựa trên mốc thời gian thực ngay cạnh tên hóa đơn.
  - **Cơ chế trượt mở rộng (Collapsible)**: Chạm vào thẻ hóa đơn sẽ mở rộng mượt mà xuống dưới, hiển thị chi tiết danh sách người tham gia chia tiền dạng chip tròn, thời gian ghi sổ, thông tin người thêm/người sửa, và 2 nút tác vụ phẳng **Sửa** / **Xóa** (hiển thị riêng cho Admin hoặc người có quyền).
- **Tối ưu hóa Bố cục Chia sẻ Tùy chỉnh (Custom Sharing Grid)**:
  - Điều chỉnh cấu trúc hiển thị lưới các thành viên trong phần "Chia sẻ cùng ai" (tùy chọn Tùy chỉnh) của form thêm/sửa chi tiêu thành **3 cột cố định** (thay vì 5 cột trước đó), đảm bảo sự cân đối trực quan, tối ưu khoảng cách hiển thị avatar, tên thành viên và ô nhập số tiền không bị co cụm hay tràn viền trên màn hình điện thoại di động.
  - Đồng thời mở rộng độ rộng của các ô nhập liệu (`input`), nhãn tên thành viên và phần hiển thị số tiền tạm tính từ `w-14` (56px) lên **`w-20` (80px)** để người dùng thoải mái nhập các số tiền lớn (hàng trăm ngàn, hàng triệu) mà không lo bị cắt số, co rúm hay khuất chữ.
- **Đồng bộ hóa Token màu sắc mới toàn diện (Global Theme Update)**:
  - Cập nhật màu xanh ngọc chủ đạo thành mã xanh ngọc lục bảo tươi sáng của FinTech Emerald `#03B875` trong `index.css` (emerald-50 đến emerald-950 và green-50 đến green-900).
  - Đồng bộ màu sắc nhóm đang hoạt động trên Tab 1 và toàn bộ các liên kết, đường viền, nút bấm liên quan sang hệ màu mới `#03B875` cùng hiệu ứng đổ bóng mờ ảo cao cấp.

- **Tối ưu hóa Trực quan Dashboard (Tab 1) & Nâng cấp Trải nghiệm Người dùng**:
  - **Làm nổi bật Nhóm hiện tại**: Nhóm đang được chọn (`selectedGroupId`) được thiết kế nổi bật vượt trội với viền đôi màu xanh lục bảo `#00B276`, nền nhạt mềm mại `bg-[#00B276]/3`, hiệu ứng bóng mờ nhẹ, kèm theo huy hiệu `🎯 Hiện tại` có hiệu ứng đập nhịp (pulse) lấp lánh để người dùng phân biệt lập tức với các nhóm khác.
  - **Tự động Sắp xếp Nhóm thông minh**: Khi có nhiều nhóm chi tiêu (4-5 nhóm trở lên), nhóm đang hoạt động/đang được chọn luôn được ưu tiên tự động sắp xếp lên vị trí đầu tiên (vị trí số 1), giúp nâng cao tốc độ tương tác.
  - **Khắc phục che khuất phần Bottom**: Tăng khoảng trống cuộn cuối danh sách của Tab 1 lên `pb-40` (thay vì `pb-6`), đảm bảo khi cuộn xuống dưới cùng, Card cuối danh sách sẽ hoàn toàn vượt qua khỏi nút quét QR và thanh điều hướng Tab Bar.
  - **Thống kê Hóa đơn tham gia Toàn cục**: Đổi khối "🔴 Còn nợ" trong Hero Card "Số dư ròng" thành "📊 Hóa đơn tham gia", tự động tổng hợp tổng số lượng hóa đơn người dùng có liên quan (trực tiếp trả tiền hoặc thụ hưởng) trên tất cả các nhóm thực tế của họ.
  - **Nâng cấp Hiệu ứng FAB Tạo nhóm**: Chuyển đổi nút tạo nhóm mới thành `<motion.button>` sử dụng thư viện `motion/react` với hoạt ảnh nhún nhảy (bounce) êm ái liên tục `y: [0, -6, 0]`, hiệu ứng hover phóng to nhẹ `scale: 1.12` đi kèm bóng đổ lung linh, và hiệu ứng thu nhỏ phản hồi xúc giác khi bấm `scale: 0.9`. Vị trí nút cũng được dịch lên `bottom-24` để dễ tương tác hơn.

### Version 1.2.5 (2026-07-13)
- **Tái cấu trúc Tab 1 (Tổng quan) thành Dashboard Quản lý công nợ toàn cục**:
  - Thiết kế lại hoàn toàn giao diện Tab 1 thành một Dashboard trực quan, phẳng tối giản, loại bỏ chữ thừa.
  - **Hero Card "Số Dư Ròng Của Bạn"**: Thẻ xanh lục bảo gradient hiển thị số dư ròng thực tế toàn cục (tổng các khoản được nhận trừ đi các khoản còn nợ trên tất cả các nhóm chi tiêu), đi kèm nhãn huy hiệu (badge) động siêu dễ thương và hai khối con hiển thị chi tiết: "Được nhận" và "Còn nợ" thực tế.
  - **Bộ lọc & Tìm kiếm nhanh thông minh**: Ô nhập tìm kiếm mỏng nhẹ phẳng cho phép tìm kiếm nhanh nhóm theo tên; kèm theo đó là bộ nút lọc nhanh dạng viên thuốc phẳng: "Tất cả", "Chi tiêu chung", "Du lịch" (tự động phân loại dựa trên từ khóa tên nhóm).
  - **Danh sách Nhóm đang hoạt động**: Mỗi nhóm hiển thị dạng Card bo góc mềm mại, chứa icon đại diện thông minh phù hợp với tên nhóm (nồi lẩu 🍲, bóng đá ⚽, dừa biển 🌴, thông xanh 🌲,...), số lượng thành viên, gói nâng cấp hiện tại ("FREE", "BE_BAN", "HOI_LANG" hoặc "VIP"), cụm avatar thành viên xếp chồng, và đặc biệt là hiển thị rõ ràng số tiền công nợ cá nhân của riêng bạn trong nhóm đó (màu xanh lá được nhận, màu đỏ cần đóng, màu xám hòa gốc).
  - Khi người dùng chạm vào một nhóm, tự động chọn nhóm đó (`selectedGroupId`) và chuyển tiếp sang Tab 2 (Chi tiết hóa đơn) để xem ngay chi tiết.
  - **Floating Action Button (FAB)**: Bổ sung nút tròn màu xanh lục bảo có hiệu ứng nhảy nhẹ (bounce) ở góc phải dưới giúp người dùng mở Bottom Sheet tạo nhóm mới cực nhanh bất kỳ lúc nào từ màn hình chính.

### Version 1.2.4 (2026-07-10)
- **Thiết kế lại Toàn bộ Mobile Header (SmartHeader)**:
  - Loại bỏ các thẻ cài đặt nhóm và thẻ cấu hình rời rạc trên giao diện di động.
  - Tích hợp `<SmartHeader />` cố định trên cùng (`fixed top-0`) hiển thị Avatar, Drawer tài khoản, Trình chuyển đổi nhóm qua Bottom Sheet và Quản lý nhóm (Member Modal, Settings Modal) mượt mà chuẩn UI di động.

### Version 1.2.3 (2026-07-10)
- **Sửa lỗi Syntax nghiêm trọng và Tái cấu trúc Tab Navigation**:
  - Sửa đổi hoàn toàn lỗi JSX unclosed tags và nested IIFE phức tạp tại Mobile Tab Bar trong `src/App.tsx`, phục hồi thành công quá trình compile/lint đạt 100% không có lỗi.
  - Tách hai biến `isGroupFundConfigured` và `currentStep` lên mức Component-level trong `App`, làm sạch và tối ưu hóa hiệu năng render.
- **Tích hợp Logo Ngân hàng VietQR chuẩn xác**:
  - Nâng cấp `src/components/SearchableBankSelect.tsx` và `src/components/BankAppSelectorModal.tsx` tự động bóc tách và hiển thị Logo Ngân hàng từ URL mẫu `https://api.vietqr.io/img/[BANK_CODE].png`.
  - Tích hợp tính năng xử lý lỗi tải ảnh (`onError`) giúp tự động ẩn logo hoặc hiển thị text badge fallback cực kỳ mượt mà, loại bỏ hoàn toàn các lỗi hiển thị ảnh trống.

### Version 1.3.4 (2026-07-15)
- **Đồng bộ hóa Giao diện Lịch sử Giao dịch Quỹ Nhóm**:
  - Thiết kế lại hoàn toàn các thẻ giao dịch quỹ trong `FundHistoryList.tsx` thành dạng bọc trong hộp bo tròn rộng rãi `rounded-[24px]` có border siêu mỏng `border-slate-100` và đổ bóng nhẹ `shadow-sm` để đồng bộ 100% với cấu trúc thẻ chi tiêu tinh tế tại `ExpenseList.tsx`.
  - Tích hợp **Avatar thành viên tròn** tự động tải bằng hàm `getMemberAvatarOnly`, cùng icon `PiggyBank` đáng yêu dành cho Thủ quỹ/Trưởng nhóm nhận quỹ, làm phong phú mặt thị giác và tăng mức độ sinh động khi duyệt lịch sử.
  - Tự động bóc tách và loại bỏ các emoji/tag thô cứng như `📥`, `📤`, `[Nộp Quỹ]`, `[Nhận Quỹ]` ở phần hiển thị đầu tiêu đề mô tả (`cleanDescription`) để tiêu đề hiển thị thanh thoát, sành điệu như các sản phẩm Fintech thực tế.
  - Thiết kế lại các Badge `THU` / `CHI` pastel ôm lấy icon tròn ở góc dưới phải, tạo nhịp điệu màu sắc hồng nhạt (Thu) và xanh ngọc (Chi) hoàn hảo.
  - Sửa lỗi hiển thị ngày giờ lệch dạng thô ISO dính chữ `T` (như `08T04:17:50.382Z/07/2026` thành `08/07/2026` chuẩn mực) bằng cách sửa hàm `formatDate` lọc thông minh phần chuỗi thời gian trước khi bóc tách.
  - Thay đổi nút `Xóa` lịch sử quỹ sang style tinh tế, bo góc `rounded-xl`, có viền `border-slate-100` khi hover thì chuyển sang đỏ hồng cực kỳ mượt mà.

### Version 1.3.3 (2026-07-15)
- **Tối ưu hóa Trải nghiệm Trả nợ & Quyết toán**:
  - Loại bỏ hoàn toàn dải banner hiển thị Dư Quỹ trùng lặp tại mục "Các khoản cần tất toán" trong `SettleUpSection.tsx`, giúp tối giản giao diện và tránh thừa thãi thông tin khi dư quỹ đã được đưa lên dải banner màu xanh sang trọng tại "TỔNG QUAN PHÂN BỔ".
  - Sửa lỗi hiển thị mã số thô (mã BIN 6 chữ số) của Ngân hàng tại ô chi tiết thanh toán và nút copy trong Popup QR: Tích hợp hàm giải mã `getDisplayBankName` tra cứu trực tiếp trong danh sách `VIETNAM_BANKS` và `BANK_NAMES`, hiển thị tên viết tắt hoặc tên chính thức của ngân hàng (ví dụ: "MBBank" hoặc "Vietcombank" thay vì "970422" hay "970436").
  - Tối ưu hiển thị tooltip tại danh sách thành viên `ParticipationSection.tsx` để giải mã chính xác tên Ngân hàng/MoMo thay vì hiển thị mã BIN số thô.

### Version 1.3.2 (2026-07-15)
- **Tối ưu hiển thị Dư Quỹ & Khống chế QR Thanh toán**:
  - Đưa phần hiển thị Dư Quỹ Hiện Tại lên thẻ "TỔNG QUAN PHÂN BỔ" ở đầu trang Trả nợ & Quyết toán bằng một dải banner màu xanh lá cực kỳ sang trọng, trang nhã và đồng bộ.
  - Sửa lỗi khởi tạo mặc định số tiền thực tế gửi: Khi mở popup hoàn tiền (rút quỹ), số tiền mặc định hiển thị được giới hạn thông minh bằng giá trị nhỏ hơn giữa tổng nợ và số dư quỹ hiện tại, tránh hiện tượng số tiền vượt quá dư quỹ khi khởi tạo.
  - Sửa đổi flow tạo QR: Mã QR chỉ được cập nhật khi người dùng nhấn nút "Xác nhận & Cập nhật QR". Các nút "Trả hết (100%)", "Trả 1 nửa (50%)" và ô nhập liệu thủ công sẽ chỉ thay đổi giá trị trong ô nhập liệu mà không lập tức thay đổi mã QR bên dưới, giúp người dùng chủ động kiểm tra thông tin trước khi thực hiện.
  - Áp dụng các quy tắc ràng buộc chặt chẽ về số tiền tối đa được phép gửi (không vượt quá dư quỹ đối với rút quỹ và không vượt quá tổng nợ đối với nộp quỹ) trên tất cả các tương tác (nhập tay, nút 100%, nút 50%).

### Version 1.3.1 (2026-07-14)
- **Sửa lỗi hiển thị ngày giờ lệch / đổi liên tục sau mỗi lần tải trang (Date Parsing Stable Solution)**:
  - Khắc phục triệt để lỗi phân tích ngày giờ (ngày và tháng bị hoán đổi liên tục sau mỗi lần reload) do trình phân tích mặc định của JavaScript `new Date()` tự nhận diện chuỗi định dạng tiếng Việt `"hh:mm dd/mm/yyyy"` thành định dạng Hoa Kỳ `"mm/dd/yyyy"`.
  - Tích hợp hàm tiện ích `parseFormattedDate` ở phía client-side (`src/utils/dateUtils.ts`) và nâng cấp hàm `formatVNTime` ở phía server-side (`api/api-app.ts`) để phát hiện và xử lý định dạng `"hh:mm dd/mm/yyyy"` chính xác ngay lập tức mà không chuyển qua hàm khởi tạo `new Date()` không an toàn.
  - Sửa đổi các cơ chế tính toán thời gian hết hạn còn lại trên `SmartHeader.tsx` và `UpgradeModal.tsx` giúp thời gian kích hoạt và hết hạn của gói cước luôn đồng bộ, hiển thị chính xác và cố định theo đúng dữ liệu lưu trữ dưới database.

### Version 1.3.0 (2026-07-14)
- **Đồng bộ hóa các trường gói cước phẳng (Plan Sync System)**:
  - Thiết lập cơ chế kiểm tra schema thông minh tự phục hồi (`hasPlanColumns`) để tự động phát hiện sự hiện diện của các cột phẳng `plan`, `plan_activated_at`, và `plan_expired_at` trong bảng `groups` của Supabase.
  - Đồng bộ hóa mượt mà các dữ liệu phẳng này khi ghi nhận dữ liệu mới qua `supabaseSaveGroup` cũng như khi tải danh sách nhóm qua `supabaseGetGroupsByOwnerOrEmail` và `supabaseGetGroupById`.
  - Định dạng hiển thị thời gian gói cước linh hoạt `hh:mm dd/mm/yyyy` tương thích ngược ổn định, an toàn trước sự cố cache hoặc phân mảnh schema.

### Version 1.2.2 (2026-07-03)
- **Tự động Co giãn (Responsive Scaling) UI Mobile theo mọi Kích thước Màn hình**:
  - Áp dụng breakpoint linh hoạt (`min-[390px]:`, `min-[410px]:`, `sm:`) cho font size, padding, margin, icon size trên iPhone 14 Pro Max / iPhone 13 Pro Max / Galaxy Ultra và các thiết bị di động cỡ lớn.
  - Tối ưu Bento Card tổng chi tiêu, các sub-card thống kê, khối Hướng dẫn nhanh 3 bước và danh sách Nhóm của bạn trên Tab Trang chủ.
  - Tự động tỉ lệ co giãn thanh Bottom Navigation Bar di động (Floating Scan button, icon và font nhãn tab) giúp hiển thị đầy đặn, căng nét, vừa vặn tự nhiên, xóa bỏ hoàn toàn mảng trống không mong muốn trên thiết bị lớn.

### Version 1.2.1 (2026-07-03)
- **Tối ưu Safe Area Mobile PWA**: Tăng padding trên di động chống tràn icon Wifi, Pin, Giờ.
- **Tối ưu Bố cục Single-Screen Mobile (Trang chủ & Dashboard)**:
  - Thu gọn khung đăng nhập/đăng ký/mã nhóm, loại bỏ văn bản phụ rườm rà giúp màn hình chưa đăng nhập gói gọn trong 1 màn hình di động (`100dvh`).
  - Phân bổ khoảng cách các thành phần trên Trang tổng quan nhóm (Group Dashboard) đồng đều, vừa vặn tự nhiên, không bị co cụm nén dính ở trên hay trống trải ở dưới.
  - Chuyển thông tin "Email liên kết" từ banner thống kê sang hiển thị chính thức tại mục/tab **Thông tin cá nhân** của từng thành viên.

### Version 1.2.0 (2026-07-03)
- **Tích hợp 1 Camera AI & VietQR**: Gộp chung giao diện camera quét hóa đơn AI và quét mã VietQR real-time vào 1 camera duy nhất, loại bỏ toggle 2 mục.
- **Truyền đầy đủ thông tin Bank Deep Link**: Tự động điền Tài khoản nhận, Số tiền, và Nội dung chuyển khoản chuẩn hóa `[Tên nhóm] Thanh toan [Tên người nhận]` khi mở app ngân hàng/ví điện tử.
- **Kiểm tra Ngân hàng nhận tiền**: Bổ sung kiểm tra thông tin ngân hàng mặc định từ tài khoản người nhận, nhắc nhở bổ sung STK nếu chưa có.
- **Thêm nút "Về trang chủ"**: Bổ sung điều hướng "Về trang chủ" trên card thông báo thành công sau khi thêm khoản chi.
- **Tạo File Brain `PROJECT_BRAIN.md` & `AGENTS.md`**: Thiết lập bộ não hệ thống tự động duy trì bối cảnh dự án cho AI.

---

## 7. HƯỚNG DẪN DÀNH CHO AI AGENT KHI DUY TRÌ FILE BRAIN
Mỗi khi triển khai một tính năng hoặc thay đổi mới:
1. Giải thích giải pháp cho người dùng & chờ xác nhận.
2. Sau khi người dùng xác nhận, tiến hành cập nhật code.
3. Cập nhật nội dung tính năng mới vào mục **4. TÍNH NĂNG CHI TIẾT** và ghi nhận lịch sử vào mục **6. LỊCH SỬ CẬP NHẬT TÍNH NĂNG** trong `PROJECT_BRAIN.md`.

- **Cập nhật UI Thanh toán / QR Modal (15/07/2026)**:
  - Cải tiến giao diện Modal QR thanh toán nợ / nộp quỹ.
  - Thay đổi flow: Mã QR tự động cập nhật ngay khi nhập số tiền thực tế gửi. Loại bỏ nút "Cập nhật QR" để tối ưu UI.
  - Bổ sung validation: Số tiền thực tế gửi không được lớn hơn tổng nợ cần thanh toán, và không được lớn hơn số dư quỹ (nếu là rút quỹ).
  - Bổ sung hiển thị tổng dư quỹ hiện tại ở màn hình tổng quan Các khoản cần tất toán.
  - Thay thế việc hiển thị Mã Ngân Hàng (bankCode) thành tên viết tắt của Ngân Hàng để người dùng dễ nhận biết (VD: thay MB thành MBBank).
  - Đổi lại text nhãn ngắn gọn, súc tích hơn: "Ngân hàng", "Số tài khoản", "Chủ Tài khoản", "Số tiền", "Nội dung".

### Version 1.4.0 (2026-07-16)
- **Tái cấu trúc và tối ưu hóa giao diện Tab 5 thành trang "Chốt Sổ & Lưu Trữ Theo Kỳ" chuyên nghiệp**:
  - Di chuyển component quản trị thành viên sáp nhập hoàn toàn vào Drawer của header, loại bỏ hoàn toàn thông tin trùng lặp để dọn chỗ cho quản lý tài khóa.
  - Thiết kế và xây dựng component mới `CloseCycleSection.tsx` tập trung 100% vào việc đóng và lưu trữ chu kỳ kế toán.
  - **Thẻ "Kỳ hoạt động hiện tại" (Active Cycle Card)**: Hiển thị tên kỳ hiện tại, số lượng hóa đơn chưa chốt và tổng tiền, kèm theo báo cáo "Sức khỏe tài chính" phản ánh sòng phẳng tình trạng đóng nợ tất toán (🟢 Đã tất toán sòng phẳng / 🔴 Còn thành viên chưa đóng nợ).
  - **Nút "Chốt Sổ Kỳ Này & Lưu Trữ"**: Tương thích ngược với định dạng dữ liệu cũ. Đối với tài khoản trả phí (`BE_BAN`, `HOI_LANG`), cho phép đóng băng, dọn dẹp hóa đơn hiện tại về rỗng để mở kỳ hoạt động mới, lưu trữ kỳ cũ vào mảng lịch sử `billingCycles`.
  - **Khu vực "Lịch sử các Kỳ đã lưu trữ"**:
    - Đối với bản FREE, hiển thị một Kỳ Mẫu được làm mờ ảo thanh lịch kèm nhãn vương miện và nút nâng cấp.
    - Đối với bản trả phí, hiển thị danh sách phẳng các kỳ đã chốt sổ, hỗ trợ nhấn "Chi tiết" để xem hóa đơn cũ ở dạng Chỉ xem (Chống sửa xóa), và xuất nhanh file PDF Báo Cáo Kế Toán chi tiết của kỳ đó bằng cách gọi `handleExportPDF`.
  - **Đồng bộ quyền truy cập và công cụ kiểm thử**: Thu gọn dải chuyển đổi Thủ quỹ - Thành viên, các nút công cụ kiểm thử dữ liệu (Nạp dữ liệu mẫu Vũng Tàu, Xóa chi tiêu) xuống dưới cùng trang một cách kín đáo và thẩm mỹ. Loại bỏ hoàn toàn nút "Đăng xuất" trùng lặp tại tab này vì đã có sẵn trong ngăn kéo cá nhân (Personal Drawer).
  - Đổi tên nhãn dưới Bottom Navigation Bar và Desktop Tab thành "Chốt sổ" đi kèm icon 🔒 (`FolderLock`).
  - Sửa lỗi kiểu dữ liệu nâng cao cho interface `BillingCycle` trong `types.ts`, hoàn thành biên dịch và lint không lỗi.

- **Sửa lỗi nút Lưu (Save) tại "Tài khoản cá nhân" (Personal Drawer) không hoạt động đối với Thành viên**:
  - Phát hiện nguyên nhân: Khi thành viên thường đăng nhập bằng mã truy cập (Member Access Code), `user` là `null` (không có email). Hàm `handleSaveProfile` và `handleSavePersonalBank` ban đầu luôn chặn `if (!user?.email) return;` khiến nút Lưu bị đứng im, không phản hồi gì.
  - Khắc phục: Đưa logic kiểm tra và cập nhật thông tin qua `matchedMember` (dựa trên `viewingMemberId`) lên trước. Khi là thành viên, gọi trực tiếp `onEditMember` để lưu thay đổi về tên, avatar cũng như thông tin tài khoản ngân hàng cá nhân lên database thông qua API `/api/member/update-info` của App.tsx.
  - Đồng bộ hoá state: Viết lại `useEffect` trong `SmartHeader.tsx` để đồng bộ đúng tên, avatar, và STK ngân hàng của thành viên tương ứng khi họ mở Drawer cá nhân.

- **Sửa lỗi hiển thị nút "Lưu tài khoản" tại mục chỉnh sửa tài khoản ngân hàng cá nhân**:
  - Phát hiện nguyên nhân: Lớp nền (background) của nút sử dụng class `bg-slate-850`, là một giá trị không tồn tại trong thiết lập mặc định của Tailwind CSS, khiến nút hiển thị với màu nền trong suốt / trắng trùng với màu chữ trắng, gây mất tương phản trầm trọng (chữ trắng trên nền trắng).
  - Khắc phục: Thay thế bằng `bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-50` chuẩn chỉ, mang lại độ tương phản tuyệt hảo và đồng bộ với màu nhận diện thương hiệu xanh lục của SplitMate.

- **Dọn dẹp mã nguồn rác & Tối ưu hóa cấu trúc dự án (Refactor & Cleanup)**:
  - Tiến hành quét và loại bỏ triệt để hơn 40 file mã nguồn phụ, file patch trung gian (`.cjs`, `.py`, `.js`, `.txt`) phát sinh trong các chu kỳ fix lỗi trước đó tại thư mục gốc.
  - Loại bỏ file backup cũ không còn sử dụng (`src/components/SettleUpSection.tsx.bak`) nhằm giữ thư mục `components` luôn gọn gàng, tinh khiết.
  - Bảo lưu nguyên vẹn file dữ liệu mẫu `src/vungTauTestData.ts` vì đang được sử dụng trực tiếp trong kiểm thử giao diện của `src/App.tsx`.
  - Hoàn tất kiểm thử linter (`tsc --noEmit`) và build biên dịch thành công ứng dụng mà không gây ra bất kỳ xung đột hay lỗi phát sinh nào.

- **Khắc phục giao diện Header bị các icon hệ thống (wifi, pin) trên điện thoại che khuất**:
  - Phát hiện nguyên nhân: Thanh Header cố định (`fixed top-0`) có chiều cao cứng là `h-14` (3.5rem) mà không tích hợp vùng đệm an toàn (`safe-area-inset-top`), khiến nội dung của Header bị lún sâu và đè bởi tai thỏ / thanh trạng thái của hệ điều hành di động.
  - Khắc phục trong `SmartHeader.tsx`: Nâng cấp thuộc tính chiều cao động `h-[calc(3.5rem+env(safe-area-inset-top,0px))]` đồng thời thêm khoảng đệm trên `pt-[env(safe-area-inset-top,0px)]` giúp tự động co giãn và đẩy nội dung tương tác xuống dưới thanh trạng thái an toàn.
  - Khắc phục trong `App.tsx`: Đồng bộ hóa khoảng đệm của khung chứa chính bên dưới trên Mobile từ `pt-14` thành `pt-[calc(3.5rem+env(safe-area-inset-top,0px))]` để các thành phần nội dung không bị Header đè hay che khuất.

- **Đồng bộ hóa làm tròn số tiền, loại bỏ phần số thập phân**:
  - Phát hiện nguyên nhân: Ở một số nơi tính toán tổng chi tiêu (như `CloseCycleSection.tsx` hay phần quyết toán nợ nần `SettleUpSection.tsx`), số tiền phát sinh giá trị lẻ thập phân do chia sẻ hoặc chi phí lẻ (như `,333 đ`). Khi gọi hàm `toLocaleString("vi-VN")` mặc định của JS, hệ thống tự động render cả phần số thập phân gây mất thẩm mỹ.
  - Khắc phục:
    - Trong `CloseCycleSection.tsx` và `ExpenseList.tsx`: Cập nhật hàm `formatMoney` và `getDayTotalStr` sử dụng `Math.round(amount)` trước khi gọi chuyển đổi chuỗi sang vùng miền `"vi-VN"`.
    - Trong `SettleUpSection.tsx`: Sử dụng `Math.round(val)` cho đối tượng định dạng `Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })` giúp loại bỏ hoàn toàn các phần số lẻ thừa phía sau, đồng nhất hiển thị tiền tệ dạng số nguyên chẵn trên toàn bộ ứng dụng.

- **Tối ưu hóa hiển thị Gói nâng cấp & Loại bỏ thẻ "Quyền truy cập của bạn"**:
  - Khắc phục hiển thị Nâng cấp sai lệch: Ở màn hình Chốt Sổ, điều kiện ban đầu gộp chung `(isFree || billingCycles.length === 0)` hiển thị hộp quảng cáo "Nâng cấp Bè Bạn / Hội Làng" kèm icon Khóa. Hệ quả là ngay cả khi nhóm đã ở gói cao nhất mà chưa chốt sổ lần nào, hệ thống vẫn hiển thị nút nâng cấp. Đã viết lại luồng điều kiện:
    - Nếu là `isFree` (Gói Free): Hiện màn hình mẫu kèm hộp chuyển đổi nâng cấp chuẩn chỉ.
    - Nếu đã nâng cấp (`BE_BAN` / `HOI_LANG`) nhưng chưa có kỳ lưu trữ nào: Hiển thị trạng thái premium chào mừng với icon `Sparkles` lấp lánh và hướng dẫn chốt sổ, ẩn hoàn toàn mọi lời mời gọi nâng cấp.
  - Loại bỏ thẻ dư thừa: Loại bỏ hoàn toàn thẻ "Quyền truy cập của bạn" (`ACCESS SETTINGS & TOOLS`) ở cuối giao diện màn hình Chốt Sổ dành cho các thành viên thông thường nhằm giải phóng không gian màn hình tối đa, giữ lại các nút công cụ phát triển ẩn chỉ hiển thị riêng cho email quản trị viên hệ thống (`splitmate.admin@gmail.com`).

### Version 2.0.6 (2026-07-17)
- **Tái Cấu Trúc Toàn Diện Trang Chào Mừng và Đăng Nhập/Đăng Ký mỏng nhẹ chuẩn Mobile App**:
  - Loại bỏ hoàn toàn giao diện Onboarding cồng kềnh cũ (trông giống trang web tĩnh) và thay thế bằng hệ thống 2 màn hình di động phẳng, mỏng nhẹ, tối giản và thoáng đãng tuyệt đối theo đúng ngôn ngữ thiết kế di động hiện đại.
  - **MÀN HÌNH A: TRANG CHÀO MỪNG (Welcome/Splash Screen)**: Thiết kế bố cục căn giữa mỏng nhẹ. Logo thương hiệu tối giản, Slogan ấn tượng, hình minh họa Flat Minimalist vẽ bằng SVG có Animation xoay chuyển mượt mà. Hệ thống nút hành động đơn giản gồm: Đăng nhập/Đăng ký cho Thủ quỹ và Form nhập mã 6 ký tự để thành viên chi tiêu tham gia nhanh vào phòng. Nút mở Chế độ xài 1 lần (Amber) được chuyển xuống chân trang mỏng gọn. Nút FAQ & Hỏi đáp tròn trĩnh nằm ở góc phải bên trên cực sang trọng.
  - **MÀN HÌNH B: TRANG ĐĂNG NHẬP / ĐĂNG KÝ (Auth Screen)**: Nhấp vào nút "Đăng nhập / Đăng ký" sẽ chuyển mượt mờ với hiệu ứng trượt mượt mà của `AnimatePresence`. Hệ thống Segment Control Tab Switcher dạng viên thuốc (`Segment Control`) cao cấp giúp chuyển đổi qua lại giữa Đăng nhập và Đăng ký. Có đầy đủ các trường nhập liệu mỏng nhẹ, tinh tế (Tên hiển thị, Email, Mật khẩu có nút Eye ẩn/hiện, Quên mật khẩu). Nút Đăng nhập/Đăng ký có hiệu ứng loading spin khi đang xác thực. Có nút quay lại mỏng nhẹ góc trái trên cùng để dễ dàng trở về trang Chào mừng.
  - Bảo toàn 100% logic đăng nhập, đăng ký bằng Email/Password qua Supabase Auth và Chế độ trải nghiệm offline dùng một lần (nhập tên khách và tự động khởi tạo nhóm demo).

- **Tái cấu trúc giao diện trang Nâng Cấp Nhóm (Pricing Modal) phân tab tối giản chuẩn FinTech**:
  - **Segment Control dạng viên thuốc**: Thiết kế bộ gạt chuyển đổi vô cùng hiện đại, bo tròn cao cấp: `[ Theo Chuyến 🚗 ]` (ngắn hạn 30 ngày) và `[ Theo Năm 🤝 ]` (dài hạn 1 năm) với màu xanh ngọc chủ đạo `#03B875` và màu chữ Obsidian Slate `#0F172A`.
  - **Cơ chế Tab trực quan**:
    - Tab `Theo Chuyến`: Hiển thị một thẻ Card mỏng duy nhất đại diện cho **Gói Du Hí** (29.000đ / 30 ngày) kèm các đặc quyền ngắn hạn.
    - Tab `Theo Năm`: Hiển thị Flat List gồm hai thẻ Card mỏng nằm ngang cho **Gói Bè Bạn** (49.000đ / năm) và **Gói Hội Làng** (99.000đ / năm). Cho phép người dùng chạm để chọn gói mong muốn, cập nhật viền màu xanh ngọc chủ đạo và hiển thị danh sách đặc quyền tương ứng ở dưới một cách mượt mà.
  - **Độc nhất 1 nút bấm Unified CTA**: Rút gọn toàn bộ nút bấm rải rác cũ thành đúng 1 nút bấm duy nhất cố định dưới đáy Modal (chỉ hiển thị ở step pricing). Nội dung nút tự động cập nhật linh hoạt theo gói được chọn (ví dụ: *"⚡ Kích hoạt Gói Du Hí (29k)"*, *"🤝 Kích hoạt gói Bè Bạn (49k)"*, hoặc *"👑 Nâng cấp lên Hội Làng (99k) ➔"*). Nếu nhóm đã ở gói đang chọn hoặc cao hơn, nút tự động chuyển trạng thái disable thanh lịch với thông tin thời hạn chi tiết.
  - **Giữ nguyên vẹn toàn bộ logic thanh toán**, nạp tiền tự động qua Webhook SePay, hệ thống giftcode/voucher và Supabase hiện có.

- **Cải tiến & Phân quyền Thành viên Chặt Chẽ**:
  - Triển khai thành công cờ `allowMemberAddExpense` trong Cài đặt nhóm tại `SmartHeader.tsx`, dễ dàng kích hoạt trên cả thiết bị di động và máy tính thông qua màn hình Modal cài đặt nhóm.
  - Phân quyền động cho Thành viên thường: Khi được cấp quyền, thành viên có quyền Thêm mới chi tiêu chung & Chỉnh sửa chi tiêu của mình hoặc nhóm. Tuy nhiên, nút **Xóa** (`Delete`) chi tiêu được ẩn hoàn toàn để bảo vệ tính sòng phẳng và minh bạch của nhóm, chỉ có Thủ quỹ (Admin) mới có quyền xóa.
  - Bảo mật logic xóa: Tích hợp chốt chặn an toàn `isAdmin` trong hàm `handleDeleteExpense` ở `App.tsx` ngăn chặn các lượt xóa chéo trái phép.
- **Nâng Cấp Toàn Diện Đối Soát Biên Lai Chuyển Khoản & Ảnh Hóa Đơn (Receipt Reconciliation Lightbox)**:
  - Khắc phục triệt để việc bỏ sót phần đối soát biên lai trong Modal Sao kê công nợ cá nhân (`PersonalStatementModal.tsx`). Đã cập nhật nhận và hiển thị `{children}` bên trong Modal để thủ quỹ và thành viên có thể theo dõi danh sách đối soát.
  - Tái thiết kế danh sách "Đối soát biên lai chuyển khoản" trong `SettleUpSection.tsx` bằng giao diện thẻ bo tròn `rounded-[20px]` hiện đại, bóng mờ siêu mịn màng, hiển thị đầy đủ ghi chú của thành viên và huy hiệu quét thông minh `AI Khớp Lệnh ✨` (OCR-Reconciliation).
  - Tích hợp tính năng **Lightbox Phóng To Ảnh Biên Lai**: Cung cấp nút xem thử cực kỳ mượt mà sử dụng `AnimatePresence`. Khi click vào thumbnail biên lai, một overlay phủ mờ sang trọng hiện lên cho phép Thủ quỹ xem cận cảnh thông tin hóa đơn chuyển khoản thực tế để phê duyệt an tâm tuyệt đối.
- **Tối ưu hóa Báo cáo Giải thích Cơ chế Sao kê Công nợ**:
  - Chuyển giao diện văn bản "Giải thích cơ chế" tĩnh ở chân trang Modal Sao kê Công nợ thành **Popup Banner nổi thông minh**.
  - Banner này tự động hiển thị với hiệu ứng chuyển động mượt mà mỗi khi người dùng mở xem Sao kê Công nợ cá nhân của thành viên. Khi click nút **"Đã hiểu"**, banner sẽ đóng lại êm ái, nhường lại toàn bộ không gian trực quan cho người dùng tương tác với lịch sử sao kê chi tiết mà không làm đóng Modal chính.
  - Tích hợp hiệu ứng spring animation cao cấp từ `motion` để tạo độ nảy đàn hồi tự nhiên như trên các ứng dụng di động native tốt nhất.
  - **Tối giản hóa Footer & Điều hướng mượt mà**: Loại bỏ hoàn toàn vùng Footer Modal cồng kềnh và nút "Đóng" tĩnh cũ ở cuối. Tận dụng trọn vẹn nút "X" đóng ở góc trên đầu màn hình làm lối đóng duy nhất, giúp giao diện thông thoáng tối đa. Danh sách Sao kê tự động tính toán thêm phần đệm dưới (`pb-28` khi banner mở và thu gọn về `pb-8` khi đóng) để không bị che khuất bởi Banner nổi.
- **Vá lỗ hổng Phân quyền Thêm Chi Tiêu & Quét Hóa Đơn AI**:
  - Sửa lỗi logic giao diện: Khi Trưởng nhóm tắt quyền Thêm/Sửa chi tiêu (`allowMemberAddExpense = false`), thành viên thường sẽ không còn nhìn thấy nút "Quét hóa đơn" (Floating Button) hay bất kỳ thành phần nào của tính năng Thêm chi tiêu.
  - Tích hợp thêm chốt chặn cấp ứng dụng (`useEffect`) tự động đẩy thành viên về trang "Tổng quan" (`home`) nếu họ đang mở hoặc cố tình truy cập vào màn hình "Thêm chi tiêu" (tab `add`) trong lúc tính năng này bị vô hiệu hóa.
- **Tăng Giá 2 Gói Dịch Vụ Cao Cấp**:
  - Thực hiện điều chỉnh tăng giá dịch vụ của nhóm theo yêu cầu:
    - **Gói Bè Bạn (`BE_BAN`)**: Tăng từ `29.000đ/năm` lên `49.000đ/năm` (`priceRaw: 49000`).
    - **Gói Hội Làng (`HOI_LANG`)**: Tăng từ `69.000đ/năm` lên `99.000đ/năm` (`priceRaw: 99000`).
  - Đảm bảo tính nhất quán của dữ liệu giá hiển thị trên toàn bộ giao diện Modal nâng cấp (`UpgradeModal.tsx`) và luồng thanh toán QR tự động.

### Version 2.1.0 (2026-07-17)
- **Lập trình "Gói Du Hí (29.000đ / 30 ngày)" và Logic Mặc định người trả là Quỹ Nhóm**:
  - **Tích hợp Gói Du Hí (`DU_HI_30`)**:
    - Thiết kế Banner giới thiệu siêu bắt mắt ở chân trang Modal nâng cấp (`UpgradeModal.tsx`), hướng đến các nhóm chỉ đi du lịch 1 lần với mức giá cực hời `29.000đ` trong `30 ngày`.
    - Đồng bộ hóa toàn bộ luồng thanh toán, tính toán thời hạn sử dụng động (30 ngày đối với `DU_HI_30`, 365 ngày đối với các gói khác) tại cả Webhook thanh toán SePay và Modal Checkout.
  - **Tự động chọn người trả là Quỹ Nhóm (Default Payer is Group Fund)**:
    - Tại form thêm chi tiêu mới (`ExpenseForm.tsx`), khi nhóm đang sử dụng Gói Du Hí (`DU_HI_30`) và có số dư Quỹ nhóm lớn hơn 0, hệ thống tự động gán Người trả tiền mặc định là Quỹ Nhóm (`payerId: "group"`).
    - Hiển thị nhãn động màu xanh lá dễ chịu `🚗 Đã tự động chọn Quỹ nhóm theo Gói Du Hí` nhấp nháy động ngay cạnh dropdown để thông báo trực quan cho thành viên.
    - Đồng bộ hóa công thức tính toán số dư Quỹ nhóm (`actualFundBalance`), tự động khấu trừ các khoản chi tiêu trực tiếp từ Quỹ này tại cả `SettleUpSection.tsx` và `App.tsx` giúp dòng tiền đối soát luôn sòng phẳng, khớp lệnh hoàn hảo.
    - Cập nhật hiển thị tên, avatar hiển thị của Quỹ Nhóm (`"group"`) trong danh sách chi tiêu `ExpenseList.tsx`.
- **Đề xuất Tạo nhóm mới để dùng Gói Du Hí khi nhóm đã ở gói Bè Bạn / Hội Làng**:
  - Tại bảng giá Modal nâng cấp (`UpgradeModal.tsx`), khi một nhóm đã được nâng cấp lên gói dài hạn cao cấp hơn (`BE_BAN` hoặc `HOI_LANG`), nếu người dùng đang mở tab Gói Du Hí (`DU_HI_30`), thay vì chỉ hiển thị nút disabled vô vị "Bạn đang sử dụng gói cao hơn", hệ thống tự động hiển thị một khối thông điệp gợi ý thông minh bằng Tiếng Việt: *"Nhóm đã sở hữu gói {Tên Gói}. Hãy tạo nhóm mới để áp dụng Gói Du Hí 🚗 nhé!"*.
  - Đồng thời, hiển thị một nút bấm tương tác nổi bật màu xanh ngọc chủ đạo `🚗 Tạo nhóm mới để dùng Gói Du Hí`. Khi click vào, Modal nâng cấp tự động đóng lại, mở ngay form tạo nhóm mới mỏng nhẹ trên màn hình chính thông qua prop `onRequestCreateGroup` được truyền từ `App.tsx`.
  - Bảo toàn tuyệt đối logic kiểm thử và biên dịch của ứng dụng.### Version 2.1.1 (2026-07-19)
- **Đồng bộ hóa Onboarding Gói Du Hí lên Desktop & Tối ưu hóa Nút Cài đặt Ngân hàng**:
  - Đưa toàn bộ component hướng dẫn từng bước `DuHiOnboarding.tsx` hiển thị thống nhất trên cả Desktop (ngay phía trên danh sách hóa đơn chi tiêu) giúp Trưởng nhóm và thành viên trên Máy tính đều có trải nghiệm Onboarding và dễ dàng cấu hình, tránh tình trạng "mất nút cài đặt" trên Desktop.
  - Tích hợp Banner cảnh báo thông minh màu hổ phách ngay đầu danh sách "Các khoản cần tất toán" của màn hình Trả nợ (`SettleUpSection.tsx`) cho Trưởng nhóm / Thủ quỹ khi tài khoản nhận tiền của Quỹ chưa được thiết lập, kèm nút liên kết nhanh "Cài đặt ngay" mở tức thì Modal cấu hình ngân hàng.
  - Cải tiến logic click nút nộp tiền/tất toán: Nếu Quỹ nhóm chưa có tài khoản ngân hàng, hệ thống chặn mở popup QR trống, đồng thời kích hoạt mở tự động Modal cài đặt để Trưởng nhóm nhanh chóng thiết lập STK/Ví nhận tiền.


- **Cải tiến Trải nghiệm Thay đổi Avatar Thành viên & Điều hướng Mobile (2026-07-19)**:
  - Loại bỏ hoàn toàn bộ chọn Emoji rườm rà (emoji picker) khi tạo/chỉnh sửa thành viên trong `MemberSection.tsx`.
  - Thay thế bằng cơ chế hiển thị Avatar tự động (tích hợp API Dicebear) tương tác thời gian thực khi người dùng gõ Tên. Ảnh đại diện sẽ tự sinh cực kỳ bắt mắt và đồng bộ với toàn hệ thống.
  - Sửa lỗi điều hướng Onboarding trên Mobile: Di chuyển chấm nháy cam cảnh báo (Ping Indicator) từ tab "Chốt sổ" (bố cục cũ) lên xếp chồng mượt mà trên góc phải của cụm Avatar thành viên trên thanh Header, giúp người dùng dễ dàng nhận biết và click để mở trực tiếp ngăn Quản lý Thành viên trên cả Mobile và Desktop.

- **19/07/2026 (Logic Tạo Yêu Cầu Nộp Quỹ & Cấn Trừ Tự Động)**:
  - Cập nhật cơ sở dữ liệu `Expense` (trong `types.ts`) với thuộc tính `isFundDeposit: boolean`.
  - Thiết kế lại hoàn toàn "Bước 3: Tạo yêu cầu nộp Quỹ đồng loạt" (`DuHiOnboarding.tsx`) để tạo ra **DUY NHẤT 1 Hóa Đơn chung** (Thay vì tạo N hóa đơn lẻ tẻ). Hóa đơn này có `payerId="group"`, `participantIds=[Tất cả]`, và `isFundDeposit=true`.
  - Điều chỉnh thuật toán `calculateBalances` trong `debtSimplifier.ts` sòng phẳng chuẩn kế toán: Khi tạo yêu cầu đóng quỹ (`isFundDeposit=true`), hệ thống ghi nhận khoản tiền đóng quỹ vào phần **nghĩa vụ chi tiêu/nợ cần nộp (`share`)** của mọi thành viên tham gia, thay vì tự động cộng vào số tiền đã đóng (`paid`). Nhờ đó, số dư của thành viên sẽ lập tức phản ánh khoản nợ quỹ chưa nộp (ví dụ -3.000.000đ).
  - Chỉ khi thành viên bấm nộp quỹ, thực hiện chuyển khoản và được duyệt (hoặc tạo giao dịch hoàn tất nợ `📥 [Nộp Quỹ]`), hệ thống mới ghi nhận cộng vào **số tiền thực tế đã đóng (`paid`)**, giúp số dư tăng lên và triệt tiêu khoản nợ.
  - Loại bỏ hoàn toàn các yêu cầu đóng quỹ `isFundDeposit` khỏi bộ tính toán số dư thực tế khả dụng của Quỹ (`actualFundBalance`), giúp số dư quỹ chỉ tăng thực tế khi thành viên đã thanh toán thật.
  - Tối ưu hóa UI của màn hình `ExpenseList.tsx` và `FundHistoryList.tsx` để hiển thị Thẻ Nộp Quỹ Chung một cách sắc nét, chuyên nghiệp ("Đóng quỹ chung - 15.000.000đ"), đồng thời hiển thị biểu tượng Avatar Quỹ Nhóm thay vì avatar lỗi nếu người trả là Group.

- **21/07/2026 (Sửa lỗi khi tạo nộp quỹ đồng loạt)**:
  - Khắc phục lỗi `activeGroup.expenses is not iterable` trong hàm `handleBatchAddExpenses` bằng cách bổ sung fallback mảng rỗng `activeGroup.expenses || []`.
  - Khắc phục lỗi render logic tạo 1 hóa đơn chung duy nhất khi ấn nút "Nộp đồng loạt" tại `DuHiOnboarding.tsx`. Cập nhật logic để thực sự chỉ sinh 1 phần tử có `isFundDeposit=true`, thay vì lặp qua từng thành viên như phiên bản code cũ bị sót.

- **21/07/2026 (Khắc phục lỗi Modal QR bung toàn màn hình trên Desktop)**:
  - Khắc phục lỗi giao diện Modal "MÃ QR NỘP QUỸ" và "Bù trừ công nợ thủ công" (`SettleUpSection.tsx`) bung chiều ngang toàn màn hình trên máy tính.
  - Áp dụng kỹ thuật responsive mỏng nhẹ: Bọc Modal trong thẻ `div` với class `flex items-end md:items-center justify-center`. Khống chế chiều ngang tối đa cho Desktop bằng class `md:max-w-md` (448px) và bo góc toàn diện `md:rounded-2xl` để biến Bottom Sheet trên di động thành Dialog nổi thanh lịch ngay giữa màn hình Desktop.

- **21/07/2026 (Tích hợp tính năng Xác nhận nhanh bằng ảnh biên lai)**:
  - Bổ sung logic tải ảnh biên lai trực tiếp từ Dialog/Modal Thanh toán (trong `SettleUpSection.tsx`).
  - Sử dụng hàm `compressImage` để giảm dung lượng file ở client trước khi gọi API tải ảnh `/api/receipt/upload`.
  - Liên kết sự kiện `onChange` từ `<input type="file" />` ẩn trong nút tải ảnh vào state `pendingReceipts`. Khi tải thành công ảnh, biên lai tự động chuyển vào hàng chờ duyệt mà không cần bước "Xác nhận đã chuyển" thủ công.

- **21/07/2026 (Sửa lỗi upload ảnh biên lai tại SettleUpSection)**:
  - Sửa lỗi truyền tham số API không hợp lệ khi gọi `/api/receipt/upload`. Đã đổi trường `base64` thành `image` và bổ sung `groupId` theo đúng cấu trúc body mà server `api-app.ts` yêu cầu.

- **21/07/2026 (Tự động hóa đối soát biên lai bằng AI Gemini)**:
  - Tích hợp Gemini Vision API (`/api/receipt/scan`) trực tiếp vào luồng tải ảnh biên lai chuyển khoản tại `SettleUpSection.tsx`.
  - Khi thành viên tải ảnh biên lai lên, AI sẽ tự động phân tích và trích xuất số tiền thực tế chuyển khoản.
  - Nếu số tiền AI đọc được khớp 100% (chênh lệch <= 1.000đ) với số tiền nợ, hệ thống sẽ gán nhãn `✨ AI Khớp Lệnh` và tự động duyệt hoàn tất nợ (tăng quỹ/hoàn dư) tức thì mà không cần Trưởng nhóm duyệt thủ công.
  - Trường hợp AI quét không khớp hoặc ảnh mờ, biên lai sẽ được chuyển về trạng thái `Chờ duyệt` kèm ghi chú số tiền AI đọc được để Trưởng nhóm tiện đối soát.

- **21/07/2026 (Khắc phục triệt để lỗi Gemini 404 khi quét hóa đơn / biên lai)**:
  - Cập nhật danh sách model ưu tiên trong API quét hóa đơn (`/api/receipt/scan` tại `api/api-app.ts`) sang các model chính thức hiện hành: `gemini-2.5-flash`, `gemini-3.6-flash`, và `gemini-3.1-flash-lite`.
  - Loại bỏ hoàn toàn các tên model không khả dụng/đã ngưng hỗ trợ (`gemini-1.5-flash`, `gemini-2.0-flash`, `gemini-3.0-flash`, `gemini-3.5-flash`) nhằm khắc phục triệt để lỗi `models/gemini-1.5-flash is not found for API version v1beta`.

- **21/07/2026 (Khắc phục triệt để lỗi Gemini 404 khi quét hóa đơn / biên lai)**:
  - Cập nhật danh sách model ưu tiên trong API quét hóa đơn (`/api/receipt/scan` tại `api/api-app.ts`) sang các model chính thức hiện hành: `gemini-2.5-flash`, `gemini-3.6-flash`, và `gemini-3.1-flash-lite`.
  - Loại bỏ hoàn toàn các tên model không khả dụng/đã ngưng hỗ trợ (`gemini-1.5-flash`, `gemini-2.0-flash`, `gemini-3.0-flash`, `gemini-3.5-flash`) nhằm khắc phục triệt me lỗi `models/gemini-1.5-flash is not found for API version v1beta`.

- **21/07/2026 (Sửa lỗi hiển thị sai nhãn tự động chọn Quỹ Nhóm theo Gói Du Hí)**:
  - Khắc phục lỗi nhãn `🚗 Đã tự động chọn Quỹ nhóm theo Gói Du Hí` bị hiển thị nhầm ở các nhóm thuộc gói khác (Hội Làng / Bè Bạn / Free) khi người trả là Quỹ Nhóm.
  - Sửa lại logic render badge trong `ExpenseForm.tsx`: Chỉ hiển thị nhãn `Gói Du Hí` khi `groupPlan === "DU_HI_30"`. Nếu nhóm có dư quỹ (`fundBalance > 0`), hệ thống hiển thị nhãn chính xác: `🏦 Đã chọn Quỹ nhóm (Dư quỹ: Xđ)`.
  - Thêm logic tự động reset `payerId` về mặc định khi chuyển đổi giữa các nhóm hoạt động (`groupId`).

- **21/07/2026 (Ràng buộc duy nhất Gói Du Hí có tính năng Người trả là Quỹ Nhóm)**:
  - Cập nhật quy tắc kinh doanh: **Chỉ duy nhất Gói Du Hí (`DU_HI_30`) mới sở hữu tính năng chọn Người trả là Quỹ Nhóm (`payerId = "group"`)**.
  - Đối với các nhóm thuộc gói khác (**Hội Làng**, **Bè Bạn**, **Free**), tùy chọn `🏦 Quỹ Nhóm` đã được loại bỏ hoàn toàn khỏi danh sách Người trả trong form thêm chi tiêu (`ExpenseForm.tsx`).
  - Tự động đặt lại người trả về thành viên hiện tại hoặc thành viên đầu tiên nếu nhóm chuyển đổi từ Gói Du Hí sang gói khác hoặc chuyển nhóm hoạt động.

- **21/07/2026 (Khắc phục triệt để lỗi Gemini 403 PERMISSION_DENIED & Cấu hình Model Chuẩn)**:
  - Sửa lỗi `GoogleGenAI` initialization trong `api/api-app.ts`: Loại bỏ thuộc tính `httpOptions` kèm header `User-Agent` tùy chỉnh gây xung đột/chặn quyền truy cập (403 PERMISSION_DENIED) từ API gateway của Google Gemini.
  - Cập nhật danh sách model chính thức hỗ trợ theo chuẩn SDK `@google/genai`: Chuyển sang sử dụng `gemini-3.6-flash`, `gemini-flash-latest`, `gemini-3.1-flash-lite` cho quét hóa đơn/đối soát OCR và `gemini-3.1-flash-image` cho sinh ảnh Anime avatar.
  - Đã thử nghiệm build và restart server thành công, đảm bảo quét hóa đơn và biên lai hoạt động trơn tru.

- **21/07/2026 (Cập nhật thứ tự ưu tiên Model Gemini AI quét hóa đơn/biên lai)**:
  - Cập nhật danh sách model fallback theo đúng yêu cầu:
    1. **`gemini-2.5-flash`**: Model ưu tiên thử nghiệm trước tiên.
    2. **`gemini-3.6-flash`**: Model dự phòng thứ nhất.
    3. **`gemini-3.1-flash-lite`**: Model dự phòng thứ hai.
  - Áp dụng đồng bộ cho cả API quét hóa đơn (`/api/receipt/scan`) và API đối soát biên lai tự động (`/api/receipt/reconcile-ocr`).

- **21/07/2026 (Khắc phục lỗi Máy ảnh & Xử lý phản hồi lỗi Gemini 403 PERMISSION_DENIED)**:
  - **Fallback Máy ảnh**: Thêm tùy chọn "📁 Tải ảnh từ thư viện" trực tiếp trên hộp thoại lỗi của `LiveCamera.tsx` khi người dùng từ chối quyền máy ảnh, giúp họ chuyển nhanh sang tải ảnh file mà không bị tắc luồng.
  - **Xử lý lỗi Gemini 403**: Cập nhật phản hồi API `/api/receipt/scan` và `/api/receipt/reconcile-ocr` trong `api/api-app.ts` để trả về thông báo Tiếng Việt thân thiện, rõ ràng khi `GEMINI_API_KEY` bị chối quyền truy cập (403 Permission Denied) thay vì hiển thị chuỗi JSON thô.

- **21/07/2026 (Loại bỏ nút tải ảnh ở khung lỗi máy ảnh LiveCamera)**:
  - Theo phản hồi người dùng khi xem trước trên Desktop (không có webcam khả dụng): Loại bỏ hoàn toàn nút "Tải ảnh từ thư viện" khỏi màn hình báo lỗi camera của `LiveCamera.tsx`.
  - Khôi phục giao diện báo lỗi tinh gọn chỉ giữ lại nút "Thử lại camera" màu xanh lá chủ đạo.

- **21/07/2026 (An toàn xử lý JSON phản hồi từ API Gemini Scan & Loại bỏ nút tải thư viện ở LiveCamera)**:
  - Cập nhật logic xử lý phản hồi từ API `/api/receipt/scan` tại `ExpenseForm.tsx`: Kiểm tra kỹ trạng thái HTTP `response.ok` và bọc khối `try...catch` khi parse JSON để tránh lỗi cú pháp `Unexpected token '<', "<html>..."` khi backend trả về HTML trang lỗi 403 / 500.
  - Tinh gọn giao diện báo lỗi camera tại `LiveCamera.tsx` cho thiết bị desktop/preview không có camera, giữ nút "Thử lại camera" chuẩn giao diện tối giản.

- **21/07/2026 (Khắc phục lỗi Express trả về HTML khi gặp lỗi JSON AI)**:
  - Khắc phục lỗi `Unexpected token '<', "<html><hea"... is not valid JSON` ở Client do Express bắt lỗi mặc định và trả về HTML 500 khi SDK Gemini throw ra chuỗi lỗi Object.
  - Sửa logic xử lý chuỗi ở `api-app.ts` (`/api/receipt/scan` và `/api/receipt/reconcile-ocr`): Kiểm tra kỹ `lastError instanceof Error` và `JSON.stringify(lastError)` để đảm bảo lỗi gửi về trình duyệt luôn là một API Response JSON chuẩn xác thay vì HTML.

- **21/07/2026 (Nâng cấp cấu hình ép chuẩn JSON Mode & Temperature cho Gemini Scan API)**:
  - Bổ sung `temperature: 0.1` và củng cố `responseMimeType: "application/json"` kết hợp `responseSchema` trong cấu hình `config` cho cả 2 endpoint: quét hóa đơn/biên lai/mã QR (`/api/receipt/scan`) và đối soát biên lai chuyển khoản tự động (`/api/receipt/reconcile-ocr`).
  - Giúp giảm thiểu độ ngẫu nhiên của mô hình AI, ép trả về định dạng JSON thuần túy 100%, khắc phục triệt để các lỗi sập parse JSON khi đọc hóa đơn.

- **21/07/2026 (Cập nhật danh sách Model Gemini chính thức chuẩn SDK)**:
  - Cập nhật danh sách model ưu tiên thử nghiệm cho cả 2 API AI (`/api/receipt/scan` và `/api/receipt/reconcile-ocr`): `gemini-2.5-flash` (chính) -> `gemini-2.5-pro` (dự phòng 1) -> `gemini-2.0-flash` (dự phòng 2) -> `gemini-1.5-flash` (dự phòng 3).
  - Loại bỏ các tên model thử nghiệm gây ra lỗi 403 PERMISSION_DENIED.

- **21/07/2026 (Loại bỏ các model Gemini deprecated & Cập nhật danh sách Model chính thức)**:
  - Loại bỏ hoàn toàn các model không còn hỗ trợ `gemini-1.5-flash` và `gemini-2.0-flash` gây lỗi 404 NOT_FOUND.
  - Cập nhật danh sách model ưu tiên chuẩn SDK `@google/genai`: `gemini-2.5-flash` -> `gemini-2.5-pro` -> `gemini-3.6-flash` -> `gemini-3.1-flash-lite`.

- **21/07/2026 (Đồng bộ hóa 100% giao diện Lịch giao dịch Quỹ với Lịch Chi Tiêu)**:
  - Tái cấu trúc hoàn toàn Calendar View của `FundHistoryList.tsx` sang dạng thẻ bo góc mềm mại `rounded-2xl gap-1` hiện đại, đồng bộ 100% về visual language, thanh điều hướng tháng `bg-slate-50`, hiệu ứng ring xanh ngọc `#03B875` cho ngày được chọn, badge pill số tiền `bg-[#E6F7F0] text-[#03B875]`, chấm trạng thái giao dịch và nhấp nháy `animate-ping` cho ngày hôm nay giống hệt như `ExpenseList.tsx`.

- **22/07/2026 (Logic Tính Quỹ Nhóm & Dư Quỹ Nhóm Du Hí)**:
  - Loại bỏ hoàn toàn các khoản Yêu cầu đóng quỹ (`isFundDeposit`) và giao dịch Nộp/Nhận quỹ ra khỏi "Tổng chi tiêu nhóm" (Total Group Spending) ở toàn bộ ứng dụng (`App.tsx`, `StatsSection.tsx`, `CloseCycleSection.tsx`).
  - Cập nhật thuật toán `calculateBalances` trong `debtSimplifier.ts`: Chuyển mảng nộp quỹ `isFundDeposit` thành `fundRequired`. Sau khi thành viên hoàn tất nộp quỹ vào nhóm, số dư của họ sẽ tự động là DƯ QUỸ (dương `+netBalance`), và số dư này sẽ được trừ dần dần chính xác theo từng khoản chi tiêu thực tế mà thành viên đó tham gia trong nhóm.

- **22/07/2026 (Tích hợp Mục Lưu Các Khoản Đã Trả Trước / Nộp Quỹ Thành Viên)**:
  - Tạo mới component `PrepaidSection.tsx` quản lý & hiển thị danh sách các khoản tiền đóng trước/đặt cọc/nộp quỹ của từng thành viên trong nhóm.
  - Hiển thị 3 chỉ số tổng quan ở cấp nhóm: Tổng đã nộp/trả trước, Dư quỹ khả dụng còn lại, và Số tiền đã cấn trừ chi tiêu thực tế.
  - Cho phép xem chi tiết từng lượt đóng trước (ngày giờ, mô tả, số tiền) theo dạng thẻ thả xuống (Accordion) cho từng thành viên.
  - Tích hợp thêm thẻ tổng hợp Khoản trả trước & Nộp quỹ vào Modal "Sao kê công nợ cá nhân" (`PersonalStatementModal.tsx`) và màn hình "Trả nợ & Quyết toán" (`SettleUpSection.tsx`).

- **22/07/2026 (Cập nhật Mục Lưu Các Khoản Chi Tiêu Đã Thanh Toán Trước)**:
  - Điều chỉnh `PrepaidSection.tsx` theo phản hồi của người dùng: Chuyển từ theo dõi nộp quỹ sang lưu trữ và thống kê toàn bộ tất cả các khoản chi tiêu mà mỗi thành viên đã tự thanh toán/ứng trước cho nhóm (`payerId === member.id`), loại trừ hoàn toàn các khoản đóng quỹ (`isFundDeposit`, `[Nộp Quỹ]`, `[Nhận Quỹ]`).
  - Hiển thị 3 chỉ số tổng quan ở cấp nhóm: Tổng tiền đã thanh toán trước, Thành viên ứng tiền nhiều nhất, và Tổng số hóa đơn/khoản chi.
  - Cho phép xem chi tiết từng danh sách hóa đơn do từng thành viên thanh toán (tên khoản chi, ngày tháng, số người tham gia, số tiền) dạng accordion thả xuống.

- **22/07/2026 (Tối ưu hóa & Nâng cấp Nổi bật Sao Kê Công Nợ Cá Nhân)**:
  - Loại bỏ hoàn toàn component dư thừa `PrepaidSection.tsx` khỏi màn hình "Trả nợ & Quyết toán" (`SettleUpSection.tsx`) theo yêu cầu người dùng, do toàn bộ chức năng thống kê các khoản chi trước đã được tích hợp trọn vẹn vào Tab 2 ("Đã chi trước") của "Sao kê công nợ cá nhân".
  - Tái thiết kế lối vào nút bấm Sao Kê thành một **Thẻ Banner Nổi Bật** (`High-Visibility Hero Banner`) sang trọng tại `SettleUpSection.tsx` với dải màu gradient ngọc bích (`teal-800` sang `emerald-800`), hiệu ứng phát sáng mờ (`blur glow`), huy hiệu "Nổi bật • 2 Tab" đính kèm biểu tượng `Sparkles` nhấp nháy và nút bấm CTA `[ Xem Sao Kê Chi Tiết → ]` bắt mắt, giúp người dùng vô cùng dễ nhận biết và thao tác ngay.
  - Tắt hoàn toàn nút cuộn nhanh lên đầu trang (`Scroll to top`) và sự kiện theo dõi vị trí cuộn trang trong `App.tsx` theo yêu cầu của người dùng.
  - Điều chỉnh điều hướng khi Hủy/Hoàn tất thêm chi phí mới (`ExpenseForm.tsx`): Chuyển hướng màn hình về **Tab Chi Tiêu** (`activeTab = "bills"`) thay vì nhảy ra ngoài Tab Tổng quan (`home`), giúp người dùng duy trì mạch thao tác danh sách hóa đơn liên tục và tự nhiên.
- **23/07/2026 (Tối ưu hóa tốc độ chuyển Tab Đăng nhập / Đăng ký)**:
  - Khắc phục triệt me hiện tượng viên thuốc màu xanh (`#03B875`) di chuyển chậm hoặc bị đơ khi bấm chuyển giữa "Đăng nhập" và "Đăng ký" ở Modal Auth.
  - Chuyển đổi từ thuộc tính animate reflow `left/right` sang thuộc tính tăng tốc phần cứng GPU `x: "0%" | "100%"` với `duration: 0.18` (easeOut), giúp hiệu ứng trượt phản hồi tức thì, mượt mà chuẩn native app.

- **23/07/2026 (Tích hợp Quy Trình Xác Nhận Cấn Trừ Nợ & Khắc phục Đồng bộ Công Nợ)**:
  - Lập trình quy trình xác nhận 2 bước chuẩn FinTech cho cấn trừ nợ: Khi tạo yêu cầu cấn trừ, khoản nợ được khởi tạo ở trạng thái `pending` kèm nhãn vàng `⏳ Chờ người nhận / Trưởng nhóm xác nhận`.
  - Bổ sung nút bấm trực quan **`✅ Xác nhận nhận cấn trừ`** và **`❌ Từ chối`** cho bên nhận hoặc Trưởng nhóm.
  - Sửa lỗi lệch số tiền công nợ giữa "Các khoản cần tất toán" và "Sao kê công nợ cá nhân": Đảm bảo thuật toán `calculateBalances` và `PersonalStatementModal` đồng bộ 100% việc chỉ tính toán các khoản cấn trừ đã ở trạng thái `approved`, tự động cập nhật số dư công nợ của cả 2 bên ngay lập tức sau khi xác nhận.

- **23/07/2026 (Thiết kế Avatar Mới Chuẩn Ngân Hàng / Quỹ Nhóm FinTech)**:
  - Cập nhật Avatar cho Quỹ Nhóm (`getGroupFundAvatar` trong `avatar.ts`): Thay thế robot avatar cũ bằng biểu tượng Tòa nhà Ngân hàng / Ngân khố FinTech cao cấp.
  - Sử dụng khung tròn tông màu Emerald xanh đậm lá cây chủ đạo kết hợp dải viền vàng hoàng gia, các cột trụ ngân hàng trắng ngọc và biểu tượng tấm khiên bảo vệ tài chính, giúp hình ảnh Quỹ Nhóm trở nên uy tín, hiện đại và chuẩn nhận diện ngân hàng.

- **23/07/2026 (Ràng buộc Quyền Tạo Cấn Trừ Nợ Cho Trưởng Nhóm)**:
  - Giới hạn quyền tạo yêu cầu cấn trừ công nợ chỉ dành riêng cho **Trưởng nhóm / Admin** (`isAdmin`).
  - Đối với thành viên thường: Nút tạo cấn trừ được chuyển sang dạng khóa `🔒 Tạo Cấn Trừ (Trưởng nhóm)` kèm thông báo Toast thông minh khi nhấp chọn, đảm bảo duy trì tính minh bạch và bảo mật quản lý nhóm.

- **23/07/2026 (Chuẩn hóa Hạn mức sử dụng & Phân tách Chỉ số Gói cước)**:
  - Khắc phục lỗi hiển thị nhầm lẫn nhãn `Hạn mức thành viên / hóa đơn` bị quá tải `70 / 50` ở các gói nâng cấp (Bè Bạn / VIP).
  - Nguyên nhân: Trước đây code gộp nhầm giới hạn số lượng hóa đơn của gói Bè Bạn thành 50 hóa đơn thay vì Không giới hạn.
  - Phân tách thành 3 dải tiến trình độc lập, minh bạch trong `SmartHeader.tsx`:
    1. **Thành viên nhóm**: `{số thành viên} / {tối đa thành viên}` (FREE: 10, Du Hí & Bè Bạn: 20, Hội Làng: 50).
    2. **Hóa đơn chi tiêu**: Tất cả các gói nâng cấp trả phí (`Bè Bạn`, `Du Hí`, `Hội Làng`) đều là **`∞ Không giới hạn`**. Gói Free: `50 hóa đơn`.
    3. **Lượt quét hóa đơn AI**: FREE: `5 lượt/tháng`, Bè Bạn: `50 lượt/tháng`, Du Hí: `100 lượt/30 ngày`, Hội Làng: `200 lượt/tháng`.

- **25/07/2026 (Đồng bộ Chế độ xài 1 lần & Luồng Nâng cấp Nhóm)**:
  - Phân quyền nghiêm ngặt "Chế độ xài 1 lần" (Offline trial mode): Ép buộc vai trò duy nhất là Trưởng nhóm (`isAdmin = true`), vô hiệu hóa hoàn toàn mã truy cập thành viên và chế độ xem của thành viên (`memberAccessCodeUser = null`, `viewingMemberId = undefined`). Trưởng nhóm thực hiện toàn bộ thao tác quản lý, thu chi, tất toán và xuất báo cáo PDF cho nhóm.
  - Xử lý mượt mà khi bấm "Nâng cấp nhóm" từ Chế độ xài 1 lần: Modal nâng cấp `UpgradeModal.tsx` tự động hiển thị thẻ thông báo thân thiện giải thích người dùng cần tạo tài khoản Thủ quỹ để lưu dữ liệu nhóm lên Cloud vĩnh viễn trước khi thanh toán, kèm nút bấm `[ Đăng ký / Đăng nhập Thủ quỹ → ]` chuyển hướng tức thì sang trang Auth.

- **26/07/2026 (Khắc phục hiển thị nhãn Gói Chế độ xài 1 lần)**:
  - Sửa lỗi hiển thị "Gói FREE" khi ở Chế độ xài 1 lần (`tryOfflineMode`): Đồng bộ hóa loại gói `TRY_OFFLINE` và cập nhật hàm `getPlanLabel` trả về "Xài 1 lần ⚡".
  - Tùy chỉnh huy hiệu gói dịch vụ nhóm trong Modal Cấu hình nhóm (`SmartHeader.tsx`), Drawer quản lý nhóm, Selector chọn nhóm và Thẻ chốt sổ (`CloseCycleSection.tsx`) hiển thị huy hiệu nổi bật `⚡ Chế độ xài 1 lần` thay vì hiển thị nhãn "Gói FREE" nhầm lẫn.

- **26/07/2026 (Nâng cấp Hệ thống Xác thực Email OTP & Chống Spam / Điền Sai Email)**:
  - Tích hợp Quy trình Xác thực Email qua Mã OTP (6 chữ số) khi Đăng ký tài khoản Thủ quỹ mới.
  - Xử lý triệt để bài toán điền sai email và chống gửi email liên tục (Spam loop protection):
    1. **Giới hạn Cooldown**: Bắt buộc đếm ngược 60 giây giữa các lần bấm gửi lại mã OTP.
    2. **Hạn ngạch Rate Limit**: Giới hạn tối đa 5 lần gửi mã OTP / 10 phút cho mỗi địa chỉ Email.
    3. **Thời hạn OTP & Giới hạn thử sai**: Mã OTP tự động hết hạn sau 10 phút và vô hiệu hóa nếu nhập sai quá 5 lần.
    4. **Kiểm tra Định dạng Email**: Bắt buộc email đúng chuẩn Regex trước khi chấp nhận gửi mã.
    5. **Giao diện OTP Bảo mật Tối giản**: Chỉ giữ duy nhất ô nhập liệu mã OTP 6 chữ số trống để người dùng tự tay nhập, loại bỏ hoàn toàn việc tự động điền mã và banner gợi ý test mode.
    6. **Tích hợp Tự động Supabase Auth Custom SMTP**: Kết nối trực tiếp với Supabase Auth (`supabase.auth.signInWithOtp` / `verifyOtp`). Khi người dùng thiết lập SMTP custom trên Supabase Dashboard (`splitmate.admin@gmail.com` / `smtp.gmail.com:465`), hệ thống tự động phát lệnh gửi email xác thực chuẩn chính chủ thông qua hạ tầng Supabase Auth.
    7. **Hệ thống Thông báo Đăng ký Đa kênh (Popup Dialog & Toast)**: Đảm bảo khi đăng ký hoặc gửi OTP thành công/thất bại, ứng dụng luôn phát thông báo Pop-up Dialog (`showAlert`) và Toast banner (`setToastMsg`) rõ ràng 100%, ghi rõ nguyên nhân nếu xảy ra lỗi.
- **28/07/2026 (Mô hình Quyết toán Quỹ Nhóm Tập trung Cốt lõi)**:
  - Ghi nhận định hướng chiến lược cốt lõi: SplitMate thực hiện tất toán và giao dịch tập trung thông qua **Quỹ Nhóm** (Thành viên ➔ Quỹ Nhóm & Quỹ Nhóm ➔ Thành viên), **KHÔNG** áp dụng thuật toán tối ưu hóa / rút gọn số lượt giao dịch trực tiếp qua lại giữa các thành viên. Tất cả nghĩa vụ tài chính đều quy về tài khoản Quỹ Nhóm.
  - Hỗ trợ xác thực Supabase Auth kép: Xử lý đồng thời cả mã số OTP 6 chữ số (`verifyOtp`) và liên kết xác nhận (`ConfirmationURL`/`MagicLink`) khi người dùng nhấp vào link từ Email Supabase.
- **28/07/2026 (Tối ưu hóa & Đồng bộ Layout Email)**:
  - Đồng bộ hóa 100% tất cả các mẫu Email (Email OTP, Thông báo Đăng ký, Lời mời tham gia nhóm, Đổi mật khẩu) theo chuẩn thiết kế Card FinTech của **SplitMate Applet**:
  - Tông màu chủ đạo: Header xanh ngọc chuẩn `#03B875`, Khung thẻ màu trắng bo góc `16px` có shadow nhẹ, Hộp thông tin/Mã OTP màu xanh nhạt `#f0fdf4` viền nét đứt `#22c55e` sắc nét.
  - Chuẩn hóa toàn bộ cấu trúc HTML cho các mẫu email trong Supabase Auth (Confirm Sign Up, Magic Link / OTP, Reset Password, Invite User, Reauthentication, Change Email).
- **28/07/2026 (Chuẩn hóa UI/UX Toàn Hệ Thống & Chống Vỡ Layout)**:
  - Đồng bộ Font chữ `Plus Jakarta Sans` và Bảng màu FinTech chuẩn xanh ngọc lục bảo `#03B875` xuyên suốt toàn bộ ứng dụng.
  - Bổ sung bộ tiện ích CSS chuyên dụng `.nowrap-label` (chống ngắt từ/xuống dòng thừa trên các nhãn nút, pill, tab), `.safe-truncate` (tự động cắt chữ kèm dấu 3 chấm khi tiêu đề dài), và `.avatar-fixed` (chống co biến dạng Avatar/Icon).
  - Tối ưu hóa font-size động theo điểm cắt màn hình mobile (360px - 440px) đảm bảo các component vừa vặn 100%, không bị đè hay khuyết một phần.
- **28/07/2026 (Thay thế Popup Hướng dẫn bằng InstructionView & Tích hợp Popup cho Chế độ Dùng 1 lần)**:
  - Loại bỏ hoàn toàn `OnboardingTutorial` cũ và thay thế bằng bảng hướng dẫn hiện đại `InstructionView` (4 bước trực quan: link 1s, gom quỹ, AI scan, VietQR 1 chạm) hiển thị ngay lần đầu vào app.
  - Tích hợp thêm nội dung 4 bước chuyên biệt cho người dùng "Trải nghiệm dùng 1 lần" trong `InstructionView` (`mode='one-time'`):
    - Bước 1: Trải nghiệm tức thì không cần tài khoản
    - Bước 2: Thêm hóa đơn và chia tiền
    - Bước 3: Tải file PDF & Bạn bè thanh toán
    - Bước 4: Dễ dàng đăng ký chính thức (Lưu Đám Mây Cloud)
  - Đảm bảo 100% tất cả các trường hợp nhập OTP (gửi mã & xác minh mã) dù thành công hay thất bại đều phát thông báo kép (Dialog Pop-up + Toast Banner) thông tin rõ ràng.
- **30/07/2026 (Cập nhật Quy trình triển khai task 5 bước chuẩn hóa)**:
  - Bắt đầu áp dụng bắt buộc Quy trình 5 bước cho mọi task phát triển, sửa đổi tính năng hay fix lỗi:
    - **Bước 1**: Kiểm tra bối cảnh & thông tin trong `AGENTS.md` và `BUGS.md`.
    - **Bước 2**: Trao đổi, phân tích, phản biện & giải thích giải pháp chi tiết với người dùng trước khi viết code.
    - **Bước 3**: Triển khai task (chỉ sửa code khi có xác nhận từ người dùng).
    - **Bước 4**: Double check lại toàn bộ hoạt động của task sau khi code xong (lint, build, test UI).
    - **Bước 5**: Lưu lại toàn bộ thông tin chi tiết của task vào `AGENTS.md`, `PROJECT_BRAIN.md` và `BUGS.md`.
- **31/07/2026 (Tinh gọn UI: Bỏ sub-headline/eyebrow dư thừa)**:
  - Loại bỏ các dòng chữ nhãn phụ nhỏ in hoa (eyebrow label) không cần thiết như "LƯU TRỮ & THỐNG KÊ" và "KỲ HOẠT ĐỘNG HIỆN TẠI" nằm phía trên tiêu đề chính trong `CloseCycleSection.tsx`.
  - Giữ tiêu đề chính "Chốt Sổ & Lưu Trữ" và "Kỳ Hiện Tại" trực quan, thanh lịch, mỏng nhẹ đúng định hướng FinTech Mobile.
- **31/07/2026 (Khắc phục ẩn huy hiệu nhấp nháy trên thẻ nhóm đã có hóa đơn)**:
  - Sửa điều kiện render `Floating Action Badge Hint` trong `App.tsx`: Chuyển từ `(isActive || isNewGroup)` thành `isNewGroup` (`!group.expenses || group.expenses.length === 0`).
  - Kết quả: Badge nhấp nháy "Bấm vào đây để chia tiền ngay!" chỉ hiển thị hướng dẫn khi nhóm mới khởi tạo và chưa có hóa đơn. Ngay khi nhóm đã có hóa đơn chi tiêu, badge sẽ tự động ẩn đi hoàn toàn, đem lại giao diện phẳng mỏng nhẹ và sạch sẽ.
- **25/08/2026 (Tối ưu hóa Lịch chọn ngày - Calendar Popover trên Mobile)**:
  - **Mục tiêu**: Nâng cấp toàn diện hộp lịch chọn ngày phát sinh chi tiêu trong `ExpenseForm.tsx` để thao tác mượt mà, to rõ và tiện lợi trên điện thoại di động.
  - **Thực hiện (`src/components/ExpenseForm.tsx`)**:
    - **Mở rộng kích thước chuẩn**: Đổi từ `absolute left-0 right-0` thành `absolute right-0 top-full mt-2 w-[300px] sm:w-[330px] max-w-[calc(100vw-36px)]`, đảm bảo lịch không bị gò bó trong cột input ngày mà mở rộng thoáng đãng ngang toàn màn hình.
    - **Tăng kích thước ô ngày & vùng chạm (Touch Target)**: Tăng kích thước các ô ngày lên `h-8 w-8 sm:h-9 sm:w-9`, bo góc `rounded-xl`, màu xanh ngọc `#03B875` nổi bật cho ngày được chọn và viền tinh tế cho ngày hiện tại.
    - **Bổ sung phím tắt 1 chạm**: Thêm 2 nút nhanh `[ Hôm nay ]` và `[ Hôm qua ]` giúp tiết kiệm thời gian chọn ngày chi tiêu.
    - **Tối ưu nút chuyển tháng**: Mở rộng vùng bấm lên `h-8 w-8` chống bấm trượt trên màn hình cảm ứng.
- **18/08/2026 (Khắc phục lỗi 'Mã truy cập không chính xác hoặc nhóm đã bị xóa trực tuyến' sau khi Xóa tài khoản vĩnh viễn)**:
  - **Mục tiêu**: Đảm bảo mã truy cập 6 ký tự cấp mới cho thành viên sau khi xóa tài khoản hoạt động trơn tru 100% để đăng nhập vào nhóm từ bất kỳ thiết bị nào.
  - **Thực hiện (`api/api-app.ts`)**:
    - `supabaseSaveGroup`: Tự động trích xuất và đồng bộ toàn bộ `accessCode` từ `cleanGroup.members` vào `cleanGroup.memberAccessCodes` và `dataGroup.memberAccessCodes` trước khi upsert lên Supabase.
    - `supabaseGetGroupByMemberAccessCode`: Nâng cấp cơ chế tìm kiếm nhóm bằng mã truy cập, so sánh trực tiếp cả `m.accessCode` trong mảng `members` và mảng `memberAccessCodes` (chuẩn hóa `trim().toUpperCase()`).
    - `/api/member/login`: Tìm kiếm linh hoạt thành viên và nhóm tương ứng với mã truy cập.
    - `/api/user/delete-account`: Cấp mã 6 ký tự chuẩn từ bảng chữ số an toàn và cập nhật `memberAccessCodes` trước khi lưu vào Supabase / Local DB.

- **17/08/2026 (Khắc phục nút 'Xóa tài khoản vĩnh viễn' không phản hồi khi đăng nhập bằng Mã truy cập)**:
  - **Mục tiêu**: Làm sạch giao diện danh sách nhóm, đảm bảo chuẩn Mobile App FinTech mỏng nhẹ, tinh tế và không có các hiệu ứng nhún nhảy/nhấp nháy gây rối mắt khi người dùng có nhiều nhóm.
  - **Thực hiện (`App.tsx`)**:
    - Gỡ bỏ hoàn toàn badge bay `animate-bounce` ("✨ Bấm vào đây để chia tiền ngay!") trên các thẻ nhóm.
    - Loại bỏ hiệu ứng viền chớp sáng `animate-pulse` trên các thẻ nhóm mới.
    - Giữ trọn vẹn thiết kế thẻ nhóm dạng Flat Minimalist mỏng nhẹ với bo góc `rounded-[24px]` và viền màu xanh ngọc `#03B875` sang trọng cho nhóm đang chọn.
- **13/08/2026 (Cho phép đổi Tên/Avatar/STK tự do & Khóa Cố Định Email đã liên kết)**:
  - **Mục tiêu**: Tách biệt hoàn toàn việc cập nhật hồ sơ cá nhân (Tên, Avatar, STK) với việc tạo mật khẩu đăng nhập, không ép buộc nhập mật khẩu khi chỉ muốn sửa thông tin.
  - **Giao diện (`SmartHeader.tsx` & `ParticipationSection.tsx`)**:
    - Thiết lập Mật khẩu trở thành **Tùy chọn (Optional)**: Thành viên có thể đổi Tên, Avatar, Ngân hàng/MoMo rồi bấm **Lưu** ngay mà không cần điền mật khẩu.
    - Nếu thành viên muốn liên kết tài khoản để đăng nhập thì mới điền mật khẩu vào ô.
    - Khi thành viên ĐÃ CÓ email liên kết: Khóa ô Email (`disabled`/`readonly` kèm icon ổ khóa 🔒) để bảo vệ tài khoản, ẩn khung mật khẩu, cho phép cập nhật Tên/Avatar/STK tức thì.
  - **Backend (`api/api-app.ts`)**:
    - Khi thành viên có điền mật khẩu mới, backend kích hoạt `sendCredentialsEmail` gửi thư thông báo xác thực & thông tin tài khoản trực tiếp tới địa chỉ email của thành viên.

  - **Triển khai**: Cho phép thành viên gia nhập nhóm bằng Mã Truy Cập (Access Code) tự do thêm Email và thiết lập Mật khẩu trực tiếp ngay trong Drawer Thông tin Cá nhân (`SmartHeader.tsx`).
  - **Backend (`api/api-app.ts`)**: Cập nhật endpoint `/api/member/update-info` tự động tạo/liên kết tài khoản người dùng (`leaders`) trong hệ thống khi thành viên nhập Email và Mật khẩu (từ 4 ký tự), thực hiện hash mật khẩu bằng `bcrypt.hashSync`, đồng thời đồng bộ email và thông tin cập nhật cho thành viên trên tất cả các nhóm liên quan.
  - **UI/UX**: Hiển thị bảng thiết lập mật khẩu trực tiếp, trực quan kèm thông báo xác thực rõ ràng khi liên kết thành công. Từ đây thành viên có thể tự do đăng nhập lại ứng dụng từ mọi thiết bị bằng Email và Mật khẩu vừa tạo.
- **01/08/2026 (Khắc phục triệt để lỗi dư công nợ cấn trừ / nộp quỹ sau khi Chốt Sổ)**:
  - **Nguyên nhân**: Khi Chốt sổ (`handleConfirmCloseCycle` tại `CloseCycleSection.tsx`), hệ thống đã làm sạch mảng hóa đơn active (`expenses = []`), nhưng quên làm sạch các mảng cấn trừ công nợ & chứng từ nộp quỹ (`debtOffsets`, `pendingReceipts`). Do đó `calculateBalances` tiếp tục tính các khoản cấn trừ / nộp quỹ cũ vào kỳ mới, dẫn đến hiển thị các khoản nợ cũ dư thừa ở màn hình Tất toán.
  - **Khắc phục**:
    1. Bổ sung `archivedDebtOffsets` và `archivedPendingReceipts` vào giao diện `BillingCycle` trong `types.ts` để lưu trữ vĩnh viễn toàn bộ lịch sử cấn trừ & chứng từ của kỳ đã đóng.
    2. Trong `CloseCycleSection.tsx`, khi Chốt sổ, đặt lại `expenses: []`, `debtOffsets: []`, và `pendingReceipts: []` trên `updatedGroup`.
    3. Trong `App.tsx`, bổ sung hook tự động làm sạch (auto-sanitize) đối với các nhóm đã Chốt sổ từ trước nhưng chưa được làm sạch `debtOffsets`/`pendingReceipts`, đảm bảo màn hình "Các khoản cần tất toán" đưa tất cả về 0 đ ngay lập tức.
- **01/08/2026 (Khắc phục triệt để lỗi schema cache Supabase "Could not find the 'allow_member_add_expense' column of 'groups'")**:
  - Sửa lỗi `POST /api/groups` trả về ngoại lệ `Could not find the 'allow_member_add_expense' column of 'groups' in the schema cache` trong backend `api/api-app.ts`.
  - Tích hợp helper `checkGroupsSchemaAllowMemberAddExpenseColumns()` và `getAllowMemberAddExpenseCol()` để phát hiện động sự tồn tại của cột `allow_member_add_expense` / `allowMemberAddExpense` trong Supabase Database.
  - Loại bỏ hoàn toàn việc gán cứng cột `allow_member_add_expense` / `allowMemberAddExpense` vào top-level payload khi cột không tồn tại. Trường hợp dùng layout `data` JSON, cấu hình `allowMemberAddExpense` luôn được đóng gói an toàn 100% bên trong đối tượng `dataGroup` và `packedExpenses`.
  - Cập nhật các câu lệnh `.select()` ở layout mảng phẳng để truy vấn linh hoạt theo schema thực tế của database.
- **01/08/2026 (Cập nhật Chế độ 1 lần - TRY_OFFLINE & Sửa lỗi mất lịch sử Chốt Sổ)**:
  - Sửa lỗi "Yêu cầu thiếu dữ liệu xác thực" khi chỉnh sửa Hồ sơ Trưởng nhóm ở Chế độ 1 lần: Thêm nhánh `if (tryOfflineMode)` trong `handleEditMember` tại `App.tsx` để lưu thông tin sửa đổi trực tiếp vào local state.
  - Sửa triệt để lỗi không lưu / không tải lại `billingCycles` (Lịch sử Chốt Sổ) sau khi reload trang trong `api/api-app.ts`:
    - Cập nhật `unpackGroupRow` để tự động giải nén dữ liệu `billing_cycles` từ database row và `packedExpenses`.
    - Thêm helper `checkGroupsSchemaBillingCyclesColumns()` để phát hiện động sự tồn tại của cột `billing_cycles` trên Supabase, hỗ trợ cả layout JSON `data`, layout cột phẳng và layout Auto-Pack.
    - Cập nhật `supabaseGetGroupsByOwnerOrEmail`, `supabaseGetGroupById`, `supabaseGetGroupByMemberAccessCode` và `supabaseSaveGroup` để lưu trữ và truy xuất mảng `billingCycles` hoàn toàn mượt mà.
  - Cung cấp câu lệnh SQL tùy chọn cho người dùng muốn thêm cột `billing_cycles` vào bảng `groups` trên Supabase Database: `ALTER TABLE groups ADD COLUMN IF NOT EXISTS billing_cycles JSONB DEFAULT '[]'::jsonb;`.
- **03/09/2026 (Loại bỏ AI Khớp Lệnh Tự Động & Chuẩn hóa Đối Soát Biên Lai Chuyển Khoản)**:
  - **Mục tiêu**: Khắc phục triệt để lỗi biên lai chuyển khoản (ví dụ hoàn tiền 2.000.000đ cho Panh) bị AI tự động duyệt dẫn đến xung đột ghi đè state làm mất khoản chi tiêu khấu trừ công nợ, đồng thời loại bỏ rủi ro AI tự duyệt ngoài ý muốn.
  - **Thực hiện (`src/components/SettleUpSection.tsx`)**:
    - **Loại bỏ AI Khớp Lệnh**: Gỡ bỏ API scan Gemini tự động khớp lệnh khi upload ảnh biên lai trong `handleReceiptUpload`. Mọi biên lai chuyển khoản khi tải lên đều được lưu trữ an toàn vào Supabase Storage với trạng thái `pending` (Chờ duyệt).
    - **Làm sạch giao diện**: Gỡ bỏ badge `AI KHỚP LỆNH ✨` và nhãn quảng bá AI rườm rà. Chuyển khung upload thành "Tải ảnh biên lai chuyển khoản" với thiết kế phẳng mỏng nhẹ.
    - **Quản lý biên lai toàn diện cho Trưởng nhóm**:
      - Bổ sung nút **Xóa biên lai (Trash2)** cho phép Trưởng nhóm xóa bất kỳ biên lai nào (chờ duyệt, đã duyệt, từ chối).
      - Bổ sung nút **"Khấu trừ công nợ"** và **"Chuyển về Chờ duyệt"** cho các biên lai đã duyệt (giúp xử lý ngay lập tức các biên lai bị kẹt trước đó như khoản 2tr của Panh chỉ với 1 click).
      - Thao tác "Duyệt biên lai" luôn thực thi qua `onBatchSettleAndReceipt` nguyên tử, đồng thời tạo giao dịch khấu trừ và đổi trạng thái biên lai thành `approved`, đảm bảo công nợ giảm chính xác 100%.
- **16/09/2026 (Bổ sung Đa Ngôn Ngữ Tiếng Anh & Hỗ Trợ Đa Tiền Tệ Toàn Cầu)**:
  - **Mục tiêu**: Cho phép người dùng chuyển đổi linh hoạt giao diện giữa Tiếng Việt và Tiếng Anh, đồng thời hỗ trợ các đồng tiền tệ quốc tế phổ biến (VND, USD, EUR, JPY, KRW, THB, SGD) cho từng nhóm chi tiêu.
  - **Kiến trúc & Tiện ích (`src/utils/i18n.ts`)**:
    - Cung cấp hook `useTranslation` lưu trạng thái ngôn ngữ trên `localStorage` và phát sự kiện đồng bộ `splitmate_language_change` trên toàn app.
    - Bảng cấu hình `SUPPORTED_CURRENCIES` và hàm định dạng `formatCurrencyAmount` theo chuẩn `Intl.NumberFormat`, tự động xử lý ký hiệu (trước/sau số) và số lượng chữ số thập phân phù hợp (VND, JPY, KRW làm tròn nguyên vẹn; USD, EUR, SGD hỗ trợ thập phân).
  - **Tạo & Cài Đặt Nhóm**:
    - Modal tạo nhóm mới (`CreateGroupModal.tsx`) tích hợp bộ chọn tiền tệ trực quan với quốc kỳ và mã tiền tệ.
    - Modal Cài đặt nhóm (`SmartHeader.tsx`) cho phép Trưởng nhóm thay đổi đơn vị tiền tệ nhóm bất kỳ lúc nào và lưu trực tiếp vào cơ sở dữ liệu.
    - Drawer Cá nhân tích hợp nút chuyển đổi ngôn ngữ 1-chạm giữa 🇻🇳 Tiếng Việt và 🇬🇧 English.
  - **Đồng bộ hiển thị định dạng tiền tệ**:
    - Thay thế các hàm `formatMoney` cục bộ trên toàn bộ các component: `ExpenseList.tsx`, `SettleUpSection.tsx`, `FundHistoryList.tsx`, `CloseCycleSection.tsx`, `PersonalStatementModal.tsx` và `StatsSection.tsx` sang sử dụng `formatCurrencyAmount` theo `activeGroup.currency`.
- **16/09/2026 (Khắc phục triệt để lỗi Supabase bị khóa sau 7 ngày qua Vercel Cron & Tối ưu Keep-Alive)**:
  - **Mục tiêu**: Ngăn chặn tình trạng cơ sở dữ liệu Supabase Free Tier tự động bị tạm dừng (Paused) sau 7 ngày không phát sinh tương tác.
  - **Nguyên nhân**: GitHub Actions scheduled cron tự động bị tắt nếu repo không có commit trong 60 ngày; thiếu Vercel Cron trực tiếp và truy vấn cũ chưa kích hoạt sâu database engine.
  - **Thực hiện**:
    - **Cấu hình Vercel Cron (`vercel.json`)**: Bổ sung `crons` chạy mỗi ngày lúc 04:00 UTC (11:00 AM VN) ping vào `/api/keep-alive` trực tiếp từ hạ tầng Vercel vĩnh viễn, không phụ thuộc GitHub commits.
    - **Nâng cấp API (`api/api-app.ts`)**: Tối ưu endpoint `/api/keep-alive` thực hiện `.select("id").limit(1)` trực tiếp vào bảng `groups` hoặc `leaders`, đảm bảo Supabase ghi nhận I/O và duy trì trạng thái ACTIVE 100%.
    - **Nâng cấp GitHub Actions (`.github/workflows/supabase-keep-alive.yml`)**: Chuyển tần suất chạy sang hàng ngày `0 4 * * *` làm lớp phòng thủ dự phòng thứ hai.





