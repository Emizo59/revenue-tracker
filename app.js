/*
  ======================================================
  AuraEngine - Premium Financial Rollover Logic & UI Controller
  Author: Antigravity Pair Programmer
  ======================================================
*/

// Application State
const todayDate = new Date();
let currentYear = todayDate.getFullYear();
let currentMonth = todayDate.getMonth() + 1; // System month (1-12)
let daysInMonth = 31;
let dailyData = []; // Array of { dayNum: X, dateStr: Y, weekNum: Z, revenue: R }
let weeklyDeposits = { 1: 0, 2: 0, 3: 0, 4: 0 }; // User inputs for Bank deposits
let weeklySummaries = {}; // Calculated values for each week
let autoCalcDeposits = true; // Auto-calculate deposits to nearest 50 below
let weeklyDepositsManuallyEdited = { 1: false, 2: false, 3: false, 4: false };
let availableYears = [currentYear];

// Chart Instances
let dailyTrendChart = null;
let weeklyComparisonChart = null;

// Day of week Arabic labels
const ARABIC_DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", 
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

// Apply theme immediately on script evaluation to avoid flash of original theme
const savedTheme = localStorage.getItem("book1_tracker_theme");
if (savedTheme === "chic") {
  document.body.classList.add("theme-chic");
}

// Document Ready
document.addEventListener("DOMContentLoaded", () => {
  // Check if the application was recently updated
  const justUpdated = localStorage.getItem("book1_tracker_just_updated");
  if (justUpdated === "true") {
    localStorage.removeItem("book1_tracker_just_updated");
    setTimeout(() => {
      const versionStr = window.CURRENT_VERSION || "2.5";
      showToast(`تم التحديث إلى آخر إصدار (v${versionStr}) بنجاح! 🎉`);
    }, 1500);
  }

  // Sync the theme toggle button appearance
  updateThemeButtonUI(document.body.classList.contains("theme-chic"));

  // Load available years from localStorage
  const savedYears = localStorage.getItem("book1_tracker_available_years");
  if (savedYears) {
    try {
      availableYears = JSON.parse(savedYears);
      if (!availableYears.includes(currentYear)) {
        availableYears.push(currentYear);
      }
    } catch (e) {
      availableYears = [currentYear];
    }
  } else {
    availableYears = [currentYear];
  }
  availableYears.sort((a, b) => a - b);
  
  renderYearDropdown();
  
  // Sync default month in UI dropdown
  const monthSelect = document.getElementById("month-select");
  if (monthSelect) {
    monthSelect.value = String(currentMonth);
  }
  
  initializeMonthStructure();
  
  // Custom scroll event or other UI micro-animations
  const listContainer = document.querySelector(".daily-table-container");
  if (listContainer) {
    listContainer.addEventListener("scroll", () => {
      // Add subtle visual indicator when scrolling table
      const tableHeader = document.querySelector(".daily-table th");
      if (tableHeader) {
        if (listContainer.scrollTop > 10) {
          tableHeader.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.4)";
        } else {
          tableHeader.style.boxShadow = "none";
        }
      }
    });
  }
});

// Render the year select options dynamically based on availableYears list
function renderYearDropdown() {
  const yearSelect = document.getElementById("year-select");
  if (!yearSelect) return;
  
  yearSelect.innerHTML = "";
  
  availableYears.forEach(yr => {
    const option = document.createElement("option");
    option.value = yr;
    option.textContent = yr;
    yearSelect.appendChild(option);
  });
  
  // Re-select currentYear
  yearSelect.value = currentYear;
}

// Theme Toggle Logic
function toggleTheme() {
  const isChic = document.body.classList.toggle("theme-chic");
  localStorage.setItem("book1_tracker_theme", isChic ? "chic" : "original");
  
  updateThemeButtonUI(isChic);
  
  // Re-draw charts to apply correct tick/grid colors for the new theme
  renderCharts();
  
  showToast(isChic ? "تم تفعيل المظهر البسيط الأنيق!" : "تمت العودة للمظهر الزجاجي الداكن الأصلي!");
}

function updateThemeButtonUI(isChic) {
  const btnText = document.getElementById("theme-btn-text");
  const btnIcon = document.querySelector("#theme-toggle-btn i");
  
  if (isChic) {
    if (btnText) btnText.textContent = "المظهر الداكن الأصلي";
    if (btnIcon) {
      btnIcon.className = "fa-solid fa-moon";
      btnIcon.style.color = "var(--accent-secondary)";
    }
  } else {
    if (btnText) btnText.textContent = "المظهر البسيط الأنيق";
    if (btnIcon) {
      btnIcon.className = "fa-solid fa-wand-magic-sparkles";
      btnIcon.style.color = "var(--accent-primary)";
    }
  }
}

// Calculate custom week number based on Book1 layout rules:
// Week 1: Days 1-8 (8 days)
// Week 2: Days 9-15 (7 days)
// Week 3: Days 16-22 (7 days)
// Week 4: Days 23-29 (7 days)
// Week 5: Days 30 to end of month (2 days in Jan)
function getCustomWeekNum(day) {
  if (day >= 1 && day <= 8) return 1;
  if (day >= 9 && day <= 15) return 2;
  if (day >= 16 && day <= 22) return 3;
  return 4; // الأسبوع الرابع يستوعب جميع الأيام المتبقية لنهاية الشهر
}

// Find the last custom week number for the month based on total days
function getLastWeekOfMonth(year, month) {
  return 4; // جميع الشهور تتكون من 4 أسابيع بالضبط
}

// Fetch the remaining balance of the previous month to carry it over as initial balance
// MODIFIED: Each month is closed completely, so carryover from previous month is always 0.
function getPreviousMonthRemaining(year, month) {
  return 0;
}

// Cascade remaining balance down to subsequent months of the current year in localStorage
// MODIFIED: Since months are independent and each closed completely, no cascading rollover is needed.
function cascadeRolloverToFutureMonths(year, month) {
  // Month-to-month cascading is disabled.
}

// Generate week date ranges for display based on month-year
function getWeekDateRangeStr(weekNum, year, month) {
  if (weekNum === 1) return `1 ${ARABIC_MONTHS[month-1]} - 8 ${ARABIC_MONTHS[month-1]}`;
  if (weekNum === 2) return `9 ${ARABIC_MONTHS[month-1]} - 15 ${ARABIC_MONTHS[month-1]}`;
  if (weekNum === 3) return `16 ${ARABIC_MONTHS[month-1]} - 22 ${ARABIC_MONTHS[month-1]}`;
  
  const lastDay = new Date(year, month, 0).getDate();
  return `23 ${ARABIC_MONTHS[month-1]} - ${lastDay} ${ARABIC_MONTHS[month-1]}`;
}

