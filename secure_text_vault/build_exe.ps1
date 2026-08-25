$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$distDirectory = Join-Path $projectRoot "dist"
$buildDirectory = Join-Path $projectRoot "build"

Set-Location -LiteralPath $projectRoot

python -m PyInstaller --version | Out-Host
if ($LASTEXITCODE -ne 0) {
    throw "PyInstaller is not installed. Run: python -m pip install -r requirements-build.txt"
}

$pyinstallerArguments = @(
    "--onefile"
    "--console"
    "--clean"
    "--noconfirm"
    "--name", "secure_text"
    "--distpath", $distDirectory
    "--workpath", $buildDirectory
    "--specpath", $buildDirectory
    "secure_text.py"
)

python -m PyInstaller @pyinstallerArguments
if ($LASTEXITCODE -ne 0) {
    throw "PyInstaller build failed."
}

Copy-Item -LiteralPath (Join-Path $projectRoot "README.md") -Destination $distDirectory -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "questions.example.json") -Destination $distDirectory -Force

$executable = Join-Path $distDirectory "secure_text.exe"
if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) {
    throw "Expected executable was not created: $executable"
}

Write-Output "Build completed: $executable"
Write-Output "Distribution files: $distDirectory"
