// Budget Tracker — all app logic in this one classic script (no modules), so
// the app keeps working when index.html is opened directly from file://.
//
// Pure, DOM-free helpers come first; UI wiring starts below.

// Format number as money, e.g. 1234.5 -> "$1,234.50"
function formatMoney(amount) {
  return "$" + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
}

// Format date for display. "YYYY-MM-DD" strings are parsed manually so the
// day never shifts in timezones behind UTC (new Date() would treat the
// string as UTC midnight).
function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const options = { year: "numeric", month: "short", day: "numeric" };
  return date.toLocaleDateString(undefined, options);
}

// Generate a unique ID, preferring UUIDs where the runtime provides them
function generateID() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// Compute every total shown in the dashboard, the print preview and the PDF
// from the same list of transactions.
//
// An expense may link to an income source via `incomeSource`, but that link
// is metadata only: it never changes the totals. Balance is always income
// minus expenses, so a linked expense can never be counted twice.
function computeTotals(transactions) {
  let income = 0;
  let expense = 0;
  let linkedExpenses = 0;

  for (const transaction of transactions) {
    if (transaction.type === "income") {
      income += transaction.amount;
    } else {
      expense += transaction.amount;
      if (transaction.incomeSource) {
        linkedExpenses += transaction.amount;
      }
    }
  }

  return {
    income,
    expense,
    balance: income - expense,
    linkedExpenses,
    unlinkedExpenses: expense - linkedExpenses,
  };
}

// Filter transactions by an inclusive date range. `startDate` and `endDate`
// are "YYYY-MM-DD" strings; an empty bound leaves that side of the range open.
function filterByDateRange(transactions, startDate, endDate) {
  return transactions.filter((transaction) => {
    if (startDate && transaction.date < startDate) {
      return false;
    }
    if (endDate && transaction.date > endDate) {
      return false;
    }
    return true;
  });
}

// Format a Date as a local "YYYY-MM-DD" string (toISOString would shift
// the day in timezones behind UTC)
function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// The year-to-date window: January 1st of the reference date's year up to
// and including the reference date
function yearToDateRange(referenceDate = new Date()) {
  return {
    startDate: `${referenceDate.getFullYear()}-01-01`,
    endDate: toLocalDateString(referenceDate),
  };
}

// Compute an inclusive "YYYY-MM-DD" date range for a named window:
// "month" (1st of the month to the reference date), "year" (year to date)
// or "all" (unbounded, both sides null).
function windowRange(windowName, referenceDate = new Date()) {
  if (windowName === "month") {
    return {
      startDate: toLocalDateString(
        new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
      ),
      endDate: toLocalDateString(referenceDate),
    };
  }
  if (windowName === "year") {
    return yearToDateRange(referenceDate);
  }
  return { startDate: null, endDate: null };
}

// Summarize transactions of `type` ("income" / "expense") by description
// within an inclusive "YYYY-MM-DD" date range. Descriptions are grouped
// case-insensitively and listed with the spelling of their most recent
// transaction, sorted by total (largest first).
function summarizeByDescription(transactions, type, startDate, endDate) {
  const groups = new Map();

  for (const transaction of filterByDateRange(
    transactions,
    startDate,
    endDate
  )) {
    if (transaction.type !== type) continue;

    const description = transaction.description.trim();
    const key = description.toLowerCase();
    const group = groups.get(key) || {
      description,
      count: 0,
      total: 0,
      lastDate: "",
    };

    group.count += 1;
    group.total += transaction.amount;
    if (transaction.date >= group.lastDate) {
      group.description = description;
      group.lastDate = transaction.date;
    }
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .map(({ description, count, total }) => ({ description, count, total }))
    .sort((a, b) => b.total - a.total);
}

// DOM Elements
const balanceEl = document.getElementById("balance");
const incomeEl = document.getElementById("income-total");
const expenseEl = document.getElementById("expense-total");
const transactionForm = document.getElementById("transaction-form");
const typeInput = document.getElementById("transaction-type");
const categoryInput = document.getElementById("transaction-category");
const descriptionInput = document.getElementById("transaction-description");
const amountInput = document.getElementById("transaction-amount");
const dateInput = document.getElementById("transaction-date");
const transactionList = document.getElementById("transaction-list");
const tabs = document.querySelectorAll(".tab");
const clearDataBtn = document.getElementById("clear-data-btn");
const exportDataBtn = document.getElementById("export-data-btn");
const importDataBtn = document.getElementById("import-data-btn");
const importDataInput = document.getElementById("import-data-input");
const budgetChart = document.getElementById("budget-chart");
const categoryChart = document.getElementById("category-chart");
const chartTabs = document.querySelectorAll(".chart-tab");

// Date Range Filter Elements
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const applyFilterBtn = document.getElementById("apply-filter");
const resetFilterBtn = document.getElementById("reset-filter");

// PDF Print Elements
const printPdfBtn = document.getElementById("print-pdf");
const printModal = document.getElementById("print-modal");
const closeModal = document.querySelector(".close-modal");
const confirmPrintBtn = document.getElementById("confirm-print");
const cancelPrintBtn = document.getElementById("cancel-print");
const previewSummary = document.getElementById("preview-summary");
const previewTransactions = document.getElementById("preview-transactions");

// Category Management Elements
const addCategoryBtn = document.getElementById("add-category-btn");
const deleteCategoryBtn = document.getElementById("delete-category-btn");
const categoryModal = document.getElementById("category-modal");
const closeCategoryModal = document.querySelector(".close-category-modal");
const categoryTabs = document.querySelectorAll(".category-tab");
const newCategoryInput = document.getElementById("new-category-name");
const saveCategoryBtn = document.getElementById("save-category-btn");
const incomeCategoriesList = document.getElementById("income-categories-list");
const expenseCategoriesList = document.getElementById(
  "expense-categories-list"
);

// Edit Transaction Modal Elements
const editTransactionModal = document.getElementById("edit-transaction-modal");
const closeEditModal = document.querySelector(".close-edit-modal");
const editTransactionForm = document.getElementById("edit-transaction-form");
const editTransactionId = document.getElementById("edit-transaction-id");
const editTypeInput = document.getElementById("edit-transaction-type");
const editCategoryInput = document.getElementById("edit-transaction-category");
const editDescriptionInput = document.getElementById(
  "edit-transaction-description"
);
const editAmountInput = document.getElementById("edit-transaction-amount");
const editDateInput = document.getElementById("edit-transaction-date");
const editDeleteBtn = document.getElementById("edit-delete-btn");
const editCancelBtn = document.getElementById("edit-cancel-btn");
const editAddCategoryBtn = document.getElementById("edit-add-category-btn");

// Custom category dropdown elements
const customCategorySelect = document.getElementById("custom-category-select");
const customSelectTrigger = customCategorySelect.querySelector(
  ".custom-select-trigger"
);
const customOptions = customCategorySelect.querySelector(".custom-options");
const selectedOptionText =
  customSelectTrigger.querySelector(".selected-option");
const categoryEditModal = document.getElementById("category-edit-modal");
const editCategoryNameInput = document.getElementById(
  "edit-category-name-inline"
);
const saveEditedCategoryBtn = document.getElementById("save-edited-category");
const cancelCategoryEditBtn = document.getElementById("cancel-category-edit");

// Global variables for category editing
let currentCategoryId = null;
let currentCategoryType = null;

// Modal accessibility helpers
const openModals = [];

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => el.offsetParent !== null);
}

// Open a modal dialog, moving focus inside it and remembering where focus
// came from so it can be restored when the modal closes
function openModal(modal, focusTarget) {
  openModals.push({ modal, returnFocus: document.activeElement });
  modal.style.display = "block";

  const target = focusTarget || getFocusableElements(modal)[0];
  if (target) {
    target.focus();
  }
}

// Close a modal dialog and restore focus to the element that opened it
function closeModalElement(modal) {
  modal.style.display = "none";

  const index = openModals.findIndex((entry) => entry.modal === modal);
  if (index === -1) return;

  const [{ returnFocus }] = openModals.splice(index, 1);
  if (
    returnFocus &&
    typeof returnFocus.focus === "function" &&
    document.contains(returnFocus)
  ) {
    returnFocus.focus();
  }
}

function getTopModal() {
  return openModals.length > 0 ? openModals[openModals.length - 1].modal : null;
}

// Trap Tab focus inside the open modal and allow Escape to close it
document.addEventListener("keydown", (e) => {
  const topModal = getTopModal();
  if (!topModal) return;

  if (e.key === "Escape") {
    e.preventDefault();
    closeModalElement(topModal);
    return;
  }

  if (e.key !== "Tab") return;

  const focusables = getFocusableElements(topModal);
  if (focusables.length === 0) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  } else if (!topModal.contains(document.activeElement)) {
    e.preventDefault();
    first.focus();
  }
});

