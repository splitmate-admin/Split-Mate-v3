# AGENTS.md - SPLITMATE AI SYSTEM DIRECTIVES

> File này được hệ thống tự động tải vào System Instructions cho AI Agent trong mỗi phiên làm việc.

## 1. QUY TẮC CỐT LÕI (MANDATORY DIRECTIVES)

1. **Ngôn ngữ giao tiếp**: ALWAYS communicate and respond in **Vietnamese** (Tiếng Việt).
2. **Quy trình triển khai task 5 bước (MANDATORY 5-STEP WORKFLOW)**:
   Mỗi khi bắt đầu triển khai bất kỳ task nào (tính năng mới, chỉnh sửa logic, fix bug), AI **BẮT BUỘC** phải tuân thủ nghiêm ngặt 5 bước sau:
   - **Bước 1**: Check lại kiến thức & thông tin liên quan trong file `AGENTS.md` và `BUGS.md`.
   - **Bước 2**: Trao đổi, phân tích, phản biện & giải thích giải pháp với người dùng trước khi triển khai.
   - **Bước 3**: Triển khai task (chỉ tiến hành sửa code sau khi người dùng đồng ý/xác nhận).
   - **Bước 4**: Double check lại toàn bộ hoạt động của task sau khi code xong (kiểm thử, lint & compile).
   - **Bước 5**: Lưu lại thông tin chi tiết về task đó vào `AGENTS.md`, `PROJECT_BRAIN.md` và `BUGS.md`.
3. **Xác nhận trước khi chỉnh sửa code**:
   - Nếu có bất kỳ thay đổi nào về **logic**, **hệ thống**, hoặc **tính năng**, AI **BẮT BUỘC** phải giải thích rõ ràng lý do & giải pháp cho người dùng trước.
   - **CHỈ CHỈNH SỬA CODE** sau khi nhận được sự xác nhận (vd: "xác nhận", "ok", "đồng ý") từ người dùng.
3. **Quy tắc Lưu trữ File & Database**:
   - Tất cả tập tin (ảnh hóa đơn, chứng từ) **BẮT BUỘC** được lưu vào Storage (Supabase Storage).
   - Database Table **CHỈ LƯU ĐƯỜNG DẪN (URL)** của file, KHÔNG lưu chuỗi mã hóa Base64 vào database.
4. **Deploy & Infrastructure**:
   - Deploy qua **GitHub + Vercel**.
   - Database lưu trên **Supabase** (PostgreSQL + Supabase Realtime).
5. **Cập nhật Bộ não Hệ thống (Self-updating Brain)**:
   - Mỗi khi triển khai/thay đổi tính năng, quy tắc hoặc logic mới, AI BẮT BUỘC phải cập nhật lại file `PROJECT_BRAIN.md` và `AGENTS.md` để lưu lại bộ nhớ hệ thống.
6. **Mã hóa gói nâng cấp (Plan Naming)**:
   - Các gói nâng cấp của nhóm được thống nhất lưu dưới dạng: `"FREE"`, `"BE_BAN"` (Bè Bạn), và `"HOI_LANG"` (Hội Làng). Không sử dụng các từ khóa cũ như `"VIP"` hay `"PREMIUM"`.
7. **Thiết kế mỏng nhẹ chuẩn Mobile App FinTech**:
   - Giao diện **BẮT BUỘC** trực quan, ít chữ, ngắn gọn tuyệt đối.
   - **KHÔNG** chèn các huy hiệu/nhãn quảng cáo rườm rà (như "Nổi bật", "2 Tab", "Bù trừ thủ công") hay câu từ giải thích dông dài làm vỡ bố cục mỏng nhẹ của Mobile App.

---

## 2. THAM CHIẾU BỘ NÃO HỆ THỐNG (SYSTEM BRAIN)

Mọi thông tin chi tiết về Kiến trúc, Database Schema, Luồng Camera AI, Chuyển khoản VietQR Bank Deep Link, và Lịch sử cập nhật đều được ghi nhận chi tiết tại:
👉 **`/PROJECT_BRAIN.md`**

Trước khi thực hiện công việc, AI cần kiểm tra `PROJECT_BRAIN.md` để đảm bảo nắm trọn vẹn bối cảnh dự án mà không cần hỏi lại người dùng.

## LỊCH SỬ NHẬN THỨC CỦA AGENT
- **03/09/2026 (Loại bỏ AI Khớp Lệnh Tự Động & Chuẩn hóa Đối Soát Biên Lai Chuyển Khoản)**:
  - **Mục tiêu**: Khắc phục triệt để lỗi biên lai chuyển khoản (ví dụ: hoàn tiền 2.000.000đ cho Panh) bị AI tự động duyệt dẫn đến xung đột ghi đè state làm mất khoản chi tiêu khấu trừ công nợ, đồng thời loại bỏ rủi ro AI tự duyệt ngoài ý muốn.
  - **Thực hiện (`src/components/SettleUpSection.tsx`)**:
    - **Loại bỏ AI Khớp Lệnh**: Gỡ bỏ API scan Gemini tự động khớp lệnh khi upload ảnh biên lai trong `handleReceiptUpload`. Mọi biên lai chuyển khoản khi tải lên đều được lưu trữ an toàn vào Supabase Storage với trạng thái `pending` (Chờ duyệt).
    - **Làm sạch giao diện**: Gỡ bỏ badge `AI KHỚP LỆNH ✨` và nhãn quảng bá AI rườm rà. Chuyển khung upload thành "Tải ảnh biên lai chuyển khoản" với thiết kế phẳng mỏng nhẹ.
    - **Quản lý biên lai toàn diện cho Trưởng nhóm**:
      - Bổ sung nút **Xóa biên lai (Trash2)** cho phép Trưởng nhóm xóa bất kỳ biên lai nào (chờ duyệt, đã duyệt, từ chối).
      - Bổ sung nút **"Khấu trừ công nợ"** và **"Chuyển về Chờ duyệt"** cho các biên lai đã duyệt (giúp xử lý ngay lập tức các biên lai bị kẹt trước đó như khoản 2tr của Panh chỉ với 1 click).
      - Thao tác "Duyệt biên lai" luôn thực thi qua `onBatchSettleAndReceipt` nguyên tử, đồng thời tạo giao dịch khấu trừ và đổi trạng thái biên lai thành `approved`, đảm bảo công nợ giảm chính xác 100%.
- **28/08/2026 (Triển khai Giải pháp chống Pause Supabase Free Tier sau 7 ngày qua GitHub Actions Cron)**:
  - **Mục tiêu**: Ngăn ngừa cơ sở dữ liệu Supabase Free Tier tự động bị tạm dừng (Paused) sau 7 ngày không có tương tác người dùng.
  - **Thực hiện**:
    - **Backend (`api/api-app.ts`)**: Bổ sung endpoint `/api/health` và `/api/keep-alive` thực hiện truy vấn siêu nhẹ (`head count` hoặc `limit 1` trên bảng `groups` / `leaders`), vừa giữ Supabase luôn ở trạng thái ACTIVE vừa đo lường độ trễ (latency).
    - **GitHub Actions (`.github/workflows/supabase-keep-alive.yml`)**: Thiết lập cron tự động chạy mỗi 2 ngày một lần lúc 04:00 UTC (11:00 AM VN) để ping API SplitMate và query trực tiếp Supabase REST API (hỗ trợ cả chạy tự động và trigger thủ công `workflow_dispatch`).
- **25/08/2026 (Tối ưu hóa Lịch chọn ngày - Calendar Popover trên Mobile)**:
  - **Mục tiêu**: Khắc phục tình trạng khung lịch chọn ngày phát sinh trong `ExpenseForm.tsx` bị nhỏ hẹp, chữ và nút dính sát nhau khó bấm trên màn hình điện thoại.
  - **Thực hiện (`ExpenseForm.tsx`)**:
    - Mở rộng kích thước khung lịch lên `w-[300px] sm:w-[330px]` và định vị neo `right-0 top-full` để hiển thị thoáng đãng trên mobile.
    - Tăng kích thước ô ngày lên `h-8 w-8 sm:h-9 sm:w-9`, bo góc `rounded-xl`, tăng tương phản màu xanh ngọc `#03B875` cho ngày được chọn và viền tinh tế cho ngày hôm nay.
    - Bổ sung thanh phím tắt 1 chạm: `[ Hôm nay ]` và `[ Hôm qua ]`.
    - Mở rộng vùng chạm bấm `h-8 w-8` cho hai nút chuyển tháng.
