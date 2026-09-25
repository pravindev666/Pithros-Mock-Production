# Start / stop the local PostgreSQL and Redis development services.
#
#   .\scripts\dev-db.ps1 start
#   .\scripts\dev-db.ps1 stop
#   .\scripts\dev-db.ps1 status
#
# PostgreSQL is launched detached via Start-Process. Calling pg_ctl from a shell
# directly ties the postmaster to that shell, and it is killed when the shell goes
# away — which leaves the cluster needing crash recovery on the next start.

param(
    [Parameter(Position = 0)]
    [ValidateSet('start', 'stop', 'status', 'restart')]
    [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'

$PgRoot = Join-Path $env:USERPROFILE 'scoop\apps\postgresql\current'
$PgData = Join-Path $PgRoot 'data'
$PgCtl = Join-Path $PgRoot 'bin\pg_ctl.exe'
$PgIsReady = Join-Path $PgRoot 'bin\pg_isready.exe'
$RedisServer = Join-Path $env:USERPROFILE 'scoop\apps\redis\current\redis-server.exe'
$RedisCli = Join-Path $env:USERPROFILE 'scoop\apps\redis\current\redis-cli.exe'
$PgLog = Join-Path $env:TEMP 'pithros-pg.log'

function Test-Postgres {
    & $PgIsReady -h localhost -p 5432 *> $null
    return $LASTEXITCODE -eq 0
}

function Test-Redis {
    try {
        return (& $RedisCli -h 127.0.0.1 -p 6379 ping 2>$null) -eq 'PONG'
    } catch {
        return $false
    }
}

function Start-Postgres {
    if (Test-Postgres) {
        Write-Host 'PostgreSQL already running on 5432.'
        return
    }
    if (-not (Test-Path $PgCtl)) {
        Write-Warning "PostgreSQL not found at $PgCtl. Install it with: scoop install postgresql"
        return
    }

    $pidFile = Join-Path $PgData 'postmaster.pid'
    if (Test-Path $pidFile) {
        Write-Host 'Removing a stale postmaster.pid left by an unclean shutdown.'
        Remove-Item $pidFile -Force
    }

    Start-Process -FilePath $PgCtl `
        -ArgumentList '-D', $PgData, '-l', $PgLog, 'start' `
        -WindowStyle Hidden

    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Milliseconds 500
        if (Test-Postgres) {
            Write-Host 'PostgreSQL is accepting connections on 5432.'
            return
        }
    }
    Write-Warning "PostgreSQL did not become ready. See $PgLog"
}

function Stop-Postgres {
    if (-not (Test-Postgres)) {
        Write-Host 'PostgreSQL is not running.'
        return
    }
    Start-Process -FilePath $PgCtl -ArgumentList '-D', $PgData, '-m', 'fast', 'stop' -WindowStyle Hidden
    Start-Sleep -Seconds 2
    Write-Host 'PostgreSQL stopped.'
}

function Start-Redis {
    if (Test-Redis) {
        Write-Host 'Redis already running on 6379.'
        return
    }
    if (-not (Test-Path $RedisServer)) {
        Write-Warning "Redis not found at $RedisServer. Install it with: scoop install redis"
        return
    }

    Start-Process -FilePath $RedisServer `
        -ArgumentList '--port', '6379', '--bind', '127.0.0.1', '--save', '""', '--appendonly', 'no' `
        -WindowStyle Hidden

    Start-Sleep -Seconds 2
    if (Test-Redis) { Write-Host 'Redis is responding on 6379.' }
    else { Write-Warning 'Redis did not start.' }
}

function Stop-Redis {
    if (-not (Test-Redis)) {
        Write-Host 'Redis is not running.'
        return
    }
    & $RedisCli -h 127.0.0.1 -p 6379 shutdown nosave 2>$null | Out-Null
    Write-Host 'Redis stopped.'
}

switch ($Action) {
    'start'   { Start-Postgres; Start-Redis }
    'stop'    { Stop-Redis; Stop-Postgres }
    'restart' { Stop-Redis; Stop-Postgres; Start-Postgres; Start-Redis }
    'status'  {
        Write-Host ("PostgreSQL 5432 : " + $(if (Test-Postgres) { 'up' } else { 'down' }))
        Write-Host ("Redis      6379 : " + $(if (Test-Redis) { 'up' } else { 'down' }))
    }
}
