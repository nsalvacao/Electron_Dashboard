/**
 * =============================================================================
 * Jest Configuration - Nexo Dashboard
 * =============================================================================
 * 
 * Esta configuração resolve os problemas do workflow CI/CD criando testes
 * funcionais reais para validar o projeto durante builds automáticos.
 * 
 * Problemas Resolvidos:
 * 1. Testes vazios que faziam falhar o CI/CD
 * 2. Conflitos com ficheiros de documentação do Electron
 * 3. Falta de validação automática dos dados do projeto
 * 
 * Benefícios para CI/CD:
 * - Validação automática de JSON files
 * - Smoke tests do Electron
 * - Verificação de integridade dos assets
 * - Testes funcionais para garantir qualidade das releases
 * =============================================================================
 */

module.exports = {
  // Ambiente de teste
  testEnvironment: 'node',
  
  // Diretórios de teste (apenas a pasta tests/)
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // Ignorar a documentação do Electron que estava a causar problemas
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/0_Electron_Docs_Reference/',
    '/scripts/node_modules/',
    '/assets/'
  ],
  
  // Configuração de cobertura
  collectCoverage: false, // Ativar apenas quando necessário
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  
  // Timeout para testes mais longos (Electron pode ser lento)
  testTimeout: 30000,
  
  // Setup files se necessário
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  
  // Variáveis de ambiente para testes
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  
  // Transformações (não necessário para JS puro)
  transform: {},
  
  // Módulos que não precisam ser transformados
  transformIgnorePatterns: [
    '/node_modules/'
  ],
  
  // Verbose output para debug
  verbose: true,
  
  // Sair no primeiro erro em CI
  bail: process.env.CI ? 1 : 0,
  
  // Detectar ficheiros abertos (útil para debug)
  detectOpenHandles: true,
  
  // Forçar saída limpa
  forceExit: true,
  
  // Limpar mocks automaticamente
  clearMocks: true,
  
  // Reporters para CI
  reporters: [
    'default',
    // Adicionar JUnit reporter para CI se necessário
    // ['jest-junit', { outputDirectory: 'test-results', outputName: 'junit.xml' }]
  ]
};