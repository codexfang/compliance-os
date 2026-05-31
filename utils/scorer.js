const ComplianceScorer = (() => {
  function calculateScore(shifts, violations) {
    if (!shifts.length) {
      return { score: 100, compliantCount: 0, violationCount: 0, totalChecks: 0, label: 'No Data', grade: 'N/A' };
    }

    const totalChecks = shifts.length * 4;
    const uniqueViolations = deduplicateViolations(violations);
    const violationCount = uniqueViolations.length;
    const compliantCount = Math.max(0, totalChecks - violationCount);
    const rawScore = totalChecks > 0 ? (compliantCount / totalChecks) * 100 : 100;
    const score = Math.round(rawScore * 10) / 10;

    let grade;
    let label;
    if (score >= 98) { grade = 'A+'; label = 'Excellent'; }
    else if (score >= 93) { grade = 'A'; label = 'Strong'; }
    else if (score >= 87) { grade = 'B+'; label = 'Good'; }
    else if (score >= 80) { grade = 'B'; label = 'Adequate'; }
    else if (score >= 70) { grade = 'C'; label = 'Needs Improvement'; }
    else if (score >= 60) { grade = 'D'; label = 'At Risk'; }
    else { grade = 'F'; label = 'Critical'; }

    const severityBreakdown = {
      high: uniqueViolations.filter(v => v.severity === 'high').length,
      medium: uniqueViolations.filter(v => v.severity === 'medium').length,
      low: uniqueViolations.filter(v => v.severity === 'low').length
    };

    const typeBreakdown = {};
    for (const v of uniqueViolations) {
      typeBreakdown[v.type] = (typeBreakdown[v.type] || 0) + 1;
    }

    return {
      score,
      compliantCount,
      violationCount,
      totalChecks,
      grade,
      label,
      severityBreakdown,
      typeBreakdown,
      uniqueViolations
    };
  }

  function deduplicateViolations(violations) {
    const seen = new Set();
    return violations.filter(v => {
      const key = `${v.employee}|${v.date}|${v.type}|${v.detail}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return { calculateScore };
})();