// Default categories
const defaultCategories = {
  income: [
    { id: "salary", name: "Salary" },
    { id: "bank", name: "bank" },
    { id: "wallet", name: "wallet" },
    { id: "other-income", name: "Other Income" },
  ],
  expense: [
    { id: "rent", name: "Rent" },
    { id: "food", name: "Food" },
    { id: "utilities", name: "Utilities" },
    { id: "entertainment", name: "Entertainment" },
    { id: "transportation", name: "Transportation" },
    { id: "other-expense", name: "Other Expense" },
  ],
};

// Safely read and parse a localStorage entry, falling back to a default value
// when the entry is missing or contains invalid JSON
function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.warn(`Ignoring invalid localStorage entry "${key}":`, error);
    return fallback;
  }
}

// Load categories from localStorage, or use a copy of the defaults. The copy
// matters: sharing the defaultCategories object would let newly added
// categories mutate the defaults list, hiding their edit/remove buttons.
const storedCategories = loadFromStorage("budgetCategories", null);
let categories =
  storedCategories &&
  Array.isArray(storedCategories.income) &&
  Array.isArray(storedCategories.expense)
    ? storedCategories
    : {
        income: defaultCategories.income.map((c) => ({ ...c })),
        expense: defaultCategories.expense.map((c) => ({ ...c })),
      };

// Save categories to localStorage
function saveCategories() {
  localStorage.setItem("budgetCategories", JSON.stringify(categories));
}

// Time window currently selected in the spending analysis
let analysisWindow = "year";

const WINDOW_LABELS = {
  month: "This month",
  year: "Year to date",
  all: "All time",
};

// Initialize Chart
let myChart;
let myCategoryChart;

function initializeChart() {
  const ctx = budgetChart.getContext("2d");
  myChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Income", "Expenses"],
      datasets: [
        {
          label: "Amount ($)",
          data: [0, 0],
          backgroundColor: [
            "rgba(5, 150, 105, 0.7)", // income color - updated
            "rgba(220, 38, 38, 0.7)", // expense color - updated
          ],
          borderColor: ["rgba(5, 150, 105, 1)", "rgba(220, 38, 38, 1)"],
          borderWidth: 1,
          borderRadius: 6, // Rounded bars
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(156, 163, 175, 0.1)", // Lighter grid lines
          },
          ticks: {
            callback: function (value) {
              return "$" + value;
            },
            font: {
              family: "'Segoe UI', sans-serif",
            },
          },
        },
        x: {
          grid: {
            display: false, // Remove x-axis grid lines
          },
          ticks: {
            font: {
              family: "'Segoe UI', sans-serif",
              weight: "500",
            },
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return "$" + context.parsed.y;
            },
          },
          backgroundColor: "rgba(91, 33, 182, 0.8)", // Match primary color
          titleFont: {
            family: "'Segoe UI', sans-serif",
            size: 14,
          },
          bodyFont: {
            family: "'Segoe UI', sans-serif",
            size: 13,
          },
          padding: 12,
          cornerRadius: 8,
        },
      },
    },
  });

  initializeCategoryChart();
}

