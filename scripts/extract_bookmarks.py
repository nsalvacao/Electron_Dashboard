
import os
import sys
import json
import sqlite3
import argparse
from datetime import datetime, timedelta
import shutil
import base64
from urllib.parse import urlparse
import platform

# Add utils directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'utils'))

try:
    from path_resolver import PathResolver
    HAS_PATH_RESOLVER = True
except ImportError:
    HAS_PATH_RESOLVER = False
    print("Warning: PathResolver not found, using fallback paths")

# --- CONFIGURATION ---

def get_browser_paths():
    """Get browser paths based on platform"""
    system = platform.system().lower()
    home = os.path.expanduser('~')
    
    if system == 'windows':
        return {
            'edge': os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Bookmarks'),
            'chrome': os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\User Data\Default\Bookmarks'),
            'firefox': os.path.expandvars(r'%APPDATA%\Mozilla\Firefox\Profiles'),
            'brave': os.path.expandvars(r'%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\Bookmarks')
        }
    elif system == 'linux':
        return {
            'chrome': os.path.join(home, '.config/google-chrome/Default/Bookmarks'),
            'firefox': os.path.join(home, '.mozilla/firefox'),
            'brave': os.path.join(home, '.config/BraveSoftware/Brave-Browser/Default/Bookmarks')
        }
    elif system == 'darwin':
        return {
            'chrome': os.path.join(home, 'Library/Application Support/Google/Chrome/Default/Bookmarks'),
            'firefox': os.path.join(home, 'Library/Application Support/Firefox/Profiles'),
            'brave': os.path.join(home, 'Library/Application Support/BraveSoftware/Brave-Browser/Default/Bookmarks')
        }
    else:
        return {}

def get_favicon_paths():
    """Get favicon paths based on platform"""
    system = platform.system().lower()
    home = os.path.expanduser('~')
    
    if system == 'windows':
        return {
            'edge': os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Favicons'),
            'chrome': os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\User Data\Default\Favicons'),
            'brave': os.path.expandvars(r'%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\Favicons')
        }
    elif system == 'linux':
        return {
            'chrome': os.path.join(home, '.config/google-chrome/Default/Favicons'),
            'brave': os.path.join(home, '.config/BraveSoftware/Brave-Browser/Default/Favicons')
        }
    elif system == 'darwin':
        return {
            'chrome': os.path.join(home, 'Library/Application Support/Google/Chrome/Default/Favicons'),
            'brave': os.path.join(home, 'Library/Application Support/BraveSoftware/Brave-Browser/Default/Favicons')
        }
    else:
        return {}

def get_output_file():
    """Get output file path using PathResolver or fallback"""
    if HAS_PATH_RESOLVER:
        path_resolver = PathResolver()
        return path_resolver.get_data_file('links_web.json')
    else:
        # Fallback to relative path
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        return os.path.join(project_root, 'data', 'links_web.json')

# Initialize paths
BROWSER_PATHS = get_browser_paths()
FAVICON_PATHS = get_favicon_paths()
OUTPUT_FILE = get_output_file()

# --- HELPER FUNCTIONS ---

def convert_chrome_time(chrome_time):
    """Converts Chromium's timestamp (microseconds since 1601-01-01) to ISO 8601 format."""
    if not chrome_time or int(chrome_time) == 0:
        return None
    return (datetime(1601, 1, 1) + timedelta(microseconds=int(chrome_time))).isoformat() + 'Z'

def convert_firefox_time(firefox_time):
    """Converts Firefox's timestamp (microseconds since 1970-01-01) to ISO 8601 format."""
    if not firefox_time or int(firefox_time) == 0:
        return None
    return datetime.fromtimestamp(int(firefox_time) / 1000000).isoformat() + 'Z'

