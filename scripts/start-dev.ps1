Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDirectory = Join-Path $repoRoot "backend"
$frontendDirectory = Join-Path $repoRoot "frontend"
$backendEnvironment = Join-Path $backendDirectory ".env"
$backendOutput = Join-Path ([System.IO.Path]::GetTempPath()) "kai-pool-backend-$PID.out.log"
$backendErrors = Join-Path ([System.IO.Path]::GetTempPath()) "kai-pool-backend-$PID.err.log"
$backendProcess = $null

function Stop-Backend {
    if ($null -ne $backendProcess -and -not $backendProcess.HasExited) {
        & taskkill.exe /PID $backendProcess.Id /T /F 2>$null | Out-Null
    }
}

function Show-BackendLogs {
    if (Test-Path $backendOutput) {
        Get-Content $backendOutput -Tail 30
    }
    if (Test-Path $backendErrors) {
        Get-Content $backendErrors -Tail 30
    }
}

function Get-LocalIPv4Address {
    $addresses = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
        Where-Object {
            $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
            -not [System.Net.IPAddress]::IsLoopback($_)
        }

    $privateAddress = $addresses |
        Where-Object {
            $_.IPAddressToString -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)'
        } |
        Select-Object -First 1

    if ($null -ne $privateAddress) {
        return $privateAddress.IPAddressToString
    }
    return ($addresses | Select-Object -First 1).IPAddressToString
}

function Import-DotEnv([string]$path) {
    foreach ($line in Get-Content $path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#") -or -not $trimmed.Contains("=")) {
            continue
        }

        $separator = $trimmed.IndexOf("=")
        $name = $trimmed.Substring(0, $separator).Trim()
        $value = $trimmed.Substring($separator + 1).Trim()
        if ($value.Length -ge 2 -and (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'")))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

try {
    if (-not (Test-Path $backendEnvironment)) {
        throw "backend\.env is missing. Complete the one-time Supabase and AI setup first."
    }

    Import-DotEnv $backendEnvironment
    foreach ($requiredVariable in @("DB_URL", "DB_USERNAME", "DB_PASSWORD", "JWT_SECRET", "AI_API_KEY")) {
        $value = [System.Environment]::GetEnvironmentVariable($requiredVariable, "Process")
        if ([string]::IsNullOrWhiteSpace($value) -or $value -match 'YOUR_|PROJECT_REFERENCE|replace-with') {
            throw "$requiredVariable is missing from backend\.env."
        }
    }

    foreach ($command in @("java", "node", "npm")) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "$command is not installed or is not available in PATH."
        }
    }

    if (-not (Test-Path (Join-Path $frontendDirectory "node_modules"))) {
        Write-Host "Installing frontend packages..."
        Push-Location $frontendDirectory
        try {
            & npm.cmd install
            if ($LASTEXITCODE -ne 0) {
                throw "Frontend package installation failed."
            }
        } finally {
            Pop-Location
        }
    }

    Write-Host "Starting Kai Pool backend..."
    $backendProcess = Start-Process `
        -FilePath "cmd.exe" `
        -ArgumentList "/d", "/c", "gradlew.bat bootRun" `
        -WorkingDirectory $backendDirectory `
        -WindowStyle Hidden `
        -RedirectStandardOutput $backendOutput `
        -RedirectStandardError $backendErrors `
        -PassThru

    $backendReady = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        if ($backendProcess.HasExited) {
            break
        }
        try {
            Invoke-RestMethod "http://127.0.0.1:8080/api/health" -TimeoutSec 1 | Out-Null
            $backendReady = $true
            break
        } catch {
            Start-Sleep -Seconds 1
        }
    }

    if (-not $backendReady) {
        Show-BackendLogs
        throw "The backend did not start. Check the messages above."
    }

    $localAddress = Get-LocalIPv4Address
    if ([string]::IsNullOrWhiteSpace($localAddress)) {
        throw "Could not find this computer's local IP address."
    }

    $env:EXPO_PUBLIC_API_URL = "http://${localAddress}:8080"
    Write-Host "Backend ready at $env:EXPO_PUBLIC_API_URL"
    Write-Host "Starting Expo. Scan the QR code with your iPhone camera."
    Write-Host "Keep this window open. Press Ctrl+C when finished."

    Push-Location $frontendDirectory
    try {
        & npx.cmd expo start --lan
        if ($LASTEXITCODE -ne 0) {
            throw "Expo stopped with an error."
        }
    } finally {
        Pop-Location
    }
} catch {
    Write-Host ""
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    Stop-Backend
}
