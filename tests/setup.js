/**
 * =============================================================================
 * Jest Setup - Configuração Global dos Testes
 * =============================================================================
 * 
 * Configurações globais que se aplicam a todos os testes.
 * Resolve problemas de ambiente e prepara mocks necessários.
 */

const path = require('path');
const fs = require('fs');

// =============================================================================
// Jest Extended Setup
// =============================================================================

// Adicionar matchers estendidos do jest-extended
require('jest-extended');

// =============================================================================
// Configuração do Ambiente de Teste
// =============================================================================

// Definir NODE_ENV como test se não estiver definido
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Configurar paths absolutos para o projeto
global.PROJECT_ROOT = path.resolve(__dirname, '..');
global.DATA_DIR = path.join(global.PROJECT_ROOT, 'data');
global.ASSETS_DIR = path.join(global.PROJECT_ROOT, 'assets');
global.SRC_DIR = path.join(global.PROJECT_ROOT, 'src');

// =============================================================================
// Mocks Globais para Electron (quando necessário)
// =============================================================================

// Mock básico do Electron para testes que não precisam da UI real
global.mockElectron = {
  app: {
    getPath: jest.fn(() => '/tmp/test-app-data'),
    getName: jest.fn(() => 'Nexo Dashboard Test'),
    getVersion: jest.fn(() => '0.1.0-test'),
    on: jest.fn(),
    quit: jest.fn(),
    isReady: jest.fn(() => true)
  },
  ipcMain: {
    on: jest.fn(),
    handle: jest.fn(),
    emit: jest.fn()
  },
  BrowserWindow: jest.fn(() => ({
    loadFile: jest.fn(),
    webContents: {
      send: jest.fn(),
      on: jest.fn()
    },
    on: jest.fn(),
    show: jest.fn(),
    close: jest.fn()
  }))
};

// =============================================================================
// Utilitários de Teste
// =============================================================================

/**
 * Verifica se um ficheiro existe
 */
global.fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
};

/**
 * Lê e parseia um ficheiro JSON de forma segura
 */
global.readJsonFile = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read JSON file ${filePath}: ${error.message}`);
  }
};

/**
 * Valida estrutura básica de um objeto
 */
global.validateObjectStructure = (obj, requiredFields) => {
  const errors = [];
  
  if (!obj || typeof obj !== 'object') {
    errors.push('Object is null, undefined, or not an object');
    return errors;
  }
  
  for (const field of requiredFields) {
    if (!(field in obj)) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  return errors;
};

// =============================================================================
// Configuração de Timeouts e Cleanup
// =============================================================================

// Aumentar timeout padrão para testes que podem ser lentos
jest.setTimeout(30000);

// Cleanup após cada teste
afterEach(() => {
  // Limpar mocks se necessário
  jest.clearAllMocks();
  
  // Reset de variáveis globais se necessário
  delete global.testData;
});

// =============================================================================
// Debug e Logging
// =============================================================================

// Suprimir console.log durante testes (exceto se DEBUG estiver ativado)
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: console.warn, // Manter warnings
    error: console.error // Manter errors
  };
}

console.log('🧪 Jest setup completed - Nexo Dashboard tests ready');