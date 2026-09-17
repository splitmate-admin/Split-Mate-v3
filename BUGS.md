# BUGS.md - SPLITMATE BUG TRACKER & ISSUE LOG

## Kiểm tra 17/09/2026: i18n và ngoại tệ

- Đã tránh mất phần lẻ ngoại tệ: parser giữ cents và từ chối số sai định dạng; quy đổi lưu VND nguyên.
- Đã tránh sửa khoản chi theo quote mới: prefill số tiền/tỷ giá từ snapshot; hủy kết quả fetch cũ khi đổi tiền tệ, sửa khoản chi hoặc khóa QR.
- Đã tránh ghi ngoại tệ vào bank deeplink: mọi amount chuyển khoản đi qua quy đổi VND; QR có amount cố định khóa VND.
- Đã tránh OCR điền số tiền VND vào ô ngoại tệ: đặt lại currency khi nhận tổng OCR.
- Đã tránh cấu hình/illustration UI giữ bản dịch cũ khi đổi ngôn ngữ bằng getter; memo thông báo/sao kê phụ thuộc language.
- Tỷ giá tham khảo không phải tỷ giá mua/bán thực tế. Khi API không hoạt động, nhập tỷ giá thủ công; custom split vẫn nhập bằng VND. Đây là phạm vi thiết kế hiện tại.

> File này ghi nhận danh sách các lỗi (bugs), sự cố hệ thống, và lịch sử sửa lỗi trong quá trình phát triển ứng dụng SplitMate.

## 1. DANH SÁCH BUGS ĐANG THEO DÕI (ACTIVE ISSUES)
*Hiện tại không có bug tồn đọng.*

---

## 2. LỊCH SỬ KHẮC PHỤC BUGS (RESOLVED ISSUES)

### [03/09/2026] Loại bỏ AI Khớp Lệnh Tự Động & Khắc phục lỗi Biên lai Đã Duyệt nhưng Không Trừ Nợ
- **Mô tả**: Khi người dùng tải ảnh biên lai chuyển khoản lên Modal QR thanh toán (ví dụ: hoàn tiền 2.000.000đ cho Panh), hệ thống tự động quét AI và khớp lệnh `isAiMatched`, gán nhãn "ĐÃ DUYỆT - AI KHỚP LỆNH ✨". Tuy nhiên, khoản tiền 2.000.000đ không hề được khấu trừ khỏi công nợ (tổng nợ của Panh vẫn giữ nguyên 3.800.000đ), và do trạng thái đã là "Đã duyệt" nên Trưởng nhóm không có cách nào bấm duyệt lại hay xóa biên lai lỗi.
- **Nguyên nhân**:
  1. Trong `handleReceiptUpload` (`SettleUpSection.tsx`), khi `isAiMatched = true`, hệ thống gọi hàm thêm chi tiêu hoàn nợ `handleCreditorSettle` (hoặc `handleDebtorSettle`), nhưng ngay lập tức sau đó lại gọi `onUpdatePendingReceipts([...pendingReceipts, approvedRec])`.
  2. Do state React trong `App.tsx` chưa kịp re-render với khoản chi tiêu mới, `handleUpdatePendingReceipts` đã chụp lấy đối tượng `activeGroup` cũ (chưa có expense hoàn tiền) và ghi đè lên Supabase, làm mất vĩnh viễn khoản chi tiêu vừa tạo.
  3. Tính năng tự động duyệt bằng AI tiềm ẩn rủi ro sai lệch tài chính nếu ảnh mờ, chuyển sai người nhận hoặc scan nhầm số tiền.
