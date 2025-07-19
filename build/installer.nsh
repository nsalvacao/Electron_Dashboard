; Custom NSIS installer script for Nexo Dashboard
; This script provides additional customization for the Windows installer

; Install additional components
!macro customInstall
  ; Create additional directories
  CreateDirectory "$INSTDIR\logs"
  CreateDirectory "$INSTDIR\temp"
  CreateDirectory "$INSTDIR\backups"
  
  ; Set proper permissions
  AccessControl::GrantOnFile "$INSTDIR\data" "(S-1-5-32-545)" "FullAccess"
  AccessControl::GrantOnFile "$INSTDIR\logs" "(S-1-5-32-545)" "FullAccess"
  AccessControl::GrantOnFile "$INSTDIR\temp" "(S-1-5-32-545)" "FullAccess"
  AccessControl::GrantOnFile "$INSTDIR\backups" "(S-1-5-32-545)" "FullAccess"
  
  ; Register application
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\Nexo Dashboard.exe" "" "$INSTDIR\Nexo Dashboard.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\Nexo Dashboard.exe" "Path" "$INSTDIR"
  
  ; Add to Windows Features
  WriteRegStr HKLM "Software\Classes\Applications\Nexo Dashboard.exe\FriendlyAppName" "" "Nexo Dashboard"
  WriteRegStr HKLM "Software\Classes\Applications\Nexo Dashboard.exe\DefaultIcon" "" "$INSTDIR\Nexo Dashboard.exe,0"
  
  ; Create protocol handler (optional)
  WriteRegStr HKLM "Software\Classes\nexo" "" "URL:Nexo Protocol"
  WriteRegStr HKLM "Software\Classes\nexo" "URL Protocol" ""
  WriteRegStr HKLM "Software\Classes\nexo\DefaultIcon" "" "$INSTDIR\Nexo Dashboard.exe,0"
  WriteRegStr HKLM "Software\Classes\nexo\shell\open\command" "" '"$INSTDIR\Nexo Dashboard.exe" "%1"'
!macroend

; Uninstall additional components
!macro customUninstall
  ; Remove registry entries
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\Nexo Dashboard.exe"
  DeleteRegKey HKLM "Software\Classes\Applications\Nexo Dashboard.exe"
  DeleteRegKey HKLM "Software\Classes\nexo"
  
  ; Remove additional directories (but preserve user data)
  RMDir /r "$INSTDIR\logs"
  RMDir /r "$INSTDIR\temp"
  ; Note: backups and data directories are preserved
!macroend

; Custom header
!macro customHeader
  !system "echo 'Nexo Dashboard Installer - Custom Configuration Loaded'"
!macroend

; Custom init
!macro customInit
  ; Check Windows version
  ${If} ${AtLeastWin10}
    ; OK
  ${Else}
    MessageBox MB_ICONSTOP "Nexo Dashboard requires Windows 10 or later."
    Quit
  ${EndIf}
  
  ; Check for required dependencies
  ; Add dependency checks here if needed
!macroend