def get_favicon_base64(db_path, url):
    """Extracts a favicon from a Chromium-based browser's Favicons SQLite DB and returns it as Base64."""
    if not os.path.exists(db_path):
        return None

    try:
        # Connect to a temporary copy to avoid database lock issues
        temp_db_path = db_path + '.tmp'
        shutil.copy2(db_path, temp_db_path)
        
        conn = sqlite3.connect(temp_db_path)
        cursor = conn.cursor()

        # Query to get the favicon data
        query = """
            SELECT b.image_data
            FROM favicon_bitmaps b
            JOIN icon_mapping m ON b.icon_id = m.icon_id
            JOIN favicons f ON f.id = m.icon_id
            WHERE f.url = ?
            ORDER BY b.width DESC
            LIMIT 1
        """
        
        # For favicons, browsers often use the root URL
        parsed_url = urlparse(url)
        favicon_url = f"{parsed_url.scheme}://{parsed_url.netloc}/favicon.ico"

        cursor.execute(query, (favicon_url,))
        result = cursor.fetchone()
        
        conn.close()
        os.remove(temp_db_path)

        if result and result[0]:
            return f"data:image/png;base64,{base64.b64encode(result[0]).decode('utf-8')}"
            
    except sqlite3.Error as e:
        print(f"[WARN] Could not read favicon from {db_path}: {e}")
    
    return None

# --- PARSER FUNCTIONS ---

def parse_chromium_bookmarks(file_path, browser_name, include_favicons=False):
    """Parses a Chromium-style (JSON) bookmarks file."""
    if not os.path.exists(file_path):
        print(f"[{browser_name.upper()}] Bookmarks file not found at: {file_path}")
        return []

    print(f"[{browser_name.upper()}] Parsing bookmarks...")
    bookmarks = []
    favicon_db_path = FAVICON_PATHS.get(browser_name)

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    def recurse_nodes(node, folder_path):
        if node.get('type') == 'url':
            url = node.get('url')
            if not url or not url.startswith(('http', 'https')):
                return

            tags = list(filter(None, folder_path.split('/')))
            
            favicon = None
            if include_favicons and favicon_db_path:
                favicon = get_favicon_base64(favicon_db_path, url)

            bookmarks.append({
                'name': node.get('name'),
                'url': url,
                'category': folder_path,
                'tags': tags,
                'favicon': favicon,
                'browser': browser_name,
                'dateAdded': convert_chrome_time(node.get('date_added')),
                'lastVisited': None # Chromium doesn't store last visited in this file
            })
        elif node.get('type') == 'folder':
            current_folder = node.get('name', '')
            new_path = f"{folder_path}/{current_folder}" if folder_path else current_folder
            for child in node.get('children', []):
                recurse_nodes(child, new_path)

    for root_name, root_node in data['roots'].items():
        recurse_nodes(root_node, '')
    
    print(f"[{browser_name.upper()}] Found {len(bookmarks)} bookmarks.")
    return bookmarks

def parse_firefox_bookmarks(profiles_path, browser_name, include_favicons=False):
    """Parses a Firefox-style (SQLite) bookmarks file."""
    if not os.path.exists(profiles_path):
        print(f"[FIREFOX] Profiles directory not found at: {profiles_path}")
        return []

    # Find the main places.sqlite file
    sqlite_file = ''
    for dirpath, _, filenames in os.walk(profiles_path):
        if 'places.sqlite' in filenames:
            sqlite_file = os.path.join(dirpath, 'places.sqlite')
            break
    
    if not sqlite_file:
        print("[FIREFOX] places.sqlite file not found in any profile.")
        return []

    print(f"[FIREFOX] Parsing bookmarks from {sqlite_file}...")
    
    try:
        # Connect to a temporary copy to avoid database lock issues
        temp_db_path = sqlite_file + '.tmp'
        shutil.copy2(sqlite_file, temp_db_path)
        conn = sqlite3.connect(temp_db_path)
        cursor = conn.cursor()

        # Query to get all bookmarks with their folder paths
        query = """
            WITH RECURSIVE
              bookmark_path(id, parent, title, url, dateAdded, lastModified, path) AS (
                SELECT
                  b.id, b.parent, b.title, p.url, b.dateAdded, p.last_visit_date, b.title
                FROM moz_bookmarks AS b
                LEFT JOIN moz_places AS p ON b.fk = p.id
                WHERE b.parent = (SELECT id FROM moz_bookmarks WHERE guid = 'menu________')
                UNION ALL
                SELECT
                  b.id, b.parent, b.title, p.url, b.dateAdded, p.last_visit_date, bp.path || '/' || b.title
                FROM moz_bookmarks AS b
                JOIN bookmark_path AS bp ON b.parent = bp.id
                LEFT JOIN moz_places AS p ON b.fk = p.id
              )
            SELECT
              bp.title,
              bp.url,
              (SELECT path FROM bookmark_path WHERE id = bp.parent),
              bp.dateAdded,
              bp.lastModified,
              (SELECT fav.data FROM moz_favicons fav WHERE fav.id = (SELECT favicon_id FROM moz_places plc WHERE plc.id = bp.id))
            FROM bookmark_path bp
            WHERE bp.url IS NOT NULL;
        """
        
        cursor.execute(query)
        
        bookmarks = []
        for row in cursor.fetchall():
            name, url, category, date_added, last_visited, favicon_data = row
            if not url or not url.startswith(('http', 'https')):
                continue

            tags = list(filter(None, category.split('/'))) if category else []
            
            favicon = None
            if include_favicons and favicon_data:
                favicon = f"data:image/png;base64,{base64.b64encode(favicon_data).decode('utf-8')}"

            bookmarks.append({
                'name': name,
                'url': url,
                'category': category or '',
                'tags': tags,
                'favicon': favicon,
                'browser': browser_name,
                'dateAdded': convert_firefox_time(date_added),
                'lastVisited': convert_firefox_time(last_visited)
            })

        conn.close()
        os.remove(temp_db_path)
        print(f"[FIREFOX] Found {len(bookmarks)} bookmarks.")
        return bookmarks

    except sqlite3.Error as e:
        print(f"[FIREFOX] [ERROR] Could not read bookmarks database: {e}")
        return []