// Initialize the category chart
function initializeCategoryChart() {
  const ctx = categoryChart.getContext("2d");

  // Default to expense breakdown
  const chartData = getCategoryChartData("expense");

  // Check if we're on mobile
  const isMobile = window.innerWidth <= 768;

  myCategoryChart = new Chart(ctx, {
    type: "doughnut",
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%", // Makes the doughnut hole larger
      plugins: {
        legend: {
          position: isMobile ? "bottom" : "right",
          labels: {
            boxWidth: isMobile ? 15 : 20,
            padding: isMobile ? 10 : 15,
            font: {
              family: "'Segoe UI', sans-serif",
              size: 12,
            },
          },
        },
        tooltip: {
          backgroundColor: "rgba(91, 33, 182, 0.8)", // Match primary color
          titleFont: {
            family: "'Segoe UI', sans-serif",
            size: 14,
          },
          bodyFont: {
            family: "'Segoe UI', sans-serif",
            size: 13,
          },
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${formatMoney(value)} (${percentage}%)`;
            },
          },
        },
        title: {
          display: true,
          text: "Expense Breakdown by Category",
          font: {
            family: "'Segoe UI', sans-serif",
            size: isMobile ? 14 : 16,
            weight: "500",
          },
          color: "#1f2937",
          padding: {
            bottom: 15,
          },
        },
      },
    },
  });

  setupCategoryChartTabs();

  // Handle resize events to update chart layout
  window.addEventListener("resize", handleChartResize);
}

// Handle chart resize for responsive layout
function handleChartResize() {
  if (!myCategoryChart) return;

  const isMobile = window.innerWidth <= 768;

  // Update legend position based on screen size
  myCategoryChart.options.plugins.legend.position = isMobile
    ? "bottom"
    : "right";
  myCategoryChart.options.plugins.legend.labels.boxWidth = isMobile ? 15 : 20;
  myCategoryChart.options.plugins.legend.labels.padding = isMobile ? 10 : 15;
  myCategoryChart.options.plugins.title.font.size = isMobile ? 14 : 16;

  // Update the chart
  myCategoryChart.update();
}

// Initialize date inputs
function setDefaultDate() {
  const today = new Date();
  dateInput.value = toLocalDateString(today);

  // Set default date range filter to the current month
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  startDateInput.value = toLocalDateString(firstDay);
  endDateInput.value = toLocalDateString(today);
}

// Normalize a stored transaction for the current data model:
// - IDs are compared as strings, so legacy numeric IDs are converted
// - rows generated by the old "income adjustment" bookkeeping are dropped
// - the legacy `adjustments` arrays are dropped; the link between an expense
//   and its income source lives on the expense itself (`incomeSource`) and
//   everything else is derived in computeTotals()
function normalizeTransaction(transaction) {
  if (
    !transaction ||
    typeof transaction !== "object" ||
    transaction.id == null
  ) {
    return null;
  }
  if (transaction.adjustedFrom != null) {
    return null;
  }

  const normalized = { ...transaction, id: String(transaction.id) };
  delete normalized.adjustments;
  return normalized;
}

// Load transactions from localStorage
const storedTransactions = loadFromStorage("transactions", []);
let transactions = (Array.isArray(storedTransactions) ? storedTransactions : [])
  .map(normalizeTransaction)
  .filter(Boolean);
let filteredTransactions = [...transactions];

// Save transactions to localStorage
function saveTransactions() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

// Update balance, income and expense.
// All totals come from computeTotals() so the dashboard, the print preview
// and the PDF always show the same numbers.
function updateValues() {
  const { income, expense, balance } = computeTotals(filteredTransactions);

  balanceEl.textContent = formatMoney(balance);
  incomeEl.textContent = formatMoney(income);
  expenseEl.textContent = formatMoney(expense);
  // Update chart
  if (myChart) {
    myChart.data.datasets[0].data = [income, expense];
    myChart.update();
  }
}

// Add new transaction
function addTransaction(e) {
  e.preventDefault();

  const type = typeInput.value;
  const incomeSource =
    type === "expense" ? document.getElementById("income-source").value : null;

  // Validation
  if (!descriptionInput.value.trim() || amountInput.value <= 0) {
    alert("Please add a valid description and amount");
    return;
  }

  // Expenses may link to an income source, but this is metadata only:
  // all totals are derived from the transactions themselves in
  // computeTotals(), so nothing else needs to be updated here.
  const transaction = {
    id: generateID(),
    type: type,
    category: categoryInput.value,
    description: descriptionInput.value.trim(),
    amount: parseFloat(amountInput.value),
    date: dateInput.value,
    incomeSource: incomeSource,
  };

  transactions.push(transaction);

  saveTransactions();
  refreshTransactionList();

  // Reset form and re-sync the custom controls a form reset cannot reach:
  // the category dropdown selection and the income-source visibility
  transactionForm.reset();
  updateCategoryOptions();
  handleTransactionTypeChange();
  setDefaultDate();
}

// Function to sanitize text to prevent XSS attacks
function sanitizeHTML(text) {
  const element = document.createElement("div");
  element.textContent = text;
  return element.innerHTML;
}

// Add transactions to DOM list
function addTransactionDOM(transaction) {
  const item = document.createElement("li");
  item.classList.add("transaction-item");
  // Add class for transaction type to enable styling based on income/expense
  item.classList.add(
    transaction.type === "income" ? "income-item" : "expense-item"
  );
  item.dataset.type = transaction.type;
  item.dataset.id = transaction.id;

  // Create DOM elements instead of using innerHTML for better security
  const transactionInfo = document.createElement("div");
  transactionInfo.className = "transaction-info";

  const titleDiv = document.createElement("div");
  titleDiv.className = "transaction-title";
  titleDiv.textContent = transaction.description;

  const categoryDiv = document.createElement("div");
  categoryDiv.className = "transaction-category";
  categoryDiv.textContent = formatCategory(transaction.category);

  // If this is an expense with an income source, show the source
  if (transaction.type === "expense" && transaction.incomeSource) {
    const sourceDiv = document.createElement("div");
    sourceDiv.className = "transaction-source";
    sourceDiv.textContent = `From: ${formatCategory(transaction.incomeSource)}`;
    categoryDiv.appendChild(sourceDiv);
  }
  // For income, show the expenses funded from this source (derived on the fly
  // from the expenses' incomeSource links, never stored on the income row)
  if (transaction.type === "income") {
    const linkedExpenses = transactions.filter(
      (t) => t.type === "expense" && t.incomeSource === transaction.category
    );

    if (linkedExpenses.length > 0) {
      const linkedTotal = linkedExpenses.reduce(
        (total, t) => total + t.amount,
        0
      );
      const linkedDiv = document.createElement("div");
      linkedDiv.className = "transaction-adjustment-indicator";
      linkedDiv.textContent = `${linkedExpenses.length} linked expense(s): ${formatMoney(linkedTotal)}`;

      const tooltipDetails = linkedExpenses
        .map(
          (t) =>
            `${formatDate(t.date)}: ${t.description} (${formatMoney(t.amount)})`
        )
        .join("\n");
      linkedDiv.title = `Expenses paid from this source: ${formatMoney(
        linkedTotal
      )}\n\nDetails:\n${tooltipDetails}`;
      categoryDiv.appendChild(linkedDiv);
    }
  }

  const dateDiv = document.createElement("div");
  dateDiv.className = "transaction-date";
  dateDiv.textContent = formatDate(transaction.date);

  transactionInfo.appendChild(titleDiv);
  transactionInfo.appendChild(categoryDiv);
  transactionInfo.appendChild(dateDiv);
  const amountDiv = document.createElement("div");
  amountDiv.className = `transaction-amount ${
    transaction.type === "income" ? "income-amount" : "expense-amount"
  }`;
  amountDiv.textContent = `${
    transaction.type === "income" ? "+" : "-"
  } ${formatMoney(Math.abs(transaction.amount))}`;

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "transaction-actions";

  // Edit button
  const editButton = document.createElement("button");
  editButton.className = "action-btn edit-btn";
  editButton.setAttribute("data-tooltip", "Edit Transaction");
  editButton.setAttribute("aria-label", "Edit Transaction");
  editButton.addEventListener("click", () => editTransaction(transaction.id));

  editButton.innerHTML = `
    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1-.11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
    </svg>
  `;
  // Delete button
  const deleteButton = document.createElement("button");
  deleteButton.className = "action-btn delete-btn";
  deleteButton.setAttribute("data-tooltip", "Delete Transaction");
  deleteButton.setAttribute("aria-label", "Delete Transaction");
  deleteButton.addEventListener("click", (e) => {
    e.preventDefault(); // Prevent any default browser behavior
    removeTransaction(transaction.id);
  });

  deleteButton.innerHTML = `
    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
      <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
    </svg>
  `;

  // Add buttons to actions div
  actionsDiv.appendChild(editButton);
  actionsDiv.appendChild(deleteButton);

  // Assemble the transaction item
  item.appendChild(transactionInfo);
  item.appendChild(amountDiv);
  item.appendChild(actionsDiv);

  // Add to the transaction list
  transactionList.appendChild(item);
}

// Format category string for display
function formatCategory(category) {
  // Try to find category in both income and expense arrays
  const allCategories = [...categories.income, ...categories.expense];
  const categoryObj = allCategories.find((cat) => cat.id === category);

  if (categoryObj) {
    return categoryObj.name;
  }

  // If not found, try to determine if it's a custom category
  if (category && category.includes("-custom-")) {
    // Extract the name from custom categories (removing the prefix and timestamp)
    return (
      category
        .split("-custom-")[1]
        .replace(/^\d+/, "")
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ") || "Unknown Category"
    );
  }

  // Fall back to formatting the category string directly
  return category
    ? category
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : "Unknown Category";
}

// Remove transaction
function removeTransaction(id) {
  // Directly remove transaction without confirmation. Any link to an income
  // source lives on the expense itself, so nothing else needs cleanup.
  transactions = transactions.filter((transaction) => transaction.id !== id);
  saveTransactions();
  refreshTransactionList();
}

// Edit transaction function (called when edit button is clicked)
function editTransaction(id) {
  // Find the transaction by id
  const transaction = transactions.find((t) => t.id === id);
  if (!transaction) return;

  // Populate the form with transaction data
  editTransactionId.value = transaction.id;
  editTypeInput.value = transaction.type;

  // Update category options based on transaction type
  updateEditCategoryOptions(transaction.type);

  // Set the correct category
  editCategoryInput.value = transaction.category;

  editDescriptionInput.value = transaction.description;
  editAmountInput.value = transaction.amount;
  editDateInput.value = transaction.date;

  // If it's an expense with an income source, make sure to show the income source dropdown
  if (transaction.type === "expense" && transaction.incomeSource) {
    const editIncomeSourceContainer = document.getElementById(
      "edit-income-source-container"
    );
    if (editIncomeSourceContainer) {
      editIncomeSourceContainer.style.display = "block";

      // Populate the income source dropdown
      const editIncomeSource = document.getElementById("edit-income-source");
      if (editIncomeSource) {
        populateEditIncomeSourceDropdown();
        editIncomeSource.value = transaction.incomeSource;
      }
    }
  }

  // Show the modal
  openModal(editTransactionModal);
}

// Update category options in the edit form based on transaction type
function updateEditCategoryOptions(type) {
  editCategoryInput.innerHTML = "";

  categories[type].forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    option.setAttribute("data-type", type);
    editCategoryInput.appendChild(option);
  });

  // Show/hide income source selector based on transaction type
  const editIncomeSourceContainer = document.getElementById(
    "edit-income-source-container"
  );
  if (editIncomeSourceContainer) {
    if (type === "expense") {
      editIncomeSourceContainer.style.display = "block";
      populateEditIncomeSourceDropdown();
    } else {
      editIncomeSourceContainer.style.display = "none";
    }
  }
}

// Save the edited transaction
function saveEditedTransaction(e) {
  e.preventDefault();

  // Validation
  if (!editDescriptionInput.value.trim() || editAmountInput.value <= 0) {
    alert("Please add a valid description and amount");
    return;
  }

  const id = editTransactionId.value;

  // Find the index of the transaction in the array
  const index = transactions.findIndex((t) => t.id === id);

  if (index !== -1) {
    // Get the old transaction data before updating
    const oldTransaction = transactions[index];

    // Spread the old transaction so fields the form does not edit survive
    const updatedTransaction = {
      ...oldTransaction,
      type: editTypeInput.value,
      category: editCategoryInput.value,
      description: editDescriptionInput.value.trim(),
      amount: parseFloat(editAmountInput.value),
      date: editDateInput.value,
    };

    // Handle income source for expenses
    if (editTypeInput.value === "expense") {
      // Get the current selected income source
      const editIncomeSource = document.getElementById("edit-income-source");
      const newIncomeSource = editIncomeSource ? editIncomeSource.value : null;

      // If we have a new income source or we had one before, keep it
      if (newIncomeSource) {
        updatedTransaction.incomeSource = newIncomeSource;
      }
    } else {
      delete updatedTransaction.incomeSource;
    }

    transactions[index] = updatedTransaction;

    // Save to localStorage and update UI
    saveTransactions();
    refreshTransactionList();

    // Close the modal
    closeEditTransactionModal();
  }
}

// Close the edit transaction modal
function closeEditTransactionModal() {
  closeModalElement(editTransactionModal);
  editTransactionForm.reset();
}

// Filter transaction display by tab
function filterTransactions(filterType) {
  const transactionItems = document.querySelectorAll(".transaction-item");

  transactionItems.forEach((item) => {
    if (filterType === "all" || item.dataset.type === filterType) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

// Whether the user has actually applied the date range filter. The From/To
// inputs are pre-filled with the current month on load, but that pre-fill
// must not act as an implicit filter: until "Apply Filter" is clicked the
// list shows everything (matching the initial load), and "Reset" lifts it.
let filterActive = false;

function syncFilterIndicator() {
  const filterControls = document.querySelector(".filter-controls");
  if (filterControls) {
    filterControls.classList.toggle("active", filterActive);
  }
}

// Apply date range filter
function applyDateFilter() {
  filterActive = true;

  filteredTransactions = filterByDateRange(
    transactions,
    startDateInput.value || null,
    endDateInput.value || null
  );

  syncFilterIndicator();
  updateFilteredUI();
}

// Reset date filter
function resetDateFilter() {
  filterActive = false;
  setDefaultDate();
  filteredTransactions = [...transactions];

  syncFilterIndicator();
  updateFilteredUI();
}

// Re-render the transaction list after a mutation. The pre-filled date range
// only filters when the user has applied it; otherwise show everything,
// which is what a fresh page load shows. Without this, a new transaction
// dated outside the pre-filled range vanished from the list and the totals
// until the page was refreshed.
function refreshTransactionList() {
  if (filterActive) {
    applyDateFilter();
  } else {
    filteredTransactions = [...transactions];
    updateFilteredUI();
  }
}

// Update UI with filtered transactions
function updateFilteredUI() {
  transactionList.innerHTML = "";

  // If there are no filtered transactions, show empty state
  if (filteredTransactions.length === 0) {
    // Create and add empty state to transaction list
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";

    const emptyStateIcon = document.createElement("div");
    emptyStateIcon.className = "empty-state-icon";
    emptyStateIcon.textContent = "📊";

    const emptyMessage = document.createElement("div");
    emptyMessage.className = "empty-state-message";
    emptyMessage.textContent = "No transactions found";

    const activeTab = document.querySelector(".tab.active");
    const filterType = activeTab ? activeTab.getAttribute("data-tab") : "all";

    const emptyHint = document.createElement("div");
    emptyHint.className = "empty-state-hint";

    if (startDateInput.value && endDateInput.value) {
      emptyHint.textContent = `No ${
        filterType !== "all" ? filterType : ""
      } transactions found in the selected date range. Try adjusting your filters.`;
    } else {
      emptyHint.textContent = `Start by adding your first ${
        filterType !== "all" ? filterType : ""
      } transaction using the "Add New Transaction" form.`;
    }

    emptyState.appendChild(emptyStateIcon);
    emptyState.appendChild(emptyMessage);
    emptyState.appendChild(emptyHint);

    transactionList.appendChild(emptyState);
  } else {
    // Add transactions to the list
    filteredTransactions.forEach(addTransactionDOM);
  }

  updateValues();
  updateCategoryChart();

  const activeTab = document.querySelector(".tab.active");
  if (activeTab) {
    const filterType = activeTab.getAttribute("data-tab");
    filterTransactions(filterType);
  }
}

// Transactions inside the analysis window selected in the UI
function getAnalysisTransactions() {
  const { startDate, endDate } = windowRange(analysisWindow);
  return filterByDateRange(transactions, startDate, endDate);
}

// Get data for category chart
function getCategoryChartData(type) {
  // Group transactions by category and sum amounts
  const categoryData = {};

  // Data for the selected analysis window, filtered by transaction type
  const typeTransactions = getAnalysisTransactions().filter(
    (t) => t.type === type
  );

  // If no transactions of this type, return empty data
  if (typeTransactions.length === 0) {
    return {
      labels: ["No Data"],
      datasets: [
        {
          data: [1],
          backgroundColor: ["#e5e7eb"],
          hoverOffset: 4,
        },
      ],
    };
  }
  // Group by category and sum amounts
  typeTransactions.forEach((transaction) => {
    const categoryName = formatCategory(transaction.category);

    if (categoryData[categoryName]) {
      categoryData[categoryName] += transaction.amount;
    } else {
      categoryData[categoryName] = transaction.amount;
    }
  });

  // Prepare data for chart
  const labels = Object.keys(categoryData);
  const data = Object.values(categoryData);

  // Generate colors for each category
  const colors = generateCategoryColors(labels.length, type);

  return {
    labels: labels,
    datasets: [
      {
        data: data,
        backgroundColor: colors,
        hoverOffset: 4,
      },
    ],
  };
}

// Generate colors for categories
function generateCategoryColors(count, type) {
  const baseColor =
    type === "income"
      ? { r: 16, g: 185, b: 129 } // Income green
      : { r: 239, g: 68, b: 68 }; // Expense red

  const colors = [];

  for (let i = 0; i < count; i++) {
    // Vary the opacity and slight color variation
    const opacity = 0.5 + (i * 0.5) / count;
    const variation = (i * 15) / count;

    let r = Math.min(255, baseColor.r + variation);
    let g = Math.min(255, baseColor.g + variation);
    let b = Math.min(255, baseColor.b + variation);

    colors.push(`rgba(${r}, ${g}, ${b}, ${opacity})`);
  }

  return colors;
}

// Setup the time-window selector for the spending analysis
function setupWindowTabs() {
  const windowTabs = document.querySelectorAll(".window-tab");

  windowTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      windowTabs.forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-pressed", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-pressed", "true");
      analysisWindow = tab.getAttribute("data-window");
      updateCategoryChart();
    });
  });
}

// Setup event listeners for category chart tabs
function setupCategoryChartTabs() {
  // Update category chart on first load
  updateCategoryChart();

  chartTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Update active class
      chartTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // Update chart
      const chartType = tab.getAttribute("data-chart");
      updateCategoryChart(chartType);
    });
  });
}

// Update category chart based on selected type
function updateCategoryChart(type) {
  if (!myCategoryChart) return;

  // If type not specified, use the currently active tab
  if (!type) {
    const activeTab = document.querySelector(".chart-tab.active");
    if (activeTab) {
      type = activeTab.getAttribute("data-chart");
    } else {
      type = "expense"; // Default
    }
  }

  // Get the chart data
  const chartData = getCategoryChartData(type);

  // Update chart title
  myCategoryChart.options.plugins.title.text =
    type === "income" ? "Income Sources" : "Expense Breakdown by Category";

  // Update chart data
  myCategoryChart.data.labels = chartData.labels;
  myCategoryChart.data.datasets[0].data = chartData.datasets[0].data;
  myCategoryChart.data.datasets[0].backgroundColor =
    chartData.datasets[0].backgroundColor;

  // Update chart
  myCategoryChart.update();

  // Keep the year-to-date entry totals in sync with the selected tab
  updateEntryTotals(type);
}

// Render year-to-date totals grouped by description for the given type
function updateEntryTotals(type) {
  const titleEl = document.getElementById("entry-totals-title");
  const hintEl = document.getElementById("entry-totals-hint");
  const listEl = document.getElementById("entry-totals-list");
  if (!titleEl || !listEl) return;

  const { startDate, endDate } = windowRange(analysisWindow);
  const summaries = summarizeByDescription(
    transactions,
    type,
    startDate,
    endDate
  );

  titleEl.textContent =
    type === "income" ? "Income by entry" : "Spending by entry";
  if (hintEl) {
    const rangeText =
      startDate && endDate
        ? `${formatDate(startDate)} to ${formatDate(endDate)}`
        : "everything recorded";
    hintEl.textContent = `${WINDOW_LABELS[analysisWindow]} \u00b7 ${rangeText} \u00b7 grouped by description`;
  }

  listEl.innerHTML = "";
  listEl.classList.toggle("income", type === "income");

  if (summaries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "entry-total-empty";
    empty.textContent = `No ${type} entries in this period.`;
    listEl.appendChild(empty);
    return;
  }

  const grandTotal = summaries.reduce((total, s) => total + s.total, 0);

  summaries.forEach(({ description, count, total }) => {
    const item = document.createElement("li");
    item.className = "entry-total-item";

    const row = document.createElement("div");
    row.className = "entry-total-row";

    const nameEl = document.createElement("span");
    nameEl.className = "entry-total-name";
    nameEl.textContent = description;

    const countEl = document.createElement("span");
    countEl.className = "entry-total-count";
    countEl.textContent = `${count} transaction${count === 1 ? "" : "s"}`;

    const amountEl = document.createElement("span");
    amountEl.className = `entry-total-amount ${
      type === "income" ? "income-amount" : "expense-amount"
    }`;
    amountEl.textContent = formatMoney(total);

    row.appendChild(nameEl);
    row.appendChild(countEl);
    row.appendChild(amountEl);

    const bar = document.createElement("div");
    bar.className = "entry-total-bar";
    const fill = document.createElement("div");
    fill.className = "entry-total-bar-fill";
    fill.style.width =
      grandTotal > 0 ? `${Math.round((total / grandTotal) * 100)}%` : "0%";
    bar.appendChild(fill);

    item.appendChild(row);
    item.appendChild(bar);
    listEl.appendChild(item);
  });
}

// Generate PDF
function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text("Budget Tracker Report", 105, 15, { align: "center" });

  if (startDateInput.value && endDateInput.value) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Period: ${formatDate(startDateInput.value)} to ${formatDate(
        endDateInput.value
      )}`,
      105,
      22,
      { align: "center" }
    );
  }

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Summary", 14, 30);

  // Same totals as the dashboard and the print preview (computeTotals), so
  // expenses linked to an income source are never counted twice
  const { income, expense, balance } = computeTotals(filteredTransactions);

  doc.setFontSize(10);
  doc.setTextColor(0);

  const summaryTableData = [
    ["Balance", "Total Income", "Total Expenses"],
    [formatMoney(balance), formatMoney(income), formatMoney(expense)],
  ];

  doc.autoTable({
    startY: 35,
    head: [summaryTableData[0]],
    body: [summaryTableData[1]],
    theme: "grid",
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [240, 244, 248],
    },
  });

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Transactions", 14, doc.lastAutoTable.finalY + 10);
  const tableData = filteredTransactions.map((transaction) => {
    let notes = "";

    // Add income source info for expenses
    if (transaction.type === "expense" && transaction.incomeSource) {
      notes = `Deducted from: ${formatCategory(transaction.incomeSource)}`;
    }

    return [
      formatDate(transaction.date),
      transaction.description,
      formatCategory(transaction.category),
      transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
      formatMoney(transaction.amount),
      notes,
    ];
  });
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 15,
    head: [["Date", "Description", "Category", "Type", "Amount", "Notes"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [240, 244, 248],
    },
    columnStyles: {
      5: { cellWidth: "auto" }, // Make the Notes column adjust to content
    },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }

  doc.save("budget-tracker-report.pdf");
}

// Show print modal with preview
function showPrintModal() {
  // Same totals as the dashboard and the generated PDF
  const { income, expense, balance } = computeTotals(filteredTransactions);

  // Create safe HTML using DOM methods instead of string concatenation
  const container = document.createElement("div");

  // Header
  const headerDiv = document.createElement("div");
  headerDiv.className = "print-header";
  const headerTitle = document.createElement("h1");
  headerTitle.textContent = "Budget Tracker Report";
  headerDiv.appendChild(headerTitle);
  container.appendChild(headerDiv);

  // Date range
  if (startDateInput.value && endDateInput.value) {
    const dateRangeDiv = document.createElement("div");
    dateRangeDiv.className = "print-date-range";
    dateRangeDiv.textContent = `Period: ${formatDate(
      startDateInput.value
    )} to ${formatDate(endDateInput.value)}`;
    container.appendChild(dateRangeDiv);
  }

  // Summary
  const summaryDiv = document.createElement("div");
  summaryDiv.className = "print-summary";

  // Balance
  const balanceDiv = document.createElement("div");
  balanceDiv.className = "print-summary-item";
  const balanceTitle = document.createElement("h3");
  balanceTitle.textContent = "Balance";
  const balanceAmount = document.createElement("p");
  balanceAmount.textContent = formatMoney(balance);
  balanceDiv.appendChild(balanceTitle);
  balanceDiv.appendChild(balanceAmount);

  // Income
  const incomeDiv = document.createElement("div");
  incomeDiv.className = "print-summary-item";
  const incomeTitle = document.createElement("h3");
  incomeTitle.textContent = "Total Income";
  const incomeAmount = document.createElement("p");
  incomeAmount.textContent = formatMoney(income);
  incomeDiv.appendChild(incomeTitle);
  incomeDiv.appendChild(incomeAmount);

  // Expense
  const expenseDiv = document.createElement("div");
  expenseDiv.className = "print-summary-item";
  const expenseTitle = document.createElement("h3");
  expenseTitle.textContent = "Total Expenses";
  const expenseAmount = document.createElement("p");
  expenseAmount.textContent = formatMoney(expense);
  expenseDiv.appendChild(expenseTitle);
  expenseDiv.appendChild(expenseAmount);

  // Add all to summary
  summaryDiv.appendChild(balanceDiv);
  summaryDiv.appendChild(incomeDiv);
  summaryDiv.appendChild(expenseDiv);

  container.appendChild(summaryDiv);

  // Set the inner HTML of the preview summary
  previewSummary.innerHTML = "";
  previewSummary.appendChild(container);

  // Create transactions table
  const transactionsContainer = document.createElement("div");

  const transactionsTitle = document.createElement("h3");
  transactionsTitle.textContent = "Transactions";
  transactionsContainer.appendChild(transactionsTitle);

  const table = document.createElement("table");
  table.className = "print-table";

  // Create table header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const headers = ["Date", "Description", "Category", "Type", "Amount"];
  headers.forEach((headerText) => {
    const th = document.createElement("th");
    th.textContent = headerText;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create table body
  const tbody = document.createElement("tbody");

  filteredTransactions.forEach((transaction) => {
    const tr = document.createElement("tr");

    // Date cell
    const dateCell = document.createElement("td");
    dateCell.textContent = formatDate(transaction.date);
    tr.appendChild(dateCell);

    // Description cell
    const descCell = document.createElement("td");
    descCell.textContent = transaction.description;
    tr.appendChild(descCell);

    // Category cell
    const catCell = document.createElement("td");
    catCell.textContent = formatCategory(transaction.category);
    tr.appendChild(catCell);

    // Type cell
    const typeCell = document.createElement("td");
    typeCell.textContent =
      transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
    tr.appendChild(typeCell);

    // Amount cell
    const amountCell = document.createElement("td");
    amountCell.className =
      transaction.type === "income" ? "income-amount" : "expense-amount";
    amountCell.textContent = `${
      transaction.type === "income" ? "+" : "-"
    } ${formatMoney(transaction.amount)}`;
    tr.appendChild(amountCell);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  transactionsContainer.appendChild(table);

  // Set the inner HTML of the preview transactions
  previewTransactions.innerHTML = "";
  previewTransactions.appendChild(transactionsContainer);

  // Display the modal
  openModal(printModal);
}

// Hide print modal
function closePrintModal() {
  closeModalElement(printModal);
}

// Initialize custom category dropdown
function initializeCustomCategoryDropdown() {
  customSelectTrigger.setAttribute("tabindex", "0");
  customSelectTrigger.setAttribute("role", "button");
  customSelectTrigger.setAttribute("aria-haspopup", "listbox");
  customSelectTrigger.setAttribute("aria-expanded", "false");
  customSelectTrigger.setAttribute("aria-controls", "custom-category-options");

  // Toggle dropdown on click
  customSelectTrigger.addEventListener("click", function () {
    toggleCategoryDropdown(false);
  });

  // Keyboard support for the trigger
  customSelectTrigger.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      toggleCategoryDropdown(true);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openCategoryDropdown(true);
    } else if (e.key === "Escape") {
      closeCategoryDropdown(true);
    }
  });

  // Keyboard support for the options list
  customOptions.addEventListener("keydown", function (e) {
    const options = getDropdownOptions();
    const currentIndex = options.indexOf(document.activeElement);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusDropdownOption(options, currentIndex + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusDropdownOption(options, currentIndex - 1);
        break;
      case "Home":
        e.preventDefault();
        focusDropdownOption(options, 0);
        break;
      case "End":
        e.preventDefault();
        focusDropdownOption(options, options.length - 1);
        break;
      case "Enter":
      case " ":
      case "Spacebar":
        e.preventDefault();
        document.activeElement.click();
        break;
      case "Escape":
        e.preventDefault();
        closeCategoryDropdown(true);
        break;
      default:
        break;
    }
  });

  // Close the dropdown when clicking outside
  document.addEventListener("click", function (e) {
    if (!customCategorySelect.contains(e.target)) {
      closeCategoryDropdown(false);
    }
  });

  // Close the dropdown when keyboard focus leaves it
  customCategorySelect.addEventListener("focusout", function (e) {
    if (!customCategorySelect.contains(e.relatedTarget)) {
      closeCategoryDropdown(false);
    }
  });

  // Setup custom options based on transaction type selected
  updateCustomCategoryOptions();
}

// Return the selectable items in the custom category dropdown
function getDropdownOptions() {
  return Array.from(customOptions.querySelectorAll('[role="option"]'));
}

// Move keyboard focus to a dropdown option, wrapping around the list
function focusDropdownOption(options, index) {
  if (options.length === 0) return;
  const wrapped = ((index % options.length) + options.length) % options.length;
  options[wrapped].focus();
}

// Open the custom category dropdown, optionally moving focus to an option
function openCategoryDropdown(moveFocus) {
  customCategorySelect.classList.add("open");
  customSelectTrigger.setAttribute("aria-expanded", "true");

  if (moveFocus) {
    const options = getDropdownOptions();
    const selected =
      customOptions.querySelector('[role="option"].selected') || options[0];
    if (selected) {
      selected.focus();
    }
  }
}

// Close the custom category dropdown
function closeCategoryDropdown(returnFocusToTrigger) {
  const wasOpen = customCategorySelect.classList.contains("open");
  customCategorySelect.classList.remove("open");
  customSelectTrigger.setAttribute("aria-expanded", "false");

  if (wasOpen && returnFocusToTrigger) {
    customSelectTrigger.focus();
  }
}

function toggleCategoryDropdown(moveFocus) {
  if (customCategorySelect.classList.contains("open")) {
    closeCategoryDropdown(moveFocus);
  } else {
    openCategoryDropdown(moveFocus);
  }
}

// Update custom category options in dropdown
function updateCustomCategoryOptions() {
  const selectedType = typeInput.value;

  // Clear existing options
  customOptions.innerHTML = "";

  // Create options for each category
  categories[selectedType].forEach((category) => {
    addCategoryToDropdown(category, selectedType);
  });

  // Add "Add New Category" option at the bottom
  const addNewOption = document.createElement("div");
  addNewOption.className = "add-new-category";
  addNewOption.setAttribute("role", "option");
  addNewOption.setAttribute("tabindex", "-1");
  addNewOption.setAttribute("aria-selected", "false");
  addNewOption.innerHTML = `
    <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
    </svg>
    Add New Category
  `;
  addNewOption.addEventListener("click", function (e) {
    e.stopPropagation();
    closeCategoryDropdown(true);
    showCategoryModal();
  });

  customOptions.appendChild(addNewOption);

  // Ensure there's a default selection
  if (categories[selectedType].length > 0) {
    selectCategoryOption(
      categories[selectedType][0].id,
      categories[selectedType][0].name
    );
  } else {
    selectedOptionText.textContent = "Select a category";
    updateDeleteCategoryButton();
  }
}

// Add a category to the custom dropdown
function addCategoryToDropdown(category, type) {
  const optionItem = document.createElement("div");
  optionItem.className = "option-item";
  optionItem.dataset.value = category.id;
  optionItem.dataset.type = type;
  optionItem.setAttribute("role", "option");
  optionItem.setAttribute("tabindex", "-1");
  optionItem.setAttribute("aria-selected", "false");

  // Option content with text and action buttons
  optionItem.innerHTML = `
    <span class="option-text">${sanitizeHTML(category.name)}</span>
    <div class="option-actions">
      <button class="option-action-btn edit-btn" data-tooltip="Edit Category" aria-label="Edit Category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
          <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
        </svg>
      </button>
      <button class="option-action-btn delete-btn" data-tooltip="Delete Category" aria-label="Delete Category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
          <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
        </svg>
      </button>
    </div>
  `;

  // Add click event for selecting the category option
  optionItem.addEventListener("click", function () {
    selectCategoryOption(category.id, category.name);
    closeCategoryDropdown(true);
  });

  // Add event handlers for the edit and delete buttons
  const editButton = optionItem.querySelector(".edit-btn");
  editButton.addEventListener("click", function (e) {
    e.stopPropagation(); // Prevent option selection
    showCategoryEditModal(category.id, category.name, type);
  });

  const deleteButton = optionItem.querySelector(".delete-btn");
  deleteButton.addEventListener("click", function (e) {
    e.stopPropagation(); // Prevent option selection
    deleteCategoryFromDropdown(category.id, type);
  });

  customOptions.appendChild(optionItem);
}

// Set selected category in dropdown and hidden select
function selectCategoryOption(value, text) {
  // Update hidden select for form submission
  categoryInput.value = value;

  // Update visible custom select
  selectedOptionText.textContent = text;

  // Update selected class in options
  const options = customOptions.querySelectorAll(".option-item");
  options.forEach((option) => {
    if (option.dataset.value === value) {
      option.classList.add("selected");
      option.setAttribute("aria-selected", "true");
    } else {
      option.classList.remove("selected");
      option.setAttribute("aria-selected", "false");
    }
  });

  updateDeleteCategoryButton();
}

// Show the edit modal for a category
function showCategoryEditModal(id, name, type) {
  // Store current category info for editing
  currentCategoryId = id;
  currentCategoryType = type;

  // Position the edit modal relative to custom select
  const selectRect = customCategorySelect.getBoundingClientRect();
  categoryEditModal.style.top = `${selectRect.top + window.scrollY}px`;

  // Set current value in input
  editCategoryNameInput.value = name;

  // Show the modal
  categoryEditModal.style.display = "block";
  editCategoryNameInput.focus();
}

// Save the edited category
function saveEditedCategory() {
  if (!editCategoryNameInput.value.trim() || !currentCategoryId) return;

  const newName = editCategoryNameInput.value.trim();

  // Find the category in the array
  const categoryIndex = categories[currentCategoryType].findIndex(
    (c) => c.id === currentCategoryId
  );

  if (categoryIndex !== -1) {
    // Update the category name
    categories[currentCategoryType][categoryIndex].name = newName;

    // Save to localStorage
    saveCategories();

    // Update UI
    updateCustomCategoryOptions();

    // If in edit modal, update the categories list there too
    loadCategories();

    // Close the edit modal
    hideCategoryEditModal();
  }
}

// Hide the category edit modal
function hideCategoryEditModal() {
  categoryEditModal.style.display = "none";
  currentCategoryId = null;
  currentCategoryType = null;
}

// Whether any transaction references a category: either as its own category
// or as the income source an expense is deducted from
function isCategoryInUse(id) {
  return transactions.some((t) => t.category === id || t.incomeSource === id);
}

// Delete a category from the dropdown
function deleteCategoryFromDropdown(id, type) {
  if (isCategoryInUse(id)) {
    alert("This category is used in transactions and cannot be deleted.");
    return;
  }

  if (confirm("Are you sure you want to delete this category?")) {
    // Remove the category from the array
    categories[type] = categories[type].filter((c) => c.id !== id);

    // Save to localStorage
    saveCategories();

    // Update UI
    updateCustomCategoryOptions();

    // If in edit modal, update the categories list there too
    loadCategories();
  }
}

// Show only relevant categories based on transaction type (update to use custom dropdown)
function updateCategoryOptions() {
  const selectedType = typeInput.value;

  // Update the hidden select (still needed for form submission)
  categoryInput.innerHTML = "";

  categories[selectedType].forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    option.setAttribute("data-type", selectedType);
    categoryInput.appendChild(option);
  });

  if (categoryInput.options.length > 0) {
    categoryInput.options[0].selected = true;
  }

  // Update the custom dropdown options
  updateCustomCategoryOptions();
}

