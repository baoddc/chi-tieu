// LOGIC CHÍNH CỦA ỨNG DỤNG - FRONTEND PROCESSOR ENGINE

// Khai báo Trạng thái ứng dụng cục bộ
const appState = {
  transactions: [],
  categories: [],
  wallets: [],
  debts: [],
  activeTab: "dashboard",
  activeDebtTab: "borrow",
  editingTransactionId: null,
  editingCategoryId: null,
  editingTransferId: null,
  editingDebtId: null,
  selectedCategoryIcon: "utensils",
  selectedCategoryColor: "#ef4444",
  selectedWalletIcon: "wallet",
  selectedWalletColor: "#10b981",
  editingWalletId: null
};

// Định dạng tiền tệ VND
function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND"
  }).format(amount);
}

// Định dạng số với dấu "." ngăn cách hàng ngàn (không có đơn vị tiền)
function formatNumber(amount) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(parseFloat(amount) || 0));
}

// Lấy giá trị số thực từ input field (bỏ dấu "." ngăn cách hàng ngàn)
function parseInputAmount(inputEl) {
  const raw = inputEl.value.replace(/\./g, "").replace(/,/g, ".").replace(/[^0-9.]/g, "");
  return parseFloat(raw) || 0;
}

// Chuẩn hóa mọi định dạng ngày thành yyyy-mm-dd trong múi giờ địa phương
function normalizeDate(dateVal) {
  if (!dateVal) return "";
  
  if (dateVal instanceof Date) {
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, '0');
    const d = String(dateVal.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  let dateStr = String(dateVal).trim();
  if (!dateStr) return "";

  // Nếu là chuỗi ISO chứa thông tin múi giờ đầy đủ (ví dụ có chữ T và Z hoặc + hoặc múi giờ lệch)
  // Ta parse bằng new Date() và chuyển về ngày địa phương để tránh lệch múi giờ.
  if (dateStr.includes("T") && (dateStr.includes("Z") || dateStr.includes("+") || /-\d{2}:\d{2}$/.test(dateStr))) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // Nếu là chuỗi ngày giờ cục bộ không có múi giờ (ví dụ "2026-06-03 00:00:00" hoặc "2026-06-03T00:00:00"),
  // ta chỉ lấy phần ngày để giữ nguyên giá trị ngày đã chọn.
  if (dateStr.includes(" ")) {
    dateStr = dateStr.split(" ")[0];
  } else if (dateStr.includes("T")) {
    dateStr = dateStr.split("T")[0];
  }

  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
  }

  if (dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }

  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch (e) {}

  return dateStr;
}

// Chuẩn hóa tất cả các ngày tháng trong appState về định dạng yyyy-mm-dd
function normalizeAppStateDates() {
  if (appState.transactions) {
    appState.transactions.forEach(tx => {
      if (tx.date) tx.date = normalizeDate(tx.date);
    });
  }
  if (appState.debts) {
    appState.debts.forEach(d => {
      if (d.date) d.date = normalizeDate(d.date);
      if (d.dueDate) d.dueDate = normalizeDate(d.dueDate);
    });
  }
}

// Định dạng ngày yyyy-mm-dd thành dd/mm/yyyy
function formatDateDMY(dateStr) {
  if (!dateStr) return "";
  const normalized = normalizeDate(dateStr);
  const parts = normalized.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return normalized;
}

// Chuyển đổi mọi định dạng ngày thành yyyy-mm-dd để set vào input[type="date"]
function formatDateForInput(dateVal) {
  return normalizeDate(dateVal);
}

// Khởi chạy ứng dụng khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", async () => {
  setupTheme();
  setupNavigation();
  setupModals();
  setupSettingsHandlers();
  setupFormHandlers();
  setupAmountInputFormatting();
  setupTransferHandlers();
  setupWalletHandlers();
  setupReportsSubNavigation();
  setupDebtHandlers();
  setupRepaymentHandlers();
  
  // Hiển thị trạng thái đang tải
  showToast("Đang tải dữ liệu...", "warning");
  await refreshData();
  
  // Tải pickers icon/màu sắc mặc định trong modal tạo hạng mục
  renderIconPicker();
  renderColorPicker();
  renderWalletIconPicker();
  renderWalletColorPicker();

  // Tạo mặc định bộ lọc ngày là Tháng này
  document.getElementById("filterDate").value = "thisMonth";
  
  // Bật tab mặc định
  switchTab("dashboard");
});

// THIẾT LẬP ĐỊNH DẠNG SỐ TIỀN TRONG INPUT
function setupAmountInputFormatting() {
  // Áp dụng cho các input số tiền
  ["txAmount", "transferAmount", "debtAmount", "repaymentAmount"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function () {
      const raw = this.value.replace(/\./g, "").replace(/,/g, "").replace(/[^0-9]/g, "");
      if (raw === "") { this.value = ""; return; }
      const num = parseInt(raw, 10);
      if (!isNaN(num)) {
        const formatted = new Intl.NumberFormat("vi-VN").format(num);
        this.value = formatted;
        this.setSelectionRange(formatted.length, formatted.length);
      }
    });
    el.addEventListener("keydown", e => { if (e.key === "Enter") e.preventDefault(); });
  });
}

// CÀI ĐẶT CHỦ ĐỀ SÁNG/TỐI (THEME)
function setupTheme() {
  const toggleBtn = document.getElementById("themeToggleBtn");
  if (!toggleBtn) return;

  const currentTheme = localStorage.getItem("expense_theme") || "dark";
  document.documentElement.setAttribute("data-theme", currentTheme);
  updateThemeIcon(currentTheme);

  toggleBtn.addEventListener("click", () => {
    const activeTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = activeTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("expense_theme", newTheme);
    updateThemeIcon(newTheme);
    
    // Vẽ lại biểu đồ để cập nhật màu chữ theo theme
    if (appState.transactions.length > 0) {
      updateAppCharts(appState.transactions, appState.categories);
    }
  });
}

function updateThemeIcon(theme) {
  const icon = document.querySelector("#themeToggleBtn i");
  if (!icon) return;
  if (theme === "dark") {
    icon.setAttribute("data-lucide", "sun");
    icon.style.color = "#fbbf24"; // Màu vàng mặt trời
  } else {
    icon.setAttribute("data-lucide", "moon");
    icon.style.color = "var(--text-secondary)";
  }
  lucide.createIcons();
}

// ĐIỀU HƯỚNG TABS
function setupNavigation() {
  const navLinks = document.querySelectorAll(".nav-item a, .mobile-nav-item");
  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const tabId = link.getAttribute("data-tab");
      if (tabId) switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  appState.activeTab = tabId;
  
  // Cập nhật class active ở menu
  document.querySelectorAll(".nav-item, .mobile-nav-item").forEach(el => {
    el.classList.remove("active");
    if (el.querySelector(`a[data-tab="${tabId}"]`) || el.getAttribute("data-tab") === tabId) {
      el.classList.add("active");
    }
  });

  // Chuyển màn hình hiển thị
  document.querySelectorAll(".app-screen").forEach(screen => {
    screen.classList.remove("active");
  });
  
  const activeScreen = document.getElementById(`${tabId}Screen`);
  if (activeScreen) {
    activeScreen.classList.add("active");
  }

  // Cập nhật tiêu đề trang
  const titles = {
    dashboard: "Tổng Quan Chi Tiêu",
    transactions: "Sổ Giao Dịch",
    categories: "Hạng Mục & Ngân Sách",
    debts: "Quản Lý Vay & Mượn",
    reports: "Báo Cáo Chi Tiết",
    settings: "Cài Đặt Kết Nối"
  };
  document.getElementById("pageTitle").textContent = titles[tabId] || "Quản Lý Chi Tiêu";

  // Khi chuyển sang tab Báo Cáo hoặc Tổng quan, vẽ lại biểu đồ hoặc báo cáo tài chính
  if (tabId === "dashboard") {
    setTimeout(() => {
      updateAppCharts(appState.transactions, appState.categories);
    }, 100);
  } else if (tabId === "reports") {
    populateReportMonthFilter();
    const activeReportTab = document.querySelector(".reports-sub-tab.active");
    if (activeReportTab) {
      renderActiveReportView(activeReportTab.getAttribute("data-sub-tab"));
    }
  }

  // Reload giao diện phù hợp với tab
  if (tabId === "transactions") {
    renderTransactionsList();
  } else if (tabId === "categories") {
    renderCategoriesTab();
  } else if (tabId === "debts") {
    renderDebtsTab();
  }
}

// ĐỒNG BỘ DỮ LIỆU TỪ TRÊN GOOGLE SHEETS
async function refreshData() {
  updateSyncStatus("pending");
  const response = await api.getAllData();
  
  if (response.success) {
    appState.transactions = response.data.Transactions || [];
    appState.categories = response.data.Categories || DEFAULT_CATEGORIES;
    appState.wallets = response.data.Wallets || api.getLocalWallets();
    appState.debts = response.data.Debts || api.getLocalDebts();
    
    // Chuẩn hóa ngày trước khi lưu lại local để tránh lưu chuỗi ISO lệch múi giờ
    normalizeAppStateDates();
    
    // Cập nhật dữ liệu vào local phòng khi API bị ngắt quãng
    api.saveLocalTransactions(appState.transactions);
    api.saveLocalCategories(appState.categories);
    api.saveLocalWallets(appState.wallets);
    api.saveLocalDebts(appState.debts);
    
    updateSyncStatus(api.isOffline ? "offline" : "synced");
    
    // Đồng bộ lại các dropdowns ví động
    populateWalletDropdowns();
    
    // Tính toán & render lại toàn bộ
    recalculateDashboard();
    
    // Vẽ danh sách quản lý ví
    renderWalletsSettings();
    
    if (response.warning) {
      showToast(response.warning, "warning");
    }
  } else {
    updateSyncStatus("offline");
    showToast("Không thể tải dữ liệu từ Google Sheets. Đang dùng dữ liệu Local.", "danger");
    
    // Nạp ví local khi không tải được từ remote
    appState.wallets = api.getLocalWallets();
    appState.debts = api.getLocalDebts();
    
    // Chuẩn hóa ngày
    normalizeAppStateDates();
    
    populateWalletDropdowns();
    recalculateDashboard();
    renderWalletsSettings();
  }
}

function updateSyncStatus(status) {
  const dot = document.getElementById("syncDot");
  const text = document.getElementById("syncText");
  if (!dot || !text) return;

  dot.className = "sync-dot";
  
  if (status === "synced") {
    dot.classList.add("synced");
    text.textContent = `Đồng bộ: ${api.getLastSyncString()}`;
  } else if (status === "pending") {
    dot.classList.add("pending");
    text.textContent = "Đang đồng bộ...";
  } else {
    dot.classList.add("offline");
    text.textContent = api.isOffline ? "Ngoại tuyến" : "Mất kết nối Sheets";
  }
}

// CÁC THIẾT LẬP MODALS
function setupModals() {
  const closeButtons = document.querySelectorAll(".modal-close, .btn-close-modal");
  closeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      closeAllModals();
    });
  });

  // Đóng modal khi click ra ngoài vùng modal-container
  const overlays = document.querySelectorAll(".modal-overlay");
  overlays.forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeAllModals();
      }
    });
  });

  // Bắt sự kiện Quick Add Transaction button
  const quickAdd = document.getElementById("quickAddBtn");
  if (quickAdd) {
    quickAdd.addEventListener("click", () => {
      openTransactionModal();
    });
  }
}

function closeAllModals() {
  document.querySelectorAll(".modal-overlay").forEach(el => {
    el.classList.remove("active");
  });
}

function openTransactionModal(txId = null) {
  if (txId) {
    const tx = appState.transactions.find(t => t.id === txId);
    if (tx && tx.category === "cat-transfer") {
      closeAllModals();
      openTransferModal(txId);
      return;
    }
  }

  appState.editingTransactionId = txId;
  const modal = document.getElementById("transactionModal");
  const title = document.getElementById("txModalTitle");
  const deleteBtn = document.getElementById("btnDeleteTx");
  const form = document.getElementById("transactionForm");

  form.reset();
  
  // Set ngày mặc định là hôm nay
  const today = formatDateForInput(new Date());
  document.getElementById("txDate").value = today;

  // Render danh mục dựa trên loại giao dịch mặc định (expense)
  updateTxCategoryOptions("expense");

  if (txId) {
    title.textContent = "Chỉnh sửa Giao dịch";
    deleteBtn.style.display = "inline-flex";
    
    // Lấy thông tin giao dịch hiện tại
    const tx = appState.transactions.find(t => t.id === txId);
    if (tx) {
      document.getElementById("txType").value = tx.type;
      updateTxCategoryOptions(tx.type);
      document.getElementById("txCategory").value = tx.category;
      // Hiển thị số tiền với dấu "." ngăn cách hàng ngàn
      document.getElementById("txAmount").value = tx.amount ? formatNumber(parseFloat(tx.amount)) : "";
      document.getElementById("txDate").value = formatDateForInput(tx.date);
      document.getElementById("txWallet").value = tx.wallet;
      document.getElementById("txNote").value = tx.note;
    }
  } else {
    title.textContent = "Thêm Giao dịch mới";
    deleteBtn.style.display = "none";
  }

  modal.classList.add("active");
}

