-- ====================================================================
-- SPLITMATE SECURITY SHIELD: SUPABASE DATABASE RLS POLICIES
-- ====================================================================
-- Hướng dẫn: Copy toàn bộ nội dung file này và chạy trong mục "SQL Editor"
-- trên Dashboard dự án Supabase của bạn (https://supabase.com).
-- ====================================================================

-- 0. TỰ ĐỘNG KHỞI TẠO BẢNG `invitations` NẾU CHƯA TỒN TẠI TRÊN SUPABASE
CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1. KÍCH HOẠT ROW LEVEL SECURITY (RLS) CHO CÁC BẢNG CỐT LÕI
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- 2. THIẾT LẬP CHÍNH SÁCH CHO BẢNG `groups`
-- Nhóm chỉ được truy cập (SELECT) bởi:
--   a) Chủ sở hữu nhóm (owner_id trùng với auth.uid() của user).
--   b) Thành viên có email hoặc ID nằm trong mảng `members` JSONB.
--   c) Hoặc truy cập thông qua Service Role Key từ Backend (đã được tự động bỏ qua RLS).

-- Policy: Cho phép SELECT đối với Owner và Members của nhóm
CREATE POLICY select_group_policy ON groups
    FOR SELECT
    USING (
        auth.uid()::text = owner_id 
        OR 
        EXISTS (
            SELECT 1 FROM jsonb_array_elements(members) AS member
            WHERE (member->>'uid' = auth.uid()::text OR member->>'email' = auth.jwt()->>'email')
        )
    );

-- Policy: Chỉ cho phép Owner chỉnh sửa (UPDATE) nhóm
CREATE POLICY update_group_policy ON groups
    FOR UPDATE
    USING (auth.uid()::text = owner_id)
    WITH CHECK (auth.uid()::text = owner_id);

-- Policy: Chỉ cho phép Owner xóa (DELETE) nhóm
CREATE POLICY delete_group_policy ON groups
    FOR DELETE
    USING (auth.uid()::text = owner_id);

-- Policy: Cho phép mọi user đã đăng nhập (authenticated) tạo (INSERT) nhóm mới
CREATE POLICY insert_group_policy ON groups
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');


-- 3. THIẾT LẬP CHÍNH SÁCH CHO BẢNG `leaders`
-- Mỗi người dùng (leader) chỉ được đọc và sửa đổi thông tin của chính mình.
CREATE POLICY leader_self_access ON leaders
    FOR ALL
    USING (uid = auth.uid()::text)
    WITH CHECK (uid = auth.uid()::text);


-- 4. THIẾT LẬP CHÍNH SÁCH CHO BẢNG `invitations`
-- Lời mời chỉ được xem bởi người gửi (trùng với owner_id của group) hoặc người nhận (email khớp).
CREATE POLICY invitations_access_policy ON invitations
    FOR ALL
    USING (
        email = auth.jwt()->>'email'
        OR
        EXISTS (
            SELECT 1 FROM groups 
            WHERE groups.id = invitations.group_id AND groups.owner_id = auth.uid()::text
        )
    );

-- 5. KHÓA TUYỆT ĐỐI QUYỀN TRUY CẬP CỦA USER ẨN DANH (ANONYMOUS/ANON)
-- Chặn tuyệt đối mọi thao tác từ user không đăng nhập lên các bảng nhạy cảm
CREATE POLICY deny_anon_all ON groups
    FOR ALL
    TO anon
    USING (false);

CREATE POLICY deny_anon_leaders ON leaders
    FOR ALL
    TO anon
    USING (false);

CREATE POLICY deny_anon_invitations ON invitations
    FOR ALL
    TO anon
    USING (false);

-- ====================================================================
-- HOÀN THÀNH THIẾT LẬP BẢO MẬT DATABASE SHIELD
-- ====================================================================
