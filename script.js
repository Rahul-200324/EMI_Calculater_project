/**
 * EMI Calculator - JavaScript Logic
 * 
 * Formula:
 * EMI = P × R × (1 + R)^N / ((1 + R)^N - 1)
 * Where:
 * P = Principal Loan Amount
 * R = Monthly Interest Rate = Annual Rate / 12 / 100
 * N = Total Number of Monthly Installments = Tenure in Years × 12
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Inputs & Sliders
  const loanAmountInput = document.getElementById('loanAmount');
  const loanAmountSlider = document.getElementById('loanAmountSlider');
  const amountError = document.getElementById('amountError');

  const interestRateInput = document.getElementById('interestRate');
  const interestRateSlider = document.getElementById('interestRateSlider');
  const rateError = document.getElementById('rateError');

  const loanTenureInput = document.getElementById('loanTenure');
  const loanTenureSlider = document.getElementById('loanTenureSlider');
  const tenureError = document.getElementById('tenureError');

  // DOM Elements - Action Buttons
  const calculateBtn = document.getElementById('calculateBtn');
  const resetBtn = document.getElementById('resetBtn');
  const presetButtons = document.querySelectorAll('.preset-btn');

  // DOM Elements - Results Display
  const monthlyEmiDisplay = document.getElementById('monthlyEmi');
  const principalAmountDisplay = document.getElementById('principalAmount');
  const totalInterestDisplay = document.getElementById('totalInterest');
  const totalPaymentDisplay = document.getElementById('totalPayment');

  // DOM Elements - Chart & Metrics
  const donutPrincipal = document.getElementById('donutPrincipal');
  const donutInterest = document.getElementById('donutInterest');
  const donutRatioText = document.getElementById('donutRatioText');
  const principalPercentText = document.getElementById('principalPercent');
  const interestPercentText = document.getElementById('interestPercent');

  // DOM Elements - Amortization Schedule
  const scheduleTableBody = document.getElementById('scheduleTableBody');
  const scheduleCountBadge = document.getElementById('scheduleCountBadge');
  const toggleScheduleBtn = document.getElementById('toggleScheduleBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  // State
  let currentScheduleData = [];
  let isScheduleExpanded = false;
  const INITIAL_ROW_COUNT = 6;

  // Loan presets configuration
  const presets = {
    home: { amount: 3000000, rate: 8.5, tenure: 20 },
    car: { amount: 800000, rate: 9.0, tenure: 5 },
    personal: { amount: 300000, rate: 12.0, tenure: 3 },
    education: { amount: 1500000, rate: 9.5, tenure: 7 }
  };

  /**
   * Format numbers to Indian Rupee currency standard (e.g. ₹ 5,00,000)
   */
  function formatINR(number) {
    if (isNaN(number) || number === null) return '₹ 0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Math.round(number));
  }

  /**
   * Update slider track background styling to show progress fill
   */
  function updateSliderFill(slider) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const percentage = ((val - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`;
  }

  /**
   * Synchronize input field and range slider
   */
  function setupSync(input, slider, errorElem, validator) {
    // When slider changes -> update input
    slider.addEventListener('input', () => {
      input.value = slider.value;
      updateSliderFill(slider);
      validator();
      calculateEMI();
    });

    // When input changes -> update slider
    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      if (!isNaN(val)) {
        slider.value = val;
        updateSliderFill(slider);
      }
      validator();
      calculateEMI();
    });

    // When input loses focus -> validate
    input.addEventListener('blur', () => {
      validator();
    });
  }

  /**
   * Validation Functions
   */
  function validateAmount() {
    const val = parseFloat(loanAmountInput.value);
    if (isNaN(val) || val <= 0) {
      amountError.textContent = 'Please enter a valid loan amount greater than ₹0';
      amountError.classList.add('visible');
      loanAmountInput.classList.add('input-error');
      return false;
    }
    amountError.classList.remove('visible');
    loanAmountInput.classList.remove('input-error');
    return true;
  }

  function validateRate() {
    const val = parseFloat(interestRateInput.value);
    if (isNaN(val) || val < 0) {
      rateError.textContent = 'Interest rate cannot be negative';
      rateError.classList.add('visible');
      interestRateInput.classList.add('input-error');
      return false;
    }
    if (val > 50) {
      rateError.textContent = 'Interest rate cannot exceed 50%';
      rateError.classList.add('visible');
      interestRateInput.classList.add('input-error');
      return false;
    }
    rateError.classList.remove('visible');
    interestRateInput.classList.remove('input-error');
    return true;
  }

  function validateTenure() {
    const val = parseFloat(loanTenureInput.value);
    if (isNaN(val) || val <= 0) {
      tenureError.textContent = 'Loan tenure must be at least 1 year';
      tenureError.classList.add('visible');
      loanTenureInput.classList.add('input-error');
      return false;
    }
    if (val > 40) {
      tenureError.textContent = 'Loan tenure cannot exceed 40 years';
      tenureError.classList.add('visible');
      loanTenureInput.classList.add('input-error');
      return false;
    }
    tenureError.classList.remove('visible');
    loanTenureInput.classList.remove('input-error');
    return true;
  }

  function validateAll() {
    const isAmountValid = validateAmount();
    const isRateValid = validateRate();
    const isTenureValid = validateTenure();
    return isAmountValid && isRateValid && isTenureValid;
  }

  /**
   * Main EMI Calculation Engine
   */
  function calculateEMI() {
    if (!validateAll()) {
      return;
    }

    const principal = parseFloat(loanAmountInput.value);
    const annualRate = parseFloat(interestRateInput.value);
    const tenureYears = parseFloat(loanTenureInput.value);

    // Monthly interest rate R
    const monthlyRate = (annualRate / 12) / 100;
    // Total installments N
    const totalMonths = Math.round(tenureYears * 12);

    let monthlyEMI = 0;

    if (monthlyRate === 0) {
      // 0% interest edge case
      monthlyEMI = principal / totalMonths;
    } else {
      // EMI = P × R × (1 + R)^N / ((1 + R)^N - 1)
      const factor = Math.pow(1 + monthlyRate, totalMonths);
      monthlyEMI = (principal * monthlyRate * factor) / (factor - 1);
    }

    const totalPayment = monthlyEMI * totalMonths;
    const totalInterest = totalPayment - principal;

    // Update Result Cards
    monthlyEmiDisplay.textContent = formatINR(monthlyEMI);
    principalAmountDisplay.textContent = formatINR(principal);
    totalInterestDisplay.textContent = formatINR(totalInterest);
    totalPaymentDisplay.textContent = formatINR(totalPayment);

    // Calculate Percentages for donut chart & badges
    const principalPct = totalPayment > 0 ? (principal / totalPayment) * 100 : 100;
    const interestPct = totalPayment > 0 ? (totalInterest / totalPayment) * 100 : 0;

    principalPercentText.textContent = `${principalPct.toFixed(1)}%`;
    interestPercentText.textContent = `${interestPct.toFixed(1)}%`;
    donutRatioText.textContent = `${Math.round(principalPct)} : ${Math.round(interestPct)}`;

    // Update SVG Donut Chart
    updateDonutChart(principalPct, interestPct);

    // Generate Amortization Schedule Data
    generateAmortizationSchedule(principal, monthlyRate, totalMonths, monthlyEMI);
    renderScheduleTable();
  }

  /**
   * Updates SVG Donut chart segments based on percentages
   */
  function updateDonutChart(principalPct, interestPct) {
    // Circle circumference with r=40 is 2 * PI * 40 = 251.327
    const circumference = 2 * Math.PI * 40;
    const principalLength = (principalPct / 100) * circumference;
    const interestLength = (interestPct / 100) * circumference;

    donutPrincipal.style.strokeDasharray = `${principalLength} ${circumference}`;
    donutInterest.style.strokeDasharray = `${interestLength} ${circumference}`;
    donutInterest.style.strokeDashoffset = `-${principalLength}`;
  }

  /**
   * Generates Month-by-Month Amortization Schedule
   */
  function generateAmortizationSchedule(principal, monthlyRate, totalMonths, emi) {
    currentScheduleData = [];
    let balance = principal;

    for (let month = 1; month <= totalMonths; month++) {
      const interestPaid = balance * monthlyRate;
      let principalPaid = emi - interestPaid;
      
      // For the final month, handle rounding adjustment
      if (month === totalMonths || principalPaid > balance) {
        principalPaid = balance;
        balance = 0;
      } else {
        balance -= principalPaid;
      }

      const totalPaidSoFar = principal - balance;
      const progressPct = ((totalPaidSoFar / principal) * 100).toFixed(1);

      currentScheduleData.push({
        month,
        emi: Math.round(emi),
        principalPaid: Math.round(principalPaid),
        interestPaid: Math.round(interestPaid),
        balance: Math.max(0, Math.round(balance)),
        progress: Math.min(100, Math.max(0, parseFloat(progressPct)))
      });
    }

    scheduleCountBadge.textContent = `${totalMonths} Months (${(totalMonths / 12).toFixed(1)} Years)`;
  }

  /**
   * Renders Amortization Schedule Table rows
   */
  function renderScheduleTable() {
    scheduleTableBody.innerHTML = '';

    const rowsToShow = isScheduleExpanded ? currentScheduleData.length : Math.min(INITIAL_ROW_COUNT, currentScheduleData.length);

    for (let i = 0; i < rowsToShow; i++) {
      const row = currentScheduleData[i];
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="month-col">Month ${row.month}</td>
        <td>${formatINR(row.emi)}</td>
        <td class="principal-col">${formatINR(row.principalPaid)}</td>
        <td class="interest-col">${formatINR(row.interestPaid)}</td>
        <td>${formatINR(row.balance)}</td>
        <td>
          <div class="progress-cell">
            <div class="table-progress-bar">
              <div class="table-progress-fill" style="width: ${row.progress}%"></div>
            </div>
            <span>${row.progress}%</span>
          </div>
        </td>
      `;
      scheduleTableBody.appendChild(tr);
    }

    // Toggle button state
    if (currentScheduleData.length <= INITIAL_ROW_COUNT) {
      toggleScheduleBtn.style.display = 'none';
    } else {
      toggleScheduleBtn.style.display = 'inline-flex';
      if (isScheduleExpanded) {
        toggleScheduleBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
          Show Less (First ${INITIAL_ROW_COUNT} Months)
        `;
      } else {
        toggleScheduleBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          View Complete Schedule (${currentScheduleData.length} Months)
        `;
      }
    }
  }

  /**
   * Export Amortization Schedule to CSV File
   */
  function exportScheduleToCSV() {
    if (!currentScheduleData || currentScheduleData.length === 0) return;

    const headers = ['Month', 'Monthly EMI (INR)', 'Principal Paid (INR)', 'Interest Paid (INR)', 'Remaining Balance (INR)', 'Loan Repaid (%)'];
    const csvRows = [headers.join(',')];

    currentScheduleData.forEach(row => {
      csvRows.push([
        row.month,
        row.emi,
        row.principalPaid,
        row.interestPaid,
        row.balance,
        `${row.progress}%`
      ].join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `EMI_Amortization_Schedule_${loanTenureInput.value}Years.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Reset form to default prompt values (₹5,00,000, 8.5%, 5 years)
   */
  function resetCalculator() {
    loanAmountInput.value = 500000;
    loanAmountSlider.value = 500000;

    interestRateInput.value = 8.5;
    interestRateSlider.value = 8.5;

    loanTenureInput.value = 5;
    loanTenureSlider.value = 5;

    // Reset error classes
    amountError.classList.remove('visible');
    rateError.classList.remove('visible');
    tenureError.classList.remove('visible');
    loanAmountInput.classList.remove('input-error');
    interestRateInput.classList.remove('input-error');
    loanTenureInput.classList.remove('input-error');

    // Reset preset buttons highlight
    presetButtons.forEach(btn => btn.classList.remove('active'));

    // Update slider fills
    updateSliderFill(loanAmountSlider);
    updateSliderFill(interestRateSlider);
    updateSliderFill(loanTenureSlider);

    isScheduleExpanded = false;
    calculateEMI();
  }

  /**
   * Event Listeners setup
   */
  // Synchronize inputs with sliders
  setupSync(loanAmountInput, loanAmountSlider, amountError, validateAmount);
  setupSync(interestRateInput, interestRateSlider, rateError, validateRate);
  setupSync(loanTenureInput, loanTenureSlider, tenureError, validateTenure);

  // Calculate Button
  calculateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    calculateEMI();
    // Smooth scroll to results on small screens
    if (window.innerWidth < 768) {
      document.querySelector('.results-card').scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Reset Button
  resetBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetCalculator();
  });

  // Preset Buttons
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.preset;
      if (presets[type]) {
        presetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const p = presets[type];
        loanAmountInput.value = p.amount;
        loanAmountSlider.value = p.amount;
        interestRateInput.value = p.rate;
        interestRateSlider.value = p.rate;
        loanTenureInput.value = p.tenure;
        loanTenureSlider.value = p.tenure;

        updateSliderFill(loanAmountSlider);
        updateSliderFill(interestRateSlider);
        updateSliderFill(loanTenureSlider);

        calculateEMI();
      }
    });
  });

  // Toggle Amortization Schedule
  toggleScheduleBtn.addEventListener('click', () => {
    isScheduleExpanded = !isScheduleExpanded;
    renderScheduleTable();
  });

  // Export CSV
  exportCsvBtn.addEventListener('click', exportScheduleToCSV);

  // Initialize Default State
  resetCalculator();
});