// Thay đổi danh sách option danh mục khi thay đổi loại (Thu/Chi) trong form giao dịch
document.getElementById("txType").addEventListener("change", (e) => {
  updateTxCategoryOptions(e.target.value);
});

function updateTxCategoryOptions(type) {
  const select = document.getElementById("txCategory");
  select.innerHTML = "";
  
  const filteredCats = appState.categories.filter(c => c.type === type);
  filteredCats.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.name;
    select.appendChild(opt);
  });
}

// MODAL HẠNG MỤC (CATEGORY)
function openCategoryModal(catId = null) {
  appState.editingCategoryId = catId;
  const modal = document.getElementById("categoryModal");
  const title = document.getElementById("catModalTitle");
  const deleteBtn = document.getElementById("btnDeleteCat");
  const form = document.getElementById("categoryForm");
  
  form.reset();

  if (catId) {
    title.textContent = "Chỉnh sửa Hạng mục";
    deleteBtn.style.display = "inline-flex";
    
    const cat = appState.categories.find(c => c.id === catId);
    if (cat) {
      document.getElementById("catName").value = cat.name;
      document.getElementById("catType").value = cat.type;
      document.getElementById("catBudget").value = cat.budget || 0;
      appState.selectedCategoryColor = cat.color;
      appState.selectedCategoryIcon = cat.icon;
    }
  } else {
    title.textContent = "Thêm Hạng mục mới";
    deleteBtn.style.display = "none";
    appState.selectedCategoryColor = AVAILABLE_COLORS[0];
    appState.selectedCategoryIcon = AVAILABLE_ICONS[0];
  }

  // Highlight icon và màu đã chọn
  selectIconPickerItem(appState.selectedCategoryIcon);
  selectColorPickerItem(appState.selectedCategoryColor);

  modal.classList.add("active");
}

// VẼ PICKERS ICON & MÀU SẮC TRONG MODAL
function renderIconPicker() {
  const container = document.getElementById("iconPickerGrid");
  if (!container) return;
  container.innerHTML = "";
  
  AVAILABLE_ICONS.forEach(iconName => {
    const item = document.createElement("div");
    item.className = "icon-picker-item";
    item.setAttribute("data-icon", iconName);
    item.innerHTML = `<i data-lucide="${iconName}"></i>`;
    item.addEventListener("click", () => selectIconPickerItem(iconName));
    container.appendChild(item);
  });
  lucide.createIcons();
}

function selectIconPickerItem(iconName) {
  appState.selectedCategoryIcon = iconName;
  document.querySelectorAll(".icon-picker-item").forEach(item => {
    item.classList.remove("selected");
    if (item.getAttribute("data-icon") === iconName) {
      item.classList.add("selected");
    }
  });
}

function renderColorPicker() {
  const container = document.getElementById("colorPickerGrid");
  if (!container) return;
  container.innerHTML = "";

  AVAILABLE_COLORS.forEach(color => {
    const item = document.createElement("div");
    item.className = "color-picker-item";
    item.style.backgroundColor = color;
    item.setAttribute("data-color", color);
    item.addEventListener("click", () => selectColorPickerItem(color));
    container.appendChild(item);
  });
}

function selectColorPickerItem(color) {
  appState.selectedCategoryColor = color;
  document.querySelectorAll(".color-picker-item").forEach(item => {
    item.classList.remove("selected");
    item.innerHTML = "";
    if (item.getAttribute("data-color") === color) {
      item.classList.add("selected");
      item.innerHTML = `<i data-lucide="check" style="color: white; width: 1rem; height: 1rem;"></i>`;
    }
  });
  lucide.createIcons();
}

// TÍNH TOÁN DỮ LIỆU DASHBOARD & HIỂN THỊ
function recalculateDashboard() {
  let totalIncome = 0;
  let totalExpense = 0;

  // Lấy danh sách giao dịch tháng hiện tại (loại bỏ giao dịch Chuyển ví)
  const now = new Date();
  const currentMonthTxs = appState.transactions.filter(tx => {
    if (!tx.date || tx.category === "cat-transfer") return false;
    const d = new Date(tx.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  currentMonthTxs.forEach(tx => {
    const amount = parseFloat(tx.amount) || 0;
    if (tx.type === "income") {
      totalIncome += amount;
    } else {
      totalExpense += amount;
    }
  });

  const netBalance = totalIncome - totalExpense;

  // Ghi nhận ra màn hình Dashboard
  document.getElementById("totalIncomeVal").textContent = formatCurrency(totalIncome);
  document.getElementById("totalExpenseVal").textContent = formatCurrency(totalExpense);
  document.getElementById("netBalanceVal").textContent = formatCurrency(netBalance);
  
  const balanceCard = document.getElementById("balanceCard");
  if (netBalance >= 0) {
    balanceCard.style.borderLeft = "4px solid var(--success)";
  } else {
    balanceCard.style.borderLeft = "4px solid var(--danger)";
  }

  // Cập nhật biểu đồ
  updateAppCharts(appState.transactions, appState.categories);
  
  // Render giao dịch gần đây, tiến độ ngân sách và số dư ví
  renderRecentTransactions();
  renderDashboardBudgets();
  renderWalletCards();

  // Cập nhật giao diện quản lý nợ nếu đang xem tab Vay & Mượn
  if (appState.activeTab === "debts") {
    renderDebtsTab();
  }
}

// Hiển thị 5 giao dịch gần nhất
function renderRecentTransactions() {
  const container = document.getElementById("recentTransactionsList");
  if (!container) return;

  // Sắp xếp giao dịch theo ngày giảm dần, sau đó theo ID
  const sorted = [...appState.transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (sorted.length === 0) {
    container.innerHTML = `<div class="text-center text-gray-500 py-6 text-sm">Chưa có giao dịch nào được ghi nhận.</div>`;
    return;
  }

  let html = "";
  sorted.forEach(tx => {
    const cat = getCategoryInfo(tx.category, appState.categories);
    const isTransfer = tx.category === "cat-transfer";
    const amountStr = isTransfer
      ? formatCurrency(tx.amount)
      : (tx.type === "income" ? "+" : "-") + formatCurrency(tx.amount);
    const amountClass = isTransfer ? "transfer" : tx.type;
    const transferBadge = isTransfer ? `<span class="transfer-badge">⇔ Chuyển ví</span>` : "";

    html += `
      <div class="tx-item" onclick="openTransactionModal('${tx.id}')">
        <div class="tx-item-left">
          <div class="tx-item-icon" style="background-color: ${cat.color}">
            <i data-lucide="${cat.icon}"></i>
          </div>
          <div class="tx-item-details">
            <div style="display:flex;align-items:center;gap:0.4rem">
              <span class="tx-item-category">${cat.name}</span>${transferBadge}
            </div>
            <span class="tx-item-note">${tx.note || "Không có ghi chú"}</span>
            <span class="tx-item-wallet">${tx.wallet} • ${formatDateDMY(tx.date)}</span>
          </div>
        </div>
        <div class="tx-item-right">
          <span class="tx-item-amount ${amountClass}">${amountStr}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  lucide.createIcons();
}

// Hiển thị ngân sách thu nhỏ tại dashboard
function renderDashboardBudgets() {
  const container = document.getElementById("dashboardBudgetOverview");
  if (!container) return;

  const expenseCats = appState.categories.filter(c => c.type === "expense" && parseFloat(c.budget) > 0);
  if (expenseCats.length === 0) {
    container.innerHTML = `<div class="text-center text-gray-500 py-4 text-sm">Chưa thiết lập ngân sách chi tiêu nào. Sang mục Hạng Mục để cài đặt ngân sách.</div>`;
    return;
  }

  // Tính tiền đã tiêu trong tháng này cho từng hạng mục
  const now = new Date();
  const catSpending = {};
  appState.transactions.forEach(tx => {
    if (tx.type !== "expense" || !tx.date) return;
    const d = new Date(tx.date);
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      catSpending[tx.category] = (catSpending[tx.category] || 0) + (parseFloat(tx.amount) || 0);
    }
  });

  let html = `<div class="space-y-3">`;
  expenseCats.forEach(cat => {
    const spent = catSpending[cat.id] || 0;
    const budget = parseFloat(cat.budget) || 0;
    const pct = Math.min((spent / budget) * 100, 100).toFixed(0);
    
    let barColorClass = "budget-green";
    if (pct >= 90) barColorClass = "budget-red";
    else if (pct >= 70) barColorClass = "budget-yellow";

    html += `
      <div class="space-y-1">
        <div class="flex justify-between text-xs font-semibold">
          <div class="flex items-center gap-1">
            <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${cat.color}"></span>
            <span>${cat.name}</span>
          </div>
          <span class="text-gray-500">${pct}% (${formatCurrency(spent)} / ${formatCurrency(budget)})</span>
        </div>
        <div class="budget-progress-bar-container">
          <div class="budget-progress-bar-fill ${barColorClass}" style="width: ${pct}%; background-color: ${cat.color}"></div>
        </div>
      </div>
    `;
  });
  html += `</div>`;

  container.innerHTML = html;
}

// BỘ LỌC VÀ RENDER SỔ GIAO DỊCH (TRANSACTION LIST)
function renderTransactionsList() {
  const container = document.getElementById("transactionsList");
  if (!container) return;

  const dateFilter = document.getElementById("filterDate").value;
  const typeFilter = document.getElementById("filterType").value;
  const catFilter = document.getElementById("filterCategory").value;
  const searchQuery = document.getElementById("searchNote").value.toLowerCase().trim();

  // Populate danh sách hạng mục trong bộ lọc (nếu chưa có)
  populateFilterCategoryDropdown();

  // 1. Áp dụng các bộ lọc lên danh sách giao dịch
  let filtered = appState.transactions.filter(tx => {
    // Lọc theo loại
    if (typeFilter !== "all" && tx.type !== typeFilter) return false;
    
    // Lọc theo danh mục
    if (catFilter !== "all" && tx.category !== catFilter) return false;

    // Lọc theo từ khóa ghi chú
    if (searchQuery && (!tx.note || !tx.note.toLowerCase().includes(searchQuery))) return false;

    // Lọc theo thời gian
    if (!tx.date) return false;
    const txDate = new Date(tx.date);
    const now = new Date();

    if (dateFilter === "thisMonth") {
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    } else if (dateFilter === "lastMonth") {
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return txDate.getMonth() === lastMonth && txDate.getFullYear() === lastMonthYear;
    } else if (dateFilter === "today") {
      return txDate.toDateString() === now.toDateString();
    }
    
    return true; // "all"
  });

  // Sắp xếp giao dịch mới nhất lên đầu
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filtered.length === 0) {
    container.innerHTML = `<div class="text-center text-gray-500 py-12 glass-card">Không tìm thấy giao dịch nào khớp với bộ lọc.</div>`;
    return;
  }

  // 2. Gom nhóm giao dịch theo Ngày
  const groups = {};
  filtered.forEach(tx => {
    const dateStr = tx.date;
    if (!groups[dateStr]) {
      groups[dateStr] = {
        date: dateStr,
        transactions: [],
        netAmount: 0
      };
    }
    groups[dateStr].transactions.push(tx);
    const amt = parseFloat(tx.amount) || 0;
    if (tx.type === "income") {
      groups[dateStr].netAmount += amt;
    } else {
      groups[dateStr].netAmount -= amt;
    }
  });

  // Chuyển thành mảng và sắp xếp ngày giảm dần
  const sortedGroups = Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date));

  let html = "";
  sortedGroups.forEach(group => {
    const dateObj = new Date(group.date);
    const dayNum = dateObj.getDate();
    const dayName = dateObj.toLocaleDateString("vi-VN", { weekday: 'long' });
    const monthYear = `Tháng ${dateObj.getMonth() + 1}, ${dateObj.getFullYear()}`;
    
    const netSumStr = (group.netAmount >= 0 ? "+" : "") + formatCurrency(group.netAmount);
    const netClass = group.netAmount >= 0 ? "positive" : "negative";

    html += `
      <div class="date-group">
        <div class="date-group-header">
          <div class="date-group-title">
            <span class="date-day-num">${dayNum < 10 ? '0' + dayNum : dayNum}</span>
            <div class="flex flex-col">
              <span class="date-day-text text-[10px] tracking-wider">${dayName}</span>
              <span class="date-month-year text-[10px]">${formatDateDMY(group.date)}</span>
            </div>
          </div>
          <span class="date-group-summary ${netClass}">${netSumStr}</span>
        </div>
        
        <div class="space-y-2">
    `;

    group.transactions.forEach(tx => {
      const cat = getCategoryInfo(tx.category, appState.categories);
      const isTransfer = tx.category === "cat-transfer";
      const amountStr = isTransfer
        ? formatCurrency(tx.amount)
        : (tx.type === "income" ? "+" : "-") + formatCurrency(tx.amount);
      const amountClass = isTransfer ? "transfer" : tx.type;
      const transferBadge = isTransfer ? `<span class="transfer-badge">⇔ Chuyển ví</span>` : "";

      html += `
        <div class="tx-item" onclick="openTransactionModal('${tx.id}')">
          <div class="tx-item-left">
            <div class="tx-item-icon" style="background-color: ${cat.color}">
              <i data-lucide="${cat.icon}"></i>
            </div>
            <div class="tx-item-details">
              <div style="display:flex;align-items:center;gap:0.4rem">
                <span class="tx-item-category">${cat.name}</span>${transferBadge}
              </div>
              <span class="tx-item-note text-gray-500">${tx.note || "Không ghi chú"}</span>
              <span class="tx-item-wallet">${tx.wallet}</span>
            </div>
          </div>
          <div class="tx-item-right">
            <span class="tx-item-amount ${amountClass}">${amountStr}</span>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  lucide.createIcons();
}

function populateFilterCategoryDropdown() {
  const select = document.getElementById("filterCategory");
  const currentValue = select.value;
  select.innerHTML = '<option value="all">Tất cả hạng mục</option>';
  
  appState.categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = `${cat.type === "income" ? "[Thu]" : "[Chi]"} ${cat.name}`;
    select.appendChild(opt);
  });

  // Giữ lại lựa chọn cũ nếu còn tồn tại
  if (appState.categories.some(c => c.id === currentValue)) {
    select.value = currentValue;
  }
}

// Lắng nghe thay đổi bộ lọc giao dịch
document.getElementById("filterDate").addEventListener("change", renderTransactionsList);
document.getElementById("filterType").addEventListener("change", renderTransactionsList);
document.getElementById("filterCategory").addEventListener("change", renderTransactionsList);
document.getElementById("searchNote").addEventListener("input", renderTransactionsList);

// RENDER TAB HẠNG MỤC & NGÂN SÁCH (CATEGORIES)
function renderCategoriesTab() {
  const expenseGrid = document.getElementById("expenseCategoriesGrid");
  const incomeGrid = document.getElementById("incomeCategoriesGrid");
  if (!expenseGrid || !incomeGrid) return;

  expenseGrid.innerHTML = "";
  incomeGrid.innerHTML = "";

  // Tính chi tiêu cho ngân sách tháng này
  const now = new Date();
  const catSpending = {};
  appState.transactions.forEach(tx => {
    if (tx.type !== "expense" || !tx.date) return;
    const d = new Date(tx.date);
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      catSpending[tx.category] = (catSpending[tx.category] || 0) + (parseFloat(tx.amount) || 0);
    }
  });

  appState.categories.forEach(cat => {
    const grid = cat.type === "expense" ? expenseGrid : incomeGrid;
    
    let budgetInfoHtml = "";
    let borderStyle = "";
    
    if (cat.type === "expense") {
      const budget = parseFloat(cat.budget) || 0;
      const spent = catSpending[cat.id] || 0;
      
      if (budget > 0) {
        const pct = Math.min((spent / budget) * 100, 100).toFixed(0);
        let progressColor = "budget-green";
        if (pct >= 90) progressColor = "budget-red";
        else if (pct >= 70) progressColor = "budget-yellow";

        budgetInfoHtml = `
          <div class="mt-2 text-xs text-gray-500">
            <div class="flex justify-between font-semibold mb-1">
              <span>Đã tiêu: ${pct}%</span>
              <span>${formatCurrency(spent)} / ${formatCurrency(budget)}</span>
            </div>
            <div class="budget-progress-bar-container">
              <div class="budget-progress-bar-fill ${progressColor}" style="width: ${pct}%; background-color: ${cat.color}"></div>
            </div>
          </div>
        `;
      } else {
        budgetInfoHtml = `<div class="mt-2 text-xs text-gray-400 font-medium">Chưa thiết lập ngân sách tháng</div>`;
      }
      borderStyle = `border-left: 4px solid ${cat.color};`;
    } else {
      borderStyle = `border-left: 4px solid ${cat.color};`;
    }

    const card = document.createElement("div");
    card.className = "glass-card budget-card";
    card.style = borderStyle;
    card.innerHTML = `
      <div class="budget-card-header">
        <div class="budget-card-category">
          <div class="budget-card-icon" style="background-color: ${cat.color}">
            <i data-lucide="${cat.icon}"></i>
          </div>
          <span>${cat.name}</span>
        </div>
        <div class="budget-card-actions">
          <button class="btn btn-secondary btn-circle btn-sm" onclick="openCategoryModal('${cat.id}')">
            <i data-lucide="edit-2" style="width: 0.95rem; height: 0.95rem;"></i>
          </button>
        </div>
      </div>
      ${budgetInfoHtml}
    `;
    grid.appendChild(card);
  });

  lucide.createIcons();
}

// BẮT SỰ KIỆN XỬ LÝ SUBMIT FORMS
function setupFormHandlers() {
  // FORM GIAO DỊCH (THÊM / SỬA / XÓA)
  const txForm = document.getElementById("transactionForm");
  txForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const amount = parseInputAmount(document.getElementById("txAmount"));
    if (isNaN(amount) || amount <= 0) {
      showToast("Vui lòng nhập số tiền lớn hơn 0", "danger");
      return;
    }

    const txData = {
      id: appState.editingTransactionId || "tx-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
      type: document.getElementById("txType").value,
      category: document.getElementById("txCategory").value,
      amount: amount,
      date: document.getElementById("txDate").value,
      wallet: document.getElementById("txWallet").value,
      note: document.getElementById("txNote").value
    };

    // Kiểm tra số dư ví nếu loại giao dịch là Chi (expense)
    if (txData.type === "expense") {
      const currentBalance = getWalletBalance(txData.wallet, appState.editingTransactionId);
      if (amount > currentBalance) {
        showToast(`Số dư ví "${txData.wallet}" không đủ! (Khả dụng: ${formatCurrency(currentBalance)})`, "danger");
        return;
      }
    }

    closeAllModals();
    showToast("Đang ghi nhận giao dịch...", "warning");

    let response;
    if (appState.editingTransactionId) {
      response = await api.updateTransaction(txData);
    } else {
      response = await api.addTransaction(txData);
    }

    if (response.success) {
      showToast("Lưu giao dịch thành công!", "success");
    } else {
      showToast("Giao dịch được lưu ở bộ nhớ tạm cục bộ (Không thể đồng bộ ngay).", "warning");
    }

    await refreshData();
  });

  // XÓA GIAO DỊCH
  document.getElementById("btnDeleteTx").addEventListener("click", async () => {
    if (!appState.editingTransactionId) return;
    if (!confirm("Bạn có chắc chắn muốn xóa giao dịch này không?")) return;

    closeAllModals();
    showToast("Đang xóa giao dịch...", "warning");

    const response = await api.deleteTransaction(appState.editingTransactionId);
    if (response.success) {
      showToast("Đã xóa giao dịch!", "success");
    } else {
      showToast("Đã xóa ở bộ nhớ tạm cục bộ (Lỗi đồng bộ).", "warning");
    }
    
    await refreshData();
  });

  // FORM HẠNG MỤC (THÊM / SỬA / XÓA)
  const catForm = document.getElementById("categoryForm");
  catForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("catName").value.trim();
    if (!name) {
      showToast("Vui lòng điền tên hạng mục", "danger");
      return;
    }

    const catData = {
      id: appState.editingCategoryId || "cat-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
      name: name,
      type: document.getElementById("catType").value,
      color: appState.selectedCategoryColor,
      icon: appState.selectedCategoryIcon,
      budget: parseFloat(document.getElementById("catBudget").value) || 0
    };

    closeAllModals();
    showToast("Đang cập nhật hạng mục...", "warning");

    let response;
    if (appState.editingCategoryId) {
      response = await api.updateCategory(catData);
    } else {
      response = await api.addCategory(catData);
    }

    if (response.success) {
      showToast("Lưu hạng mục thành công!", "success");
    } else {
      showToast("Hạng mục đã lưu ở bộ nhớ tạm cục bộ.", "warning");
    }

    await refreshData();
    switchTab("categories");
  });

  // XÓA HẠNG MỤC
  document.getElementById("btnDeleteCat").addEventListener("click", async () => {
    if (!appState.editingCategoryId) return;
    
    // Ràng buộc cảnh báo nếu hạng mục có chứa giao dịch
    const hasTxs = appState.transactions.some(t => t.category === appState.editingCategoryId);
    let msg = "Bạn có chắc chắn muốn xóa hạng mục này không?";
    if (hasTxs) {
      msg = "Cảnh báo: Hạng mục này đã có các giao dịch phát sinh. Các giao dịch này sẽ hiển thị là 'Chưa phân loại'. Bạn vẫn muốn xóa?";
    }

    if (!confirm(msg)) return;

    closeAllModals();
    showToast("Đang xóa hạng mục...", "warning");

    const response = await api.deleteCategory(appState.editingCategoryId);
    if (response.success) {
      showToast("Đã xóa hạng mục!", "success");
    } else {
      showToast("Đã xóa ở bộ nhớ tạm cục bộ.", "warning");
    }
    
    await refreshData();
    switchTab("categories");
  });
}

