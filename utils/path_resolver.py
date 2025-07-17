#!/usr/bin/env python3
"""
Path Resolver for Nexo Dashboard
Cross-platform path resolution utility for Python scripts
Part of Phase 0.6: Portability & Path Resolution
"""

import os
import sys
import json
import platform
from pathlib import Path
from typing import Dict, Optional, Union

class PathResolver:
    """
    Cross-platform path resolution utility for Nexo Dashboard
    Handles dynamic path resolution and configuration management
    """
    
    def __init__(self, config_path: Optional[str] = None):
        self.platform = platform.system().lower()
        self.config = self._load_config(config_path)
        self.project_root = self._find_project_root()
        self.paths = self._initialize_paths()
        self._ensure_directories_exist()
    
    def _load_config(self, config_path: Optional[str] = None) -> Dict:
        """Load configuration from config.json or use defaults"""
        default_config = {
            "dataPath": "./data",
            "assetsPath": "./assets",
            "logsPath": "./0_Electron_Docs_Reference/Dev_Logs",
            "iconsPath": "./assets/icons",
            "backupPath": "./data/backups"
        }
        
        # Try user-specified config first
        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    user_config = json.load(f)
                    return {**default_config, **user_config}
            except (json.JSONDecodeError, IOError) as e:
                print(f"Warning: Failed to load config from {config_path}: {e}")
        
        # Try project config.json
        try:
            project_config_path = os.path.join(self._find_project_root(), 'config.json')
            if os.path.exists(project_config_path):
                with open(project_config_path, 'r', encoding='utf-8') as f:
                    user_config = json.load(f)
                    return {**default_config, **user_config}
        except (json.JSONDecodeError, IOError) as e:
            print(f"Warning: Failed to load project config.json: {e}")
        
        return default_config
    
    def _find_project_root(self) -> str:
        """Find the project root directory"""
        # Check environment variable first
        if 'NEXO_DASHBOARD_PATH' in os.environ:
            return os.path.abspath(os.environ['NEXO_DASHBOARD_PATH'])
        
        # Search upward from current script location
        current_dir = os.path.dirname(os.path.abspath(__file__))
        while current_dir != os.path.dirname(current_dir):
            # Look for package.json or ROADMAP.md as project markers
            if (os.path.exists(os.path.join(current_dir, 'package.json')) or 
                os.path.exists(os.path.join(current_dir, 'ROADMAP.md'))):
                return current_dir
            current_dir = os.path.dirname(current_dir)
        
        # Fallback to parent directory of utils
        return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    def _resolve_path(self, relative_path: str) -> str:
        """Resolve relative path to absolute path"""
        if os.path.isabs(relative_path):
            return relative_path
        return os.path.abspath(os.path.join(self.project_root, relative_path))
    
    def _initialize_paths(self) -> Dict[str, str]:
        """Initialize all standard paths"""
        return {
            'root': self.project_root,
            'data': self._resolve_path(self.config['dataPath']),
            'assets': self._resolve_path(self.config['assetsPath']),
            'logs': self._resolve_path(self.config['logsPath']),
            'icons': self._resolve_path(self.config['iconsPath']),
            'backup': self._resolve_path(self.config['backupPath'])
        }
    
    def _ensure_directories_exist(self):
        """Ensure all required directories exist"""
        for path in self.paths.values():
            os.makedirs(path, exist_ok=True)
    
    def get_path(self, path_type: str) -> str:
        """Get path by type (root, data, assets, logs, icons, backup)"""
        if path_type not in self.paths:
            raise ValueError(f"Unknown path type: {path_type}")
        return self.paths[path_type]
    
    def get_data_file(self, filename: str) -> str:
        """Get full path for data file"""
        return os.path.join(self.paths['data'], filename)
    
    def get_assets_file(self, filename: str) -> str:
        """Get full path for assets file"""
        return os.path.join(self.paths['assets'], filename)
    
    def get_icon_file(self, filename: str) -> str:
        """Get full path for icon file"""
        return os.path.join(self.paths['icons'], filename)
    
    def get_log_file(self, filename: str) -> str:
        """Get full path for log file"""
        return os.path.join(self.paths['logs'], filename)
    
    def get_backup_file(self, filename: str) -> str:
        """Get full path for backup file"""
        return os.path.join(self.paths['backup'], filename)
    
    def get_platform_specific_path(self, path_map: Dict[str, str]) -> str:
        """Get platform-specific path from mapping"""
        return path_map.get(self.platform, path_map.get('default', ''))
    
    def is_windows(self) -> bool:
        """Check if running on Windows"""
        return self.platform == 'windows'
    
    def is_linux(self) -> bool:
        """Check if running on Linux"""
        return self.platform == 'linux'
    
    def is_macos(self) -> bool:
        """Check if running on macOS"""
        return self.platform == 'darwin'
    
    def get_system_paths(self) -> Dict[str, str]:
        """Get system-specific paths for applications and bookmarks"""
        home = os.path.expanduser('~')
        
        if self.is_windows():
            return {
                'start_menu': os.path.join(os.environ.get('PROGRAMDATA', 'C:\\ProgramData'), 
                                         'Microsoft\\Windows\\Start Menu'),
                'user_start_menu': os.path.join(os.environ.get('APPDATA', ''), 
                                              'Microsoft\\Windows\\Start Menu'),
                'program_files': os.environ.get('PROGRAMFILES', 'C:\\Program Files'),
                'user_profile': os.environ.get('USERPROFILE', home),
                'app_data': os.environ.get('APPDATA', '')
            }
        elif self.is_linux():
            return {
                'applications': '/usr/share/applications',
                'user_applications': os.path.join(home, '.local/share/applications'),
                'user_profile': home,
                'config_home': os.environ.get('XDG_CONFIG_HOME', os.path.join(home, '.config'))
            }
        elif self.is_macos():
            return {
                'applications': '/Applications',
                'user_applications': os.path.join(home, 'Applications'),
                'user_profile': home,
                'library': os.path.join(home, 'Library')
            }
        else:
            return {'user_profile': home}

# Global instance for easy access
_instance = None

def get_instance() -> PathResolver:
    """Get singleton instance of PathResolver"""
    global _instance
    if _instance is None:
        _instance = PathResolver()
    return _instance

def get_path(path_type: str) -> str:
    """Convenience function to get path"""
    return get_instance().get_path(path_type)

def get_data_file(filename: str) -> str:
    """Convenience function to get data file path"""
    return get_instance().get_data_file(filename)

def get_assets_file(filename: str) -> str:
    """Convenience function to get assets file path"""
    return get_instance().get_assets_file(filename)

def get_icon_file(filename: str) -> str:
    """Convenience function to get icon file path"""
    return get_instance().get_icon_file(filename)

def get_log_file(filename: str) -> str:
    """Convenience function to get log file path"""
    return get_instance().get_log_file(filename)

if __name__ == '__main__':
    # Test the path resolver
    resolver = PathResolver()
    
    print("Nexo Dashboard Path Resolver Test")
    print("=" * 40)
    print(f"Platform: {resolver.platform}")
    print(f"Project Root: {resolver.project_root}")
    print("\nPaths:")
    for path_type, path in resolver.paths.items():
        print(f"  {path_type}: {path}")
    
    print("\nSystem Paths:")
    for key, value in resolver.get_system_paths().items():
        print(f"  {key}: {value}")
    
    print("\nTest file paths:")
    print(f"  Data file: {resolver.get_data_file('test.json')}")
    print(f"  Icon file: {resolver.get_icon_file('test.png')}")
    print(f"  Log file: {resolver.get_log_file('test.log')}")