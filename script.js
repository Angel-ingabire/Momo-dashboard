/**
 * MTN Dashboard - Transaction Visualization System
 * 
 * This script handles:
 * - Fetching transaction data from the API
 * - Displaying transactions with pagination
 * - Filtering and searching functionality
 * - Chart visualization
 * - Report generation
 * - UI interactions and dark mode
 */

// Global variables
let transactions = []; // Stores all transactions from API
let currentPage = 1; // Tracks current pagination page
const transactionsPerPage = 100; // Number of transactions per page

// DOM Elements
const transactionListEl = document.getElementById('transactionList');
const searchInputEl = document.getElementById('search');
const typeFilterEl = document.getElementById('typeFilter');
const amountFilterEl = document.getElementById('amountFilter');

/**
 * Fetches transaction and summary data from the API
 * Handles loading states and error scenarios
 */
const fetchData = async () => {
  try {
    // Show loading state
    transactionListEl.innerHTML = '<div class="loading">Loading transactions...</div>';
    
    // Fetch both endpoints in parallel for better performance
    const [txResponse, summaryResponse] = await Promise.all([
      fetch('http://localhost:5000/api/transactions'),
      fetch('http://localhost:5000/api/summary')
    ]);
    
    // Check for failed responses
    if (!txResponse.ok || !summaryResponse.ok) {
      throw new Error('Failed to fetch data from server');
    }
    
    // Parse JSON responses
    transactions = await txResponse.json();
    const summary = await summaryResponse.json();
    
    // Update UI with fetched data
    updateSummary(summary);
    filterTransactions();
    
    // Initialize charts if on charts page
    if (document.querySelector('.sidebar nav ul li.active').textContent === 'Charts') {
      drawCharts();
    }
  } catch (error) {
    console.error('Data fetch error:', error);
    showError('Failed to load transactions. Please try again later.');
  }
};

/**
 * Updates the summary counters in the UI
 * @param {Object} summary - Summary data from API
 */
const updateSummary = (summary) => {
  document.getElementById('totalTrans').textContent = summary.total || 0;
  document.getElementById('incoming').textContent = summary.incomings || 0;
  document.getElementById('payments').textContent = summary.payments || 0;
  document.getElementById('deposits').textContent = summary.deposits || 0;
};

/**
 * Filters transactions based on search and filter inputs
 * Resets to first page whenever filters change
 */
const filterTransactions = () => {
  currentPage = 1; // Reset pagination on filter change

  // Get filter values
  const searchTerm = searchInputEl.value.trim().toLowerCase();
  const typeFilter = typeFilterEl.value;
  const amountFilterValue = amountFilterEl.value.trim();

  // Robust currency parsing (handles commas, decimals, etc.)
  const parseCurrency = (val) => {
    if (!val) return NaN;
    const num = parseFloat(val.toString().replace(/[^\d.-]/g, ''));
    return isNaN(num) ? NaN : num;
  };

  // Parse amount with currency handling
  const amountFilter = parseCurrency(amountFilterValue);

  // Filter transactions with precise amount matching
  const filtered = transactions.filter(tx => {
    // 1. Search filter (body or category)
    const searchMatch = !searchTerm || 
          tx.sms_body.toLowerCase().includes(searchTerm) || 
          tx.category.toLowerCase().includes(searchTerm);
    
    // 2. Type filter
    const typeMatch = !typeFilter || tx.category === typeFilter;
    
    // 3. Exact amount filter (with floating point precision handling)
    let amountMatch = true;
    if (!isNaN(amountFilter)) {
      const txAmount = typeof tx.amount === 'number' ? tx.amount : parseCurrency(tx.amount);
      // Compare with 2 decimal precision for currency values
      amountMatch = Math.abs(txAmount - amountFilter) < 0.01;
    }
    
    return searchMatch && typeMatch && amountMatch;
  });

  renderTransactions(filtered, searchTerm);
};

/**
 * Renders transactions in a styled table with pagination
 * @param {Array} list - Filtered transactions to display
 * @param {String} searchTerm - Current search term for highlighting
 */
