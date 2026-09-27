@echo off
chcp 65001 >nul
cd /d "%~dp0"
set LOG=run.log
echo === START %DATE% %TIME% === > "%LOG%" 2>&1
echo === NODE / NPM === >> "%LOG%" 2>&1
where node >> "%LOG%" 2>&1
node --version >> "%LOG%" 2>&1
where npm >> "%LOG%" 2>&1
call npm --version >> "%LOG%" 2>&1
echo === NPM INSTALL === >> "%LOG%" 2>&1
call npm install >> "%LOG%" 2>&1
echo === FILTER TEST === >> "%LOG%" 2>&1
call node src/filter.test.js >> "%LOG%" 2>&1
echo === PLAYWRIGHT CHROMIUM === >> "%LOG%" 2>&1
call npx --yes playwright install chromium >> "%LOG%" 2>&1
echo === RUN SCRAPER === >> "%LOG%" 2>&1
call node src/index.js >> "%LOG%" 2>&1
echo === DONE %DATE% %TIME% === >> "%LOG%" 2>&1