- **Giải pháp**:
  1. **Loại bỏ triệt để tính năng AI Khớp Lệnh**: Gỡ bỏ lệnh scan AI tự động duyệt trong `handleReceiptUpload`, gỡ bỏ toàn bộ nhãn/badge `AI KHỚP LỆNH ✨`, đơn giản hóa form upload thành thuần túy lưu trữ chứng từ ảnh chuyển khoản.
  2. **Quy trình duyệt an toàn & nguyên tử**: Khi upload ảnh biên lai, biên lai luôn được lưu ở trạng thái `pending` (Chờ duyệt). Trưởng nhóm kiểm tra thực tế và bấm **"Duyệt biên lai"** (`handleApproveReceipt`), kích hoạt `onBatchSettleAndReceipt` ghi đồng thời cả khoản chi tiêu hoàn tiền lẫn cập nhật trạng thái biên lai trong cùng 1 transaction nguyên tử, đảm bảo số dư công nợ được trừ chính xác 100%.
  3. **Cung cấp công cụ xử lý cho Trưởng nhóm**:
     - Bổ sung nút **Xóa biên lai (Trash2)** cho Trưởng nhóm đối với mọi biên lai (chờ duyệt, đã duyệt, từ chối).
     - Đối với các biên lai đã duyệt nhưng bị kẹt chưa trừ nợ trước đây: Bổ sung nút **"Khấu trừ công nợ"** (tạo giao dịch trừ nợ ngay lập tức) và nút **"Chuyển về Chờ duyệt"** (để Trưởng nhóm duyệt lại chuẩn xác).
- **Trạng thái**: ✅ Fixed & Verified.


### [28/08/2026] Triển khai Cơ chế Giữ Hoạt Động (Keep-Alive) cho Supabase Free Tier chống Pause sau 7 ngày
- **Mô tả**: Dự án sử dụng Supabase gói miễn phí (Free Tier) có thể tự động chuyển sang trạng thái tạm dừng (Paused) nếu sau 7 ngày liên tiếp không có truy vấn người dùng, khiến ứng dụng gặp lỗi kết nối và cần khôi phục thủ công trên dashboard.
- **Nguyên nhân**: Cơ chế scale-to-zero tự động của Supabase đối với các dự án Free Tier không có traffic API trong 7 ngày.
- **Giải pháp**:
  1. Xây dựng endpoint `/api/health` và `/api/keep-alive` trên backend Express (`api/api-app.ts`), thực thi câu lệnh SQL/REST siêu nhẹ (`head count` hoặc `limit 1` vào bảng `groups` / `leaders`).
  2. Tạo GitHub Actions Workflow (`.github/workflows/supabase-keep-alive.yml`) chạy tự động mỗi 2 ngày lúc 04:00 UTC (11:00 AM giờ VN) để ping API SplitMate và query trực tiếp Supabase REST API.
  3. Hỗ trợ trigger thủ công qua tab GitHub Actions (`workflow_dispatch`).
- **Trạng thái**: ✅ Fixed & Verified.

### [25/08/2026] Tối ưu hóa kích thước và trải nghiệm lịch chọn ngày (Calendar Popover) trên Mobile
- **Mô tả**: Hộp lịch chọn ngày phát sinh chi tiêu trong `ExpenseForm.tsx` bị bó hẹp trong cột ngày (width ~150px), làm tiêu đề tháng bị ép sát và các ô ngày quá nhỏ (`h-7 w-7`), gây khó khăn khi thao tác chạm bấm trên điện thoại di động.
- **Nguyên nhân**: Class định vị `absolute left-0 right-0` kế thừa chiều rộng bị chia đôi của cột ngày trong layout 2 cột (`grid-cols-2`).
- **Giải pháp**:
  1. Mở rộng kích thước khung lịch lên chuẩn **`w-[300px] sm:w-[330px] max-w-[calc(100vw-36px)]`** và định vị neo `right-0 top-full` để bung rộng thoải mái trên giao diện di động.
  2. Tăng kích thước ô ngày lên **`h-8 w-8 sm:h-9 sm:w-9`** với font chữ to rõ, bo góc `rounded-xl`, tăng độ tương phản và hiệu ứng nhấn active mượt mà.
  3. Bổ sung 2 phím tắt chọn nhanh 1 chạm: **`[ Hôm nay ]`** và **`[ Hôm qua ]`** giúp tiết kiệm tối đa thời gian nhập liệu.
  4. Tối ưu nút điều hướng chuyển tháng với vùng bấm rộng rãi `h-8 w-8` chống bấm nhầm.
- **Trạng thái**: ✅ Fixed & Verified.

