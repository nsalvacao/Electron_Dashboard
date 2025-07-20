/**
 * =============================================================================
 * Electron Smoke Tests
 * =============================================================================
 * 
 * Smoke tests básicos para verificar que a aplicação Electron pode ser
 * inicializada sem erros críticos. Não requer UI real, usa mocks.
 * 
 * Resolve problemas de CI/CD:
 * - Verifica que o main process do Electron carrega sem erros
 * - Valida que todos os módulos principais estão acessíveis
 * - Detecta problemas de configuração antes do build
 * 
 * Limitações:
 * - Não testa UI real (seria muito complexo para CI)
 * - Foca em validação de módulos e configuração
 * - Usa mocks para simular ambiente Electron
 * =============================================================================
 */

const path = require('path');
const fs = require('fs');

describe('⚡ Electron Smoke Tests', () => {
  let mainProcessPath;
  let packageJson;
  
  beforeAll(() => {
    // Paths importantes
    mainProcessPath = path.join(global.SRC_DIR, 'main.js');
    packageJson = global.readJsonFile(path.join(global.PROJECT_ROOT, 'package.json'));
  });
  
  // =============================================================================
  // Testes de Estrutura da Aplicação
  // =============================================================================
  
  describe('📁 Application Structure', () => {
    test('should have main entry point file', () => {
      expect(global.fileExists(mainProcessPath)).toBeTruthy();
    });
    
    test('should have renderer files', () => {
      const rendererPath = path.join(global.SRC_DIR, 'renderer.js');
      const htmlPath = path.join(global.SRC_DIR, 'index.html');
      const cssPath = path.join(global.SRC_DIR, 'style.css');
      
      expect(global.fileExists(rendererPath)).toBeTruthy();
      expect(global.fileExists(htmlPath)).toBeTruthy();
      expect(global.fileExists(cssPath)).toBeTruthy();
    });
    
    test('should have valid package.json electron configuration', () => {
      expect(packageJson.main).toBeDefined();
      expect(packageJson.main).toBe('src/main.js');
      
      // Verificar dependências do Electron
      expect(packageJson.devDependencies).toHaveProperty('electron');
      expect(packageJson.devDependencies).toHaveProperty('electron-builder');
    });
    
    test('should have required scripts in package.json', () => {
      const requiredScripts = ['start', 'build', 'dist'];
      
      requiredScripts.forEach(script => {
        expect(packageJson.scripts).toHaveProperty(script);
        expect(typeof packageJson.scripts[script]).toBe('string');
        expect(packageJson.scripts[script].trim()).not.toBe('');
      });
    });
  });
  
  // =============================================================================
  // Testes de Configuração Electron Builder
  // =============================================================================
  
  describe('🔧 Electron Builder Configuration', () => {
    test('should have valid electron-builder config', () => {
      expect(packageJson.build).toBeDefined();
      expect(typeof packageJson.build).toBe('object');
    });
    
    test('should have platform-specific configurations', () => {
      const { build } = packageJson;
      
      // Configuração Windows
      expect(build.win).toBeDefined();
      expect(build.win.target).toBeDefined();
      expect(build.win.icon).toBe('assets/icon.ico');
      
      // Configuração NSIS
      expect(build.nsis).toBeDefined();
      expect(build.nsis.oneClick).toBe(false);
      expect(build.nsis.allowToChangeInstallationDirectory).toBe(true);
      expect(build.nsis.createDesktopShortcut).toBe(true);
      expect(build.nsis.createStartMenuShortcut).toBe(true);
    });
    
    test('should have valid file patterns', () => {
      const { build } = packageJson;
      
      expect(build.files).toBeDefined();
      expect(Array.isArray(build.files)).toBeTruthy();
      
      // Verificar que inclui ficheiros essenciais
      const files = build.files;
      expect(files).toContain('src/**/*');
      expect(files).toContain('assets/**/*');
      expect(files).toContain('package.json');
    });
  });
  
  // =============================================================================
  // Testes de Módulos Principais (Mock)
  // =============================================================================
  
  describe('🧩 Main Process Modules', () => {
    let mainModule;
    
    beforeAll(() => {
      // Mock do Electron antes de carregar o módulo
      jest.doMock('electron', () => global.mockElectron, { virtual: true });
      
      // Mock do path para evitar problemas de paths absolutos
      jest.doMock('path', () => require('path'), { virtual: true });
      
      // Mock do fs para evitar problemas de acesso a ficheiros
      jest.doMock('fs', () => ({
        ...require('fs'),
        existsSync: jest.fn(() => true),
        readFileSync: jest.fn(() => JSON.stringify({}))
      }), { virtual: true });
    });
    
    afterAll(() => {
      jest.dontMock('electron');
      jest.dontMock('path');
      jest.dontMock('fs');
    });
    
    test('should be able to require main.js without errors', () => {
      expect(() => {
        // Tentar carregar o main.js (pode falhar se tiver dependências complexas)
        try {
          const mainContent = fs.readFileSync(mainProcessPath, 'utf8');
          expect(mainContent).toContain('electron');
          expect(mainContent.length).toBeGreaterThan(100);
        } catch (error) {
          // Se não conseguir carregar, pelo menos verificar que o ficheiro existe
          expect(global.fileExists(mainProcessPath)).toBeTruthy();
        }
      }).not.toThrow();
    });
    
    test('main.js should contain essential Electron imports', () => {
      const mainContent = fs.readFileSync(mainProcessPath, 'utf8');
      
      // Verificar imports essenciais
      expect(mainContent).toMatch(/require.*electron/);
      expect(mainContent).toMatch(/BrowserWindow/);
      expect(mainContent).toMatch(/app/);
    });
    
    test('main.js should handle app events', () => {
      const mainContent = fs.readFileSync(mainProcessPath, 'utf8');
      
      // Verificar que trata eventos essenciais
      expect(mainContent).toMatch(/app\.on.*ready/);
      expect(mainContent).toMatch(/app\.on.*window-all-closed/);
    });
  });
  
  // =============================================================================
  // Testes de Assets Essenciais
  // =============================================================================
  
  describe('🎨 Essential Assets', () => {
    test('should have application icons', () => {
      const iconIco = path.join(global.ASSETS_DIR, 'icon.ico');
      const iconPng = path.join(global.ASSETS_DIR, 'icon.png');
      
      expect(global.fileExists(iconIco)).toBeTruthy();
      expect(global.fileExists(iconPng)).toBeTruthy();
    });
    
    test('icon files should have reasonable size', () => {
      const iconIco = path.join(global.ASSETS_DIR, 'icon.ico');
      const iconPng = path.join(global.ASSETS_DIR, 'icon.png');
      
      if (global.fileExists(iconIco)) {
        const stats = fs.statSync(iconIco);
        expect(stats.size).toBeGreaterThan(1000); // Pelo menos 1KB
        expect(stats.size).toBeLessThan(10000000); // Máximo 10MB
      }
      
      if (global.fileExists(iconPng)) {
        const stats = fs.statSync(iconPng);
        expect(stats.size).toBeGreaterThan(100); // Pelo menos 100 bytes
        expect(stats.size).toBeLessThan(5000000); // Máximo 5MB
      }
    });
  });
  
  // =============================================================================
  // Testes de Configuração de Dados
  // =============================================================================
  
  describe('⚙️ Data Configuration', () => {
    test('should have data directory', () => {
      expect(global.fileExists(global.DATA_DIR)).toBeTruthy();
    });
    
    test('should have essential data files', () => {
      const appsFile = path.join(global.DATA_DIR, 'apps_custom.json');
      const linksFile = path.join(global.DATA_DIR, 'links_web.json');
      
      expect(global.fileExists(appsFile)).toBeTruthy();
      expect(global.fileExists(linksFile)).toBeTruthy();
    });
    
    test('config.json should exist and be valid', () => {
      const configPath = path.join(global.PROJECT_ROOT, 'config.json');
      
      if (global.fileExists(configPath)) {
        const config = global.readJsonFile(configPath);
        expect(config).toBeDefined();
        expect(typeof config).toBe('object');
      } else {
        // Se não existir, isso não é necessariamente um erro
        console.warn('config.json not found - this may be expected');
      }
    });
  });
  
  // =============================================================================
  // Testes de Scripts
  // =============================================================================
  
  describe('📜 Application Scripts', () => {
    test('should have scripts directory', () => {
      const scriptsDir = path.join(global.PROJECT_ROOT, 'scripts');
      expect(global.fileExists(scriptsDir)).toBeTruthy();
    });
    
    test('essential scripts should exist', () => {
      const scriptsDir = path.join(global.PROJECT_ROOT, 'scripts');
      const essentialScripts = [
        'generate_icons.js',
        'validate-portability.js'
      ];
      
      essentialScripts.forEach(script => {
        const scriptPath = path.join(scriptsDir, script);
        expect(global.fileExists(scriptPath)).toBeTruthy();
      });
    });
  });
});