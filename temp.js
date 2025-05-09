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