- **18/08/2026 (Khắc phục lỗi 'Mã truy cập không chính xác' sau khi Xóa tài khoản vĩnh viễn)**:
  - **Mục tiêu**: Đảm bảo mã truy cập 6 ký tự cấp mới cho thành viên sau khi xóa tài khoản hoạt động trơn tru 100% để đăng nhập vào nhóm.
  - **Thực hiện (`api/api-app.ts`)**:
    - `supabaseSaveGroup`: Tự động đồng bộ toàn bộ `accessCode` từ `cleanGroup.members` vào `cleanGroup.memberAccessCodes` và `dataGroup.memberAccessCodes`.
    - `supabaseGetGroupByMemberAccessCode`: Nâng cấp cơ chế quét nhóm so sánh trực tiếp cả `m.accessCode` trong mảng `members` và mảng `memberAccessCodes` (chuẩn hóa `trim().toUpperCase()`).
    - `/api/member/login`: Tìm kiếm linh hoạt thành viên và nhóm tương ứng với mã truy cập.
    - `/api/user/delete-account`: Cấp mã 6 ký tự chuẩn từ bảng chữ số an toàn và cập nhật `memberAccessCodes` trước khi lưu vào Supabase / Local DB.
- **17/08/2026 (Khắc phục nút 'Xóa tài khoản vĩnh viễn' không phản hồi khi đăng nhập bằng Mã truy cập)**:
  - **Mục tiêu**: Cho phép thành viên đã cập nhật email bấm "Xóa tài khoản vĩnh viễn" hiển thị đúng hộp thoại xác nhận và thực thi xóa tài khoản & giải phóng email.
  - **Thực hiện (`SmartHeader.tsx`)**:
    - Lấy email từ `targetEmail = user?.email || effectiveMember?.email`.
    - Đóng Drawer cá nhân trước khi gọi `askConfirm` để hiển thị hộp thoại cảnh báo nguy hiểm rõ ràng ở trung tâm màn hình.
    - Gửi request đến `/api/user/delete-account` để xóa hồ sơ và giải phóng email khỏi tất cả các nhóm.
- **17/08/2026 (Xác thực Email OTP 6 số cho Thành viên & Giải phóng Email khi Xóa Tài khoản)**:
  - **Xác thực OTP Email Thành viên**: Bổ sung endpoint `/api/member/send-otp` và cập nhật `/api/member/update-info`. Khi thành viên đăng nhập bằng mã/link muốn liên kết email, hệ thống gửi mã OTP 6 số về hộp thư và yêu cầu xác minh OTP thành công trước khi khóa cố định email (`emailVerified: true`).
  - **Kiểm tra trùng lặp email**: Ngăn chặn liên kết email trùng lặp với tài khoản khác trừ khi xác thực đúng mật khẩu.
  - **Giải phóng Email khi xóa tài khoản**: Cập nhật `/api/user/delete-account` tự động gỡ liên kết email (`email: undefined`, `emailVerified: false`) ở tất cả các nhóm còn lại khi người dùng xóa vĩnh viễn tài khoản, giúp email lập tức sẵn sàng để tái đăng ký/liên kết lại.
- **17/08/2026 (Loại bỏ triệt để nhãn nhấp nháy 'Bấm vào đây để chia tiền ngay' & hiệu ứng pulse trên thẻ nhóm)**:
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
    - Khi thành viên có điền mật khẩu mới, backend kích hoạt `sendCredentialsEmail` gửi thư thông báo xác thực & thông tin tài khoản trực tiếp tới email.
- **07/08/2026 (Hoàn thiện Luồng Liên kết Email & Mật khẩu Đăng nhập cho Thành viên Đăng nhập bằng Mã)**:
  - **Mục tiêu**: Tối ưu trải nghiệm cho thành viên tham gia bằng Mã Truy Cập (Access Code) khi thêm Email cá nhân.
  - **Giải pháp triển khai (Hướng B)**: Tích hợp ô thiết lập Mật khẩu và Xác nhận Mật khẩu trực tiếp ngay trong Drawer Hồ sơ Cá nhân (`SmartHeader.tsx`).
  - **Backend (`api/api-app.ts`)**: Cập nhật `/api/member/update-info` tiếp nhận `password`, hash bằng `bcrypt` và khởi tạo/cập nhật thông tin tài khoản `leaders` (Supabase/Local DB) tương ứng. Đồng thời gắn email vào `Member` của nhóm.
  - **Kết quả**: Thành viên gia nhập bằng mã có thể liên kết email & mật khẩu dễ dàng, sau đó có thể dùng Email & Mật khẩu này để đăng nhập lại ứng dụng từ bất kỳ thiết bị nào.
- **01/08/2026 (Khắc phục triệt để lỗi dư công nợ cấn trừ / nộp quỹ sau khi Chốt Sổ)**:
  - **Nguyên nhân**: Khi Chốt sổ (`handleConfirmCloseCycle` tại `CloseCycleSection.tsx`), hệ thống đã làm sạch mảng hóa đơn active (`expenses = []`), nhưng quên làm sạch các mảng cấn trừ công nợ & chứng từ nộp quỹ (`debtOffsets`, `pendingReceipts`). Do đó `calculateBalances` tiếp tục tính các khoản cấn trừ / nộp quỹ cũ vào kỳ mới, dẫn đến hiển thị các khoản nợ cũ dư thừa ở màn hình Tất toán.
  - **Khắc phục**:
    1. Bổ sung `archivedDebtOffsets` và `archivedPendingReceipts` vào giao diện `BillingCycle` trong `types.ts` để lưu trữ vĩnh viễn toàn bộ lịch sử cấn trừ & chứng từ của kỳ đã đóng.
    2. Trong `CloseCycleSection.tsx`, khi Chốt sổ, đặt lại `expenses: []`, `debtOffsets: []`, và `pendingReceipts: []` trên `updatedGroup`.
    3. Trong `App.tsx`, bổ sung hook tự động làm sạch (auto-sanitize) đối với các nhóm đã Chốt sổ từ trước nhưng chưa được làm sạch `debtOffsets`/`pendingReceipts`, đảm bảo màn hình "Các khoản cần tất toán" đưa tất cả về 0 đ ngay lập tức.
- **01/08/2026 (Khắc phục triệt để lỗi schema cache Supabase "Could not find the 'allow_member_add_expense' column of 'groups'")**:
  - Sửa lỗi `POST /api/groups` thất bại do `allow_member_add_expense` và `allowMemberAddExpense` bị hardcode ở top-level payload trong `supabaseSaveGroup` ở `api/api-app.ts`.
  - Bổ sung helper `checkGroupsSchemaAllowMemberAddExpenseColumns()` và `getAllowMemberAddExpenseCol()` kiểm tra động sự tồn tại của cột `allow_member_add_expense` hoặc `allowMemberAddExpense` trong cơ sở dữ liệu Supabase.
  - Chỉ bổ sung `allow_member_add_expense` / `allowMemberAddExpense` vào top-level payload nếu cột thực sự tồn tại trên database. Trường hợp bảng dùng cột `data` JSON, cấu hình `allowMemberAddExpense` vẫn được đóng gói an toàn tuyệt đối bên trong đối tượng `dataGroup` và `packedExpenses`.
  - Cập nhật các câu lệnh `.select()` ở dạng bảng phẳng để chỉ query cột `allow_member_add_expense` hoặc `allowMemberAddExpense` khi cột đó tồn tại, loại bỏ hoàn toàn các ngoại lệ `Could not find column in schema cache`.
- **01/08/2026 (Khắc phục triệt để lỗi mất lịch sử Chốt Sổ - billingCycles khi reload trang)**:
  - Sửa lỗi không lưu/không khôi phục `billingCycles` sau khi Chốt sổ (Close Cycle) trong backend `api/api-app.ts`.
  - Cập nhật hàm `unpackGroupRow`: Bổ sung trích xuất dữ liệu `billing_cycles` (từ JSON string hoặc array) từ database row và `packedExpenses`.
  - Cập nhật `supabaseGetGroupsByOwnerOrEmail`, `supabaseGetGroupById`, và `supabaseGetGroupByMemberAccessCode`: Bổ sung kiểm tra linh hoạt sự tồn tại của cột `billing_cycles` qua helper `checkGroupsSchemaBillingCyclesColumns()` để đọc và trả về `billingCycles` trong đối tượng `Group`.
  - Cập nhật `supabaseSaveGroup`: Lưu `billingCycles` vào cột `billing_cycles` (nếu cột tồn tại) hoặc vào JSON payload `dataGroup.billingCycles` / `packedExpenses` (nếu dùng bảng phẳng) mà không làm phát sinh bất kỳ lỗi "An internal error occurred" nào.
  - Cung cấp câu lệnh SQL tùy chọn cho người dùng nếu muốn bổ sung cột `billing_cycles` chuyên dụng vào bảng `groups` trên Supabase: `ALTER TABLE groups ADD COLUMN IF NOT EXISTS billing_cycles JSONB DEFAULT '[]'::jsonb;`.