// CÀI ĐẶT KẾT NỐI GOOGLE SHEETS
function setupSettingsHandlers() {
  const urlInput = document.getElementById("sheetUrlInput");
  const testBtn = document.getElementById("btnTestConnection");
  const syncBtn = document.getElementById("btnSyncLocalToSheet");
  const disconnectBtn = document.getElementById("btnDisconnectSheet");

  // Hiển thị cấu hình cũ (nếu có)
  urlInput.value = api.getSheetUrl();
  updateSyncStatus(api.isOffline ? "offline" : "synced");

  if (!api.isOffline) {
    disconnectBtn.style.display = "inline-flex";
    syncBtn.style.display = "inline-flex";
  } else {
    disconnectBtn.style.display = "none";
    syncBtn.style.display = "none";
  }

  // KIỂM TRA & LƯU URL KẾT NỐI
  testBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    if (!url) {
      showToast("Vui lòng dán Web App URL của Google Apps Script", "danger");
      return;
    }

    testBtn.disabled = true;
    testBtn.textContent = "Đang kiểm tra...";
    showToast("Đang kết nối đến Google Sheets...", "warning");

    const testRes = await api.testConnection(url);
    testBtn.disabled = false;
    testBtn.textContent = "Kiểm tra & Kết nối";

    if (testRes.success) {
      api.setSheetUrl(url);
      showToast("Kết nối thành công! Đã lưu liên kết.", "success");
      
      // Nếu Sheets trống trơn (mới khởi tạo), đề xuất đồng bộ đẩy dữ liệu local lên
      const remoteTxs = testRes.data.Transactions || [];
      const localTxs = api.getLocalTransactions();
      
      if (remoteTxs.length === 0 && localTxs.length > 0) {
        if (confirm("Phát hiện Google Sheet của bạn đang trống nhưng bạn có dữ liệu ghi chép cục bộ trước đó trên ứng dụng này. Bạn có muốn đồng bộ đẩy toàn bộ dữ liệu cục bộ lên Google Sheet không?")) {
          showToast("Đang đồng bộ dữ liệu lên Sheets...", "warning");
          const syncRes = await api.syncLocalToSheet();
          if (syncRes.success) {
            showToast("Đồng bộ dữ liệu cục bộ lên Google Sheet thành công!", "success");
          } else {
            showToast("Lỗi đồng bộ dữ liệu lên Google Sheet", "danger");
          }
        }
      }

      disconnectBtn.style.display = "inline-flex";
      syncBtn.style.display = "inline-flex";
      
      await refreshData();
    } else {
      showToast(testRes.error, "danger");
    }
  });

  // HỦY KẾT NỐI
  disconnectBtn.addEventListener("click", () => {
    if (confirm("Bạn có chắc chắn muốn ngắt kết nối với Google Sheet hiện tại? Ứng dụng sẽ chuyển về chế độ ngoại tuyến sử dụng Local Storage.")) {
      api.setSheetUrl("");
      urlInput.value = "";
      disconnectBtn.style.display = "none";
      syncBtn.style.display = "none";
      showToast("Đã ngắt kết nối thành công. Ứng dụng hoạt động ngoại tuyến.", "success");
      refreshData();
    }
  });

  // ĐỒNG BỘ CƯỠNG CHẾ LÊN SHEETS
  syncBtn.addEventListener("click", async () => {
    syncBtn.disabled = true;
    syncBtn.textContent = "Đang đồng bộ...";
    showToast("Đang đồng bộ toàn bộ dữ liệu...", "warning");

    const response = await api.syncLocalToSheet();
    syncBtn.disabled = false;
    syncBtn.textContent = "Đẩy dữ liệu Local lên Sheet";

    if (response.success) {
      showToast("Đồng bộ dữ liệu thành công lên Google Sheets!", "success");
      await refreshData();
    } else {
      showToast("Đồng bộ thất bại: " + response.error, "danger");
    }
  });

  // COPY MÃ APPS SCRIPT
  const copyBtn = document.getElementById("copyScriptBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      // Lấy code từ phần hướng dẫn
      const scriptCode = document.getElementById("appsScriptCode").textContent;
      navigator.clipboard.writeText(scriptCode)
        .then(() => {
          showToast("Đã sao chép mã nguồn Apps Script!", "success");
        })
        .catch(err => {
          showToast("Không thể tự động sao chép. Vui lòng chọn bôi đen mã nguồn để copy.", "danger");
        });
    });
  }
}

