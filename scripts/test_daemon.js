const RefreshDaemon = require('./refresh_daemon.js');

// This script acts as a test harness for the RefreshDaemon class.
async function testDaemon() {
    console.log('--- Initializing Daemon Test ---');
    const daemon = new RefreshDaemon();

    // Set up listeners for all events to provide evidence of functionality
    daemon.on('refreshStarted', (e) => {
        console.log(`\nEVENT: Refresh STARTED for type '${e.type}'`);
    });

    daemon.on('refreshCompleted', (e) => {
        console.log(`EVENT: Refresh COMPLETED for type '${e.type}'. Status: ${e.status}`);
    });

    daemon.on('refreshFailed', (e) => {
        console.log(`EVENT: Refresh FAILED for type '${e.type}'. Error: ${e.error}`);
    });

    daemon.on('dataChanged', (e) => {
        console.log(`EVENT: Data CHANGED for type '${e.type}'. New data at: ${e.path}`);
    });

    // Load config but don't start the cron jobs for this test
    await daemon._loadConfig();

    console.log('\n--- Forcing Start Menu Refresh ---');
    daemon.forceRefresh('startMenu');

    // Wait for the first refresh to complete before starting the next one
    await new Promise(resolve => daemon.once('refreshCompleted', resolve));

    console.log('\n--- Forcing Bookmarks Refresh ---');
    daemon.forceRefresh('bookmark');
    
    // Wait for the second refresh to complete
    await new Promise(resolve => daemon.once('refreshCompleted', resolve));

    console.log('\n--- Final Daemon Status ---');
    console.log(daemon.getStatus());
    console.log('Last Start Menu Run:', daemon.getLastRun('startMenu'));
    console.log('Last Bookmarks Run:', daemon.getLastRun('bookmark'));
    
    console.log('\n--- Daemon Test Finished ---');
}

testDaemon();
