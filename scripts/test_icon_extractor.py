import os
import json
import sys
import logging
from datetime import datetime
from extract_icons import IconExtractor

# Configure logging for the test script
LOG_FILE = os.path.join('C:', 'GitHub', 'Nexo_Dashboard', '0_Electron_Docs_Reference', 'Dev_Logs', f'nexo_icon_extractor_test_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
logging.basicConfig(level=logging.INFO, format='[%(asctime)s] [%(levelname)s] - %(message)s', handlers=[
    logging.FileHandler(LOG_FILE),
    logging.StreamHandler(sys.stdout)
])

# --- CONFIGURATION ---
DATA_DIR = os.path.join('C:', 'GitHub', 'Nexo_Dashboard', 'data')

async def run_icon_extraction_tests():
    logging.info('--- Initializing Icon Extraction Tests ---')
    extractor = IconExtractor()

    # Load existing data
    apps_data = []
    bookmarks_data = []

    try:
        with open(os.path.join(DATA_DIR, 'apps_startmenu.json'), 'r', encoding='utf-8') as f:
            apps_data = json.load(f)
        logging.info('Loaded apps_startmenu.json')
    except Exception as e:
        logging.warning(f'Could not load apps_startmenu.json: {e}')

    try:
        with open(os.path.join(DATA_DIR, 'links_web.json'), 'r', encoding='utf-8') as f:
            bookmarks_data = json.load(f)
        logging.info('Loaded links_web.json')
    except Exception as e:
        logging.warning(f'Could not load links_web.json: {e}')

    # --- Test 1: Batch Processing Apps ---
    logging.info('\n--- Test 1: Batch Processing Apps ---')
    processed_apps = extractor.process_icon_batch(apps_data, 'app')
    logging.info(f'Processed {len(processed_apps)} app icons.')

    # Verify some icons were created
    if processed_apps:
        logging.info(f"Example processed app icon: {processed_apps[0]}")
    else:
        logging.warning("No app icons were processed.")

    # --- Test 2: Batch Processing Bookmarks ---
    logging.info('\n--- Test 2: Batch Processing Bookmarks ---')
    processed_bookmarks = extractor.process_icon_batch(bookmarks_data, 'bookmark')
    logging.info(f'Processed {len(processed_bookmarks)} bookmark favicons.')

    if processed_bookmarks:
        logging.info(f"Example processed bookmark favicon: {processed_bookmarks[0]}")
    else:
        logging.warning("No bookmark favicons were processed.")

    # --- Test 3: Fallback Icon Generation ---
    logging.info('\n--- Test 3: Fallback Icon Generation ---')
    fallback_app_icon = extractor.generate_fallback_icon("NonExistentApp", 'app')
    logging.info(f"Generated fallback app icon: {fallback_app_icon}")

    fallback_bookmark_icon = extractor.generate_fallback_icon("NonExistentBookmark", 'bookmark')
    logging.info(f"Generated fallback bookmark icon: {fallback_bookmark_icon}")

    # --- Test 4: Caching Mechanism ---
    logging.info('\n--- Test 4: Caching Mechanism ---')
    # Re-run batch processing to check if cached icons are used
    logging.info("Re-processing apps to check cache...")
    reprocessed_apps = extractor.process_icon_batch(apps_data, 'app')
    logging.info(f'Re-processed {len(reprocessed_apps)} app icons (should use cache).')

    logging.info("Re-processing bookmarks to check cache...")
    reprocessed_bookmarks = extractor.process_icon_batch(bookmarks_data, 'bookmark')
    logging.info(f'Re-processed {len(reprocessed_bookmarks)} bookmark favicons (should use cache).')

    # Verify cache file exists
    cache_file_path = os.path.join(ASSETS_DIR, 'icon_cache.json')
    if os.path.exists(cache_file_path):
        logging.info(f"Icon cache file exists: {cache_file_path}")
    else:
        logging.error("Icon cache file does NOT exist.")

    logging.info('--- Icon Extraction Tests Finished ---')

if __name__ == "__main__":
    import asyncio
    from datetime import datetime
    # ASSETS_DIR is defined in extract_icons.py, need to import it or redefine
    ASSETS_DIR = os.path.join('C:', 'GitHub', 'Nexo_Dashboard', 'assets', 'icons')
    asyncio.run(run_icon_extraction_tests())
