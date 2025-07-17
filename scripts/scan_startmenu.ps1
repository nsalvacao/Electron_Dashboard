<#
.SYNOPSIS
    Scans the Windows Start Menu for applications, extracts metadata, and outputs to a JSON file.

.DESCRIPTION
    This script scans the Start Menu paths for both the current user and all users to find .lnk shortcuts.
    It extracts detailed information about the target application, including name, path, version, and publisher.
    The script filters out uninstallers, validates application paths, and handles broken shortcuts gracefully.
    The final output is a deduplicated JSON file, formatted according to the Nexo Dashboard schema.

    Key Features:
    - Scans user and system Start Menu folders.
    - Extracts metadata (Version, Publisher, etc.).
    - Automatically generates tags from the shortcut's folder path.
    - Filters common uninstaller shortcuts.
    - Validates that the target application executable exists.
    - Backs up the previous data file before writing.
    - Provides detailed logging for diagnostics.
    - Supports incremental checks to avoid unnecessary file writes.

.PARAMETER OutputPath
    Specifies the full path for the output JSON file.
    Default: C:\GitHub\Nexo_Dashboard\data\apps_startmenu.json

.PARAMETER LogPath
    Specifies the directory for the log file.
    Default: C:\GitHub\Nexo_Dashboard\0_Electron_Docs_Reference\Dev_Logs

.PARAMETER IncrementalOnly
    If specified, the script will only write the output file if changes are detected compared to the existing file.

.EXAMPLE
    # Perform a full scan and overwrite the default JSON output file.
    .\scan_startmenu.ps1

.EXAMPLE
    # Perform a scan and write to a custom path, with verbose console output.
    .\scan_startmenu.ps1 -OutputPath "C:\temp\my_apps.json" -Verbose

.EXAMPLE
    # Perform a scan but only update the JSON file if there are any changes.
    .\scan_startmenu.ps1 -IncrementalOnly

.NOTES
    Author: Nexo (Gemini Agent)
    Project: Nexo Dashboard
    Phase: 0.5
    Date: 2025-07-16
#>
param(
    [string]$OutputPath = "C:\GitHub\Nexo_Dashboard\data\apps_startmenu.json",
    [string]$LogPath = "C:\GitHub\Nexo_Dashboard\0_Electron_Docs_Reference\Dev_Logs",
    [switch]$IncrementalOnly
)

# --- SCRIPT CONFIGURATION ---
$global:LogFile = Join-Path -Path $LogPath -ChildPath "nexo_startmenu_scanner_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
$wshell = New-Object -ComObject WScript.Shell

# --- HELPER FUNCTIONS ---

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    $logEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] - $Message"
    # The Start-Transcript cmdlet captures all console output, so Write-Host is sufficient.
    # This avoids file locking issues with Add-Content.
    Write-Host $logEntry
}

function Backup-PreviousData {
    param([string]$FilePath)
    if (Test-Path $FilePath) {
        $backupPath = "$FilePath.bak"
        Copy-Item -Path $FilePath -Destination $backupPath -Force
        Write-Log "Backup created at $backupPath"
    }
}

function Test-AppPath {
    param([string]$Path)
    if (-not $Path -or -not (Test-Path $Path -PathType Leaf)) {
        return $false
    }
    # Further checks could be added, e.g., for file extensions.
    return $true
}

function Format-AppData {
    param(
        [Parameter(Mandatory=$true)]
        [System.IO.FileInfo]$Shortcut,
        [Parameter(Mandatory=$true)]
        [string]$TargetPath,
        [Parameter(Mandatory=$true)]
        [string]$BasePath
    )
    try {
        $fileInfo = Get-Item -Path $TargetPath
        # Not all files have version info; handle this gracefully.
        $versionInfo = (Get-Command $TargetPath -ErrorAction SilentlyContinue).VersionInfo

        # Create tags from the relative directory structure.
        # Replace the base Start Menu path to get the relative path, then split into tags.
        $relativeDirPath = $Shortcut.DirectoryName.Replace($BasePath, "").TrimStart([System.IO.Path]::DirectorySeparatorChar)
        $tags = @() # Initialize as empty array
        if ($relativeDirPath) {
            $tags = $relativeDirPath.Split([System.IO.Path]::DirectorySeparatorChar) | Where-Object { $_ }
        }
        if ($tags.Count -eq 0) { $tags = @("General") } # Ensure tags array is not empty
        $category = $tags | Select-Object -First 1
        if (-not $category) { $category = "General" }

        return [PSCustomObject]@{
            name           = if ($Shortcut.BaseName) { $Shortcut.BaseName } else { $fileInfo.Name }
            path           = $fileInfo.FullName
            version        = if ($versionInfo -and $versionInfo.ProductVersion) { $versionInfo.ProductVersion.Trim() } else { $null }
            publisher      = if ($versionInfo -and $versionInfo.CompanyName) { $versionInfo.CompanyName.Trim() } else { $null }
            tags           = @($tags) # Ensure it's always an array
            category       = [string]$category
            lastModified   = $fileInfo.LastWriteTimeUtc.ToString("o") # ISO 8601
            fileSize       = $fileInfo.Length
        }
    } catch {
        Write-Log "Failed to format metadata for '$($Shortcut.Name)'. Target: '$TargetPath'. Error: $($_.Exception.Message)" -Level "WARN"
        return $null
    }
}