- **01/08/2026 (Hoàn thiện & Cập nhật Chế độ 1 lần - TRY_OFFLINE)**:
  - Sửa triệt để lỗi "Yêu cầu thiếu dữ liệu xác thực" khi sửa Hồ sơ Trưởng nhóm ở Chế độ 1 lần: Bổ sung nhánh xử lý `if (tryOfflineMode)` trong `handleEditMember` tại `App.tsx`, lưu trực tiếp thông tin sửa đổi (Tên hiển thị, Avatar) vào bộ nhớ state local của nhóm.
  - Ẩn cài đặt "Thành viên được thêm & sửa chi tiêu" ở Chế độ 1 lần trong `SmartHeader.tsx` do thành viên không đăng nhập ở chế độ dùng thử.
  - Cho phép Trưởng nhóm chỉnh sửa thông tin cá nhân (Tên hiển thị, Avatar hoạt hình / Tải ảnh cá nhân) và lưu trực tiếp qua `onEditMember`.
  - Nâng giới hạn lưu trữ tối đa lên 10 hóa đơn cho Chế độ 1 lần (cập nhật kiểm tra `handleBatchAddExpenses`, nút Chế độ xài 1 lần ở Welcome Screen, và các banner cảnh báo 9/10, 10/10 tại `App.tsx`).
  - Khóa tính năng Chốt Sổ & Lưu Trữ kỳ ở Chế độ 1 lần, bổ sung banner giải thích rõ ràng và nút điều hướng nâng cấp gói trong `CloseCycleSection.tsx`.
- **31/07/2026 (Khắc phục lỗi Chế độ xem Thành viên & Chặt chẽ phân quyền Cài đặt Nhóm)**:
  - Sửa lỗi không chuyển sang Chế độ xem Thành viên: Đã xóa bỏ logic re-sync `isAdmin` thừa trong `useEffect` ở `App.tsx`, giúp Trưởng nhóm xem thử giao diện dưới vai trò Thành viên và chuyển trở lại Trưởng nhóm trơn tru.
  - Phân quyền Cài đặt Nhóm chặt chẽ: Ẩn nút Cài đặt nhóm ⚙️, nút "Cấu hình STK Quỹ Nhóm", và nút sửa tên nhóm inline đối với Thành viên. Đồng thời thêm ràng buộc `if (!isAdmin)` vào `handleSaveGroupSettings`, `handleSaveGroupName` và event listener `open-group-settings`, đảm bảo chỉ có duy nhất Trưởng nhóm mới có quyền cấu hình thông tin nhóm.
- **31/07/2026 (Tinh gọn UI: Loại bỏ sub-headline/eyebrow dư thừa)**: Loại bỏ các nhãn chữ nhỏ in hoa rườm rà (như "LƯU TRỮ & THỐNG KÊ", "KỲ HOẠT ĐỘNG HIỆN TẠI") nằm đè trên headline chính ở `CloseCycleSection.tsx`, giúp bố cục mỏng nhẹ, tối giản chuẩn di động.
- **31/07/2026 (Fix ẩn huy hiệu nhấp nháy chia tiền trên nhóm đã có hóa đơn)**: Sửa biểu thức kiểm tra badge gợi ý ở `App.tsx` thành `isNewGroup` (`!group.expenses || group.expenses.length === 0`). Badge nhấp nháy "Bấm vào đây để chia tiền ngay!" chỉ hiển thị với nhóm mới chưa có hóa đơn, tự động ẩn đi hoàn toàn khi nhóm đã phát sinh chi tiêu.
- **31/07/2026 (Khắc phục lỗi không thể bật & không lưu quyền thêm/sửa chi tiêu cho thành viên)**: 
  - Đã cập nhật `SmartHeader.tsx` để kích hoạt `onUpdateGroup` ngay lập tức khi gạt công tắc "Thành viên được thêm & sửa chi tiêu", lưu thẳng dữ liệu vào Supabase Database.
  - Cập nhật backend `api/api-app.ts`: Sửa `unpackGroupRow`, `supabaseGetGroupsByOwnerOrEmail`, `supabaseGetGroupById` và `supabaseSaveGroup` để lưu và unpack đúng định dạng boolean cho `allowMemberAddExpense` (và `allow_member_add_expense`), không bị ép nhầm thành `false` khi đọc dữ liệu từ DB.
  - Tinh gọn biểu thức kiểm tra quyền ở `App.tsx` thành `(isAdmin || activeGroup?.allowMemberAddExpense !== false)`, gỡ bỏ điều kiện cưỡng chế `!!viewingMemberId`.
  - Kết quả: Cài đặt quyền thêm/sửa chi tiêu cho thành viên hiện tại đã được lưu trữ vĩnh viễn trên Supabase Database, không bị mất khi làm mới/tải lại trang, giúp thành viên lập tức truy cập form Tạo chi tiêu, nút Sửa/Xóa hóa đơn, và nút Quét hóa đơn AI floating mượt mà.
- **26/07/2026 (Hoàn thiện hiển thị biên lai & Xác nhận luồng PDF)**: Cập nhật hiển thị tên người gửi dự phòng (Thành viên) và bổ sung thời gian tạo/tải lên (formatDateTime) cho thẻ biên lai chờ duyệt. Xác nhận luồng xuất PDF là 100% Client-side, không tốn tài nguyên Database hay Băng thông Egress.
- **26/07/2026 (Fix hiển thị biên lai cũ)**: Khắc phục lỗi khuyết tên người nhận ở các biên lai cũ do thiếu dữ liệu `toId` bằng cách hiển thị dự phòng "Quỹ Nhóm" tại SettleUpSection.
- **15/07/2026**: Đã ghi nhận lưu ý quan trọng: "Khi sinh mã QR thanh toán, QR sẽ tự động cập nhật ngay khi nhập số tiền, không cần nút bấm thủ công. Tuy nhiên cần ràng buộc chặt chẽ số tiền tối đa không vượt quá nợ hoặc dư quỹ. Tên ngân hàng luôn được render hiển thị bằng tên viết tắt (không hiển thị mã số thô). Các nhãn thông tin phải được rút gọn ngắn gọn."
- **15/07/2026 (Cập nhật)**: Tối ưu hoá flow: Đưa phần hiển thị Dư quỹ hiện tại lên dải banner màu xanh lá cực kỳ sang trọng của thẻ "TỔNG QUAN PHÂN BỔ" ở đầu trang Trả nợ & Quyết toán. Khống chế số tiền mặc định hiển thị khi mở popup hoàn tiền không được vượt quá số dư quỹ. Thay đổi flow QR: Mã QR chỉ được cập nhật sau khi người dùng nhấn nút "Xác nhận & Cập nhật QR". Các nút "Trả hết (100%)", "Trả 1 nửa (50%)" và nhập tay chỉ đổi số tiền trong ô nhập liệu.
- **15/07/2026 (Đồng bộ thẻ giao dịch Quỹ)**: Chỉnh sửa `FundHistoryList.tsx` để đồng bộ hóa 100% giao diện "Lịch sử giao dịch Quỹ Nhóm" với định dạng của thẻ chi tiêu. Loại bỏ phần chữ thô `[Nộp Quỹ]` và emoji ở đầu mô tả, thay thế bằng tích hợp avatar thành viên sắc nét cùng icon `PiggyBank`, điều chỉnh cấu trúc thẻ vào hộp bo góc tròn `rounded-[24px]` thanh lịch có shadow và viền mảnh. Đồng thời sửa triệt để lỗi parse ngày tháng ISO dính chữ `T` gây méo ngày hiển thị.
- **16/07/2026 (Khắc phục UI Header & Làm tròn Tiền tệ)**:
  - Tích hợp `safe-area-inset-top` vào thuộc tính chiều cao động `h-[calc(3.5rem+env(safe-area-inset-top,0px))]` và khoảng đệm trên `pt-[env(safe-area-inset-top,0px)]` của `SmartHeader.tsx` để không bị đè bởi tai thỏ / icon hệ thống (pin, wifi) trên Mobile. Đồng thời đồng bộ `pt-[calc(3.5rem+env(safe-area-inset-top,0px))]` trên khung chứa chính ở `App.tsx`.
  - Làm tròn tiền tệ đồng nhất trên toàn bộ ứng dụng bằng cách lồng `Math.round()` vào các hàm định dạng tiền tệ `formatMoney` và `getDayTotalStr` tại `CloseCycleSection.tsx`, `SettleUpSection.tsx` và `ExpenseList.tsx`, loại bỏ hoàn toàn dấu thập phân lẻ thừa (ví dụ hiển thị chẵn chục `20.582.353đ` thay vì bị hiển thị kèm số thập phân `,333đ`).
- **16/07/2026 (Tối ưu giao diện Chốt Sổ & Nâng cấp)**:
  - Phân tách luồng hiển thị lịch sử lưu trữ: Nếu nhóm đã ở gói cao cấp (`BE_BAN` / `HOI_LANG`) nhưng chưa có kỳ lưu trữ nào, hệ thống hiển thị thông báo trạng thái premium chào mừng kèm icon `Sparkles` dễ thương, ẩn hoàn toàn hộp quảng bá nâng cấp và biểu tượng Khóa (giải quyết triệt để lỗi hiển thị nút nâng cấp khi nhóm đã ở gói cao nhất).
  - Loại bỏ hoàn toàn thẻ "Quyền truy cập của bạn" (`ACCESS SETTINGS & TOOLS`) ở cuối màn hình Chốt Sổ để giao diện cực kỳ tinh gọn, thoáng đãng cho thành viên và trưởng nhóm khi thao tác. Bảo lưu các công cụ phát triển ẩn chỉ hiển thị riêng cho admin.
