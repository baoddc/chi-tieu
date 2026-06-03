// API CLIENT - GIAO TIẾP VỚI GOOGLE APPS SCRIPT HOẶC LOCAL STORAGE

const STORAGE_KEYS = {
  TRANSACTIONS: "expense_tracker_transactions",
  CATEGORIES: "expense_tracker_categories",
  WALLETS: "expense_tracker_wallets",
  DEBTS: "expense_tracker_debts",
  SHEET_URL: "expense_tracker_sheet_url",
  LAST_SYNC: "expense_tracker_last_sync"
};

const DEFAULT_WALLETS = [
  { id: "wallet-1", name: "Tiền mặt", color: "#10b981", icon: "wallet" },
  { id: "wallet-2", name: "Ngân hàng", color: "#3b82f6", icon: "landmark" },
  { id: "wallet-3", name: "Thẻ tín dụng", color: "#f59e0b", icon: "credit-card" },
  { id: "wallet-4", name: "Ví điện tử", color: "#ec4899", icon: "smartphone" }
];

class FinanceAPI {
  constructor() {
    this.sheetUrl = localStorage.getItem(STORAGE_KEYS.SHEET_URL) || "";
    this.isOffline = !this.sheetUrl;
  }

  // Cập nhật URL kết nối Google Sheets
  setSheetUrl(url) {
    this.sheetUrl = url ? url.trim() : "";
    if (this.sheetUrl) {
      localStorage.setItem(STORAGE_KEYS.SHEET_URL, this.sheetUrl);
      this.isOffline = false;
    } else {
      localStorage.removeItem(STORAGE_KEYS.SHEET_URL);
      this.isOffline = true;
    }
  }

  // Lấy URL hiện tại
  getSheetUrl() {
    return this.sheetUrl;
  }