// MỞ MODAL CHUYỂN VÍ
function openTransferModal(txId = null) {
  const modal = document.getElementById("transferModal");
  const form = document.getElementById("transferForm");
  const deleteBtn = document.getElementById("btnDeleteTransfer");
  const title = modal.querySelector(".modal-title");

  form.reset();

  // Set ngày mặc định là hôm nay
  const today = formatDateForInput(new Date());
  document.getElementById("transferDate").value = today;

  if (txId) {
    // Tìm giao dịch hiện tại được click
    const clickedTx = appState.transactions.find(t => t.id === txId);
    if (!clickedTx) {
      showToast("Không tìm thấy dữ liệu giao dịch", "danger");
      return;
    }

    let txOut = null;
    let txIn = null;
    let groupId = "";

    // Thử trích xuất group ID từ ID của giao dịch click
    if (txId.startsWith("tx-transfer-")) {
      groupId = txId.replace("tx-transfer-", "").replace("-out", "").replace("-in", "");
      txOut = appState.transactions.find(t => t.id === `tx-transfer-${groupId}-out`);
      txIn = appState.transactions.find(t => t.id === `tx-transfer-${groupId}-in`);
    }

    // Nếu không tìm thấy bằng ID, tìm bằng thuộc tính tương đồng
    if (!txOut || !txIn) {
      if (clickedTx.type === "expense") {
        txOut = clickedTx;
        txIn = appState.transactions.find(t => 
          t.category === "cat-transfer" && 
          t.type === "income" && 
          t.date === clickedTx.date && 
          Math.abs((parseFloat(t.amount) || 0) - (parseFloat(clickedTx.amount) || 0)) < 0.01 && 
          t.id !== clickedTx.id
        );
      } else {
        txIn = clickedTx;
        txOut = appState.transactions.find(t => 
          t.category === "cat-transfer" && 
          t.type === "expense" && 
          t.date === clickedTx.date && 
          Math.abs((parseFloat(t.amount) || 0) - (parseFloat(clickedTx.amount) || 0)) < 0.01 && 
          t.id !== clickedTx.id
        );
      }
    }

    if (txOut && txIn) {
      // Xác định groupId để dùng khi lưu hoặc xóa
      if (!groupId) {
        groupId = txOut.id.replace("tx-", "").replace("-out", "");
      }
      appState.editingTransferId = groupId;

      // Điền thông tin vào form
      document.getElementById("transferFrom").value = txOut.wallet;
      document.getElementById("transferTo").value = txIn.wallet;
      document.getElementById("transferAmount").value = txOut.amount ? formatNumber(parseFloat(txOut.amount)) : "";
      document.getElementById("transferDate").value = formatDateForInput(txOut.date);

      // Trích xuất ghi chú gốc (bỏ hậu tố " (Chuyển sang...)" hoặc " (Nhận từ...)")
      let originalNote = txOut.note || "";
      const suffix = ` (Chuyển sang ${txIn.wallet})`;
      if (originalNote.endsWith(suffix)) {
        originalNote = originalNote.substring(0, originalNote.length - suffix.length);
      }
      document.getElementById("transferNote").value = originalNote;

      if (deleteBtn) deleteBtn.style.display = "inline-flex";
      if (title) title.innerHTML = `<i data-lucide="repeat"></i> Chỉnh sửa chuyển ví`;
    } else {
      // Nếu là giao dịch chuyển ví đơn lẻ không tìm thấy đối ứng
      showToast("Không tìm thấy giao dịch đối ứng. Chuyển sang chỉnh sửa đơn lẻ.", "warning");
      closeAllModals();
      // Mở modal chỉnh sửa giao dịch tiêu chuẩn
      openTransactionModal(txId);
      return;
    }
  } else {
    // Thêm mới chuyển ví
    appState.editingTransferId = null;
    if (deleteBtn) deleteBtn.style.display = "none";
    if (title) title.innerHTML = `<i data-lucide="repeat"></i> Chuyển tiền giữa các ví`;
    
    // Đặt mặc định ví gửi khác ví nhận
    document.getElementById("transferFrom").value = "Tiền mặt";
    document.getElementById("transferTo").value = "Ngân hàng";
  }

  modal.classList.add("active");
  lucide.createIcons();
}

// LẤY SỐ DƯ HIỆN TẠI CỦA VÍ (HỖ TRỢ LOẠI TRỪ GIAO DỊCH ĐANG CHỈNH SỬA)
function getWalletBalance(walletName, excludeTxId = null) {
  let balance = 0;
  appState.transactions.forEach(tx => {
    if (excludeTxId && tx.id === excludeTxId) return;

    let walletKey = tx.wallet;
    if (!walletKey) return;
    
    // Chuẩn hóa tên ví tương tự như khi vẽ thẻ ví
    if (walletKey.startsWith("Ngân hàng")) walletKey = "Ngân hàng";
    else if (walletKey.startsWith("Ví điện tử")) walletKey = "Ví điện tử";
    else if (walletKey.startsWith("Tiền mặt")) walletKey = "Tiền mặt";
    else if (walletKey.startsWith("Thẻ tín dụng")) walletKey = "Thẻ tín dụng";

    if (walletKey === walletName) {
      const amount = parseFloat(tx.amount) || 0;
      if (tx.type === "income") balance += amount;
      else balance -= amount;
    }
  });
  return balance;
}

// KHỞI TẠO BỘ XỬ LÝ SỰ KIỆN CHUYỂN VÍ
function setupTransferHandlers() {
  const transferForm = document.getElementById("transferForm");
  if (!transferForm) return;

  transferForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fromWallet = document.getElementById("transferFrom").value;
    const toWallet = document.getElementById("transferTo").value;
    const amount = parseInputAmount(document.getElementById("transferAmount"));
    const date = document.getElementById("transferDate").value;
    const note = document.getElementById("transferNote").value.trim();

    if (fromWallet === toWallet) {
      showToast("Ví gửi và ví nhận phải khác nhau!", "danger");
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      showToast("Vui lòng nhập số tiền lớn hơn 0", "danger");
      return;
    }

    // Kiểm tra số dư ví gửi
    const excludeTxId = appState.editingTransferId ? `tx-transfer-${appState.editingTransferId}-out` : null;
    const currentBalance = getWalletBalance(fromWallet, excludeTxId);

    if (amount > currentBalance) {
      showToast(`Số dư ví "${fromWallet}" không đủ để chuyển! (Khả dụng: ${formatCurrency(currentBalance)})`, "danger");
      return;
    }

    closeAllModals();
    showToast("Đang ghi nhận chuyển ví...", "warning");

    // Tạo ID nhóm chuyển ví
    const transferGroupId = appState.editingTransferId || "transfer-" + Date.now();

    // 1. Giao dịch đi (out) từ ví gửi - loại Chi (expense)
    const txOut = {
      id: `tx-transfer-${transferGroupId}-out`,
      type: "expense",
      category: "cat-transfer",
      amount: amount,
      date: date,
      wallet: fromWallet,
      note: note ? `${note} (Chuyển sang ${toWallet})` : `Chuyển sang ${toWallet}`
    };

    // 2. Giao dịch đến (in) vào ví nhận - loại Thu (income)
    const txIn = {
      id: `tx-transfer-${transferGroupId}-in`,
      type: "income",
      category: "cat-transfer",
      amount: amount,
      date: date,
      wallet: toWallet,
      note: note ? `${note} (Nhận từ ${fromWallet})` : `Nhận từ ${fromWallet}`
    };

    let resOut, resIn;
    if (appState.editingTransferId) {
      // Khi cập nhật chuyển ví, sửa cả hai giao dịch
      resOut = await api.updateTransaction(txOut);
      resIn = await api.updateTransaction(txIn);
    } else {
      // Khi tạo mới chuyển ví, lưu cả hai giao dịch
      resOut = await api.addTransaction(txOut);
      resIn = await api.addTransaction(txIn);
    }

    if (resOut.success && resIn.success) {
      showToast("Giao dịch chuyển ví thành công!", "success");
    } else {
      showToast("Chuyển ví đã lưu ở bộ nhớ tạm cục bộ.", "warning");
    }

    await refreshData();
  });

  // Nút Xóa chuyển ví
  const deleteBtn = document.getElementById("btnDeleteTransfer");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      const transferGroupId = appState.editingTransferId;
      if (!transferGroupId) return;

      if (!confirm("Bạn có chắc chắn muốn xóa giao dịch chuyển ví này?")) return;

      closeAllModals();
      showToast("Đang xóa giao dịch chuyển ví...", "warning");

      // Xóa cả 2 giao dịch liên quan
      const resOut = await api.deleteTransaction(`tx-transfer-${transferGroupId}-out`);
      const resIn = await api.deleteTransaction(`tx-transfer-${transferGroupId}-in`);

      if (resOut.success && resIn.success) {
        showToast("Đã xóa giao dịch chuyển ví thành công!", "success");
      } else {
        showToast("Đã xóa ở bộ nhớ tạm cục bộ.", "warning");
      }

      await refreshData();
    });
  }
}

