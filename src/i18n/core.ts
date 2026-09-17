import { uiMessages } from './uiMessages';
export const LANGUAGES = ['vi', 'en', 'zh-CN'] as const;
export type Language = typeof LANGUAGES[number];
export const LOCALES: Record<Language, string> = { vi: 'vi-VN', en: 'en-US', 'zh-CN': 'zh-CN' };

export const messages = {
  language: ['Ngôn ngữ', 'Language', '语言'],
  currency: ['Tiền tệ', 'Currency', '币种'],
  amount: ['Số tiền', 'Amount', '金额'],
  exchangeRate: ['Tỷ giá', 'Exchange rate', '汇率'],
  rateToVnd: ['VND cho 1 {currency}', 'VND per 1 {currency}', '每 1 {currency} 兑换的越南盾'],
  convertedAmount: ['Quy đổi: {amount}', 'Converted: {amount}', '折合：{amount}'],
  manualRate: ['Nhập tỷ giá áp dụng cho khoản chi này', 'Enter the exchange rate for this expense', '输入此笔支出的适用汇率'],
  invalidAmount: ['Số tiền hoặc tỷ giá không hợp lệ.', 'Invalid amount or exchange rate.', '金额或汇率无效。'],
  splitInVnd: ['Chia tùy chỉnh theo VND', 'Custom split in VND', '以越南盾自定义分摊'],
  originalAmount: ['Số tiền gốc', 'Original amount', '原币金额'],
  updateRate: ['Cập nhật tỷ giá', 'Update exchange rate', '更新汇率'],
  loadingRate: ['Đang tải tỷ giá…', 'Loading exchange rate…', '正在加载汇率…'],
  rateUnavailable: ['Không tải được tỷ giá. Bạn có thể nhập tỷ giá thủ công.', 'Exchange rates are unavailable. You can enter a rate manually.', '无法加载汇率。您可以手动输入汇率。'],
  serverError: ['Không thể hoàn tất yêu cầu. Vui lòng thử lại.', 'Cannot complete the request. Please try again.', '无法完成请求，请重试。'],
  search: ['Tìm kiếm…', 'Search…', '搜索…'],
  offsetTo: ['🤝 Cấn nợ thủ công (Người nhận: {name})', '🤝 Manual offset (Recipient: {name})', '🤝 手动抵扣（收款人：{name}）'],
  offsetFrom: ['🤝 Cấn nợ thủ công (Cho: {name})', '🤝 Manual offset (From: {name})', '🤝 手动抵扣（来自：{name}）'],
  manualSource: ['Thủ công', 'Manual', '手动'],
  pageTitle: ['SplitMate - Chia Tiền Nhóm', 'SplitMate - Group Expense Sharing', 'SplitMate - 群组分账'],
  testRecovery: ['Hệ thống không tìm thấy tài khoản SMTP cấu hình.\nMật khẩu Thủ quỹ của bạn là: [ {password} ]\n\n(Tip: Để gửi email thực tế, hãy điền đầy đủ biến môi trường HOST, SMTP_USER, SMTP_PASS trên Vercel của bạn).', 'SMTP is not configured.\nYour treasurer password is: [ {password} ]\n\nTo send real emails, configure HOST, SMTP_USER and SMTP_PASS in Vercel.', '尚未配置 SMTP。\n您的财务管理员密码为：[ {password} ]\n\n如需实际发送邮件，请在 Vercel 配置 HOST、SMTP_USER 和 SMTP_PASS。'],
} satisfies Record<string, readonly [string, string, string]>;
export type MessageKey = keyof typeof messages;
let activeLanguage: Language = 'vi';
export function getLanguage() { return activeLanguage; }
export function getLocale() { return LOCALES[activeLanguage]; }
export function activateLanguage(language: Language) { activeLanguage = language; }
export function ui(key: keyof typeof uiMessages, values: Record<string, unknown> = {}): string {
  const message = uiMessages[key];
  if (!message) return key;
  return message[LANGUAGES.indexOf(activeLanguage)].replace(/\{(\w+)\}/g, (token, name) => values[name] === undefined ? token : String(values[name]));
}
/** Translate known server messages; keep unknown details out of a foreign-language UI. */
export function errorMessage(value: unknown, fallback: string = t('serverError')): string {
  if (typeof value !== 'string' || !value) return fallback;
  const known = Object.values(uiMessages).find(message => message[0] === value);
  if (known) return known[LANGUAGES.indexOf(activeLanguage)];
  return activeLanguage === 'vi' ? value : fallback;
}
export function t(key: MessageKey, values: Record<string, string | number> = {}): string {
  const index = LANGUAGES.indexOf(activeLanguage);
  return messages[key][index].replace(/\{(\w+)\}/g, (token, name) => values[name] === undefined ? token : String(values[name]));
}
