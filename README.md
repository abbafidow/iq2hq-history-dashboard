# IQ2GQ Historical Performance Dashboard

Static GitHub Pages dashboard for searching historical IQ2GQ picks.

## What it does

- Searches historical picks by member, sport, bet name, bet type, year and odds range.
- Ranks members by success rate with a minimum pick threshold.
- Shows charts for member success, sport group success, odds band performance and year trend.
- Runs fully in the browser using `data.js`.

## GitHub Pages setup

1. Create a new GitHub repository, for example `iq2gq-history-dashboard`.
2. Upload `index.html`, `styles.css`, `app.js` and `data.js` to the repository root.
3. Go to `Settings` > `Pages`.
4. Under `Build and deployment`, choose `Deploy from a branch`.
5. Select `main` and `/root`, then save.
6. Your site will publish at `https://YOUR-USERNAME.github.io/iq2gq-history-dashboard/`.

## Updating the data

Replace `data.js` with a newly exported version when the longitudinal workbook changes.
Do not edit the dashboard code unless the fields change.

## Data caveats

This dashboard ranks historical performance. It does not predict outcomes. Use minimum pick thresholds to avoid overvaluing members with very small samples.
