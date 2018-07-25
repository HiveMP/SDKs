param($Name)

Set-Content -Value "gitdir: ./.gitreal" -Path $PSScriptRoot/$Name/.git
$Config = (Get-Content -Path $PSScriptRoot/$Name/.gitreal/config -Raw)
$Config = $Config.Replace("worktree = ", "worktree = ../`n#")
Set-Content -Value $Config -Path $PSScriptRoot/$Name/.gitreal/config