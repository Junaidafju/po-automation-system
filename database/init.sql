-- Create tables
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    vat_number VARCHAR(50),
    address TEXT,
    contact_person VARCHAR(100),
    contact_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    version INTEGER DEFAULT 1,
    supplier_id INTEGER REFERENCES suppliers(id),
    supplier_reference VARCHAR(100),
    brand_id INTEGER REFERENCES brands(id),
    buyer_name VARCHAR(100),
    buyer_email VARCHAR(255),
    department VARCHAR(100),
    category VARCHAR(100),
    style_number VARCHAR(100),
    product_description TEXT,
    color VARCHAR(50),
    size VARCHAR(20),
    ean VARCHAR(50),
    total_order_qty INTEGER,
    unit_price_usd DECIMAL(10,2),
    unit_price_gbp DECIMAL(10,2),
    total_usd_value DECIMAL(15,2),
    total_gbp_value DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'GBP',
    exchange_rate DECIMAL(10,4),
    uk_po_recd_date DATE,
    confirmed_ex_factory DATE,
    revised_ex_factory DATE,
    delivery_date DATE,
    shipment_book_with_forwarder DATE,
    mode VARCHAR(20),
    port_of_loading VARCHAR(50),
    incoterms VARCHAR(20),
    sustainable VARCHAR(10) DEFAULT 'N',
    fabric_country_of_origin VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    extracted_from_pdf VARCHAR(255),
    extraction_status VARCHAR(20) DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS extraction_logs (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255),
    po_number VARCHAR(50),
    status VARCHAR(20),
    error_message TEXT,
    extracted_data JSONB,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_po_number ON purchase_orders(po_number);
CREATE INDEX idx_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_brand ON purchase_orders(brand_id);
CREATE INDEX idx_delivery_date ON purchase_orders(delivery_date);
CREATE INDEX idx_ex_factory ON purchase_orders(confirmed_ex_factory);

-- Insert sample brands
INSERT INTO brands (name, code) VALUES 
    ('BOOHOO', 'BH'),
    ('COAST', 'CT'),
    ('PRETTYLITTLETHING', 'PLT'),
    ('NASTYGAL', 'NG'),
    ('WALLIS', 'WL'),
    ('WAREHOUSE', 'WH'),
    ('OASIS', 'OS'),
    ('BURTON', 'BT'),
    ('DP', 'DP')
ON CONFLICT (name) DO NOTHING;