- **17/07/2026 (Tái cấu trúc Trang Chào Mừng và Đăng Nhập/Đăng Ký mỏng nhẹ chuẩn Mobile App)**:
  - Loại bỏ hoàn toàn giao diện Onboarding cồng kềnh cũ (giao diện trông giống trang web tĩnh) và thay thế bằng hệ thống 2 màn hình di động phẳng, mỏng nhẹ, tối giản và thoáng đãng tuyệt đối theo đúng ngôn ngữ thiết kế di động hiện đại.
  - **MÀN HÌNH A (TRANG CHÀO MỪNG)**: Bố cục căn giữa mỏng nhẹ, Logo tối giản, Slogan ấn tượng, hình minh họa Flat Minimalist vẽ bằng SVG có chuyển động xoay mượt mà, cùng form nhập nhanh mã nhóm 6 ký tự.
  - **MÀN HÌNH B (TRANG ĐĂNG NHẬP / ĐĂNG KÝ)**: Chuyển đổi mượt mà bằng spring animation và `AnimatePresence`. Sử dụng Segment Control dạng viên thuốc cao cấp giúp chuyển đổi Tab nhanh chóng, có đầy đủ các trường thông tin gọn gàng tinh tế.
  - Bảo toàn 100% logic đăng nhập, đăng ký bằng Email/Password qua Supabase Auth và Chế độ trải nghiệm offline dùng một lần (nhập tên khách và tự động khởi tạo nhóm demo).
- **17/07/2026 (Tăng giá 2 gói dịch vụ)**:
  - Thực hiện tăng giá của hai gói nâng cấp trong `UpgradeModal.tsx` theo mong muốn của người dùng:
    - **Gói Bè Bạn (`BE_BAN`)**: Tăng giá hiển thị từ `29.000đ` lên `49.000đ` và giá trị số `priceRaw` từ `29000` lên `49000`.
    - **Gói Hội Làng (`HOI_LANG`)**: Tăng giá hiển thị từ `69.000đ` lên `99.000đ` và giá trị số `priceRaw` từ `69000` lên `99000`.
  - Kiểm thử và biên dịch thành công hệ thống, đồng bộ hóa thông tin báo giá và QR tự động.
- **17/07/2026 (Gói Du Hí & Mặc định Quỹ nhóm)**:
  - Tích hợp thành công **Gói Du Hí (`DU_HI_30` - 29.000đ / 30 ngày)** với Banner nổi bật ở chân trang Modal nâng cấp (`UpgradeModal.tsx`), đồng bộ hoá thời hạn sử dụng động 30 ngày tại Webhook SePay và Checkout.
  - Lập trình cơ chế tự động điền Người trả là Quỹ Nhóm (`payerId: "group"`) trong form `ExpenseForm.tsx` khi có số dư > 0 kèm nhãn màu xanh lá dễ chịu `🚗 Đã tự động chọn Quỹ nhóm theo Gói Du Hí`.
  - Đồng bộ logic khấu trừ chi tiêu trực tiếp từ Quỹ vào `actualFundBalance` ở cả `SettleUpSection.tsx` và `App.tsx` giúp dòng tiền đối soát công nợ chuẩn xác.
- **17/07/2026 (Pricing Modal Phân Tab Tối Giản chuẩn FinTech)**:
  - Tái cấu trúc thành công giao diện trang Nâng Cấp Nhóm (`UpgradeModal.tsx`) thành dạng phân tab di động mỏng nhẹ.
  - Thiết kế bộ trượt chuyển đổi Segment Control dạng viên thuốc hiện đại: `[ Theo Chuyến 🚗 ]` và `[ Theo Năm 🤝 ]`.
  - Thiết kế logic chuyển Tab mượt mà qua `AnimatePresence`. Tab "Theo Chuyến" hiển thị Gói Du Hí (29.000đ) siêu gọn, Tab "Theo Năm" hiển thị danh sách dạng Flat ngang gồm Gói Bè Bạn (49.000đ) và Gói Hội Làng (99.000đ) cho phép bấm chọn nhanh với hiệu ứng viền xanh ngọc chủ đạo `#03B875` mượt mà.
  - Rút gọn toàn bộ các nút bấm thanh toán rải rác trước đây thành đúng 1 NÚT BẤM DUY NHẤT (Unified CTA) cố định dưới đáy Modal ở step pricing, tự động thay đổi nhãn động theo gói được chọn và xử lý vô hiệu hoá (disable) kèm thời gian hết hạn cụ thể nếu nhóm đang sở hữu gói.
  - Bảo toàn 100% logic thanh toán tự động qua SePay Webhook, hệ thống Voucher/Giftcode và tích hợp cơ sở dữ liệu Supabase.
- **17/07/2026 (Đề xuất tạo nhóm mới cho Gói Du Hí)**:
  - Tích hợp thêm đề xuất thông minh tại Unified CTA Footer của `UpgradeModal.tsx` khi người dùng đang ở nhóm có gói cao hơn (`BE_BAN` hoặc `HOI_LANG`) nhưng xem tab Gói Du Hí.
  - Thiết kế hộp thông báo Tiếng Việt tinh tế: *"Nhóm đã sở hữu gói {Tên Gói}. Hãy tạo nhóm mới để áp dụng Gói Du Hí 🚗 nhé!"* đi kèm nút bấm màu xanh lá `🚗 Tạo nhóm mới để dùng Gói Du Hí` được kết nối trực tiếp với sự kiện mở form tạo nhóm mỏng nhẹ trên trang chính của `App.tsx`.
- **19/07/2026 (Đồng bộ hóa hiển thị Gói Du Hí - DU_HI_30)**:
  - Sửa lỗi nghiêm trọng khiến nhóm đã nâng cấp Gói Du Hí (`DU_HI_30`) nhưng vẫn hiển thị Gói FREE ở phần cấu hình nhóm, danh sách nhóm của `SmartHeader.tsx`, và danh sách chuyển nhóm của `App.tsx`.
  - Cập nhật định mức Gói Du Hí trong SmartHeader: Hạn mức hóa đơn là vô hạn (`Infinity`), hạn mức quét hóa đơn AI là 100 lượt/30 ngày. Đồng thời tăng giới hạn thành viên tối đa của nhóm lên 20 người trong `App.tsx`. Gói Du Hí được thiết kế màu xanh dương nhạt với biểu tượng ô tô (`🚗 Gói Du Hí`) cực kỳ trực quan và đồng bộ.
- **19/07/2026 (Hiển thị Ngày & Giờ hết hạn và thời gian còn lại của gói dịch vụ nhóm)**:
  - Tích hợp hộp thông tin thời hạn tinh tế ngay bên dưới nhãn gói tại mục cài đặt của nhóm (`SmartHeader.tsx`).
  - Hộp thông tin tự động hiển thị ngày giờ hết hạn được format chuẩn bằng `formatDateTime(fallbackExpiredAt)` kèm theo nhãn đếm số ngày sử dụng còn lại với màu sắc tươi sáng, sinh động.
  - Xử lý cơ chế dự phòng (fallback) tự động bằng cách cộng thêm số ngày tương ứng của gói (30 ngày cho Gói Du Hí, 365 ngày cho Bè Bạn và Hội Làng) tính từ ngày khởi tạo nếu thuộc tính `planExpiredAt` chưa được định nghĩa.
- **19/07/2026 (Tái tích hợp và sửa lỗi hiển thị các Modal & Dialog hệ thống)**:
  - Khắc phục lỗi nghiêm trọng khi cấu trúc JSX render của các Modal và Toast hệ thống bao gồm: Hộp thoại Xác nhận (`confirmState`), Hộp thoại Thông báo (`alertState`), và Toast Notification (`toastMsg`) bị khuyết/xóa trống ở chân file `App.tsx`.
  - Tái tạo giao diện Modal cực kỳ trực quan, phẳng, mỏng nhẹ, có overlay phủ nền mờ (`backdrop-blur-xs`) và sử dụng Framer Motion để mang lại hiệu ứng spring mượt mà, giúp nút "Xóa" thẻ chi tiêu và các thông báo bật lên một cách trơn tru, chính xác khi Trưởng nhóm thao tác.