### [18/08/2026] Khắc phục lỗi 'Mã truy cập không chính xác hoặc nhóm đã bị xóa trực tuyến' sau khi Xóa tài khoản vĩnh viễn
- **Mô tả**: Sau khi thành viên thực hiện xóa vĩnh viễn tài khoản và được hệ thống cấp mã 6 chữ số mới (ví dụ mã `R7PRU7`), khi dùng mã này để đăng nhập vào nhóm thì bị báo lỗi *"Mã truy cập không chính xác hoặc nhóm đã bị xóa trực tuyến."*.
- **Nguyên nhân**:
  1. Trong `/api/user/delete-account`, khi giải phóng email và sinh mã truy cập mới cho thành viên, mảng `memberAccessCodes` của nhóm chưa được tính toán lại từ mảng `grp.members` trước khi gọi `supabaseSaveGroup(grp)`, khiến cơ sở dữ liệu Supabase vẫn giữ danh sách mã cũ.
  2. Trong hàm `supabaseGetGroupByMemberAccessCode`, hệ thống trước đó chỉ lọc qua cột `memberAccessCodes` hoặc so sánh mảng `g.memberAccessCodes`, mà không duyệt qua từng phần tử `m.accessCode` trong mảng `members`.
  3. Hàm `supabaseGetGroupsByOwnerOrEmail` trước đó sử dụng filter trên cột `members` có thể bị lỗi schema cache trên một số cấu hình bảng Supabase.
- **Giải pháp**:
  1. Cập nhật `supabaseSaveGroup`: Luôn tự động trích xuất toàn bộ `accessCode` từ `cleanGroup.members` và hợp nhất vào `cleanGroup.memberAccessCodes` cũng như `dataGroup.memberAccessCodes` trước khi upsert lên Supabase.
  2. Nâng cấp `supabaseGetGroupByMemberAccessCode`: Duyệt qua các dòng và so sánh trực tiếp cả `m.accessCode` của từng thành viên lẫn mảng `memberAccessCodes` (chuẩn hóa `trim().toUpperCase()`).
  3. Cập nhật `/api/member/login`: Đồng bộ logic tìm kiếm nhóm và thành viên theo mã truy cập không phân biệt hoa thường.
  4. Cập nhật `/api/user/delete-account`: Sinh mã 6 ký tự sạch (từ bộ ký tự chữ cái + số dễ đọc), đồng bộ `grp.memberAccessCodes` và lưu đầy đủ lên Supabase / Local DB.
- **Trạng thái**: ✅ Fixed & Verified.

### [17/08/2026] Khắc phục nút 'Xóa tài khoản vĩnh viễn' không phản hồi khi đăng nhập bằng Mã truy cập thành viên
- **Mô tả**: Thành viên đăng nhập bằng mã truy cập 6 ký tự sau khi cập nhật liên kết Gmail thành công, nhấn vào nút "Xóa tài khoản vĩnh viễn" trong Drawer cá nhân thì không có bất kỳ phản hồi hoặc popup nào xuất hiện.
- **Nguyên nhân**: Hàm `handleDeleteAccount` trong `SmartHeader.tsx` kiểm tra điều kiện cứng `if (!user?.email) return;`. Do thành viên đăng nhập bằng mã truy cập (không qua auth form thủ quỹ) nên `user` bị null, làm hàm return ngay lập tức. Đồng thời Drawer cá nhân chưa được đóng trước khi gọi hộp thoại xác nhận gây xung đột stacking context trên mobile.
- **Giải pháp**:
  1. Cập nhật `handleDeleteAccount` trích xuất email mục tiêu linh hoạt từ `targetEmail = user?.email || effectiveMember?.email`.
  2. Tự động đóng Drawer cá nhân (`setShowPersonalDrawer(false)`) trước khi kích hoạt `askConfirm` để hộp thoại cảnh báo nguy hiểm hiển thị nổi bật và chuẩn xác ở giữa màn hình.
  3. Gửi `targetEmail` tới `/api/user/delete-account` để xóa hồ sơ và giải phóng email thành công.
- **Trạng thái**: ✅ Fixed & Verified.

