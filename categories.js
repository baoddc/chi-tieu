// DANH MỤC MẶC ĐỊNH & THƯ VIỆN ICON, MÀU SẮC

const DEFAULT_CATEGORIES = [
  // Khoản chi (Expense)
  { id: "cat-1", name: "Ăn uống", type: "expense", color: "#10b981", icon: "utensils", budget: 3000000 }, // Emerald
  { id: "cat-2", name: "Di chuyển", type: "expense", color: "#3b82f6", icon: "car", budget: 500000 },    // Blue
  { id: "cat-3", name: "Mua sắm", type: "expense", color: "#ec4899", icon: "shopping-bag", budget: 1500000 }, // Pink
  { id: "cat-4", name: "Nhà cửa & Hóa đơn", type: "expense", color: "#f59e0b", icon: "home", budget: 4000000 }, // Amber
  { id: "cat-5", name: "Giải trí", type: "expense", color: "#8b5cf6", icon: "gamepad-2", budget: 1000000 }, // Violet
  { id: "cat-6", name: "Sức khỏe", type: "expense", color: "#ef4444", icon: "heart-pulse", budget: 500000 }, // Red
  { id: "cat-7", name: "Giáo dục", type: "expense", color: "#06b6d4", icon: "graduation-cap", budget: 1000000 }, // Cyan
  { id: "cat-13", name: "Trả nợ / Cho vay", type: "expense", color: "#ef4444", icon: "arrow-up-circle", budget: 0 },
  
  // Khoản thu (Income)
  { id: "cat-8", name: "Lương", type: "income", color: "#10b981", icon: "wallet", budget: 0 },
  { id: "cat-9", name: "Kinh doanh", type: "income", color: "#84cc16", icon: "briefcase", budget: 0 }, // Lime
  { id: "cat-10", name: "Đầu tư", type: "income", color: "#06b6d4", icon: "trending-up", budget: 0 },
  { id: "cat-11", name: "Quà tặng / Thưởng", type: "income", color: "#eab308", icon: "gift", budget: 0 },
  { id: "cat-12", name: "Khác", type: "income", color: "#6b7280", icon: "coins", budget: 0 }, // Gray
  { id: "cat-14", name: "Đi vay / Thu nợ", type: "income", color: "#84cc16", icon: "arrow-down-circle", budget: 0 }
];

const AVAILABLE_ICONS = [
  "utensils", "car", "shopping-bag", "home", "gamepad-2", 
  "heart-pulse", "graduation-cap", "wallet", "briefcase", 
  "trending-up", "gift", "coins", "coffee", "plane", 
  "phone", "tv", "book", "dumbbell", "shirt", "scissors",
  "tools", "heart", "smile", "star", "alert-circle",
  "landmark", "credit-card", "smartphone", "piggy-bank",
  "banknote", "dollar-sign"
];

// Bảng màu đẹp chuyên nghiệp (Tailwind-like Palette)
const AVAILABLE_COLORS = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#f59e0b", // Amber
  "#eab308", // Yellow
  "#84cc16", // Lime
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#d946ef", // Fuchsia
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#6b7280", // Gray
  "#475569"  // Slate
];

// Hàm lấy thông tin hạng mục theo ID (hoặc trả về mặc định nếu không thấy)
function getCategoryInfo(categoryId, categoriesList) {
  // Hạng mục đặc biệt dành riêng cho giao dịch Chuyển ví
  if (categoryId === "cat-transfer") {
    return { id: "cat-transfer", name: "Chuyển ví", color: "#8b5cf6", icon: "repeat", type: "transfer" };
  }

  const list = categoriesList || DEFAULT_CATEGORIES;
  const category = list.find(c => c.id === categoryId);
  if (category) return category;

  return { name: "Chưa phân loại", color: "#9ca3af", icon: "help-circle", type: "expense" };
}
