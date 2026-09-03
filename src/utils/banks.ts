export interface BankOption {
  code: string;
  name: string;
  fullName: string;
  bin?: string;
  isPopular?: boolean;
  logoUrl?: string;
  appScheme?: string;
  shortCode?: string;
  badgeColor?: string;
}

const DEFAULT_BANKS: BankOption[] = [
  // Top Popular / Recommended Apps
  {
    code: "timo",
    name: "Timo",
    fullName: "Ngân hàng số Timo",
    bin: "963388",
    isPopular: true,
    logoUrl: "https://api.vietqr.io/img/TIMO.png",
    appScheme: "timo",
    shortCode: "TIMO",
    badgeColor: "bg-purple-600 text-white"
  },
  {
    code: "bvbank",
    name: "BVBank",
    fullName: "NH TMCP Bản Việt",
    bin: "970454",
    isPopular: true,
    logoUrl: "https://api.vietqr.io/img/BVB.png",
    appScheme: "bvbank",
    shortCode: "BVB",
    badgeColor: "bg-blue-700 text-white"
  },
  {
    code: "vcb",
    name: "Vietcombank",
    fullName: "Ngân hàng Ngoại Thương Việt Nam",
    bin: "970436",
    isPopular: true,
    logoUrl: "https://api.vietqr.io/img/VCB.png",
    appScheme: "vietcombank",
    shortCode: "VCB",
    badgeColor: "bg-emerald-600 text-white"
  },
  {
    code: "tcb",
    name: "Techcombank",
    fullName: "Ngân hàng Kỹ Thương Việt Nam",
    bin: "970407",
    isPopular: true,
    logoUrl: "https://api.vietqr.io/img/TCB.png",
    appScheme: "tcb",
    shortCode: "TCB",
    badgeColor: "bg-red-600 text-white"
  },
  {
    code: "ctg",
    name: "VietinBank",
    fullName: "Ngân hàng Công Thương Việt Nam",
    bin: "970415",
    isPopular: true,
    logoUrl: "https://api.vietqr.io/img/ICB.png",
    appScheme: "vietinbank",
    shortCode: "CTG",
    badgeColor: "bg-blue-600 text-white"
  },
  {
    code: "mbb",
    name: "MB Bank",
    fullName: "Ngân hàng Quân Đội",
    bin: "970422",
    isPopular: true,
    logoUrl: "https://api.vietqr.io/img/MB.png",
    appScheme: "mbmobile",
    shortCode: "MB",
    badgeColor: "bg-indigo-600 text-white"
  }
];

export const VIETNAM_BANKS: BankOption[] = [...DEFAULT_BANKS];

export const fetchVietQRBanks = async () => {
  try {
    const res = await fetch("https://api.vietqr.io/v2/banks");
    const json = await res.json();
    if (json.code === "00" && Array.isArray(json.data)) {
      const apiBanks: BankOption[] = json.data.map((b: any) => {
        // Try to match with our default banks to retain short code and badge color
        const existing = DEFAULT_BANKS.find(db => db.bin === b.bin);
        return {
          code: existing?.code || b.bin, // Fallback to bin as code for new banks
          name: b.shortName,
          fullName: b.name,
          bin: b.bin,
          isPopular: existing?.isPopular || b.transferSupported === 1,
          logoUrl: b.logo,
          shortCode: existing?.shortCode || b.shortName,
          badgeColor: existing?.badgeColor || "bg-slate-600 text-white"
        };
      });

      VIETNAM_BANKS.splice(0, VIETNAM_BANKS.length, ...apiBanks);
      
      // Dispatch an event so components can listen and re-render if needed
      window.dispatchEvent(new Event("banks-updated"));
    }
  } catch (err) {
    console.error("Lỗi khi lấy danh sách ngân hàng từ VietQR:", err);
  }
};