function Get-StartMenuApps {
    Write-Log "Starting Start Menu scan..."
    $startMenuPaths = @(
        [System.Environment]::GetFolderPath('StartMenu'),
        [System.Environment]::GetFolderPath('CommonStartMenu')
    ) | ForEach-Object { Join-Path -Path $_ -ChildPath "Programs" } | Where-Object { Test-Path $_ }

    $allAppsRaw = foreach ($basePath in $startMenuPaths) {
        Write-Log "Scanning directory: $basePath"
        Get-ChildItem -Path $basePath -Recurse -Filter "*.lnk" -ErrorAction SilentlyContinue | ForEach-Object {
            $shortcut = $_
            # Filter out common uninstallers and help links by name (English and Portuguese)
            if ($shortcut.Name -like "*uninstall*" -or $shortcut.Name -like "Desinstalar*" -or $shortcut.Name -like "*help*" -or $shortcut.Name -like "*documentation*") {
                Write-Log "Skipping filtered shortcut: $($shortcut.Name)"
                return
            }

            $targetPath = $null
            try {
                $targetPath = $wshell.CreateShortcut($shortcut.FullName).TargetPath
            } catch {
                Write-Log "Could not resolve shortcut: $($shortcut.FullName). Error: $($_.Exception.Message)" -Level "WARN"
                return
            }

            if (-not (Test-AppPath -Path $targetPath)) {
                Write-Log "Skipping invalid or non-existent target: '$targetPath' for shortcut '$($shortcut.Name)'"
                return
            }

            # Pass the base path to correctly calculate relative paths for tags
            Format-AppData -Shortcut $shortcut -TargetPath $targetPath -BasePath $basePath
        }
    }
    $allApps = $allAppsRaw | Where-Object { $_ } # Filter out any null results from Format-AppData
    
    # Deduplication: Prioritize unique application paths
    Write-Log "Scan complete. Found $($allApps.Count) raw entries. Deduplicating..."
    $uniqueApps = $allApps | Sort-Object -Property path -Unique
    Write-Log "Deduplication complete. Final count: $($uniqueApps.Count)."
    
    return $uniqueApps
}

# --- MAIN EXECUTION ---

# 1. Setup Environment
New-Item -Path $LogPath -ItemType Directory -Force -ErrorAction SilentlyContinue | Out-Null
New-Item -Path (Split-Path $OutputPath -Parent) -ItemType Directory -Force -ErrorAction SilentlyContinue | Out-Null
Start-Transcript -Path $global:LogFile -Append

Write-Log "Nexo Start Menu Scanner - Initializing..."
Write-Log "Output Path: $OutputPath"
Write-Log "Log File: $($global:LogFile)"
if ($IncrementalOnly) { Write-Log "IncrementalOnly flag is set. Will only write on change." }

# 2. Get Existing Data for Comparison (if Incremental)
$oldContent = ""
if ($IncrementalOnly -and (Test-Path $OutputPath)) {
    $oldContent = Get-Content -Path $OutputPath -Raw
    Write-Log "Existing data file found. Stored for comparison."
}

# 3. Backup and Scan
Backup-PreviousData -FilePath $OutputPath
$apps = Get-StartMenuApps

# 4. Convert to JSON
$jsonOutput = $apps | ConvertTo-Json -Depth 5

# 5. Write Output File (if needed)
$shouldWrite = $true
if ($IncrementalOnly -and $oldContent) {
    # Simple string comparison is fast and effective for this use case
    if ($jsonOutput -eq $oldContent) {
        $shouldWrite = false
        Write-Log "No changes detected. Skipping file write."
    } else {
        Write-Log "Changes detected. Proceeding with file write."
    }
}

if ($shouldWrite) {
    try {
        $jsonOutput | Out-File -FilePath $OutputPath -Encoding utf8 -Force
        Write-Log "Successfully wrote $($apps.Count) applications to $OutputPath"
    } catch {
        Write-Log "FATAL: Could not write to output file '$OutputPath'. Error: $($_.Exception.Message)" -Level "ERROR"
    }
}

Write-Log "Script finished."
Stop-Transcript
