# IQ2GQ Historical Performance Hub

Static GitHub Pages dashboard for IQ2GQ historical betting data.

## Files to upload

Upload these files to the root of your GitHub repository:

- index.html
- styles.css
- app.js
- data.js
- README.md

Do not upload the ZIP file itself.

## What the dashboard does

- Searches all historical resulted picks in the browser.
- Filters by member, year, sport group, specific sport, bet category, odds band and result.
- Ranks members using success rate, wins, $10 return, ROI or balanced score.
- Shows best sport and bet combinations.
- Shows member success charts, sport charts, odds heatmap and current form.
- Shows detailed pick search results.

## Updating the data

Replace data.js with an updated export using the same structure:

window.IQ2GQ_DATA = [...];

Keep the file name as data.js.

## Publishing on GitHub Pages

1. Create a repository.
2. Upload the files above.
3. Go to Settings - Pages.
4. Choose Deploy from a branch.
5. Select main and /(root).
6. Save.

Your site will publish at:

https://YOUR-GITHUB-NAME.github.io/REPOSITORY-NAME/
