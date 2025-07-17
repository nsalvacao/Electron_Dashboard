const DataValidator = require('./validate_data.js');
const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join('C:', 'GitHub', 'Nexo_Dashboard', 'data');
const LOG_DIR = path.join('C:', 'GitHub', 'Nexo_Dashboard', '0_Electron_Docs_Reference', 'Dev_Logs');

async function runValidationTests() {
    console.log('--- Initializing Data Validation Tests ---');
    const validator = new DataValidator();

    // --- Load Existing Data ---
    let appsData = [];
    let bookmarksData = [];
    let customAppsData = [];

    try {
        appsData = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'apps_startmenu.json'), 'utf8'));
        console.log('Loaded apps_startmenu.json');
    } catch (e) {
        console.warn('Could not load apps_startmenu.json. Using empty array.', e.message);
    }

    try {
        bookmarksData = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'links_web.json'), 'utf8'));
        console.log('Loaded links_web.json');
    } catch (e) {
        console.warn('Could not load links_web.json. Using empty array.', e.message);
    }

    try {
        customAppsData = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'apps_custom.json'), 'utf8'));
        console.log('Loaded apps_custom.json');
    } catch (e) {
        console.warn('Could not load apps_custom.json. Using empty array.', e.message);
    }

    // --- Test 1: Validate Existing Data (Should be mostly valid) ---
    console.log('\n--- Test 1: Validating Existing Data ---');
    let appsResult = await validator.validateApps(appsData);
    console.log('Apps Validation Report:');
    console.log(await validator.generateReport(appsResult));

    let bookmarksResult = await validator.validateBookmarks(bookmarksData);
    console.log('Bookmarks Validation Report:');
    console.log(await validator.generateReport(bookmarksResult));

    let customAppsResult = await validator.validateCustomApps(customAppsData);
    console.log('Custom Apps Validation Report:');
    console.log(await validator.generateReport(customAppsResult));

    // --- Test 2: Introduce Errors and Test Repair ---
    console.log('\n--- Test 2: Introducing Errors and Testing Repair ---');

    // Corrupt appsData: invalid path, duplicate, missing required field
    const corruptedApps = JSON.parse(JSON.stringify(appsData)); // Deep copy
    if (corruptedApps.length > 0) {
        corruptedApps[0].path = 'C:\\nonexistent\\path\\app.exe'; // Invalid path
        corruptedApps.push({ name: corruptedApps[0].name, path: corruptedApps[0].path, tags: [] }); // Duplicate
        delete corruptedApps[1].name; // Missing required field
    }

    console.log('\n--- Validating Corrupted Apps Data ---');
    let corruptedAppsResult = await validator.validateApps(corruptedApps);
    console.log(await validator.generateReport(corruptedAppsResult));

    console.log('\n--- Repairing Corrupted Apps Data ---');
    const { repairedData: repairedApps, repairReport: appsRepairReport } = await validator.repairData(corruptedApps, 'apps');
    const repairedAppsResult = await validator.validateApps(repairedApps);
    repairedAppsResult.repairReport = appsRepairReport; // Attach repair report for full context
    console.log(await validator.generateReport(repairedAppsResult));
    
    // Corrupt bookmarksData: invalid URL, duplicate
    const corruptedBookmarks = JSON.parse(JSON.stringify(bookmarksData)); // Deep copy
    if (corruptedBookmarks.length > 0) {
        corruptedBookmarks[0].url = 'invalid-url'; // Invalid URL
        corruptedBookmarks.push({ name: corruptedBookmarks[0].name, url: corruptedBookmarks[0].url, browser: corruptedBookmarks[0].browser }); // Duplicate
    }

    console.log('\n--- Validating Corrupted Bookmarks Data ---');
    let corruptedBookmarksResult = await validator.validateBookmarks(corruptedBookmarks);
    console.log(await validator.generateReport(corruptedBookmarksResult));

    console.log('\n--- Repairing Corrupted Bookmarks Data ---');
    const { repairedData: repairedBookmarks, repairReport: bookmarksRepairReport } = await validator.repairData(corruptedBookmarks, 'bookmarks');
    const repairedBookmarksResult = await validator.validateBookmarks(repairedBookmarks);
    repairedBookmarksResult.repairReport = bookmarksRepairReport; // Attach repair report
    console.log(await validator.generateReport(repairedBookmarksResult));

    // Corrupt customAppsData: invalid path, duplicate, missing required field, tags not array
    const corruptedCustomApps = JSON.parse(JSON.stringify(customAppsData)); // Deep copy
    if (corruptedCustomApps.length > 0) {
        corruptedCustomApps[0].path = 'C:\\nonexistent\\path\\custom.exe'; // Invalid path
        corruptedCustomApps.push({ name: corruptedCustomApps[0].name, path: corruptedCustomApps[0].path }); // Duplicate
        delete corruptedCustomApps[1].name; // Missing required field
        corruptedCustomApps[0].tags = "not an array"; // Tags not an array
    } else {
        // Add some dummy data if customAppsData is empty
        corruptedCustomApps.push(
            { name: "Dummy App 1", path: "C:\\Program Files\\Dummy\\dummy1.exe", tags: ["dummy"] },
            { name: "Dummy App 2", path: "C:\\nonexistent\\path\\dummy2.exe", tags: "not an array" },
            { name: "Dummy App 3", path: "C:\\Program Files\\Dummy\\dummy1.exe" } // Duplicate of dummy 1
        );
        delete corruptedCustomApps[2].name; // Missing required field
    }

    console.log('\n--- Validating Corrupted Custom Apps Data ---');
    let corruptedCustomAppsResult = await validator.validateCustomApps(corruptedCustomApps);
    console.log(await validator.generateReport(corruptedCustomAppsResult));

    console.log('\n--- Repairing Corrupted Custom Apps Data ---');
    const { repairedData: repairedCustomApps, repairReport: customAppsRepairReport } = await validator.repairData(corruptedCustomApps, 'customApps');
    const repairedCustomAppsResult = await validator.validateCustomApps(repairedCustomApps);
    repairedCustomAppsResult.repairReport = customAppsRepairReport; // Attach repair report
    console.log(await validator.generateReport(repairedCustomAppsResult));

    // --- Test 3: Backup Corrupted Data ---
    console.log('\n--- Test 3: Backing up Corrupted Data ---');
    const backupPath = await validator.backupCorrupted(corruptedApps, 'apps', LOG_DIR);
    console.log(`Backup path for corrupted apps: ${backupPath}`);

    console.log('\n--- Data Validation Tests Finished ---');
}

runValidationTests();