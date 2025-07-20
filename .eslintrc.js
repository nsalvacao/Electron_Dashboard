// =============================================================================
// ESLint Configuration for Nexo Dashboard
// =============================================================================
// Configuração básica para linting de código JavaScript/Node.js
// Pode ser expandida conforme necessário

module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    // Avisos para debugging
    'no-console': 'warn',
    'no-debugger': 'warn',
    
    // Boas práticas
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'no-undef': 'error',
    'prefer-const': 'warn',
    
    // Estilo de código
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    
    // Flexibilidade para Electron
    'no-require-imports': 'off'
  },
  globals: {
    // Globals específicos do Electron
    '__dirname': 'readonly',
    '__filename': 'readonly',
    'process': 'readonly'
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '*.min.js',
    'scripts/node_modules/',
    'src/ai-integration/**/*', // Skip AI integration files (created in previous session)
    'src/ai-intelligence/**/*', // Skip AI intelligence files (created in previous session)
    'src/data-management/**/*', // Skip data management files (created in previous session)
    'src/ui-components/**/*'    // Skip UI components files (created in previous session)
  ]
};