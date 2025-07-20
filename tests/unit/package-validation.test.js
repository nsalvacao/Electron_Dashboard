/**
 * =============================================================================
 * Testes de Validação do Package.json
 * =============================================================================
 * 
 * Valida que o package.json tem todos os scripts e configurações necessárias
 * para o funcionamento correto da aplicação e CI/CD.
 * 
 * Resolve problemas de CI/CD:
 * - Verifica que scripts essenciais existem
 * - Valida configuração do Electron Builder
 * - Confirma dependências necessárias
 * - Detecta problemas de configuração antes do build
 * =============================================================================
 */

const path = require('path');

describe('📦 Package.json Validation Tests', () => {
  let packageJson;
  
  beforeAll(() => {
    const packagePath = path.join(global.PROJECT_ROOT, 'package.json');
    packageJson = global.readJsonFile(packagePath);
  });
  
  // =============================================================================
  // Testes de Configuração Básica
  // =============================================================================
  
  describe('⚙️ Basic Configuration', () => {
    test('should have required basic fields', () => {
      const requiredFields = [
        'name', 'version', 'description', 'main', 
        'scripts', 'author', 'license'
      ];
      
      requiredFields.forEach(field => {
        expect(packageJson).toHaveProperty(field);
        expect(packageJson[field]).toBeDefined();
      });
    });
    
    test('should have valid name and version', () => {
      expect(packageJson.name).toBe('nexo-dashboard');
      expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(packageJson.main).toBe('src/main.js');
    });
    
    test('should have valid author information', () => {
      expect(packageJson.author).toBeDefined();
      
      if (typeof packageJson.author === 'object') {
        expect(packageJson.author).toHaveProperty('name');
        expect(packageJson.author.name).toBe('Nuno Salvação');
      } else {
        expect(typeof packageJson.author).toBe('string');
      }
    });
    
    test('should have MIT license', () => {
      expect(packageJson.license).toBe('MIT');
    });
    
    test('should have repository information', () => {
      expect(packageJson.repository).toBeDefined();
      expect(packageJson.repository.type).toBe('git');
      expect(packageJson.repository.url).toContain('github.com');
      expect(packageJson.repository.url).toContain('Nexo_Dashboard');
    });
  });
  
  // =============================================================================
  // Testes de Scripts
  // =============================================================================
  
  describe('📜 Scripts Validation', () => {
    test('should have essential development scripts', () => {
      const essentialScripts = [
        'start',      // electron .
        'dev',        // development mode
        'build',      // electron-builder
        'dist',       // distribution build
        'clean',      // clean dist
        'test',       // jest tests
        'lint'        // eslint
      ];
      
      essentialScripts.forEach(script => {
        expect(packageJson.scripts).toHaveProperty(script);
        expect(typeof packageJson.scripts[script]).toBe('string');
        expect(packageJson.scripts[script].trim()).not.toBe('');
      });
    });
    
    test('should have CI/CD optimized scripts', () => {
      const ciScripts = [
        'ci:install',
        'ci:build', 
        'ci:test'
      ];
      
      ciScripts.forEach(script => {
        expect(packageJson.scripts).toHaveProperty(script);
        expect(typeof packageJson.scripts[script]).toBe('string');
      });
    });
    
    test('should have platform-specific build scripts', () => {
      const platformScripts = [
        'build:win',
        'dist:win'
      ];
      
      platformScripts.forEach(script => {
        expect(packageJson.scripts).toHaveProperty(script);
        expect(packageJson.scripts[script]).toContain('--win');
      });
    });
    
    test('should have utility scripts', () => {
      const utilityScripts = [
        'generate-icons',
        'validate',
        'prebuild'
      ];
      
      utilityScripts.forEach(script => {
        expect(packageJson.scripts).toHaveProperty(script);
      });
    });
    
    test('scripts should have valid commands', () => {
      // Test script should use jest
      expect(packageJson.scripts.test).toContain('jest');
      
      // Lint script should use eslint
      expect(packageJson.scripts.lint).toContain('eslint');
      
      // Start script should use electron
      expect(packageJson.scripts.start).toContain('electron');
      
      // Build scripts should use electron-builder
      expect(packageJson.scripts.build).toContain('electron-builder');
      expect(packageJson.scripts.dist).toContain('electron-builder');
    });
  });
  
  // =============================================================================
  // Testes de Dependências
  // =============================================================================
  
  describe('📚 Dependencies Validation', () => {
    test('should have essential runtime dependencies', () => {
      const essentialDeps = [
        'axios'  // For API calls if needed
      ];
      
      essentialDeps.forEach(dep => {
        expect(packageJson.dependencies).toHaveProperty(dep);
      });
    });
    
    test('should have essential development dependencies', () => {
      const essentialDevDeps = [
        'electron',
        'electron-builder',
        'jest',
        'eslint',
        'rimraf'
      ];
      
      essentialDevDeps.forEach(dep => {
        expect(packageJson.devDependencies).toHaveProperty(dep);
      });
    });
    
    test('should have compatible Node.js version requirement', () => {
      if (packageJson.engines) {
        expect(packageJson.engines).toHaveProperty('node');
        
        // Should support Node 16 or higher
        const nodeVersion = packageJson.engines.node;
        expect(nodeVersion).toMatch(/>=16/);
      }
    });
    
    test('dependencies should have valid version formats', () => {
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      Object.entries(allDeps).forEach(([name, version]) => {
        expect(typeof name).toBe('string');
        expect(typeof version).toBe('string');
        expect(name.trim()).not.toBe('');
        expect(version.trim()).not.toBe('');
        
        // Should follow semver pattern (^x.y.z or ~x.y.z or x.y.z)
        expect(version).toMatch(/^[\^~]?\d+\.\d+\.\d+/);
      });
    });
  });
  
  // =============================================================================
  // Testes de Configuração Electron Builder
  // =============================================================================
  
  describe('🔧 Electron Builder Configuration', () => {
    test('should have electron-builder build configuration', () => {
      expect(packageJson.build).toBeDefined();
      expect(typeof packageJson.build).toBe('object');
    });
    
    test('should have correct app metadata in build config', () => {
      const build = packageJson.build;
      
      expect(build.appId).toBe('com.nexo.dashboard');
      expect(build.productName).toBe('Nexo Dashboard');
      expect(build.copyright).toContain('Nuno Salvação');
    });
    
    test('should have valid directory configuration', () => {
      const build = packageJson.build;
      
      expect(build.directories).toBeDefined();
      expect(build.directories.output).toBe('dist');
      expect(build.directories.buildResources).toBe('build');
    });
    
    test('should have Windows configuration', () => {
      const build = packageJson.build;
      
      expect(build.win).toBeDefined();
      expect(build.win.target).toBeDefined();
      expect(build.win.icon).toBe('assets/icon.ico');
      expect(build.win.publisherName).toBe('Nuno Salvação');
    });
    
    test('should have NSIS installer configuration', () => {
      const build = packageJson.build;
      
      expect(build.nsis).toBeDefined();
      expect(build.nsis.oneClick).toBe(false);
      expect(build.nsis.allowToChangeInstallationDirectory).toBe(true);
      expect(build.nsis.createDesktopShortcut).toBe(true);
      expect(build.nsis.createStartMenuShortcut).toBe(true);
      expect(build.nsis.shortcutName).toBe('Nexo Dashboard');
    });
    
    test('should have Linux configuration', () => {
      const build = packageJson.build;
      
      expect(build.linux).toBeDefined();
      expect(build.linux.target).toBeDefined();
      expect(build.linux.icon).toBe('assets/icon.png');
      expect(build.linux.category).toBe('Utility');
    });
    
    test('should have valid file patterns', () => {
      const build = packageJson.build;
      
      expect(build.files).toBeDefined();
      expect(Array.isArray(build.files)).toBeTruthy();
      
      // Should include essential directories
      expect(build.files).toContain('src/**/*');
      expect(build.files).toContain('assets/**/*');
      expect(build.files).toContain('package.json');
      
      // Should exclude development files
      expect(build.files).toContain('!**/*.md');
      expect(build.files).toContain('!**/*.log');
    });
    
    test('should have GitHub publish configuration', () => {
      const build = packageJson.build;
      
      if (build.publish) {
        expect(build.publish.provider).toBe('github');
        expect(build.publish.owner).toBe('nsalvacao');
        expect(build.publish.repo).toBe('Nexo_Dashboard');
      }
    });
  });
  
  // =============================================================================
  // Testes de Metadados
  // =============================================================================
  
  describe('📋 Metadata Validation', () => {
    test('should have appropriate keywords', () => {
      expect(packageJson.keywords).toBeDefined();
      expect(Array.isArray(packageJson.keywords)).toBeTruthy();
      expect(packageJson.keywords.length).toBeGreaterThan(0);
      
      const expectedKeywords = ['electron', 'dashboard', 'launcher'];
      expectedKeywords.forEach(keyword => {
        expect(packageJson.keywords).toContain(keyword);
      });
    });
    
    test('should have bugs and homepage URLs', () => {
      if (packageJson.bugs) {
        expect(packageJson.bugs.url).toContain('github.com');
        expect(packageJson.bugs.url).toContain('issues');
      }
      
      if (packageJson.homepage) {
        expect(packageJson.homepage).toContain('github.com');
      }
    });
    
    test('should have appropriate module type', () => {
      // Should be commonjs for Electron compatibility
      if (packageJson.type) {
        expect(packageJson.type).toBe('commonjs');
      }
    });
  });
  
  // =============================================================================
  // Testes de Consistência
  // =============================================================================
  
  describe('🔍 Consistency Tests', () => {
    test('app name should be consistent across configurations', () => {
      const appName = 'Nexo Dashboard';
      
      expect(packageJson.build.productName).toBe(appName);
      expect(packageJson.build.nsis.shortcutName).toBe(appName);
      
      if (packageJson.build.linux.desktop) {
        expect(packageJson.build.linux.desktop.Name).toBe(appName);
      }
    });
    
    test('version should follow semantic versioning', () => {
      const version = packageJson.version;
      const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
      
      expect(version).toMatch(semverRegex);
      
      const [major, minor, patch] = version.split('.').map(Number);
      expect(major).toBeGreaterThanOrEqual(0);
      expect(minor).toBeGreaterThanOrEqual(0);
      expect(patch).toBeGreaterThanOrEqual(0);
    });
    
    test('description should be meaningful', () => {
      expect(packageJson.description).toBeDefined();
      expect(packageJson.description.length).toBeGreaterThan(20);
      // Verificar se contém palavras-chave do projeto
      const description = packageJson.description.toLowerCase();
      const hasRelevantKeywords = description.includes('dashboard') || 
                                  description.includes('electron') || 
                                  description.includes('application') ||
                                  description.includes('management');
      expect(hasRelevantKeywords).toBeTruthy();
    });
  });
});