- **19/07/2026 (Tích hợp nút Cấu hình & Cài đặt Quỹ Nhóm trên Desktop)**:
  - Di chuyển `SmartHeader` ra cấp độ root của `App.tsx` giúp nó hoạt động trên mọi thiết bị, đồng thời thêm class `md:hidden` vào chính mobile header bar để ẩn hoàn toàn thanh header di động khi dùng Desktop nhưng các modal cài đặt bên trong vẫn kích hoạt bình thường.
  - Tích hợp thêm nút Cài đặt nhóm `Settings` ⚙️ trên Desktop Header ngay bên cạnh bộ chọn Nhóm. Khi click sẽ kích hoạt Custom Event `"open-group-settings"` để mở trực tiếp modal Cấu hình tài khoản ngân hàng quỹ nhóm (chọn ngân hàng, STK, tạo QR VietQR tự động) cho Trưởng nhóm / Thủ quỹ trên Desktop.- **19/07/2026 (Đồng bộ hóa Onboarding Gói Du Hí lên Desktop & Tối ưu hóa Nút Cài đặt Ngân hàng)**:
  - Đưa toàn bộ component hướng dẫn từng bước `DuHiOnboarding.tsx` hiển thị thống nhất trên cả Desktop (ngay phía trên danh sách hóa đơn chi tiêu) giúp Trưởng nhóm và thành viên trên Máy tính đều có trải nghiệm Onboarding và dễ dàng cấu hình, tránh tình trạng "mất nút cài đặt" trên Desktop.
  - Tích hợp Banner cảnh báo thông minh màu hổ phách ngay đầu danh sách "Các khoản cần tất toán" của màn hình Trả nợ (`SettleUpSection.tsx`) cho Trưởng nhóm / Thủ quỹ khi tài khoản nhận tiền của Quỹ chưa được thiết lập, kèm nút liên kết nhanh "Cài đặt ngay" mở tức thì Modal cấu hình ngân hàng.
  - Cải tiến logic click nút nộp tiền/tất toán: Nếu Quỹ nhóm chưa có tài khoản ngân hàng, hệ thống chặn mở popup QR trống, đồng thời kích hoạt mở tự động Modal cài đặt để Trưởng nhóm nhanh chóng thiết lập STK/Ví nhận tiền.
- **19/07/2026 (Cải tiến Thay đổi Avatar Thành viên & Điều hướng Mobile)**:
  - Loại bỏ hoàn toàn bộ chọn Emoji khi tạo/chỉnh sửa thành viên, thay thế bằng cơ chế hiển thị Avatar tự động (tích hợp API Dicebear) tương tác thời gian thực khi người dùng gõ Tên.
  - Sửa lỗi điều hướng Onboarding trên Mobile: Di chuyển chấm nháy cam cảnh báo từ tab "Chốt sổ" lên cụm Avatar thành viên trên thanh Header, giúp người dùng dễ dàng nhận biết và click mở ngăn Quản lý Thành viên.
- **19/07/2026 (Logic Tạo Yêu Cầu Nộp Quỹ Đóng Chung & Cấn Trừ Tự Động)**:
  - Cập nhật cơ sở dữ liệu `Expense` (trong `types.ts`) với thuộc tính `isFundDeposit: boolean`.
  - Thiết kế lại Onboarding Gói Du Hí Bước 3 để tạo ra **DUY NHẤT 1 Hóa Đơn Chung** cho việc Nộp Quỹ (Thay vì tạo N hóa đơn lẻ tẻ). Hóa đơn này có `payerId="group"`, `participantIds=[Tất cả]`, và `isFundDeposit=true`.
  - Điều chỉnh thuật toán `calculateBalances` trong `debtSimplifier.ts`: Ghi nhận khoản nộp quỹ vào nghĩa vụ cần thanh toán (`share`) của thành viên tham gia thay vì tự động tăng số tiền đã đóng (`paid`). Do đó, khi tạo yêu cầu nộp quỹ, số dư của họ sẽ tạm giảm (báo nợ quỹ).
  - Số dư của thành viên chỉ tăng lên sau khi họ tiến hành nộp quỹ thực tế và hoàn tất nợ (giao dịch `📥 [Nộp Quỹ]` được duyệt, làm tăng `paid`).
  - Đảm bảo loại trừ các hóa đơn yêu cầu nộp quỹ `isFundDeposit` ra khỏi số dư thực tế của Quỹ nhóm (`actualFundBalance`), tránh bị cộng khống tiền khi thành viên chưa thanh toán thật.
  - Tối ưu UI tại `ExpenseList.tsx` và `FundHistoryList.tsx` để hiển thị Thẻ Nộp Quỹ Chung chuyên nghiệp, có Icon Quỹ nhóm.

- **21/07/2026 (Sửa lỗi khi tạo nộp quỹ đồng loạt)**:
  - Khắc phục lỗi `activeGroup.expenses is not iterable` trong hàm `handleBatchAddExpenses` bằng cách bổ sung fallback mảng rỗng `activeGroup.expenses || []` ở mọi vị trí truy xuất mảng.
  - Khắc phục lỗi render logic tạo 1 hóa đơn chung duy nhất khi ấn nút "Nộp đồng loạt" tại `DuHiOnboarding.tsx`.

- **21/07/2026 (Khắc phục UI Modal QR bung toàn màn hình Desktop)**:
  - Khắc phục lỗi Modal QR (`SettleUpSection.tsx`) bị giãn toàn bộ chiều ngang trên Desktop. Áp dụng kỹ thuật responsive `md:max-w-md` và bọc trong container `flex items-end md:items-center justify-center` để biến Bottom Sheet di động thành Dialog nổi 448px nằm giữa màn hình Desktop.

- **21/07/2026 (Tích hợp tính năng Xác nhận nhanh bằng ảnh biên lai)**:
  - Bổ sung logic tải ảnh biên lai trực tiếp từ Dialog/Modal Thanh toán (trong `SettleUpSection.tsx`).
  - Liên kết sự kiện `onChange` từ `<input type="file" />` ẩn trong nút tải ảnh vào state `pendingReceipts`. Khi tải thành công ảnh, biên lai tự động chuyển vào hàng chờ duyệt mà không cần bước "Xác nhận đã chuyển" thủ công.

- **21/07/2026 (Sửa lỗi upload ảnh biên lai tại SettleUpSection)**:
  - Khắc phục lỗi "Upload failed" do truyền sai cấu trúc request payload API (sửa trường `base64` thành `image`, truyền thêm `groupId`).

- **21/07/2026 (Tự động hóa đối soát biên lai bằng AI Gemini)**:
  - Tích hợp Gemini Vision API (`/api/receipt/scan`) trực tiếp vào luồng tải ảnh biên lai chuyển khoản tại `SettleUpSection.tsx`.
  - Nếu số tiền AI đọc được khớp 100% với số tiền nợ, hệ thống sẽ tự động gán nhãn `✨ AI Khớp Lệnh` và hoàn tất công nợ tức thì mà không cần Trưởng nhóm duyệt thủ công.

- **21/07/2026 (Khắc phục triệt để lỗi Gemini 404 khi quét hóa đơn / biên lai)**:
  - Cập nhật danh sách model ưu tiên trong API quét hóa đơn (`/api/receipt/scan` tại `api/api-app.ts`) sang các model chính thức hiện hành: `gemini-2.5-flash`, `gemini-3.6-flash`, và `gemini-3.1-flash-lite`.
  - Loại bỏ các model không hỗ trợ giúp quét AI nhận diện hóa đơn và biên lai mượt mà 100%.

- **21/07/2026 (Sửa lỗi hiển thị nhãn chọn Quỹ Nhóm ở gói Hội Làng / Bè Bạn)**:
  - Khắc phục lỗi nhãn `🚗 Đã tự động chọn Quỹ nhóm theo Gói Du Hí` xuất hiện sai ở nhóm Gói Hội Làng khi Quỹ Nhóm được chọn làm người trả.
  - Phân tách chính xác nhãn theo từng trường hợp: Hiển thị nhãn `Gói Du Hí` cho nhóm `DU_HI_30`, và hiển thị nhãn `🏦 Đã chọn Quỹ nhóm (Dư quỹ: Xđ)` khi nhóm khác có dư quỹ.
  - Tự động reset người trả mặc định khi chuyển đổi qua lại giữa các nhóm.

- **21/07/2026 (Ràng buộc duy nhất Gói Du Hí có tùy chọn Người trả là Quỹ Nhóm)**:
  - Khắc phục lỗi hiển thị nhầm option `Quỹ Nhóm` ở Gói Hội Làng.
  - Khống chế tính năng chọn Người trả là Quỹ Nhóm CHỈ áp dụng riêng cho **Gói Du Hí (`DU_HI_30`)**.
  - Ẩn tùy chọn Quỹ Nhóm và tự động chọn lại người trả là thành viên đối với các gói Hội Làng, Bè Bạn và Free.

- **21/07/2026 (Khắc phục lỗi 403 PERMISSION_DENIED Gemini API)**:
  - Loại bỏ header `User-Agent` không phù hợp khi khởi tạo `GoogleGenAI` trong `api/api-app.ts`.
  - Cập nhật danh sách model ưu tiên chuẩn `@google/genai`: `gemini-3.6-flash`, `gemini-flash-latest`, `gemini-3.1-flash-lite`.

- **21/07/2026 (Cập nhật danh sách Model ưu tiên Gemini AI)**:
  - Thiết lập thứ tự thử nghiệm quét hóa đơn/đối soát biên lai: `gemini-2.5-flash` (ưu tiên chính) -> `gemini-3.6-flash` (dự phòng 1) -> `gemini-3.1-flash-lite` (dự phòng 2).