// Initialize calendars and data structures
function initializeMonthStructure() {
  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");
  
  if (monthSelect && yearSelect) {
    currentYear = parseInt(yearSelect.value);
    currentMonth = parseInt(monthSelect.value);
  }
  
  // Calculate total days in selected month
  daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  
  // Try loading from localStorage
  const storageKey = `book1_tracker_data_${currentYear}_${currentMonth}`;
  const savedData = localStorage.getItem(storageKey);
  
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData);
      dailyData = parsed.dailyData;
      // Sanitize dailyData to ensure the week mapping is updated to the new 4-week system
      if (dailyData && Array.isArray(dailyData)) {
        dailyData.forEach(item => {
          item.weekNum = getCustomWeekNum(item.dayNum);
        });
      }
      weeklyDeposits = parsed.weeklyDeposits;
      autoCalcDeposits = parsed.autoCalcDeposits !== undefined ? parsed.autoCalcDeposits : true;
      weeklyDepositsManuallyEdited = parsed.weeklyDepositsManuallyEdited !== undefined ? parsed.weeklyDepositsManuallyEdited : { 1: false, 2: false, 3: false, 4: false };
    } catch (e) {
      console.error("Error parsing saved state, generating fresh instead", e);
      generateFreshMonthlyData();
    }
  } else {
    generateFreshMonthlyData();
  }
  
  // Trigger full calculations and render
  calculateAllRollover();
  renderAllUI();
  showToast("تم تحميل بيانات الشهر بنجاح!");
}

// Generate empty default month grid
function generateFreshMonthlyData() {
  dailyData = [];
  weeklyDeposits = { 1: 0, 2: 0, 3: 0, 4: 0 };
  weeklyDepositsManuallyEdited = { 1: false, 2: false, 3: false, 4: false };
  
  for (let day = 1; day <= daysInMonth; day++) {
    // Determine the day name in Arabic
    const dateObj = new Date(currentYear, currentMonth - 1, day);
    const dayOfWeekIndex = dateObj.getDay();
    const dayName = ARABIC_DAYS[dayOfWeekIndex];
    const dateStr = `${dayName} ${day}/${currentMonth}/${currentYear}`;
    
    dailyData.push({
      dayNum: day,
      dateStr: dateStr,
      weekNum: getCustomWeekNum(day),
      revenue: 0
    });
  }
}

// Main Rollover Cascading Math Engine
function calculateAllRollover() {
  // Reset sums
  weeklySummaries = {
    1: { revenue: 0, carried: 0, total: 0, deposit: 0, remaining: 0 },
    2: { revenue: 0, carried: 0, total: 0, deposit: 0, remaining: 0 },
    3: { revenue: 0, carried: 0, total: 0, deposit: 0, remaining: 0 },
    4: { revenue: 0, carried: 0, total: 0, deposit: 0, remaining: 0 }
  };
  
  // 1. Calculate sum of daily revenues for each week
  dailyData.forEach(item => {
    if (weeklySummaries[item.weekNum]) {
      weeklySummaries[item.weekNum].revenue += parseFloat(item.revenue || 0);
    }
  });
  
  // 2. Cascade rollover balance from Week 1 to Week 4 (starting with previous month remaining)
  let runningCarryover = getPreviousMonthRemaining(currentYear, currentMonth);
  
  for (let w = 1; w <= 4; w++) {
    const summary = weeklySummaries[w];
    summary.carried = runningCarryover;
    summary.total = summary.revenue + summary.carried;
    
    // Auto-calculate deposit if enabled and not manually edited for this week
    if (autoCalcDeposits && !weeklyDepositsManuallyEdited[w]) {
      // Calculate largest multiple of 50 less than or equal to summary.total
      const autoDeposit = Math.floor(summary.total / 50) * 50;
      weeklyDeposits[w] = autoDeposit > 0 ? autoDeposit : 0;
    }
    
    summary.deposit = parseFloat(weeklyDeposits[w] || 0);
    
    // Remaining is Total Available - Deposited
    summary.remaining = summary.total - summary.deposit;
    
    // Pass this remaining balance to the next week
    runningCarryover = summary.remaining;
  }
  
  // Save the final remaining balance from the last week of the month
  const lastWeek = getLastWeekOfMonth(currentYear, currentMonth);
  const finalRemainingVal = weeklySummaries[lastWeek].remaining;
  
  // 3. Save current state to localStorage
  const storageKey = `book1_tracker_data_${currentYear}_${currentMonth}`;
  localStorage.setItem(storageKey, JSON.stringify({
    dailyData,
    weeklyDeposits,
    autoCalcDeposits,
    weeklyDepositsManuallyEdited,
    finalRemaining: finalRemainingVal
  }));
  
  // 4. Cascade calculations to all subsequent months dynamically
  cascadeRolloverToFutureMonths(currentYear, currentMonth);
  
  // 5. Update Yearly Overview in real-time if it is currently visible
  const yearlyWrapper = document.getElementById("yearly-section-wrapper");
  if (yearlyWrapper && yearlyWrapper.style.display !== "none") {
    renderYearlyOverview();
  }
}

// Render dynamic tables, metrics cards, and charts
function renderAllUI() {
  renderMetricsCards();
  renderDailyRevenueTable();
  renderWeeklyRolloverCards();
  renderCharts();
  
  // Sync auto-calculate toggle checkbox in the UI
  const autoCalcToggle = document.getElementById("auto-calc-toggle");
  if (autoCalcToggle) {
    autoCalcToggle.checked = autoCalcDeposits;
  }
}

// Update Top Metric Summary Cards
function renderMetricsCards() {
  let totalRevenue = 0;
  let totalDeposits = 0;
  let netRemaining = 0;
  
  // Sum overall monthly metrics
  dailyData.forEach(item => {
    totalRevenue += parseFloat(item.revenue || 0);
  });
  
  const lastWeek = getLastWeekOfMonth(currentYear, currentMonth);
  for (let w = 1; w <= lastWeek; w++) {
    totalDeposits += parseFloat(weeklyDeposits[w] || 0);
  }
  
  // The final remaining balance in the last valid week is the net remaining
  netRemaining = weeklySummaries[lastWeek].remaining;
  
  // Calculate average daily revenue
  const averageDaily = totalRevenue / daysInMonth;
  
  // Update DOM elements with nice transitions
  animateValue("metric-total-revenue", totalRevenue);
  animateValue("metric-total-deposits", totalDeposits);
  animateValue("metric-total-remaining", netRemaining);
  animateValue("metric-daily-average", averageDaily);
}

