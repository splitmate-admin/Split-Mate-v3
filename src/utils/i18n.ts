import React from "react";

export type Language = 'vi' | 'en';

export type Currency = 'VND' | 'USD' | 'EUR' | 'JPY' | 'KRW' | 'THB' | 'SGD';

export interface CurrencyConfig {
  code: Currency;
  name: string;
  symbol: string;
  decimals: number;
  position: 'before' | 'after';
  flag: string;
}

export const SUPPORTED_CURRENCIES: Record<Currency, CurrencyConfig> = {
  VND: { code: 'VND', name: 'Việt Nam Đồng', symbol: '₫', decimals: 0, position: 'after', flag: '🇻🇳' },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, position: 'before', flag: '🇺🇸' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, position: 'after', flag: '🇪🇺' },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0, position: 'before', flag: '🇯🇵' },
  KRW: { code: 'KRW', name: 'Korean Won', symbol: '₩', decimals: 0, position: 'before', flag: '🇰🇷' },
  THB: { code: 'THB', name: 'Thai Baht', symbol: '฿', decimals: 0, position: 'after', flag: '🇹🇭' },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2, position: 'before', flag: '🇸🇬' },
};

export const translations = {
  vi: {
    // Navigation / Tabs
    tab_expenses: "Ghi chép chi tiêu",
    tab_expenses_short: "Chi tiêu",
    tab_settle: "Trả nợ & Quyết toán",
    tab_settle_short: "Trả nợ",
    tab_participation: "Chốt Sổ & Lưu Trữ",
    tab_participation_short: "Chốt sổ",
    tab_fund: "Quỹ nhóm",
    tab_stats: "Thống kê",
    tab_members: "Thành viên",
    
    // Actions & Buttons
    add_expense: "Thêm chi tiêu",
    scan_bill: "Quét hoá đơn",
    settle_up: "Tất toán ngay",
    export_excel: "Xuất Excel",
    export_pdf: "Xuất PDF",
    share_report: "Chia sẻ báo cáo",
    close_cycle: "Chốt sổ & Lưu trữ",
    save: "Lưu",
    cancel: "Hủy bỏ",
    confirm: "Xác nhận",
    delete: "Xóa",
    edit: "Chỉnh sửa",
    close: "Đóng",
    copy: "Sao chép",
    copied: "Đã sao chép!",
    upgrade: "Nâng cấp",
    view_as_member: "Xem thử giao diện Thành viên",
    back_to_admin: "Quay lại vai trò Trưởng nhóm",
    
    // Group & Currency
    group_settings: "Cài đặt nhóm",
    group_name: "Tên nhóm",
    currency: "Tiền tệ",
    select_currency: "Chọn đơn vị tiền tệ",
    create_group: "Tạo nhóm mới",
    switch_group: "Đổi nhóm",
    language: "Ngôn ngữ",
    vietnamese: "🇻🇳 Tiếng Việt",
    english: "🇬🇧 English",
    group_members: "thành viên",
    group_plan_free: "Free 🌱",
    group_plan_be_ban: "Bè Bạn ⭐",
    group_plan_hoi_lang: "Hội Làng 👑",
    group_plan_du_hi: "Du Hí 🚗",

    // Categories
    cat_all: "Tất cả",
    cat_food: "Ăn uống",
    cat_transport: "Xe cộ",
    cat_shopping: "Mua sắm",
    cat_hotel: "Chỗ ở",
    cat_entertainment: "Vui chơi",
    cat_other: "Khác",
    
    // Status
    status_pending: "Chờ duyệt",
    status_approved: "Đã duyệt",
    status_rejected: "Từ chối",
    
    // Settlement & Balance
    total_spent: "Tổng chi tiêu",
    fund_balance: "Số dư quỹ",
    you_owe: "Bạn nợ",
    you_are_owed: "Bạn được nhận",
    all_settled: "Mọi khoản đã được tất toán!",
    settlement_overview: "Tổng quan phân bổ",
    debtor_section: "Thành viên cần nộp tiền vào quỹ",
    creditor_section: "Thành viên cần nhận lại tiền từ quỹ",
    pay_fund: "Nộp Quỹ",
    refund: "Hoàn Tiền",
    fund_history: "Lịch sử quỹ",
    unsettled_bills: "Hóa đơn chưa chốt",
    total_expenses: "Tổng chi phí",
    average_per_person: "Trung bình / người",
    current_fund_balance: "Dư quỹ hiện tại",
    
    // Receipts
    receipt_upload: "Tải ảnh biên lai chuyển khoản",
    receipt_upload_sub: "Lưu ảnh chụp màn hình chuyển khoản để đối soát công nợ",
    receipt_list: "Danh sách chứng từ đối soát",
    approve_receipt: "Duyệt biên lai",
    reject_receipt: "Từ chối",
    reopen_receipt: "Chuyển về Chờ duyệt",
    deduct_debt: "Khấu trừ công nợ",
    
    // Common
    today: "Hôm nay",
    yesterday: "Hôm qua",
    note: "Ghi chú",
    amount: "Số tiền",
    payer: "Người trả tiền",
    participants: "Người tham gia",
    date: "Ngày",
    search: "Tìm kiếm...",
    filter: "Lọc",
    clear_filter: "Xóa lọc",
    no_expenses: "Chưa có hóa đơn nào",
    create_first_expense: "Hãy tạo hoặc quét hóa đơn đầu tiên!",
    logout: "Đăng xuất",
    personal_info: "Hồ sơ cá nhân",
    my_account: "Tài khoản của tôi",
    security_portal: "Cổng bảo mật",
    sync_offline: "Lưu ngoại tuyến",
    save_settings: "Lưu cài đặt",
    member_permissions: "Phân quyền thành viên",
    allow_member_add: "Thành viên được thêm & sửa chi tiêu",

    // Expense Form
    create_expense_title: "Thêm chi tiêu mới",
    edit_expense_title: "Chỉnh sửa chi tiêu",
    expense_name_placeholder: "Vd: Ăn lẩu Haidilao, Taxi về khách sạn...",
    expense_amount_placeholder: "0",
    who_paid: "Ai là người trả trước?",
    split_method: "Cách chia tiền",
    split_equally: "Chia đều tất cả",
    split_custom: "Chia tùy chỉnh",
    split_exact: "Chia theo số tiền",
    select_all_members: "Chọn tất cả",
    deselect_all: "Bỏ chọn tất cả",
    attach_receipt_photo: "Đính kèm ảnh hóa đơn",
    change_receipt_photo: "Đổi ảnh hóa đơn",
    delete_receipt_photo: "Xóa ảnh",
    save_expense_btn: "Lưu khoản chi tiêu",
    save_expense_changes: "Lưu thay đổi chi tiêu",
    submit_expense: "Lưu khoản chi tiêu",
    update_expense_btn: "Cập nhật chi tiêu",
    adding_expense: "Đang lưu...",
    expense_category: "Danh mục chi tiêu",
    expense_date: "Ngày phát sinh",
    time_optional: "Giờ (tùy chọn)",

    // Settlement & Debt
    statement_banner_title: "Báo Cáo Quyết Toán & Sao Kê Cá Nhân",
    statement_banner_desc: "Xem chi tiết tổng chi, số tiền cần trả/nhận và danh sách giao dịch",
    view_statement_btn: "Xem sao kê của tôi",
    direct_debt_offset: "Cấn trừ nợ trực tiếp",
    settle_up_title: "Các khoản cần tất toán",
    all_settled_title: "Đã tất toán toàn bộ công nợ",
    all_settled_desc: "Tất cả các thành viên trong nhóm đã hoàn thành nghĩa vụ thanh toán.",
    confirm_payment_btn: "Xác nhận đã nộp quỹ",
    debt_offset_history: "Lịch sử cấn trừ công nợ",
    no_debts_to_settle: "Tuyệt vời! Tất cả thành viên đã cân bằng công nợ.",
    qr_payment_guide: "Quét mã VietQR để chuyển khoản chính xác",
    bank_account_info: "Thông tin tài khoản thụ hưởng",
    bank_name: "Ngân hàng",
    account_number: "Số tài khoản",
    account_holder: "Chủ tài khoản",
    transfer_content: "Nội dung chuyển khoản",
    confirm_settle_btn: "Xác nhận đã thanh toán",
    upload_transfer_proof: "Tải ảnh chuyển khoản thành công",
    personal_statement: "Sao kê cá nhân",
    view_personal_statement: "Xem sao kê của tôi",

    // Close Cycle
    close_cycle_desc: "Chốt toàn bộ hóa đơn hiện tại để bắt đầu một kỳ chi tiêu mới",
    current_active_cycle: "Kỳ chi tiêu hiện tại",
    archived_cycles_history: "Lịch sử các kỳ đã chốt sổ",
    confirm_close_cycle: "Xác nhận chốt sổ kỳ này",
    cycle_name: "Tên kỳ (Vd: Chuyến đi Đà Lạt T8/2026)",
    cycle_closed_success: "Chốt sổ thành công!",
    no_archived_cycles: "Chưa có kỳ nào được lưu trữ",

    // Dashboard & Overview
    tab_overview: "Tổng quan",
    distribution_overview: "TỔNG QUAN PHÂN BỔ",
    avg_per_person: "Bình quân/Người",
    current_fund_balance_label: "Dư quỹ hiện tại:",
    top_spender_title: "Đại gia chi tiêu",
    top_spender_spent: "chi nhiều nhất:",
    active_comer_title: "Chơi nhiệt huyết",
    active_comer_used: "dùng thực tế:",
    quick_actions: "Thao tác nhanh",
    statement_report: "Báo cáo Quyết toán",
    one_time_mode_badge: "Xài 1 lần",
    plan_label_free: "Gói Free",
    plan_label_be_ban: "Gói Bè Bạn",
    plan_label_hoi_lang: "Gói Hội Làng",
    plan_label_du_hi: "Gói Du Hí",

    // Expense List
    search_placeholder_expenses: "Tìm theo tên món, người chi, số tiền...",
    filter_date: "Ngày",
    filter_payer: "Người chi",
    filter_all_payers: "Tất cả người chi",
    sort_by: "Sắp xếp",
    sort_newest: "Mới nhất",
    sort_oldest: "Cũ nhất",
    sort_highest: "Số tiền lớn nhất",
    sort_lowest: "Số tiền nhỏ nhất",
    expense_records_title: "Danh sách chi tiêu",
    paid_by_prefix: "Người trả:",
    split_for_prefix: "Chia đều cho:",
    item_details: "Chi tiết",
    edit_item: "Sửa",
    delete_item: "Xóa",
    view_receipt_btn: "Xem hóa đơn",
    no_expenses_found: "Không tìm thấy khoản chi tiêu nào",
    clear_filter_btn: "Xóa bộ lọc",

    // Members & Fund
    member_list_title: "Danh sách thành viên",
    add_member_btn: "Thêm thành viên",
    member_access_code_label: "Mã truy cập nhóm",
    copy_invite_link_label: "Sao chép link mời",
    fund_history_title: "Lịch sử giao dịch Quỹ Nhóm",
    fund_in_label: "Nộp Quỹ",
    fund_out_label: "Chi từ Quỹ",
    no_fund_history_msg: "Chưa có giao dịch quỹ nào được ghi nhận",
  },
  en: {
    // Navigation / Tabs
    tab_expenses: "Expense Records",
    tab_expenses_short: "Expenses",
    tab_settle: "Settle Up & Debts",
    tab_settle_short: "Settle",
    tab_participation: "Close Cycle & Archive",
    tab_participation_short: "Archive",
    tab_fund: "Group Fund",
    tab_stats: "Analytics",
    tab_members: "Members",
    
    // Actions & Buttons
    add_expense: "Add Expense",
    scan_bill: "Scan Receipt",
    settle_up: "Settle Up",
    export_excel: "Export Excel",
    export_pdf: "Export PDF",
    share_report: "Share Report",
    close_cycle: "Close Cycle & Archive",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    copy: "Copy",
    copied: "Copied!",
    upgrade: "Upgrade",
    view_as_member: "Preview Member View",
    back_to_admin: "Back to Leader Mode",
    
    // Group & Currency
    group_settings: "Group Settings",
    group_name: "Group Name",
    currency: "Currency",
    select_currency: "Select Currency",
    create_group: "Create New Group",
    switch_group: "Switch Group",
    language: "Language",
    vietnamese: "🇻🇳 Tiếng Việt",
    english: "🇬🇧 English",
    group_members: "members",
    group_plan_free: "Free 🌱",
    group_plan_be_ban: "Friends ⭐",
    group_plan_hoi_lang: "Village 👑",
    group_plan_du_hi: "Trip 🚗",

    // Categories
    cat_all: "All",
    cat_food: "Food & Drinks",
    cat_transport: "Transport",
    cat_shopping: "Shopping",
    cat_hotel: "Lodging",
    cat_entertainment: "Leisure",
    cat_other: "Other",
    
    // Status
    status_pending: "Pending",
    status_approved: "Approved",
    status_rejected: "Rejected",
    
    // Settlement & Balance
    total_spent: "Total Spent",
    fund_balance: "Fund Balance",
    you_owe: "You owe",
    you_are_owed: "You are owed",
    all_settled: "All debts are settled!",
    settlement_overview: "Settlement Overview",
    debtor_section: "Members paying into group fund",
    creditor_section: "Members receiving reimbursement",
    pay_fund: "Deposit Fund",
    refund: "Reimburse",
    fund_history: "Fund History",
    unsettled_bills: "Active Bills",
    total_expenses: "Total Cost",
    average_per_person: "Average / person",
    current_fund_balance: "Current fund balance",
    
    // Receipts
    receipt_upload: "Upload Payment Receipt",
    receipt_upload_sub: "Save transfer screenshots for balance reconciliation",
    receipt_list: "Proof of Payment Verification",
    approve_receipt: "Approve Receipt",
    reject_receipt: "Reject",
    reopen_receipt: "Reset to Pending",
    deduct_debt: "Deduct Debt",
    
    // Common
    today: "Today",
    yesterday: "Yesterday",
    note: "Note",
    amount: "Amount",
    payer: "Paid by",
    participants: "Split with",
    date: "Date",
    search: "Search...",
    filter: "Filter",
    clear_filter: "Clear filter",
    no_expenses: "No expenses recorded yet",
    create_first_expense: "Create or scan your first receipt!",
    logout: "Log out",
    personal_info: "Profile",
    my_account: "My Account",
    security_portal: "Security Portal",
    sync_offline: "Save Offline",
    save_settings: "Save Settings",
    member_permissions: "Member Permissions",
    allow_member_add: "Allow members to add & edit expenses",

    // Expense Form
    create_expense_title: "Add New Expense",
    edit_expense_title: "Edit Expense",
    expense_name_placeholder: "e.g., Hotpot dinner, Taxi to hotel...",
    expense_amount_placeholder: "0",
    who_paid: "Who paid first?",
    split_method: "Split Method",
    split_equally: "Split Equally",
    split_custom: "Custom Split",
    split_exact: "Exact Amount",
    select_all_members: "Select All",
    deselect_all: "Deselect All",
    attach_receipt_photo: "Attach receipt photo",
    change_receipt_photo: "Change receipt photo",
    delete_receipt_photo: "Delete photo",
    save_expense_btn: "Save Expense",
    save_expense_changes: "Save Changes",
    submit_expense: "Save Expense",
    update_expense_btn: "Update Expense",
    adding_expense: "Saving...",
    expense_category: "Category",
    expense_date: "Expense Date",
    time_optional: "Time (optional)",

    // Settlement & Debt
    statement_banner_title: "Settlement & Personal Statement",
    statement_banner_desc: "View details of spending, amounts to pay/receive, and transactions",
    view_statement_btn: "View My Statement",
    direct_debt_offset: "Direct Debt Offset",
    settle_up_title: "Debts to Settle",
    all_settled_title: "All debts settled",
    all_settled_desc: "All group members have balanced their debts.",
    confirm_payment_btn: "Confirm Deposit",
    debt_offset_history: "Settlement & Offset History",
    no_debts_to_settle: "Awesome! All members are all squared up.",
    qr_payment_guide: "Scan VietQR to transfer accurately",
    bank_account_info: "Beneficiary Account",
    bank_name: "Bank",
    account_number: "Account Number",
    account_holder: "Account Holder",
    transfer_content: "Transfer Reference",
    confirm_settle_btn: "Confirm Payment",
    upload_transfer_proof: "Upload payment proof screenshot",
    personal_statement: "Personal Statement",
    view_personal_statement: "View My Statement",

    // Close Cycle
    close_cycle_desc: "Archive active expenses to start a fresh cycle",
    current_active_cycle: "Current Active Cycle",
    archived_cycles_history: "Archived Cycles History",
    confirm_close_cycle: "Confirm Close Cycle",
    cycle_name: "Cycle Name (e.g., Summer Trip Aug 2026)",
    cycle_closed_success: "Cycle closed successfully!",
    no_archived_cycles: "No archived cycles yet",

    // Dashboard & Overview
    tab_overview: "Overview",
    distribution_overview: "DISTRIBUTION OVERVIEW",
    avg_per_person: "Average / Person",
    current_fund_balance_label: "Current fund balance:",
    top_spender_title: "Top Spender",
    top_spender_spent: "spent the most:",
    active_comer_title: "Most Active Comer",
    active_comer_used: "actual share:",
    quick_actions: "Quick Actions",
    statement_report: "Personal Statement",
    one_time_mode_badge: "One-time",
    plan_label_free: "Free Plan",
    plan_label_be_ban: "Friends Plan",
    plan_label_hoi_lang: "Village Plan",
    plan_label_du_hi: "Trip Plan",

    // Expense List
    search_placeholder_expenses: "Search by title, payer, amount...",
    filter_date: "Date",
    filter_payer: "Payer",
    filter_all_payers: "All Payers",
    sort_by: "Sort by",
    sort_newest: "Newest",
    sort_oldest: "Oldest",
    sort_highest: "Highest Amount",
    sort_lowest: "Lowest Amount",
    expense_records_title: "Expense Records",
    paid_by_prefix: "Paid by:",
    split_for_prefix: "Split for:",
    item_details: "Details",
    edit_item: "Edit",
    delete_item: "Delete",
    view_receipt_btn: "View Receipt",
    no_expenses_found: "No matching expenses found",
    clear_filter_btn: "Clear Filter",

    // Members & Fund
    member_list_title: "Member Directory",
    add_member_btn: "Add Member",
    member_access_code_label: "Group Access Code",
    copy_invite_link_label: "Copy Invite Link",
    fund_history_title: "Group Fund Transactions",
    fund_in_label: "Fund In",
    fund_out_label: "Fund Out",
    no_fund_history_msg: "No fund transactions recorded yet",
  }
};

