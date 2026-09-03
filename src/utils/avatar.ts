/**
 * Helper to get a beautiful bank / group treasury vault avatar SVG URL
 */
export function getGroupFundAvatar(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <defs>
      <linearGradient id="fundGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#059669" />
        <stop offset="50%" stop-color="#047857" />
        <stop offset="100%" stop-color="#064E3B" />
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FDE047" />
        <stop offset="50%" stop-color="#F59E0B" />
        <stop offset="100%" stop-color="#D97706" />
      </linearGradient>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="100%" stop-color="#ECFDF5" />
      </linearGradient>
    </defs>
    <circle cx="64" cy="64" r="64" fill="url(#fundGrad)" />
    <circle cx="64" cy="64" r="58" fill="none" stroke="#34D399" stroke-width="2" stroke-dasharray="4 2" opacity="0.6"/>
    <g>
      <path d="M 64 28 L 32 46 L 96 46 Z" fill="url(#goldGrad)"/>
      <rect x="34" y="46" width="60" height="5" rx="1.5" fill="#FFFFFF"/>
      <rect x="38" y="53" width="9" height="28" rx="2" fill="url(#shieldGrad)"/>
      <rect x="52" y="53" width="9" height="28" rx="2" fill="url(#shieldGrad)"/>
      <rect x="67" y="53" width="9" height="28" rx="2" fill="url(#shieldGrad)"/>
      <rect x="81" y="53" width="9" height="28" rx="2" fill="url(#shieldGrad)"/>
      <rect x="34" y="81" width="60" height="6" rx="2" fill="#FFFFFF"/>
      <rect x="28" y="87" width="72" height="8" rx="3" fill="url(#goldGrad)"/>
      <circle cx="64" cy="67" r="8" fill="url(#goldGrad)" />
      <path d="M 64 62 L 64 72 M 61.5 64.5 C 61.5 63.5 66.5 63 66.5 65.5 C 66.5 68 61.5 67.5 61.5 70 C 61.5 72 66.5 71.5 66.5 70" fill="none" stroke="#78350F" stroke-width="2" stroke-linecap="round"/>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Helper to get a beautiful cartoon avatar URL for a member
 */
export function getMemberAvatar(member: { name?: string | null; avatar?: string | null; id?: string | null }) {
  if (member.avatar) return member.avatar;
  const name = member.name || "";
  const id = member.id || "";
  if (id === "group" || id === "group-fund" || name === "Quỹ Nhóm" || name.toLowerCase().includes("quỹ nhóm") || name.toLowerCase().includes("quỹ chung")) {
    return getGroupFundAvatar();
  }
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name || id || "Member")}`;
}

export const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Bella",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Buddy",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Cookie",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=George",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Mimi",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Lucky",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Daisy",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Lily",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Maya",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Milo"
];