const renderTransactions = (list, searchTerm = '') => {
  // Clear previous content
  transactionListEl.innerHTML = '';

  // Handle empty state
  if (list.length === 0) {
    transactionListEl.innerHTML = '<div class="empty">No transactions found matching your filters</div>';
    return;
  }

  // Calculate pagination values
  const totalPages = Math.ceil(list.length / transactionsPerPage);
  const startIndex = (currentPage - 1) * transactionsPerPage;
  const paginatedList = list.slice(startIndex, startIndex + transactionsPerPage);

  // Create table structure
  const table = document.createElement('table');
  table.className = 'transaction-table';

  // Create table header
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>Date & Time</th>
      <th>Type</th>
      <th>Category</th>
      <th>Recipient/Sender</th>
      <th>Amount (RWF)</th>
      <th>Details</th>
    </tr>
  `;
  table.appendChild(thead);

  // Create table body with transaction rows
  const tbody = document.createElement('tbody');
  paginatedList.forEach(tx => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDateTime(tx.sms_date, tx.sms_time)}</td>
      <td><span class="type-badge ${tx.type}">${tx.type}</span></td>
      <td>${highlightText(tx.category, searchTerm)}</td>
      <td>${highlightText(extractRecipient(tx.sms_body), searchTerm)}</td>
      <td>${tx.amount.toLocaleString()}</td>
      <td class="sms-preview">${highlightText(truncateText(tx.sms_body, 50), searchTerm)}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  transactionListEl.appendChild(table);

  // Add pagination controls if needed
  if (totalPages > 1) {
    renderPaginationControls(totalPages, list, searchTerm);
  }
};

/**
 * Creates pagination controls
 * @param {Number} totalPages - Total number of pages
 * @param {Array} list - Full filtered transaction list
 * @param {String} searchTerm - Current search term
 */
const renderPaginationControls = (totalPages, list, searchTerm) => {
  const paginationDiv = document.createElement('div');
  paginationDiv.className = 'pagination';

  // Previous button
  const prevButton = createPaginationButton('Previous', currentPage === 1, () => {
    currentPage--;
    renderTransactions(list, searchTerm);
  });
  paginationDiv.appendChild(prevButton);

  // Page number buttons
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  // Adjust if we're at the beginning or end
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  // First page and ellipsis if needed
  if (startPage > 1) {
    paginationDiv.appendChild(createPaginationButton('1', false, () => {
      currentPage = 1;
      renderTransactions(list, searchTerm);
    }));
    if (startPage > 2) {
      paginationDiv.appendChild(createEllipsis());
    }
  }

  // Page number range
  for (let i = startPage; i <= endPage; i++) {
    const isActive = i === currentPage;
    paginationDiv.appendChild(createPaginationButton(i.toString(), isActive, () => {
      currentPage = i;
      renderTransactions(list, searchTerm);
    }));
  }

  // Last page and ellipsis if needed
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationDiv.appendChild(createEllipsis());
    }
    paginationDiv.appendChild(createPaginationButton(totalPages.toString(), false, () => {
      currentPage = totalPages;
      renderTransactions(list, searchTerm);
    }));
  }

  // Next button
  const nextButton = createPaginationButton('Next', currentPage === totalPages, () => {
    currentPage++;
    renderTransactions(list, searchTerm);
  });
  paginationDiv.appendChild(nextButton);

  transactionListEl.appendChild(paginationDiv);
};

/**
 * Creates a pagination button element
 * @param {String} text - Button text
 * @param {Boolean} isDisabled - Whether button should be disabled
 * @param {Function} onClick - Click handler function
 * @returns {HTMLElement} Button element
 */
const createPaginationButton = (text, isDisabled, onClick) => {
  const button = document.createElement('button');
  button.textContent = text;
  button.disabled = isDisabled;
  button.addEventListener('click', onClick);
  if (text !== 'Previous' && text !== 'Next' && !isDisabled) {
    button.classList.toggle('active', text === currentPage.toString());
  }
  return button;
};

/**
 * Creates an ellipsis element for pagination
 * @returns {HTMLElement} Span element with ellipsis
 */
const createEllipsis = () => {
  const ellipsis = document.createElement('span');
  ellipsis.textContent = '...';
  return ellipsis;
};

/**
 * Formats date and time for display
 * @param {String} date - Date string
 * @param {String} time - Time string
 * @returns {String} Formatted date/time string
 */
const formatDateTime = (date, time) => {
  if (!date) return 'N/A';
  const formattedDate = new Date(date).toLocaleDateString();
  if (!time) return formattedDate;
  return `${formattedDate} ${time}`;
};

/**
 * Truncates text with ellipsis if needed
 * @param {String} text - Text to truncate
 * @param {Number} maxLength - Maximum length before truncation
 * @returns {String} Truncated text
 */
const truncateText = (text, maxLength) => {
  if (!text) return '';
  return text.length > maxLength 
    ? `${text.substring(0, maxLength)}...` 
    : text;
};

/**
 * Highlights search matches in text
 * @param {String} text - Text to process
 * @param {String} search - Search term to highlight
 * @returns {String} Text with highlighted matches
 */
const highlightText = (text, search) => {
  if (!search || !text) return text;
  try {
    const regex = new RegExp(`(${escapeRegExp(search)})`, 'gi');
    return text.toString().replace(regex, '<span class="highlight">$1</span>');
  } catch (e) {
    return text; // Return original text if regex fails
  }
};

/**
 * Escapes special regex characters in a string
 * @param {String} string - String to escape
 * @returns {String} Escaped string
 */
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Extracts recipient/sender from SMS body text
 * @param {String} smsBody - SMS message content
 * @returns {String} Extracted recipient or 'N/A'
 */
const extractRecipient = (smsBody) => {
  if (!smsBody) return 'N/A';
  
  const patterns = [
    /from (\+\d{10,15}|\w+ \w+|\w+)/i,
    /to (\+\d{10,15}|\w+ \w+|\w+)/i,
    /recipient[: ]+(\+\d{10,15}|\w+ \w+|\w+)/i,
    /paid to (\+\d{10,15}|\w+ \w+|\w+)/i,
    /sent to (\+\d{10,15}|\w+ \w+|\w+)/i
  ];
  
  for (const pattern of patterns) {
    const match = smsBody.match(pattern);
    if (match && match[1]) return match[1];
  }
  
  return 'N/A';
};

/**
 * Draws transaction visualization charts
 */
const drawCharts = () => {
  // Clean up existing charts
  [Chart.getChart('barChart'), Chart.getChart('pieChart')].forEach(chart => {
    if (chart) chart.destroy();
  });

  // Get currently filtered data
  const filtered = getFilteredTransactions();

  // Prepare chart data
  const categories = [...new Set(filtered.map(t => t.category))];
  const categoryCounts = categories.map(cat => 
    filtered.filter(t => t.category === cat).length
  );
  const categoryAmounts = categories.map(cat => 
    filtered.filter(t => t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0)
  );

  // Create bar chart
  new Chart(document.getElementById('barChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: categories,
      datasets: [{
        label: 'Transaction Count',
        data: categoryCounts,
        backgroundColor: 'rgba(255, 153, 0, 0.6)',
        borderColor: 'rgba(255, 153, 0, 1)',
        borderWidth: 1
      }]
    },
    options: getBarChartOptions()
  });

  // Create pie chart
  new Chart(document.getElementById('pieChart').getContext('2d'), {
    type: 'pie',
    data: {
      labels: categories,
      datasets: [{
        label: 'Amount (RWF)',
        data: categoryAmounts,
        backgroundColor: [
          '#ff9900', '#ffcc00', '#ffc107', '#f4a261', '#2a9d8f',
          '#e9c46a', '#f4a261', '#e76f51', '#264653', '#2a9d8f'
        ],
        borderWidth: 1
      }]
    },
    options: getPieChartOptions()
  });
};

/**
 * Returns configuration options for bar chart
 * @returns {Object} Chart.js configuration
 */
const getBarChartOptions = () => ({
  responsive: true,
  scales: {
    y: {
      beginAtZero: true,
      title: { display: true, text: 'Number of Transactions' }
    },
    x: {
      title: { display: true, text: 'Transaction Type' }
    }
  }
});

/**
 * Returns configuration options for pie chart
 * @returns {Object} Chart.js configuration
 */
const getPieChartOptions = () => ({
  responsive: true,
  plugins: {
    tooltip: {
      callbacks: {
        label: (context) => `${context.label}: ${context.raw.toLocaleString()} RWF`
      }
    },
    legend: { position: 'right' }
  }
});

/**
 * Gets currently filtered transactions based on UI inputs
 * @returns {Array} Filtered transactions
 */
const getFilteredTransactions = () => {
  const searchTerm = searchInputEl.value.toLowerCase();
  const typeFilter = typeFilterEl.value;
  const amountFilter = parseFloat(amountFilterEl.value) || 0;
  
  return transactions.filter(tx => {
    const searchMatch = !searchTerm || 
          tx.sms_body.toLowerCase().includes(searchTerm) || 
          tx.category.toLowerCase().includes(searchTerm);
    const typeMatch = !typeFilter || tx.category === typeFilter;
    const amountMatch = !amountFilter || tx.amount >= amountFilter;
    
    return searchMatch && typeMatch && amountMatch;
  });
};

/**
 * Generates and downloads a comprehensive transaction report
 * Includes filtered data, summary statistics, and metadata
 */
const generateReport = () => {
  try {
    // Get current filters and date range
    const filters = {
      search: searchInputEl.value.trim(),
      type: typeFilterEl.value,
      amount: amountFilterEl.value.trim()
    };
    
    // Get filtered transactions
    const transactions = getFilteredTransactions();
    
    // Calculate summary statistics
    const summary = {
      totalTransactions: transactions.length,
      totalAmount: transactions.reduce((sum, tx) => sum + tx.amount, 0),
      startDate: transactions.length > 0 ? transactions[transactions.length - 1].sms_date : 'N/A',
      endDate: transactions.length > 0 ? transactions[0].sms_date : 'N/A'
    };
    
    // Prepare report data
    const reportData = {
      meta: {
        title: "MTN Transaction Report",
        generatedAt: new Date().toISOString(),
        filters: filters
      },
      summary: summary,
      transactions: transactions
    };
    
    // Download as JSON
    downloadReport(reportData);
    
  } catch (error) {
    showError("Failed to generate report: " + error.message);
  }
};

/**
 * Downloads report data as JSON file
 * @param {Object} reportData - Complete report data to download
 */
const downloadReport = (reportData) => {
  const filename = `mtn-report-${new Date().toISOString().split('T')[0]}.json`;
  const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
    type: 'application/json' 
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Shows error message with retry option
 * @param {String} message - Error message to display
 */
const showError = (message) => {
  transactionListEl.innerHTML = `
    <div class="error">
      <p>${message}</p>
      <button onclick="generateReport()">Try Again</button>
    </div>
  `;
};

// Initialize event listeners
const initEventListeners = () => {
  // Filter inputs
  searchInputEl.addEventListener('input', filterTransactions);
  typeFilterEl.addEventListener('change', filterTransactions);
  amountFilterEl.addEventListener('input', filterTransactions);

  // Report download
  document.getElementById('downloadReport').addEventListener('click', downloadReport);

  // Dark mode toggle
  document.getElementById('darkModeToggle').addEventListener('change', (e) => {
    document.body.classList.toggle('dark', e.target.checked);
    localStorage.setItem('darkMode', e.target.checked);
  });

  // Tab navigation
  document.querySelectorAll('.sidebar nav ul li').forEach((tab, idx) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.sidebar nav ul li').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('main section').forEach((section, i) => {
        section.classList.toggle('hidden', i !== idx);
      });
      if (tab.textContent === 'Charts') drawCharts();
    });
  });
};

// Initialize application
const initApp = () => {
  // Set dark mode if enabled
  const darkMode = localStorage.getItem('darkMode') === 'true';
  document.getElementById('darkModeToggle').checked = darkMode;
  document.body.classList.toggle('dark', darkMode);
  
  // Set up event listeners
  initEventListeners();
  
  // Load data
  fetchData();
};

// Start application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);