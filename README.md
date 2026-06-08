# Compliance OS

A web application that analyzes employee shift schedules and detects labor law compliance violations across all 50 U.S. states. Designed as a professional HR and operations compliance tool that runs entirely in the browser.

## Features

- **Drag-and-Drop CSV Upload** — Import employee shift data with fields: employee name, date, start time, end time, and break duration
- **50-State Coverage** — Select any U.S. state to apply its specific labor law rules
- **Rule Engine** — Evaluates overtime thresholds, meal break requirements, rest period violations, and minimum time between shifts
- **California Mode** — Toggle stricter labor rules with advanced compliance checks (daily OT > 8h, double time > 12h, meal penalty calculations, 7th-day rules)
- **Compliance Score Dashboard** — Visual score with grade, severity breakdown, and per-type violation analysis
- **Violation Report** — Detailed table with employee, date, rule violated, state-specific citation, and severity
- **Suggested Corrections** — Actionable fixes for each violation detected
- **Export Reports** — Download violation reports (CSV), corrected schedules (CSV), and compliance summaries
- **Session Persistence** — Browser storage preserves uploaded data and settings between sessions
- **Sample Data** — Built-in sample dataset for immediate testing

## Tech Stack

- **HTML5** — Semantic markup
- **CSS3** — Responsive layout with CSS custom properties
- **JavaScript (ES6+)** — Modular architecture with IIFE modules
- **Papa Parse** — Client-side CSV parsing
- **localStorage** — Browser session persistence

## How to Use

1. Open `index.html` in a browser or deploy to GitHub Pages
2. Upload a CSV file with columns: `Employee Name`, `Date`, `Start Time`, `End Time`, `Break Duration`
3. Select a state from the dropdown to apply its labor laws
4. Toggle **California Mode** for enhanced compliance checks
5. Review the compliance score and violations report
6. Download violation reports or corrected schedules as CSV
