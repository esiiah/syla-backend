#!/usr/bin/env python3
"""
Test script to verify forecast API is working correctly
Run this from your backend directory:
    python test_forecast.py
"""

import requests
import json
import sys

# Configuration
BASE_URL = "https://syla-backend-production.up.railway.app"
API_URL = f"{BASE_URL}/api/forecast"

# Test data
TEST_DATA = [
    {"date": "2024-01", "revenue": 10000},
    {"date": "2024-02", "revenue": 12000},
    {"date": "2024-03", "revenue": 11500},
    {"date": "2024-04", "revenue": 13000},
    {"date": "2024-05", "revenue": 14500},
    {"date": "2024-06", "revenue": 15000},
    {"date": "2024-07", "revenue": 16000},
    {"date": "2024-08", "revenue": 17500},
    {"date": "2024-09", "revenue": 18000},
    {"date": "2024-10", "revenue": 19000},
    {"date": "2024-11", "revenue": 20000},
    {"date": "2024-12", "revenue": 21000},
]

def print_header(text):
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60)

def print_result(success, message):
    status = "✓" if success else "✗"
    print(f"{status} {message}")

def test_health():
    """Test health endpoint"""
    print_header("Testing Health Endpoint")
    try:
        response = requests.get(f"{API_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print_result(True, "Health check passed")
            print(f"  Status: {data.get('status')}")
            print(f"  OpenAI Available: {data.get('openai_available')}")
            print(f"  OpenAI Key Set: {data.get('openai_key_set')}")
            print(f"  Prophet Available: {data.get('prophet_available')}")
            return True
        else:
            print_result(False, f"Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print_result(False, f"Health check error: {e}")
        return False

def test_debug():
    """Test debug endpoint"""
    print_header("Testing Debug Endpoint")
    try:
        response = requests.get(f"{API_URL}/debug", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print_result(True, "Debug endpoint accessible")
            print(f"  OpenAI Available: {data.get('openai_available')}")
            print(f"  OpenAI Key Prefix: {data.get('openai_key_prefix')}")
            print(f"  Prophet Available: {data.get('prophet_available')}")
            print(f"  Service Initialized: {data.get('service_initialized')}")
            return True
        else:
            print_result(False, f"Debug failed: {response.status_code}")
            return False
    except Exception as e:
        print_result(False, f"Debug error: {e}")
        return False

def test_forecast_simple():
    """Test simple forecast without authentication"""
    print_header("Testing Forecast (Simple - No Auth)")
    
    payload = {
        "csv_data": TEST_DATA,
        "scenario_text": "Increase revenue by 10% due to marketing campaign",
        "target_column": "revenue",
        "date_column": "date",
        "model_preference": "hybrid",
        "periods_ahead": 6,
        "confidence_level": 0.95
    }
    
    try:
        print("Sending forecast request...")
        response = requests.post(
            f"{API_URL}/whatif",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 401:
            print_result(False, "Authentication required (expected)")
            print("  This is normal - forecast requires login")
            print("  Status code: 401")
            return None
        elif response.status_code == 200:
            print_result(True, "Forecast generated successfully!")
            data = response.json()
            
            if "forecast" in data:
                forecast_data = data["forecast"]
                print(f"  Model Used: {forecast_data.get('model_used', 'unknown')}")
                print(f"  Forecast Points: {len(forecast_data.get('forecast', []))}")
                print(f"  First 3 Predictions: {forecast_data.get('forecast', [])[:3]}")
                
                if "explanation" in data:
                    print(f"  Explanation: {data['explanation'][:100]}...")
                
                return True
            else:
                print_result(False, "Response missing forecast data")
                print(f"  Response keys: {list(data.keys())}")
                return False
        else:
            print_result(False, f"Forecast failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"  Error: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"  Response: {response.text[:200]}")
            return False
            
    except requests.exceptions.Timeout:
        print_result(False, "Request timed out (>30s)")
        return False
    except Exception as e:
        print_result(False, f"Forecast error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_models():
    """Test models endpoint"""
    print_header("Testing Models Endpoint")
    try:
        response = requests.get(f"{API_URL}/models", timeout=5)
        
        if response.status_code == 401:
            print_result(False, "Authentication required")
            return None
        elif response.status_code == 200:
            data = response.json()
            print_result(True, "Models endpoint accessible")
            print(f"  Available models: {list(data.get('models', {}).keys())}")
            print(f"  Default: {data.get('default')}")
            print(f"  Recommended: {data.get('recommended')}")
            return True
        else:
            print_result(False, f"Models check failed: {response.status_code}")
            return False
    except Exception as e:
        print_result(False, f"Models error: {e}")
        return False

def check_dependencies():
    """Check if required Python packages are installed"""
    print_header("Checking Python Dependencies")
    
    deps = {
        "pandas": "pandas",
        "numpy": "numpy",
        "fastapi": "fastapi",
        "httpx": "httpx",
        "prophet": "prophet",
        "tenacity": "tenacity"
    }
    
    all_installed = True
    for name, import_name in deps.items():
        try:
            __import__(import_name)
            print_result(True, f"{name} is installed")
        except ImportError:
            print_result(False, f"{name} is NOT installed")
            print(f"  Install with: pip install {name}")
            all_installed = False
    
    return all_installed

def main():
    print("\n" + "█"*60)
    print("  SYLA FORECAST API TEST SUITE")
    print("█"*60)
    
    results = {
        "dependencies": check_dependencies(),
        "health": test_health(),
        "debug": test_debug(),
        "models": test_models(),
        "forecast": test_forecast_simple()
    }
    
    # Summary
    print_header("TEST SUMMARY")
    
    passed = sum(1 for v in results.values() if v is True)
    failed = sum(1 for v in results.values() if v is False)
    skipped = sum(1 for v in results.values() if v is None)
    
    print(f"Passed:  {passed}")
    print(f"Failed:  {failed}")
    print(f"Skipped: {skipped} (auth required)")
    
    if results["dependencies"] is False:
        print("\n⚠ Install missing dependencies first:")
        print("  pip install prophet pandas numpy fastapi httpx tenacity")
    
    if results["health"] and results["debug"]:
        print("\n✓ Forecast service is running and configured correctly")
        if results["forecast"] is None:
            print("✓ Endpoints are accessible (auth required for full test)")
    else:
        print("\n✗ Forecast service has configuration issues")
        print("  Check:")
        print("  1. Backend server is running on port 8000")
        print("  2. OPENAI_API_KEY is set in .env file")
        print("  3. All dependencies are installed")
    
    print("\n" + "="*60)
    
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
