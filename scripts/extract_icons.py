

import os
import sys
import requests
from PIL import Image
import hashlib
import json
import datetime
import struct

# Add utils directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'utils'))

try:
    from path_resolver import PathResolver
    HAS_PATH_RESOLVER = True
except ImportError:
    HAS_PATH_RESOLVER = False
    print("Warning: PathResolver not found, using fallback paths")

# Platform-specific imports
try:
    import win32gui
    import win32ui
    import win32con
    import win32api
    import pefile
    HAS_WIN32 = True
except ImportError:
    HAS_WIN32 = False
    print("Warning: win32 modules not available, some functionality will be limited")

class IconExtractor:
    def __init__(self, assets_path=None, log_path=None):
        if HAS_PATH_RESOLVER:
            self.path_resolver = PathResolver()
            self.assets_path = assets_path or self.path_resolver.get_path('icons')
            self.log_path = log_path or self.path_resolver.get_path('logs')
        else:
            # Fallback to relative paths
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self.assets_path = assets_path or os.path.join(project_root, 'assets', 'icons')
            self.log_path = log_path or os.path.join(project_root, '0_Electron_Docs_Reference', 'Dev_Logs')
        
        os.makedirs(self.assets_path, exist_ok=True)
        os.makedirs(self.log_path, exist_ok=True)
        
        self.cache_path = os.path.join(self.assets_path, 'icon_cache.json')
        self.icon_cache = self._load_cache()
        self._setup_logging()

    def _setup_logging(self):
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        self.log_file = os.path.join(self.log_path, f'gemini_icon_extractor_{timestamp}.md')
        # Initial log entry will be written by the calling script

    def _log(self, message):
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(f'\n{message}')

    def _load_cache(self):
        if os.path.exists(self.cache_path):
            with open(self.cache_path, 'r') as f:
                return json.load(f)
        return {}

    def _save_cache(self):
        with open(self.cache_path, 'w') as f:
            json.dump(self.icon_cache, f, indent=4)

    def get_cached_icon(self, identifier):
        return self.icon_cache.get(identifier)

    def _get_identifier(self, source_path):
        return hashlib.md5(source_path.encode('utf-8')).hexdigest()

    def extract_app_icon(self, exe_path, app_name):
        self._log(f'### Action: extract_app_icon(\n- exe_path: `{exe_path}`\n- app_name: `{app_name}`\n)')
        identifier = self._get_identifier(exe_path)
        cached = self.get_cached_icon(identifier)
        if cached:
            self._log('- Result: Cache hit. Using cached icon.')
            return cached

        output_dir = os.path.join(self.assets_path, 'apps')
        os.makedirs(output_dir, exist_ok=True)
        
        if not HAS_WIN32:
            self._log('- Result: win32 modules not available, using fallback icon.')
            return self.generate_fallback_icon(app_name, 'app')
        
        try:
            large, small = win32gui.ExtractIconEx(exe_path, 0)
            if not large:
                raise Exception("No icons found in executable")

            hicon = large[0]
            for icon in small:
                win32gui.DestroyIcon(icon)

            info = win32gui.GetIconInfo(hicon)
            bmp = info[3]
            hdc = win32ui.CreateDCFromHandle(win32gui.GetDC(0))
            mem_dc = hdc.CreateCompatibleDC()
            bitmap = win32ui.CreateBitmap()
            bitmap.CreateCompatibleBitmap(hdc, info[1], info[2])
            mem_dc.SelectObject(bitmap)
            mem_dc.DrawIcon((0, 0), hicon)
            
            bmp_info = bitmap.GetInfo()
            bmp_str = bitmap.GetBitmapBits(True)
            
            img = Image.frombuffer(
                "RGBA",
                (bmp_info['bmWidth'], bmp_info['bmHeight']),
                bmp_str, 'raw', 'BGRA', 0, 1
            )

            # Save in multiple sizes
            sizes = [32, 64]
            saved_paths = {}
            for size in sizes:
                img.thumbnail((size, size))
                png_path = os.path.join(output_dir, f'{app_name}_{size}x{size}.png')
                img.save(png_path, 'PNG')
                saved_paths[f'{size}x{size}'] = png_path

            self.icon_cache[identifier] = {'path': saved_paths, 'source': exe_path, 'type': 'app'}
            self._save_cache()
            self._log(f'- Result: Success. Icon extracted and saved to `{saved_paths}`.')
            return saved_paths

        except Exception as e:
            self._log(f'- Result: Error extracting icon: {e}')
            return self.generate_fallback_icon(app_name, 'app')
        finally:
            if 'hicon' in locals() and hicon:
                win32gui.DestroyIcon(hicon)
            if 'mem_dc' in locals():
                mem_dc.DeleteDC()
            if 'hdc' in locals():
                hdc.DeleteDC()

    def extract_favicon(self, url, site_name):
        self._log(f'### Action: extract_favicon(\n- url: `{url}`\n- site_name: `{site_name}`\n)')
        identifier = self._get_identifier(url)
        cached = self.get_cached_icon(identifier)
        if cached:
            self._log('- Result: Cache hit. Using cached icon.')
            return cached

        output_dir = os.path.join(self.assets_path, 'bookmarks')
        os.makedirs(output_dir, exist_ok=True)

        try:
            # Try to get favicon from Google's service
            favicon_url = f'https://www.google.com/s2/favicons?domain={url}&sz=64'
            response = requests.get(favicon_url, timeout=10)
            response.raise_for_status()

            png_path = os.path.join(output_dir, f'{site_name}.png')
            with open(png_path, 'wb') as f:
                f.write(response.content)
            
            # Resize to standard sizes
            img = Image.open(png_path)
            sizes = [32, 64]
            saved_paths = {}
            for size in sizes:
                img.thumbnail((size, size))
                sized_png_path = os.path.join(output_dir, f'{site_name}_{size}x{size}.png')
                img.save(sized_png_path, 'PNG')
                saved_paths[f'{size}x{size}'] = sized_png_path
            
            os.remove(png_path) # remove original download

            self.icon_cache[identifier] = {'path': saved_paths, 'source': url, 'type': 'bookmark'}
            self._save_cache()
            self._log(f'- Result: Success. Favicon downloaded and saved to `{saved_paths}`.')
            return saved_paths

        except Exception as e:
            self._log(f'- Result: Error downloading favicon: {e}')
            return self.generate_fallback_icon(site_name, 'bookmark')

    def generate_fallback_icon(self, name, category):
        self._log(f'### Action: generate_fallback_icon(\n- name: `{name}`\n- category: `{category}`\n)')
        output_dir = os.path.join(self.assets_path, f'{category}s')
        fallback_path = os.path.join(output_dir, f'default_{category}.png')
        
        if not os.path.exists(fallback_path):
            img = Image.new('RGB', (64, 64), color = 'red') # Simple red square
            img.save(fallback_path, 'PNG')
            self._log(f'- Result: Created default fallback icon at `{fallback_path}`.')

        return {'path': {'64x64': fallback_path}, 'source': 'fallback', 'type': category}

    def process_icon_batch(self, item_list):
        self._log('### Action: process_icon_batch')
        results = []
        for item in item_list:
            if item['type'] == 'app':
                result = self.extract_app_icon(item['path'], item['name'])
                results.append(result)
            elif item['type'] == 'bookmark':
                result = self.extract_favicon(item['url'], item['name'])
                results.append(result)
        self._log('- Result: Batch processing complete.')
        return results

    def cleanup_unused_icons(self):
        self._log('### Action: cleanup_unused_icons')
        # This is a placeholder for more complex logic
        self._log('- Result: Cleanup logic not implemented in this version.')
        pass

