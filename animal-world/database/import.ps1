Set-Location $PSScriptRoot
$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
if (-not (Test-Path $mysqlPath)) {
    $found = Get-ChildItem "C:\Program Files" -Recurse -Filter "mysql.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $mysqlPath = $found.FullName }
}
Write-Host "Importing animal_world. Enter root password:"
Get-Content .\init-mysql.sql -Raw -Encoding UTF8 | & $mysqlPath -u root -p
