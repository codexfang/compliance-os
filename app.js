(function() {
  const STORAGE_KEY = 'compliance_os_data';
  const STORAGE_LAWS_KEY = 'compliance_os_laws';

  let state = {
    shifts: [],
    violations: [],
    scoreData: null,
    selectedState: 'CA',
    strictMode: false,
    laws: null,
    fileName: null
  };

  const DOM = {};

  function init() {
    cacheDOM();
    loadFromStorage();
    loadLaborLaws();
    bindEvents();
    renderAll();
  }

  function cacheDOM() {
    DOM.app = document.getElementById('app');
    DOM.uploadZone = document.getElementById('uploadZone');
    DOM.fileInput = document.getElementById('fileInput');
    DOM.fileInfo = document.getElementById('fileInfo');
    DOM.sampleBtn = document.getElementById('sampleBtn');
    DOM.stateSelect = document.getElementById('stateSelect');
    DOM.strictToggle = document.getElementById('strictToggle');
    DOM.strictBanner = document.getElementById('strictBanner');
    DOM.dashboardScore = document.getElementById('dashboardScore');
    DOM.violationsContainer = document.getElementById('violationsContainer');
    DOM.exportActions = document.getElementById('exportActions');
    DOM.toastContainer = document.getElementById('toastContainer');
  }

  function loadLaborLaws() {
    try {
      const cached = localStorage.getItem(STORAGE_LAWS_KEY);
      if (cached) {
        state.laws = JSON.parse(cached);
        populateStateSelect();
        runAnalysis();
        return;
      }
    } catch (e) {}

    fetch('data/labor-laws.json')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load labor laws');
        return r.json();
      })
      .then(data => {
        state.laws = data;
        try { localStorage.setItem(STORAGE_LAWS_KEY, JSON.stringify(data)); } catch (e) {}
        populateStateSelect();
        renderAll();
        runAnalysis();
      })
      .catch(err => {
        DOM.dashboardScore.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-text">Error loading labor laws: ${err.message}. Using cached data if available.</div></div>`;
      });
  }

  function populateStateSelect() {
    if (!state.laws) return;
    const codes = Object.keys(state.laws.states);
    DOM.stateSelect.innerHTML = codes.map(code => {
      const s = state.laws.states[code];
      return `<option value="${code}" ${code === state.selectedState ? 'selected' : ''}>${s.name} (${code})</option>`;
    }).join('');
  }

  function bindEvents() {
    DOM.fileInput.addEventListener('change', handleFileUpload);
    DOM.uploadZone.addEventListener('dragover', e => { e.preventDefault(); DOM.uploadZone.classList.add('drag-over'); });
    DOM.uploadZone.addEventListener('dragleave', () => { DOM.uploadZone.classList.remove('drag-over'); });
    DOM.uploadZone.addEventListener('drop', e => {
      e.preventDefault();
      DOM.uploadZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) {
        DOM.fileInput.files = e.dataTransfer.files;
        handleFileUpload({ target: DOM.fileInput });
      }
    });
    DOM.sampleBtn.addEventListener('click', loadSampleData);
    DOM.stateSelect.addEventListener('change', e => {
      state.selectedState = e.target.value;
      saveToStorage();
      runAnalysis();
    });
    DOM.strictToggle.addEventListener('change', e => {
      state.strictMode = e.target.checked;
      DOM.app.classList.toggle('strict-mode', state.strictMode);
      saveToStorage();
      runAnalysis();
    });
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    state.fileName = file.name;
    DOM.fileInput.value = '';
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const text = evt.target.result;
        const shifts = ComplianceParser.parseCSV(text);
        if (!shifts.length) {
          showToast('No valid shift data found. CSV must have columns: Employee Name, Date, Start Time, End Time, Break Duration.', 'error');
          return;
        }
        state.shifts = shifts;
        saveToStorage();
        showToast(`Loaded ${shifts.length} shifts from ${file.name}`, 'success');
        renderAll();
        runAnalysis();
      } catch (err) {
        showToast(`Error parsing CSV: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
  }

  function loadSampleData() {
    const csv = ComplianceParser.generateSampleCSV();
    try {
      const shifts = ComplianceParser.parseCSV(csv);
      state.shifts = shifts;
      state.fileName = 'sample-data.csv';
      saveToStorage();
      showToast(`Loaded ${shifts.length} sample shifts`, 'success');
      renderAll();
      runAnalysis();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  }

  function runAnalysis() {
    if (!state.shifts.length || !state.laws) {
      state.violations = [];
      state.scoreData = ComplianceScorer.calculateScore([], []);
      renderScore();
      renderViolations();
      renderExport();
      return;
    }

    state.violations = ComplianceValidator.validateAll(
      state.shifts,
      state.selectedState,
      state.laws,
      state.strictMode
    );

    state.scoreData = ComplianceScorer.calculateScore(state.shifts, state.violations);
    renderScore();
    renderViolations();
    renderExport();
  }

  function renderAll() {
    renderUploadZone();
    renderScore();
    renderViolations();
    renderExport();
    DOM.app.classList.toggle('strict-mode', state.strictMode);
  }

  function renderUploadZone() {
    if (state.shifts.length) {
      DOM.uploadZone.classList.add('has-data');
      DOM.fileInfo.innerHTML = `<span>${state.fileName || 'Uploaded data'}</span> &middot; <strong>${state.shifts.length}</strong> shifts loaded`;
    } else {
      DOM.uploadZone.classList.remove('has-data');
      DOM.fileInfo.innerHTML = '';
    }
  }

  function renderScore() {
    const sd = state.scoreData;
    if (!sd || sd.score === 100 && !state.shifts.length) {
      DOM.dashboardScore.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-text">Upload shift data and select a state to see compliance analysis</div>
        </div>
      `;
      return;
    }

    const circumference = 2 * Math.PI * 44;
    const offset = circumference - (sd.score / 100) * circumference;
    const ringColor = sd.score >= 90 ? 'var(--color-compliant)' : sd.score >= 70 ? 'var(--color-warning)' : 'var(--color-violation)';

    const gradeClass = sd.grade ? `grade-${sd.grade.toLowerCase().startsWith('a') ? 'a' : sd.grade.toLowerCase().startsWith('b') ? 'b' : sd.grade.toLowerCase().startsWith('c') ? 'c' : sd.grade.toLowerCase().startsWith('d') ? 'd' : 'f'}` : '';

    const severityTotal = sd.severityBreakdown.high + sd.severityBreakdown.medium + sd.severityBreakdown.low;
    const highPct = severityTotal ? (sd.severityBreakdown.high / severityTotal) * 100 : 0;
    const medPct = severityTotal ? (sd.severityBreakdown.medium / severityTotal) * 100 : 0;
    const lowPct = severityTotal ? (sd.severityBreakdown.low / severityTotal) * 100 : 0;

    DOM.dashboardScore.innerHTML = `
      <div class="score-container">
        <div class="score-ring">
          <svg width="110" height="110" viewBox="0 0 110 110">
            <circle class="score-ring-bg" cx="55" cy="55" r="44"/>
            <circle class="score-ring-fill" cx="55" cy="55" r="44"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}"
              stroke="${ringColor}"/>
          </svg>
          <div class="score-ring-text">
            <span class="score-ring-number">${sd.score.toFixed(0)}%</span>
            <span class="score-ring-label">${sd.label}</span>
          </div>
        </div>
        <div class="score-details">
          <div class="score-stat">
            <span class="score-stat-value grade-badge ${gradeClass}">${sd.grade}</span>
            <span class="score-stat-label">Grade</span>
          </div>
          <div class="score-stat">
            <span class="score-stat-value compliant">${sd.compliantCount}</span>
            <span class="score-stat-label">Compliant Checks</span>
          </div>
          <div class="score-stat">
            <span class="score-stat-value violation">${sd.violationCount}</span>
            <span class="score-stat-label">Violations</span>
          </div>
          <div class="score-stat">
            <span class="score-stat-value">${sd.totalChecks}</span>
            <span class="score-stat-label">Total Checks</span>
          </div>
        </div>
      </div>
      ${severityTotal > 0 ? `
        <div class="severity-bars">
          <div class="severity-bar high" style="width:${highPct}%" title="${sd.severityBreakdown.high} high severity"></div>
          <div class="severity-bar medium" style="width:${medPct}%" title="${sd.severityBreakdown.medium} medium severity"></div>
          <div class="severity-bar low" style="width:${lowPct}%" title="${sd.severityBreakdown.low} low severity"></div>
        </div>
      ` : ''}
    `;
  }

  function renderViolations() {
    const violations = state.violations;
    if (!state.shifts.length) {
      DOM.violationsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-text">Awaiting schedule data — upload a CSV or load sample data to begin analysis</div>
        </div>
      `;
      return;
    }
    if (!violations.length) {
      DOM.violationsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <div class="empty-state-text">No violations detected. All shifts are compliant.</div>
        </div>
      `;
      return;
    }

    const rows = violations.map((v, i) => `
      <tr>
        <td><strong>${escapeHtml(v.employee)}</strong></td>
        <td>${escapeHtml(v.date)}</td>
        <td><span class="severity-badge ${v.severity}">${escapeHtml(v.type)}</span></td>
        <td class="violation-detail">${escapeHtml(v.detail)}</td>
        <td class="violation-citation">${escapeHtml(v.citation)}</td>
        <td class="suggested-fix">${escapeHtml(v.suggestedFix)}</td>
      </tr>
    `).join('');

    DOM.violationsContainer.innerHTML = `
      <div class="table-container">
        <table class="violations-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Date</th>
              <th>Violation</th>
              <th>Details</th>
              <th>Citation</th>
              <th>Suggested Fix</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="margin-top:12px;font-size:0.8125rem;color:var(--color-text-muted);">
        Showing ${violations.length} violation${violations.length !== 1 ? 's' : ''}
      </div>
    `;
  }

  function renderExport() {
    if (!state.shifts.length || !state.violations.length) {
      DOM.exportActions.innerHTML = `<span style="font-size:0.8125rem;color:var(--color-text-muted);">Upload and analyze shift data to enable exports</span>`;
      return;
    }

    DOM.exportActions.innerHTML = `
      <button class="btn btn-primary" id="exportViolations">
        <span>⬇</span> Export Violations (CSV)
      </button>
      <button class="btn btn-compliant" id="exportCorrected">
        <span>⬇</span> Export Corrected Schedule (CSV)
      </button>
      <button class="btn" id="exportSummary">
        <span>⬇</span> Export Summary (CSV)
      </button>
    `;

    document.getElementById('exportViolations').addEventListener('click', () => {
      ComplianceExport.downloadViolationReport(state.violations);
      showToast('Violation report downloaded', 'success');
    });

    document.getElementById('exportCorrected').addEventListener('click', () => {
      ComplianceExport.downloadCorrectedSchedule(state.shifts, state.violations);
      showToast('Corrected schedule downloaded', 'success');
    });

    document.getElementById('exportSummary').addEventListener('click', () => {
      ComplianceExport.downloadSummaryReport(state.shifts, state.scoreData, state.violations);
      showToast('Summary report downloaded', 'success');
    });
  }

  function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    DOM.toastContainer.appendChild(toast);
    const duration = type === 'error' ? 8000 : 3500;
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        shifts: state.shifts,
        selectedState: state.selectedState,
        strictMode: state.strictMode,
        fileName: state.fileName
      }));
    } catch (e) {}
  }

  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        state.shifts = data.shifts || [];
        state.selectedState = data.selectedState || 'CA';
        state.strictMode = data.strictMode || false;
        state.fileName = data.fileName || null;
      }
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', init);
})();
