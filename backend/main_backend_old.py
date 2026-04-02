from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import random
from datetime import datetime, timedelta
import os
import re
import pdfplumber

# Create FastAPI app
app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Generate sample data
suppliers = ['BANSWARA', 'WINDESON TRADEMART', 'N&A Design', 'MIR', 'CREST DESIGN', 'NAMDEV']
brands = ['BOOHOO', 'COAST', 'PRETTYLITTLETHING', 'NASTYGAL', 'WALLIS', 'WAREHOUSE']
buyers = ['John Smith', 'Sarah Johnson', 'Mike Brown', 'Emma Wilson', 'James Taylor']

# Create 50 sample orders
orders = []
for i in range(50):
    orders.append({
        "id": i + 1,
        "po_number": f"PO-2024-{str(i+1000).zfill(4)}",
        "supplier": random.choice(suppliers),
        "brand": random.choice(brands),
        "buyer_name": random.choice(buyers),
        "total_order_qty": random.randint(50, 500),
        "total_gbp_value": round(random.uniform(500, 5000), 2),
        "delivery_date": (datetime.now() + timedelta(days=random.randint(30, 180))).strftime("%Y-%m-%d")
    })

# Calculate statistics
def calculate_metrics():
    total_orders = len(orders)
    total_value = sum(o["total_gbp_value"] for o in orders)
    avg_value = total_value / total_orders if total_orders > 0 else 0
    
    # Supplier stats
    supplier_dict = {}
    for o in orders:
        s = o["supplier"]
        if s not in supplier_dict:
            supplier_dict[s] = {"count": 0, "value": 0}
        supplier_dict[s]["count"] += 1
        supplier_dict[s]["value"] += o["total_gbp_value"]
    
    # Brand stats
    brand_dict = {}
    for o in orders:
        b = o["brand"]
        if b not in brand_dict:
            brand_dict[b] = {"count": 0, "value": 0}
        brand_dict[b]["count"] += 1
        brand_dict[b]["value"] += o["total_gbp_value"]
    
    return {
        "total_orders": total_orders,
        "total_value": round(total_value, 2),
        "avg_value": round(avg_value, 2),
        "active_suppliers": len(supplier_dict),
        "active_brands": len(brand_dict)
    }

def get_supplier_stats():
    supplier_dict = {}
    for o in orders:
        s = o["supplier"]
        if s not in supplier_dict:
            supplier_dict[s] = {"count": 0, "value": 0}
        supplier_dict[s]["count"] += 1
        supplier_dict[s]["value"] += o["total_gbp_value"]
    
    return [{"supplier": s, "order_count": d["count"], "total_value": round(d["value"], 2)} 
            for s, d in supplier_dict.items()]

def get_brand_stats():
    brand_dict = {}
    for o in orders:
        b = o["brand"]
        if b not in brand_dict:
            brand_dict[b] = {"count": 0, "value": 0}
        brand_dict[b]["count"] += 1
        brand_dict[b]["value"] += o["total_gbp_value"]
    
    return [{"brand": b, "order_count": d["count"], "total_value": round(d["value"], 2)} 
            for b, d in brand_dict.items()]

def extract_pdf_data(file_path: str):
    """Extract data from PDF file"""
    extracted = {
        "po_number": None,
        "supplier": None,
        "brand": None,
        "buyer": None,
        "delivery_date": None,
        "quantity": 0,
        "total_value": 0
    }
    
    try:
        with pdfplumber.open(file_path) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text()
        
        # Extract PO Number
        po_match = re.search(r'Purchase Order No[:\s]*([A-Z0-9]+)', text, re.IGNORECASE)
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
        
        # Try to extract from tables
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        if row:
                            for cell in row:
                                if cell and isinstance(cell, str):
                                    # Look for quantity
                                    if cell.isdigit() and len(cell) > 2:
                                        extracted['quantity'] = int(cell)
                                    # Look for price
                                    if '.' in cell and cell.replace('.', '').replace(',', '').isdigit():
                                        extracted['total_value'] = float(cell.replace(',', ''))
        
    except Exception as e:
        print(f"Error extracting PDF: {e}")
    
    return extracted

# API Endpoints
@app.get("/")
def root():
    return {"message": "PO Automation System API", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy", "orders": len(orders)}

@app.get("/api/v1/dashboard/kpi")
def get_kpi():
    return calculate_metrics()

@app.get("/api/v1/dashboard/orders-by-supplier")
def orders_by_supplier():
    return get_supplier_stats()

@app.get("/api/v1/dashboard/orders-by-brand")
def orders_by_brand():
    return get_brand_stats()

@app.get("/api/v1/orders/")
def get_orders():
    return orders

@app.post("/api/v1/upload/pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and extract data from PDF purchase order"""
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Save the file temporarily
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Extract data from PDF
    extracted_data = extract_pdf_data(file_path)
    
    # Create new order
    new_id = len(orders) + 1
    new_order = {
        "id": new_id,
        "po_number": extracted_data.get('po_number') or f"PO-UPLOAD-{new_id}",
        "supplier": extracted_data.get('supplier') or "Unknown Supplier",
        "brand": extracted_data.get('brand') or "Unknown Brand",
        "buyer_name": extracted_data.get('buyer') or "Unknown Buyer",
        "total_order_qty": extracted_data.get('quantity', random.randint(50, 500)),
        "total_gbp_value": extracted_data.get('total_value', round(random.uniform(500, 5000), 2)),
        "delivery_date": extracted_data.get('delivery_date') or (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
    }
    
    # Add to orders list
    orders.append(new_order)
    
    # Clean up file
    os.remove(file_path)
    
    return {
        "message": "PDF processed successfully",
        "po_number": new_order["po_number"],
        "extracted_data": extracted_data
    }

print("\n" + "="*60)
print("✅ BACKEND IS RUNNING!")
print(f"📊 Loaded {len(orders)} sample orders")
print("="*60)
print("\nAvailable endpoints:")
print("  GET  http://localhost:8000/")
print("  GET  http://localhost:8000/health")
print("  GET  http://localhost:8000/api/v1/dashboard/kpi")
print("  GET  http://localhost:8000/api/v1/orders/")
print("  POST http://localhost:8000/api/v1/upload/pdf")
print("="*60 + "\n")