  // Kiểm tra kết nối tới Apps Script Web App
  async testConnection(url) {
    if (!url) return { success: false, error: "URL rỗng" };
    try {
      // Gửi yêu cầu GET thử nghiệm
      const response = await fetch(url, {
        method: "GET",
        mode: "cors"
      });
      
      if (!response.ok) {
        throw new Error(`Mã lỗi HTTP: ${response.status}`);
      }
      
      const result = await response.json();
      if (result && result.success) {
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error || "Phản hồi không hợp lệ từ Apps Script" };
      }
    } catch (error) {
      console.error("Test connection error:", error);
      return { success: false, error: "Không thể kết nối. Hãy chắc chắn bạn đã Deploy dưới dạng Web App, cấu hình quyền truy cập cho 'Anyone' và dán đúng URL." };
    }
  }

  // Gọi API dùng phương thức POST (gửi dạng text/plain để tránh CORS OPTIONS preflight)
  async callAPI(action, table, data = null) {
    if (this.isOffline || !this.sheetUrl) {
      return { success: false, error: "Chế độ Ngoại tuyến (Chưa kết nối Google Sheet)" };
    }

    try {
      const payload = {
        action: action,
        table: table,
        data: data
      };

      const response = await fetch(this.sheetUrl, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Lỗi không xác định từ API");
      }
      return result;
    } catch (error) {
      console.error(`API Call failed (${action} - ${table}):`, error);
      // Trả về false nhưng không làm crash app, client sẽ dùng cache
      return { success: false, error: error.message, isNetworkError: true };
    }
  }

  // Lấy toàn bộ dữ liệu (từ Sheets hoặc Local Cache)
  async getAllData() {
    let localData = {
      Transactions: this.getLocalTransactions(),
      Categories: this.getLocalCategories(),
      Wallets: this.getLocalWallets(),
      Debts: this.getLocalDebts()
    };

    if (this.isOffline) {
      return { success: true, data: localData, source: "local" };
    }

    // Nếu có kết nối mạng, tải từ Google Sheets
    try {
      const response = await fetch(this.sheetUrl, {
        method: "GET",
        mode: "cors"
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const result = await response.json();
      if (result && result.success) {
        const remoteData = result.data;
        
        // Cập nhật lại bộ nhớ đệm Local
        this.saveLocalTransactions(remoteData.Transactions || []);
        this.saveLocalCategories(remoteData.Categories || []);
        if (remoteData.Wallets) {
          this.saveLocalWallets(remoteData.Wallets);
        } else {
          // Khôi phục ví local nếu sheet chưa được nâng cấp Apps Script mới
          remoteData.Wallets = this.getLocalWallets();
        }
        
        if (remoteData.Debts) {
          this.saveLocalDebts(remoteData.Debts);
        } else {
          // Khôi phục nợ local nếu sheet chưa được nâng cấp Apps Script mới
          remoteData.Debts = this.getLocalDebts();
        }
        
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
        
        return { success: true, data: remoteData, source: "google_sheets" };
      } else {
        throw new Error(result.error || "Không thể tải dữ liệu");
      }
    } catch (error) {
      console.warn("Không kết nối được Google Sheet, chuyển sang dùng dữ liệu Cache local:", error);
      return { 
        success: true, 
        data: localData, 
        source: "cache", 
        warning: "Không thể kết nối đến Google Sheets. Dữ liệu đang được tải từ bộ nhớ đệm cục bộ." 
      };
    }
  }

  // Ghi đè toàn bộ dữ liệu từ Local lên Google Sheet (Dùng khi kết nối lần đầu để đẩy dữ liệu offline lên)
  async syncLocalToSheet() {
    const localData = {
      Transactions: this.getLocalTransactions(),
      Categories: this.getLocalCategories(),
      Wallets: this.getLocalWallets(),
      Debts: this.getLocalDebts()
    };
    
    const result = await this.callAPI("syncAll", "Transactions", localData);
    if (result.success) {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    }
    return result;
  }

  // CRUD Giao dịch
  async addTransaction(transaction) {
    // 1. Lưu local trước (Optimistic)
    const txs = this.getLocalTransactions();
    txs.push(transaction);
    this.saveLocalTransactions(txs);

    if (this.isOffline) {
      return { success: true, data: transaction, source: "local" };
    }

    // 2. Đồng bộ lên Sheets
    const result = await this.callAPI("insertRow", "Transactions", transaction);
    if (!result.success) {
      // Nếu lỗi mạng, giao dịch vẫn lưu ở local và sẽ đồng bộ sau
      return { success: true, data: transaction, source: "local_only_unsynced", warning: result.error };
    }
    return result;
  }

  async updateTransaction(transaction) {
    // 1. Sửa local
    let txs = this.getLocalTransactions();
    txs = txs.map(t => t.id === transaction.id ? transaction : t);
    this.saveLocalTransactions(txs);

    if (this.isOffline) {
      return { success: true, data: transaction, source: "local" };
    }

    // 2. Đồng bộ
    const result = await this.callAPI("updateRow", "Transactions", transaction);
    return result;
  }

  async deleteTransaction(id) {
    // 1. Xóa local
    let txs = this.getLocalTransactions();
    txs = txs.filter(t => t.id !== id);
    this.saveLocalTransactions(txs);

    if (this.isOffline) {
      return { success: true, source: "local" };
    }

    // 2. Đồng bộ
    const result = await this.callAPI("deleteRow", "Transactions", { id: id });
    return result;
  }

  // CRUD Hạng mục
  async addCategory(category) {
    const cats = this.getLocalCategories();
    cats.push(category);
    this.saveLocalCategories(cats);

    if (this.isOffline) {
      return { success: true, data: category, source: "local" };
    }

    const result = await this.callAPI("insertRow", "Categories", category);
    return result;
  }

  async updateCategory(category) {
    let cats = this.getLocalCategories();
    cats = cats.map(c => c.id === category.id ? category : c);
    this.saveLocalCategories(cats);

    if (this.isOffline) {
      return { success: true, data: category, source: "local" };
    }

    const result = await this.callAPI("updateRow", "Categories", category);
    return result;
  }

  async deleteCategory(id) {
    // 1. Xóa trong danh sách hạng mục
    let cats = this.getLocalCategories();
    cats = cats.filter(c => c.id !== id);
    this.saveLocalCategories(cats);

    if (this.isOffline) {
      return { success: true, source: "local" };
    }

    const result = await this.callAPI("deleteRow", "Categories", { id: id });
    return result;
  }

  // Hàm Helper đọc ghi Local Storage
  getLocalTransactions() {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  }

  saveLocalTransactions(transactions) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }

  getLocalCategories() {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    // Nếu chưa có hạng mục nào ở Local, trả về danh mục mặc định ban đầu
    if (!data) {
      this.saveLocalCategories(DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(data);
  }

  saveLocalCategories(categories) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }

  // CRUD Ví/Tài khoản
  async addWallet(wallet) {
    const wallets = this.getLocalWallets();
    wallets.push(wallet);
    this.saveLocalWallets(wallets);

    if (this.isOffline) {
      return { success: true, data: wallet, source: "local" };
    }

    const result = await this.callAPI("insertRow", "Wallets", wallet);
    if (!result.success) {
      return { success: true, data: wallet, source: "local_only_unsynced", error: result.error };
    }
    return result;
  }

  async updateWallet(wallet) {
    let wallets = this.getLocalWallets();
    wallets = wallets.map(w => w.id === wallet.id ? wallet : w);
    this.saveLocalWallets(wallets);

    if (this.isOffline) {
      return { success: true, data: wallet, source: "local" };
    }

    const result = await this.callAPI("updateRow", "Wallets", wallet);
    if (!result.success) {
      return { success: true, data: wallet, source: "local_only_unsynced", error: result.error };
    }
    return result;
  }

  async deleteWallet(id) {
    let wallets = this.getLocalWallets();
    wallets = wallets.filter(w => w.id !== id);
    this.saveLocalWallets(wallets);

    if (this.isOffline) {
      return { success: true, source: "local" };
    }

    const result = await this.callAPI("deleteRow", "Wallets", { id: id });
    if (!result.success) {
      return { success: true, source: "local_only_unsynced", error: result.error };
    }
    return result;
  }

  getLocalWallets() {
    const data = localStorage.getItem(STORAGE_KEYS.WALLETS);
    if (!data) {
      this.saveLocalWallets(DEFAULT_WALLETS);
      return DEFAULT_WALLETS;
    }
    return JSON.parse(data);
  }

  saveLocalWallets(wallets) {
    localStorage.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(wallets));
  }

  // CRUD Khoản nợ (Debts)
  async addDebt(debt) {
    const debts = this.getLocalDebts();
    debts.push(debt);
    this.saveLocalDebts(debts);

    if (this.isOffline) {
      return { success: true, data: debt, source: "local" };
    }

    const result = await this.callAPI("insertRow", "Debts", debt);
    if (!result.success) {
      return { success: true, data: debt, source: "local_only_unsynced", error: result.error };
    }
    return result;
  }

  async updateDebt(debt) {
    let debts = this.getLocalDebts();
    debts = debts.map(d => d.id === debt.id ? debt : d);
    this.saveLocalDebts(debts);

    if (this.isOffline) {
      return { success: true, data: debt, source: "local" };
    }

    const result = await this.callAPI("updateRow", "Debts", debt);
    if (!result.success) {
      return { success: true, data: debt, source: "local_only_unsynced", error: result.error };
    }
    return result;
  }

  async deleteDebt(id) {
    let debts = this.getLocalDebts();
    debts = debts.filter(d => d.id !== id);
    this.saveLocalDebts(debts);

    if (this.isOffline) {
      return { success: true, source: "local" };
    }

    const result = await this.callAPI("deleteRow", "Debts", { id: id });
    if (!result.success) {
      return { success: true, source: "local_only_unsynced", error: result.error };
    }
    return result;
  }

  getLocalDebts() {
    const data = localStorage.getItem(STORAGE_KEYS.DEBTS);
    return data ? JSON.parse(data) : [];
  }

  saveLocalDebts(debts) {
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
  }

  getLastSyncString() {
    const syncTime = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    if (!syncTime) return "Chưa từng đồng bộ";
    const date = new Date(syncTime);
    return date.toLocaleTimeString("vi-VN") + " " + date.toLocaleDateString("vi-VN");
  }
}

// Khởi tạo instance API toàn cục
const api = new FinanceAPI();