if __name__ == '__main__':
    # Example Usage
    extractor = IconExtractor()

    # Initial log entry
    prompt_text = r"""
# Nexo Dashboard - Phase 0.5 Agent Prompts

**Project:** Nexo Dashboard  
**Phase:** 0.5 - Data Infrastructure  
**Priority:** CRITICAL  
**Generated:** 2025-07-16  
**Maintainer:** Nexo (Claude)

---

## Context Overview

O Nexo Dashboard é uma aplicação Electron cross-platform para gestão centralizada de aplicações, scripts e bookmarks web. Estamos na **Phase 0.5** que é **crítica** porque estabelece a infraestrutura de dados necessária para todas as fases seguintes.

### Estrutura do Projeto
```
D:\GitHub\Nexo_Dashboard\
├── data/                      # JSON configs (apps e links)
├── scripts/                   # Scripts utilitários
├── src/                       # Código fonte Electron
└── 0_Electron_Docs_Reference/ # Documentação e logs
```

### Dados Existentes
- `data/apps_startmenu.json`: A popular com atalhos das aplicações do Start Menu (após script)
- `data/apps_custom.json`: Template para apps customizadas
- `data/links_web.json`: Vazio, precisa de ser populado

--;  ## PROMPT 5: Icon Extraction Utility

### Objetivo
Desenvolver utilitário para extrair, processar e gerir ícones de aplicações e bookmarks para interface visualmente rica.

### Especificações Técnicas
- **Linguagem:** Python 3.8+ com PIL/Pillow
- **Localização:** Dynamic path resolution
- **Output:** `assets/icons/` directory
- **Formatos:** PNG, ICO, SVG

### Funcionalidades Core
1. **App Icon Extraction:** Extrair ícones de executáveis
2. **Favicon Processing:** Download e processamento de favicons
3. **Icon Caching:** Sistema de cache inteligente
4. **Format Conversion:** Converter para formatos web
5. **Fallback Icons:** Ícones default para casos sem ícone

### Estrutura de Output
```
assets/icons/
├── apps/
│   ├── chrome.png
│   ├── notepad.png
│   └── default_app.png
├── bookmarks/
│   ├── github.png
│   ├── google.png
│   └── default_bookmark.png
└── categories/
    ├── development.png
    ├── productivity.png
    └── utilities.png
```

### Requisitos Específicos
1. **Multi-format Support:** ICO, PNG, SVG, EXE icons
2. **Size Optimization:** Redimensionar para 32x32, 64x64
3. **Fallback System:** Ícones default para apps sem ícone
4. **Caching:** Evitar re-processar ícones existentes
5. **Batch Processing:** Processar múltiplos ícones eficientemente

### Icon Processing Pipeline
```python
def process_icon(source_path, app_name, icon_type):
    # 1. Extract icon from source
    # 2. Convert to PNG if needed
    # 3. Resize to standard sizes
    # 4. Optimize for web
    # 5. Save to assets/icons/
    # 6. Update icon cache
    # 7. Return icon metadata
```

### Favicon Handling
- Download favicons de URLs
- Processar multiple resoluções
- Fallback para domain-based icons
- Cache local para performance

### API Interface
```python
class IconExtractor:
    def extract_app_icon(exe_path, app_name)
    def extract_favicon(url, site_name)
    def process_icon_batch(icon_list)
    def get_cached_icon(identifier)
    def generate_fallback_icon(name, category)
    def cleanup_unused_icons()
```

### Exemplo de Uso
```python
extractor = IconExtractor()

# Extract app icon
icon_path = extractor.extract_app_icon("C:/Program Files/Chrome/chrome.exe", "chrome")

# Extract favicon
favicon_path = extractor.extract_favicon("https://github.com", "github")

# Batch processing
icons = extractor.process_icon_batch(app_list)
```

### Logging e Output
Gera um ficheiro de output no diretório de logs com o registo de:
- a) o prompt que te dei,
- b) output do teu raciocínio,
- c) as tuas respostas para mim,
- d) e as tuas ações, tecnicamente detalhadas.

O ficheiro deverá ter o nome `{agente}_icon_extractor_{timestamp}.md`

No final, executa, testa, corrige o que for necessário até teres evidências de que executa sem qualquer problema e respeitando os requisitos acima.

---
    """
    with open(extractor.log_file, 'w', encoding='utf-8') as f:
        f.write("## Gemini's Reasoning Output\n\n")
        f.write("Este é o log de execução do script de extração de ícones.\n")
        f.write(f"Timestamp: {datetime.datetime.now()}\n\n")
        f.write("--- \n")
        f.write("### Initial Prompt\n")
        f.write(prompt_text)
        f.write("\n--- \n")


    print("--- Testing App Icon Extraction ---")
    # Note: Using a common windows executable, as chrome path might vary.
    icon_path = extractor.extract_app_icon("C:\\Windows\\System32\\notepad.exe", "notepad")
    print(f"Icon path for notepad: {icon_path}")

    print("\n--- Testing Favicon Extraction ---")
    favicon_path = extractor.extract_favicon("https://www.github.com", "github")
    print(f"Favicon path for github: {favicon_path}")

    print("\n--- Testing Fallback Icon ---")
    fallback = extractor.generate_fallback_icon("non_existent_app", "app")
    print(f"Fallback icon: {fallback}")

    print("\n--- Testing Batch Processing ---")
    app_list = [
        {'type': 'app', 'path': 'C:\\Windows\\System32\\calc.exe', 'name': 'calculator'},
        {'type': 'bookmark', 'url': 'https://www.google.com', 'name': 'google'}
    ]
    icons = extractor.process_icon_batch(app_list)
    print(f"Batch processing results: {icons}")
    
    print(f"\nLog file created at: {extractor.log_file}")

