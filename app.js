// DOM Elements
const balanceEl = document.getElementById("balance");
const incomeEl = document.getElementById("income-total");
const expenseEl = document.getElementById("expense-total");
const transactionForm = document.getElementById("transaction-form");
const formSubmitBtn = document.getElementById("transaction-submit");
const typeInput = document.getElementById("transaction-type");
const categoryInput = document.getElementById("transaction-category");
const descriptionInput = document.getElementById("transaction-description");
const amountInput = document.getElementById("transaction-amount");
const dateInput = document.getElementById("transaction-date");
const transactionList = document.getElementById("transaction-list");
const tabs = document.querySelectorAll(".tab");
const budgetChart = document.getElementById("budget-chart");

// Edit transaction variables
let isEditing = false;
let editTransactionId = null;

// Feedback message element
const feedbackMessage = document.createElement("div");
feedbackMessage.className = "feedback-message";
document.querySelector(".form-container").appendChild(feedbackMessage);

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
const previewContent = document.getElementById("print-preview-content");
const previewSummary = document.getElementById("preview-summary");
const previewTransactions = document.getElementById("preview-transactions");

// Category Management Elements
const addCategoryBtn = document.getElementById("add-category-btn");
const categoryModal = document.getElementById("category-modal");
const closeCategoryModal = document.querySelector(".close-category-modal");
const categoryTabs = document.querySelectorAll(".category-tab");
const newCategoryInput = document.getElementById("new-category-name");
const saveCategoryBtn = document.getElementById("save-category-btn");
const incomeCategoriesList = document.getElementById("income-categories-list");
const expenseCategoriesList = document.getElementById(
  "expense-categories-list"
);

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

// Load categories from localStorage or use defaults
let categories =
  JSON.parse(localStorage.getItem("budgetCategories")) || defaultCategories;

// Save categories to localStorage
function saveCategories() {
  localStorage.setItem("budgetCategories", JSON.stringify(categories));
}

// Initialize Chart
let myChart;
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
            "rgba(16, 185, 129, 0.6)", // income color
            "rgba(239, 68, 68, 0.6)", // expense color
          ],
          borderColor: ["rgba(16, 185, 129, 1)", "rgba(239, 68, 68, 1)"],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return "$" + value;
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
        },
      },
    },
  });
}

// Initialize date inputs
function setDefaultDate() {
  const today = new Date();
  const formattedDate = today.toISOString().split("T")[0];
  dateInput.value = formattedDate;

  // Set default date range filter to the current month
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  startDateInput.value = firstDay.toISOString().split("T")[0];
  endDateInput.value = today.toISOString().split("T")[0];
}

// Load transactions from localStorage
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let filteredTransactions = [...transactions];

// Save transactions to localStorage
function saveTransactions() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

// Update balance, income and expense
function updateValues() {
  // Use filtered transactions instead of all transactions
  const income = filteredTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((acc, transaction) => acc + transaction.amount, 0);

  const expense = filteredTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((acc, transaction) => acc + transaction.amount, 0);

  const balance = income - expense;

  balanceEl.textContent = formatMoney(balance);
  incomeEl.textContent = formatMoney(income);
  expenseEl.textContent = formatMoney(expense);

  // Update chart
  if (myChart) {
    myChart.data.datasets[0].data = [income, expense];
    myChart.update();
  }
}

// Format number as money
function formatMoney(amount) {
  return "$" + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
}