// Event listeners for category edit modal
saveEditedCategoryBtn.addEventListener("click", saveEditedCategory);
cancelCategoryEditBtn.addEventListener("click", hideCategoryEditModal);

// Allow Escape to dismiss the inline category edit popup
categoryEditModal.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    e.preventDefault();
    hideCategoryEditModal();
  }
});

// Edit category with Enter key
editCategoryNameInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    saveEditedCategory();
  }
});

// Floating hover/focus hints for buttons marked with a data-tooltip attribute.
// The hint element lives on <body> so no card or dropdown can clip it.
function setupTooltips() {
  const tooltip = document.createElement("div");
  tooltip.className = "app-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  document.body.appendChild(tooltip);

  function showTooltip(target) {
    tooltip.textContent = target.getAttribute("data-tooltip");
    tooltip.hidden = false;

    const rect = target.getBoundingClientRect();
    const tip = tooltip.getBoundingClientRect();

    // Above the target by default, flipped below when there is no room
    let top = rect.top - tip.height - 8;
    if (top < 4) {
      top = rect.bottom + 8;
    }

    // Centered on the target, clamped to stay inside the viewport
    let left = rect.left + rect.width / 2 - tip.width / 2;
    left = Math.min(Math.max(left, 4), window.innerWidth - tip.width - 4);

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  function hideTooltip() {
    tooltip.hidden = true;
  }

  document.addEventListener("mouseover", (e) => {
    const target = e.target.closest("[data-tooltip]");
    if (target) {
      showTooltip(target);
    } else {
      hideTooltip();
    }
  });

  document.addEventListener("focusin", (e) => {
    const target = e.target.closest("[data-tooltip]");
    if (target) {
      showTooltip(target);
    } else {
      hideTooltip();
    }
  });

  document.addEventListener("focusout", hideTooltip);
  window.addEventListener("scroll", hideTooltip, true);
}

// Initialize app
function init() {
  transactionList.innerHTML = "";
  filteredTransactions = [...transactions];
  filteredTransactions.forEach(addTransactionDOM);
  updateValues();
  loadCategories();
  setupFormToggle();
  setupFilterHistoryToggle();
  setupDataActionsToggle();
  setupChartsToggle();
  setupTooltips();
  handleMobileLayout(); // Initialize mobile layout adjustments
}

// Setup collapsible transaction form
function setupFormToggle() {
  const formHeader = document.querySelector(".form-header");
  const formContent = document.querySelector(".form-content");
  const toggleBtn = document.getElementById("toggle-form-btn");
  const expandIcon = document.querySelector(".expand-icon");
  const collapseIcon = document.querySelector(".collapse-icon");

  // Ensure form is closed by default
  formContent.classList.remove("expanded");
  formContent.style.display = "none";
  expandIcon.style.display = "block";
  collapseIcon.style.display = "none";

  function toggleForm() {
    const isExpanded = formContent.classList.toggle("expanded");
    toggleBtn.setAttribute("aria-expanded", String(isExpanded));

    if (isExpanded) {
      formContent.style.display = "block";
      expandIcon.style.display = "none";
      collapseIcon.style.display = "block";
    } else {
      // We can't just set display to 'none' immediately or the animation won't work
      setTimeout(() => {
        if (!formContent.classList.contains("expanded")) {
          formContent.style.display = "none";
        }
      }, 300); // Match this with the CSS transition duration
      expandIcon.style.display = "block";
      collapseIcon.style.display = "none";
    }
  }

  formHeader.addEventListener("click", toggleForm);
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent the click from triggering the formHeader click event
    toggleForm();
  });
}

