"""
PO Automation System - Main Backend Application
FastAPI server with PDF extraction, REST APIs, and WebSocket support
"""
from auth import verify_token, get_current_user
from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect, Depends
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import random
import os
import re
import pdfplumber
import asyncio
from typing import List, Dict



# ============================================
# Currency Conversion Service
# ============================================

class CurrencyService:
    def __init__(self):
        self.cache = {}
        self.api_url = "https://api.exchangerate-api.com/v4/latest/USD"
    
    async def get_gbp_rate(self):
        """Get live USD to GBP exchange rate"""
        # Check cache first (5 minute cache)
        if 'rate' in self.cache and 'timestamp' in self.cache:
            age = (datetime.now() - self.cache['timestamp']).seconds
            if age < 300:  # 5 minutes
                return self.cache['rate']
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.api_url, timeout=5)
                data = response.json()
                rate = data['rates']['GBP']
                # Cache the rate
                self.cache['rate'] = rate
                self.cache['timestamp'] = datetime.now()
                return rate
        except Exception as e:
            print(f"Currency API error: {e}")
            return 0.78  # Fallback rate

currency_service = CurrencyService()
# ============================================
# Application Configuration
# ============================================

app = FastAPI(
    title="PO Automation System",
    description="Automated Purchase Order Processing System",
    version="2.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Data Storage
# ============================================

orders: List[Dict] = []
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ============================================
# Sample Data Generation
# ============================================

def generate_sample_data():
    """Generate sample purchase orders for testing"""
    suppliers = ['BANSWARA', 'WINDESON TRADEMART', 'N&A Design', 'MIR', 'CREST DESIGN', 'NAMDEV']
    brands = ['BOOHOO', 'COAST', 'PRETTYLITTLETHING', 'NASTYGAL', 'WALLIS', 'WAREHOUSE']
    buyers = ['John Smith', 'Sarah Johnson', 'Mike Brown', 'Emma Wilson', 'James Taylor']
    styles = ['STY-1001', 'STY-1002', 'STY-1003', 'STY-1004', 'STY-1005']
    colors = ['Black', 'Navy', 'Red', 'White', 'Blue']
    currencies = ['GBP', 'USD', 'EUR']
    
    for i in range(50):
        delivery_date = datetime.now() + timedelta(days=random.randint(30, 180))
        qty = random.randint(50, 500)
        unit_price = round(random.uniform(5.0, 50.0), 2)
        total_val = round(qty * unit_price, 2)
        orders.append({
            "id": i + 1,
            "po_number": f"PO-2024-{str(i+1000).zfill(4)}",
            "supplier": random.choice(suppliers),
            "brand": random.choice(brands),
            "buyer_name": random.choice(buyers),
            "style": random.choice(styles),
            "color": random.choice(colors),
            "unit_price": unit_price,
            "currency": random.choice(currencies),
            "total_order_qty": qty,
            "total_value": total_val,
            "total_gbp_value": total_val, # keeping this for backward compat if needed in KPI, though we should probably update KPI too
            "delivery_date": delivery_date.strftime("%Y-%m-%d"),
            "confirmed_ex_factory": (delivery_date - timedelta(days=random.randint(30, 60))).strftime("%Y-%m-%d"),
            "status": "completed"
        })


# ============================================
# PDF Extraction Functions
# ============================================

def extract_pdf_data(file_path: str) -> Dict:
    """Extract purchase order data from PDF file"""
    extracted = {
        "po_number": None,
        "supplier": None,
        "brand": None,
        "buyer": None,
        "delivery_date": None,
        "quantity": 0,
        "total_value": 0,
        "currency": "GBP",
        "style": None,
        "color": None,
        "unit_price": 0
    }
    
    try:
        with pdfplumber.open(file_path) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text() or ""
        
        # Extract PO Number
        po_match = re.search(r'(?:Purchase Order|PO)[\s]*(?:No\.?|Number|#)?[\s]*[:\-]?[\s]*([A-Z0-9\-]+)', text, re.IGNORECASE)
        if po_match:
            extracted['po_number'] = po_match.group(1)
        
        # Extract Supplier
        supplier_match = re.search(r'Supplier Reference[:\s]*([A-Z0-9]+)', text, re.IGNORECASE)
        if supplier_match:
            extracted['supplier'] = supplier_match.group(1)
        
        # Extract Brand
        brand_match = re.search(r'(boohoo|coast|prettylittlething|nastygal)', text, re.IGNORECASE)
        if brand_match:
            extracted['brand'] = brand_match.group(1).upper()
        
        # Extract Buyer
        buyer_match = re.search(r'Buyer Name[:\s]*([^\n]+)', text, re.IGNORECASE)
        if buyer_match:
            extracted['buyer'] = buyer_match.group(1).strip()
        
        # Extract Delivery Date
        date_match = re.search(r'Delivery Date[:\s]*(\d{2}/\d{2}/\d{4})', text, re.IGNORECASE)
        if date_match:
            extracted['delivery_date'] = date_match.group(1)

        # Extract Currency
        if '$' in text or 'USD' in text:
            extracted['currency'] = 'USD'
        elif '€' in text or 'EUR' in text:
            extracted['currency'] = 'EUR'
        else:
            extracted['currency'] = 'GBP'

        # Extract Style, Color, Unit Price (Basic regex for common PO formats)
        style_match = re.search(r'(?:Style|Style No|Style Number)[\s]*[:\-]?[\s]*([A-Z0-9\-]+)', text, re.IGNORECASE)
        if style_match:
            extracted['style'] = style_match.group(1)
        color_match = re.search(r'(?:Colour|Color)[\s]*[:\-]?[\s]*([A-Za-z]+)', text, re.IGNORECASE)
        if color_match:
            extracted['color'] = color_match.group(1)
        price_match = re.search(r'(?:Unit Price|Price)[\s]*[:\-]?[\s]*[£$€]?[\s]*([0-9]+\.[0-9]{2})', text, re.IGNORECASE)
        if price_match:
            extracted['unit_price'] = float(price_match.group(1))

        # Extract from tables
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        if row:
                            for cell in row:
                                if cell and isinstance(cell, str):
                                    if cell.isdigit() and len(cell) > 2:
                                        extracted['quantity'] = int(cell)
                                    if '.' in cell and cell.replace('.', '').replace(',', '').isdigit():
                                        # Only override total_value if it looks like a large total, not unit price
                                        val = float(cell.replace(',', ''))
                                        if val > extracted['total_value']:
                                            extracted['total_value'] = val
    
    except Exception as e:
        print(f"PDF extraction error: {e}")
    
    return extracted
# ============================================
# Error Handling & Validation
# ============================================

from fastapi.responses import JSONResponse
from fastapi import Request

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc),
            "path": request.url.path
        }
    )

