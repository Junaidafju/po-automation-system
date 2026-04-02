import psycopg2
from datetime import datetime, timedelta
import random

# Database connection
conn = psycopg2.connect(
    host="localhost",
    database="po_automation",
    user="po_user",
    password="po_password"
)
cur = conn.cursor()

# Sample suppliers
suppliers = ['BANSWARA', 'WINDESON TRADEMART', 'N&A Design', 'MIR', 'CREST DESIGN', 'NAMDEV']
brands = ['BOOHOO', 'COAST', 'PRETTYLITTLETHING', 'NASTYGAL', 'WALLIS', 'WAREHOUSE']
buyers = ['John Smith', 'Sarah Johnson', 'Mike Brown', 'Emma Wilson', 'James Taylor']

# Insert sample purchase orders
for i in range(50):
    po_number = f"PO-{2024}{str(i+1000).zfill(4)}"
    supplier = random.choice(suppliers)
    brand = random.choice(brands)
    buyer = random.choice(buyers)
    quantity = random.randint(50, 500)
    unit_price = round(random.uniform(10, 100), 2)
    total_value = round(quantity * unit_price, 2)
    delivery_date = datetime.now() + timedelta(days=random.randint(30, 180))
    ex_factory = delivery_date - timedelta(days=random.randint(30, 60))

    cur.execute("""
        INSERT INTO purchase_orders 
        (po_number, supplier, brand, buyer_name, total_order_qty, 
         unit_price_gbp, total_gbp_value, delivery_date, confirmed_ex_factory,
         extraction_status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (po_number, supplier, brand, buyer, quantity, 
          unit_price, total_value, delivery_date, ex_factory, 'completed'))

conn.commit()
print(f"Inserted 50 sample purchase orders")

cur.close()
conn.close()
print("Sample data added successfully!")