// Setup collapsible filter-history container
function setupFilterHistoryToggle() {
  const filterHistoryHeader = document.querySelector(".filter-history-header");
  const filterHistoryContent = document.querySelector(
    ".filter-history-content"
  );
  const toggleBtn = document.getElementById("toggle-filter-history-btn");
  const expandIcon = document.querySelector(".filter-expand-icon");
  const collapseIcon = document.querySelector(".filter-collapse-icon");

  // Ensure filter-history is closed by default
  filterHistoryContent.classList.remove("expanded");
  filterHistoryContent.style.display = "none";
  expandIcon.style.display = "block";
  collapseIcon.style.display = "none";
  function toggleFilterHistory() {
    const isExpanded = filterHistoryContent.classList.toggle("expanded");
    toggleBtn.setAttribute("aria-expanded", String(isExpanded));
    const isMobile = window.innerWidth <= 768;

    if (isExpanded) {
      // Use display block for mobile to ensure proper column layout
      filterHistoryContent.style.display = isMobile ? "block" : "flex";
      expandIcon.style.display = "none";
      collapseIcon.style.display = "block";
    } else {
      // We can't just set display to 'none' immediately or the animation won't work
      setTimeout(() => {
        if (!filterHistoryContent.classList.contains("expanded")) {
          filterHistoryContent.style.display = "none";
        }
      }, 300); // Match this with the CSS transition duration
      expandIcon.style.display = "block";
      collapseIcon.style.display = "none";
    }
  }

  filterHistoryHeader.addEventListener("click", toggleFilterHistory);
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent the click from triggering the filterHistoryHeader click event
    toggleFilterHistory();
  });
}

