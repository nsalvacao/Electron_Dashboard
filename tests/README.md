# 🧪 Testes Automatizados - Nexo Dashboard

## Visão Geral

Esta suite de testes foi criada para resolver problemas de CI/CD e garantir a qualidade do projeto através de validação automática dos componentes essenciais.

## Problema Resolvido

**Erro Original**: O workflow GitHub Actions falhava porque não existiam testes funcionais válidos, apenas ficheiros de teste vazios da documentação do Electron.

**Solução Implementada**: Suite completa de testes funcionais que validam:
- Integridade dos dados JSON
- Configuração da aplicação Electron
- Existência e validade de assets
- Funcionalidades de pesquisa e filtragem

## Estrutura dos Testes

```
tests/
├── setup.js                     # Configuração global dos testes
├── fixtures/                    # Dados mock para testes
│   ├── mock-apps.json           # Apps de teste
│   └── mock-links.json          # Links de teste
├── unit/                        # Testes unitários
│   ├── data-validation.test.js  # Validação JSON
│   ├── package-validation.test.js # Validação package.json
│   ├── assets-validation.test.js # Validação de assets
│   └── search-functionality.test.js # Testes de pesquisa
└── integration/                 # Testes de integração
    └── electron-smoke.test.js   # Smoke tests Electron
```

## Tipos de Testes

### 📋 Validação de Dados JSON
**Ficheiro**: `tests/unit/data-validation.test.js`

**Objetivo**: Garantir integridade dos ficheiros de dados

**Testa**:
- Estrutura válida de `apps_custom.json` e `links_web.json`
- Campos obrigatórios (`name`, `path`/`url`, `icon`)
- Tipos de dados corretos
- Detecção de duplicados
- Validação de URLs
- Consistência de categorias e tags

### ⚡ Smoke Tests Electron
**Ficheiro**: `tests/integration/electron-smoke.test.js`

**Objetivo**: Verificar que a aplicação pode ser inicializada

**Testa**:
- Existência de ficheiros essenciais (`main.js`, `renderer.js`, etc.)
- Configuração válida do `package.json`
- Configuração do Electron Builder
- Estrutura de diretórios
- Scripts essenciais

### 🎨 Validação de Assets
**Ficheiro**: `tests/unit/assets-validation.test.js`

**Objetivo**: Verificar integridade dos assets referenciados

**Testa**:
- Existência de ícones da aplicação
- Ícones referenciados em apps e links
- Tamanhos válidos de ficheiros
- Formatos de imagem suportados
- Detecção de assets órfãos

### 🔍 Funcionalidade de Pesquisa
**Ficheiro**: `tests/unit/search-functionality.test.js`

**Objetivo**: Validar algoritmos de pesquisa e filtragem

**Testa**:
- Pesquisa por nome, descrição, tags
- Filtragem por categoria
- Casos especiais (acentos, maiúsculas)
- Performance com datasets grandes
- Tratamento de erros

### 📦 Validação Package.json
**Ficheiro**: `tests/unit/package-validation.test.js`

**Objetivo**: Verificar configurações essenciais

**Testa**:
- Scripts CI/CD (`ci:install`, `ci:build`, `ci:test`)
- Dependências necessárias
- Configuração Electron Builder
- Metadados da aplicação
- Consistência de versões

## Configuração

### Jest Configuration
**Ficheiro**: `jest.config.js`

- Ignora ficheiros da documentação Electron
- Timeout de 30s para testes lentos
- Setup global em `tests/setup.js`
- Cobertura de código configurável

### Setup Global
**Ficheiro**: `tests/setup.js`

- Mocks do Electron para testes sem UI
- Utilitários para leitura de JSON
- Variáveis globais para paths
- Configuração de timeouts

## Execução

```bash
# Todos os testes
npm test

# Testes específicos
npm test -- --testPathPattern=data-validation
npm test -- --testPathPattern=electron-smoke
npm test -- --testPathPattern=assets-validation

# Modo watch (desenvolvimento)
npm test -- --watch

# Com cobertura
npm test -- --coverage
```

## Dependências Adicionadas

```json
{
  "devDependencies": {
    "jest-extended": "^6.0.0",
    "@types/jest": "^30.0.0"
  }
}
```

## Estratégia de Dados

### Dados Reais vs Mock
Os testes tentam usar dados reais do projeto, mas fazem fallback para dados mock se:
- Ficheiros de dados não existem
- Diretórios não estão configurados
- Estrutura do projeto está incompleta

### Ficheiros Mock
- `tests/fixtures/mock-apps.json`: Apps de exemplo
- `tests/fixtures/mock-links.json`: Links de exemplo

## CI/CD Integration

### GitHub Actions
O workflow CI/CD agora executa:
1. `npm run ci:install` - Instalação otimizada
2. `npm run ci:test` - Linting + Testes
3. `npm run ci:build` - Build da aplicação

### Benefícios
- ✅ Detecção precoce de problemas
- ✅ Validação automática de dados
- ✅ Verificação de configurações
- ✅ Garantia de qualidade nas releases

## Limitações Conhecidas

### Testes Electron
- Não testa UI real (usa mocks)
- Não testa funcionalidade de janelas
- Foca em validação de configuração

### Testes de Assets
- Alguns assets podem não existir durante desenvolvimento
- Testes usam fallbacks para cenários de desenvolvimento

### Performance
- Testes podem ser lentos em sistemas com I/O lento
- Cache de Jest ajuda em execuções subsequentes

## Próximos Passos

### Melhorias Possíveis
1. **Testes E2E**: Usando Spectron ou similar para UI real
2. **Visual Regression**: Screenshots automáticos
3. **Performance Benchmarks**: Métricas de performance
4. **Integration Tests**: Testes com APIs reais

### Expansão
1. **Testes Multi-plataforma**: Linux, macOS, Windows
2. **Testes de Instalação**: Validar instaladores
3. **Testes de Atualização**: Processo de updates
4. **Testes de Segurança**: Validação de segurança

## Debugging

### Testes Falhando
```bash
# Debug verbose
npm test -- --verbose

# Executar teste individual
npm test -- --testNamePattern="should validate apps data"

# Debug com logs
DEBUG=true npm test
```

### Problemas Comuns
1. **Ficheiros não encontrados**: Verificar paths em `tests/setup.js`
2. **Timeouts**: Aumentar timeout em `jest.config.js`
3. **Mocks falhando**: Verificar mocks do Electron em `setup.js`

---

**Contribuição**: Adicionar novos testes seguindo os padrões estabelecidos
**Manutenção**: Atualizar mocks quando estrutura de dados mudar