// HIỂN THỊ SỐ DƯ TỪNG VÍ TRÊN DASHBOARD
function renderWalletCards() {
  const container = document.getElementById("walletCardsRow");
  if (!container) return;

  const wrapper = document.getElementById("walletSectionWrapper");
  if (wrapper) {
    if (appState.wallets.length === 0) {
      wrapper.style.display = "none";
      return;
    } else {
      wrapper.style.display = "block";
    }
  }

  const walletDefs = appState.wallets;

  // Khởi tạo bộ đếm cho mỗi ví
  const walletData = {};
  walletDefs.forEach(w => {
    walletData[w.name] = { income: 0, expense: 0 };
  });

  // Gộp tất cả giao dịch theo ví
  appState.transactions.forEach(tx => {
    let walletKey = tx.wallet;
    if (!walletKey) return;
    
    // Chuẩn hóa tên ví dựa trên chuỗi bắt đầu (hỗ trợ dữ liệu cũ)
    if (walletKey.startsWith("Ngân hàng")) walletKey = "Ngân hàng";
    else if (walletKey.startsWith("Ví điện tử")) walletKey = "Ví điện tử";
    else if (walletKey.startsWith("Tiền mặt")) walletKey = "Tiền mặt";
    else if (walletKey.startsWith("Thẻ tín dụng")) walletKey = "Thẻ tín dụng";

    if (!walletData[walletKey]) return;
    const amount = parseFloat(tx.amount) || 0;
    if (tx.type === "income") walletData[walletKey].income += amount;
    else walletData[walletKey].expense += amount;
  });

  let html = "";
  walletDefs.forEach(w => {
    const d = walletData[w.name] || { income: 0, expense: 0 };
    const balance = d.income - d.expense;
    const balClass = balance >= 0 ? "positive" : "negative";
    html += `
      <div class="wallet-card glass-card">
        <div class="wallet-card-header">
          <div class="wallet-card-icon" style="background: linear-gradient(135deg, ${w.color}, ${w.color}cc)">
            <i data-lucide="${w.icon}"></i>
          </div>
          <span class="wallet-card-label">${w.name}</span>
        </div>
        <div class="wallet-card-balance ${balClass}">${formatCurrency(balance)}</div>
        <div class="wallet-card-details">
          <span class="wallet-detail-item income-detail">
            <i data-lucide="arrow-up-right" style="width:0.75rem;height:0.75rem"></i>
            ${formatCurrency(d.income)}
          </span>
          <span class="wallet-detail-item expense-detail">
            <i data-lucide="arrow-down-left" style="width:0.75rem;height:0.75rem"></i>
            ${formatCurrency(d.expense)}
          </span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  lucide.createIcons();
}

// THÔNG BÁO BẰNG TOASTS
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let iconName = "info";
  if (type === "success") iconName = "check-circle";
  else if (type === "danger") iconName = "alert-triangle";
  else if (type === "warning") iconName = "loader";

  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  lucide.createIcons();

  // Hiệu ứng slide in
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  // Tự hủy sau 3.5 giây
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

// BỘ CHỌN BIỂU TƯỢNG VÀ MÀU SẮC CHO VÍ
function renderWalletIconPicker() {
  const container = document.getElementById("walletIconPickerGrid");
  if (!container) return;
  container.innerHTML = "";
  
  AVAILABLE_ICONS.forEach(iconName => {
    const item = document.createElement("div");
    item.className = "icon-picker-item wallet-icon-item";
    item.setAttribute("data-icon", iconName);
    item.innerHTML = `<i data-lucide="${iconName}"></i>`;
    item.addEventListener("click", () => selectWalletIconPickerItem(iconName));
    container.appendChild(item);
  });
  lucide.createIcons();
}

function selectWalletIconPickerItem(iconName) {
  appState.selectedWalletIcon = iconName;
  document.querySelectorAll(".wallet-icon-item").forEach(item => {
    item.classList.remove("selected");
    if (item.getAttribute("data-icon") === iconName) {
      item.classList.add("selected");
    }
  });
}

function renderWalletColorPicker() {
  const container = document.getElementById("walletColorPickerGrid");
  if (!container) return;
  container.innerHTML = "";

  AVAILABLE_COLORS.forEach(color => {
    const item = document.createElement("div");
    item.className = "color-picker-item wallet-color-item";
    item.style.backgroundColor = color;
    item.setAttribute("data-color", color);
    item.addEventListener("click", () => selectWalletColorPickerItem(color));
    container.appendChild(item);
  });
}

function selectWalletColorPickerItem(color) {
  appState.selectedWalletColor = color;
  document.querySelectorAll(".wallet-color-item").forEach(item => {
    item.classList.remove("selected");
    item.innerHTML = "";
    if (item.getAttribute("data-color") === color) {
      item.classList.add("selected");
      item.innerHTML = `<i data-lucide="check" style="color: white; width: 1rem; height: 1rem;"></i>`;
    }
  });
  lucide.createIcons();
}

// HIỂN THỊ DANH SÁCH QUẢN LÝ VÍ TRONG CÀI ĐẶT
function renderWalletsSettings() {
  const container = document.getElementById("walletsManagementGrid");
  if (!container) return;

  container.innerHTML = "";

  if (appState.wallets.length === 0) {
    container.innerHTML = `<div class="text-center text-gray-500 py-4 text-sm col-span-full">Chưa có ví tài khoản nào.</div>`;
    return;
  }

  appState.wallets.forEach(w => {
    const card = document.createElement("div");
    card.className = "glass-card budget-card";
    card.style = `border-left: 4px solid ${w.color};`;
    card.innerHTML = `
      <div class="budget-card-header">
        <div class="budget-card-category">
          <div class="budget-card-icon" style="background-color: ${w.color}">
            <i data-lucide="${w.icon}"></i>
          </div>
          <span>${w.name}</span>
        </div>
        <div class="budget-card-actions">
          <button class="btn btn-secondary btn-circle btn-sm" onclick="openWalletModal('${w.id}')">
            <i data-lucide="edit-2" style="width: 0.95rem; height: 0.95rem;"></i>
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  lucide.createIcons();
}

// MỞ MODAL VÍ
function openWalletModal(walletId = null) {
  appState.editingWalletId = walletId;
  const modal = document.getElementById("walletModal");
  const title = document.getElementById("walletModalTitle");
  const deleteBtn = document.getElementById("btnDeleteWallet");
  const form = document.getElementById("walletForm");

  form.reset();

  if (walletId) {
    title.textContent = "Chỉnh sửa Ví tài khoản";
    if (deleteBtn) deleteBtn.style.display = "inline-flex";

    const wallet = appState.wallets.find(w => w.id === walletId);
    if (wallet) {
      document.getElementById("walletName").value = wallet.name;
      appState.selectedWalletColor = wallet.color;
      appState.selectedWalletIcon = wallet.icon;
    }
  } else {
    title.textContent = "Thêm Ví Mới";
    if (deleteBtn) deleteBtn.style.display = "none";
    appState.selectedWalletColor = AVAILABLE_COLORS[0];
    appState.selectedWalletIcon = AVAILABLE_ICONS[0];
  }

  selectWalletIconPickerItem(appState.selectedWalletIcon);
  selectWalletColorPickerItem(appState.selectedWalletColor);

  modal.classList.add("active");
}

// THIẾT LẬP CÁC TRÌNH ĐIỀU KHIỂN VÍ
function setupWalletHandlers() {
  const walletForm = document.getElementById("walletForm");
  if (!walletForm) return;

  walletForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("walletName").value.trim();
    if (!name) {
      showToast("Vui lòng điền tên ví tài khoản", "danger");
      return;
    }

    // Check trùng tên với ví khác
    const duplicate = appState.wallets.find(w => w.name.toLowerCase() === name.toLowerCase() && w.id !== appState.editingWalletId);
    if (duplicate) {
      showToast("Tên ví này đã tồn tại!", "danger");
      return;
    }

    closeAllModals();
    showToast("Đang cập nhật ví tài khoản...", "warning");

    const walletData = {
      id: appState.editingWalletId || "wallet-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
      name: name,
      color: appState.selectedWalletColor,
      icon: appState.selectedWalletIcon
    };

    let response;
    if (appState.editingWalletId) {
      // Đổi tên ví: cập nhật giao dịch cũ liên quan
      const oldWallet = appState.wallets.find(w => w.id === appState.editingWalletId);
      if (oldWallet && oldWallet.name !== name) {
        const oldName = oldWallet.name;
        const txUpdates = appState.transactions.filter(t => t.wallet === oldName);
        if (txUpdates.length > 0) {
          showToast(`Đang cập nhật tên ví cho ${txUpdates.length} giao dịch...`, "warning");
          for (let tx of txUpdates) {
            tx.wallet = name;
            await api.updateTransaction(tx);
          }
        }
      }
      response = await api.updateWallet(walletData);
    } else {
      response = await api.addWallet(walletData);
    }

    if (response.success) {
      if (response.source === "local_only_unsynced") {
        showToast("Ví đã lưu cục bộ (Hãy cập nhật Apps Script để đồng bộ).", "warning");
      } else {
        showToast("Lưu ví tài khoản thành công!", "success");
      }
    } else {
      showToast("Đã lưu ví ở bộ nhớ tạm cục bộ.", "warning");
    }

    await refreshData();
  });

  const deleteBtn = document.getElementById("btnDeleteWallet");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      const walletId = appState.editingWalletId;
      if (!walletId) return;

      const walletToDelete = appState.wallets.find(w => w.id === walletId);
      if (!walletToDelete) return;

      const hasTxs = appState.transactions.some(t => t.wallet === walletToDelete.name);
      let msg = `Bạn có chắc chắn muốn xóa ví "${walletToDelete.name}" không?`;
      if (hasTxs) {
        msg = `Cảnh báo: Ví "${walletToDelete.name}" đang chứa các giao dịch phát sinh. Các giao dịch này vẫn được giữ lại trong lịch sử nhưng không còn liên kết động trên Dashboard. Bạn vẫn muốn xóa?`;
      }

      if (!confirm(msg)) return;

      closeAllModals();
      showToast("Đang xóa ví...", "warning");

      const response = await api.deleteWallet(walletId);
      if (response.success) {
        if (response.source === "local_only_unsynced") {
          showToast("Ví đã xóa cục bộ (Hãy nâng cấp Apps Script).", "warning");
        } else {
          showToast("Đã xóa ví thành công!", "success");
        }
      } else {
        showToast("Đã xóa ở bộ nhớ tạm cục bộ.", "warning");
      }

      await refreshData();
    });
  }
}

// ĐỒNG BỘ CÁC DROPDOWN VÍ ĐỘNG
function populateWalletDropdowns() {
  const txWalletSelect = document.getElementById("txWallet");
  const transferFromSelect = document.getElementById("transferFrom");
  const transferToSelect = document.getElementById("transferTo");

  if (txWalletSelect) {
    const prevVal = txWalletSelect.value;
    txWalletSelect.innerHTML = "";
    appState.wallets.forEach(w => {
      const opt = document.createElement("option");
      opt.value = w.name;
      opt.textContent = w.name;
      txWalletSelect.appendChild(opt);
    });
    if (prevVal && appState.wallets.some(w => w.name === prevVal)) {
      txWalletSelect.value = prevVal;
    }
  }

  if (transferFromSelect && transferToSelect) {
    const fromVal = transferFromSelect.value;
    const toVal = transferToSelect.value;

    transferFromSelect.innerHTML = "";
    transferToSelect.innerHTML = "";

    appState.wallets.forEach(w => {
      // Từ ví
      const optFrom = document.createElement("option");
      optFrom.value = w.name;
      optFrom.textContent = w.name;
      transferFromSelect.appendChild(optFrom);

      // Đến ví
      const optTo = document.createElement("option");
      optTo.value = w.name;
      optTo.textContent = w.name;
      transferToSelect.appendChild(optTo);
    });

    if (fromVal && appState.wallets.some(w => w.name === fromVal)) {
      transferFromSelect.value = fromVal;
    } else if (appState.wallets.length > 0) {
      transferFromSelect.value = appState.wallets[0].name;
    }

    if (toVal && appState.wallets.some(w => w.name === toVal)) {
      transferToSelect.value = toVal;
    } else if (appState.wallets.length > 1) {
      transferToSelect.value = appState.wallets[1].name;
    }
  }

  // Cập nhật ví ở form nợ/trả nợ
  populateDebtWalletDropdowns();
}

// KHỞI TẠO ĐIỀU HƯỚNG BÁO CÁO TÀI CHÍNH CON (SUB-TABS)
function setupReportsSubNavigation() {
  const tabs = document.querySelectorAll(".reports-sub-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const target = tab.getAttribute("data-sub-tab");
      document.querySelectorAll(".reports-sub-view").forEach(view => {
        view.style.display = "none";
      });

      const activeView = document.getElementById(`reports${capitalizeFirstLetter(target)}View`);
      if (activeView) {
        activeView.style.display = "block";
      }

      // Vẽ dữ liệu báo cáo tương ứng
      renderActiveReportView(target);
    });
  });

  // Lắng nghe thay đổi lọc tháng của báo cáo tài chính
  const monthFilter = document.getElementById("reportMonthFilter");
  if (monthFilter) {
    monthFilter.addEventListener("change", () => {
      const activeTab = document.querySelector(".reports-sub-tab.active");
      if (activeTab) {
        const target = activeTab.getAttribute("data-sub-tab");
        renderActiveReportView(target);
      }
    });
  }
}

function capitalizeFirstLetter(string) {
  return string.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

// HIỂN THỊ VIEW BÁO CÁO ĐANG MỞ
function renderActiveReportView(tabKey) {
  if (tabKey === "structure") {
    setTimeout(() => {
      updateAppCharts(appState.transactions, appState.categories);
    }, 50);
  } else if (tabKey === "balance-sheet") {
    generateBalanceSheet();
  } else if (tabKey === "income-statement") {
    generateIncomeStatement();
  } else if (tabKey === "cash-flow") {
    generateCashFlowStatement();
  }
}

// TẠO BỘ LỌC THÁNG CHO BÁO CÁO ĐỘNG TỪ GIAO DỊCH
function populateReportMonthFilter() {
  const select = document.getElementById("reportMonthFilter");
  if (!select) return;

  const currentSelection = select.value;
  select.innerHTML = "";

  const months = new Set();
  const now = new Date();
  
  // Mặc định luôn có tháng hiện tại
  months.add(`${now.getMonth() + 1}/${now.getFullYear()}`);

  appState.transactions.forEach(tx => {
    if (!tx.date) return;
    const d = new Date(tx.date);
    months.add(`${d.getMonth() + 1}/${d.getFullYear()}`);
  });

  const sortedMonths = Array.from(months).sort((a, b) => {
    const [mA, yA] = a.split("/").map(Number);
    const [mB, yB] = b.split("/").map(Number);
    return new Date(yB, mB - 1) - new Date(yA, mA - 1);
  });

  sortedMonths.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = `Tháng ${m}`;
    select.appendChild(opt);
  });

  if (currentSelection && sortedMonths.includes(currentSelection)) {
    select.value = currentSelection;
  } else {
    select.value = `${now.getMonth() + 1}/${now.getFullYear()}`;
  }
}