// Format date for display
function formatDate(dateString) {
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

// Add new transaction or update existing one
function addTransaction(e) {
  e.preventDefault();

  // Validation
  if (!validateTransactionForm()) {
    return;
  }

  if (isEditing) {
    // Update existing transaction
    updateTransaction();
  } else {
    // Add new transaction
    const transaction = {
      id: generateID(),
      type: typeInput.value,
      category: categoryInput.value,
      description: descriptionInput.value.trim(),
      amount: parseFloat(amountInput.value),
      date: dateInput.value,
    };

    transactions.push(transaction);
    showFeedback("Transaction added successfully!", "success");
  }

  saveTransactions();

  // Sort transactions by date (newest first)
  sortTransactionsByDate();

  applyDateFilter();

  // Reset form and state
  resetForm();
}

// Validate form inputs
function validateTransactionForm() {
  // Clear previous error states
  descriptionInput.classList.remove("error");
  amountInput.classList.remove("error");
  dateInput.classList.remove("error");

  let isValid = true;
  let errorMessage = "";

  if (!descriptionInput.value.trim()) {
    descriptionInput.classList.add("error");
    errorMessage = "Please enter a description";
    isValid = false;
  }

  if (!amountInput.value || parseFloat(amountInput.value) <= 0) {
    amountInput.classList.add("error");
    errorMessage = errorMessage
      ? errorMessage + " and a valid amount"
      : "Please enter a valid amount";
    isValid = false;
  }

  if (!dateInput.value) {
    dateInput.classList.add("error");
    errorMessage = errorMessage
      ? errorMessage + " and a date"
      : "Please enter a date";
    isValid = false;
  }

  if (!isValid) {
    showFeedback(errorMessage, "error");
  }

  return isValid;
}

// Update existing transaction
function updateTransaction() {
  const index = transactions.findIndex((t) => t.id === editTransactionId);

  if (index !== -1) {
    transactions[index] = {
      id: editTransactionId,
      type: typeInput.value,
      category: categoryInput.value,
      description: descriptionInput.value.trim(),
      amount: parseFloat(amountInput.value),
      date: dateInput.value,
    };

    showFeedback("Transaction updated successfully!", "success");
  }
}

// Edit transaction
function editTransaction(id) {
  // Expand form if collapsed
  const formContent = document.querySelector(".form-content");
  if (!formContent.classList.contains("expanded")) {
    document.querySelector(".form-header").click();
  }

  const transaction = transactions.find((t) => t.id === id);

  if (!transaction) return;

  // Fill form with transaction data
  typeInput.value = transaction.type;
  updateCategoryOptions();

  // Find and select the correct category
  for (let i = 0; i < categoryInput.options.length; i++) {
    if (categoryInput.options[i].value === transaction.category) {
      categoryInput.selectedIndex = i;
      break;
    }
  }

  descriptionInput.value = transaction.description;
  amountInput.value = transaction.amount;
  dateInput.value = transaction.date;

  // Update form state
  isEditing = true;
  editTransactionId = id;

  // Change button text
  document.getElementById("transaction-submit").textContent =
    "Update Transaction";

  // Scroll to form
  document
    .querySelector(".form-container")
    .scrollIntoView({ behavior: "smooth" });
}

// Reset form and editing state
function resetForm() {
  transactionForm.reset();
  setDefaultDate();
  isEditing = false;
  editTransactionId = null;
  document.getElementById("transaction-submit").textContent = "Add Transaction";

  // Clear any error states
  descriptionInput.classList.remove("error");
  amountInput.classList.remove("error");
  dateInput.classList.remove("error");
}

// Sort transactions by date - newest first
function sortTransactionsByDate() {
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Generate random ID
function generateID() {
  return Math.floor(Math.random() * 1000000000);
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
  item.dataset.type = transaction.type;
  item.dataset.id = transaction.id;

  // Create DOM elements instead of using innerHTML for better security
  const transactionInfo = document.createElement("div");
  transactionInfo.className = "transaction-info";

  const titleDiv = document.createElement("div");
  titleDiv.className = "transaction-title";
  titleDiv.textContent = transaction.description;

  const detailsDiv = document.createElement("div");
  detailsDiv.className = "transaction-details";

  const categoryDiv = document.createElement("div");
  categoryDiv.className = "transaction-category";
  categoryDiv.textContent = formatCategory(transaction.category);

  const dateDiv = document.createElement("div");
  dateDiv.className = "transaction-date";
  dateDiv.textContent = formatDate(transaction.date);

  detailsDiv.appendChild(categoryDiv);
  detailsDiv.appendChild(dateDiv);

  transactionInfo.appendChild(titleDiv);
  transactionInfo.appendChild(detailsDiv);

  const amountDiv = document.createElement("div");
  amountDiv.className = `transaction-amount ${
    transaction.type === "income" ? "income-amount" : "expense-amount"
  }`;
  amountDiv.textContent = `${
    transaction.type === "income" ? "+" : "-"
  } ${formatMoney(transaction.amount)}`;

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "transaction-actions";

  const editButton = document.createElement("button");
  editButton.className = "action-btn edit-btn";
  editButton.setAttribute("title", "Edit Transaction");
  editButton.addEventListener("click", () => editTransaction(transaction.id));

  const deleteButton = document.createElement("button");
  deleteButton.className = "action-btn delete-btn";
  deleteButton.setAttribute("title", "Delete Transaction");
  deleteButton.addEventListener("click", () =>
    removeTransaction(transaction.id)
  );

  // SVG icon can still be added using innerHTML as it's not user-generated content
  editButton.innerHTML = `
    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M15.502 1.94a1.5 1.5 0 0 1 0 2.121l-1.415 1.415-2.121-2.121 1.415-1.415a1.5 1.5 0 0 1 2.121 0zM14.086 5.373l-2.121-2.121L3.5 11.717V13.5h1.784l8.802-8.127z"/>
    </svg>
  `;

  deleteButton.innerHTML = `
    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
      <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
    </svg>
  `;

  actionsDiv.appendChild(editButton);
  actionsDiv.appendChild(deleteButton);

  const rightSection = document.createElement("div");
  rightSection.className = "transaction-right";
  rightSection.appendChild(amountDiv);
  rightSection.appendChild(actionsDiv);

  item.appendChild(transactionInfo);
  item.appendChild(rightSection);

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
  if (confirm("Are you sure you want to delete this transaction?")) {
    transactions = transactions.filter((transaction) => transaction.id !== id);
    saveTransactions();
    applyDateFilter();
  }
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

// Apply date range filter
function applyDateFilter() {
  const startDate = startDateInput.value
    ? new Date(startDateInput.value)
    : null;
  const endDate = endDateInput.value ? new Date(endDateInput.value) : null;

  if (startDate && endDate) {
    endDate.setDate(endDate.getDate() + 1);

    filteredTransactions = transactions.filter((transaction) => {
      const transDate = new Date(transaction.date);
      return transDate >= startDate && transDate < endDate;
    });
  } else {
    filteredTransactions = [...transactions];
  }

  updateFilteredUI();
}

// Reset date filter
function resetDateFilter() {
  setDefaultDate();
  filteredTransactions = [...transactions];
  updateFilteredUI();
}

// Update UI with filtered transactions
function updateFilteredUI() {
  transactionList.innerHTML = "";
  filteredTransactions.forEach(addTransactionDOM);
  updateValues();

  const activeTab = document.querySelector(".tab.active");
  if (activeTab) {
    const filterType = activeTab.getAttribute("data-tab");
    filterTransactions(filterType);
  }
}

// Show feedback message to user
function showFeedback(message, type) {
  feedbackMessage.textContent = message;
  feedbackMessage.className = `feedback-message ${type}`;
  feedbackMessage.style.display = "block";

  // Auto hide after 3 seconds
  setTimeout(() => {
    feedbackMessage.style.display = "none";
  }, 3000);
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

  const income = filteredTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((acc, transaction) => acc + transaction.amount, 0);

  const expense = filteredTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((acc, transaction) => acc + transaction.amount, 0);

  const balance = income - expense;

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

  const tableData = filteredTransactions.map((transaction) => [
    formatDate(transaction.date),
    transaction.description,
    formatCategory(transaction.category),
    transaction.type,
    formatMoney(transaction.amount),
  ]);

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 15,
    head: [["Date", "Description", "Category", "Type", "Amount"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [240, 244, 248],
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
  const income = filteredTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((acc, transaction) => acc + transaction.amount, 0);

  const expense = filteredTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((acc, transaction) => acc + transaction.amount, 0);

  const balance = income - expense;

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
  printModal.style.display = "block";
}

// Hide print modal
function closePrintModal() {
  printModal.style.display = "none";
}

// Initialize app
function init() {
  transactionList.innerHTML = "";
  filteredTransactions = [...transactions];
  filteredTransactions.forEach(addTransactionDOM);
  updateValues();
  loadCategories();
  setupFormToggle();
}

// Setup collapsible transaction form
function setupFormToggle() {
  const formHeader = document.querySelector(".form-header");
  const formContent = document.querySelector(".form-content");
  const toggleBtn = document.getElementById("toggle-form-btn");
  const expandIcon = document.querySelector(".expand-icon");
  const collapseIcon = document.querySelector(".collapse-icon");

  function toggleForm() {
    const isExpanded = formContent.classList.toggle("expanded");

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

// Show only relevant categories based on transaction type
function updateCategoryOptions() {
  const selectedType = typeInput.value;

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
}

// Load categories into the modal lists
function loadCategories() {
  incomeCategoriesList.innerHTML = "";
  expenseCategoriesList.innerHTML = "";

  categories.income.forEach((category) => {
    const isDefault = defaultCategories.income.some(
      (c) => c.id === category.id
    );
    addCategoryToList(category, "income", isDefault);
  });

  categories.expense.forEach((category) => {
    const isDefault = defaultCategories.expense.some(
      (c) => c.id === category.id
    );
    addCategoryToList(category, "expense", isDefault);
  });

  updateCategoryOptions();
}

// Add a category to the appropriate list in the modal
function addCategoryToList(category, type, isDefault = false) {
  const listEl =
    type === "income" ? incomeCategoriesList : expenseCategoriesList;

  const li = document.createElement("li");
  li.classList.add("category-item");
  li.dataset.id = category.id;

  li.innerHTML = `
    <span class="category-name">${category.name}</span>
    ${
      !isDefault
        ? `
    <button class="action-btn delete-btn delete-category-btn" title="Delete Category">
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
        <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
      </svg>
    </button>
    `
        : ""
    }
  `;

  listEl.appendChild(li);

  if (!isDefault) {
    const deleteBtn = li.querySelector(".delete-category-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () =>
        deleteCategory(category.id, type)
      );
    }
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
  const categoryUsed = transactions.some((t) => t.category === id);

  if (categoryUsed) {
    alert("This category is used in transactions and cannot be deleted.");
    return;
  }

  if (confirm("Are you sure you want to delete this category?")) {
    categories[type] = categories[type].filter((c) => c.id !== id);

    saveCategories();

    loadCategories();
  }
}

// Show the category management modal
function showCategoryModal() {
  categoryModal.style.display = "block";

  newCategoryInput.focus();
}

// Hide the category management modal
function hideCategoryModal() {
  categoryModal.style.display = "none";
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

// Event listeners
transactionForm.addEventListener("submit", addTransaction);

typeInput.addEventListener("change", updateCategoryOptions);

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

// Initialize app on load
document.addEventListener("DOMContentLoaded", () => {
  initializeChart();
  setDefaultDate();
  init();
});

// Create global functions
window.removeTransaction = removeTransaction;
window.editTransaction = editTransaction;
