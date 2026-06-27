# IQ2GQ Intelligence Centre - Google Sheets live version

This version reads from the published Google Sheets CSV feed instead of data.js.

## Files to upload to GitHub

Upload or replace these files at the top level of the repository:

- index.html
- styles.css
- app.js
- README.md

The website no longer needs data.js. You can leave the old data.js file in GitHub, but it is not used if index.html has been replaced.

## Google Sheet source

The live CSV source is set inside app.js as GOOGLE_SHEET_CSV_URL.

## Updating data

Add new rows to Raw_History or Raw_Live. Website_Data should combine both tabs. Because the website reads Website_Data, the site updates after the published Google Sheet refreshes. Google can cache published CSV feeds for a few minutes.

## Refreshing

After changing the sheet or GitHub files, wait 2-5 minutes and press Ctrl + Shift + R on the website.
