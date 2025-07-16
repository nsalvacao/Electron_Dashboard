# Script PowerShell para Descoberta Abrangente de Aplicações Instaladas e Portáteis
# Autor: Nexo AI
# Data: 16 de Julho de 2025 (Versão 3.0 - Exclusão de Pastas Problemáticas)

# Este script varre locais comuns no Windows, pastas personalizadas e atalhos
# para encontrar executáveis de aplicações e gerar uma lista inicial para o apps.json.

# --- ATENÇÃO IMPORTANTE ---
# É ALTAMENTE RECOMENDADO EXECUTAR ESTE SCRIPT COMO ADMINISTRADOR
# para aceder a caminhos como "Program Files" e "ProgramData".
# --- FIM DA ATENÇÃO ---

# --- Configurações ---
$outputPath = Join-Path (Get-Location) "data\apps.json" # Caminho de saída para o ficheiro JSON
$appData = @() # Array para armazenar os dados das aplicações

# Caminhos padrão a serem varridos
$standardPaths = @(
    "$env:ProgramFiles", # Requer Admin
    "$env:ProgramFiles(x86)", # Requer Admin
    "$env:LOCALAPPDATA\Programs", # Para apps instaladas a nível de utilizador
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs", # Atalhos do Menu Iniciar (utilizador)
    "$env:USERPROFILE\Desktop" # Atalhos do Desktop do Utilizador
)

# --- Adiciona aqui os teus caminhos personalizados para aplicações portáteis ou outras instalações ---
# Sê o mais específico possível para melhorar o desempenho e evitar erros.
$customPaths = @(
    "C:\Program Files",
    "C:\Program Files (x86)",
    "C:\ProgramData",
    "D:\",
    "C:\Users\nunos\AppData\Local",
    "C:\Users\nunos\AppData\Roaming",
    "C:\Users\nunos", # Nota: Varrer este diretório recursivamente pode ser muito lento e gerar muitos erros de permissão.
    "C:\mingw64\",
    "C:\Macrium\",
    "C:\JANai\",
    "C:\Dev-Cpp\",
    "C:\OpenHardwareMonitor\"
)

# --- Pastas a Excluir (Adiciona aqui qualquer pasta que te dê "Access Denied", mesmo como Admin) ---
# O erro que tiveste: C:\Program Files\Windows Defender Advanced Threat Protection\Classification\Configuration
$foldersToExclude = @(
    "C:\Program Files\Windows Defender Advanced Threat Protection",
    "C:\Program Files\WindowsApps", # Geralmente muito restrito e com muitos links simbólicos
    "$env:SystemRoot", # C:\Windows - Evitar varrer todo o diretório do sistema
    "$env:SystemRoot\System32",
    "$env:SystemRoot\SysWOW64"
    # Adiciona outros caminhos problemáticos aqui
)

# Converter caminhos a excluir para um formato que possa ser usado com -Exclude ou para lógica de salto
$excludedPathsRegex = $foldersToExclude | ForEach-Object { [regex]::Escape($_) } | Join-String -Separator "|"

# --- Funções Auxiliares ---

# Função para resolver o caminho de um atalho (.lnk)
function Resolve-ShortcutPath {
    param (
        [string]$ShortcutPath
    )
    try {
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut($ShortcutPath)
        $targetPath = $shortcut.TargetPath
        $arguments = $shortcut.Arguments # Captura argumentos para PWAs
        return @{ Path = $targetPath; Arguments = $arguments }
    }
    catch {
        Write-Warning "Não foi possível resolver o atalho '$ShortcutPath': $($_.Exception.Message)"
        return $null
    }
}

# Função para adicionar informações da aplicação ao array principal
function Add-ApplicationInfo {
    param (
        [string]$Name,
        [string]$Path,
        [string]$Icon = "",
        [string]$Category = "Desconhecido",
        [array]$Tags = @()
    )

    # Verifica se a aplicação já foi adicionada (pelo caminho) para evitar duplicados
    if (-not ($appData | Where-Object { $_.Path -eq $Path })) {
        $appData += [PSCustomObject]@{
            id = ($Name -replace '[^a-zA-Z0-9]', '' | Select-Object -First 20) + (Get-Random -Maximum 9999) # ID simples e único
            name = $Name
            path = $Path
            icon = $Icon # Placeholder para o nome do ficheiro do ícone
            category = $Category # Placeholder para categoria (será preenchido pela IA)
            tags = $Tags # Placeholder para tags (será preenchido pela IA)
        }
    }
}

# --- Processamento ---

Write-Host "A iniciar a varredura de aplicações..." -ForegroundColor Cyan
Write-Host "Pastas a excluir: $($foldersToExclude -join ", ")" -ForegroundColor Yellow

