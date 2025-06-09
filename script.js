// Sample Data
const transactions = [
  { date: '2024-01-10', type: 'Incoming Money', recipient: 'John Doe', amount: 5000 },
  { date: '2024-01-11', type: 'Bank Transfers', recipient: 'Smith Bank', amount: 15000 },
  { date: '2024-01-10', type: 'Airtime Bill Payments', recipient: 'N/A', amount: 3500 },
  { date: '2024-01-09', type: 'Withdrawals from Agents', recipient: 'Jane Doe', amount: 3500 },
  { date: '2024-01-08', type: 'Incoming Money', recipient: 'N/A', amount: 30000 }
];

const updateSummary = () => {
  document.getElementById('totalTrans').textContent = transactions.length;
  document.getElementById('incoming').textContent = transactions.filter(t => t.type === 'Incoming Money').length;
  document.getElementById('payments').textContent = transactions.filter(t => t.type.includes('Payments')).length;
  document.getElementById('deposits').textContent = transactions.filter(t => t.type === 'Bank Deposits').length;
};

const renderTransactions = (list) => {
  const container = document.getElementById('transactionList');
  container.innerHTML = '';
  list.forEach(tx => {
    const div = document.createElement('div');
    div.className = 'entry';
    div.innerHTML = `
      <div><strong>${tx.date}</strong></div>
      <div>${tx.type}</div>
      <div>${tx.recipient}</div>
      <div>${tx.amount} RWF</div>
    `;
    container.appendChild(div);
  });
};

const applyFilters = () => {
  const search = document.getElementById('search').value.toLowerCase();
  const type = document.getElementById('typeFilter').value;
  const amount = parseFloat(document.getElementById('amountFilter').value);

  let filtered = transactions.filter(tx =>
    (!search || tx.recipient.toLowerCase().includes(search)) &&
    (!type || tx.type === type) &&
    (!amount || tx.amount >= amount)
  );

  renderTransactions(filtered);
};

// Chart Drawing
const drawCharts = () => {
  const barCtx = document.getElementById('barChart').getContext('2d');
  new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: [...new Set(transactions.map(t => t.type))],
      datasets: [{
        label: 'Transaction Count',
        data: [...new Set(transactions.map(t => t.type))].map(type =>
          transactions.filter(t => t.type === type).length),
        backgroundColor: 'rgba(255, 153, 0, 0.6)'
      }]
    },
    options: {
      responsive: true
    }
  });

  const pieCtx = document.getElementById('pieChart').getContext('2d');
  new Chart(pieCtx, {
    type: 'pie',
    data: {
      labels: [...new Set(transactions.map(t => t.type))],
      datasets: [{
        data: [...new Set(transactions.map(t => t.type))].map(type =>
          transactions.filter(t => t.type === type).length),
        backgroundColor: ['#ff9900', '#ffcc00', '#ffc107', '#f4a261', '#2a9d8f']
      }]
    },
    options: {
      responsive: true
    }
  });
};

document.getElementById('search').addEventListener('input', applyFilters);
document.getElementById('typeFilter').addEventListener('change', applyFilters);
document.getElementById('amountFilter').addEventListener('input', applyFilters);

document.getElementById('downloadReport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(transactions, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transaction-report.json';
  a.click();
});

document.getElementById('darkModeToggle').addEventListener('change', (e) => {
  document.body.classList.toggle('dark', e.target.checked);
});

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

// Initial Load
updateSummary();
renderTransactions(transactions);
