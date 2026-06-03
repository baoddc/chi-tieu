// QUẢN LÝ BIỂU ĐỒ - CHART.JS WRAPPER

let trendChartInstance = null;
let expensePieChartInstance = null;
let incomePieChartInstance = null;
let expensePieChartPageInstance = null;
let incomePieChartPageInstance = null;

/**
 * Khởi tạo và cập nhật tất cả biểu đồ dựa trên dữ liệu giao dịch và hạng mục
 * @param {Array} transactions Danh sách giao dịch
 * @param {Array} categories Danh sách hạng mục
 */
function updateAppCharts(transactions, categories) {
  renderTrendChart("trendChart", transactions);
  renderCategoryPieChart("expensePieChart", transactions, categories, "expense");
  renderCategoryPieChart("incomePieChart", transactions, categories, "income");
  
  // Vẽ biểu đồ trên trang Báo cáo chi tiết nếu tồn tại phần tử tương ứng
  renderCategoryPieChart("expensePieChartPage", transactions, categories, "expense");
  renderCategoryPieChart("incomePieChartPage", transactions, categories, "income");
}

/**
 * Vẽ biểu đồ cột so sánh Thu - Chi trong 6 tháng gần nhất
 */
function renderTrendChart(canvasId, transactions) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  // 1. Tạo danh sách 6 tháng gần đây (định dạng MM/YYYY)
  const last6Months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${d.getMonth() + 1}/${d.getFullYear()}`;
    last6Months.push({
      label: label,
      month: d.getMonth(),
      year: d.getFullYear(),
      income: 0,
      expense: 0
    });
  }

  // 2. Phân loại giao dịch thô vào các tháng tương ứng
  transactions.forEach(tx => {
    if (!tx.date) return;
    const txDate = new Date(tx.date);
    const txMonth = txDate.getMonth();
    const txYear = txDate.getFullYear();
    const txAmount = parseFloat(tx.amount) || 0;

    const monthBucket = last6Months.find(m => m.month === txMonth && m.year === txYear);
    if (monthBucket) {
      if (tx.type === "income") {
        monthBucket.income += txAmount;
      } else {
        monthBucket.expense += txAmount;
      }
    }
  });

  const labels = last6Months.map(m => m.label);
  const incomeData = last6Months.map(m => m.income);
  const expenseData = last6Months.map(m => m.expense);

  // Hủy biểu đồ cũ nếu đã tồn tại để tránh xung đột canvas
  if (trendChartInstance) {
    trendChartInstance.destroy();
  }

  // Cấu hình chủ đề màu sắc cho biểu đồ (Hỗ trợ Dark/Light mode dựa trên CSS)
  const isDarkMode = document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDarkMode ? "#9ca3af" : "#4b5563";
  const gridColor = isDarkMode ? "#374151" : "#e5e7eb";

  trendChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Khoản Thu",
          data: incomeData,
          backgroundColor: "#10b981", // Emerald
          borderRadius: 6,
          borderSkipped: false
        },
        {
          label: "Khoản Chi",
          data: expenseData,
          backgroundColor: "#ef4444", // Red
          borderRadius: 6,
          borderSkipped: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { family: "'Inter', sans-serif", size: 12 }
          }
        },
        tooltip: {
          padding: 12,
          bodyFont: { family: "'Inter', sans-serif" },
          titleFont: { family: "'Inter', sans-serif", weight: "bold" },
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { family: "'Inter', sans-serif" } }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: "'Inter', sans-serif" },
            callback: function(value) {
              if (value >= 1e6) return (value / 1e6) + "M";
              if (value >= 1e3) return (value / 1e3) + "k";
              return value;
            }
          }
        }
      }
    }
  });
}

/**
 * Vẽ biểu đồ tròn phân phối danh mục (Thu nhập hoặc Chi tiêu)
 */
function renderCategoryPieChart(canvasId, transactions, categories, type = "expense", selectedMonth = null, selectedYear = null) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  let targetMonth = selectedMonth;
  let targetYear = selectedYear;

  // Nếu không truyền tháng/năm, và đây là canvas trang BCTC, hãy đọc từ bộ lọc reportMonthFilter
  if (targetMonth === null || targetYear === null) {
    if (canvasId.endsWith("Page")) {
      const monthFilter = document.getElementById("reportMonthFilter");
      if (monthFilter && monthFilter.value) {
        const parts = monthFilter.value.split("/");
        if (parts.length === 2) {
          targetMonth = parseInt(parts[0], 10) - 1; // 0-indexed
          targetYear = parseInt(parts[1], 10);
        }
      }
    }
  }

  // Fallback về tháng hiện tại
  const now = new Date();
  if (targetMonth === null) targetMonth = now.getMonth();
  if (targetYear === null) targetYear = now.getFullYear();

  // Lọc các giao dịch thuộc tháng mục tiêu (loại trừ chuyển ví)
  const currentMonthTxs = transactions.filter(tx => {
    if (!tx.date || tx.category === "cat-transfer") return false;
    const d = new Date(tx.date);
    return d.getMonth() === targetMonth && d.getFullYear() === targetYear && tx.type === type;
  });

  // Gom nhóm số tiền theo category
  const categoryTotals = {};
  currentMonthTxs.forEach(tx => {
    const catId = tx.category;
    const amount = parseFloat(tx.amount) || 0;
    categoryTotals[catId] = (categoryTotals[catId] || 0) + amount;
  });

  // Chuyển thành mảng dữ liệu có thông tin Hạng mục
  const chartData = [];
  for (const catId in categoryTotals) {
    const catInfo = getCategoryInfo(catId, categories);
    chartData.push({
      label: catInfo.name,
      amount: categoryTotals[catId],
      color: catInfo.color
    });
  }

  // Sắp xếp giảm dần theo số tiền
  chartData.sort((a, b) => b.amount - a.amount);

  const labels = chartData.map(d => d.label);
  const data = chartData.map(d => d.amount);
  const colors = chartData.map(d => d.color);

  // Hủy biểu đồ cũ tương ứng nếu đã tồn tại để tránh xung đột canvas
  if (canvasId === "expensePieChart") {
    if (expensePieChartInstance) expensePieChartInstance.destroy();
  } else if (canvasId === "expensePieChartPage") {
    if (expensePieChartPageInstance) expensePieChartPageInstance.destroy();
  } else if (canvasId === "incomePieChart") {
    if (incomePieChartInstance) incomePieChartInstance.destroy();
  } else if (canvasId === "incomePieChartPage") {
    if (incomePieChartPageInstance) incomePieChartPageInstance.destroy();
  }

  // Nếu không có dữ liệu cho tháng hiện tại, vẽ một biểu đồ xám trống rỗng
  const hasData = data.length > 0 && data.reduce((a, b) => a + b, 0) > 0;
  
  const isDarkMode = document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDarkMode ? "#9ca3af" : "#4b5563";

  const config = {
    type: "doughnut",
    data: {
      labels: hasData ? labels : ["Không có dữ liệu"],
      datasets: [{
        data: hasData ? data : [1],
        backgroundColor: hasData ? colors : [isDarkMode ? "#374151" : "#e5e7eb"],
        borderWidth: isDarkMode ? 2 : 1,
        borderColor: isDarkMode ? "#1f2937" : "#ffffff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: {
            color: textColor,
            font: { family: "'Inter', sans-serif", size: 11 },
            boxWidth: 12
          }
        },
        tooltip: {
          enabled: hasData,
          bodyFont: { family: "'Inter', sans-serif" },
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed;
              const formattedVal = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
              
              // Tính phần trăm
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              
              return `${label}: ${formattedVal} (${percentage}%)`;
            }
          }
        }
      },
      cutout: "65%"
    }
  };

  const chartInstance = new Chart(ctx, config);

  // Lưu trữ instance biểu đồ để hủy khi vẽ lại
  if (canvasId === "expensePieChart") {
    expensePieChartInstance = chartInstance;
  } else if (canvasId === "expensePieChartPage") {
    expensePieChartPageInstance = chartInstance;
  } else if (canvasId === "incomePieChart") {
    incomePieChartInstance = chartInstance;
  } else if (canvasId === "incomePieChartPage") {
    incomePieChartPageInstance = chartInstance;
  }

  // Cập nhật danh sách bảng thống kê phụ bên dưới biểu đồ
  const legendId = canvasId === "expensePieChart" ? "expenseLegendTable" :
                   canvasId === "expensePieChartPage" ? "expenseLegendTablePage" :
                   canvasId === "incomePieChart" ? "incomeLegendTable" :
                   canvasId === "incomePieChartPage" ? "incomeLegendTablePage" : null;

  if (legendId) {
    renderLegendTable(legendId, chartData, type);
  }
}

/**
 * Hiển thị bảng chi tiết các hạng mục bên dưới biểu đồ
 */
function renderLegendTable(elementId, sortedData, type) {
  const container = document.getElementById(elementId);
  if (!container) return;

  if (sortedData.length === 0) {
    container.innerHTML = `<div class="text-center text-gray-500 py-4 text-sm">Chưa có giao dịch ${type === "expense" ? "chi tiêu" : "thu nhập"} nào trong tháng này.</div>`;
    return;
  }

  const total = sortedData.reduce((sum, item) => sum + item.amount, 0);

  let html = `<div class="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">`;
  sortedData.forEach(item => {
    const percentage = ((item.amount / total) * 100).toFixed(1);
    const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.amount);
    
    html += `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 dark:border-gray-800">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${item.color}"></span>
          <span class="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[120px]">${item.label}</span>
          <span class="text-gray-400">(${percentage}%)</span>
        </div>
        <span class="font-semibold text-gray-900 dark:text-white">${formattedAmount}</span>
      </div>
    `;
  });
  html += `</div>`;

  container.innerHTML = html;
}