// BCTC 1: BẢNG CÂN ĐỐI KẾ TOÁN (BALANCE SHEET)
function generateBalanceSheet() {
  const container = document.getElementById("balanceSheetContainer");
  if (!container) return;

  // Đọc kỳ báo cáo
  const filterVal = document.getElementById("reportMonthFilter").value || "";
  const parts = filterVal.split("/");
  const now = new Date();
  const month = parts.length === 2 ? parseInt(parts[0], 10) : now.getMonth() + 1;
  const year = parts.length === 2 ? parseInt(parts[1], 10) : now.getFullYear();

  // Xác định ngày cuối kỳ báo cáo (ngày cuối cùng của tháng đã chọn)
  const cutoffDate = new Date(year, month, 0, 23, 59, 59);

  // Tính số dư của từng ví tại thời điểm cutoffDate
  const getWalletBalanceAsOf = (walletName) => {
    let balance = 0;
    appState.transactions.forEach(tx => {
      if (!tx.date) return;
      const txDate = new Date(tx.date);
      if (txDate > cutoffDate) return;

      let walletKey = tx.wallet;
      if (!walletKey) return;
      
      if (walletKey.startsWith("Ngân hàng")) walletKey = "Ngân hàng";
      else if (walletKey.startsWith("Ví điện tử")) walletKey = "Ví điện tử";
      else if (walletKey.startsWith("Tiền mặt")) walletKey = "Tiền mặt";
      else if (walletKey.startsWith("Thẻ tín dụng")) walletKey = "Thẻ tín dụng";

      if (walletKey === walletName) {
        const amount = parseFloat(tx.amount) || 0;
        if (tx.type === "income") balance += amount;
        else balance -= amount;
      }
    });
    return balance;
  };

  // 1. Phân loại tài sản (ví có số dư dương) & Nợ (ví có số dư âm)
  let cashAssets = [];
  let creditLiabilities = [];
  let totalCash = 0;
  let totalCredit = 0;

  appState.wallets.forEach(w => {
    const bal = getWalletBalanceAsOf(w.name);
    if (bal >= 0) {
      cashAssets.push({ name: w.name, amount: bal });
      totalCash += bal;
    } else {
      creditLiabilities.push({ name: w.name, amount: Math.abs(bal) });
      totalCredit += Math.abs(bal);
    }
  });

  // 2. Tính toán các khoản phải thu/phải trả từ bảng Debts lũy kế đến cutoffDate
  let borrowings = 0;
  let receivables = 0;
  const cutoffStr = formatDateForInput(cutoffDate);

  appState.debts.forEach(d => {
    // Chỉ tính các khoản nợ được tạo trước hoặc bằng ngày cutoff
    if (d.date && d.date <= cutoffStr) {
      // Tính số tiền đã trả cho khoản nợ này tính đến ngày cutoff
      const repayments = appState.transactions.filter(t => 
        t.id.startsWith(`tx-debt-repay-${d.id}-`) && 
        t.date && t.date <= cutoffStr
      );
      const paidAmount = repayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
      const remaining = Math.max(0, (parseFloat(d.amount) || 0) - paidAmount);

      if (d.type === "borrow") {
        borrowings += remaining;
      } else if (d.type === "lend") {
        receivables += remaining;
      }
    }
  });

  const totalAssets = totalCash + receivables;
  const totalLiabilities = totalCredit + borrowings;
  const netWorth = totalAssets - totalLiabilities;

  let html = `
    <table class="fin-table">
      <thead>
        <tr>
          <th>HẠNG MỤC TÀI SẢN & NỢ</th>
          <th class="text-right">MÃ SỐ</th>
          <th class="text-right">SỐ CUỐI KỲ TẠI ${cutoffDate.toLocaleDateString("vi-VN")} (₫)</th>
        </tr>
      </thead>
      <tbody>
        <!-- TÀI SẢN -->
        <tr class="header-row">
          <td>A. TÀI SẢN (ASSETS)</td>
          <td class="text-right">100</td>
          <td class="text-right">${formatNumber(totalAssets)}</td>
        </tr>
        <tr>
          <td class="indent-1">I. Tiền và các khoản tương đương tiền</td>
          <td class="text-right">110</td>
          <td class="text-right">${formatNumber(totalCash)}</td>
        </tr>
  `;

  cashAssets.forEach((c, idx) => {
    html += `
        <tr>
          <td class="indent-2">1. Tiền gửi tại ví: ${c.name}</td>
          <td class="text-right">11${idx+1}</td>
          <td class="text-right">${formatNumber(c.amount)}</td>
        </tr>
    `;
  });

  if (receivables > 0) {
    html += `
        <tr>
          <td class="indent-1">II. Các khoản phải thu ngắn hạn (Cho vay/Phải thu)</td>
          <td class="text-right">120</td>
          <td class="text-right">${formatNumber(receivables)}</td>
        </tr>
    `;
  }

  html += `
        <!-- NỢ PHẢI TRẢ -->
        <tr class="header-row">
          <td>B. NỢ PHẢI TRẢ (LIABILITIES)</td>
          <td class="text-right">200</td>
          <td class="text-right">${formatNumber(totalLiabilities)}</td>
        </tr>
  `;

  if (totalCredit > 0) {
    html += `
        <tr>
          <td class="indent-1">I. Nợ thẻ tín dụng / Số dư âm ví</td>
          <td class="text-right">210</td>
          <td class="text-right">${formatNumber(totalCredit)}</td>
        </tr>
    `;
    creditLiabilities.forEach((c, idx) => {
      html += `
        <tr>
          <td class="indent-2">1. Nợ thẻ: ${c.name}</td>
          <td class="text-right">21${idx+1}</td>
          <td class="text-right">${formatNumber(c.amount)}</td>
        </tr>
      `;
    });
  }

  if (borrowings > 0) {
    html += `
        <tr>
          <td class="indent-1">II. Các khoản đi vay (Nợ cá nhân/Nợ vay ngắn hạn)</td>
          <td class="text-right">220</td>
          <td class="text-right">${formatNumber(borrowings)}</td>
        </tr>
    `;
  }

  if (totalLiabilities === 0) {
    html += `
        <tr>
          <td class="indent-1 text-gray-400">Không ghi nhận khoản nợ nào</td>
          <td class="text-right">-</td>
          <td class="text-right">0</td>
        </tr>
    `;
  }

  // TÀI SẢN THUẦN
  html += `
        <tr class="grand-total-row">
          <td>C. TÀI SẢN THUẦN / VỐN CHỦ SỞ HỮU (NET WORTH / EQUITY)</td>
          <td class="text-right">300</td>
          <td class="text-right">${formatNumber(netWorth)}</td>
        </tr>
      </tbody>
    </table>
  `;

  // Đo lường sức khỏe tài chính
  const equityRatio = totalAssets > 0 ? (netWorth / totalAssets) * 100 : 0;
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  const liquidityRatio = totalLiabilities > 0 ? (totalCash / totalLiabilities) : (totalCash > 0 ? 999 : 0);

  let debtComment = "Cấu trúc vốn tối ưu, không chịu rủi ro đòn bẩy.";
  if (debtRatio > 50) debtComment = "Tỷ lệ nợ cao vượt ngưỡng an toàn. Cần thanh toán bớt các khoản nợ.";
  else if (debtRatio > 30) debtComment = "Đòn bẩy tài chính ở mức trung bình. Hãy kiểm soát chặt chẽ.";

  let liqComment = "Khả năng thanh toán nhanh cực kỳ tốt.";
  if (liquidityRatio < 1.0) liqComment = "Cảnh báo thanh khoản! Tiền mặt không đủ bao phủ nợ ngắn hạn.";
  else if (liquidityRatio < 1.5) liqComment = "Ngưỡng thanh toán vừa đủ. Cần tích trữ thêm tiền mặt.";

  html += `
    <h4 class="card-title mt-6 mb-3"><i data-lucide="gauge"></i> Chỉ Số Sức Khỏe Tài Chính Doanh Nghiệp</h4>
    <div class="ratio-grid">
      <div class="ratio-card glass-card">
        <span class="ratio-title">Tỷ lệ Tích lũy tài sản</span>
        <div class="ratio-value">${equityRatio.toFixed(1)}%</div>
        <span class="ratio-desc">Tài sản thực sở hữu chiếm ${equityRatio.toFixed(1)}% tổng tài sản tích lũy của bạn.</span>
      </div>
      <div class="ratio-card glass-card">
        <span class="ratio-title">Hệ số nợ / Tổng tài sản</span>
        <div class="ratio-value">${debtRatio.toFixed(1)}%</div>
        <span class="ratio-desc">${debtComment}</span>
      </div>
      <div class="ratio-card glass-card">
        <span class="ratio-title">Khả năng thanh toán nhanh</span>
        <div class="ratio-value">${liquidityRatio === 999 ? "∞" : liquidityRatio.toFixed(2)}</div>
        <span class="ratio-desc">${liqComment}</span>
      </div>
    </div>
  `;

  container.innerHTML = html;
  lucide.createIcons();
}

// BCTC 2: BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH (P&L)
function generateIncomeStatement() {
  const container = document.getElementById("incomeStatementContainer");
  if (!container) return;

  const filterVal = document.getElementById("reportMonthFilter").value;
  const [month, year] = filterVal.split("/").map(Number);

  const targetTxs = appState.transactions.filter(tx => {
    if (!tx.date || tx.category === "cat-transfer") return false;
    const d = new Date(tx.date);
    return d.getMonth() === (month - 1) && d.getFullYear() === year;
  });

  let revenues = {};
  let expenses = {};
  let totalRevenue = 0;
  let totalExpense = 0;

  targetTxs.forEach(tx => {
    const catInfo = getCategoryInfo(tx.category, appState.categories);
    const amt = parseFloat(tx.amount) || 0;
    if (tx.type === "income") {
      revenues[catInfo.name] = (revenues[catInfo.name] || 0) + amt;
      totalRevenue += amt;
    } else {
      expenses[catInfo.name] = (expenses[catInfo.name] || 0) + amt;
      totalExpense += amt;
    }
  });

  const netIncome = totalRevenue - totalExpense;
  const savingRate = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

  let html = `
    <table class="fin-table">
      <thead>
        <tr>
          <th>CHỈ TIÊU BÁO CÁO KINH DOANH</th>
          <th class="text-right">MÃ SỐ</th>
          <th class="text-right">THÁNG ${month}/${year} (₫)</th>
        </tr>
      </thead>
      <tbody>
        <!-- DOANH THU -->
        <tr class="header-row">
          <td>I. DOANH THU & THU NHẬP (REVENUES)</td>
          <td class="text-right">01</td>
          <td class="text-right">${formatNumber(totalRevenue)}</td>
        </tr>
  `;

  Object.keys(revenues).forEach((catName, idx) => {
    html += `
        <tr>
          <td class="indent-1">${idx+1}. Thu nhập: ${catName}</td>
          <td class="text-right">01.${idx+1}</td>
          <td class="text-right pos-val">+${formatNumber(revenues[catName])}</td>
        </tr>
    `;
  });

  if (Object.keys(revenues).length === 0) {
    html += `
        <tr>
          <td class="indent-1 text-gray-400">Không có khoản thu nào trong kỳ</td>
          <td class="text-right">-</td>
          <td class="text-right">0</td>
        </tr>
    `;
  }

  html += `
        <!-- CHI PHÍ -->
        <tr class="header-row">
          <td>II. CHI PHÍ & TIÊU DÙNG (EXPENSES)</td>
          <td class="text-right">10</td>
          <td class="text-right">${formatNumber(totalExpense)}</td>
        </tr>
  `;

  Object.keys(expenses).forEach((catName, idx) => {
    html += `
        <tr>
          <td class="indent-1">${idx+1}. Chi tiêu: ${catName}</td>
          <td class="text-right">10.${idx+1}</td>
          <td class="text-right neg-val">-${formatNumber(expenses[catName])}</td>
        </tr>
    `;
  });

  if (Object.keys(expenses).length === 0) {
    html += `
        <tr>
          <td class="indent-1 text-gray-400">Không có khoản chi nào trong kỳ</td>
          <td class="text-right">-</td>
          <td class="text-right">0</td>
        </tr>
    `;
  }

  // NET INCOME
  html += `
        <tr class="grand-total-row">
          <td>III. LỢI NHUẬN THUẦN / THẶNG DƯ TÍCH LŨY (NET INCOME)</td>
          <td class="text-right">30</td>
          <td class="text-right ${netIncome >= 0 ? "pos-val" : "neg-val"}">${netIncome >= 0 ? "+" : ""}${formatNumber(netIncome)}</td>
        </tr>
      </tbody>
    </table>
  `;

  let savingComment = "Tỷ lệ tích lũy tốt, tài chính phát triển bền vững.";
  if (savingRate < 0) savingComment = "Cảnh báo thâm hụt! Chi tiêu đang vượt mức thu nhập. Hãy cắt giảm chi phí.";
  else if (savingRate < 15) savingComment = "Tích lũy ở mức thấp. Cân nhắc giảm bớt chi tiêu không cần thiết.";

  html += `
    <h4 class="card-title mt-6 mb-3"><i data-lucide="line-chart"></i> Phân Tích Hiệu Suất Tích Lũy Kỳ Này</h4>
    <div class="ratio-grid">
      <div class="ratio-card glass-card col-span-3">
        <span class="ratio-title">Tỷ lệ thặng dư (Saving Rate)</span>
        <div class="ratio-value" style="color: ${netIncome >= 0 ? "var(--success)" : "var(--danger)"}">${savingRate.toFixed(1)}%</div>
        <span class="ratio-desc">${savingComment}</span>
      </div>
    </div>
  `;

  container.innerHTML = html;
  lucide.createIcons();
}

