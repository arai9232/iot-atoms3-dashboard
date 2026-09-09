# WSL2内で動くNext.js(npm run dev, port 3000)をLAN上の他端末(AtomS3など)から
# 見えるようにするためのポート転送設定。
#
# 使い方: PowerShellを「管理者として実行」で開き、このスクリプトを実行する。
#   powershell -ExecutionPolicy Bypass -File wsl-port-forward.ps1
#
# WSL2の内部IPは再起動のたびに変わるため、PCを再起動した後や
# WSLを再起動した後は、このスクリプトを再実行すること。

$port = 3000

$wslIp = (wsl hostname -I).Trim().Split(" ")[0]
if (-not $wslIp) {
    Write-Host "WSLのIPアドレスを取得できませんでした。WSLが起動しているか確認してください。"
    exit 1
}

netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$wslIp

$ruleName = "WSL Next.js $port"
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port | Out-Null
}

Write-Host "転送設定完了: 0.0.0.0:$port -> $wslIp`:$port"
Write-Host ""
Write-Host "AtomS3のスケッチに設定するPCのLAN IPアドレス候補:"
Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.InterfaceAlias -notmatch "Loopback|vEthernet|WSL" } |
    Select-Object InterfaceAlias, IPAddress |
    Format-Table -AutoSize
