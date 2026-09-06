<#
    kur.ps1 - Turkce ajanlari bir projeye veya tum kullaniciya kurar.

    Kullanim:
      # Bu projeye (varsayilan: D:\Claude Projeleri)
      powershell -ExecutionPolicy Bypass -File kur.ps1

      # Baska bir projeye
      powershell -ExecutionPolicy Bypass -File kur.ps1 -Proje "D:\Repolar\buradane"

      # Tum projelerde kullanilabilsin (kullanici seviyesi)
      powershell -ExecutionPolicy Bypass -File kur.ps1 -Kullanici

      # Ne yapacagini goster, dokunma
      powershell -ExecutionPolicy Bypass -File kur.ps1 -Deneme
#>

param(
    [string]$Proje = "D:\Claude Projeleri",
    [switch]$Kullanici,
    [switch]$Deneme
)

$ErrorActionPreference = "Stop"

$Kaynak = Join-Path $PSScriptRoot "agents"
if (-not (Test-Path $Kaynak)) { throw "agents klasoru bulunamadi: $Kaynak" }

if ($Kullanici) {
    $Hedef = Join-Path $env:USERPROFILE ".claude\agents"
    $nere = "kullanici seviyesi (tum projeler)"
} else {
    if (-not (Test-Path $Proje)) { throw "Proje klasoru yok: $Proje" }
    $Hedef = Join-Path $Proje ".claude\agents"
    $nere = "proje: $Proje"
}

$dosyalar = Get-ChildItem -Path $Kaynak -Filter *.md -File
if ($dosyalar.Count -eq 0) { throw "agents klasorunde .md dosyasi yok." }

Write-Output "Kaynak : $Kaynak  ($($dosyalar.Count) ajan)"
Write-Output "Hedef  : $Hedef"
Write-Output "Kapsam : $nere"
Write-Output ""

if ($Deneme) {
    Write-Output "-Deneme modu: hicbir sey yazilmadi. Yapilacaklar:"
    foreach ($d in $dosyalar) {
        $h = Join-Path $Hedef $d.Name
        $durum = "yeni"
        if (Test-Path $h) { $durum = "uzerine yazilacak" }
        Write-Output "  $($d.Name)  [$durum]"
    }
    exit 0
}

if (-not (Test-Path $Hedef)) {
    New-Item -ItemType Directory -Path $Hedef -Force | Out-Null
    Write-Output "Klasor olusturuldu: $Hedef"
}

$yeni = 0
$guncel = 0
foreach ($d in $dosyalar) {
    $h = Join-Path $Hedef $d.Name
    if (Test-Path $h) { $guncel++ } else { $yeni++ }
    Copy-Item -Path $d.FullName -Destination $h -Force
    Write-Output "  kuruldu: $($d.BaseName)"
}

Write-Output ""
Write-Output "Tamam. $yeni yeni, $guncel guncellendi."
Write-Output ""
Write-Output "Kullanmak icin yeni bir Claude oturumu ac. Ajanlar su"
Write-Output "adlarla cagrilir:"
foreach ($d in $dosyalar) { Write-Output "  $($d.BaseName)" }
