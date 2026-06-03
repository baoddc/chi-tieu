/**
 * GOOGLE APPS SCRIPT DATABASE PROXY FOR EXPENSE APP
 * 
 * Hướng dẫn sử dụng:
 * 1. Mở Google Sheet của bạn.
 * 2. Chọn Extensions (Tiện ích mở rộng) > Apps Script.
 * 3. Xóa mọi mã hiện có và dán toàn bộ đoạn mã này vào.
 * 4. Nhấn Save (Lưu).
 * 5. Chọn Deploy (Triển khai) > New deployment (Triển khai mới).
 * 6. Click biểu tượng bánh răng bên cạnh "Select type" và chọn "Web app".
 * 7. Thiết lập cấu hình:
 *    - Description: Expense App API
 *    - Execute as: Me (Tài khoản Google của bạn)
 *    - Who has access: Anyone (Mọi người)
 * 8. Nhấn Deploy. Ủy quyền truy cập nếu được yêu cầu.
 * 9. Copy "Web app URL" và dán vào phần Cài đặt của Ứng dụng.
 */

// Định nghĩa cấu trúc bảng (Cột đầu tiên BẮT BUỘC là "id")
var TABLES = {
  "Transactions": ["id", "date", "amount", "category", "type", "note", "wallet"],
  "Categories": ["id", "name", "type", "color", "icon", "budget"],
  "Wallets": ["id", "name", "color", "icon"],
  "Debts": ["id", "lender", "type", "amount", "date", "dueDate", "note", "wallet"]
};

// Hàm xử lý yêu cầu GET: Đọc toàn bộ dữ liệu
function doGet(e) {
  try {
    var data = readAllData();
    return createJsonResponse({ success: true, data: data });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

// Hàm xử lý yêu cầu POST: Thêm, sửa, xóa (Gửi dưới dạng text/plain để tránh CORS Preflight OPTIONS)
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      throw new Error("No payload received");
    }
    
    var request = JSON.parse(e.postData.contents);
    var action = request.action;
    var tableName = request.table;
    var payload = request.data;
    
    if (!TABLES[tableName]) {
      throw new Error("Bảng không hợp lệ: " + tableName);
    }
    
    var result;
    if (action === "readAll") {
      result = readAllData();
    } else if (action === "insertRow") {
      result = insertRow(tableName, payload);
    } else if (action === "updateRow") {
      result = updateRow(tableName, payload.id, payload);
    } else if (action === "deleteRow") {
      result = deleteRow(tableName, payload.id);
    } else if (action === "syncAll") {
      result = syncAllData(payload); // Đồng bộ toàn bộ dữ liệu (ghi đè từ Client nếu cần)
    } else {
      throw new Error("Hành động không được hỗ trợ: " + action);
    }
    
    return createJsonResponse({ success: true, data: result });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  }
}

// Tiện ích trả về JSON có CORS Headers
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Lấy hoặc tạo Sheet tự động
function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    var headers = TABLES[name];
    sheet.appendRow(headers);
    // Format header
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight("bold");
    range.setBackground("#f3f4f6");
    range.setFontColor("#374151");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Đọc tất cả bảng dữ liệu
function readAllData() {
  var result = {};
  for (var tableName in TABLES) {
    var sheet = getOrCreateSheet(tableName);
    var headers = TABLES[tableName];
    var data = [];
    
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
      for (var r = 0; r < values.length; r++) {
        var rowObj = {};
        for (var c = 0; c < headers.length; c++) {
          rowObj[headers[c]] = values[r][c];
        }
        data.push(rowObj);
      }
    }
    result[tableName] = data;
  }
  return result;
}

// Thêm dòng mới
function insertRow(tableName, rowData) {
  var sheet = getOrCreateSheet(tableName);
  var headers = TABLES[tableName];
  var rowValues = [];
  
  for (var i = 0; i < headers.length; i++) {
    var val = rowData[headers[i]];
    rowValues.push(val !== undefined ? val : "");
  }
  
  sheet.appendRow(rowValues);
  return rowData;
}

// Sửa dòng dựa vào ID
function updateRow(tableName, id, rowData) {
  if (!id) throw new Error("Yêu cầu ID để cập nhật dòng.");
  var sheet = getOrCreateSheet(tableName);
  var headers = TABLES[tableName];
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) throw new Error("Không có dữ liệu trong bảng để cập nhật.");
  
  // Tìm cột ID (luôn ở cột 1)
  var idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var rowIndex = -1;
  for (var i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0]) === String(id)) {
      rowIndex = i + 2; // +2 vì index bắt đầu từ 0 và dòng tiêu đề là dòng 1
      break;
    }
  }
  
  if (rowIndex === -1) {
    // Nếu không tìm thấy, thực hiện thêm mới (upsert)
    return insertRow(tableName, rowData);
  }
  
  // Cập nhật các ô trong dòng
  for (var c = 0; c < headers.length; c++) {
    var key = headers[c];
    if (rowData[key] !== undefined) {
      sheet.getRange(rowIndex, c + 1).setValue(rowData[key]);
    }
  }
  return rowData;
}

// Xóa dòng dựa vào ID
function deleteRow(tableName, id) {
  if (!id) throw new Error("Yêu cầu ID để xóa dòng.");
  var sheet = getOrCreateSheet(tableName);
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;
  
  var idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var rowIndex = -1;
  for (var i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0]) === String(id)) {
      rowIndex = i + 2;
      break;
    }
  }
  
  if (rowIndex !== -1) {
    sheet.deleteRow(rowIndex);
    return true;
  }
  return false;
}

// Đồng bộ toàn bộ bảng dữ liệu từ Client (Dùng khi người dùng muốn ghi đè hoặc đẩy dữ liệu offline lên)
function syncAllData(payload) {
  for (var tableName in payload) {
    if (!TABLES[tableName]) continue;
    var sheet = getOrCreateSheet(tableName);
    
    // Xóa toàn bộ dữ liệu cũ (trừ dòng tiêu đề)
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
    
    var items = payload[tableName] || [];
    var headers = TABLES[tableName];
    
    if (items.length > 0) {
      var rowsToAppend = [];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var row = [];
        for (var c = 0; c < headers.length; c++) {
          var val = item[headers[c]];
          row.push(val !== undefined ? val : "");
        }
        rowsToAppend.push(row);
      }
      sheet.getRange(2, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
    }
  }
  return readAllData();
}
