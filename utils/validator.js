const ComplianceValidator = (() => {
  const CA_OT = {
    dailyThreshold: 8,
    weeklyThreshold: 40,
    rate: 1.5,
    doubleTimeThreshold: 12,
    doubleTimeRate: 2.0,
    seventhDayRules: true
  };

  const CA_MEAL = {
    required: true,
    minDuration: 30,
    triggerAfterHours: 5,
    mustStartBeforeHour: 5,
    secondMealAfterHours: 10,
    waivable: true,
    penaltyPay: true
  };

  const CA_REST = {
    required: true,
    minDuration: 10,
    triggerAfterHours: 4,
    paid: true
  };

  const CA_GAP = { hours: 12, penaltyPay: true };

  function validateAll(shifts, stateCode, stateLaws, strictMode) {
    const violations = [];
    let laws = stateLaws.states[stateCode];
    if (!laws) return violations;

    if (strictMode) {
      laws = applyCaliforniaMode();
    }

    const overtimeViolations = checkOvertime(shifts, laws, strictMode);
    const mealViolations = checkMealBreaks(shifts, laws, strictMode);
    const restViolations = checkRestPeriods(shifts, laws, strictMode);
    const gapViolations = checkShiftGaps(shifts, laws, strictMode);

    violations.push(...overtimeViolations);
    violations.push(...mealViolations);
    violations.push(...restViolations);
    violations.push(...gapViolations);

    if (strictMode) {
      const extraChecks = californiaSpecificChecks(shifts, stateLaws.states['CA']);
      violations.push(...extraChecks);
    }

    return violations;
  }

  function applyCaliforniaMode() {
    return {
      overtime: CA_OT,
      mealBreak: CA_MEAL,
      restPeriod: CA_REST,
      minimumShiftGap: CA_GAP,
      maxShiftDuration: { hours: null },
      citations: {
        overtime: 'CA Labor Code § 510 & § 511',
        mealBreak: 'CA Labor Code § 512 & IWC Wage Orders',
        restPeriod: 'CA Labor Code § 226.7 & IWC Wage Orders',
        shiftGap: 'CA Labor Code § 551-552 & IWC Wage Orders'
      }
    };
  }

  function checkOvertime(shifts, laws, strictMode) {
    const violations = [];
    const ot = laws.overtime;

    const grouped = groupBy(shifts, 'employee');

    for (const [employee, empShifts] of Object.entries(grouped)) {
      const sorted = empShifts.sort((a, b) => new Date(a.date) - new Date(b.date));

      if (ot.dailyThreshold) {
        for (const s of sorted) {
          if (s.shiftHours > ot.dailyThreshold) {
            const rateText = (ot.doubleTimeThreshold && s.shiftHours > ot.doubleTimeThreshold && ot.doubleTimeRate)
              ? `${ot.doubleTimeRate}x`
              : `${ot.rate}x`;
            violations.push({
              employee: s.employee,
              date: s.date,
              type: 'Overtime (Daily)',
              detail: `Worked ${s.shiftHours}h (threshold: ${s.shiftHours > (ot.doubleTimeThreshold || 999) ? ot.doubleTimeThreshold : ot.dailyThreshold}h)`,
              severity: s.shiftHours > (ot.doubleTimeThreshold || 999) ? 'high' : 'medium',
              rate: rateText,
              citation: laws.citations.overtime,
              suggestedFix: `Reduce daily hours to ${ot.dailyThreshold}h or fewer`
            });
          }
        }
      }

      if (ot.weeklyThreshold) {
        const weeklyHours = {};
        const weeklyShifts = {};
        for (const s of sorted) {
          const d = new Date(s.date);
          const weekStart = getWeekStart(d);
          const key = `${weekStart}`;
          if (!weeklyHours[key]) { weeklyHours[key] = 0; weeklyShifts[key] = []; }
          weeklyHours[key] += s.shiftHours;
          weeklyShifts[key].push(s);
        }

        for (const [week, hours] of Object.entries(weeklyHours)) {
          if (hours > ot.weeklyThreshold) {
            const overage = hours - ot.weeklyThreshold;
            const relatedShifts = weeklyShifts[week] || [];
            for (const s of relatedShifts) {
              violations.push({
                employee: s.employee,
                date: s.date,
                type: 'Overtime (Weekly)',
                detail: `Weekly total: ${hours.toFixed(1)}h (threshold: ${ot.weeklyThreshold}h, overage: ${overage.toFixed(1)}h)`,
                severity: 'medium',
                rate: `${ot.rate}x`,
                citation: laws.citations.overtime,
                suggestedFix: `Reduce weekly hours to ${ot.weeklyThreshold}h or fewer. Consider redistributing shifts.`
              });
            }
          }
        }
      }

      if (ot.seventhDayRules && strictMode) {
        for (let i = 0; i < sorted.length; i++) {
          const s = sorted[i];
          const date = new Date(s.date);
          const seventh = new Date(date);
          seventh.setDate(seventh.getDate() + 7);
          const weekShifts = sorted.filter(e => {
            const d = new Date(e.date);
            return d >= date && d < seventh;
          });
          if (weekShifts.length >= 7) {
            violations.push({
              employee: s.employee,
              date: s.date,
              type: '7th Day (Overtime)',
              detail: `Worked 7 consecutive days. CA requires overtime for 7th consecutive day.`,
              severity: 'high',
              rate: '1.5x',
              citation: laws.citations.overtime,
              suggestedFix: 'Schedule at least one day off per 7-day period.'
            });
            break;
          }
        }
      }
    }

    return violations;
  }

  function checkMealBreaks(shifts, laws, strictMode) {
    const violations = [];
    const meal = laws.mealBreak;
    if (!meal.required) return violations;

    for (const s of shifts) {
      if (s.shiftHours > meal.triggerAfterHours) {
        if (strictMode && meal.mustStartBeforeHour) {
          violations.push({
            employee: s.employee,
            date: s.date,
            type: 'Meal Break',
            detail: `Shift of ${s.shiftHours}h requires a ${meal.minDuration}-minute meal break before hour ${meal.mustStartBeforeHour}.`,
            severity: s.shiftHours > (meal.secondMealAfterHours || 999) ? 'high' : 'medium',
            citation: laws.citations.mealBreak,
            suggestedFix: `Schedule a ${meal.minDuration}-minute uninterrupted meal break before the ${meal.mustStartBeforeHour}th hour of work.`
          });

          if (meal.secondMealAfterHours && s.shiftHours > meal.secondMealAfterHours) {
            violations.push({
              employee: s.employee,
              date: s.date,
              type: 'Second Meal Break',
              detail: `Shift of ${s.shiftHours}h requires a second ${meal.minDuration}-minute meal break.`,
              severity: 'high',
              citation: laws.citations.mealBreak,
              suggestedFix: `Schedule a second ${meal.minDuration}-minute meal break before hour ${meal.secondMealAfterHours}.`
            });
          }
        } else {
          violations.push({
            employee: s.employee,
            date: s.date,
            type: 'Meal Break',
            detail: `Shift of ${s.shiftHours}h exceeds ${meal.triggerAfterHours}h meal break threshold.`,
            severity: 'medium',
            citation: laws.citations.mealBreak,
            suggestedFix: `Provide a ${meal.minDuration}-minute meal break for shifts exceeding ${meal.triggerAfterHours}h.`
          });
        }

        if (s.breakMinutes < meal.minDuration) {
          violations.push({
            employee: s.employee,
            date: s.date,
            type: 'Insufficient Break Duration',
            detail: `Recorded break: ${s.breakMinutes}min (required: ${meal.minDuration}min minimum).`,
            severity: 'medium',
            citation: laws.citations.mealBreak,
            suggestedFix: `Increase break duration to at least ${meal.minDuration} minutes.`
          });
        }
      }
    }

    return violations;
  }

  function checkRestPeriods(shifts, laws, strictMode) {
    const violations = [];
    const rest = laws.restPeriod;
    if (!rest.required) return violations;

    for (const s of shifts) {
      if (s.shiftHours > rest.triggerAfterHours) {
        violations.push({
          employee: s.employee,
          date: s.date,
          type: 'Rest Period',
          detail: `Shift of ${s.shiftHours}h requires a ${rest.minDuration}-minute paid rest break per ${rest.triggerAfterHours}h worked.`,
          severity: 'low',
          citation: laws.citations.restPeriod,
          suggestedFix: `Provide a ${rest.minDuration}-minute paid rest break for every ${rest.triggerAfterHours}h worked.`
        });
      }
    }

    return violations;
  }

  function checkShiftGaps(shifts, laws, strictMode) {
    const violations = [];
    const gap = laws.minimumShiftGap;
    if (!gap.hours) return violations;

    const grouped = groupBy(shifts, 'employee');

    for (const [employee, empShifts] of Object.entries(grouped)) {
      const sorted = empShifts.sort((a, b) => new Date(a.date) - new Date(b.date) || a.startMinutes - b.startMinutes);

      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];

        const prevEndMinutes = prev.endMinutes;
        const currDate = new Date(curr.date);
        const prevDate = new Date(prev.date);

        const hoursBetween = (currDate - prevDate) / (1000 * 60 * 60) + (curr.startMinutes - prevEndMinutes) / 60;

        if (hoursBetween < gap.hours) {
          violations.push({
            employee,
            date: curr.date,
            type: 'Minimum Shift Gap',
            detail: `Only ${hoursBetween.toFixed(1)}h between shifts (required: ${gap.hours}h minimum).`,
            severity: 'high',
            citation: laws.citations.shiftGap,
            suggestedFix: `Ensure at least ${gap.hours}h between end of one shift and start of next.`
          });
        }
      }
    }

    return violations;
  }

  function californiaSpecificChecks(shifts, caLaws) {
    const violations = [];

    const grouped = groupBy(shifts, 'employee');
    for (const [employee, empShifts] of Object.entries(grouped)) {
      const sorted = empShifts.sort((a, b) => new Date(a.date) - new Date(b.date));

      for (const s of sorted) {
        if (s.shiftHours > 12) {
          violations.push({
            employee: s.employee,
            date: s.date,
            type: 'Maximum Shift Duration (CA)',
            detail: `Shift of ${s.shiftHours}h exceeds 12-hour maximum without DT pay.`,
            severity: 'high',
            rate: '2.0x',
            citation: 'CA Labor Code § 510',
            suggestedFix: 'Limit shifts to 12 hours or less. Apply double-time pay for hours beyond 12.'
          });
        }
      }

      if (sorted.length > 6) {
        const dates = new Set(sorted.map(s => s.date));
        if (dates.size >= 7) {
          for (const s of sorted) {
            violations.push({
              employee: s.employee,
              date: s.date,
              type: 'Day of Rest (CA)',
              detail: 'CA requires one day of rest per seven-day period.',
              severity: 'medium',
              citation: 'CA Labor Code § 551-552',
              suggestedFix: 'Provide at least one 24-hour rest period in each calendar week.'
            });
            break;
          }
        }
      }

      let totalWeekly = 0;
      for (let i = 0; i < sorted.length; i++) {
        totalWeekly += sorted[i].shiftHours;
      }
      if (totalWeekly > 55) {
        violations.push({
          employee,
          date: sorted[sorted.length - 1].date,
          type: 'Fatigue Management (CA Enhanced)',
          detail: `Weekly hours ${totalWeekly.toFixed(1)}h exceed recommended 55h threshold under CA enhanced monitoring.`,
          severity: 'low',
          citation: 'CA Industry Guidance',
          suggestedFix: 'Consider reducing weekly hours or adding additional rest days.'
        });
      }
    }

    return violations;
  }

  function groupBy(arr, key) {
    return arr.reduce((acc, item) => {
      const k = item[key];
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    }, {});
  }

  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
  }

  function generateCorrections(violations, shifts) {
    return violations.map(v => ({
      employee: v.employee,
      date: v.date,
      issue: v.type,
      suggestion: v.suggestedFix,
      severity: v.severity
    }));
  }

  return { validateAll, generateCorrections };
})();