// BCTC 3: BÁO CÁO LƯU CHUYỂN TIỀN TỆ (CASH FLOW STATEMENT)
function generateCashFlowStatement() {
  const container = document.getElementById("cashFlowStatementContainer");
  if (!container) return;

  const filterVal = document.getElementById("reportMonthFilter").value;
  const [month, year] = filterVal.split("/").map(Number);

  const targetTxs = appState.transactions.filter(tx => {
    if (!tx.date || tx.category === "cat-transfer") return false;
    const d = new Date(tx.date);
    return d.getMonth() === (month - 1) && d.getFullYear() === year;
  });

  let opIn = 0, opOut = 0;
  let invIn = 0, invOut = 0;
  let finIn = 0, finOut = 0;

  targetTxs.forEach(tx => {
    const amt = parseFloat(tx.amount) || 0;
    const catInfo = getCategoryInfo(tx.category, appState.categories);
    const catId = catInfo.id;
    const catName = (catInfo.name || "").toLowerCase();
    const note = (tx.note || "").toLowerCase();

    // Xác định xem giao dịch có liên kết với bảng nợ Debts hay không
    let isDebtInit = tx.id.startsWith("tx-debt-init-");
    let isDebtRepay = tx.id.startsWith("tx-debt-repay-");
    let debtType = "";

    if (isDebtInit) {
      const debtId = tx.id.replace("tx-debt-init-", "");
      const debt = appState.debts.find(d => d.id === debtId);
      if (debt) debtType = debt.type;
    } else if (isDebtRepay) {
      const debt = appState.debts.find(d => tx.id.startsWith(`tx-debt-repay-${d.id}-`));
      if (debt) debtType = debt.type;
    }

    if (tx.type === "income") {
      if (catId === "cat-14" || catName.includes("vay") || catName.includes("nợ")) {
        // Danh mục liên quan đến Vay / Nợ (Đi vay hoặc Thu nợ)
        if (debtType === "borrow" || (debtType === "" && !note.includes("thu nợ") && !note.includes("đòi nợ") && !note.includes("thu hồi") && !note.includes("nhận lại"))) {
          finIn += amt; // Thu từ Đi vay (Financing)
        } else {
          invIn += amt; // Thu hồi nợ cho vay (Investing)
        }
      } else if (catId === "cat-10" || catName.includes("đầu tư") || catName.includes("tích lũy") || catName.includes("tiết kiệm")) {
        invIn += amt; // Thu hồi đầu tư (Investing)
      } else {
        opIn += amt;  // Thu hoạt động thường nhật (Operating)
      }
    } else {
      if (catId === "cat-13" || catName.includes("vay") || catName.includes("nợ")) {
        // Danh mục liên quan đến Vay / Nợ (Trả nợ hoặc Cho vay)
        if (debtType === "borrow" || (debtType === "" && !note.includes("cho vay") && !note.includes("cho mượn") && !note.includes("gửi cho"))) {
          finOut += amt; // Chi Trả nợ gốc (Financing)
        } else {
          invOut += amt; // Cho người khác vay (Investing)
        }
      } else if (catId === "cat-10" || catName.includes("đầu tư") || catName.includes("tích lũy") || catName.includes("tiết kiệm")) {
        invOut += amt; // Chi Đầu tư (Investing)
      } else {
        opOut += amt;  // Chi tiêu dùng thường nhật (Operating)
      }
    }
  });

  const netOp = opIn - opOut;
  const netInv = invIn - invOut;
  const netFin = finIn - finOut;
  const netCash = netOp + netInv + netFin;

  let html = `
    <table class="fin-table">
      <thead>
        <tr>
          <th>CHỈ TIÊU LƯU CHUYỂN TIỀN TỆ (MẪU TRỰC TIẾP)</th>
          <th class="text-right">MÃ SỐ</th>
          <th class="text-right">THÁNG ${month}/${year} (₫)</th>
        </tr>
      </thead>
      <tbody>
        <!-- DÒNG TIỀN KINH DOANH -->
        <tr class="header-row">
          <td>I. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG KINH DOANH/TIÊU DÙNG THƯỜNG NHẬT</td>
          <td class="text-right">01</td>
          <td class="text-right ${netOp >= 0 ? "pos-val" : "neg-val"}">${netOp >= 0 ? "+" : ""}${formatNumber(netOp)}</td>
        </tr>
        <tr>
          <td class="indent-1">1. Tiền thu hoạt động kinh doanh, lương, thường nhật</td>
          <td class="text-right">02</td>
          <td class="text-right pos-val">+${formatNumber(opIn)}</td>
        </tr>
        <tr>
          <td class="indent-1">2. Tiền chi hoạt động mua sắm, ăn uống, hóa đơn, sinh hoạt</td>
          <td class="text-right">03</td>
          <td class="text-right neg-val">-${formatNumber(opOut)}</td>
        </tr>

        <!-- DÒNG TIỀN ĐẦU TƯ -->
        <tr class="header-row">
          <td>II. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG ĐẦU TƯ</td>
          <td class="text-right">10</td>
          <td class="text-right ${netInv >= 0 ? "pos-val" : "neg-val"}">${netInv >= 0 ? "+" : ""}${formatNumber(netInv)}</td>
        </tr>
        <tr>
          <td class="indent-1">1. Tiền thu hồi đầu tư (tất toán quỹ, bán chứng khoán...) hoặc thu hồi nợ cho vay</td>
          <td class="text-right">11</td>
          <td class="text-right pos-val">+${formatNumber(invIn)}</td>
        </tr>
        <tr>
          <td class="indent-1">2. Tiền chi mua sắm tài sản đầu tư, tích lũy dài hạn hoặc cho người khác vay</td>
          <td class="text-right">12</td>
          <td class="text-right neg-val">-${formatNumber(invOut)}</td>
        </tr>

        <!-- DÒNG TIỀN TÀI CHÍNH -->
        <tr class="header-row">
          <td>III. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG TÀI CHÍNH</td>
          <td class="text-right">20</td>
          <td class="text-right ${netFin >= 0 ? "pos-val" : "neg-val"}">${netFin >= 0 ? "+" : ""}${formatNumber(netFin)}</td>
        </tr>
        <tr>
          <td class="indent-1">1. Tiền thu được từ đi vay mượn cá nhân hoặc tổ chức tài chính</td>
          <td class="text-right">21</td>
          <td class="text-right pos-val">+${formatNumber(finIn)}</td>
        </tr>
        <tr>
          <td class="indent-1">2. Tiền chi ra để trả các khoản nợ vay gốc</td>
          <td class="text-right">22</td>
          <td class="text-right neg-val">-${formatNumber(finOut)}</td>
        </tr>

        <!-- DÒNG TIỀN NET -->
        <tr class="grand-total-row">
          <td>IV. LƯU CHUYỂN TIỀN THUẦN TRONG KỲ (I + II + III)</td>
          <td class="text-right">50</td>
          <td class="text-right ${netCash >= 0 ? "pos-val" : "neg-val"}">${netCash >= 0 ? "+" : ""}${formatNumber(netCash)}</td>
        </tr>
      </tbody>
    </table>
  `;

  container.innerHTML = html;
  lucide.createIcons();
}

// ============================================================================
// CHỨC NĂNG QUẢN LÝ VAY & MƯỢN (LOANS & DEBTS)
// ============================================================================

// ĐỒNG BỘ DROPDOWNS VÍ CHO FORM NỢ
function populateDebtWalletDropdowns() {
  const debtWalletSelect = document.getElementById("debtWallet");
  const repaymentWalletSelect = document.getElementById("repaymentWallet");

  if (debtWalletSelect) {
    const prevVal = debtWalletSelect.value;
    debtWalletSelect.innerHTML = "";
    appState.wallets.forEach(w => {
      const opt = document.createElement("option");
      opt.value = w.name;
      opt.textContent = w.name;
      debtWalletSelect.appendChild(opt);
    });
    if (prevVal && appState.wallets.some(w => w.name === prevVal)) {
      debtWalletSelect.value = prevVal;
    }
  }

  if (repaymentWalletSelect) {
    const prevVal = repaymentWalletSelect.value;
    repaymentWalletSelect.innerHTML = "";
    appState.wallets.forEach(w => {
      const opt = document.createElement("option");
      opt.value = w.name;
      opt.textContent = w.name;
      repaymentWalletSelect.appendChild(opt);
    });
    if (prevVal && appState.wallets.some(w => w.name === prevVal)) {
      repaymentWalletSelect.value = prevVal;
    }
  }
}

// THIẾT LẬP CÁC TRÌNH ĐIỀU KHIỂN KHOẢN NỢ
function setupDebtHandlers() {
  // Trình điều khiển chuyển đổi Sub-tab Vay / Mượn
  const subTabs = document.querySelectorAll("#debtsSubNav .reports-sub-tab");
  subTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      subTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      appState.activeDebtTab = tab.getAttribute("data-debt-sub-tab");
      renderDebtsTab();
    });
  });

  // Đóng modal khi click nút đóng
  const debtModal = document.getElementById("debtModal");
  if (debtModal) {
    debtModal.querySelectorAll(".modal-close, .btn-close-modal").forEach(btn => {
      btn.addEventListener("click", () => {
        debtModal.classList.remove("active");
      });
    });
  }

  // Thay đổi tiêu đề nhãn tên đối tác khi thay đổi Loại nợ
  const debtTypeSelect = document.getElementById("debtType");
  if (debtTypeSelect) {
    debtTypeSelect.addEventListener("change", (e) => {
      const label = document.getElementById("debtLenderLabel");
      if (e.target.value === "borrow") {
        label.textContent = "Chủ nợ (Người cho bạn vay)";
      } else {
        label.textContent = "Người vay (Người bạn cho vay)";
      }
    });
  }

  // Submit Form tạo / sửa khoản nợ
  const debtForm = document.getElementById("debtForm");
  if (debtForm) {
    debtForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const lender = document.getElementById("debtLender").value.trim();
      const type = document.getElementById("debtType").value;
      const amount = parseInputAmount(document.getElementById("debtAmount"));
      const date = document.getElementById("debtDate").value;
      const dueDate = document.getElementById("debtDueDate").value;
      const wallet = document.getElementById("debtWallet").value;
      const note = document.getElementById("debtNote").value.trim();

      if (!lender) {
        showToast("Vui lòng nhập tên đối tác vay mượn!", "danger");
        return;
      }
      if (isNaN(amount) || amount <= 0) {
        showToast("Vui lòng nhập số tiền nợ hợp lệ lớn hơn 0!", "danger");
        return;
      }

      // Kiểm tra số dư ví nếu loại nợ là Cho vay (lend)
      if (type === "lend") {
        const excludeTxId = appState.editingDebtId ? `tx-debt-init-${appState.editingDebtId}` : null;
        const currentBalance = getWalletBalance(wallet, excludeTxId);
        if (amount > currentBalance) {
          showToast(`Số dư ví "${wallet}" không đủ để cho vay! (Khả dụng: ${formatCurrency(currentBalance)})`, "danger");
          return;
        }
      }

      const debtId = appState.editingDebtId || "debt-" + Date.now();
      const debtData = {
        id: debtId,
        lender: lender,
        type: type,
        amount: amount,
        date: date,
        dueDate: dueDate || "",
        wallet: wallet,
        note: note
      };

      if (debtModal) debtModal.classList.remove("active");
      showToast("Đang ghi nhận khoản nợ...", "warning");

      // 1. Lưu khoản nợ vào bảng Debts
      let debtRes;
      if (appState.editingDebtId) {
        debtRes = await api.updateDebt(debtData);
      } else {
        debtRes = await api.addDebt(debtData);
      }

      // 2. Tạo/Cập nhật giao dịch điều chỉnh ví tương ứng trong Transactions
      const txInitData = {
        id: `tx-debt-init-${debtId}`,
        type: type === "borrow" ? "income" : "expense",
        category: type === "borrow" ? "cat-14" : "cat-13", // 14: Đi vay / Thu nợ, 13: Trả nợ / Cho vay
        amount: amount,
        date: date,
        wallet: wallet,
        note: type === "borrow"
          ? `[Vay nợ] Nhận từ ${lender}${note ? ": " + note : ""}`
          : `[Cho vay] Gửi cho ${lender}${note ? ": " + note : ""}`
      };

      let txRes;
      if (appState.editingDebtId) {
        txRes = await api.updateTransaction(txInitData);
      } else {
        txRes = await api.addTransaction(txInitData);
      }

      if (debtRes.success && txRes.success) {
        showToast("Lưu khoản nợ thành công!", "success");
      } else {
        showToast("Đã lưu khoản nợ ở bộ nhớ tạm cục bộ.", "warning");
      }

      await refreshData();
    });
  }

  // Nút Xóa khoản nợ
  const btnDeleteDebt = document.getElementById("btnDeleteDebt");
  if (btnDeleteDebt) {
    btnDeleteDebt.addEventListener("click", async () => {
      const debtId = appState.editingDebtId;
      if (!debtId) return;

      const debt = appState.debts.find(d => d.id === debtId);
      if (!debt) return;

      if (!confirm(`Bạn có chắc chắn muốn xóa khoản nợ với "${debt.lender}" không? Thao tác này sẽ tự động xóa tất cả các giao dịch thanh toán liên quan đến khoản nợ này trong Sổ Giao Dịch.`)) return;

      if (debtModal) debtModal.classList.remove("active");
      showToast("Đang xóa khoản nợ và giao dịch...", "warning");

      // 1. Xóa khoản nợ
      const debtRes = await api.deleteDebt(debtId);

      // 2. Xóa giao dịch nguồn
      await api.deleteTransaction(`tx-debt-init-${debtId}`);

      // 3. Tìm và xóa toàn bộ giao dịch trả nợ liên quan
      const linkedTxs = appState.transactions.filter(t => t.id.startsWith(`tx-debt-repay-${debtId}-`));
      for (const tx of linkedTxs) {
        await api.deleteTransaction(tx.id);
      }

      if (debtRes.success) {
        showToast("Đã xóa khoản nợ và mọi giao dịch liên quan!", "success");
      } else {
        showToast("Đã xóa ở bộ nhớ tạm cục bộ.", "warning");
      }

      await refreshData();
    });
  }
}