# --- MAIN LOGIC ---

def main():
    parser = argparse.ArgumentParser(description="Extract bookmarks from major web browsers.")
    parser.add_argument("--browser", help="Extract from a specific browser (edge, chrome, firefox, brave).", choices=BROWSER_PATHS.keys())
    parser.add_argument("--include-favicons", action="store_true", help="Include Base64-encoded favicons in the output.")
    parser.add_argument("--merge-existing", action="store_true", help="Merge new bookmarks with the existing links_web.json file.")
    args = parser.parse_args()

    all_bookmarks = []
    processed_urls = set()

    # If merging, load existing bookmarks first
    if args.merge_existing and os.path.exists(OUTPUT_FILE):
        print(f"Loading existing bookmarks from {OUTPUT_FILE} for merging...")
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            try:
                all_bookmarks = json.load(f)
                for bookmark in all_bookmarks:
                    processed_urls.add(bookmark['url'])
                print(f"Loaded {len(all_bookmarks)} existing bookmarks. {len(processed_urls)} unique URLs found.")
            except json.JSONDecodeError:
                print("[WARN] Existing bookmarks file is corrupted. Starting fresh.")
                all_bookmarks = []


    # Determine which browsers to scan
    browsers_to_scan = [args.browser] if args.browser else BROWSER_PATHS.keys()

    # Parse bookmarks from each browser
    for browser in browsers_to_scan:
        new_bookmarks = []
        if browser == 'firefox':
            new_bookmarks = parse_firefox_bookmarks(BROWSER_PATHS[browser], browser, args.include_favicons)
        else: # Chromium-based
            new_bookmarks = parse_chromium_bookmarks(BROWSER_PATHS[browser], browser, args.include_favicons)
        
        # Add new, unique bookmarks to the main list
        for bookmark in new_bookmarks:
            if bookmark['url'] not in processed_urls:
                all_bookmarks.append(bookmark)
                processed_urls.add(bookmark['url'])

    # Backup existing file
    if os.path.exists(OUTPUT_FILE):
        backup_path = OUTPUT_FILE + '.bak'
        print(f"Backing up existing bookmarks to {backup_path}")
        shutil.copy2(OUTPUT_FILE, backup_path)

    # Write the final unified list to the output file
    print(f"Writing a total of {len(all_bookmarks)} bookmarks to {OUTPUT_FILE}...")
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(all_bookmarks, f, indent=2, ensure_ascii=False)
        print("Extraction complete.")
    except IOError as e:
        print(f"[FATAL] Could not write to output file: {e}")

if __name__ == "__main__":
    main()
