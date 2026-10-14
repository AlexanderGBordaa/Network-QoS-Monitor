[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\alebo\AppData\Local\Android\Sdk", "User")

$currentPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
$sdkPlatformTools = "C:\Users\alebo\AppData\Local\Android\Sdk\platform-tools"
$sdkEmulator = "C:\Users\alebo\AppData\Local\Android\Sdk\emulator"

$parts = $currentPath -split ';' | Where-Object { $_ -ne "" }
$updated = $false

if ($parts -notcontains $sdkPlatformTools) {
    $parts += $sdkPlatformTools
    $updated = $true
}

if ($parts -notcontains $sdkEmulator) {
    $parts += $sdkEmulator
    $updated = $true
}

if ($updated) {
    $newPath = $parts -join ';'
    [System.Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
    Write-Output "PATH y ANDROID_HOME configurados permanentemente."
} else {
    Write-Output "PATH ya incluye las rutas del SDK."
}
