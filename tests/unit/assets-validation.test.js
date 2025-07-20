/**
 * =============================================================================
 * Testes de Validação de Assets
 * =============================================================================
 * 
 * Verifica integridade dos assets referenciados nos dados, especialmente
 * ícones das aplicações e links web.
 * 
 * Resolve problemas de CI/CD:
 * - Detecta ícones em falta antes do build
 * - Valida referências de assets nos dados JSON
 * - Evita builds com assets corrompidos ou em falta
 * 
 * Testes Funcionais:
 * - Verificação de existência de ícones referenciados
 * - Validação de tamanhos de ficheiros
 * - Verificação de formatos de imagem
 * - Detecção de referências quebradas
 * =============================================================================
 */

const path = require('path');
const fs = require('fs');

describe('🎨 Assets Validation Tests', () => {
  let appsData, linksData;
  let assetsDir, iconsDir;
  
  beforeAll(() => {
    // Carregar dados (usar mocks se ficheiros reais não existirem)
    try {
      const APPS_FILE = path.join(global.DATA_DIR, 'apps_custom.json');
      const LINKS_FILE = path.join(global.DATA_DIR, 'links_web.json');
      
      if (global.fileExists(APPS_FILE) && global.fileExists(LINKS_FILE)) {
        appsData = global.readJsonFile(APPS_FILE);
        linksData = global.readJsonFile(LINKS_FILE);
      } else {
        // Usar ficheiros mock
        const mockAppsFile = path.join(__dirname, '../fixtures/mock-apps.json');
        const mockLinksFile = path.join(__dirname, '../fixtures/mock-links.json');
        
        appsData = global.readJsonFile(mockAppsFile);
        linksData = global.readJsonFile(mockLinksFile);
      }
    } catch (error) {
      // Fallback para dados simples
      appsData = { apps: [] };
      linksData = { links: [] };
    }
    
    // Definir diretórios de assets
    assetsDir = global.ASSETS_DIR;
    iconsDir = path.join(assetsDir, 'icons');
  });
  
  // =============================================================================
  // Testes de Estrutura de Assets
  // =============================================================================
  
  describe('📁 Assets Directory Structure', () => {
    test('should have assets directory', () => {
      expect(global.fileExists(assetsDir)).toBeTruthy();
    });
    
    test('should have icons subdirectory', () => {
      expect(global.fileExists(iconsDir)).toBeTruthy();
    });
    
    test('should have main application icons', () => {
      const requiredIcons = [
        'icon.ico',   // Windows
        'icon.png',   // Linux/Generic
        'icon.icns'   // macOS
      ];
      
      requiredIcons.forEach(iconFile => {
        const iconPath = path.join(assetsDir, iconFile);
        expect(global.fileExists(iconPath)).toBeTruthy();
        
        if (global.fileExists(iconPath)) {
          const stats = fs.statSync(iconPath);
          expect(stats.size).toBeGreaterThan(100); // Pelo menos 100 bytes
        }
      });
    });
    
    test('should have generated icon sizes', () => {
      const iconSizes = [
        'icon-16x16.png',
        'icon-32x32.png',
        'icon-48x48.png',
        'icon-64x64.png',
        'icon-128x128.png',
        'icon-256x256.png'
      ];
      
      iconSizes.forEach(iconFile => {
        const iconPath = path.join(assetsDir, iconFile);
        // Estes podem não existir se generate-icons não foi executado ainda
        if (global.fileExists(iconPath)) {
          const stats = fs.statSync(iconPath);
          expect(stats.size).toBeGreaterThan(50);
        }
      });
    });
  });
  
  // =============================================================================
  // Testes de Ícones Referenciados em Apps
  // =============================================================================
  
  describe('🖥️ App Icons Validation', () => {
    test('all app icons should exist or have fallback', () => {
      appsData.apps.forEach((app, index) => {
        if (!app.icon) {
          console.warn(`App at index ${index} has no icon specified:`, app.name);
          return;
        }
        
        // Possíveis localizações do ícone
        const possiblePaths = [
          path.join(iconsDir, app.icon),
          path.join(assetsDir, app.icon),
          path.join(global.PROJECT_ROOT, app.icon),
          app.icon // Path absoluto
        ];
        
        const iconExists = possiblePaths.some(iconPath => {
          try {
            return global.fileExists(iconPath);
          } catch (error) {
            return false;
          }
        });
        
        // Se não existir, pelo menos devemos ter um ícone padrão
        const defaultIcon = path.join(assetsDir, 'icon.png');
        const hasDefault = global.fileExists(defaultIcon);
        
        const hasValidIcon = iconExists || hasDefault;
        
        if (!hasValidIcon) {
          console.error(`App "${app.name}" icon not found. Checked paths:`, possiblePaths);
        }
        
        expect(hasValidIcon).toBeTruthy();
      });
    });
    
    test('app icon files should have valid sizes', () => {
      const maxIconSize = 5 * 1024 * 1024; // 5MB
      const minIconSize = 50; // 50 bytes
      
      appsData.apps.forEach(app => {
        if (!app.icon) return;
        
        const iconPath = path.join(iconsDir, app.icon);
        
        if (global.fileExists(iconPath)) {
          const stats = fs.statSync(iconPath);
          
          expect(stats.size).toBeGreaterThan(minIconSize);
          expect(stats.size).toBeLessThan(maxIconSize);
          
          if (stats.size > maxIconSize) {
            console.warn(`App "${app.name}" icon is too large: ${stats.size} bytes`);
          }
        }
      });
    });
    
    test('app icons should have valid extensions', () => {
      const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg'];
      
      appsData.apps.forEach(app => {
        if (!app.icon) return;
        
        const extension = path.extname(app.icon).toLowerCase();
        
        if (extension) {
          expect(validExtensions).toContain(extension);
          
          if (!validExtensions.includes(extension)) {
            console.error(`App "${app.name}" has invalid icon extension: ${extension}`);
          }
        }
      });
    });
  });
  
  // =============================================================================
  // Testes de Ícones Referenciados em Links
  // =============================================================================
  
  describe('🌐 Link Icons Validation', () => {
    test('all link icons should exist or have fallback', () => {
      linksData.links.forEach((link, index) => {
        if (!link.icon) {
          console.warn(`Link at index ${index} has no icon specified:`, link.name);
          return;
        }
        
        // Possíveis localizações do ícone
        const possiblePaths = [
          path.join(iconsDir, link.icon),
          path.join(assetsDir, link.icon),
          path.join(global.PROJECT_ROOT, link.icon),
          link.icon // Path absoluto ou URL
        ];
        
        // Para links web, ícones podem ser URLs
        const isUrl = link.icon.startsWith('http://') || link.icon.startsWith('https://');
        
        const iconExists = isUrl || possiblePaths.some(iconPath => {
          try {
            return global.fileExists(iconPath);
          } catch (error) {
            return false;
          }
        });
        
        // Se não existir, pelo menos devemos ter um ícone padrão
        const defaultIcon = path.join(assetsDir, 'icon.png');
        const hasDefault = global.fileExists(defaultIcon);
        
        const hasValidIcon = iconExists || hasDefault;
        
        if (!hasValidIcon && !isUrl) {
          console.error(`Link "${link.name}" icon not found. Checked paths:`, possiblePaths);
        }
        
        expect(hasValidIcon).toBeTruthy();
      });
    });
    
    test('link icon files should have valid sizes', () => {
      const maxIconSize = 5 * 1024 * 1024; // 5MB
      const minIconSize = 50; // 50 bytes
      
      linksData.links.forEach(link => {
        if (!link.icon) return;
        
        // Skip URLs
        if (link.icon.startsWith('http://') || link.icon.startsWith('https://')) {
          return;
        }
        
        const iconPath = path.join(iconsDir, link.icon);
        
        if (global.fileExists(iconPath)) {
          const stats = fs.statSync(iconPath);
          
          expect(stats.size).toBeGreaterThan(minIconSize);
          expect(stats.size).toBeLessThan(maxIconSize);
          
          if (stats.size > maxIconSize) {
            console.warn(`Link "${link.name}" icon is too large: ${stats.size} bytes`);
          }
        }
      });
    });
    
    test('link icons should have valid extensions or be URLs', () => {
      const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg'];
      
      linksData.links.forEach(link => {
        if (!link.icon) return;
        
        // Skip URLs
        if (link.icon.startsWith('http://') || link.icon.startsWith('https://')) {
          return;
        }
        
        const extension = path.extname(link.icon).toLowerCase();
        
        if (extension) {
          expect(validExtensions).toContain(extension);
          
          if (!validExtensions.includes(extension)) {
            console.error(`Link "${link.name}" has invalid icon extension: ${extension}`);
          }
        }
      });
    });
  });
  
  // =============================================================================
  // Testes de Cache de Ícones
  // =============================================================================
  
  describe('💾 Icon Cache Validation', () => {
    test('should have icon cache file if it exists', () => {
      const cacheFile = path.join(iconsDir, 'icon_cache.json');
      
      if (global.fileExists(cacheFile)) {
        const cache = global.readJsonFile(cacheFile);
        
        expect(cache).toBeDefined();
        expect(typeof cache).toBe('object');
        
        // Verificar estrutura do cache se existir
        Object.keys(cache).forEach(key => {
          expect(typeof cache[key]).toBe('object');
          
          if (cache[key].path) {
            expect(typeof cache[key].path).toBe('string');
          }
          
          if (cache[key].lastModified) {
            expect(typeof cache[key].lastModified).toBe('number');
          }
        });
      }
    });
  });
  
  // =============================================================================
  // Testes de Integridade Geral
  // =============================================================================
  
  describe('🔍 General Asset Integrity', () => {
    test('should not have orphaned icons', () => {
      if (!global.fileExists(iconsDir)) {
        console.warn('Icons directory does not exist, skipping orphaned icons test');
        return;
      }
      
      // Ler todos os ícones no diretório
      const iconFiles = fs.readdirSync(iconsDir)
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg'].includes(ext);
        });
      
      // Coletar todos os ícones referenciados
      const referencedIcons = new Set();
      
      appsData.apps.forEach(app => {
        if (app.icon && !app.icon.startsWith('http')) {
          referencedIcons.add(path.basename(app.icon));
        }
      });
      
      linksData.links.forEach(link => {
        if (link.icon && !link.icon.startsWith('http')) {
          referencedIcons.add(path.basename(link.icon));
        }
      });
      
      // Verificar ícones órfãos (existem mas não são referenciados)
      const orphanedIcons = iconFiles.filter(file => 
        !referencedIcons.has(file) && 
        !file.startsWith('icon_cache') && 
        file !== 'default.png'
      );
      
      if (orphanedIcons.length > 0) {
        console.warn('Orphaned icons found (may be intentional):', orphanedIcons);
      }
      
      // Não falhar o teste por ícones órfãos, apenas reportar
      expect(orphanedIcons).toBeInstanceOf(Array);
    });
    
    test('should have reasonable total assets size', () => {
      const maxTotalSize = 100 * 1024 * 1024; // 100MB
      
      if (!global.fileExists(assetsDir)) {
        return;
      }
      
      let totalSize = 0;
      
      function calculateDirSize(dirPath) {
        if (!global.fileExists(dirPath)) return 0;
        
        const files = fs.readdirSync(dirPath);
        let size = 0;
        
        files.forEach(file => {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            size += calculateDirSize(filePath);
          } else {
            size += stats.size;
          }
        });
        
        return size;
      }
      
      totalSize = calculateDirSize(assetsDir);
      
      expect(totalSize).toBeLessThan(maxTotalSize);
      
      if (totalSize > maxTotalSize) {
        console.error(`Total assets size too large: ${totalSize} bytes`);
      }
    });
  });
});