### [17/08/2026] Luồng Xác thực Email OTP 6 số cho Thành viên & Giải phóng Email khi Xóa Tài khoản
- **Mô tả**: Thành viên tham gia nhóm qua Mã truy cập (Access Code) khi tự thêm Email có thể điền sai email hoặc liên kết phải email đã thuộc về tài khoản khác. Ngoài ra, khi một tài khoản bị xóa vĩnh viễn, email cũ không được gỡ khỏi thành viên ở các nhóm làm email đó bị kẹt không thể tái sử dụng.
- **Nguyên nhân**: API `/api/member/update-info` chưa yêu cầu xác thực OTP 6 số khi thành viên liên kết email mới. API `/api/user/delete-account` chỉ xóa dữ liệu leader và các nhóm do leader sở hữu, chưa duyệt giải phóng email khỏi mảng `members` ở các nhóm khác.
- **Giải pháp**:
  1. Thêm API `/api/member/send-otp` gửi mã OTP 6 chữ số kèm giới hạn cooldown 60s và đếm số lần gửi.
  2. Bổ sung khung nhập mã OTP 6 số và nút "📩 Gửi mã OTP" trong Drawer Hồ sơ Cá nhân (`SmartHeader.tsx`).
  3. Cập nhật `/api/member/update-info`: Kiểm tra trùng lặp email với tài khoản khác, bắt buộc xác thực chính xác mã OTP 6 số thì mới đính kèm `emailVerified: true` và khóa cố định email.
  4. Cập nhật `/api/user/delete-account`: Tự động giải phóng email (`email: undefined`, `emailVerified: false`, khởi tạo `accessCode` ngẫu nhiên mới) khỏi thành viên ở tất cả các nhóm còn lại.
- **Trạng thái**: ✅ Fixed & Verified.

### [17/08/2026] Loại bỏ nhãn nhấp nháy 'Bấm vào đây để chia tiền ngay' & hiệu ứng pulse trên thẻ nhóm
- **Mô tả**: Khi người dùng có nhiều nhóm mới hoặc vừa quyết toán, các thẻ nhóm đều đồng loạt hiển thị nhãn bay nhấp nháy `"✨ Bấm vào đây để chia tiền ngay!"` và viền chớp sáng `animate-pulse`, gây rối mắt và làm mất vẻ tinh tế của giao diện.
- **Nguyên nhân**: Thẻ nhóm trong `App.tsx` áp dụng điều kiện `isNewGroup` để render badge `animate-bounce` và class `animate-pulse` trên mọi nhóm chưa phát sinh chi tiêu.
- **Giải pháp**:
  1. Loại bỏ badge bay `animate-bounce` và icon xoay `animate-spin` trên các thẻ nhóm.
  2. Xóa bỏ lớp `animate-pulse` trên viền thẻ nhóm.
  3. Giữ trọn giao diện danh sách nhóm phẳng, sạch sẽ, chuẩn FinTech tối giản.
- **Trạng thái**: ✅ Fixed & Verified.

### [13/08/2026] Tách biệt Đổi Tên / Avatar với Thiết lập Mật khẩu (Không ép buộc mật khẩu khi sửa hồ sơ)
- **Mô tả**: Khi người dùng vào sửa ảnh đại diện (avatar), tên hiển thị hoặc thông tin tài khoản, hệ thống hiển thị thông báo popup *"Cần mật khẩu - Vui lòng nhập mật khẩu để khởi tạo/liên kết tài khoản đăng nhập bằng Email"* và không cho lưu.
- **Nguyên nhân**: Trong hàm `handleSaveProfile` (`SmartHeader.tsx`), điều kiện kiểm tra mật khẩu bị kích hoạt nhầm khi trường email có dữ liệu, khiến việc sửa tên/avatar bị chặn nếu không điền mật khẩu.
- **Giải pháp**:
  1. Gỡ bỏ hoàn toàn điều kiện bắt buộc mật khẩu khi lưu hồ sơ cá nhân (`handleSaveProfile` & `handleSaveEditSelf`). Thiết lập Mật khẩu trở thành tùy chọn (`optional`).
  2. Người dùng chỉ cần chọn ảnh, nhập tên rồi bấm **Lưu** là thông tin được cập nhật tức thì.
  3. Chỉ kiểm tra mật khẩu (độ dài >= 4 ký tự, trùng khớp xác nhận) khi người dùng chủ động điền mật khẩu vào ô.
- **Trạng thái**: ✅ Fixed & Verified.