// THIẾT LẬP CÁC TRÌNH ĐIỀU KHIỂN HOÀN TRẢ/THU NỢ
function setupRepaymentHandlers() {
  const repaymentModal = document.getElementById("repaymentModal");
  if (repaymentModal) {
    repaymentModal.querySelectorAll(".modal-close, .btn-close-modal").forEach(btn => {
      btn.addEventListener("click", () => {
        repaymentModal.classList.remove("active");
      });
    });
  }

  const repaymentForm = document.getElementById("repaymentForm");
  if (repaymentForm) {
    repaymentForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const debtId = document.getElementById("repaymentDebtId").value;
      const amount = parseInputAmount(document.getElementById("repaymentAmount"));
      const date = document.getElementById("repaymentDate").value;
      const wallet = document.getElementById("repaymentWallet").value;
      const note = document.getElementById("repaymentNote").value.trim();

      const debt = appState.debts.find(d => d.id === debtId);
      if (!debt) {
        showToast("Không tìm thấy thông tin khoản nợ gốc!", "danger");
        return;
      }

      if (isNaN(amount) || amount <= 0) {
        showToast("Vui lòng nhập số tiền thanh toán lớn hơn 0!", "danger");
        return;
      }

      // Kiểm tra số dư ví nếu là Trả nợ (loại borrow)
      if (debt.type === "borrow") {
        const balance = getWalletBalance(wallet);
        if (amount > balance) {
          showToast(`Số dư ví "${wallet}" không đủ để trả nợ! (Khả dụng: ${formatCurrency(balance)})`, "danger");
          return;
        }
      }

      if (repaymentModal) repaymentModal.classList.remove("active");
      showToast("Đang ghi nhận giao dịch thanh toán...", "warning");

      // Tạo giao dịch thanh toán nợ
      const txRepayData = {
        id: `tx-debt-repay-${debtId}-${Date.now()}`,
        type: debt.type === "borrow" ? "expense" : "income", // Trả nợ là Chi, thu nợ là Thu
        category: debt.type === "borrow" ? "cat-13" : "cat-14",
        amount: amount,
        date: date,
        wallet: wallet,
        note: debt.type === "borrow"
          ? `[Trả nợ] Trả cho ${debt.lender}${note ? ": " + note : ""}`
          : `[Thu nợ] ${debt.lender} trả${note ? ": " + note : ""}`
      };

      const res = await api.addTransaction(txRepayData);
      if (res.success) {
        showToast("Thanh toán thành công!", "success");
      } else {
        showToast("Giao dịch lưu ngoại tuyến thành công.", "warning");
      }

      await refreshData();
    });
  }
}

// MỞ MODAL THÊM / SỬA KHOẢN NỢ
function openDebtModal(debtId = null) {
  const modal = document.getElementById("debtModal");
  const form = document.getElementById("debtForm");
  const title = document.getElementById("debtModalTitle");
  const deleteBtn = document.getElementById("btnDeleteDebt");

  form.reset();

  // Đặt ngày mặc định là hôm nay
  const today = formatDateForInput(new Date());
  document.getElementById("debtDate").value = today;
  document.getElementById("debtDueDate").value = "";

  // Reset nhãn tên đối tác mặc định
  document.getElementById("debtLenderLabel").textContent = "Chủ nợ (Người cho bạn vay)";

  // Đồng bộ dropdown ví
  populateDebtWalletDropdowns();

  if (debtId) {
    appState.editingDebtId = debtId;
    title.textContent = "Chỉnh sửa khoản nợ";
    if (deleteBtn) deleteBtn.style.display = "inline-flex";

    const debt = appState.debts.find(d => d.id === debtId);
    if (debt) {
      document.getElementById("debtLender").value = debt.lender;
      document.getElementById("debtType").value = debt.type;
      document.getElementById("debtAmount").value = debt.amount ? formatNumber(parseFloat(debt.amount)) : "";
      document.getElementById("debtDate").value = formatDateForInput(debt.date);
      document.getElementById("debtDueDate").value = formatDateForInput(debt.dueDate);
      document.getElementById("debtWallet").value = debt.wallet;
      document.getElementById("debtNote").value = debt.note || "";

      // Cập nhật nhãn đối tác theo loại nợ
      document.getElementById("debtLenderLabel").textContent = debt.type === "borrow" 
        ? "Chủ nợ (Người cho bạn vay)" 
        : "Người vay (Người bạn cho vay)";
    }
  } else {
    appState.editingDebtId = null;
    title.textContent = "Thêm khoản Vay / Mượn mới";
    if (deleteBtn) deleteBtn.style.display = "none";
  }

  if (modal) modal.classList.add("active");
}

// MỞ MODAL TRẢ NỢ / THU NỢ NHANH
function openRepaymentModal(debtId) {
  const modal = document.getElementById("repaymentModal");
  const form = document.getElementById("repaymentForm");
  const title = document.getElementById("repaymentModalTitle");
  const infoBox = document.getElementById("repaymentDebtInfo");

  form.reset();

  const debt = appState.debts.find(d => d.id === debtId);
  if (!debt) return;

  // Tính số dư nợ còn lại
  const repayments = appState.transactions.filter(t => t.id.startsWith(`tx-debt-repay-${debtId}-`));
  const paidAmount = repayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const remaining = Math.max(0, debt.amount - paidAmount);

  // Điền thông tin ẩn
  document.getElementById("repaymentDebtId").value = debtId;

  // Ghi nhận thông tin nợ hiện hữu
  infoBox.innerHTML = `
    <strong>Thông tin dư nợ:</strong><br>
    • Đối tác: <b>${debt.lender}</b><br>
    • Nợ gốc: <b>${formatCurrency(debt.amount)}</b><br>
    • Đã trả: <span style="color: var(--success); font-weight:600">${formatCurrency(paidAmount)}</span><br>
    • Còn lại: <span style="color: var(--danger); font-weight:700">${formatCurrency(remaining)}</span>
  `;

  // Pre-fill số tiền trả mặc định là số dư nợ còn lại
  document.getElementById("repaymentAmount").value = remaining ? formatNumber(remaining) : "";

  // Đặt ngày mặc định là hôm nay
  const today = formatDateForInput(new Date());
  document.getElementById("repaymentDate").value = today;

  // Đồng bộ ví sử dụng
  populateDebtWalletDropdowns();

  if (debt.type === "borrow") {
    title.textContent = "Trả nợ (Hoàn trả tiền)";
  } else {
    title.textContent = "Thu hồi nợ (Nhận lại tiền)";
  }

  if (modal) modal.classList.add("active");
}

// VẼ MÀN HÌNH VAY & MƯỢN (DEBTS TAB)
function renderDebtsTab() {
  const grid = document.getElementById("debtsListGrid");
  if (!grid) return;

  grid.innerHTML = "";

  // 1. Tính toán tóm tắt dư nợ
  let totalBorrowRemaining = 0; // Cần trả (Đi vay)
  let totalLendRemaining = 0;   // Cần thu hồi (Cho vay)

  // Gom nhóm nợ theo loại hoạt động
  const filteredDebts = appState.debts.filter(d => d.type === appState.activeDebtTab);

  appState.debts.forEach(d => {
    // Tính số tiền đã thanh toán cho từng khoản nợ
    const repayments = appState.transactions.filter(t => t.id.startsWith(`tx-debt-repay-${d.id}-`));
    const paidAmount = repayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    const remaining = Math.max(0, d.amount - paidAmount);

    if (d.type === "borrow") {
      totalBorrowRemaining += remaining;
    } else {
      totalLendRemaining += remaining;
    }
  });

  const netDebt = totalLendRemaining - totalBorrowRemaining;

  // Cập nhật thẻ thống kê
  document.getElementById("totalBorrowDebtVal").textContent = formatCurrency(totalBorrowRemaining);
  document.getElementById("totalLendDebtVal").textContent = formatCurrency(totalLendRemaining);
  
  const netDebtEl = document.getElementById("netDebtVal");
  netDebtEl.textContent = (netDebt >= 0 ? "+" : "") + formatCurrency(netDebt);
  netDebtEl.className = "stat-value " + (netDebt >= 0 ? "positive" : "negative");

  const netDebtCard = document.getElementById("netDebtCard");
  if (netDebtCard) {
    netDebtCard.style.borderLeft = "4px solid " + (netDebt >= 0 ? "var(--success)" : "var(--danger)");
  }

  // 2. Render danh sách các thẻ nợ
  if (filteredDebts.length === 0) {
    grid.innerHTML = `<div class="text-center text-gray-500 py-12 glass-card col-span-full">Không có khoản nợ nào trong danh mục này.</div>`;
    return;
  }

  const todayStr = formatDateForInput(new Date());

  filteredDebts.forEach(debt => {
    // Tính toán số tiền đã trả
    const repayments = appState.transactions.filter(t => t.id.startsWith(`tx-debt-repay-${debt.id}-`));
    const paidAmount = repayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    const remaining = Math.max(0, debt.amount - paidAmount);

    // Tính phần trăm trả
    const originalAmount = parseFloat(debt.amount) || 0;
    const pct = originalAmount > 0 ? Math.min((paidAmount / originalAmount) * 100, 100).toFixed(0) : 0;

    // Trạng thái badge
    let statusLabel = "Chưa trả";
    let statusClass = "unpaid";
    if (remaining <= 0) {
      statusLabel = "Đã trả";
      statusClass = "paid";
    } else if (paidAmount > 0) {
      statusLabel = "Trả một phần";
      statusClass = "partial";
    }

    if (debt.type === "lend") {
      if (remaining <= 0) statusLabel = "Đã thu hồi";
      else if (paidAmount > 0) statusLabel = "Thu hồi một phần";
      else statusLabel = "Chưa thu hồi";
    }

    // Kiểm tra quá hạn
    const isOverdue = debt.dueDate && debt.dueDate < todayStr && remaining > 0;
    const overdueHtml = isOverdue 
      ? `<span class="debt-due-date overdue" title="Quá hạn thanh toán!"><i data-lucide="alert-circle" style="width:0.85rem;height:0.85rem"></i> Hạn: ${formatDateDMY(debt.dueDate)} (Quá hạn)</span>`
      : (debt.dueDate ? `<span class="debt-due-date"><i data-lucide="calendar" style="width:0.85rem;height:0.85rem"></i> Hạn: ${formatDateDMY(debt.dueDate)}</span>` : "");

    // Ký tự đầu đại diện avatar đối tác
    const avatarChar = debt.lender.trim().charAt(0);

    // Thêm các nút thao tác trả nợ nhanh
    const repayButtonHtml = remaining > 0 
      ? `<button class="btn btn-primary btn-sm" onclick="openRepaymentModal('${debt.id}')"><i data-lucide="${debt.type === "borrow" ? "arrow-up-right" : "arrow-down-left"}"></i> ${debt.type === "borrow" ? "Trả nợ" : "Thu nợ"}</button>`
      : "";

    const card = document.createElement("div");
    card.className = "glass-card debt-card";
    card.style.borderLeft = `4px solid ${debt.type === "borrow" ? "var(--danger)" : "var(--success)"}`;
    
    card.innerHTML = `
      <div class="debt-card-header">
        <div class="debt-partner-info">
          <div class="debt-avatar" style="background: linear-gradient(135deg, ${debt.type === "borrow" ? "#ef4444" : "#10b981"}, ${debt.type === "borrow" ? "#b91c1c" : "#047857"})">
            ${avatarChar}
          </div>
          <div class="debt-partner-details">
            <span class="debt-partner-name">${debt.lender}</span>
            <span class="debt-date-label">Ngày vay: ${formatDateDMY(debt.date)}</span>
          </div>
        </div>
        <span class="debt-badge ${statusClass}">${statusLabel}</span>
      </div>

      <div class="debt-amounts">
        <div class="debt-amount-row">
          <span class="debt-amount-label">Nợ gốc:</span>
          <span class="debt-amount-val">${formatCurrency(debt.amount)}</span>
        </div>
        <div class="debt-amount-row">
          <span class="debt-amount-label">Đã thanh toán:</span>
          <span class="debt-amount-val" style="color: var(--success); font-weight:700">${formatCurrency(paidAmount)}</span>
        </div>
        <div class="debt-amount-row" style="margin-top: 0.25rem;">
          <span class="debt-amount-label font-bold">Còn lại:</span>
          <span class="debt-amount-val highlight ${debt.type}">${formatCurrency(remaining)}</span>
        </div>
      </div>

      <div class="debt-progress-wrapper">
        <div class="debt-progress-text">
          <span>Tiến độ thanh toán</span>
          <span>${pct}%</span>
        </div>
        <div class="budget-progress-bar-container">
          <div class="budget-progress-bar-fill" style="width: ${pct}%; background-color: ${debt.type === "borrow" ? "var(--danger)" : "var(--success)"}"></div>
        </div>
      </div>

      ${overdueHtml}

      ${debt.note ? `<div class="debt-note-text">${debt.note}</div>` : ""}

      <div class="debt-actions">
        ${repayButtonHtml}
        <button class="btn btn-secondary btn-sm" onclick="openDebtModal('${debt.id}')"><i data-lucide="edit-2"></i> Sửa</button>
      </div>
    `;

    grid.appendChild(card);
  });

  lucide.createIcons();
}
