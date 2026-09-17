import { useI18n } from '../i18n/I18nProvider';
import { Language } from '../i18n/core';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  return <select aria-label={t('language')} value={language} onChange={event => setLanguage(event.target.value as Language)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
    <option value="vi">Tiếng Việt</option><option value="en">English</option><option value="zh-CN">简体中文</option>
  </select>;
}