// Setup collapsible data-actions container (export / import / delete all)
function setupDataActionsToggle() {
  const dataActionsHeader = document.querySelector(".data-actions-header");
  const dataActionsContent = document.querySelector(".data-actions-content");
  const toggleBtn = document.getElementById("toggle-data-actions-btn");
  const expandIcon = document.querySelector(".data-actions-expand-icon");
  const collapseIcon = document.querySelector(".data-actions-collapse-icon");

  // Ensure the section is closed by default
  dataActionsContent.classList.remove("expanded");
  dataActionsContent.style.display = "none";
  expandIcon.style.display = "block";
  collapseIcon.style.display = "none";

  function toggleDataActions() {
    const isExpanded = dataActionsContent.classList.toggle("expanded");
    toggleBtn.setAttribute("aria-expanded", String(isExpanded));

    if (isExpanded) {
      dataActionsContent.style.display = "block";
      expandIcon.style.display = "none";
      collapseIcon.style.display = "block";
    } else {
      // We can't just set display to 'none' immediately or the animation won't work
      setTimeout(() => {
        if (!dataActionsContent.classList.contains("expanded")) {
          dataActionsContent.style.display = "none";
        }
      }, 300); // Match this with the CSS transition duration
      expandIcon.style.display = "block";
      collapseIcon.style.display = "none";
    }
  }

  dataActionsHeader.addEventListener("click", toggleDataActions);
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent the click from triggering the header click event
    toggleDataActions();
  });
}

