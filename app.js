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
  // Calculate total income
  const income = filteredTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((acc, transaction) => {
      // Add the base transaction amount
      let totalAmount = transaction.amount;

      // If there are adjustments, add them to the total
      if (transaction.adjustments && transaction.adjustments.length > 0) {
        const adjustmentsTotal = transaction.adjustments.reduce(
          (adjAcc, adj) => adjAcc + adj.amount,
          0
        );
        totalAmount += adjustmentsTotal;
      }

      return acc + totalAmount;
    }, 0);

  // Calculate total expense
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

// Add new transaction
function addTransaction(e) {
  e.preventDefault();

  const type = document.getElementById("transaction-type").value;
  const incomeSource =
    type === "expense" ? document.getElementById("income-source").value : null;

  // Validation
  if (!descriptionInput.value.trim() || amountInput.value <= 0) {
    alert("Please add a valid description and amount");
    return;
  }

  const transaction = {
    id: generateID(),
    type: typeInput.value,
    category: categoryInput.value,
    description: descriptionInput.value.trim(),
    amount: parseFloat(amountInput.value),
    date: dateInput.value,
    incomeSource: incomeSource,
  };

  transactions.push(transaction);

  // If this is an expense and has an income source specified, update the transaction for that income source
  if (type === "expense" && incomeSource) {
    // Find the matching income transaction by category ID
    const matchingIncomeTransaction = transactions.find(
      (t) => t.type === "income" && t.category === incomeSource
    );

    // If no matching transaction found, create a new adjusted income entry
    if (!matchingIncomeTransaction) {
      // Get the income category name for the description
      const incomeCategoryObj = categories.income.find(
        (cat) => cat.id === incomeSource
      );
      const categoryName = incomeCategoryObj
        ? incomeCategoryObj.name
        : "Income Source";

      // Create an adjusted income transaction that reflects the deduction
      const adjustedIncome = {
        id: generateID(),
        type: "income",
        category: incomeSource,
        description: `Adjusted ${categoryName}`,
        amount: -parseFloat(amountInput.value), // Negative to show it's been deducted
        date: dateInput.value,
        adjustedFrom: transaction.id, // Reference to the expense that caused this adjustment
      };

      transactions.push(adjustedIncome);
    }
    // If there is a matching income transaction, update it with an adjustment note
    else {
      const adjustmentNote = `Expense deducted: ${transaction.description}`;
      if (!matchingIncomeTransaction.adjustments) {
        matchingIncomeTransaction.adjustments = [];
      }
      matchingIncomeTransaction.adjustments.push({
        amount: -parseFloat(amountInput.value),
        description: adjustmentNote,
        date: dateInput.value,
        expenseId: transaction.id,
      });
    }
  }

  saveTransactions();
  applyDateFilter();

  // Reset form
  transactionForm.reset();
  setDefaultDate();
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
  // If this transaction has adjustments, show an indicator
  if (transaction.adjustments && transaction.adjustments.length > 0) {
    const adjustmentDiv = document.createElement("div");
    adjustmentDiv.className = "transaction-adjustment-indicator";

    const totalAdjustment = transaction.adjustments.reduce(
      (total, adj) => total + adj.amount,
      0
    );
    adjustmentDiv.textContent = `${transaction.adjustments.length} expense adjustment(s)`;

    // Create a detailed tooltip that shows each adjustment
    const tooltipDetails = transaction.adjustments
      .map((adj) => {
        const relatedExpense = transactions.find((t) => t.id === adj.expenseId);
        const expenseDesc = relatedExpense
          ? relatedExpense.description
          : "Unknown expense";
        return `${formatDate(adj.date)}: ${expenseDesc} (${formatMoney(
          adj.amount
        )})`;
      })
      .join("\n");

    adjustmentDiv.title = `Original amount: ${formatMoney(
      transaction.amount
    )}\nAdjustments total: ${formatMoney(
      totalAdjustment
    )}\n\nDetails:\n${tooltipDetails}`;
    categoryDiv.appendChild(adjustmentDiv);
  }

  // If this is an adjusted income entry
  if (transaction.adjustedFrom) {
    const adjustedDiv = document.createElement("div");
    adjustedDiv.className = "transaction-adjusted";
    adjustedDiv.textContent = "Adjustment";
    categoryDiv.appendChild(adjustedDiv);
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

  // Calculate displayed amount, accounting for adjustments
  let displayAmount = transaction.amount;
  let adjustmentText = "";

  // If this is an income with adjustments, show the adjusted amount
  if (
    transaction.type === "income" &&
    transaction.adjustments &&
    transaction.adjustments.length > 0
  ) {
    const adjustmentsTotal = transaction.adjustments.reduce(
      (adjAcc, adj) => adjAcc + adj.amount,
      0
    );
    displayAmount += adjustmentsTotal;
    adjustmentText = ` (${formatMoney(transaction.amount)} original)`;
  }

  amountDiv.textContent = `${
    transaction.type === "income" ? "+" : "-"
  } ${formatMoney(Math.abs(displayAmount))}${adjustmentText}`;

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "transaction-actions";

  // Edit button
  const editButton = document.createElement("button");
  editButton.className = "action-btn edit-btn";
  editButton.setAttribute("title", "Edit Transaction");
  editButton.addEventListener("click", () => editTransaction(transaction.id));

  editButton.innerHTML = `
    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1-.11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
    </svg>
  `;

  // Delete button
  const deleteButton = document.createElement("button");
  deleteButton.className = "action-btn delete-btn";
  deleteButton.setAttribute("title", "Delete Transaction");
  deleteButton.addEventListener("click", () =>
    removeTransaction(transaction.id)
  );

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
  if (confirm("Are you sure you want to delete this transaction?")) {
    const transactionToDelete = transactions.find((t) => t.id === id);

    if (transactionToDelete) {
      // If it's an expense with an income source, we need to update the related income adjustment
      if (
        transactionToDelete.type === "expense" &&
        transactionToDelete.incomeSource
      ) {
        // Find any income transactions with adjustments related to this expense
        const affectedIncomeTransactions = transactions.filter(
          (t) =>
            t.type === "income" &&
            t.adjustments &&
            t.adjustments.some((adj) => adj.expenseId === id)
        );

        // Remove the adjustment from each affected income transaction
        affectedIncomeTransactions.forEach((incomeTransaction) => {
          incomeTransaction.adjustments = incomeTransaction.adjustments.filter(
            (adj) => adj.expenseId !== id
          );

          // If there are no more adjustments, remove the adjustments array
          if (incomeTransaction.adjustments.length === 0) {
            delete incomeTransaction.adjustments;
          }
        });

        // Also delete any adjusted income entries specifically created for this expense
        const adjustedIncomeIndices = [];
        transactions.forEach((t, index) => {
          if (t.type === "income" && t.adjustedFrom === id) {
            adjustedIncomeIndices.push(index);
          }
        });

        // Remove the adjusted income entries in reverse order to avoid index shifting
        for (let i = adjustedIncomeIndices.length - 1; i >= 0; i--) {
          transactions.splice(adjustedIncomeIndices[i], 1);
        }
      }

      // Remove the transaction itself
      transactions = transactions.filter(
        (transaction) => transaction.id !== id
      );
      saveTransactions();
      applyDateFilter();
    }
  }
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
  editTransactionModal.style.display = "block";
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

  const id = parseInt(editTransactionId.value);

  // Find the index of the transaction in the array
  const index = transactions.findIndex((t) => t.id === id);

  if (index !== -1) {
    // Get the old transaction data before updating
    const oldTransaction = transactions[index];

    // Check if we're changing the amount of an expense that's linked to an income source
    let adjustmentNeedsUpdate = false;
    let oldIncomeSource = null;

    if (oldTransaction.type === "expense" && oldTransaction.incomeSource) {
      oldIncomeSource = oldTransaction.incomeSource;
      adjustmentNeedsUpdate = true;
    }
    // Update the transaction
    transactions[index] = {
      id: id,
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

      // If we have a new income source or we had one before, use it
      if (newIncomeSource) {
        transactions[index].incomeSource = newIncomeSource;
      } else if (oldIncomeSource) {
        transactions[index].incomeSource = oldIncomeSource;
      }
    }

    // If this was an expense tied to an income source, update the corresponding adjustment
    if (adjustmentNeedsUpdate) {
      // Find any income transactions with adjustments related to this expense
      const affectedIncomeTransactions = transactions.filter(
        (t) =>
          t.type === "income" &&
          t.adjustments &&
          t.adjustments.some((adj) => adj.expenseId === id)
      );

      affectedIncomeTransactions.forEach((incomeTransaction) => {
        const adjIndex = incomeTransaction.adjustments.findIndex(
          (adj) => adj.expenseId === id
        );
        if (adjIndex !== -1) {
          // Update the adjustment amount based on the new expense amount
          const oldAdjustment = incomeTransaction.adjustments[adjIndex];
          incomeTransaction.adjustments[adjIndex] = {
            ...oldAdjustment,
            amount: -parseFloat(editAmountInput.value),
            description: `Expense deducted: ${editDescriptionInput.value.trim()}`,
            date: editDateInput.value,
          };
        }
      });

      // Handle adjusted income entries that were created specifically for this expense
      const adjustedIncomeIndex = transactions.findIndex(
        (t) => t.type === "income" && t.adjustedFrom === id
      );

      if (adjustedIncomeIndex !== -1) {
        // Update the adjusted income transaction
        transactions[adjustedIncomeIndex].amount = -parseFloat(
          editAmountInput.value
        );
        transactions[adjustedIncomeIndex].date = editDateInput.value;
        transactions[
          adjustedIncomeIndex
        ].description = `Adjusted ${formatCategory(oldIncomeSource)}`;
      }
    }

    // Save to localStorage and update UI
    saveTransactions();
    applyDateFilter();

    // Close the modal
    closeEditTransactionModal();
  }
}

// Close the edit transaction modal
function closeEditTransactionModal() {
  editTransactionModal.style.display = "none";
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
  updateCategoryChart();

  const activeTab = document.querySelector(".tab.active");
  if (activeTab) {
    const filterType = activeTab.getAttribute("data-tab");
    filterTransactions(filterType);
  }
}

// Get data for category chart
function getCategoryChartData(type) {
  // Group transactions by category and sum amounts
  const categoryData = {};

  // Filter by transaction type
  const typeTransactions = filteredTransactions.filter((t) => t.type === type);

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
    let amount = transaction.amount;

    // Include adjustments in the total for income transactions
    if (
      transaction.type === "income" &&
      transaction.adjustments &&
      transaction.adjustments.length > 0
    ) {
      const adjustmentsTotal = transaction.adjustments.reduce(
        (total, adj) => total + adj.amount,
        0
      );
      amount += adjustmentsTotal;
    }

    if (categoryData[categoryName]) {
      categoryData[categoryName] += amount;
    } else {
      categoryData[categoryName] = amount;
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
    .reduce((acc, transaction) => {
      // Add the base transaction amount
      let totalAmount = transaction.amount;

      // If there are adjustments, add them to the total
      if (transaction.adjustments && transaction.adjustments.length > 0) {
        const adjustmentsTotal = transaction.adjustments.reduce(
          (adjAcc, adj) => adjAcc + adj.amount,
          0
        );
        totalAmount += adjustmentsTotal;
      }

      return acc + totalAmount;
    }, 0);

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
  const tableData = filteredTransactions.map((transaction) => {
    // Calculate displayed amount, accounting for adjustments
    let displayAmount = transaction.amount;
    let notes = "";

    // Handle adjustments for income transactions
    if (
      transaction.type === "income" &&
      transaction.adjustments &&
      transaction.adjustments.length > 0
    ) {
      const adjustmentsTotal = transaction.adjustments.reduce(
        (adjAcc, adj) => adjAcc + adj.amount,
        0
      );
      displayAmount += adjustmentsTotal;
      notes = `Original: ${formatMoney(
        transaction.amount
      )}, Adjusted by expenses`;
    }

    // Add income source info for expenses
    if (transaction.type === "expense" && transaction.incomeSource) {
      const sourceName = formatCategory(transaction.incomeSource);
      notes = `Deducted from: ${sourceName}`;
    }

    return [
      formatDate(transaction.date),
      transaction.description,
      formatCategory(transaction.category),
      transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
      formatMoney(displayAmount),
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

// Initialize custom category dropdown
function initializeCustomCategoryDropdown() {
  // Toggle dropdown on click
  customSelectTrigger.addEventListener("click", function () {
    customCategorySelect.classList.toggle("open");
  });

  // Close the dropdown when clicking outside
  document.addEventListener("click", function (e) {
    if (!customCategorySelect.contains(e.target)) {
      customCategorySelect.classList.remove("open");
    }
  });

  // Setup custom options based on transaction type selected
  updateCustomCategoryOptions();
}

// Update custom category options in dropdown
function updateCustomCategoryOptions() {
  const selectedType = typeInput.value;

  // Clear existing options
  customOptions.innerHTML = "";

  // Create options for each category
  categories[selectedType].forEach((category) => {
    const isDefault = defaultCategories[selectedType].some(
      (c) => c.id === category.id
    );

    addCategoryToDropdown(category, selectedType, isDefault);
  });

  // Add "Add New Category" option at the bottom
  const addNewOption = document.createElement("div");
  addNewOption.className = "add-new-category";
  addNewOption.innerHTML = `
    <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
    </svg>
    Add New Category
  `;
  addNewOption.addEventListener("click", function (e) {
    e.stopPropagation();
    customCategorySelect.classList.remove("open");
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
  }
}

// Add a category to the custom dropdown
function addCategoryToDropdown(category, type, isDefault = false) {
  const optionItem = document.createElement("div");
  optionItem.className = "option-item";
  optionItem.dataset.value = category.id;
  optionItem.dataset.type = type;

  // Option content with text and action buttons
  optionItem.innerHTML = `
    <span class="option-text">${category.name}</span>
    <div class="option-actions">
      ${
        !isDefault
          ? `
      <button class="option-action-btn edit-btn" title="Edit Category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
          <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
        </svg>
      </button>
      <button class="option-action-btn delete-btn" title="Delete Category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
          <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
        </svg>
      </button>
      `
          : ""
      }
    </div>
  `;

  // Add click event for selecting the category option
  optionItem.addEventListener("click", function () {
    selectCategoryOption(category.id, category.name);
    customCategorySelect.classList.remove("open");
  });

  // Add event handlers for edit and delete buttons if not a default category
  if (!isDefault) {
    const editButton = optionItem.querySelector(".edit-btn");
    if (editButton) {
      editButton.addEventListener("click", function (e) {
        e.stopPropagation(); // Prevent option selection
        showCategoryEditModal(category.id, category.name, type);
      });
    }

    const deleteButton = optionItem.querySelector(".delete-btn");
    if (deleteButton) {
      deleteButton.addEventListener("click", function (e) {
        e.stopPropagation(); // Prevent option selection
        deleteCategoryFromDropdown(category.id, type);
      });
    }
  }

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
    } else {
      option.classList.remove("selected");
    }
  });
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

// Delete a category from the dropdown
function deleteCategoryFromDropdown(id, type) {
  const categoryUsed = transactions.some((t) => t.category === id);

  if (categoryUsed) {
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

// Edit category with Enter key
editCategoryNameInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    saveEditedCategory();
  }
});

// Initialize app
function init() {
  transactionList.innerHTML = "";
  filteredTransactions = [...transactions];
  filteredTransactions.forEach(addTransactionDOM);
  updateValues();
  loadCategories();
  setupFormToggle();
  setupFilterHistoryToggle();
  setupChartsToggle();
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

// Event listener for edit transaction type change
editTypeInput.addEventListener("change", () => {
  updateEditCategoryOptions(editTypeInput.value);
});

// Event listener for edit transaction form submission
editTransactionForm.addEventListener("submit", saveEditedTransaction);

// Event listener for delete button in edit modal
editDeleteBtn.addEventListener("click", () => {
  const id = parseInt(editTransactionId.value);
  removeTransaction(id);
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

// Initialize app on load
document.addEventListener("DOMContentLoaded", () => {
  initializeChart();
  setDefaultDate();
  init();
  initializeCustomCategoryDropdown();
});

// Create global functions
window.removeTransaction = removeTransaction;

// Handle transaction type change to show/hide income source dropdown
document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("transaction-type")
    .addEventListener("change", handleTransactionTypeChange);
});

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