# 1. Varredura de caminhos padrão e personalizados para executáveis (.exe)
$allPathsToScan = $standardPaths + $customPaths
foreach ($path in $allPathsToScan) {
    if (Test-Path $path) {
        # Verificar se o caminho atual está na lista de exclusão
        if ($foldersToExclude | Where-Object { $path -like "$_*" }) {
            Write-Warning "A ignorar diretório excluído (ou subdiretório): $path"
            continue # Salta para o próximo caminho
        }

        Write-Host "A varrer diretório: $path" -ForegroundColor Green
        try {
            # Usar -Exclude para evitar subdiretórios problemáticos, se possível, ou confiar no Try/Catch
            Get-ChildItem -Path $path -Recurse -File -Include "*.exe" -ErrorAction SilentlyContinue | ForEach-Object {
                # Verificar se o caminho do item encontrado está numa pasta excluída
                $itemPath = $_.FullName
                if ($foldersToExclude | Where-Object { $itemPath -like "$_*" }) {
                    # Write-Host "A ignorar ficheiro em pasta excluída: $itemPath" -ForegroundColor DarkGray # Para depuração
                } else {
                    Add-ApplicationInfo -Name $_.BaseName -Path $_.FullName
                }
            }
        }
        catch {
            # Se um erro ainda ocorrer apesar das exclusões (pode ser subpastas não abrangidas pela exclusão inicial)
            Write-Error "Erro ao varrer '$path': $($_.Exception.Message). Verifica as permissões ou adiciona esta pasta à lista de exclusão."
        }
    } else {
        Write-Warning "Caminho não encontrado ou inacessível: $path"
    }
}

# 2. Varredura de atalhos (.lnk) para aplicações e PWAs
Write-Host "A varrer atalhos do Menu Iniciar e Desktop..." -ForegroundColor Cyan

$shortcutPaths = @(
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs",
    "$env:PUBLIC\Desktop",
    "$env:USERPROFILE\Desktop",
    "$env:LOCALAPPDATA\Microsoft\WindowsApps", # Para apps da Store e PWAs em alguns casos
    "$env:USERPROFILE\AppData\Local\Microsoft\WindowsApps", # Outro local para apps da Store/PWAs
    "$env:USERPROFILE\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Microsoft Edge Apps", # PWAs do Edge
    "$env:USERPROFILE\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Chrome Apps" # PWAs do Chrome
)

foreach ($path in $shortcutPaths) {
    if (Test-Path $path) {
        Write-Host "A varrer atalhos em: $path" -ForegroundColor Green
        try {
            Get-ChildItem -Path $path -Recurse -File -Include "*.lnk" -ErrorAction SilentlyContinue | ForEach-Object {
                $resolvedInfo = Resolve-ShortcutPath -ShortcutPath $_.FullName
                if ($resolvedInfo) {
                    $targetPath = $resolvedInfo.Path
                    $arguments = $resolvedInfo.Arguments

                    # Tenta identificar PWAs com base nos argumentos comuns do Edge/Chrome
                    if ($targetPath -like "*msedge.exe*" -and $arguments -like "*--app-id=*") {
                        $appName = $_.BaseName # Nome do atalho
                        Add-ApplicationInfo -Name "$appName (PWA Edge)" -Path $targetPath -Tags @("web", "pwa", "edge")
                    } elseif ($targetPath -like "*chrome.exe*" -and $arguments -like "*--app-id=*") {
                        $appName = $_.BaseName
                        Add-ApplicationInfo -Name "$appName (PWA Chrome)" -Path $targetPath -Tags @("web", "pwa", "chrome")
                    } elseif ($targetPath -like "*.exe") {
                        # É um atalho para um executável normal
                        Add-ApplicationInfo -Name $_.BaseName -Path $targetPath
                    }
                }
            }
        }
        catch {
            Write-Error "Erro ao varrer atalhos em '$path': $($_.Exception.Message). Tenta executar como Administrador ou adiciona esta pasta à lista de exclusão."
        }
    } else {
        Write-Warning "Caminho de atalho não encontrado ou inacessível: $path"
    }
}

# --- Exportar para JSON ---
Write-Host "A exportar dados para: $outputPath" -ForegroundColor Cyan

if ($appData.Count -gt 0) {
    $appData | ConvertTo-Json -Depth 5 | Set-Content -Path $outputPath -Encoding UTF8 -Force

    Write-Host "`nVarredura concluída. O ficheiro '$outputPath' foi gerado com $($appData.Count) entradas." -ForegroundColor Green
    Write-Host "Revisa o ficheiro '$outputPath' e usa as tuas ferramentas de IA para preencher as categorias e tags." -ForegroundColor Yellow
} else {
    Write-Warning "`nNenhuma aplicação foi encontrada. Verifica os caminhos e as permissões (e a lista de exclusão)."
}
