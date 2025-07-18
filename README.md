# Nexo Dashboard

![MIT License](https://img.shields.io/badge/license-MIT-green.svg)
![Node.js >=14](https://img.shields.io/badge/node-%3E=14.0.0-brightgreen)
![Electron](https://img.shields.io/badge/built%20with-electron-blue)
![Version](https://img.shields.io/badge/version-0.1.0-blue)

**Dashboard cross-platform para gestão centralizada de aplicações e bookmarks**

---

## 📋 Visão Geral

O **Nexo Dashboard** é uma aplicação desktop cross-platform construída com Electron que oferece uma interface moderna e intuitiva para gestão e lançamento de aplicações, scripts e links web. Com funcionalidades avançadas de pesquisa, organização por categorias e temas personalizáveis, transforma a forma como acedes às tuas ferramentas de trabalho.

### ✨ Principais Características

- **🔍 Pesquisa Inteligente** - Sistema de busca em tempo real com debouncing otimizado
- **🎨 Interface Adaptativa** - 4 modos de visualização (Normal, Compacta, Confortável, Lista)
- **🌙 Sistema de Temas** - Dark/Light mode com deteção automática do sistema
- **⌨️ Navegação Híbrida** - Controlos por mouse e atalhos de teclado
- **🏷️ Gestão Visual de Categorias** - Interface completa para criação e edição com cores e ícones
- **🏷️ Sistema de Tags Avançado** - Gestão visual de tags com operações em lote e pesquisa
- **🖱️ Drag & Drop Inteligente** - Reordenação visual com zonas de drop e feedback em tempo real
- **⚙️ Painel de Customização** - Interface completa para personalização e organização de dados
- **🔄 Persistência de Dados** - Sistema híbrido que preserva customizações durante atualizações automáticas
- **🎭 Feedback Visual** - Notificações, barras de progresso e confirmações visuais
- **⚙️ Preferências Avançadas** - Configurações completas para aparência, comportamento e acessibilidade

---

## 🚀 Quick Start

### Pré-requisitos
- **Node.js** v14+ 
- **npm** v6+
- **Windows 10+** (recomendado) ou macOS/Linux

### Instalação Rápida

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/nsalvacao/Nexo_Dashboard.git
   cd Nexo_Dashboard
   ```

2. **Instalar dependências:**
   ```bash
   npm install
   ```

3. **Executar em modo desenvolvimento:**
   ```bash
   npm run start
   ```

4. **Construir para distribuição:**
   ```bash
   npm run build
   ```

---

## 🎯 Como Usar o Dashboard

### Primeira Execução

1. **Lance a aplicação** com `npm run start`
2. **Aguarde o carregamento** dos dados (apps e bookmarks)
3. **Explore as funcionalidades** através da interface principal

### Interface Principal

#### 🗂️ Navegação por Tabs
- **Aplicações** - Apps do sistema e personalizados
- **Bookmarks** - Links web organizados por categoria

#### 🔍 Sistema de Pesquisa
- **Caixa de pesquisa** no header para busca global
- **Filtros por categoria** para refinar resultados
- **Ordenação** por nome, categoria ou última modificação
- **Escape** para limpar pesquisa rapidamente

#### 🎛️ Controlos de Vista
Botões na barra de navegação para alternar entre:
- **📋 Normal** - Layout equilibrado (280px cards)
- **📊 Compacta** - Máxima densidade (220px cards)  
- **📰 Confortável** - Espaçamento generoso (320px cards)
- **📝 Lista** - Vista linear horizontal

#### 🏷️ Sistema de Tags
- **Tags coloridas** por categoria (Development, Productivity, System, Entertainment)
- **Clique numa tag** para filtrar instantaneamente
- **Hover effects** com animações suaves

### ⌨️ Atalhos de Teclado

| Ação | Atalho | Descrição |
|------|--------|-----------|
| **Pesquisar** | `Ctrl+F` | Focar na caixa de pesquisa |
| **Atualizar** | `Ctrl+R` | Refresh dos dados |
| **Aplicações** | `Ctrl+1` | Mudar para tab Aplicações |
| **Bookmarks** | `Ctrl+2` | Mudar para tab Bookmarks |
| **Alterar Vista** | `Shift+↑/↓` | Ciclar entre modos de vista |
| **Alternar Tema** | `Shift+T` | Dark/Light/Auto theme |
| **Ajuda** | `?` | Mostrar atalhos disponíveis |

### ⚙️ Painel de Configurações

Acesso via botão **\"Configurações\"** no footer ou menu da aplicação:

#### 🎨 Aparência
- **Tema:** Automático, Claro, Escuro
- **Vista padrão:** Normal, Compacta, Confortável, Lista

#### 🔧 Comportamento  
- **Atualização automática:** Toggle para refresh periódico
- **Arrastar e largar:** Ativar/desativar reordenação

#### 🔍 Pesquisa
- **Atraso de pesquisa:** Configurar debouncing (100-1000ms)

### 🖱️ Interações Avançadas

#### Drag & Drop
- **Arrastar cards** para reordenar elementos
- **Visual feedback** durante operação
- **Reordenação mantida** durante a sessão

#### Menu Contextual
- **Clique direito** nos cards para opções avançadas
- **Abrir** - Lançar aplicação/link
- **Mostrar na pasta** - Localizar ficheiro (apps)

---

## 📁 Estrutura de Dados

### Ficheiros de Configuração

O Dashboard utiliza ficheiros JSON para gestão de dados:

#### `data/apps_startmenu.json`
Apps automaticamente detetados do Start Menu (Windows):
```json
{
  \"name\": \"Visual Studio Code\",
  \"path\": \"C:\\\\Users\\\\...\\\\Code.exe\",
  \"category\": \"Development\",
  \"tags\": [\"code\", \"editor\"],
  \"version\": \"1.85.0\"
}
```

#### `data/apps_custom.json`  
Apps personalizados adicionados manualmente:
```json
{
  \"name\": \"Portable App\",
  \"path\": \"D:\\\\Tools\\\\app.exe\",
  \"category\": \"Utility\",
  \"tags\": [\"portable\", \"tool\"]
}
```

#### `data/links_web.json`
Bookmarks web organizados:
```json
{
  \"name\": \"GitHub\",
  \"url\": \"https://github.com\",
  \"category\": \"Development\",
  \"tags\": [\"git\", \"repository\"],
  \"favicon\": \"https://github.com/favicon.ico\"
}
```

### Gestão de Dados

#### Atualização Automática
- **Scan Start Menu** executa automaticamente (Windows)
- **Deteção de mudanças** em apps instalados/removidos
- **Backup automático** antes de atualizações

#### Gestão Manual
- **Editar ficheiros JSON** diretamente para apps personalizados
- **Importar bookmarks** de browsers suportados
- **Validação automática** da integridade dos dados

---

## 🏗️ Arquitetura Técnica

### Estrutura do Projeto

```
Nexo_Dashboard/
├── 📁 src/                      # Código fonte principal
│   ├── 🎯 main.js              # Processo principal Electron
│   ├── 🖥️ renderer.js          # Lógica da interface (Phase 2)
│   ├── 🌐 index.html           # Template HTML responsive
│   └── 🎨 style.css            # Styling moderno com themes
├── 📁 data/                     # Dados de configuração
│   ├── 📝 apps_startmenu.json  # Apps do sistema (auto-generated)
│   ├── 📝 apps_custom.json     # Apps personalizados
│   └── 📝 links_web.json       # Bookmarks web
├── 📁 utils/                    # Utilitários cross-platform
│   ├── 🛠️ path-resolver.js     # Resolução dinâmica de paths
│   ├── 📊 logger.js            # Sistema de logging
│   └── ⚠️ error-handler.js     # Gestão de erros
├── 📁 scripts/                  # Scripts de automação
│   ├── 🔍 scan_startmenu.ps1   # Scanner PowerShell (Windows)
│   ├── 🎨 extract_icons.py     # Extração de ícones
│   ├── 🔖 extract_bookmarks.py # Importação de bookmarks
│   └── 🔄 backup_system.js     # Sistema de backup
├── 📁 assets/                   # Assets estáticos
│   ├── 🖼️ icon.png             # Ícone da aplicação
│   └── 📁 icons/               # Ícones de apps/links
├── 📋 package.json              # Configuração npm/Electron
├── 🗺️ ROADMAP.md               # Roadmap técnico detalhado
└── 📚 README.md                 # Esta documentação
```

### Tecnologias Utilizadas

- **🖥️ Electron** - Framework cross-platform
- **🎨 HTML5/CSS3** - Interface moderna e responsiva
- **⚡ JavaScript ES6+** - Lógica de aplicação
- **🗂️ JSON** - Armazenamento de configurações
- **🔧 Node.js** - Runtime e utilitários
- **🎯 PowerShell** - Integração Windows (opcional)
- **🐍 Python** - Scripts de processamento (opcional)

---

## 🔧 Desenvolvimento e Customização

### Scripts NPM Disponíveis

```bash
npm run start          # Executar em desenvolvimento
npm run build          # Construir para distribuição  
npm run pack           # Empacotar aplicação
npm run dist           # Criar instaladores
npm run clean          # Limpar builds anteriores
```

### Configuração de Desenvolvimento

#### Variáveis de Ambiente
```bash
NODE_ENV=development    # Ativar DevTools
NEXO_DATA_PATH=./data  # Path personalizado para dados
NEXO_LOG_LEVEL=debug   # Nível de logging
```

#### Debugging
- **DevTools automático** em modo desenvolvimento
- **Console logging** estruturado
- **Error tracking** com stack traces
- **Performance monitoring** incorporado

### Extensibilidade

#### Adicionar Novas Categorias
Editar `src/renderer.js` - método `getCategoryForTag()`:
```javascript
const categoryMap = {
    'development': ['code', 'programming', 'ide'],
    'productivity': ['office', 'text', 'document'],
    'nova_categoria': ['keyword1', 'keyword2']
};
```

#### Personalizar Temas
Modificar `src/style.css` - variáveis CSS:
```css
:root {
    --primary-color: #2196f3;
    --success-color: #4caf50;
    --custom-color: #your-color;
}
```

---

## 🌐 Compatibilidade Cross-Platform

### Windows (Recomendado)
- ✅ **Funcionalidade completa** incluindo scan automático
- ✅ **PowerShell integration** para Start Menu
- ✅ **Icon extraction** nativo
- ✅ **Registry access** para metadados

### macOS  
- ⚠️ **Funcionalidade core** disponível
- ⚠️ **Gestão manual** de aplicações
- ⚠️ **Scripts adaptados** necessários

### Linux
- ⚠️ **Funcionalidade básica** operacional  
- ⚠️ **Apps detection** manual/custom
- ⚠️ **Desktop files** parsing (futuro)

---

## 🔍 Troubleshooting

### Problemas Comuns

#### Dashboard não inicia
```bash
# Verificar dependências
npm install --force

# Limpar cache npm
npm cache clean --force

# Verificar versão Node.js
node --version  # Deve ser >=14
```

#### Dados não carregam
1. Verificar existência dos ficheiros em `data/`
2. Validar formato JSON com ferramentas online
3. Verificar permissões de leitura dos ficheiros
4. Consultar logs em DevTools (F12)

#### Performance lenta
1. Reduzir **search delay** nas configurações
2. Limitar número de **apps/bookmarks** ativos
3. Desativar **animações** se necessário
4. Fechar outras aplicações Electron

#### Temas não funcionam
1. Verificar **localStorage** disponível no browser
2. **Reset settings** através do painel de configurações
3. **Restart aplicação** após mudanças de tema

### Logs e Debugging

#### Localização dos Logs
- **Console:** DevTools (F12) → Console
- **Ficheiros:** `logs/nexo-dashboard-YYYY-MM-DD.log`

#### Ativar Modo Debug
```bash
NODE_ENV=development npm run start
```

---

## 🤝 Contribuições

Contribuições são bem-vindas! Segue estas diretrizes:

### Como Contribuir

1. **Fork** o repositório
2. **Criar branch** para a funcionalidade (`git checkout -b feature/nova-funcionalidade`)
3. **Commit** das mudanças (`git commit -m 'Adicionar nova funcionalidade'`)
4. **Push** para o branch (`git push origin feature/nova-funcionalidade`)
5. **Abrir Pull Request** com descrição detalhada

### Diretrizes de Código

- **Seguir** convenções JavaScript ES6+
- **Comentar** código complexo
- **Testar** funcionalidades novas
- **Manter** performance otimizada
- **Respeitar** arquitetura existente

---

## 📈 Roadmap Futuro

### Phase 3: Intelligence & Automation
- 🤖 **AI-powered categorization** de apps
- 📊 **Usage analytics** e tracking
- 🔄 **Automated cleanup** de shortcuts órfãos
- 🔔 **Smart notifications** para novas apps
- 🖥️ **CLI interface** para automação

### Phase 4: Advanced Features  
- 👥 **Multi-profile support** 
- ☁️ **Cloud sync** com encriptação
- 🎨 **Advanced theming** engine
- ♿ **Accessibility** melhorada
- 📊 **Advanced reporting**

### Phase 5: Distribution
- 📦 **Standalone executables**
- 🔄 **Auto-updater** system
- 📱 **Desktop integration**
- 🏢 **Enterprise deployment**

---

## 👤 Maintainer

**Nuno Salvação**  
📧 [nexo-modeling@outlook.com](mailto:nexo-modeling@outlook.com)  
🐙 [GitHub Profile](https://github.com/nsalvacao)

---

## 📄 Licença

Este projeto está licenciado sob **MIT License** - uma licença permissiva que permite uso comercial, modificação e distribuição.

Consultar o ficheiro [LICENSE](LICENSE) para detalhes completos.

---

## 🙏 Agradecimentos

- **[Electron Team](https://electronjs.org/)** - Framework fantástico
- **[Node.js Community](https://nodejs.org/)** - Runtime robusto  
- **Open Source Community** - Inspiração e ferramentas

---

## 🗑️ Desinstalação

### Remoção Completa

1. **Eliminar pasta** da aplicação
2. **Limpar configurações** do utilizador:
   ```bash
   # Windows
   rmdir /s %APPDATA%\Nexo_Dashboard
   
   # macOS  
   rm -rf ~/Library/Preferences/com.nexo.dashboard.plist
   
   # Linux
   rm -rf ~/.config/Nexo_Dashboard
   ```
3. **Limpar LocalStorage** do browser (automático)

---

*Desenvolvido com ❤️ por Nuno Salvação | Julho 2025*