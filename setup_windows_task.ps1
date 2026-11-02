# Windows 任务计划程序自动注册脚本
# 负责在系统后台定期执行订阅刷新 (无需启动网页端)

param (
    [string]$TaskName = "RepoRadar_AutoUpdater",
    [string]$DaysOfWeek = "Sunday",
    [string]$Time = "02:00"
)

$ErrorActionPreference = "Stop"
$WorkingDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonExe = (Get-Command python).Source

Write-Host ">>> 正在配置个人开源项目雷达计划任务..." -ForegroundColor Cyan
Write-Host "工作目录: $WorkingDir"
Write-Host "Python路径: $PythonExe"

$Action = New-ScheduledTaskAction `
    -Execute $PythonExe `
    -Argument "-m repo_radar.subscriptions.monitor" `
    -WorkingDirectory $WorkingDir

$Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $DaysOfWeek -At $Time
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description "个人开源项目雷达定时增量刷新与变更监控任务 (每周日 02:00)" `
    -Force

Write-Host ">>> [成功] 已注册计划任务: $TaskName" -ForegroundColor Green
Write-Host ">>> 即使关闭前端网页，系统也会按计划唤醒监控脚本执行更新。"
