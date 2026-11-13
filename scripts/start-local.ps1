param([switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
# A caller using PowerShell 7 may pass a module path that omits Windows PowerShell's built-ins.
# This only changes this launcher process, never the user's saved environment.
$env:PSModulePath = (Join-Path $PSHOME 'Modules') + ';' + $env:PSModulePath

# Official Node.js LTS archive checksums, pinned with the app (2026-11-13).
# https://nodejs.org/dist/v22.23.5/SHASUMS256.txt
$script:NodeVersion = '22.23.5'
$script:NodeHashes = @{
    x64 = '4a191082e9706866830379d577d2cc8a50c776fcd9436a8d061b063ed0d9a0e3'
    arm64 = 'c1856817f611738c77534efbff8a5a17990593eab24046bc8d2c23a77a160d13'
}

function Test-NodeRuntime([string]$NodePath) {
    if (-not (Test-Path -LiteralPath $NodePath -PathType Leaf)) { return $false }
    if (-not (Test-Path -LiteralPath (Join-Path (Split-Path $NodePath) 'node_modules/npm/bin/npm-cli.js'))) { return $false }
    try {
        $version = & $NodePath --version 2>$null
        if ($LASTEXITCODE -ne 0 -or $version -notmatch '^v(22|24|26)\.(\d+)\.(\d+)$') { return $false }
        return [version]$version.TrimStart('v') -ge [version]'22.19.0'
    } catch { return $false }
}

function Assert-ArchiveHash([string]$Path, [string]$Expected) {
    if ((Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash -ne $Expected) {
        throw 'Node.js download verification failed. The archive was not installed. Check your connection and run the batch again.'
    }
}

function Assert-RuntimeChild([string]$Path, [string]$RuntimeRoot) {
    $resolvedRoot = [IO.Path]::GetFullPath($RuntimeRoot).TrimEnd('\') + '\'
    $resolvedTarget = [IO.Path]::GetFullPath($Path)
    if (-not $resolvedTarget.StartsWith($resolvedRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe runtime cleanup path.' }
    if ((Get-Item -LiteralPath $RuntimeRoot).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'The runtime folder must not be a linked folder.' }
}

function Get-LocalNode([string]$RuntimeRoot) {
    $architecture = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
    $arch = switch ($architecture) { 'ARM64' { 'arm64' } 'AMD64' { 'x64' } default { throw 'This launcher requires 64-bit Windows (x64 or ARM64).' } }
    $name = "node-v$script:NodeVersion-win-$arch"
    $runtimeDir = Join-Path $RuntimeRoot $name
    $localNode = Join-Path $runtimeDir 'node.exe'
    if (Test-NodeRuntime $localNode) { return $localNode }

    $installedNode = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($installedNode -and (Test-NodeRuntime $installedNode.Source)) { return $installedNode.Source }

    Write-Host '[1/3] Preparing Node.js in this app folder. No administrator access is required.'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $staging = Join-Path $RuntimeRoot ('.download-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $staging | Out-Null
    try {
        $archive = Join-Path $staging "$name.zip"
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -UseBasicParsing -Uri "https://nodejs.org/dist/v$script:NodeVersion/$name.zip" -OutFile $archive -TimeoutSec 180
        Assert-ArchiveHash $archive $script:NodeHashes[$arch]
        Expand-Archive -LiteralPath $archive -DestinationPath $staging
        $unpacked = Join-Path $staging $name
        if (-not (Test-NodeRuntime (Join-Path $unpacked 'node.exe'))) { throw 'The downloaded Node.js runtime could not start.' }
        Assert-RuntimeChild $runtimeDir $RuntimeRoot
        if (Test-Path -LiteralPath $runtimeDir) { Remove-Item -LiteralPath $runtimeDir -Recurse -Force }
        Assert-RuntimeChild $unpacked $RuntimeRoot
        Move-Item -LiteralPath $unpacked -Destination $runtimeDir
    } finally {
        Assert-RuntimeChild $staging $RuntimeRoot
        if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
    }
    return $localNode
}

function Get-DependencyFingerprint([string]$AppRoot, [string]$NodePath) {
    $lockHash = (Get-FileHash -LiteralPath (Join-Path $AppRoot 'package-lock.json') -Algorithm SHA256).Hash
    $nodeIdentity = & $NodePath -p "process.version + '/' + process.arch"
    if ($LASTEXITCODE -ne 0) { throw 'Node.js could not start.' }
    return "$lockHash/$nodeIdentity"
}

function Test-Dependencies([string]$AppRoot, [string]$NodePath, [string]$Fingerprint) {
    $marker = Join-Path $AppRoot 'node_modules/.monogatari-install'
    if (-not (Test-Path -LiteralPath $marker)) { return $false }
    if ((Get-Content -LiteralPath $marker -Raw).Trim() -ne $Fingerprint) { return $false }
    # Check actual dependencies as well as the marker, including the native esbuild binary.
    try {
        & $NodePath --input-type=module -e "await import('vite'); const e = await import('esbuild'); e.transformSync('let x=1');" 2>$null | Out-Null
        return $LASTEXITCODE -eq 0
    } catch { return $false }
}

function Start-Monogatari([string]$AppRoot, [bool]$OpenBrowser) {
    $AppRoot = (Resolve-Path -LiteralPath $AppRoot).Path
    Set-Location -LiteralPath $AppRoot
    foreach ($file in @('package.json', 'package-lock.json', 'vite.config.js', 'src/main.js')) {
        if (-not (Test-Path -LiteralPath (Join-Path $AppRoot $file))) { throw 'Extract the entire ZIP before running the batch. Required app files are missing.' }
    }
    $runtimeRoot = Join-Path $AppRoot '.runtime'
    New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
    try { $setupLock = [IO.File]::Open((Join-Path $runtimeRoot 'setup.lock'), 'OpenOrCreate', 'ReadWrite', 'None') }
    catch { throw 'Setup is already running in this folder. Wait for that window to finish.' }
    $originalPath = $env:Path
    try {
        try {
            $nodePath = Get-LocalNode $runtimeRoot
            $npmCli = Join-Path (Split-Path $nodePath) 'node_modules/npm/bin/npm-cli.js'
            $env:Path = (Split-Path $nodePath) + ';' + $env:Path
            $fingerprint = Get-DependencyFingerprint $AppRoot $nodePath
            if (-not (Test-Dependencies $AppRoot $nodePath $fingerprint)) {
                Write-Host '[2/3] Installing app dependencies. An Internet connection is required on the first run.'
                & $nodePath $npmCli ci --no-audit --no-fund
                if ($LASTEXITCODE -ne 0) { throw 'Dependency setup failed. Check your Internet connection and disk space, then run the batch again.' }
                Set-Content -LiteralPath (Join-Path $AppRoot 'node_modules/.monogatari-install') -Value $fingerprint -Encoding ASCII
                if (-not (Test-Dependencies $AppRoot $nodePath $fingerprint)) { throw 'Installed dependencies could not start. Run the batch again to repair them.' }
            }
            & $nodePath $npmCli run check:runtime
            if ($LASTEXITCODE -ne 0) { throw 'Bundled model settings are missing or invalid. Download and extract the complete source ZIP again.' }
        } finally { $setupLock.Dispose() }

        Write-Host '[3/3] Opening http://127.0.0.1:5180/viral-radar/'
        Write-Host '[INFO] Enter your own API keys in the app. Keep this window open while using the app.'
        $viteArguments = @((Join-Path $AppRoot 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5180', '--strictPort')
        if ($OpenBrowser) { $viteArguments += '--open' }
        & $nodePath @viteArguments
        if ($LASTEXITCODE -ne 0) { throw 'The app could not start. If port 5180 is already in use, close its previous launcher window and try again.' }
    } finally { $env:Path = $originalPath }
}

if ($MyInvocation.InvocationName -ne '.') {
    try { Start-Monogatari (Split-Path $PSScriptRoot -Parent) (-not $NoBrowser) }
    catch { Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
}