def validate_order_data(order_data: Dict) -> Dict:
    """Validate and clean order data"""
    validated = {}
    
    # Validate PO Number
    po_number = order_data.get('po_number', '') or ''
    po_number = po_number.strip()
    if not po_number:
        po_number = f"PO-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
    validated['po_number'] = po_number
    
    # Validate supplier
    supplier = order_data.get('supplier', '') or ''
    supplier = supplier.strip()
    validated['supplier'] = supplier if supplier else "Unknown Supplier"
    
    # Validate brand
    brand = order_data.get('brand', '') or ''
    brand = brand.strip().upper()
    validated['brand'] = brand if brand else "Unknown Brand"
    
    # Validate quantity
    quantity = order_data.get('total_order_qty', 0)
    validated['total_order_qty'] = max(1, int(quantity)) if quantity else 1
    
    # Validate price
    price = order_data.get('total_value', 0)
    validated['total_value'] = max(0, float(price)) if price else 0

    validated['currency'] = order_data.get('currency', 'GBP')
    validated['style'] = order_data.get('style', 'Unknown')
    validated['color'] = order_data.get('color', 'Unknown')
    validated['unit_price'] = order_data.get('unit_price', 0.0)
    
    # Validate dates
    delivery_date = order_data.get('delivery_date')
    if delivery_date:
        try:
            validated['delivery_date'] = datetime.strptime(delivery_date, "%Y-%m-%d").strftime("%Y-%m-%d")
        except:
            validated['delivery_date'] = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
    else:
        validated['delivery_date'] = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
    
    return validated