export type TranslationKey = keyof typeof translations['vi'];

const LANGUAGE_STORAGE_KEY = 'splitmate_language';

export function getSavedLanguage(): Language {
  if (typeof window === 'undefined') return 'vi';
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language;
  return saved === 'en' ? 'en' : 'vi';
}

export function saveLanguage(lang: Language): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    window.dispatchEvent(new CustomEvent('splitmate_language_change', { detail: lang }));
  }
}

export function useTranslation() {
  const [lang, setLang] = React.useState<Language>(getSavedLanguage);

  React.useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<Language>;
      if (customEvent.detail) {
        setLang(customEvent.detail);
      }
    };
    window.addEventListener('splitmate_language_change', handleLangChange);
    return () => {
      window.removeEventListener('splitmate_language_change', handleLangChange);
    };
  }, []);

  const changeLanguage = (newLang: Language) => {
    saveLanguage(newLang);
    setLang(newLang);
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    return translations[lang][key] || fallback || translations['vi'][key] || key;
  };

  return { lang, setLang: changeLanguage, t };
}

export function formatCurrencyAmount(amount: number, currency: Currency = 'VND'): string {
  const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.VND;
  const rounded = config.decimals === 0 ? Math.round(amount) : Number(amount.toFixed(config.decimals));
  
  const formattedNumber = new Intl.NumberFormat(currency === 'VND' ? 'vi-VN' : 'en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(rounded);

  if (config.position === 'before') {
    return `${config.symbol}${formattedNumber}`;
  }
  return `${formattedNumber} ${config.symbol}`;
}

