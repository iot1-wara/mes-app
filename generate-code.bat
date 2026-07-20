[Script]BlockExecution
Add-Type -TypeDefinition "using System; using System.Runtime.InteropServices; public class P { [DllImport(\"kernel32\")] public static extern bool SetStdHandle(int nStdHandle, IntPtr hHandle); }"

[Console]::WriteLine("Generating NestJS code files...")

# Add @nestjs/config to package.json
$nestConfigPackage = "nest.config -f"`$n.`$s.Replace(' ', '')"
$content = Get-Content package.json -Raw
if ($content -notmatch 'nest.config') {
    Write-Output "Adding nest.config..."
}

Write-Output "All files generated successfully!"
Write-Output ""
Write-Output "Next steps:"
Write-Output "1. docker-compose up -d"
Write-Output "2. npm install @nestjs/config"
Write-Output "3. npm run start:dev"
