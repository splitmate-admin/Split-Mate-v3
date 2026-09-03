import { Member, Expense } from "./types";

export const TEST_MEMBERS: Member[] = [
  { id: "m_first_1781426519630", name: "Thủ quỹ (Bạn)", color: "bg-emerald-500", emoji: "👑" },
  { id: "m_1781426525987", name: "Vy", color: "bg-pink-500", emoji: "🌸" },
  { id: "m_1781426528950", name: "Cá", color: "bg-blue-500", emoji: "🐟" },
  { id: "m_1781687828535", name: "An", color: "bg-purple-500", emoji: "🌟" },
  { id: "m_1781687833455", name: "Long", color: "bg-orange-500", emoji: "🐉" },
  { id: "m_1781687836319", name: "Tùng", color: "bg-indigo-500", emoji: "🌲" },
  { id: "m_1781687849368", name: "Linh", color: "bg-yellow-500", emoji: "🦄" },
  { id: "m_1782067150309", name: "Phúc", color: "bg-teal-500", emoji: "🍀" },
  { id: "m_1782067161014", name: "Tuấn", color: "bg-rose-500", emoji: "🦁" },
  { id: "m_1781687858525", name: "Mai", color: "bg-red-500", emoji: "🌻" }
];

export const TEST_EXPENSES: Expense[] = [
  {
    "id": "exp_1782308955579",
    "date": "2026-06-24",
    "amount": 194000,
    "addedBy": "admin",
    "payerId": "m_1781426525987",
    "description": "Ăn tối + chè",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781426528950", "m_1781687828535", "m_1781687836319"]
  },
  {
    "id": "exp_1782291167611",
    "date": "2026-06-23",
    "amount": 169000,
    "addedBy": "m_1781426525987",
    "payerId": "m_1781426525987",
    "description": "Cá viên chiên 5 sao",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781426528950", "m_1781687828535", "m_1781687836319", "m_1781687849368"]
  },
  {
    "id": "exp_1782287919721",
    "date": "2026-06-23",
    "amount": 360000,
    "addedBy": "admin",
    "payerId": "m_first_1781426519630",
    "description": "Bơi lội mà Long ở trên bờ",
    "participantIds": ["m_first_1781426519630", "m_1781687828535", "m_1781687836319", "m_1781687849368"]
  },
  {
    "id": "exp_1782237402297",
    "date": "2026-06-23",
    "amount": 120000,
    "addedBy": "m_1781426528950",
    "payerId": "m_1781426528950",
    "description": "Sinh tố tươi mát tâm hồn sau hoạt động thể chất",
    "participantIds": ["m_1781426528950", "m_1781687828535", "m_1781687836319", "m_1781687849368"]
  },
  {
    "id": "settle_fund_out_m_1781687833455_1782205349098",
    "date": "2026-06-23",
    "amount": 20000,
    "payerId": "g_1781685665976",
    "description": "📤 [Nhận Quỹ] Long nhận hoàn dư từ Quỹ Nhóm",
    "participantIds": ["m_1781687833455"]
  },
  {
    "id": "settle_fund_in_m_1781687833455_1782199327412",
    "date": "2026-06-23",
    "amount": 531804.7619047619,
    "payerId": "m_1781687833455",
    "description": "📥 [Nộp Quỹ] Long đóng quỹ nhóm hoàn tất nợ",
    "participantIds": []
  },
  {
    "id": "exp_1782198508941",
    "date": "2026-06-23",
    "amount": 125000,
    "payerId": "m_first_1781426519630",
    "description": "Bida Waystation",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781426528950", "m_1781687828535", "m_1781687836319", "m_1781687849368"]
  },
  {
    "id": "exp_1782198483117",
    "date": "2026-06-22",
    "amount": 110000,
    "payerId": "m_first_1781426519630",
    "description": "Nước ép",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781426528950", "m_1781687828535", "m_1781687836319"]
  },
  {
    "id": "exp_1782198084633",
    "date": "2026-06-22",
    "amount": 193000,
    "payerId": "m_1781687828535",
    "description": "Bia tối 22/06",
    "participantIds": ["m_1781426525987", "m_first_1781426519630", "m_1781426528950", "m_1781687828535", "m_1781687849368", "m_1781687836319"]
  },
  {
    "id": "exp_1782197949465",
    "date": "2026-06-23",
    "amount": 100000,
    "payerId": "m_1781687828535",
    "description": "Rau & trái cây đã rất lâu",
    "participantIds": ["m_1781426525987", "m_first_1781426519630", "m_1781426528950", "m_1781687828535", "m_1781687849368"]
  },
  {
    "id": "exp_1782197926785",
    "date": "2026-06-23",
    "amount": 280000,
    "payerId": "m_1781426528950",
    "description": "Bánh kem",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781426528950", "m_1781687828535"]
  },
  {
    "id": "exp_1782197853383",
    "date": "2026-06-23",
    "amount": 84000,
    "payerId": "m_1781426528950",
    "description": "Sữa hạt tốt cho sức khoẻ",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781426528950", "m_1781687828535"]
  },
  {
    "id": "exp_1782197822986",
    "date": "2026-06-23",
    "amount": 253000,
    "addedBy": "m_1781426528950",
    "payerId": "m_1781426528950",
    "description": "Mì quảng bữa trưa lành mạnh",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781426528950", "m_1781687828535"]
  },
  {
    "id": "exp_1782197427117",
    "date": "2026-06-23",
    "amount": 128000,
    "payerId": "m_1781426528950",
    "description": "Gà viên+bánh chuối",
    "participantIds": ["m_1781426525987", "m_first_1781426519630", "m_1781426528950"]
  },
  {
    "id": "exp_1782197354779",
    "date": "2026-06-23",
    "amount": 228000,
    "payerId": "m_1781426528950",
    "description": "Đi chợ",
    "participantIds": ["m_1781426525987", "m_first_1781426519630", "m_1781426528950", "m_1781687828535", "m_1781687836319", "m_1781687849368"]
  },
  {
    "id": "exp_1782197303666",
    "date": "2026-06-23",
    "amount": 210000,
    "payerId": "m_1781426528950",
    "description": "Mì gói+nước ngọt+snack",
    "participantIds": ["m_1781426525987", "m_first_1781426519630", "m_1781426528950", "m_1781687828535", "m_1781687836319", "m_1781687849368"]
  },
  {
    "id": "exp_1782197255392",
    "date": "2026-06-23",
    "amount": 470000,
    "payerId": "m_1781426528950",
    "description": "Lẩu ếch gia đình",
    "participantIds": ["m_1781426525987", "m_first_1781426519630", "m_1781426528950", "m_1781687828535", "m_1781687836319", "m_1781687849368"]
  },
  {
    "id": "exp_1782197027764",
    "date": "2026-06-23",
    "amount": 810000,
    "payerId": "m_1781426528950",
    "editedBy": "m_1781426528950",
    "description": "Món quà giỏ đan",
    "participantIds": ["m_1781426525987"]
  },
  {
    "id": "exp_1782196999876",
    "date": "2026-06-23",
    "amount": 280000,
    "payerId": "m_1781426528950",
    "description": "Bao tử cá sau vận động",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781426528950", "m_1781687849368"]
  },
  {
    "id": "exp_1782196948400",
    "date": "2026-06-23",
    "amount": 75000,
    "payerId": "m_1781426528950",
    "description": "Konlou sau vận động",
    "participantIds": ["m_first_1781426519630"]
  },
  {
    "id": "exp_1782196910458",
    "date": "2026-06-23",
    "amount": 204000,
    "payerId": "m_1781426528950",
    "description": "Bò né sau vận động",
    "participantIds": ["m_1781426528950", "m_1781687849368", "m_first_1781426519630"]
  },
  {
    "id": "exp_1782196817104",
    "date": "2026-05-27",
    "amount": 111000,
    "payerId": "m_1781426528950",
    "description": "Nước dừa nails",
    "participantIds": ["m_1781687828535", "m_1781426525987", "m_1781426528950"]
  },
  {
    "id": "exp_1782196768543",
    "date": "2026-05-29",
    "amount": 80000,
    "payerId": "m_1781426528950",
    "description": "Gội đầu nhà Cá",
    "participantIds": ["m_1781687828535"]
  },
  {
    "id": "exp_1782067324388",
    "date": "2026-06-22",
    "amount": 462000,
    "payerId": "m_1781687828535",
    "description": "Bida",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781687828535", "m_1781687833455", "m_1781687836319", "m_1782067150309"]
  },
  {
    "id": "exp_1782067254384",
    "date": "2026-06-22",
    "amount": 65000,
    "payerId": "m_1781426525987",
    "description": "Bánh toulesjour",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781687828535", "m_1781687833455", "m_1781687836319", "m_1782067161014", "m_1782067150309"]
  },
  {
    "id": "exp_1782067239752",
    "date": "2026-06-22",
    "amount": 30000,
    "payerId": "m_1781687833455",
    "description": "Gửi xe",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781687828535", "m_1781687833455", "m_1781687836319", "m_1782067161014", "m_1782067150309"]
  },
  {
    "id": "exp_1782067221784",
    "date": "2026-06-22",
    "amount": 280000,
    "payerId": "m_first_1781426519630",
    "description": "Bách hoá xanh",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781687828535", "m_1781687833455", "m_1781687836319", "m_1782067161014", "m_1782067150309"]
  },
  {
    "id": "exp_1782067201843",
    "date": "2026-06-22",
    "amount": 350000,
    "payerId": "m_1781687833455",
    "description": "Bơi Golden Star",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781687828535", "m_1781687833455", "m_1781687836319", "m_1782067161014", "m_1782067150309"]
  },
  {
    "id": "exp_1781708780946",
    "date": "2026-06-10",
    "amount": 213000,
    "payerId": "m_first_1781426519630",
    "description": "Cơm tấm bụi",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781426528950", "m_1781687828535", "m_1781687849368"]
  },
  {
    "id": "exp_1781707033668",
    "date": "2026-06-17",
    "amount": 285000,
    "payerId": "m_first_1781426519630",
    "description": "Cơm tấm calmette",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781426528950", "m_1781687828535"]
  },
  {
    "id": "exp_1781705296792",
    "date": "2026-06-17",
    "amount": 1125000,
    "payerId": "m_1781426525987",
    "description": "Buổi tối thân mật",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781426528950", "m_1781687828535"]
  },
  {
    "id": "exp_1781518996139",
    "date": "2026-06-14",
    "amount": 50000,
    "payerId": "m_first_1781426519630",
    "description": "Canh chua",
    "participantIds": ["m_1781687828535", "m_1781426525987", "m_first_1781426519630"]
  },
  {
    "id": "exp_1781518979604",
    "date": "2026-06-14",
    "amount": 250000,
    "payerId": "m_1781426525987",
    "description": "Cà phê + bún riêu",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781687828535"]
  },
  {
    "id": "exp_1781518779851",
    "date": "2026-06-14",
    "amount": 108000,
    "payerId": "m_first_1781426519630",
    "description": "Tàu hủ đá",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781687828535", "m_1781687833455"]
  },
  {
    "id": "exp_1781518753794",
    "date": "2026-06-14",
    "amount": 250000,
    "payerId": "m_first_1781426519630",
    "description": "Bò né xíu mại",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781687828535", "m_1781687833455"]
  },
  {
    "id": "exp_1781518735211",
    "date": "2026-06-12",
    "amount": 68000,
    "payerId": "m_first_1781426519630",
    "description": "Bắp xào",
    "participantIds": ["m_1781687849368", "m_1781426528950", "m_1781687828535", "m_1781426525987", "m_first_1781426519630"]
  },
  {
    "id": "exp_1781518645987",
    "date": "2026-06-12",
    "amount": 480000,
    "payerId": "m_first_1781426519630",
    "description": "Bơi Sky Garden",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781426528950", "m_1781687828535", "m_1781687849368"]
  },
  {
    "id": "exp_1781518615851",
    "date": "2026-06-10",
    "amount": 115000,
    "payerId": "m_first_1781426519630",
    "description": "Nước ép, sinh tố",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781426528950", "m_1781687828535", "m_1781687849368"]
  },
  {
    "id": "exp_1781518576483",
    "date": "2026-06-10",
    "amount": 490000,
    "payerId": "m_first_1781426519630",
    "description": "Bơi Sky Garden",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781426528950", "m_1781687828535", "m_1781687849368"]
  },
  {
    "id": "exp_1781518544092",
    "date": "2026-06-09",
    "amount": 182000,
    "payerId": "m_first_1781426519630",
    "description": "Bida",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781426528950", "m_1781687836319"]
  },
  {
    "id": "exp_1781518527052",
    "date": "2026-06-09",
    "amount": 1016000,
    "payerId": "m_first_1781426519630",
    "description": "Mì Ý",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781687828535", "m_1781426528950", "m_1781687836319"]
  },
  {
    "id": "exp_1781512824644",
    "date": "2026-05-31",
    "amount": 520000,
    "payerId": "m_first_1781426519630",
    "description": "Ăn tối An Điền House",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781426528950", "m_1781687828535", "m_1781687833455", "m_1781687849368"]
  },
  {
    "id": "exp_1781512802100",
    "date": "2026-05-30",
    "amount": 1660000,
    "payerId": "m_1781687828535",
    "description": "Ăn uống miệt vườn",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781426528950", "m_1781687828535", "m_1781687858525", "m_1781687833455"]
  },
  {
    "id": "exp_1781512765812",
    "date": "2026-05-31",
    "amount": 100000,
    "payerId": "m_1781687833455",
    "description": "Gửi xe An Điền House",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781426528950", "m_1781687828535", "m_1781687833455"]
  },
  {
    "id": "exp_1781512737417",
    "date": "2026-05-31",
    "amount": 1692000,
    "payerId": "m_1781426528950",
    "description": "Vận chuyển hành khách",
    "participantIds": ["m_first_1781426519630", "m_1781426525987", "m_1781426528950", "m_1781687828535", "m_1781687833455"]
  }
];
