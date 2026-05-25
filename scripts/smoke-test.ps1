$BASE = "https://vaffiliate-app.onrender.com"
$endpoints = @(
  @{name="Home";                 url="$BASE/";                                 expect=200},
  @{name="Sitemap";              url="$BASE/sitemap.xml";                      expect=200},
  @{name="Robots";               url="$BASE/robots.txt";                       expect=200},
  @{name="Manifest";             url="$BASE/manifest.webmanifest";             expect=200},
  @{name="Favicon";              url="$BASE/favicon.ico";                      expect=200},
  @{name="Icon-192";             url="$BASE/seo/icon-192.png";                 expect=200},
  @{name="Apple-touch-icon";     url="$BASE/seo/apple-touch-icon.png";         expect=200},
  @{name="API auth/me (no auth)"; url="$BASE/api/auth/me";                     expect=401},
  @{name="API leaderboard";      url="$BASE/api/leaderboard?period=month";     expect=200},
  @{name="API admin/stats";      url="$BASE/api/admin/stats";                  expect=401},
  @{name="API admin/ip-blocklist"; url="$BASE/api/admin/ip-blocklist";         expect=401},
  @{name="Reset-password page";  url="$BASE/reset-password";                   expect=200},
  @{name="Verify-email page";    url="$BASE/verify-email";                     expect=200}
)

$pass = 0
$fail = 0
foreach ($e in $endpoints) {
  try {
    $r = Invoke-WebRequest -Uri $e.url -UseBasicParsing -TimeoutSec 30 -ErrorAction Stop
    $status = $r.StatusCode
  } catch {
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
    } else {
      $status = 0
    }
  }
  $mark = if ($status -eq $e.expect) { "OK"; $pass++ } else { "FAIL"; $fail++ }
  Write-Host ("{0,-30} HTTP {1,3} (expect {2,3}) [{3}]" -f $e.name, $status, $e.expect, $mark)
}

Write-Host ""
Write-Host "PASS: $pass / FAIL: $fail"
