# ClaycrazE SG Gallery Deploy
# Run from project root

$SG_USER = "u1966-olev38ziybsd"
$SG_HOST = "ssh.claycraze.com"
$SG_PORT = "18765"
$SSH_KEY = "C:\Users\virgi\.ssh\id_ed25519"

$VERSION = Get-Date -Format "yyyyMMddHHmm"

Write-Host "ClaycrazE SG Deploy - version $VERSION"

# Update cache-buster in ovals.html
(Get-Content ".\public\gallery\ovals.html") `
  -replace 'ovals\.js\?v=[0-9A-Za-z._-]+', "ovals.js?v=$VERSION" |
  Set-Content ".\public\gallery\ovals.html"

# Upload files to SiteGround
scp -P $SG_PORT -i $SSH_KEY `
  ".\public\js\ovals.js" `
  "${SG_USER}@${SG_HOST}:/home/customer/www/claycraze.com/public_html/js/"

scp -P $SG_PORT -i $SSH_KEY `
  ".\public\gallery\ovals.html" `
  "${SG_USER}@${SG_HOST}:/home/customer/www/claycraze.com/public_html/gallery/"

Write-Host ""
Write-Host "Deploy complete."
Write-Host "Test these:"
Write-Host "https://claycraze.com/js/ovals.js?v=$VERSION"
Write-Host "https://claycraze.com/gallery/ovals.html?v=$VERSION"