### [13/08/2026] Tối ưu hóa Luồng Nhập Email & Mật Khẩu Đăng Nhập cho Thành viên (Loại bỏ phụ thuộc Email xác thực)
- **Mô tả**: Thành viên tự thêm/sửa email trong mục thông tin cá nhân nhưng không nhận được email gửi về hộp thư, gây thắc mắc về luồng kích hoạt/đăng nhập.
- **Nguyên nhân**: Ứng dụng hoạt động ở chế độ serverless/mock khi chưa cấu hình SMTP bên ngoài. Đồng thời giao diện chưa thể hiện rõ việc tài khoản và mật khẩu được tạo và liên kết trực tiếp vào database ngay khi lưu mà không bắt buộc chờ link xác nhận qua email.
- **Giải pháp**:
  1. Tích hợp trực tiếp trường **Thiết lập Mật khẩu mới** và **Xác nhận Mật khẩu** trong cả Drawer Hồ sơ Cá nhân (`SmartHeader.tsx`) và Form Sửa Thông Tin Thành Viên (`ParticipationSection.tsx`).
  2. Bổ sung nhãn hướng dẫn trực quan: *"💡 Nhập email & đặt mật khẩu để đăng nhập trực tiếp từ mọi thiết bị mà không cần chờ email xác thực."*
  3. Cập nhật backend `api/api-app.ts` (`/api/member/update-info` và `/api/user/invite-email`) lưu trữ hash mật khẩu bằng `bcrypt` và phản hồi trạng thái xác thực rõ ràng.
- **Trạng thái**: ✅ Fixed & Verified.

### [01/08/2026] Lỗi Supabase saveGroup "Could not find the 'allow_member_add_expense' column of 'groups' in the schema cache"
- **Mô tả**: Khi lưu dữ liệu nhóm qua API `POST /api/groups`, server trả về lỗi `Dữ liệu Supabase lưu thất bại: Could not find the 'allow_member_add_expense' column of 'groups' in the schema cache` khiến việc lưu lên server thất bại và app phải chuyển sang lưu backup cục bộ.
- **Nguyên nhân**: Trong `api/api-app.ts`, thuộc tính `allow_member_add_expense` và `allowMemberAddExpense` bị gán trực tiếp vào top-level object `upsertPayload` khi lưu lên Supabase `groups`. Vì bảng `groups` sử dụng cấu hình lưu trữ `data` JSON (hoặc bảng phẳng không có cột tên `allow_member_add_expense`), Supabase Postgres từ chối lưu và báo lỗi thiếu cột trong schema cache.
- **Giải pháp**:
  1. Xây dựng hàm kiểm tra cột động `checkGroupsSchemaAllowMemberAddExpenseColumns()` và cache kết quả trong `getAllowMemberAddExpenseCol()`.
  2. Cập nhật `supabaseSaveGroup`: Chỉ đính kèm `allow_member_add_expense` hoặc `allowMemberAddExpense` ở top-level `upsertPayload` khi cột đó thực sự tồn tại trên database Supabase.
  3. Giá trị `allowMemberAddExpense` luôn được đóng gói đầy đủ và an toàn bên trong đối tượng JSON `dataGroup` (cột `data`) cũng như đối tượng `packedExpenses` của bảng phẳng, đảm bảo cài đặt luôn được bảo toàn 100% dù database có hay không có cột riêng.
  4. Cập nhật các câu lệnh `.select()` ở dạng bảng phẳng để chỉ truy vấn `allow_member_add_expense` / `allowMemberAddExpense` khi cột tồn tại.
- **Trạng thái**: ✅ Fixed & Verified (Lưu thành công 100% trên Supabase mà không phát sinh bất kỳ lỗi schema cache nào).