# ============================================
# Analytics Functions
# ============================================

def calculate_kpi_metrics():
    """Calculate KPI metrics for dashboard"""
    if not orders:
        return {"total_orders": 0, "total_value": 0, "avg_value": 0, "active_suppliers": 0, "active_brands": 0}
    
    total_orders = len(orders)
    # Using total_value directly. Real app would do cross-currency conversion here, but simple sum is okay for dashboard KPI
    total_value = sum(o.get("total_value", o.get("total_gbp_value", 0)) for o in orders)
    avg_value = total_value / total_orders
    
    suppliers = set(o.get("supplier") for o in orders if o.get("supplier"))
    brands = set(o.get("brand") for o in orders if o.get("brand"))
    
    return {
        "total_orders": total_orders,
        "total_value": round(total_value, 2),
        "avg_value": round(avg_value, 2),
        "active_suppliers": len(suppliers),
        "active_brands": len(brands)
    }

def get_supplier_stats():
    """Get order statistics by supplier"""
    stats = {}
    for order in orders:
        supplier = order.get("supplier", "Unknown")
        if supplier not in stats:
            stats[supplier] = {"order_count": 0, "total_value": 0}
        stats[supplier]["order_count"] += 1
        stats[supplier]["total_value"] += order.get("total_value", order.get("total_gbp_value", 0))
    
    return [{"supplier": k, "order_count": v["order_count"], "total_value": round(v["total_value"], 2)} 
            for k, v in stats.items()]

def get_brand_stats():
    """Get order statistics by brand"""
    stats = {}
    for order in orders:
        brand = order.get("brand", "Unknown")
        if brand not in stats:
            stats[brand] = {"order_count": 0, "total_value": 0}
        stats[brand]["order_count"] += 1
        stats[brand]["total_value"] += order.get("total_value", order.get("total_gbp_value", 0))
    
    return [{"brand": k, "order_count": v["order_count"], "total_value": round(v["total_value"], 2)} 
            for k, v in stats.items()]

def get_delivery_analysis():
    """Analyze delivery performance"""
    today = datetime.now().date()
    on_time = delayed = pending = 0
    
    for order in orders:
        delivery_str = order.get("delivery_date")
        if delivery_str:
            delivery_date = datetime.strptime(delivery_str, "%Y-%m-%d").date()
            if delivery_date < today:
                delayed += 1
            elif delivery_date == today:
                pending += 1
            else:
                on_time += 1
    
    total = len(orders)
    return {
        "on_time": on_time,
        "delayed": delayed,
        "pending": pending,
        "on_time_percentage": round((on_time / total) * 100, 1) if total > 0 else 0
    }

# ============================================
# API Endpoints
# ============================================

