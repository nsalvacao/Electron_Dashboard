# path-helper.ps1
# Cross-platform path resolution helper for PowerShell scripts
# Part of Phase 0.6: Portability & Path Resolution

param(
    [string]$ConfigPath = ""
)

function Get-ProjectRoot {
    param([string]$StartPath = $PSScriptRoot)
    
    # Check environment variable first
    if ($env:NEXO_DASHBOARD_PATH) {
        return $env:NEXO_DASHBOARD_PATH
    }
    
    $currentPath = $StartPath
    while ($currentPath -ne (Split-Path $currentPath -Parent)) {
        $packageJsonPath = Join-Path -Path $currentPath -ChildPath "package.json"
        $roadmapPath = Join-Path -Path $currentPath -ChildPath "ROADMAP.md"
        
        if ((Test-Path $packageJsonPath) -or (Test-Path $roadmapPath)) {
            return $currentPath
        }
        
        $currentPath = Split-Path $currentPath -Parent
    }
    
    # Fallback to script directory's parent
    return Split-Path $PSScriptRoot -Parent
}

function Get-NexoConfig {
    param([string]$ProjectRoot)
    
    $configPath = Join-Path -Path $ProjectRoot -ChildPath "config.json"
    
    if (Test-Path $configPath) {
        try {
            $config = Get-Content -Path $configPath -Raw | ConvertFrom-Json
            return $config
        } catch {
            Write-Warning "Failed to load config.json, using defaults: $($_.Exception.Message)"
        }
    }
    
    # Default configuration
    return @{
        dataPath = "./data"
        assetsPath = "./assets"
        logsPath = "./0_Electron_Docs_Reference/Dev_Logs"
        iconsPath = "./assets/icons"
        backupPath = "./data/backups"
    }
}

function Resolve-NexoPath {
    param(
        [string]$RelativePath,
        [string]$ProjectRoot
    )
    
    if ([System.IO.Path]::IsPathRooted($RelativePath)) {
        return $RelativePath
    }
    
    return Join-Path -Path $ProjectRoot -ChildPath $RelativePath
}

function Get-NexoPaths {
    $projectRoot = Get-ProjectRoot
    $config = Get-NexoConfig -ProjectRoot $projectRoot
    
    $paths = @{
        Root = $projectRoot
        Data = Resolve-NexoPath -RelativePath $config.dataPath -ProjectRoot $projectRoot
        Assets = Resolve-NexoPath -RelativePath $config.assetsPath -ProjectRoot $projectRoot
        Logs = Resolve-NexoPath -RelativePath $config.logsPath -ProjectRoot $projectRoot
        Icons = Resolve-NexoPath -RelativePath $config.iconsPath -ProjectRoot $projectRoot
        Backup = Resolve-NexoPath -RelativePath $config.backupPath -ProjectRoot $projectRoot
    }
    
    # Ensure directories exist
    foreach ($path in $paths.Values) {
        if (-not (Test-Path $path)) {
            New-Item -Path $path -ItemType Directory -Force | Out-Null
        }
    }
    
    return $paths
}

function Get-DataFilePath {
    param([string]$Filename)
    $paths = Get-NexoPaths
    return Join-Path -Path $paths.Data -ChildPath $Filename
}

function Get-LogFilePath {
    param([string]$Filename)
    $paths = Get-NexoPaths
    return Join-Path -Path $paths.Logs -ChildPath $Filename
}

function Get-AssetsFilePath {
    param([string]$Filename)
    $paths = Get-NexoPaths
    return Join-Path -Path $paths.Assets -ChildPath $Filename
}

function Get-IconFilePath {
    param([string]$Filename)
    $paths = Get-NexoPaths
    return Join-Path -Path $paths.Icons -ChildPath $Filename
}

function Get-BackupFilePath {
    param([string]$Filename)
    $paths = Get-NexoPaths
    return Join-Path -Path $paths.Backup -ChildPath $Filename
}

# Export functions if script is dot-sourced
Export-ModuleMember -Function Get-ProjectRoot, Get-NexoConfig, Resolve-NexoPath, Get-NexoPaths, Get-DataFilePath, Get-LogFilePath, Get-AssetsFilePath, Get-IconFilePath, Get-BackupFilePath