### [01/08/2026] Mất dữ liệu lịch sử Chốt Sổ (billingCycles) khi tải lại trang (Reload)
- **Mô tả**: Sau khi bấm Chốt Sổ (Close Cycle), kỳ lưu trữ được tạo thành công nhưng sau khi người dùng tải lại trang (reload/refresh app), danh sách lịch sử kỳ chốt sổ `billingCycles` bị trống.
- **Nguyên nhân**: Trong backend `api/api-app.ts`, hàm `unpackGroupRow` cũng như các hàm lấy dữ liệu nhóm từ Supabase Database (`supabaseGetGroupsByOwnerOrEmail`, `supabaseGetGroupById`, `supabaseGetGroupByMemberAccessCode`) chưa trích xuất thuộc tính `billing_cycles` / `billingCycles` từ database row và `packedExpenses`. Khi lưu nhóm bằng `supabaseSaveGroup`, nếu bảng `groups` có cột `billing_cycles` thì giá trị không được ghi vào payload, hoặc nếu lưu dưới dạng `data` JSONB thì bị bỏ sót khi đọc lại.
- **Giải pháp**:
  1. Thêm helper `checkGroupsSchemaBillingCyclesColumns()` và `hasBillingCyclesColumns()` để phát hiện động sự tồn tại của cột `billing_cycles` trên Supabase Database.
  2. Cập nhật `unpackGroupRow` để giải nén mảng `billing_cycles` từ database row (chuỗi JSON hoặc mảng) cũng như từ đối tượng `packedExpenses` của bảng phẳng.
  3. Cập nhật `supabaseGetGroupsByOwnerOrEmail`, `supabaseGetGroupById`, và `supabaseGetGroupByMemberAccessCode` để đọc và đính kèm `billingCycles` vào đối tượng `Group`.
  4. Cập nhật `supabaseSaveGroup` để lưu trữ đồng bộ `billing_cycles` vào cột (nếu cột tồn tại) hoặc vào JSON `dataGroup.billingCycles` / `packedExpenses` nếu dùng bảng phẳng.
  5. Cung cấp câu lệnh SQL tùy chọn nếu người dùng muốn khởi tạo cột `billing_cycles` trên Supabase: `ALTER TABLE groups ADD COLUMN IF NOT EXISTS billing_cycles JSONB DEFAULT '[]'::jsonb;`.
- **Trạng thái**: ✅ Fixed & Verified (Hoạt động mượt mà 100%, không xảy ra lỗi Internal Error).

### [31/07/2026] Khắc phục lỗi không chuyển được sang Chế độ xem Thành viên & Chặt chẽ phân quyền Cài đặt nhóm
- **Mô tả**: 
  1. Trưởng nhóm bấm nút "Chuyển sang Chế Độ Thành Viên (Xem)" nhưng giao diện lập tức bị reset trở lại vai trò Trưởng nhóm.
  2. Thành viên đăng nhập vẫn nhìn thấy nút Cài đặt nhóm ⚙️, nút sửa tên nhóm inline, và có thể bật/tắt hoặc chỉnh sửa cài đặt nhóm.
- **Nguyên nhân**:
  1. Trong `App.tsx`, một `useEffect` tự động đồng bộ `isAdmin` có chứa `isAdmin` trong dependency array và gọi `setIsAdmin(activeGroup.ownerId === user.uid)` liên tục, đè lại thao tác chuyển vai trò thủ công của Trưởng nhóm.
  2. Trong `SmartHeader.tsx` và `App.tsx`, các nút bấm mở Cài đặt nhóm, nút Cấu hình STK Quỹ Nhóm và nút sửa tên nhóm inline chưa được bọc điều kiện kiểm tra `isAdmin`, đồng thời hàm `handleSaveGroupSettings` chưa chặn quyền với tài khoản Thành viên.
- **Giải pháp**:
  1. Loại bỏ logic re-sync `isAdmin` bị lặp trong `useEffect` ở `App.tsx`, cho phép Trưởng nhóm chủ động chuyển sang xem giao diện dưới vai trò Thành viên và chuyển trở lại vai trò Trưởng nhóm mượt mà.
  2. Bọc toàn bộ các nút bấm Cài đặt nhóm, nút Cấu hình STK Quỹ và nút sửa tên nhóm inline bằng điều kiện `{isAdmin && (...)}`.
  3. Bổ sung kiểm tra `if (!isAdmin)` ở tất cả các hàm cập nhật cấu hình nhóm (`handleSaveGroupSettings`, `handleSaveGroupName`, và `open-group-settings` event listener), đảm bảo chỉ duy nhất Trưởng nhóm mới có thể chỉnh sửa thông tin và phân quyền của nhóm.
