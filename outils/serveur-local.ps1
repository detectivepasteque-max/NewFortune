# =====================================================================
# Petit serveur web local pour tester Nouvelle Fortune sans rien installer
# ---------------------------------------------------------------------
# Usage (clic droit > Exécuter avec PowerShell, ou dans un terminal) :
#     powershell -ExecutionPolicy Bypass -File outils\serveur-local.ps1 8765
# puis ouvrez http://localhost:8765/ dans votre navigateur.
# Ctrl+C pour arrêter. Le jeu fonctionne aussi en double-cliquant sur
# index.html ; ce serveur sert surtout à reproduire un hébergement web.
# =====================================================================
param([int]$Port = 8765)

$racine = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$types = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'; '.md' = 'text/markdown; charset=utf-8'; '.svg' = 'image/svg+xml'
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.ico' = 'image/x-icon'; '.txt' = 'text/plain; charset=utf-8'
}

$ecouteur = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$ecouteur.Start()
Write-Host "Nouvelle Fortune : serveur local sur http://localhost:$Port/  (dossier : $racine)"
Write-Host "Ctrl+C pour arreter."

function Envoyer($flux, [int]$code, [string]$texteCode, [string]$type, [byte[]]$corps) {
  $entete = "HTTP/1.1 $code $texteCode`r`nContent-Type: $type`r`nContent-Length: $($corps.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
  $octets = [System.Text.Encoding]::ASCII.GetBytes($entete)
  $flux.Write($octets, 0, $octets.Length)
  if ($corps.Length -gt 0) { $flux.Write($corps, 0, $corps.Length) }
  $flux.Flush()
}

while ($true) {
  $client = $ecouteur.AcceptTcpClient()
  try {
    $flux = $client.GetStream()
    $flux.ReadTimeout = 3000
    $lecteur = New-Object System.IO.StreamReader($flux, [System.Text.Encoding]::ASCII)
    $ligne = $lecteur.ReadLine()
    if (-not $ligne) { $client.Close(); continue }
    while ($true) { $l = $lecteur.ReadLine(); if ($null -eq $l -or $l -eq '') { break } }
    $parties = $ligne.Split(' ')
    $chemin = if ($parties.Length -ge 2) { $parties[1] } else { '/' }
    $chemin = $chemin.Split('?')[0]
    $chemin = [System.Uri]::UnescapeDataString($chemin)
    if ($chemin.EndsWith('/')) { $chemin += 'index.html' }
    $fichier = Join-Path $racine ($chemin.TrimStart('/').Replace('/', '\'))
    $complet = [System.IO.Path]::GetFullPath($fichier)
    if (-not $complet.StartsWith($racine, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $complet -PathType Leaf)) {
      Envoyer $flux 404 'Not Found' 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes("Introuvable : $chemin"))
    } else {
      $ext = [System.IO.Path]::GetExtension($complet).ToLower()
      $type = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
      Envoyer $flux 200 'OK' $type ([System.IO.File]::ReadAllBytes($complet))
    }
  } catch {
    # connexion coupée : on ignore
  } finally {
    $client.Close()
  }
}
