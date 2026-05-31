const ComplianceParser = (() => {
  function parseCSV(text) {
    const data = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
    if (data.errors.length) {
      throw new Error(`CSV parse error: ${data.errors[0].message}`);
    }
    const shifts = data.data.map((row, index) => normalizeRow(row, index));
    return shifts.filter(s => s !== null);
  }

  function normalizeRow(row, index) {
    const employee = (row['Employee Name'] || row['employee name'] || row['Employee_Name'] || row['employee_name'] || '').trim();
    const date = (row['Date'] || row['date'] || '').trim();
    const startTime = (row['Start Time'] || row['start time'] || row['Start_Time'] || row['start_time'] || row['Start'] || row['start'] || '').trim();
    const endTime = (row['End Time'] || row['end time'] || row['End_Time'] || row['end_time'] || row['End'] || row['end'] || '').trim();
    const breakStr = (row['Break Duration'] || row['break duration'] || row['Break_Duration'] || row['break_duration'] || row['Break'] || row['break'] || '0').toString().trim();

    if (!employee || !date || !startTime || !endTime) {
      return null;
    }

    const breakMinutes = parseFloat(breakStr) || 0;

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (startMinutes === null || endMinutes === null) {
      return null;
    }

    let adjustedEnd = endMinutes;
    if (adjustedEnd <= startMinutes) {
      adjustedEnd += 1440;
    }

    const shiftDurationMinutes = adjustedEnd - startMinutes - breakMinutes;
    const shiftDurationHours = shiftDurationMinutes / 60;

    return {
      id: `shift-${Date.now()}-${index}`,
      employee,
      date,
      startTime: minutesToTime(startMinutes),
      endTime: minutesToTime(endMinutes),
      breakMinutes,
      startMinutes,
      endMinutes: adjustedEnd,
      shiftMinutes: shiftDurationMinutes,
      shiftHours: parseFloat(shiftDurationHours.toFixed(2))
    };
  }

  function timeToMinutes(str) {
    if (!str) return null;
    str = str.trim().toLowerCase();
    let match = str.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
    if (!match) {
      match = str.match(/^(\d{1,2}):?(\d{2})?$/);
      if (!match) return null;
    }
    let hours = parseInt(match[1], 10);
    let minutes = parseInt(match[2] || '0', 10);
    const meridian = match[3] || '';

    if (meridian === 'pm' && hours < 12) hours += 12;
    if (meridian === 'am' && hours === 12) hours = 0;

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  function minutesToTime(minutes) {
    minutes = minutes % 1440;
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function generateSampleCSV() {
    const sampleData = [
      ['Employee Name', 'Date', 'Start Time', 'End Time', 'Break Duration'],
      ['Jane Smith', '2024-03-01', '09:00', '18:00', '30'],
      ['Jane Smith', '2024-03-02', '09:00', '18:30', '30'],
      ['Jane Smith', '2024-03-03', '08:00', '17:00', '15'],
      ['Jane Smith', '2024-03-04', '09:00', '18:00', '30'],
      ['Jane Smith', '2024-03-05', '09:00', '19:00', '20'],
      ['Jane Smith', '2024-03-06', '22:00', '06:00', '30'],
      ['John Doe', '2024-03-01', '07:00', '15:00', '30'],
      ['John Doe', '2024-03-02', '07:00', '15:00', '30'],
      ['John Doe', '2024-03-03', '07:00', '15:00', '30'],
      ['John Doe', '2024-03-04', '07:00', '15:00', '30'],
      ['John Doe', '2024-03-05', '07:00', '15:00', '30'],
      ['John Doe', '2024-03-06', '12:00', '20:00', '25'],
      ['Alice Johnson', '2024-03-01', '06:00', '14:00', '30'],
      ['Alice Johnson', '2024-03-02', '06:00', '14:30', '20'],
      ['Alice Johnson', '2024-03-03', '06:00', '14:00', '30'],
      ['Alice Johnson', '2024-03-04', '06:00', '12:00', '0'],
      ['Alice Johnson', '2024-03-05', '06:00', '18:00', '30'],
      ['Bob Williams', '2024-03-01', '23:00', '07:00', '30'],
      ['Bob Williams', '2024-03-02', '23:00', '07:00', '30'],
      ['Bob Williams', '2024-03-03', '23:00', '08:00', '15'],
      ['Bob Williams', '2024-03-04', '23:00', '07:00', '30'],
      ['Bob Williams', '2024-03-05', '23:00', '07:00', '0'],
      ['Bob Williams', '2024-03-06', '07:00', '16:00', '30']
    ];
    return Papa.unparse(sampleData);
  }

  return { parseCSV, generateSampleCSV, minutesToTime, timeToMinutes };
})();