- **Trạng thái**: ✅ Fixed & Verified.

### [31/07/2026] Tinh gọn giao diện: Lược bỏ các nhãn sub-headline/eyebrow dư thừa
- **Mô tả**: Giao diện hiển thị các dòng nhãn phụ nhỏ in hoa (eyebrow label) như "LƯU TRỮ & THỐNG KÊ", "KỲ HOẠT ĐỘNG HIỆN TẠI" ngay trên các tiêu đề chính, gây rườm rà không cần thiết.
- **Giải pháp**: Đã loại bỏ các sub-headline nhỏ phía trên tiêu đề chính trong `CloseCycleSection.tsx`, giữ nguyên tiêu đề "Chốt Sổ & Lưu Trữ" và "Kỳ Hiện Tại" nổi bật, rõ ràng.
- **Trạng thái**: ✅ Fixed & Verified.

### [31/07/2026] Thẻ nhóm có hóa đơn vẫn bị nhấp nháy badge "Bấm vào đây để chia tiền ngay!"
- **Mô tả**: Nhóm đã khởi tạo và có đầy đủ các khoản hóa đơn chi tiêu nhưng vẫn xuất hiện huy hiệu nhấp nháy "Bấm vào đây để chia tiền ngay!" đè lên thẻ nhóm.
- **Nguyên nhân**: Ràng buộc render badge gợi ý tại `App.tsx` sử dụng biểu thức `(isActive || isNewGroup)`. Điều này khiến bất kỳ nhóm nào đang ở trạng thái active đều bị hiển thị badge dù đã có danh sách hóa đơn `expenses`.
- **Giải pháp**: Điều chỉnh biểu thức render thành `isNewGroup` (`!group.expenses || group.expenses.length === 0`). Badge gợi ý chỉ hiển thị cho nhóm mới khởi tạo chưa có hóa đơn, và tự động ẩn hoàn toàn khi nhóm đã phát sinh chi tiêu.
- **Trạng thái**: ✅ Fixed & Verified.

### [31/07/2026] Không thể bật quyền thêm & sửa chi tiêu cho thành viên (Và lỗi race condition khi nhấn lưu liền)
- **Mô tả**: Khi Trưởng nhóm bật công tắc "Thành viên được thêm & sửa chi tiêu" -> bấm lưu ngay lập tức, cấu hình bị đè bởi API request song song gây mất trạng thái.
- **Nguyên nhân**:
  1. Trong `api/api-app.ts`, hàm `unpackGroupRow` kiểm tra thuộc tính phẳng bằng biểu thức cứng `row.allowMemberAddExpense === "true" || row.allowMemberAddExpense === true`. Khi giá trị từ Supabase trả về dạng boolean hoặc chưa được set ở bảng phẳng, biểu thức này bị evaluate thành `false`.
  2. Hàm `supabaseSaveGroup` trước đây chưa lưu trường `allowMemberAddExpense` (và `allow_member_add_expense`) vào cả cột JSON `data` và payload upsert.
  3. `SmartHeader.tsx` khi submit form cài đặt gọi 2 hàm `onUpdateGroup` và `onUpdateGroupConfig` nối tiếp nhau tạo ra 2 HTTP POST request riêng biệt đè dữ liệu cũ lên dữ liệu mới vừa cập nhật.
- **Giải pháp**:
  1. Cập nhật `unpackGroupRow`, `supabaseGetGroupsByOwnerOrEmail` và `supabaseGetGroupById` trong `api/api-app.ts` để đọc và xử lý `allowMemberAddExpense` an toàn (mặc định là `true` nếu chưa định nghĩa và giữ đúng boolean `true`/`false` do Trưởng nhóm chọn).
  2. Cập nhật `supabaseSaveGroup` lưu đồng bộ `allowMemberAddExpense` và `allow_member_add_expense` vào Supabase Database.
  3. Gộp cập nhật thông tin nhóm và cấu hình quỹ ngân hàng trong `SmartHeader.tsx` thành đúng 1 request `onUpdateGroup` duy nhất, loại bỏ hoàn toàn hiện tượng race condition khi gạt công tắc và bấm nút "Lưu thay đổi" ngay lập tức.
