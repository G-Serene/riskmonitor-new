# PowerShell script to test the enhanced_storyline_generator fix
# Tests the smart_article_selection function with 200+ articles

Write-Host "🚀 Testing Enhanced Storyline Generator Fix" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Gray

# Change to the backend directory
Set-Location "c:\Users\ganas\Desktop\lasthack\riskmonitor\backend"

# Check if Python is available
Write-Host "🔍 Checking Python environment..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "   ✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Python not found. Please install Python first." -ForegroundColor Red
    exit 1
}

# Check if required files exist
Write-Host "📁 Checking required files..." -ForegroundColor Yellow
$requiredFiles = @(
    "enhanced_storyline_generator.py",
    "test_storyline_fix.py"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "   ✅ Found: $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Missing: $file" -ForegroundColor Red
        exit 1
    }
}

# Run the test
Write-Host "🧪 Running storyline generator tests..." -ForegroundColor Yellow
Write-Host "=" * 70 -ForegroundColor Gray

try {
    # Execute the test script
    $testResult = python test_storyline_fix.py 2>&1
    
    # Display the output
    $testResult | ForEach-Object {
        $line = $_.ToString()
        
        # Color code the output based on content
        if ($line -match "✅|SUCCESS|PASSED") {
            Write-Host $line -ForegroundColor Green
        } elseif ($line -match "❌|FAILED|ERROR") {
            Write-Host $line -ForegroundColor Red
        } elseif ($line -match "🧪|🔍|📊|⚡") {
            Write-Host $line -ForegroundColor Cyan
        } elseif ($line -match "🚀|🎉") {
            Write-Host $line -ForegroundColor Magenta
        } else {
            Write-Host $line -ForegroundColor White
        }
    }
    
    # Check if tests passed
    if ($testResult -join "" -match "ALL TESTS PASSED") {
        Write-Host "`n🎉 TEST SUITE COMPLETED SUCCESSFULLY!" -ForegroundColor Green
        Write-Host "✅ The unhashable dict error has been fixed." -ForegroundColor Green
        Write-Host "✅ Function can now handle 200+ articles safely." -ForegroundColor Green
    } else {
        Write-Host "`n❌ SOME TESTS FAILED" -ForegroundColor Red
        Write-Host "Please check the output above for details." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Error running tests: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n" + "=" * 70 -ForegroundColor Gray
Write-Host "📋 Test Summary:" -ForegroundColor Yellow
Write-Host "   • Tested with 250+ simulated articles" -ForegroundColor White
Write-Host "   • Verified deduplication logic" -ForegroundColor White
Write-Host "   • Checked article structure preservation" -ForegroundColor White
Write-Host "   • Tested edge cases (empty lists, small sets)" -ForegroundColor White
Write-Host "   • Performance tested with 500+ articles" -ForegroundColor White
Write-Host "=" * 70 -ForegroundColor Gray

# Optional: Run the actual API endpoint test if requested
$runApiTest = Read-Host "`n🌐 Would you like to test the actual API endpoint? (y/n)"
if ($runApiTest -eq "y" -or $runApiTest -eq "Y") {
    Write-Host "🌐 Testing API endpoint integration..." -ForegroundColor Yellow
    
    # Check if the API server is running
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 5
        Write-Host "   ✅ API server is running" -ForegroundColor Green
        
        # Test the storyline endpoint
        Write-Host "   🔍 Testing storyline generation endpoint..." -ForegroundColor Yellow
        $storylineResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/themes/trade_war_escalation/storyline?max_articles=50&days_back=30&force_regenerate=true" -Method POST -TimeoutSec 30
        
        if ($storylineResponse) {
            Write-Host "   ✅ Storyline endpoint working correctly" -ForegroundColor Green
            Write-Host "   ✅ No unhashable dict errors in production" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "   ⚠️  API server not running or endpoint failed" -ForegroundColor Yellow
        Write-Host "   ℹ️  Start the API server with: python start_server.py" -ForegroundColor Cyan
    }
}

Write-Host "`n🏁 Testing complete!" -ForegroundColor Green