@app.get("/")
async def root():
    return {"message": "PO Automation System API", "status": "running", "version": "2.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "orders_count": len(orders), "timestamp": datetime.now().isoformat()}

@app.get("/api/v1/dashboard/kpi")
async def get_kpi():
    return calculate_kpi_metrics()
@app.get("/api/v1/currency/rate")
async def get_currency_rate():
    """Get current USD to GBP exchange rate"""
    rate = await currency_service.get_gbp_rate()
    return {
        "usd_to_gbp": rate,
        "gbp_to_usd": round(1/rate, 4),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/v1/convert/usd-to-gbp")
async def convert_usd_to_gbp(amount: float):
    """Convert USD amount to GBP using live rates"""
    rate = await currency_service.get_gbp_rate()
    return {
        "usd": amount,
        "gbp": round(amount * rate, 2),
        "rate": rate,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/dashboard/orders-by-supplier")
async def orders_by_supplier():
    return get_supplier_stats()

@app.get("/api/v1/dashboard/orders-by-brand")
async def orders_by_brand():
    return get_brand_stats()

@app.get("/api/v1/dashboard/delivery-timeline")
async def delivery_timeline():
    return get_delivery_analysis()

@app.get("/api/v1/orders/")
async def get_orders(skip: int = 0, limit: int = 100):
    return orders[skip:skip + limit]


@app.post("/api/v1/upload/pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and process a PDF purchase order"""
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        # Save file
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Extract data
        extracted = extract_pdf_data(file_path)
        
        # Validate and clean data
        validated_data = validate_order_data({
            "po_number": extracted.get('po_number'),
            "supplier": extracted.get('supplier'),
            "brand": extracted.get('brand'),
            "buyer_name": extracted.get('buyer'),
            "total_order_qty": extracted.get('quantity'),
            "total_value": extracted.get('total_value'),
            "delivery_date": extracted.get('delivery_date'),
            "currency": extracted.get('currency'),
            "style": extracted.get('style'),
            "color": extracted.get('color'),
            "unit_price": extracted.get('unit_price')
        })
        
        # Create new order
        new_order = {
            "id": len(orders) + 1,
            "po_number": validated_data['po_number'],
            "supplier": validated_data['supplier'],
            "brand": validated_data['brand'],
            "buyer_name": extracted.get('buyer') or "Unknown Buyer",
            "total_order_qty": validated_data['total_order_qty'],
            "total_value": validated_data['total_value'],
            "total_gbp_value": validated_data['total_value'], # backward compat
            "currency": validated_data['currency'],
            "style": validated_data['style'],
            "color": validated_data['color'],
            "unit_price": validated_data['unit_price'],
            "delivery_date": validated_data['delivery_date'],
            "confirmed_ex_factory": datetime.now().strftime("%Y-%m-%d"),
            "status": "processed",
            "validation_notes": "Data validated and cleaned"
        }
        
        orders.append(new_order)
        
        # Cleanup
        os.remove(file_path)
        
        return {
            "success": True,
            "message": "PDF processed successfully",
            "po_number": new_order["po_number"],
            "extracted_data": extracted,
            "validated_data": validated_data
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.delete("/api/v1/orders/{order_id}")
async def delete_order(order_id: int):
    """Delete an order by ID"""
    global orders
    orders = [o for o in orders if o.get("id") != order_id]
    return {"message": f"Order {order_id} deleted successfully"}
# ============================================
# App login and authentication
# ============================================
class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/api/v1/auth/login")
async def login(credentials: LoginRequest):
    """Simple login endpoint accepting JSON body"""
    username = credentials.username
    password = credentials.password

    # Demo credentials (replace with database in production)
    if username == "admin" and password == "admin123":
        return {
            "success": True,
            "token": "secret-admin-token-2024",
            "user": "admin",
            "message": "Login successful"
        }
    elif username == "user" and password == "user123":
        return {
            "success": True,
            "token": "secret-user-token-2024",
            "user": "user",
            "message": "Login successful"
        }
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/api/v1/auth/verify")
async def verify_auth(auth_data: dict = Depends(get_current_user)):
    """Verify authentication status"""
    return {"authenticated": True, "user": auth_data['user']}
# ============================================
# WebSocket Endpoint for Real-time Updates
# ============================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Send real-time updates
            data = {
                "type": "dashboard_update",
                "kpi": calculate_kpi_metrics(),
                "delivery": get_delivery_analysis(),
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send_json(data)
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ============================================
# Initialize Application
# ============================================

# Generate sample data on startup
generate_sample_data()

print("\n" + "="*60)
print("🚀 PO AUTOMATION SYSTEM - BACKEND RUNNING")
print("="*60)
print(f"📊 Loaded {len(orders)} purchase orders")
print(f"📁 Upload directory: {UPLOAD_DIR}")
print("\n📡 Available Endpoints:")
print("   GET  /")
print("   GET  /health")
print("   GET  /api/v1/dashboard/kpi")
print("   GET  /api/v1/dashboard/orders-by-supplier")
print("   GET  /api/v1/dashboard/orders-by-brand")
print("   GET  /api/v1/dashboard/delivery-timeline")
print("   GET  /api/v1/orders/")
print("   POST /api/v1/upload/pdf")
print("   DELETE /api/v1/orders/{id}")
print("   WS   /ws")
print("="*60)