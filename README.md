# Compliance OS

A production-quality, fully static web application that analyzes employee shift schedules and detects labor law compliance violations across all 50 U.S. states. Designed as a professional HR and operations compliance tool that runs entirely in the browser.

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

## Screenshots

> *Screenshots to be added.*

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

### CSV Format

```csv
Employee Name,Date,Start Time,End Time,Break Duration
Jane Smith,2024-03-01,09:00,18:00,30
John Doe,2024-03-01,07:00,15:00,30
```

- Times can be in 12-hour (`09:00 AM`) or 24-hour (`09:00`) format
- Break Duration is in minutes

## Deployment (GitHub Pages)

1. Push this repository to GitHub
2. Go to **Settings > Pages**
3. Under **Branch**, select `main` and root folder `/`
4. Save — your site will be live at `https://codexfang.github.io/compliance-os`

To deploy manually:

```bash
git clone https://github.com/codexfang/compliance-os.git
cd compliance-os
git checkout -b gh-pages
git push origin gh-pages
```

Then configure GitHub Pages to serve from the `gh-pages` branch.

## Project Structure

```
compliance-os/
├── index.html          # Main UI
├── styles.css          # Responsive styling
├── app.js              # Core logic and UI controller
├── data/
│   └── labor-laws.json # 50-state labor law rules
├── utils/
│   ├── parser.js       # CSV parsing and normalization
│   ├── validator.js    # Rule engine and violation detection
│   ├── scorer.js       # Compliance scoring and grading
│   └── export.js       # CSV export and download
├── README.md
└── LICENSE
```

## License

MIT License — see [LICENSE](LICENSE).
