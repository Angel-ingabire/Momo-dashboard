/**
 * MTN Dashboard - Transaction Visualization System
 */

// Global variables
let transactions = [];
let currentPage = 1;
const transactionsPerPage = 100;

// DOM Elements
const transactionListEl = document.getElementById('transactionList');
const searchInputEl = document.getElementById('search');
const typeFilterEl = document.getElementById('typeFilter');
const amountFilterEl = document.getElementById('amountFilter');

// Utility function to ensure numeric values
const ensureNumber = (value) => {
  if (typeof value === 'number') return value;
  const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : num;
};

// Initialize application
const initApp = () => {
  // Set dark mode if enabled
  const darkMode = localStorage.getItem('darkMode') === 'true';
  document.body.classList.toggle('dark', darkMode);
  document.getElementById('darkModeToggle').checked = darkMode;

  // Initialize event listeners and fetch data
  initEventListeners();
  fetchData();
};

// Main event listeners
const initEventListeners = () => {
  // Filter inputs
  searchInputEl?.addEventListener('input', filterTransactions);
  typeFilterEl?.addEventListener('change', filterTransactions);
  amountFilterEl?.addEventListener('input', filterTransactions);

  // Dark mode toggle
  document.getElementById('darkModeToggle')?.addEventListener('change', (e) => {
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

  // Report controls
  document.getElementById('applyReportFilter')?.addEventListener('click', applyDateFilter);
  document.getElementById('exportCSV')?.addEventListener('click', exportToCSV);
  document.getElementById('exportPDF')?.addEventListener('click', exportToPDF);
  document.getElementById('printReport')?.addEventListener('click', printReport);
};

// Data fetching
const fetchData = async () => {
  try {
    transactionListEl.innerHTML = '<div class="loading">Loading transactions...</div>';
    
    const [txResponse, summaryResponse] = await Promise.all([
      fetch('http://localhost:5000/api/transactions'),
      fetch('http://localhost:5000/api/summary')
    ]);
    
    if (!txResponse.ok || !summaryResponse.ok) {
      throw new Error('Failed to fetch data');
    }
    
    transactions = await txResponse.json();
    // Ensure all amounts are numbers
    transactions.forEach(tx => {
      tx.amount = ensureNumber(tx.amount);
    });
    
    const summary = await summaryResponse.json();
    updateSummary(summary);
    filterTransactions();
    
    if (document.querySelector('.sidebar nav ul li.active')?.textContent === 'Charts') {
      drawCharts();
    }
  } catch (error) {
    console.error('Data fetch error:', error);
    showError('Failed to load transactions. Please try again later.');
  }
};

// Summary and filtering
const updateSummary = (summary) => {
  document.getElementById('totalTrans').textContent = summary.total || 0;
  document.getElementById('incoming').textContent = summary.incomings || 0;
  document.getElementById('payments').textContent = summary.payments || 0;
  document.getElementById('deposits').textContent = summary.deposits || 0;
};

const filterTransactions = () => {
  currentPage = 1;
  const searchTerm = searchInputEl.value.trim().toLowerCase();
  const typeFilter = typeFilterEl.value;
  const amountFilterValue = amountFilterEl.value.trim();

  const filtered = transactions.filter(tx => {
    const searchMatch = !searchTerm || 
          tx.sms_body.toLowerCase().includes(searchTerm) || 
          tx.category.toLowerCase().includes(searchTerm);
    const typeMatch = !typeFilter || tx.category === typeFilter;
    const amountMatch = !amountFilterValue || 
          ensureNumber(tx.amount) === ensureNumber(amountFilterValue);
    
    return searchMatch && typeMatch && amountMatch;
  });

  renderTransactions(filtered, searchTerm);
};

// Transaction rendering with pagination
const renderTransactions = (list, searchTerm = '') => {
  transactionListEl.innerHTML = '';

  if (list.length === 0) {
    transactionListEl.innerHTML = '<div class="empty">No matching transactions found</div>';
    return;
  }

  const totalPages = Math.ceil(list.length / transactionsPerPage);
  const paginatedList = list.slice(
    (currentPage - 1) * transactionsPerPage,
    currentPage * transactionsPerPage
  );

  const table = document.createElement('table');
  table.className = 'transaction-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Date & Time</th>
        <th>Type</th>
        <th>Category</th>
        <th>Recipient/Sender</th>
        <th>Amount (RWF)</th>
        <th>Details</th>
      </tr>
    </thead>
    <tbody>
      ${paginatedList.map(tx => `
        <tr>
          <td>${formatDateTime(tx.sms_date, tx.sms_time)}</td>
          <td><span class="type-badge ${tx.type}">${tx.type}</span></td>
          <td>${highlightText(tx.category, searchTerm)}</td>
          <td>${highlightText(extractRecipient(tx.sms_body), searchTerm)}</td>
          <td>${ensureNumber(tx.amount).toLocaleString()}</td>
          <td>${highlightText(truncateText(tx.sms_body, 50), searchTerm)}</td>
        </tr>
      `).join('')}
    </tbody>
  `;
  
  transactionListEl.appendChild(table);
  
  // Add pagination controls
  if (totalPages > 1) {
    renderPaginationControls(totalPages, list, searchTerm);
  }
};

// Pagination controls
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

const createEllipsis = () => {
  const ellipsis = document.createElement('span');
  ellipsis.textContent = '...';
  return ellipsis;
};

// Report functionality
const applyDateFilter = () => {
  try {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    
    if (!startDate && !endDate) {
      updateReportView(transactions);
      return;
    }

    const filtered = transactions.filter(tx => {
      const txDate = new Date(tx.sms_date).toISOString().split('T')[0];
      return (!startDate || txDate >= startDate) && 
             (!endDate || txDate <= endDate);
    });

    updateReportView(filtered);
  } catch (error) {
    console.error('Date filter error:', error);
    alert('Error applying date filter. Check console for details.');
  }
};

const updateReportView = (transactions) => {
  if (!transactions || transactions.length === 0) {
    document.getElementById('report-data').innerHTML = 
      '<tr><td colspan="4" class="no-data">No transactions found</td></tr>';
    resetSummaryCards();
    return;
  }

  updateSummaryCards(transactions);
  renderReportTable(transactions);
};

const updateSummaryCards = (transactions) => {
  const totalAmount = transactions.reduce((sum, tx) => sum + ensureNumber(tx.amount), 0);
  const transactionCount = transactions.length;
  const avgAmount = transactionCount > 0 ? totalAmount / transactionCount : 0;

  document.getElementById('total-count').textContent = transactionCount.toLocaleString();
  document.getElementById('total-amount').textContent = `${totalAmount.toLocaleString()} RWF`;
  document.getElementById('avg-amount').textContent = `${avgAmount.toFixed(2)} RWF`;
  
  const lastTransaction = transactions[0];
  document.getElementById('last-date').textContent = lastTransaction 
    ? formatDateTime(lastTransaction.sms_date) 
    : '-';
};

const renderReportTable = (transactions) => {
  const tbody = document.getElementById('report-data');
  tbody.innerHTML = transactions
    .map(tx => `
      <tr>
        <td>${formatDateTime(tx.sms_date)}</td>
        <td>${tx.category}</td>
        <td>${ensureNumber(tx.amount).toLocaleString()}</td>
        <td class="report-details">${truncateText(tx.sms_body, 60)}</td>
      </tr>
    `)
    .join('');
};

// Chart functions
const drawCharts = () => {
  // Clean up existing charts
  [Chart.getChart('barChart'), Chart.getChart('pieChart')].forEach(chart => {
    if (chart) chart.destroy();
  });

  const filtered = getFilteredTransactions();
  const categories = [...new Set(filtered.map(t => t.category))];
  
  // Prepare chart data
  const categoryData = categories.map(category => {
    const categoryTransactions = filtered.filter(t => t.category === category);
    const count = categoryTransactions.length;
    const totalAmount = categoryTransactions.reduce((sum, t) => sum + ensureNumber(t.amount), 0);
    const avgAmount = count > 0 ? totalAmount / count : 0;
    
    return { category, count, totalAmount, avgAmount };
  });

  // Sort by count (descending) and take top 10
  const sortedCategories = [...categoryData]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Bar Chart - Transaction Counts
  new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: sortedCategories.map(d => d.category),
      datasets: [{
        label: 'Transaction Count',
        data: sortedCategories.map(d => d.count),
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        yAxisID: 'y'
      }, {
        label: 'Avg Amount (RWF)',
        data: sortedCategories.map(d => d.avgAmount),
        backgroundColor: 'rgba(255, 159, 64, 0.7)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 1,
        type: 'line',
        yAxisID: 'y1'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Transaction Analysis by Category'
        },
        tooltip: {
          callbacks: {
            afterBody: (context) => {
              const data = sortedCategories[context[0].dataIndex];
              return [
                `Total Amount: ${data.totalAmount.toLocaleString()} RWF`,
                `Avg Amount: ${data.avgAmount.toLocaleString()} RWF`
              ];
            }
          }
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: { display: true, text: 'Transaction Count' }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: { display: true, text: 'Average Amount (RWF)' },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });

  // Pie Chart - Amount Distribution
  new Chart(document.getElementById('pieChart'), {
    type: 'doughnut',
    data: {
      labels: sortedCategories.map(d => d.category),
      datasets: [{
        label: 'Amount Distribution',
        data: sortedCategories.map(d => d.totalAmount),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
          '#FF9F40', '#8AC24A', '#F06292', '#7986CB', '#A1887F'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Amount Distribution by Category'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.raw || 0;
              const percentage = context.dataset.data.reduce((a, b) => a + b, 0) > 0 
                ? Math.round((value / context.dataset.data.reduce((a, b) => a + b, 0)) * 100)
                : 0;
              return `${label}: ${value.toLocaleString()} RWF (${percentage}%)`;
            }
          }
        },
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12,
            padding: 20
          }
        }
      },
      cutout: '60%'
    }
  });
};

// Export functions
const exportToCSV = () => {
  try {
    const filtered = getFilteredTransactions();
    if (filtered.length === 0) {
      alert('No transactions to export');
      return;
    }

    const headers = ['Date', 'Type', 'Amount (RWF)', 'Details'];
    const csvContent = [
      headers.join(','),
      ...filtered.map(tx => [
        `"${formatDateTime(tx.sms_date)}"`,
        `"${tx.category.replace(/"/g, '""')}"`,
        ensureNumber(tx.amount),
        `"${tx.sms_body.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MTN_Transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  } catch (error) {
    console.error('CSV export error:', error);
    alert('Failed to export CSV. Check console for details.');
  }
};

const exportToPDF = () => {
  alert('PDF export would be implemented with a library like jsPDF');
};

const printReport = () => {
  const printContent = document.getElementById('reports').innerHTML;
  const originalContent = document.body.innerHTML;
  
  document.body.innerHTML = `
    <h1>MTN Transaction Report</h1>
    ${printContent}
    <style>
      body { font-family: Arial; padding: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; }
      .summary-cards { display: flex; margin-bottom: 20px; }
      .card { border: 1px solid #ddd; padding: 10px; margin-right: 15px; min-width: 150px; }
    </style>
  `;
  
  window.print();
  document.body.innerHTML = originalContent;
};

// Utility functions
const formatDateTime = (date, time) => {
  if (!date) return 'N/A';
  const formattedDate = new Date(date).toLocaleDateString();
  return time ? `${formattedDate} ${time}` : formattedDate;
};

const truncateText = (text, maxLength) => {
  return text?.length > maxLength ? `${text.substring(0, maxLength)}...` : text || '';
};

const highlightText = (text, search) => {
  if (!search || !text) return text;
  return text.toString().replace(
    new RegExp(`(${escapeRegExp(search)})`, 'gi'),
    '<span class="highlight">$1</span>'
  );
};

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const extractRecipient = (smsBody) => {
  if (!smsBody) return 'N/A';
  
  const patterns = [
    // Phone numbers (+2507xxxxxxxx or 2507xxxxxxxx)
    /(?:from|to|recipient|paid to|sent to)[:\s]*(\+?2507\d{8})\b/i,
    // Other phone numbers
    /(?:from|to|recipient|paid to|sent to)[:\s]*(\+?\d{7,15})\b/i,
    // Alphanumeric codes (6+ chars)
    /(?:from|to|recipient|paid to|sent to)[:\s]*([A-Z0-9]{6,})\b/i,
    // Names/companies (1-3 words)
    /(?:from|to|recipient|paid to|sent to)[:\s]*([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,2})/i
  ];
  
  for (const pattern of patterns) {
    const match = smsBody.match(pattern);
    if (match && match[1]) {
      let recipient = match[1].trim();
      // Clean up common trailing words
      recipient = recipient.replace(/\s+(?:with|at|on|via|using|from|to)$/i, '');
      return recipient || 'N/A';
    }
  }
  
  return 'N/A';
};

const resetSummaryCards = () => {
  document.getElementById('total-count').textContent = '0';
  document.getElementById('total-amount').textContent = '0 RWF';
  document.getElementById('avg-amount').textContent = '0 RWF';
  document.getElementById('last-date').textContent = '-';
};

const getFilteredTransactions = () => {
  const searchTerm = searchInputEl.value.toLowerCase();
  const typeFilter = typeFilterEl.value;
  const amountFilter = parseFloat(amountFilterEl.value) || 0;
  
  return transactions.filter(tx => {
    const searchMatch = !searchTerm || 
          tx.sms_body.toLowerCase().includes(searchTerm) || 
          tx.category.toLowerCase().includes(searchTerm);
    const typeMatch = !typeFilter || tx.category === typeFilter;
    const amountMatch = !amountFilter || ensureNumber(tx.amount) >= amountFilter;
    
    return searchMatch && typeMatch && amountMatch;
  });
};

const showError = (message) => {
  transactionListEl.innerHTML = `
    <div class="error">
      <p>${message}</p>
      <button onclick="fetchData()">Try Again</button>
    </div>
  `;
};

// Start the application
document.addEventListener('DOMContentLoaded', initApp);