// Animate metric number changes for premium feel
function animateValue(id, endValue) {
  const obj = document.getElementById(id);
  const formattedVal = parseFloat(endValue).toLocaleString('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  // Display using English numbers inside the HTML with ر.س logo
  obj.innerHTML = `${parseFloat(endValue).toFixed(2)} <span class="metric-currency">ر.س</span>`;
}

// Render Daily Input spreadsheet table
function renderDailyRevenueTable() {
  const tbody = document.getElementById("daily-table-body");
  tbody.innerHTML = "";
  
  dailyData.forEach((item, index) => {
    // إدراج صف فاصل مميز عند بداية كل أسبوع جديد
    if (index === 0 || item.weekNum !== dailyData[index - 1].weekNum) {
      const separatorTr = document.createElement("tr");
      separatorTr.className = "week-separator-row";
      separatorTr.setAttribute("data-week", item.weekNum);
      
      const ARABIC_WEEK_NAMES = ["الأسبوع الأول", "الأسبوع الثاني", "الأسبوع الثالث", "الأسبوع الرابع", "الأسبوع الخامس"];
      const weekColors = [
        "linear-gradient(270deg, rgba(59, 130, 246, 0.12) 0%, transparent 100%)", // Blue
        "linear-gradient(270deg, rgba(168, 85, 247, 0.12) 0%, transparent 100%)", // Violet
        "linear-gradient(270deg, rgba(236, 72, 153, 0.12) 0%, transparent 100%)", // Pink
        "linear-gradient(270deg, rgba(245, 158, 11, 0.12) 0%, transparent 100%)",  // Amber
        "linear-gradient(270deg, rgba(16, 185, 129, 0.12) 0%, transparent 100%)"  // Emerald
      ];
      const weekBorderColors = ["#3b82f6", "#a855f7", "#ec4899", "#f5980b", "#10b981"];
      const currentWeekColor = weekBorderColors[(item.weekNum - 1) % weekBorderColors.length];
      const currentWeekBg = weekColors[(item.weekNum - 1) % weekColors.length];
      
      separatorTr.innerHTML = `
        <td colspan="4" style="padding: 14px 16px; background: ${currentWeekBg}; border-right: 4px solid ${currentWeekColor}; font-weight: 800; color: #fff; text-align: right; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.06); letter-spacing: 0.5px;">
          <i class="fa-solid fa-calendar-week" style="margin-left: 8px; color: ${currentWeekColor};"></i>
          ${ARABIC_WEEK_NAMES[(item.weekNum - 1) % ARABIC_WEEK_NAMES.length]}
        </td>
      `;
      tbody.appendChild(separatorTr);
    }

    const tr = document.createElement("tr");
    tr.id = `daily-row-${item.dayNum}`;
    tr.setAttribute("data-week", item.weekNum);
    
    // Add distinct classes or styles depending on the week
    const weekClasses = ["w1-badge", "w2-badge", "w3-badge", "w4-badge", "w5-badge"];
    const weekClass = weekClasses[(item.weekNum - 1) % weekClasses.length] || "w1-badge";
    
    const weekBorderColors = ["#3b82f6", "#a855f7", "#ec4899", "#f5980b", "#10b981"];
    const currentWeekColor = weekBorderColors[(item.weekNum - 1) % weekBorderColors.length];
    
    // إضافة خط جانبي خفيف للأيام يطابق لون الأسبوع التابع له لتميز بصري فائق
    tr.style.borderRight = `3px solid ${currentWeekColor}33`; 
    
    tr.innerHTML = `
      <td style="text-align: center; font-family: 'Outfit', sans-serif; font-weight: 600; color: var(--text-secondary);">${item.dayNum}</td>
      <td style="font-weight: 600;">${item.dateStr}</td>
      <td style="text-align: center;">
        <span class="week-badge ${weekClass}">أسبوع ${item.weekNum}</span>
      </td>
      <td style="text-align: left;">
        <div style="display: inline-flex; align-items: center; gap: 8px;">
          <input 
            type="number" 
            class="cell-input" 
            value="${item.revenue || ''}" 
            placeholder="0.00" 
            min="0" 
            step="0.01"
            oninput="updateDailyRevenue(${item.dayNum}, this.value)"
          >
          <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">ر.س</span>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Filter the daily table display by week tabs
function filterDailyTable(filter) {
  // Update tab classes
  document.querySelectorAll(".filter-tab").forEach(tab => tab.classList.remove("active"));
  
  if (filter === 'all') {
    document.getElementById("tab-all").classList.add("active");
  } else {
    document.getElementById(`tab-w${filter}`).classList.add("active");
  }
  
  // Toggle row visibility
  const rows = document.querySelectorAll("#daily-table-body tr");
  rows.forEach(row => {
    const rowWeek = parseInt(row.getAttribute("data-week"));
    if (filter === 'all' || rowWeek === parseInt(filter)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

// Update single daily revenue amount
function updateDailyRevenue(dayNum, val) {
  const parsedVal = parseFloat(val);
  const index = dailyData.findIndex(item => item.dayNum === dayNum);
  
  if (index !== -1) {
    dailyData[index].revenue = isNaN(parsedVal) ? 0 : parsedVal;
    
    // Recalculate rollover balance cascade and refresh only impacted parts of UI
    calculateAllRollover();
    renderMetricsCards();
    updateWeeklyRolloverUI();
    updateChartsRealtime();
  }
}

// Render weekly rollover summary cards on the right
function renderWeeklyRolloverCards() {
  const container = document.getElementById("weekly-flow-cards-container");
  container.innerHTML = "";
  
  const ARABIC_WEEK_NAMES = ["الأسبوع الأول", "الأسبوع الثاني", "الأسبوع الثالث", "الأسبوع الرابع"];
  const lastWeek = getLastWeekOfMonth(currentYear, currentMonth);
  
  for (let w = 1; w <= 4; w++) {
    const summary = weeklySummaries[w];
    const dateRangeStr = getWeekDateRangeStr(w, currentYear, currentMonth);
    
    const card = document.createElement("div");
    card.id = `week-flow-card-${w}`;
    
    card.className = "week-flow-card";
    
    // Auto-calculate suggestion badge and suggestion chips
    const autoDepositSuggestion = Math.floor(summary.total / 50) * 50;
    const nextMultipleSuggestion = autoDepositSuggestion + 50;
    
    let helperHTML = '';
    if (!weeklyDepositsManuallyEdited[w]) {
      helperHTML = `
        <div class="deposit-helper-badge auto-active">
          <i class="fa-solid fa-magic"></i>
          <span>حساب تلقائي بمضاعفات الـ 50</span>
        </div>
      `;
    } else {
      if (summary.total <= 0) {
        helperHTML = `
          <div class="deposit-helper-badge manual-active">
            <span>لا يوجد رصيد كافٍ</span>
            <button class="btn-reset-auto" onclick="resetDepositToAuto(${w})" title="إرجاع للحساب التلقائي">
              <i class="fa-solid fa-arrow-rotate-left"></i>
            </button>
          </div>
        `;
      } else {
        helperHTML = `
          <div class="deposit-helper-badge manual-active">
            <span>مقترح:</span>
            <button class="suggestion-chip" onclick="setManualDeposit(${w}, ${autoDepositSuggestion})">${autoDepositSuggestion} ر.س</button>
            <button class="suggestion-chip" onclick="setManualDeposit(${w}, ${nextMultipleSuggestion})">${nextMultipleSuggestion} ر.س</button>
            <button class="btn-reset-auto" onclick="resetDepositToAuto(${w})" title="إرجاع للحساب التلقائي">
              <i class="fa-solid fa-arrow-rotate-left"></i>
            </button>
          </div>
        `;
      }
    }
    
    card.innerHTML = `
      <div class="week-flow-header">
        <div class="week-flow-title">
          <span class="week-dot dot-${w}"></span>
          <span>${ARABIC_WEEK_NAMES[w - 1]}</span>
        </div>
        <span class="week-flow-dates">${dateRangeStr}</span>
      </div>
      
      <div class="week-flow-stats">
        <div class="stat-item">
          <span class="stat-label">إجمالي إيراد الأيام</span>
          <span class="stat-value revenue-color" id="week-revenue-${w}">${summary.revenue.toFixed(2)} ر.س</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">${w === 1 ? `الرصيد الافتتاحي للشهر (+)` : 'الرصيد المرحّل (+)'}</span>
          <span class="stat-value carry-color" id="week-carried-${w}">${summary.carried.toFixed(2)} ر.س</span>
        </div>
        <div class="stat-item" style="grid-column: span 2; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 6px; margin-top: 4px;">
          <span class="stat-label">إجمالي المتاح حسابياً</span>
          <span class="stat-value" id="week-total-${w}" style="color: #fff; font-size: 1.1rem;">${summary.total.toFixed(2)} ر.س</span>
        </div>
      </div>
      
      <div class="week-flow-deposit-section">
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div class="flow-input-container">
            <span class="stat-label" style="margin-left: 6px;">تم إيداعه (-):</span>
            <input 
              type="number" 
              class="deposit-input" 
              id="week-deposit-input-${w}"
              value="${summary.deposit || ''}" 
              placeholder="0.00" 
              min="0"
              step="0.01"
              oninput="updateWeeklyDeposit(${w}, this.value)"
            >
            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">ر.س</span>
          </div>
          <div id="week-deposit-helper-${w}">
            ${helperHTML}
          </div>
        </div>
        
        <!-- Highlighted Remaining Balance Box -->
        <div class="remaining-badge-box">
          <span class="remaining-badge-label">المتبقي من آخر إيداع</span>
          <span class="remaining-badge-value" id="week-remaining-${w}">${summary.remaining.toFixed(2)} ر.س</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  }
  
  // Append Month Closing Card at the bottom
  const finalRemainingVal = weeklySummaries[lastWeek].remaining;
  
  const closingCard = document.createElement("div");
  closingCard.className = "week-flow-card month-closing-card";
  closingCard.style.marginTop = "1rem";
  closingCard.style.border = "1px solid var(--accent-secondary)";
  closingCard.style.background = "rgba(236, 72, 153, 0.03)";
  
  closingCard.innerHTML = `
    <div class="week-flow-header" style="border-bottom: 1px solid rgba(236, 72, 153, 0.15); padding-bottom: 8px; margin-bottom: 10px;">
      <div class="week-flow-title" style="color: var(--accent-secondary);">
        <i class="fa-solid fa-lock" style="font-size: 1rem;"></i>
        <span style="font-weight: 800; font-size: 1rem;">إغلاق الحسابات لشهر ${ARABIC_MONTHS[currentMonth - 1]}</span>
      </div>
      <span class="week-badge" style="background: rgba(236, 72, 153, 0.15); color: var(--accent-secondary); font-weight: 700;">مغلق بالكامل</span>
    </div>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 600;">الرصيد المتبقي الكلي (الكسور):</span>
        <span id="month-closing-remaining-value" style="font-family: 'Outfit', sans-serif; font-weight: 800; color: #fff; font-size: 1.1rem;">${finalRemainingVal.toFixed(2)} ر.س</span>
      </div>
      
      <div class="remaining-badge-box" style="margin: 5px 0 0 0; width: 100%; align-items: center; background: rgba(236, 72, 153, 0.08); border-color: rgba(236, 72, 153, 0.3);">
        <span class="remaining-badge-label" style="color: var(--accent-secondary); font-weight: 800; font-size: 0.75rem;">تم التحويل إلى حساب الشركة</span>
        <span id="month-closing-company-value" class="remaining-badge-value" style="color: #fff; font-size: 1.3rem; text-shadow: 0 0 10px rgba(236, 72, 153, 0.4);">${finalRemainingVal.toFixed(2)} ر.س</span>
      </div>
      
      <div style="display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-align: center; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 8px;">
        <i class="fa-solid fa-arrow-right-to-bracket" style="transform: rotate(180deg); color: var(--color-remaining);"></i>
        <span>الرصيد المرحل لشهر ${ARABIC_MONTHS[currentMonth === 12 ? 0 : currentMonth]} ${currentMonth === 12 ? currentYear + 1 : currentYear}:</span>
        <strong style="color: var(--color-remaining); font-family: 'Outfit'; font-size: 0.85rem;">0.00 ر.س</strong>
      </div>
    </div>
  `;
  container.appendChild(closingCard);
}

// Seamlessly update weekly rollover UI elements without destroying input focus
function updateWeeklyRolloverUI() {
  const lastWeek = getLastWeekOfMonth(currentYear, currentMonth);
  
  for (let w = 1; w <= 4; w++) {
    if (w > lastWeek) continue;
    const summary = weeklySummaries[w];
    
    // Update daily revenue sum
    const revEl = document.getElementById(`week-revenue-${w}`);
    if (revEl) revEl.textContent = `${summary.revenue.toFixed(2)} ر.س`;
    
    // Update carried over sum
    const carriedEl = document.getElementById(`week-carried-${w}`);
    if (carriedEl) carriedEl.textContent = `${summary.carried.toFixed(2)} ر.س`;
    
    // Update total available
    const totalEl = document.getElementById(`week-total-${w}`);
    if (totalEl) totalEl.textContent = `${summary.total.toFixed(2)} ر.س`;
    
    // Update remaining balance badge
    const remainingEl = document.getElementById(`week-remaining-${w}`);
    if (remainingEl) remainingEl.textContent = `${summary.remaining.toFixed(2)} ر.س`;
    
    // Sync deposit input if NOT focused
    const depositInput = document.getElementById(`week-deposit-input-${w}`);
    if (depositInput && document.activeElement !== depositInput) {
      depositInput.value = summary.deposit || '';
    }
    
    // Update dynamic helper badge
    const helperEl = document.getElementById(`week-deposit-helper-${w}`);
    if (helperEl) {
      const autoDepositSuggestion = Math.floor(summary.total / 50) * 50;
      const nextMultipleSuggestion = autoDepositSuggestion + 50;
      
      let helperHTML = '';
      if (!weeklyDepositsManuallyEdited[w]) {
        helperHTML = `
          <div class="deposit-helper-badge auto-active">
            <i class="fa-solid fa-magic"></i>
            <span>حساب تلقائي بمضاعفات الـ 50</span>
          </div>
        `;
      } else {
        if (summary.total <= 0) {
          helperHTML = `
            <div class="deposit-helper-badge manual-active">
              <span>لا يوجد رصيد كافٍ</span>
              <button class="btn-reset-auto" onclick="resetDepositToAuto(${w})" title="إرجاع للحساب التلقائي">
                <i class="fa-solid fa-arrow-rotate-left"></i>
              </button>
            </div>
          `;
        } else {
          helperHTML = `
            <div class="deposit-helper-badge manual-active">
              <span>مقترح:</span>
              <button class="suggestion-chip" onclick="setManualDeposit(${w}, ${autoDepositSuggestion})">${autoDepositSuggestion} ر.س</button>
              <button class="suggestion-chip" onclick="setManualDeposit(${w}, ${nextMultipleSuggestion})">${nextMultipleSuggestion} ر.س</button>
              <button class="btn-reset-auto" onclick="resetDepositToAuto(${w})" title="إرجاع للحساب التلقائي">
                <i class="fa-solid fa-arrow-rotate-left"></i>
              </button>
            </div>
          `;
        }
      }
      helperEl.innerHTML = helperHTML;
    }
  }
  
  // Update closing card values dynamically
  const finalRemainingVal = weeklySummaries[lastWeek].remaining;
  const closingRemaining = document.getElementById("month-closing-remaining-value");
  if (closingRemaining) {
    closingRemaining.textContent = `${finalRemainingVal.toFixed(2)} ر.س`;
  }
  const closingCompany = document.getElementById("month-closing-company-value");
  if (closingCompany) {
    closingCompany.textContent = `${finalRemainingVal.toFixed(2)} ر.س`;
  }
}

// Update single weekly deposit amount
function updateWeeklyDeposit(weekNum, val) {
  const parsedVal = parseFloat(val);
  
  if (val.trim() === "") {
    // Reset manual flag to snap back to auto-calculation
    weeklyDepositsManuallyEdited[weekNum] = false;
  } else {
    weeklyDepositsManuallyEdited[weekNum] = true;
    weeklyDeposits[weekNum] = isNaN(parsedVal) ? 0 : parsedVal;
  }
  
  // Recalculate rollover cascade and refresh metrics, cards, and charts
  calculateAllRollover();
  renderMetricsCards();
  updateWeeklyRolloverUI();
  updateChartsRealtime();
}

// Set manual deposit value from chips
function setManualDeposit(weekNum, value) {
  weeklyDepositsManuallyEdited[weekNum] = true;
  weeklyDeposits[weekNum] = value;
  
  calculateAllRollover();
  renderMetricsCards();
  
  const depositInput = document.getElementById(`week-deposit-input-${weekNum}`);
  if (depositInput) {
    depositInput.value = value;
  }
  
  updateWeeklyRolloverUI();
  updateChartsRealtime();
  showToast(`تم تحديد إيداع الأسبوع ${weekNum} بقيمة ${value} ر.س`);
}

// Reset deposit override to snap back to auto multiple of 50
function resetDepositToAuto(weekNum) {
  weeklyDepositsManuallyEdited[weekNum] = false;
  calculateAllRollover();
  renderMetricsCards();
  
  const depositInput = document.getElementById(`week-deposit-input-${weekNum}`);
  if (depositInput) {
    depositInput.value = weeklySummaries[weekNum].deposit || '';
  }
  
  updateWeeklyRolloverUI();
  updateChartsRealtime();
  showToast(`تم إرجاع الأسبوع ${weekNum} للحساب التلقائي بمضاعفات الـ 50 (${weeklySummaries[weekNum].deposit} ر.س)`);
}

// Toggle Auto-calculation of deposits to nearest 50
function toggleAutoCalc(checked) {
  autoCalcDeposits = checked;
  
  if (autoCalcDeposits) {
    // Reset manual overrides so all fields recalculate automatically
    weeklyDepositsManuallyEdited = { 1: false, 2: false, 3: false, 4: false };
  }
  
  calculateAllRollover();
  renderAllUI();
  
  showToast(autoCalcDeposits 
    ? "تم تفعيل التوزيع التلقائي للإيداعات (مضاعفات الـ 50 ر.س)!" 
    : "تم إلغاء التفعيل التلقائي؛ يمكنك التحكم بالودائع يدوياً بالكامل."
  );
}



// Reusable Glassmorphism Custom Confirmation Modal
function showGlassConfirm(message, title, type, onConfirm) {
  const existing = document.getElementById("glass-confirm-modal");
  if (existing) existing.remove();
  
  const modal = document.createElement("div");
  modal.id = "glass-confirm-modal";
  
  let iconClass = "fa-circle-question";
  let iconColor = "var(--accent-secondary)";
  let btnClass = "btn-confirm-yes";
  
  if (type === "danger") {
    iconClass = "fa-triangle-exclamation";
    iconColor = "#ef4444";
    btnClass = "btn-confirm-danger";
  } else if (type === "success") {
    iconClass = "fa-calendar-check";
    iconColor = "#10b981";
    btnClass = "btn-confirm-success";
  }
  
  modal.innerHTML = `
    <div class="glass-confirm-box">
      <div class="glass-confirm-header">
        <i class="fa-solid ${iconClass} glass-confirm-icon" style="color: ${iconColor}; filter: drop-shadow(0 0 10px ${iconColor}40);"></i>
        <h3>${title || 'تأكيد الإجراء'}</h3>
      </div>
      <div class="glass-confirm-body">
        <p>${message}</p>
      </div>
      <div class="glass-confirm-actions">
        <button class="btn-glass-confirm ${btnClass}">تأكيد</button>
        <button class="btn-glass-confirm btn-confirm-no">إلغاء</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  setTimeout(() => {
    modal.classList.add("active");
  }, 10);
  
  const btnYes = modal.querySelector(`.${btnClass}`);
  const btnNo = modal.querySelector(".btn-confirm-no");
  
  btnYes.onclick = () => {
    modal.classList.remove("active");
    setTimeout(() => {
      modal.remove();
      if (onConfirm) onConfirm();
    }, 300);
  };
  
  btnNo.onclick = () => {
    modal.classList.remove("active");
    setTimeout(() => {
      modal.remove();
    }, 300);
  };
}

// Close current year and transition to the next year
function closeCurrentYearConfirm() {
  const nextYear = currentYear + 1;
  showGlassConfirm(
    `هل أنت متأكد من رغبتك في إغلاق السنة الحالية [${currentYear}] وحفظ كافة إغلاقاتها السنوية، والذهاب إلى السنة الجديدة [${nextYear}]؟`,
    "تأكيد إغلاق السنة الحالية",
    "success",
    () => {
      // 1. Add the next year to availableYears if it's not already in there
      if (!availableYears.includes(nextYear)) {
        availableYears.push(nextYear);
        availableYears.sort((a, b) => a - b);
        localStorage.setItem("book1_tracker_available_years", JSON.stringify(availableYears));
      }
      
      // 2. Set current year to next year and current month to January (1)
      currentYear = nextYear;
      currentMonth = 1;
      
      // 3. Re-render year dropdown and update DOM select elements
      renderYearDropdown();
      
      const yearSelect = document.getElementById("year-select");
      if (yearSelect) {
        yearSelect.value = currentYear;
      }
      
      const monthSelect = document.getElementById("month-select");
      if (monthSelect) {
        monthSelect.value = "1";
      }
      
      // 4. Load data and rebuild interface for the new year + month
      initializeMonthStructure();
      
      // 5. Show toast notification
      showToast(`تم إغلاق سنة ${currentYear - 1} والذهاب إلى سنة ${currentYear} بنجاح!`);
    }
  );
}

// Reset all 12 months after confirmation, and roll over to the next year if December was active
function resetAllDataConfirm() {
  showGlassConfirm(
    "هل أنت متأكد من تصفير وحذف البيانات لجميع شهور السنة؟ لا يمكن التراجع عن هذه الخطوة نهائياً.",
    "تصفير وحذف البيانات بالكامل",
    "danger",
    () => {
      // Check if December (month 12) had values in it
      let decemberWasActive = false;
      const decKey = `book1_tracker_data_${currentYear}_12`;
      const decSaved = localStorage.getItem(decKey);
      if (decSaved) {
        try {
          const parsedDec = JSON.parse(decSaved);
          const hasRevenue = parsedDec.dailyData && parsedDec.dailyData.some(d => parseFloat(d.revenue || 0) > 0);
          const hasDeposit = parsedDec.weeklyDeposits && Object.values(parsedDec.weeklyDeposits).some(dep => parseFloat(dep || 0) > 0);
          if (hasRevenue || hasDeposit) {
            decemberWasActive = true;
          }
        } catch (e) {
          console.error("Error checking December status", e);
        }
      }

      // Reset data for all 12 months of the current year
      for (let m = 1; m <= 12; m++) {
        localStorage.removeItem(`book1_tracker_data_${currentYear}_${m}`);
      }

      if (decemberWasActive) {
        // Transition to the next year
        currentYear++;
        currentMonth = 1; // Start in January of the new year
        
        // Save new year in available years list
        if (!availableYears.includes(currentYear)) {
          availableYears.push(currentYear);
          availableYears.sort((a, b) => a - b);
          localStorage.setItem("book1_tracker_available_years", JSON.stringify(availableYears));
        }
        
        // Clear data for the new year just in case to be clean
        for (let m = 1; m <= 12; m++) {
          localStorage.removeItem(`book1_tracker_data_${currentYear}_${m}`);
        }

        renderYearDropdown();
        const monthSelect = document.getElementById("month-select");
        if (monthSelect) {
          monthSelect.value = "1";
        }
        
        initializeMonthStructure();
        
        showToast(`تم تصفير كافة البيانات، وبما أن ديسمبر كان نشطاً، تم الانتقال إلى السنة التالية ${currentYear}! وتم حفظ السنوات السابقة للرجوع إليها.`);
      } else {
        // Re-initialize current month (which will generate fresh clean data since localStorage is cleared)
        initializeMonthStructure();
        renderYearDropdown();
        
        showToast(`تم تصفير وحذف كافة البيانات لجميع الشهور في سنة ${currentYear}!`);
      }
    }
  );
}

// Dynamic Charts Render Engine using Chart.js
function renderCharts() {
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js is not loaded. Skipping chart rendering.");
    return;
  }
  const dailyLabels = dailyData.map(item => `${item.dayNum}`);
  const dailyRevenues = dailyData.map(item => item.revenue);
  
  const isChic = document.body.classList.contains("theme-chic");
  
  // Choose chart typography colors based on active theme
  const gridColor = isChic ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)';
  const tickColor = isChic ? '#475569' : '#9ca3af';
  const legendColor = isChic ? '#1e293b' : '#f3f4f6';
  
  // Colors configured to match Glassmorphism theme
  const accentColorViolet = "#8b5cf6";
  const accentColorPink = "#ec4899";
  const accentColorBlue = isChic ? "#4f46e5" : "#3b82f6"; // Indigo for light theme, blue for dark
  
  // Destroy old charts to prevent memory leaks and glitchy tooltips
  if (dailyTrendChart) dailyTrendChart.destroy();
  if (weeklyComparisonChart) weeklyComparisonChart.destroy();
  
  // 1. Daily Trend Area Chart
  const trendCtx = document.getElementById("dailyTrendChart").getContext("2d");
  dailyTrendChart = new Chart(trendCtx, {
    type: 'line',
    data: {
      labels: dailyLabels,
      datasets: [{
        label: 'الإيراد اليومي (ر.س)',
        data: dailyRevenues,
        borderColor: accentColorBlue,
        borderWidth: 3,
        backgroundColor: isChic ? 'rgba(79, 70, 229, 0.08)' : 'rgba(59, 130, 246, 0.15)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: accentColorBlue,
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          titleFont: { family: 'Cairo' },
          bodyFont: { family: 'Cairo' },
          rtl: true
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: tickColor, font: { family: 'Outfit' } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: tickColor, font: { family: 'Outfit' } }
        }
      }
    }
  });
  
  // 2. Weekly Comparison Grouped Bar Chart
  const compCtx = document.getElementById("weeklyComparisonChart").getContext("2d");
  
  const lastWeek = getLastWeekOfMonth(currentYear, currentMonth);
  const weekLabels = [];
  const weekRevenues = [];
  const weekDepositsData = [];
  const weekRemainingData = [];
  
  for (let w = 1; w <= lastWeek; w++) {
    weekLabels.push(`أسبوع ${w}`);
    weekRevenues.push(weeklySummaries[w].revenue);
    weekDepositsData.push(weeklySummaries[w].deposit);
    weekRemainingData.push(weeklySummaries[w].remaining);
  }
  
  weeklyComparisonChart = new Chart(compCtx, {
    type: 'bar',
    data: {
      labels: weekLabels,
      datasets: [
        {
          label: 'إيراد الأسبوع',
          data: weekRevenues,
          backgroundColor: isChic ? 'rgba(79, 70, 229, 0.8)' : 'rgba(59, 130, 246, 0.7)',
          borderRadius: 6
        },
        {
          label: 'المبلغ المودع',
          data: weekDepositsData,
          backgroundColor: isChic ? 'rgba(217, 119, 6, 0.8)' : 'rgba(245, 158, 11, 0.7)',
          borderRadius: 6
        },
        {
          label: 'المتبقي من الإيداع',
          data: weekRemainingData,
          backgroundColor: isChic ? 'rgba(5, 150, 105, 0.8)' : 'rgba(16, 185, 129, 0.7)',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: legendColor, font: { family: 'Cairo', size: 11 } }
        },
        tooltip: {
          titleFont: { family: 'Cairo' },
          bodyFont: { family: 'Cairo' },
          rtl: true
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tickColor, font: { family: 'Cairo' } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: tickColor, font: { family: 'Outfit' } }
        }
      }
    }
  });
}

// Update charts in real-time when inputs are modified
function updateChartsRealtime() {
  if (typeof Chart === 'undefined') {
    return;
  }
  if (dailyTrendChart) {
    dailyTrendChart.data.datasets[0].data = dailyData.map(item => item.revenue);
    dailyTrendChart.update();
  }
  
  if (weeklyComparisonChart) {
    const lastWeek = getLastWeekOfMonth(currentYear, currentMonth);
    const weekLabels = [];
    const weekRevenues = [];
    const weekDepositsData = [];
    const weekRemainingData = [];
    
    for (let w = 1; w <= lastWeek; w++) {
      weekLabels.push(`أسبوع ${w}`);
      weekRevenues.push(weeklySummaries[w].revenue);
      weekDepositsData.push(weeklySummaries[w].deposit);
      weekRemainingData.push(weeklySummaries[w].remaining);
    }
    
    weeklyComparisonChart.data.labels = weekLabels;
    weeklyComparisonChart.data.datasets[0].data = weekRevenues;
    weeklyComparisonChart.data.datasets[1].data = weekDepositsData;
    weeklyComparisonChart.data.datasets[2].data = weekRemainingData;
    weeklyComparisonChart.update();
  }
}

// Show micro-notification toast
function showToast(message) {
  const toast = document.getElementById("app-toast");
  const msgSpan = document.getElementById("toast-message");
  
  msgSpan.textContent = message;
  toast.classList.add("show");
  
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

// Navigation sidebar switching
// Navigation sidebar switching
function switchTab(tabId) {
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach(item => item.classList.remove("active"));
  
  if (tabId === 'dashboard') {
    const el = document.getElementById("menu-dashboard") || menuItems[0];
    if (el) el.classList.add("active");
    
    // Show main workspace, hide yearly overview
    document.querySelector(".metrics-grid").style.display = "";
    document.querySelector(".dashboard-grid").style.display = "";
    document.getElementById("charts-section-wrapper").style.display = "";
    document.getElementById("yearly-section-wrapper").style.display = "none";
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (tabId === 'yearly') {
    const el = document.getElementById("menu-yearly") || menuItems[1];
    if (el) el.classList.add("active");
    
    // Hide main workspace, show yearly overview
    document.querySelector(".metrics-grid").style.display = "none";
    document.querySelector(".dashboard-grid").style.display = "none";
    document.getElementById("charts-section-wrapper").style.display = "none";
    document.getElementById("yearly-section-wrapper").style.display = "";
    
    // Render yearly cards
    renderYearlyOverview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (tabId === 'analytics') {
    const el = document.getElementById("menu-analytics") || menuItems[2];
    if (el) el.classList.add("active");
    
    // Show main workspace, hide yearly overview
    document.querySelector(".metrics-grid").style.display = "";
    document.querySelector(".dashboard-grid").style.display = "";
    document.getElementById("charts-section-wrapper").style.display = "";
    document.getElementById("yearly-section-wrapper").style.display = "none";
    
    document.getElementById("charts-section-wrapper").scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Export parsed Excel structure to full CSV format
function exportDataToCSV() {
  let csvContent = "\uFEFF"; // UTF-8 BOM so Excel opens with correct Arabic characters
  
  // 1. Add Daily Log Table Headers and Rows
  csvContent += "سجل الإيرادات اليومية\n";
  csvContent += "اليوم والتاريخ,رقم الأسبوع,الإيراد اليومي (ريال سعودي)\n";
  
  dailyData.forEach(item => {
    csvContent += `"${item.dateStr}",الأسبوع ${item.weekNum},${item.revenue.toFixed(2)}\n`;
  });
  
  csvContent += "\n\n";
  
  // 2. Add Weekly Rollover Summaries Table
  csvContent += "خلاصة الحسابات والترحيل الأسبوعي\n";
  csvContent += "الأسبوع,الفترة الزمنية,مجموع إيراد الأسبوع,الرصيد المرحل (+),إجمالي المتاح حسابياً,المبلغ المودع بالبنك (-),المتبقي من آخر إيداع\n";
  
  const ARABIC_WEEK_NAMES = ["الأسبوع الأول", "الأسبوع الثاني", "الأسبوع الثالث", "الأسبوع الرابع"];
  const lastWeek = getLastWeekOfMonth(currentYear, currentMonth);
  for (let w = 1; w <= lastWeek; w++) {
    const summary = weeklySummaries[w];
    const dateRangeStr = getWeekDateRangeStr(w, currentYear, currentMonth);
    csvContent += `"${ARABIC_WEEK_NAMES[w-1]}","${dateRangeStr}",${summary.revenue.toFixed(2)},${summary.carried.toFixed(2)},${summary.total.toFixed(2)},${summary.deposit.toFixed(2)},${summary.remaining.toFixed(2)}\n`;
  }
  
  // Add closing row
  const finalRemainingVal = weeklySummaries[lastWeek].remaining;
  csvContent += `\nإغلاق الشهر بالكامل\n`;
  csvContent += `تم التحويل إلى حساب الشركة (الكسور),${finalRemainingVal.toFixed(2)} ريال سعودي\n`;
  csvContent += `الرصيد المرحل للشهر التالي,0.00 ريال سعودي\n`;
  
  // 3. Create blob download action
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const filename = `كشف_حسابات_${currentYear}_${String(currentMonth).padStart(2, '0')}.csv`;
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast("تم تصدير كشف الحسابات بصيغة CSV بنجاح!");
}

// Fetch dynamic, cascaded summary data for a specific month
function getMonthSummaryData(year, month) {
  const storageKey = `book1_tracker_data_${year}_${month}`;
  const savedData = localStorage.getItem(storageKey);
  
  let tempDailyData = [];
  let tempWeeklyDeposits = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let tempAutoCalcDeposits = true;
  let tempWeeklyDepositsManuallyEdited = { 1: false, 2: false, 3: false, 4: false };
  
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData);
      tempDailyData = parsed.dailyData;
      // Sanitize tempDailyData to ensure the week mapping is updated to the new 4-week system
      if (tempDailyData && Array.isArray(tempDailyData)) {
        tempDailyData.forEach(item => {
          item.weekNum = getCustomWeekNum(item.dayNum);
        });
      }
      tempWeeklyDeposits = parsed.weeklyDeposits;
      tempAutoCalcDeposits = parsed.autoCalcDeposits !== undefined ? parsed.autoCalcDeposits : true;
      tempWeeklyDepositsManuallyEdited = parsed.weeklyDepositsManuallyEdited !== undefined ? parsed.weeklyDepositsManuallyEdited : { 1: false, 2: false, 3: false, 4: false };
    } catch (e) {
      console.error("Error parsing saved state for summary", e);
    }
  }
  
  // If no daily data, generate empty default
  if (tempDailyData.length === 0) {
    const days = new Date(year, month, 0).getDate();
    for (let day = 1; day <= days; day++) {
      tempDailyData.push({
        dayNum: day,
        weekNum: getCustomWeekNum(day),
        revenue: 0
      });
    }
  }
  
  // Calculate rollover summaries for this month
  const tempWeeklySummaries = {
    1: { revenue: 0, carried: 0, total: 0, deposit: 0, remaining: 0 },
    2: { revenue: 0, carried: 0, total: 0, deposit: 0, remaining: 0 },
    3: { revenue: 0, carried: 0, total: 0, deposit: 0, remaining: 0 },
    4: { revenue: 0, carried: 0, total: 0, deposit: 0, remaining: 0 }
  };
  
  tempDailyData.forEach(item => {
    if (tempWeeklySummaries[item.weekNum]) {
      tempWeeklySummaries[item.weekNum].revenue += parseFloat(item.revenue || 0);
    }
  });
  
  // Get carryover from previous month (cascading)
  let runningCarryover = getPreviousMonthRemaining(year, month);
  
  for (let w = 1; w <= 4; w++) {
    const summary = tempWeeklySummaries[w];
    summary.carried = runningCarryover;
    summary.total = summary.revenue + summary.carried;
    
    if (tempAutoCalcDeposits && !tempWeeklyDepositsManuallyEdited[w]) {
      const autoDeposit = Math.floor(summary.total / 50) * 50;
      tempWeeklyDeposits[w] = autoDeposit > 0 ? autoDeposit : 0;
    }
    
    summary.deposit = parseFloat(tempWeeklyDeposits[w] || 0);
    summary.remaining = summary.total - summary.deposit;
    runningCarryover = summary.remaining;
  }
  
  const lastWeek = getLastWeekOfMonth(year, month);
  const finalRemainingVal = tempWeeklySummaries[lastWeek].remaining;
  
  let totalRevenue = 0;
  tempDailyData.forEach(item => { totalRevenue += parseFloat(item.revenue || 0); });
  
  let totalDeposits = 0;
  for (let w = 1; w <= lastWeek; w++) {
    totalDeposits += parseFloat(tempWeeklyDeposits[w] || 0);
  }
  
  return {
    revenue: totalRevenue,
    carried: tempWeeklySummaries[1].carried,
    total: totalRevenue + tempWeeklySummaries[1].carried,
    deposit: totalDeposits,
    remaining: finalRemainingVal
  };
}

// Render dynamic 12 Month Cards on the Yearly Dashboard
function renderYearlyOverview() {
  const container = document.getElementById("yearly-months-container");
  if (!container) return;
  
  container.innerHTML = "";
  
  // Update year in header dynamically
  const displayYearEl = document.getElementById("yearly-year-display");
  if (displayYearEl) {
    displayYearEl.textContent = currentYear;
  }
  
  for (let m = 1; m <= 12; m++) {
    const summary = getMonthSummaryData(currentYear, m);
    const card = document.createElement("div");
    
    if (m === currentMonth) {
      card.className = "month-flow-card active-month-card";
    } else {
      card.className = "month-flow-card";
    }
    
    const monthName = ARABIC_MONTHS[m - 1];
    
    card.innerHTML = `
      <div class="week-flow-header">
        <div class="week-flow-title">
          <span class="week-dot dot-${(m % 5) + 1}"></span>
          <span style="font-weight: 700;">شهر ${monthName} ${currentYear}</span>
        </div>
        <span class="week-flow-dates" style="color: ${m === currentMonth ? 'var(--accent-secondary)' : 'var(--text-secondary)'}; font-weight: 700;">
          ${m === currentMonth ? '<i class="fa-solid fa-star"></i> نشط حالياً' : currentYear}
        </span>
      </div>
      
      <div class="week-flow-stats">
        <div class="stat-item">
          <span class="stat-label">إيراد الشهر</span>
          <span class="stat-value revenue-color">${summary.revenue.toFixed(2)} ر.س</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">الرصيد الافتتاحي للشهر (+)</span>
          <span class="stat-value carry-color">${summary.carried.toFixed(2)} ر.س</span>
        </div>
        <div class="stat-item" style="grid-column: span 2; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 6px; margin-top: 4px;">
          <span class="stat-label">إجمالي المتاح حسابياً</span>
          <span class="stat-value" style="color: #fff; font-size: 1.1rem;">${summary.total.toFixed(2)} ر.س</span>
        </div>
        <div class="stat-item" style="grid-column: span 2; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 6px;">
          <span class="stat-label">إجمالي الودائع البنكية (-)</span>
          <span class="stat-value" style="color: var(--color-deposit); font-size: 1.05rem;">${summary.deposit.toFixed(2)} ر.س</span>
        </div>
      </div>
      
      <div class="week-flow-deposit-section" style="margin-top: 15px; flex-direction: column; gap: 12px; align-items: stretch;">
        <div class="remaining-badge-box" style="margin: 0; width: 100%; align-items: center; border-color: var(--accent-secondary); box-shadow: 0 0 10px rgba(236, 72, 153, 0.1);">
          <span class="remaining-badge-label" style="color: var(--accent-secondary); font-weight: 800; font-size: 0.75rem;">تم التحويل إلى حساب الشركة (الكسور)</span>
          <span class="remaining-badge-value" style="font-size: 1.2rem; text-shadow: 0 0 10px rgba(236, 72, 153, 0.3);">${summary.remaining.toFixed(2)} ر.س</span>
          <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.05); width: 100%; text-align: center; padding-top: 4px;">
            <i class="fa-solid fa-ban" style="margin-left: 4px; font-size: 0.65rem;"></i> الرصيد المرحّل للشهر التالي: 0.00 ر.س
          </div>
        </div>
        
        <button class="switch-month-btn" onclick="selectActiveMonth(${m})" style="margin-top: 0;">
          <i class="fa-solid fa-pen-to-square"></i>
          <span>انتقال وتعديل هذا الشهر</span>
        </button>
      </div>
    `;
    
    container.appendChild(card);
  }
}

// Select active month from the Yearly Overview
function selectActiveMonth(monthNum) {
  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");
  if (monthSelect && yearSelect) {
    monthSelect.value = String(monthNum);
    yearSelect.value = String(currentYear);
    initializeMonthStructure();
    switchTab('dashboard');
    showToast(`تم الانتقال بنجاح إلى شهر ${ARABIC_MONTHS[monthNum - 1]} ${currentYear}!`);
  }
}
