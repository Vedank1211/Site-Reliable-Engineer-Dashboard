# Start product, cart, and order microservices locally (ports 5001-5003)
$root = Split-Path -Parent $PSScriptRoot
$services = @(
  @{ Name = "product-service"; Port = 5001; Dir = "product-service" },
  @{ Name = "cart-service"; Port = 5002; Dir = "cart-service" },
  @{ Name = "order-service"; Port = 5003; Dir = "order-service" }
)

foreach ($svc in $services) {
  $dir = Join-Path $root "services\$($svc.Dir)"
  Write-Host "Starting $($svc.Name) on port $($svc.Port)..."
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$dir'; pip install -r requirements.txt -q; `$env:PORT='$($svc.Port)'; uvicorn app:app --host 0.0.0.0 --port $($svc.Port)"
  )
}

Write-Host ""
Write-Host "Microservices starting in separate windows:"
Write-Host "  product-service  http://localhost:5001"
Write-Host "  cart-service     http://localhost:5002"
Write-Host "  order-service    http://localhost:5003"