// Setup collapsible charts container
function setupChartsToggle() {
  const chartsHeader = document.querySelector(".charts-header");
  const chartsContent = document.querySelector(".charts-content");
  const toggleBtn = document.getElementById("toggle-charts-btn");
  const expandIcon = document.querySelector(".charts-expand-icon");
  const collapseIcon = document.querySelector(".charts-collapse-icon");

  // Ensure charts are closed by default
  chartsContent.classList.remove("expanded");
  chartsContent.style.display = "none";
  expandIcon.style.display = "block";
  collapseIcon.style.display = "none";

  function toggleCharts() {
    const isExpanded = chartsContent.classList.toggle("expanded");
    toggleBtn.setAttribute("aria-expanded", String(isExpanded));

    if (isExpanded) {
      chartsContent.style.display = "block";
      expandIcon.style.display = "none";
      collapseIcon.style.display = "block";

      // Ensure the chart is properly rendered when expanded
      if (myCategoryChart) {
        setTimeout(() => {
          myCategoryChart.resize();
        }, 300);
      }
    } else {
      // We can't just set display to 'none' immediately or the animation won't work
      setTimeout(() => {
        if (!chartsContent.classList.contains("expanded")) {
          chartsContent.style.display = "none";
        }
      }, 300); // Match this with the CSS transition duration
      expandIcon.style.display = "block";
      collapseIcon.style.display = "none";
    }
  }

  chartsHeader.addEventListener("click", toggleCharts);
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent the click from triggering the chartsHeader click event
    toggleCharts();
  });
}

// Load categories into the modal lists
function loadCategories() {
  incomeCategoriesList.innerHTML = "";
  expenseCategoriesList.innerHTML = "";

  categories.income.forEach((category) => {
    addCategoryToList(category, "income");
  });

  categories.expense.forEach((category) => {
    addCategoryToList(category, "expense");
  });

  updateCategoryOptions();
}

// Add a category to the appropriate list in the modal
function addCategoryToList(category, type) {
  const listEl =
    type === "income" ? incomeCategoriesList : expenseCategoriesList;

  const li = document.createElement("li");
  li.classList.add("category-item");
  li.dataset.id = category.id;

  li.innerHTML = `
    <span class="category-name">${sanitizeHTML(category.name)}</span>
    <button class="action-btn delete-btn delete-category-btn" data-tooltip="Delete Category" aria-label="Delete Category">
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
        <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
      </svg>
    </button>
  `;

  listEl.appendChild(li);

  const deleteBtn = li.querySelector(".delete-category-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () =>
      deleteCategory(category.id, type)
    );
  }
}

// Create a new category
function createCategory(name, type) {
  if (!name.trim()) return;

  const categoryId = `${type}-custom-${Date.now()}`;

  const newCategory = { id: categoryId, name: name.trim() };

  categories[type].push(newCategory);

  saveCategories();

  addCategoryToList(newCategory, type);
  updateCategoryOptions();

  newCategoryInput.value = "";
}

// Delete a category
function deleteCategory(id, type) {
  if (isCategoryInUse(id)) {
    alert("This category is used in transactions and cannot be deleted.");
    return;
  }

  if (confirm("Are you sure you want to delete this category?")) {
    categories[type] = categories[type].filter((c) => c.id !== id);

    saveCategories();

    loadCategories();
  }
}

// Show the delete icon next to the category select whenever a category is
// selected. Every category (built-in or created) can be deleted; deleting a
// category that is used by transactions is still blocked by deleteCategory().
function updateDeleteCategoryButton() {
  deleteCategoryBtn.style.display = categoryInput.value ? "" : "none";
}