- **Trạng thái**: ✅ Fixed & Verified.

### [30/07/2026] Trùng lặp BƯỚC 1 khi nhóm đã tồn tại
- **Mô tả**: Thẻ "BƯỚC 1: TẠO NHÓM CỦA BẠN" xuất hiện đè lên giao diện ngay cả khi nhóm đã được khởi tạo (ví dụ nhóm "Phú Quốc").
- **Nguyên nhân**: Điều kiện kiểm tra `groups.length <= 1` khiến người dùng có 1 nhóm vẫn bị hiển thị thẻ khởi tạo nhóm.
- **Giải pháp**: Đã sửa điều kiện thành `groups.length === 0` ở trang Tổng quan.
- **Trạng thái**: ✅ Fixed & Verified.

### [16/09/2026] Khắc phục triệt để lỗi Supabase bị khóa (Paused) sau 7 ngày không phát sinh dữ liệu
- **Mô tả**: Supabase Free Tier tự động bị tạm dừng (Paused) sau 7 ngày nếu không có tương tác người dùng, khiến ứng dụng mất kết nối database. Dù trước đó có GitHub Actions, workflow vẫn có thể bị dừng do chính sách tắt Scheduled Actions sau 60 ngày của GitHub hoặc thiếu Secrets URL.
- **Nguyên nhân**:
  1. GitHub tự động vô hiệu hóa scheduled cron nếu repository không có commit trong 60 ngày.
  2. Chưa cấu hình Vercel Cron trực tiếp trong `vercel.json` khi deploy trên Vercel.
  3. Truy vấn `head count` cũ chưa tải dữ liệu hàng thực tế để kích hoạt sâu PostgREST và database engine của Supabase.
- **Giải pháp**:
  1. **Tích hợp Vercel Cron vào `vercel.json`**: Cấu hình `crons` chạy mỗi ngày (`0 4 * * *`) gọi `/api/keep-alive` trực tiếp trên hạ tầng Vercel vĩnh viễn, không lo bị tắt sau 60 ngày.
  2. **Tối ưu hóa Endpoint `/api/keep-alive`**: Nâng cấp truy vấn sang `.select("id").limit(1)` trực tiếp vào bảng `groups` (hoặc `leaders`), đảm bảo 100% kích hoạt I/O và active state của Supabase.
  3. **Nâng cấp GitHub Actions Workflow**: Đổi lịch chạy thành hàng ngày (`0 4 * * *`) và bổ sung hướng dẫn chạy thủ công hoặc kích hoạt lại khi cần.
- **Trạng thái**: ✅ Fixed & Verified.

### [16/09/2026] Đồng bộ Từ điển Song ngữ i18n & Khắc phục lỗi TypeScript Type Missing Keys
- **Mô tả**: Quá trình kiểm tra kiểu dữ liệu tĩnh (`tsc --noEmit`) phát hiện 10 lỗi cảnh báo thiếu `TranslationKey` trong từ điển `src/utils/i18n.ts` được gọi từ `ExpenseForm.tsx` và `SettleUpSection.tsx` (như `save_expense_changes`, `submit_expense`, `statement_banner_title`, `view_statement_btn`, `settle_up_title`, `all_settled_title`,...).
- **Nguyên nhân**: Khi bổ sung hỗ trợ đa ngôn ngữ cho form nhập chi tiêu và màn hình tất toán, các khóa dịch chưa được khai báo đồng bộ vào cả 2 đối tượng từ điển `vi` và `en` trong `i18n.ts`.
- **Giải pháp**:
  1. Bổ sung đầy đủ các cặp key-value tương ứng cho cả Tiếng Việt và Tiếng Anh trong `src/utils/i18n.ts`.
  2. Kiểm tra `lint_applet` (`tsc --noEmit`) và `compile_applet` đều chạy thành công 100% không còn bất kỳ lỗi nào.
- **Trạng thái**: ✅ Fixed & Verified.


Integration: retained the 2026-09-17 keep-alive fixes; the complete VI/EN/zh-CN provider and VND-backed FX entry supersede the earlier partial i18n/group-currency display implementation. Existing raw expense amounts are not reinterpreted or migrated.