- **21/07/2026 (Khắc phục lỗi Máy ảnh & Xử lý phản hồi lỗi Gemini 403 PERMISSION_DENIED)**:
  - Bổ sung nút Tải ảnh từ thư viện ngay tại khung lỗi máy ảnh trong `LiveCamera.tsx`.
  - Tối ưu phản hồi báo lỗi 403 / PERMISSION_DENIED của Gemini API bằng Tiếng Việt hướng dẫn người dùng kiểm tra `GEMINI_API_KEY` trong Settings > Secrets.

- **21/07/2026 (Tinh gọn LiveCamera)**:
  - Loại bỏ nút "Tải ảnh từ thư viện" ở giao diện lỗi camera trong `LiveCamera.tsx`. Chỉ giữ lại nút "Thử lại camera" gọn gàng.

- **21/07/2026 (Xử lý an toàn JSON & Tinh gọn LiveCamera)**:
  - Bổ sung khối try-catch an toàn khi parse JSON kết quả từ `/api/receipt/scan` trong `ExpenseForm.tsx` ngăn chặn vỡ giao diện do lỗi HTML 403/500.
  - Khôi phục khung thông báo camera trong `LiveCamera.tsx` tinh gọn theo đúng yêu cầu trải nghiệm di động.

- **21/07/2026 (Khắc phục lỗi Express trả về HTML khi bắt lỗi JSON AI)**:
  - Cập nhật luồng xử lý lỗi ở `api/api-app.ts` (`/api/receipt/scan` và `/api/receipt/reconcile-ocr`) để đảm bảo parse lỗi API Gemini thành JSON hợp lệ trước khi đẩy về Client, chấm dứt hoàn toàn hiện tượng vỡ HTML JSON ở Client.

- **21/07/2026 (Nâng cấp cấu hình ép chuẩn JSON Mode & Temperature cho Gemini Scan API)**:
  - Bổ sung `temperature: 0.1` và củng cố `responseMimeType: "application/json"` kết hợp `responseSchema` trong cấu hình `config` cho cả 2 endpoint quét hóa đơn `/api/receipt/scan` và `/api/receipt/reconcile-ocr`.

