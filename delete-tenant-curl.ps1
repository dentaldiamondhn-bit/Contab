# Script para eliminar el tenant "Angel Ring"
$headers = @{
    "Content-Type" = "application/json"
}
$body = @{
    "tenantId" = "cmofey73w000087izrdfvtlve"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/admin/delete-tenant" -Method POST -Headers $headers -Body $body
    Write-Host "✅ Respuesta del servidor:"
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Error en la petición:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        Write-Host "Status:" $_.Exception.Response.StatusCode
        Write-Host "Content:" $_.Exception.Response.Content.ReadAsStringAsync().Result
    }
}