// Show the category management modal
function showCategoryModal() {
  openModal(categoryModal, newCategoryInput);
}

// Hide the category management modal
function hideCategoryModal() {
  closeModalElement(categoryModal);
}

// Switch between income and expense category tabs
function switchCategoryTab(type) {
  categoryTabs.forEach((tab) => {
    if (tab.getAttribute("data-type") === type) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  if (type === "income") {
    incomeCategoriesList.style.display = "block";
    expenseCategoriesList.style.display = "none";
  } else {
    incomeCategoriesList.style.display = "none";
    expenseCategoriesList.style.display = "block";
  }
}

// Handle mobile view adjustments
function handleMobileLayout() {
  const filterHistoryContent = document.querySelector(
    ".filter-history-content"
  );

  // If the filter-history is expanded, make sure it has the right display property
  if (filterHistoryContent.classList.contains("expanded")) {
    const isMobile = window.innerWidth <= 768;
    filterHistoryContent.style.display = isMobile ? "block" : "flex";
  }
}

// Setup the scroll-to-top button for transaction list
function setupScrollToTopButton() {
  const transactionList = document.getElementById("transaction-list");
  const scrollTopBtn = document.getElementById("scroll-top-btn");

  if (!transactionList || !scrollTopBtn) return;

  // Show/hide the button based on scroll position
  transactionList.addEventListener("scroll", () => {
    if (transactionList.scrollTop > 100) {
      scrollTopBtn.classList.add("visible");
    } else {
      scrollTopBtn.classList.remove("visible");
    }
  });

  // Scroll to top when clicking the button
  scrollTopBtn.addEventListener("click", () => {
    transactionList.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

// Event listeners
transactionForm.addEventListener("submit", addTransaction);

typeInput.addEventListener("change", updateCategoryOptions);

// Add event listener for edit transaction type change
editTypeInput.addEventListener("change", function () {
  updateEditCategoryOptions(this.value);
});

// Add resize event listener for mobile layout adjustments
window.addEventListener("resize", handleMobileLayout);

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));

    tab.classList.add("active");

    const filterType = tab.getAttribute("data-tab");
    filterTransactions(filterType);
  });
});

// Date range filter event listeners
applyFilterBtn.addEventListener("click", applyDateFilter);
resetFilterBtn.addEventListener("click", resetDateFilter);

// Danger zone: delete everything stored locally and start clean
clearDataBtn.addEventListener("click", () => {
  if (!confirm("This will delete all your data and start clean!")) {
    return;
  }

  localStorage.removeItem("transactions");
  localStorage.removeItem("budgetCategories");

  transactions = [];
  filteredTransactions = [];
  categories = {
    income: defaultCategories.income.map((c) => ({ ...c })),
    expense: defaultCategories.expense.map((c) => ({ ...c })),
  };

  // Re-render the empty state and restore the default categories
  resetDateFilter();
  updateCategoryOptions();
  handleTransactionTypeChange();
});

// Export all locally stored data as a JSON backup file
function exportData() {
  const backup = {
    app: "budget-tracker",
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions,
    budgetCategories: categories,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `budget-tracker-backup-${toLocalDateString(new Date())}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Replace the locally stored data with a JSON backup created by Export
function importData(file) {
  const reader = new FileReader();

  reader.onload = () => {
    let backup;
    try {
      backup = JSON.parse(reader.result);
    } catch (error) {
      alert(
        "Could not read that file. Please choose a JSON backup created by Export."
      );
      return;
    }

    const importedTransactions =
      backup && Array.isArray(backup.transactions)
        ? backup.transactions.map(normalizeTransaction).filter(Boolean)
        : null;

    const importedCategories = backup && backup.budgetCategories;
    const hasValidCategories =
      importedCategories &&
      Array.isArray(importedCategories.income) &&
      Array.isArray(importedCategories.expense);

    if (importedTransactions === null && !hasValidCategories) {
      alert("That file does not contain Budget Tracker data.");
      return;
    }

    if (
      !confirm("This will replace your current data with the backup. Continue?")
    ) {
      return;
    }

    if (importedTransactions !== null) {
      transactions = importedTransactions;
    }
    if (hasValidCategories) {
      categories = {
        income: importedCategories.income.map((c) => ({ ...c })),
        expense: importedCategories.expense.map((c) => ({ ...c })),
      };
    }

    saveTransactions();
    saveCategories();

    // Re-render everything from the imported data
    resetDateFilter();
    updateCategoryOptions();
    handleTransactionTypeChange();
  };

  reader.readAsText(file);
}

exportDataBtn.addEventListener("click", exportData);
importDataBtn.addEventListener("click", () => importDataInput.click());
importDataInput.addEventListener("change", () => {
  const file = importDataInput.files[0];
  if (file) {
    importData(file);
  }
  importDataInput.value = ""; // allow importing the same file again
});

// Print PDF event listeners
printPdfBtn.addEventListener("click", showPrintModal);
closeModal.addEventListener("click", closePrintModal);
cancelPrintBtn.addEventListener("click", closePrintModal);
confirmPrintBtn.addEventListener("click", () => {
  generatePDF();
  closePrintModal();
});

// Category management event listeners
addCategoryBtn.addEventListener("click", showCategoryModal);
deleteCategoryBtn.addEventListener("click", () => {
  deleteCategory(categoryInput.value, typeInput.value);
});
closeCategoryModal.addEventListener("click", hideCategoryModal);

// Allow adding categories by pressing Enter
newCategoryInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault(); // Prevent form submission
    const activeTab = document.querySelector(".category-tab.active");
    const type = activeTab.getAttribute("data-type");
    createCategory(newCategoryInput.value, type);
  }
});

categoryTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    switchCategoryTab(tab.getAttribute("data-type"));
  });
});

saveCategoryBtn.addEventListener("click", () => {
  const activeTab = document.querySelector(".category-tab.active");
  const type = activeTab.getAttribute("data-type");

  createCategory(newCategoryInput.value, type);
});

// Close modals when clicking outside
window.addEventListener("click", (e) => {
  if (e.target === printModal) {
    closePrintModal();
  }
  if (e.target === categoryModal) {
    hideCategoryModal();
  }
});

// Event listener for edit transaction form submission
editTransactionForm.addEventListener("submit", saveEditedTransaction);

// Event listener for delete button in edit modal
editDeleteBtn.addEventListener("click", () => {
  removeTransaction(editTransactionId.value);
  closeEditTransactionModal();
});

// Event listener for cancel button in edit modal
editCancelBtn.addEventListener("click", closeEditTransactionModal);

// Event listener for close button in edit modal
closeEditModal.addEventListener("click", closeEditTransactionModal);

// Event listener for add category button in edit modal
editAddCategoryBtn.addEventListener("click", showCategoryModal);

// Close the edit modal when clicking outside
window.addEventListener("click", (e) => {
  if (e.target === editTransactionModal) {
    closeEditTransactionModal();
  }
});

// Run the app once the DOM is ready, whether this script runs during parsing
// or is injected after the document has already loaded
function onDOMReady(callback) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback);
  } else {
    callback();
  }
}

// Initialize app on load
onDOMReady(() => {
  initializeChart();
  setDefaultDate();
  init();
  initializeCustomCategoryDropdown();
  setupWindowTabs();
  setupScrollToTopButton();
});

// Handle transaction type change to show/hide income source dropdown
typeInput.addEventListener("change", handleTransactionTypeChange);

function handleTransactionTypeChange() {
  const transactionType = document.getElementById("transaction-type").value;
  const incomeSourceContainer = document.getElementById(
    "income-source-container"
  );

  if (transactionType === "expense") {
    incomeSourceContainer.style.display = "block";
    populateIncomeSourceDropdown();
  } else {
    incomeSourceContainer.style.display = "none";
  }
}

function populateIncomeSourceDropdown() {
  const dropdown = document.getElementById("income-source");
  // Remove all options except the first
  while (dropdown.options.length > 1) {
    dropdown.remove(1);
  }
  // Use the correct categories object
  const incomeCategories =
    categories && categories.income ? categories.income : [];
  incomeCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    dropdown.appendChild(option);
  });
}

// Function to populate the edit income source dropdown
function populateEditIncomeSourceDropdown() {
  const dropdown = document.getElementById("edit-income-source");

  // Remove all options except the first
  while (dropdown.options.length > 1) {
    dropdown.remove(1);
  }

  // Use the correct categories object
  const incomeCategories =
    categories && categories.income ? categories.income : [];
  incomeCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    dropdown.appendChild(option);
  });
}