- **21/07/2026 (Cập nhật danh sách Model Gemini chính thức chuẩn SDK)**:
  - Đồng bộ danh sách model Gemini chính thức chuẩn SDK (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-flash`, `gemini-1.5-flash`) cho tất cả các API quét hóa đơn và đối soát OCR.

- **21/07/2026 (Loại bỏ các model Gemini deprecated & Cập nhật danh sách Model chính thức)**:
  - Loại bỏ hoàn toàn các model không còn hỗ trợ `gemini-1.5-flash` và `gemini-2.0-flash` (gây lỗi 404 NOT_FOUND).
  - Cập nhật danh sách model ưu tiên chuẩn SDK `@google/genai`: `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-3.6-flash`, `gemini-3.1-flash-lite`.

- **21/07/2026 (Đồng bộ hóa 100% giao diện Lịch giao dịch Quỹ với Lịch Chi Tiêu)**:
  - Tái cấu trúc hoàn toàn Calendar View của `FundHistoryList.tsx` sang dạng thẻ bo góc mềm mại `rounded-2xl gap-1` hiện đại, đồng bộ 100% với `ExpenseList.tsx`.

- **22/07/2026 (Logic Tính Quỹ Nhóm & Dư Quỹ Nhóm Du Hí)**:
  - Loại bỏ hoàn toàn các khoản Yêu cầu đóng quỹ (`isFundDeposit`) và giao dịch Nộp/Nhận quỹ ra khỏi "Tổng chi tiêu nhóm" (Total Group Spending) ở toàn bộ ứng dụng.
  - Cập nhật thuật toán `calculateBalances` trong `debtSimplifier.ts`: Chuyển mảng nộp quỹ `isFundDeposit` thành `fundRequired`. Sau khi thành viên hoàn tất nộp quỹ vào nhóm, số dư của họ sẽ tự động là DƯ QUỸ (dương `+netBalance`), và số dư này sẽ được trừ dần dần chính xác theo từng khoản chi tiêu thực tế mà thành viên đó tham gia trong nhóm.

- **22/07/2026 (Tích hợp Mục Lưu Các Khoản Đã Trả Trước / Nộp Quỹ Thành Viên)**:
  - Tạo mới component `PrepaidSection.tsx` quản lý & hiển thị danh sách các khoản tiền đóng trước/đặt cọc/nộp quỹ của từng thành viên trong nhóm.
  - Hiển thị 3 chỉ số tổng quan ở cấp nhóm: Tổng đã nộp/trả trước, Dư quỹ khả dụng còn lại, và Số tiền đã cấn trừ chi tiêu thực tế.
  - Cho phép xem chi tiết từng lượt đóng trước (ngày giờ, mô tả, số tiền) theo dạng thẻ thả xuống (Accordion) cho từng thành viên.
  - Tích hợp thêm thẻ tổng hợp Khoản trả trước & Nộp quỹ vào Modal "Sao kê công nợ cá nhân" (`PersonalStatementModal.tsx`) và màn hình "Trả nợ & Quyết toán" (`SettleUpSection.tsx`).

- **22/07/2026 (Tối ưu hóa & Nâng cấp Nổi bật Sao Kê Công Nợ Cá Nhân)**:
  - Loại bỏ hoàn toàn component dư thừa `PrepaidSection.tsx` khỏi màn hình "Trả nợ & Quyết toán" (`SettleUpSection.tsx`), chuyển toàn bộ việc xem danh sách chi trước vào Tab 2 ("Đã chi trước") của Modal Sao kê cá nhân.
  - Tái thiết kế nút mở Sao Kê thành một **Thẻ Banner Nổi Bật** (`Hero Banner`) sang trọng tại `SettleUpSection.tsx` với tông màu ngọc bích nổi bật, biểu tượng `FileText` và `Sparkles`, giúp thành viên dễ dàng chú ý và truy cập ngay lập tức.
  - Tắt hoàn toàn nút cuộn nhanh lên đầu trang (`Scroll to top`) trong `App.tsx` theo yêu cầu.
  - Cập nhật điều hướng Hủy/Thêm chi phí (`ExpenseForm`): Chuyển hướng màn hình trực tiếp về Tab **Chi tiêu** (`bills`) thay vì quay ra Tab **Tổng quan** (`home`).
  - Tối ưu hóa animation viên thuốc chuyển Tab Đăng nhập / Đăng ký (`activeAuthTab`): Dùng `x` transform tăng tốc phần cứng GPU phản hồi 0.18s mượt mà tức thì.

- **23/07/2026 (Hiển thị Thông báo Lỗi Đăng Nhập & Mã Nhóm)**:
  - Bổ sung banner thông báo lỗi Tiếng Việt màu đỏ sắc nét kèm biểu tượng `AlertCircle` khi người dùng nhập sai thông tin đăng nhập Thủ quỹ (Email/Mật khẩu) hoặc Mã nhóm 6 ký tự.
  - Tích hợp tự động xóa thông báo lỗi khi người dùng gõ lại thông tin hoặc chuyển tab giữa Đăng nhập và Đăng ký.
  - Đồng bộ thông báo lỗi phản hồi từ API backend (`/api/leader/auth` và `/api/member/login`) sang giao diện trực quan inline cho cả di động lẫn máy tính.

- **23/07/2026 (Tối ưu hóa kích thước Modal QR Nộp quỹ / Hoàn nợ)**:
  - Tái cấu trúc giao diện Modal QR thanh toán (`SettleUpSection.tsx`): Chuyển đổi từ dạng Bottom Sheet tràn 90% chiều cao màn hình sang dạng Dialog bo góc tròn `rounded-3xl` căn giữa tinh tế, có biên lề thông thoáng 12px-16px.
  - Tinh chỉnh kích thước mã VietQR từ `224px` xuống `176px-192px` chuẩn tỷ lệ quét, thu gọn padding và khoảng cách các ô sao chép thông tin tài khoản ngân hàng, giúp modal hiển thị vừa vặn, gọn gàng, không chiếm toàn màn hình di động hay đè lên thanh điều hướng.

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

- **23/07/2026 (Tách Ô Nhập Voucher Ra Ngoài & Ràng Buộc 1 Lần Sử Dụng Mỗi Email Trưởng Nhóm)**:
  - Tách mục nhập mã quà tặng/voucher ra trực tiếp ngoài màn hình Bảng Giá chính (`Pricing Step`) của `UpgradeModal.tsx`. Trưởng nhóm có thể nhập mã quà tặng để kích hoạt nâng cấp nhóm tức thì mà không cần qua bước chọn gói hay thanh toán.
  - Cập nhật API Backend `/api/vouchers/apply`: Tích hợp ràng buộc **mỗi Email Trưởng nhóm chỉ được áp dụng Voucher 1 lần duy nhất trên toàn bộ hệ thống** (kiểm tra triệt để cả bảng `vouchers` lẫn các `groups` do Email đó sở hữu).
  - Tự động cập nhật gói nhóm (`plan`), thời gian kích hoạt (`planActivatedAt`), và ngày hết hạn (`planExpiredAt`) tương ứng với từng loại Voucher (Gói Du Hí 30 ngày, Bè Bạn/Hội Làng 12 tháng) ngay khi áp dụng thành công.

- **24/07/2026 (Nâng cấp Modal Tạo Nhóm Mới dạng Popup Nổi Toàn Cục)**:
  - Khắc phục lỗi nút bấm "Tạo nhóm mới" và nút nổi FAB `+` góc dưới bên phải không phản hồi do thiếu khối giao diện render trong React.
  - Xây dựng Popup Modal `isCreatingGroup` phẳng, mỏng nhẹ, sang trọng bọc trong `AnimatePresence` với hiệu ứng mờ nền (`backdrop-blur-sm`).
  - Cho phép người dùng nhập tên nhóm trực quan từ bất kỳ đâu trên ứng dụng và tự động chọn ngay nhóm mới tạo sau khi hoàn tất.

- **25/07/2026 (Refactor Tách Mô-đun hóa Component CreateGroupModal)**:
  - Tiến hành tái cấu trúc tách component `CreateGroupModal.tsx` từ file `App.tsx` cồng kềnh giúp đơn giản hóa cấu trúc cây ứng dụng.
  - Đảm bảo tính nhất quán 100% về type safety, animation, và logic xử lý form tạo nhóm.
  - Kiểm thử và biên dịch thành công 100% không phát sinh lỗi hệ thống.

- **25/07/2026 (Thiết kế & Triển khai Hệ thống Thông báo Trung tâm - Notification System)**:
  - Tích hợp biểu tượng Chuông thông báo 🔔 kèm badge đỏ đếm số lượng chưa đọc (`unreadCount`) hoạt động trực quan trên cả Mobile & Desktop Header.
  - Tạo mới component `NotificationModal.tsx` tự động tổng hợp biến động từ dữ liệu thực tế của nhóm: Chi tiêu mới thêm, Biên lai tất toán cần duyệt, Yêu cầu nộp quỹ, Trạng thái gói cước dịch vụ & Thông báo hệ thống.
  - Hỗ trợ bộ lọc "Tất cả" & "Chưa đọc", nút "Đọc tất cả", định dạng thời gian tương đối sinh động (phút/giờ/ngày trước) và tự động điều hướng sang Tab chức năng liên quan khi bấm vào thông báo.
  - Lưu trữ bền vững trạng thái đã đọc theo ID nhóm qua `localStorage`.

- **25/07/2026 (Phân quyền thông báo thông minh giữa Trưởng nhóm & Thành viên)**:
  - **Trưởng nhóm (Leader/Admin)**: Hiển thị đầy đủ thông báo quản lý cấp nhóm bao gồm tất cả biên lai chuyển khoản cần duyệt của mọi thành viên, tất cả khoản chi tiêu mới thêm trong nhóm, yêu cầu nộp quỹ và cảnh báo gói cước. Có Badge nhãn "👑 Trưởng nhóm" trên Header modal.
  - **Thành viên (Member)**: Chỉ lọc và hiển thị các thông báo cá nhân hóa trực tiếp liên quan đến chính thành viên (`receipt.fromId === viewingMemberId`, `exp.payerId === viewingMemberId` hoặc `exp.participantIds.includes(viewingMemberId)`). Có Badge nhãn "👤 Thành viên (Tên)" trên Header modal. Đồng bộ đếm số chưa đọc `unreadCount` chính xác theo từng vai trò.
  - **Chuyển Màn Hình & Cuộn Đèn Sáng Tự Động (1-Touch Navigate & Highlight)**: Khi bấm vào bất kỳ thẻ thông báo nào, hệ thống tự động kích hoạt sự kiện `focus-target-item`, tự động chuyển chế độ hiển thị sang Dạng Danh Sách (`viewMode="list"`), reset sạch bộ lọc tìm kiếm/ngày tháng/người chi để đảm bảo hóa đơn luôn xuất hiện trong DOM, tự động mở rộng (Expand) chi tiết thẻ chi tiêu, tính toán tọa độ cuộn mượt (`scrollIntoView` & `window.scrollTo`) và bật viền sáng xanh ngọc `ring-emerald-500` nổi bật trong 4s.

- **25/07/2026 (Tối Ưu & Tái Cấu Trúc Hộp Góp Ý Cộng Đồng)**:
  - Loại bỏ hoàn toàn Floating Action Button (FAB) báo lỗi/góp ý lơ lửng góc màn hình cũ (chiếm diện tích, dễ vô tình chạm nhầm trên mobile).
  - Tích hợp biểu mẫu góp ý (FeedbackModal) vào trực tiếp Trang FAQ dưới dạng nút bấm tĩnh nổi bật "Góp Ý & Báo Lỗi" ngay trên Banner. Cải tiến thiết kế giúp form góp ý hiển thị dạng Dialog mỏng nhẹ ngay chính giữa trang thay vì popup từ dưới lên.
  - Loại bỏ Tab phân loại (Góp ý / Báo lỗi / Hiến kế) trong Form Góp Ý để tối giản giao diện, chỉ giữ lại khung nhập nội dung giúp người dùng phản hồi nhanh chóng nhất.
  - Tự động tải lại (refetch) và chuyển tab Hòm Thư Cộng Đồng sau khi người dùng gửi phản hồi thành công.

- **25/07/2026 (Tối ưu giao diện Màn hình Đăng nhập / Đăng ký & Ràng buộc Chế độ xài 1 lần)**:
  - Tăng kích thước tiêu đề ("Bắt đầu thôi!"), nút tab Đăng nhập / Đăng ký, nhãn tiêu đề ô nhập liệu và các khung Input (`h-13` / 52px) giúp hiển thị to, rõ, đậm đặn và dễ thao tác trên di động.
  - Loại bỏ khoảng cách khoảng trắng thừa bị kéo giãn giữa các ô nhập liệu và nút bấm ("Đăng nhập Thủ quỹ"), gom lại thành bố cục gọn gàng, đậm nét và vừa vặn khung hình theo đúng thiết kế tham chiếu.
  - Sửa dứt điểm sự cố bấm nút "⚡ Chế độ xài 1 lần" không phản hồi bằng cách tách và render component `OfflineModal.tsx`, cho phép người dùng nhập tên và vào thẳng nhóm ăn chơi trải nghiệm nhanh không cần tài khoản.
  - **Ràng buộc Chế độ xài 1 lần**: Khống chế Chế độ xài 1 lần (`tryOfflineMode`) chỉ phục vụ mục đích dùng thử 1 nhóm mặc định duy nhất. Khi người dùng bấm tạo nhóm mới (qua FAB, SmartHeader hay Empty state), hệ thống chủ động ngăn chặn và hiển thị thông báo hướng dẫn người dùng Đăng nhập/Đăng ký tài khoản Thủ quỹ để sở hữu tính năng khởi tạo không giới hạn nhiều nhóm.
- **25/07/2026 (Tích hợp Nút Thêm vào Màn hình chính - PWA)**:
  - Tích hợp Banner "Thêm vào Màn hình chính" ở góc dưới màn hình giúp người dùng thêm ứng dụng vào điện thoại chỉ với 1 chạm.
  - Xử lý tương thích 100% với iOS Safari (iPhone/iPad): Tự động phát hiện thiết bị iOS và hiển thị Modal hướng dẫn 3 bước cực kỳ sinh động (1. Nhấn nút Chia sẻ ⎋ -> 2. Chọn Thêm vào MH chính ➕ -> 3. Nhấn Thêm).
  - Với các trình duyệt Chrome, Edge, Android: Sử dụng sự kiện `beforeinstallprompt` tự động kích hoạt prompt cài đặt.
  - Bổ sung nút cài đặt trong Ngăn kéo cá nhân (`PersonalDrawer`) giúp truy cập dễ dàng mọi lúc.
- **25/07/2026 (Chuẩn hóa UI Mobile App: Tối giản văn bản & Loại bỏ huy hiệu rườm rà)**:
  - Tiến hành rà soát & tối ưu hóa toàn bộ các thẻ chức năng tại `SettleUpSection.tsx` và `CloseCycleSection.tsx`: Loại bỏ hoàn toàn các huy hiệu nhãn quảng cáo/diễn giải dư thừa như `✨ NỔI BẬT • 2 TAB`, `BÙ TRỪ THỦ CÔNG`, `👑 Kỳ Mẫu Hội Làng`.
  - Rút gọn toàn bộ các văn bản mô tả, câu giải thích dông dài thành các câu từ cực kỳ ngắn gọn, đắt giá, mỏng nhẹ đúng ngôn ngữ thiết kế Mobile App FinTech hiện đại.
  - Bổ sung Quy tắc cốt lõi số 7 trong `AGENTS.md` & `PROJECT_BRAIN.md` ghi nhớ nguyên tắc tối giản chữ cho tất cả các phiên làm việc sau.

- **25/07/2026 (Ràng buộc Chế độ xài 1 lần & Luồng Nâng cấp Nhóm)**:
  - Phân quyền "Chế độ xài 1 lần" (Offline trial mode): Đảm bảo chỉ duy nhất Trưởng nhóm (`isAdmin = true`) thực hiện các thao tác quản lý, thu chi, tất toán và xuất báo cáo PDF cho nhóm. Tự động vô hiệu hóa mã truy cập và chế độ xem của thành viên (`memberAccessCodeUser = null`, `viewingMemberId = undefined`).
  - Luồng nâng cấp nhóm từ Chế độ xài 1 lần: Khi bấm "Nâng cấp nhóm" trong Chế độ xài 1 lần, `UpgradeModal` tự động hiển thị thẻ thông báo giải thích người dùng cần Tạo tài khoản / Đăng nhập Thủ quỹ để sao lưu vĩnh viễn dữ liệu nhóm lên Cloud trước khi thanh toán nâng cấp. Bấm nút `[ Đăng ký / Đăng nhập Thủ quỹ → ]` sẽ chuyển hướng mượt mà sang trang Auth.

- **26/07/2026 (Khắc phục hiển thị nhãn Gói Chế độ xài 1 lần)**:
  - Sửa lỗi hiển thị "Gói FREE" khi ở Chế độ xài 1 lần (`tryOfflineMode`): Đồng bộ hóa loại gói `TRY_OFFLINE` và cập nhật hàm `getPlanLabel` trả về "Xài 1 lần ⚡".
  - Tùy chỉnh huy hiệu gói dịch vụ nhóm trong Modal Cấu hình nhóm (`SmartHeader.tsx`), Drawer quản lý nhóm, Selector chọn nhóm và Thẻ chốt sổ (`CloseCycleSection.tsx`) hiển thị huy hiệu nổi bật `⚡ Chế độ xài 1 lần` thay vì hiển thị nhãn "Gói FREE" nhầm lẫn.

- **26/07/2026 (Tối ưu kích thước & Khắc phục quét mã VietQR Tất toán Nợ trong Báo cáo PDF)**:
  - Tối ưu hóa toàn bộ kích thước hiển thị mã VietQR tất toán nợ ở trang sau trong báo cáo PDF xuất ra lên chuẩn `220px x 220px` (đồng bộ 100% với mã QR Quỹ Nhóm trang đầu).
  - Loại bỏ các thuộc tính `border: 1px solid`, `padding: 4px` và `border-radius` trực tiếp trên thẻ `<img>` mã QR giúp giữ nguyên vẹn vùng an toàn (quiet zone) và ma trận nét vẽ QR sắc nét khi xuất PDF qua `html2pdf`.
  - Giúp tất cả các ứng dụng Ngân hàng di động (Vietcombank, MB, Techcombank, BIDV, Agribank, MoMo...) quét ma trận mã QR tất toán nợ nhanh chóng, chính xác và tự động nhận diện đúng số tiền.

- **26/07/2026 (Tách trang mới & Tối ưu bố cục Grid 2x3 chứa 6 mã QR trong PDF)**:
  - **Khắc phục lỗi trắng ảnh triệt để (Blank Image)**: Áp dụng lại phương thức nhúng Base64 cho tất cả các thẻ ảnh mã QR bằng hàm `convertUrlToBase64` kết hợp cơ chế dự phòng vẽ `canvas` thủ công. Điều này giúp loại bỏ hoàn toàn hiện tượng lỗi CORS cross-origin khi thư viện `html2canvas` quét và xuất file PDF.
  - **Ngắt trang hoàn hảo (Chunking)**: Thay vì dồn toàn bộ mã QR vào 1 thẻ `div` dài vô tận dẫn đến bị cắt đứt làm đôi ở cuối trang, hệ thống đã phân tách mảng QR thành từng khối (chunks) độc lập, mỗi khối chứa chính xác 6 thẻ (2 cột x 3 hàng).
  - **Tách Trang Mới Hoàn Toàn Cho Mã QR Tất Toán**: Thêm thuộc tính `page-break-before: always; break-before: page;` ép toàn bộ các khối chứa 6 mã QR nộp quỹ/tất toán nợ sang một trang mới độc lập trong báo cáo PDF, không còn bị ngắt đôi hay chen lấn.

- **26/07/2026 (Cơ Chế Dự Phòng & Xử Lý Lỗi Tải Ảnh Khi Xuất PDF)**:
  - **Chống tràn bộ nhớ Canvas Mobile**: Tự động phát hiện Mobile và giảm `scale` (1.2 mặc định, 0.8 khi retry) để không vi phạm giới hạn 4096px của iOS Safari, triệt tiêu nguyên nhân chính gây trắng PDF.
  - **Reset Scroll đúng Container**: Chuyển từ `window.scrollTo` sang `.overflow-y-auto.scrollTo` để html2canvas không bị crop nhầm vùng hiển thị.
  - **Tự động tách phần tử HTML ra khỏi DOM**: Bằng cách không `appendChild` trực tiếp vào `document.body` và để `html2pdf` tự động render qua iframe ẩn, hệ thống đã triệt tiêu hoàn toàn các lỗi crop, tràn hoặc che khuất (z-index) bởi giao diện ứng dụng trên Desktop, giải quyết triệt để vấn đề PDF xuất ra một trang trắng.
  - **Tự động retry (Fallback)**: Cải tiến logic `html2pdf.js`, chặn và kiểm tra byte-size của chuỗi kết quả. Nếu PDF xuất ra dưới 10KB (dấu hiệu của trang trắng/corrupted), hệ thống sẽ tự động thử lại (`isRetry = true`) với độ phân giải an toàn hơn (`scale: 1.5`), ngăn chặn xuất file trắng ra máy người dùng.
  - **Xử lý an toàn ảnh lỗi**: `waitForImages` sẽ tự động ẩn các ảnh lỗi (`display = 'none'`) không thể decode, bảo vệ `html2canvas` khỏi lỗi "tainted canvas".

- **26/07/2026 (Sửa Dứt Điểm Lỗi PDF Trắng Trơn Bằng Decode Ảnh, IgnoreElements & Bounding Box)**:
  - **Khắc phục nguyên nhân gốc lỗi PDF trắng trơn**:
    1. Thẻ `<img>` chứa mã QR/ảnh chứng từ base64 chưa kịp decode pixels hoàn toàn trong bộ nhớ RAM khi `html2canvas` quét.
    2. Việc cố định `x: 0, y: 0` gây lệch vùng chụp (crop offset).
    3. Lớp overlay Loading bị `html2canvas` quét trúng nếu không được bỏ qua.
  - **Giải pháp xử lý dứt điểm**:
    - Nâng cấp `waitForImages` bắt buộc gọi `img.decode()` bảo đảm 100% dữ liệu pixel của ảnh & VietQR sẵn sàng trong bộ nhớ trước khi chụp.
    - Cấu hình `ignoreElements: (node) => node.id === "pdf-loading-overlay"` cho `html2canvas` loại bỏ hoàn toàn màn hình chờ khỏi file chụp.
    - Bỏ ràng buộc `x: 0, y: 0` gượng ép để `html2canvas` tự động tính đúng Bounding Box của `element`, giúp file PDF xuất ra 100% đầy đủ hình ảnh, bảng biểu và mã QR sắc nét.

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
- **28/07/2026 (Mô hình Quyết toán Quỹ Nhóm Tập trung Cốt lõi)**: SplitMate thực hiện tất toán và giao dịch tập trung thông qua **Quỹ Nhóm** (Thành viên ➔ Quỹ Nhóm & Quỹ Nhóm ➔ Thành viên), **KHÔNG** áp dụng thuật toán tối ưu hóa / rút gọn số lượt giao dịch trực tiếp qua lại giữa các thành viên. Tất cả nghĩa vụ tài chính đều quy về tài khoản Quỹ Nhóm.
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
- **30/07/2026 (Sửa triệt để lỗi trùng lặp BƯỚC 1 khi nhóm đã tồn tại)**:
  - Khắc phục lỗi hiển thị thẻ **BƯỚC 1: TẠO NHÓM CỦA BẠN** đè lên màn hình khi nhóm đã được khởi tạo (ví dụ: nhóm "Phú Quốc").
  - Sửa điều kiện hiển thị thẻ Bước 1 từ `groups.length <= 1` sang chính xác `groups.length === 0` (CHỈ hiển thị thẻ Bước 1 khi chưa có bất kỳ nhóm nào).
  - Khi người dùng đã có nhóm (`groups.length >= 1`), thẻ Bước 1 tự động ẩn hoàn toàn, nhường vị trí cho danh sách nhóm ("Phú Quốc") và khi vào nhóm sẽ tiếp nối đúng **BƯỚC 2: THÊM THÀNH VIÊN VÀO NHÓM** (khi có 1 người) và **BƯỚC 3: GHI SỔ HÓA ĐƠN ĐẦU TIÊN** (khi có từ 2 người).






