const ComplianceExport = (() => {
  function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function generateViolationCSV(violations) {
    const headers = ['Employee Name', 'Date', 'Violation Type', 'Details', 'Severity', 'Citation', 'Suggested Fix'];
    const rows = violations.map(v => [
      v.employee,
      v.date,
      v.type,
      v.detail,
      v.severity,
      v.citation,
      v.suggestedFix
    ]);
    return Papa.unparse([headers, ...rows]);
  }

  function generateCorrectedCSV(shifts, corrections) {
    const correctionMap = {};
    for (const c of corrections) {
      const key = `${c.employee}|${c.date}`;
      if (!correctionMap[key]) correctionMap[key] = [];
      correctionMap[key].push(c.suggestion);
    }

    const headers = ['Employee Name', 'Date', 'Start Time', 'End Time', 'Break Duration (min)', 'Shift Hours', 'Corrections Applied'];
    const rows = shifts.map(s => {
      const key = `${s.employee}|${s.date}`;
      const fixes = correctionMap[key] || [];
      return [
        s.employee,
        s.date,
        s.startTime,
        s.endTime,
        s.breakMinutes,
        s.shiftHours.toFixed(2),
        fixes.join('; ') || 'No correction needed'
      ];
    });

    return Papa.unparse([headers, ...rows]);
  }

  function generateSummaryCSV(shifts, scoreData, violations) {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Shifts Analyzed', shifts.length],
      ['Compliance Score (%)', scoreData.score],
      ['Grade', scoreData.grade],
      ['Label', scoreData.label],
      ['Total Violations', scoreData.violationCount],
      ['High Severity', scoreData.severityBreakdown.high],
      ['Medium Severity', scoreData.severityBreakdown.medium],
      ['Low Severity', scoreData.severityBreakdown.low],
      ['', ''],
      ['Violation Breakdown by Type', ''],
    ];
    for (const [type, count] of Object.entries(scoreData.typeBreakdown)) {
      rows.push([type, count]);
    }
    return Papa.unparse([headers, ...rows]);
  }

  function downloadViolationReport(violations) {
    const csv = generateViolationCSV(violations);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `compliance-violations-${timestamp}.csv`);
  }

  function downloadCorrectedSchedule(shifts, violations) {
    const corrections = ComplianceValidator.generateCorrections(violations, shifts);
    const csv = generateCorrectedCSV(shifts, corrections);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `corrected-schedule-${timestamp}.csv`);
  }

  function downloadSummaryReport(shifts, scoreData, violations) {
    const csv = generateSummaryCSV(shifts, scoreData, violations);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `compliance-summary-${timestamp}.csv`);
  }

  return { downloadViolationReport, downloadCorrectedSchedule, downloadSummaryReport };
})();
