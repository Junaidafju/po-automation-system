from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.database import engine
from .models import purchase_order, supplier, brand
from .api.v1.endpoints import dashboard, purchase_orders
from .api.v1.endpoints import upload, export, convert, timeline
from fastapi import WebSocket, WebSocketDisconnect
from .utils.broadcast import register, unregister

# Create tables
purchase_order.Base.metadata.create_all(bind=engine)
supplier.Base.metadata.create_all(bind=engine)
brand.Base.metadata.create_all(bind=engine)

app = FastAPI(title="PO Automation System", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(purchase_orders.router, prefix="/api/v1/orders", tags=["purchase_orders"])
app.include_router(upload.router, prefix="/api/v1/upload", tags=["upload"])
app.include_router(export.router, prefix="/api/v1/export", tags=["export"])
app.include_router(convert.router, prefix="/api/v1/convert", tags=["convert"])
app.include_router(timeline.router, prefix="/api/v1/dashboard/timeline", tags=["timeline"])


@app.websocket("/ws/updates")
async def websocket_updates(websocket: WebSocket):
    await websocket.accept()
    await register(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await unregister(websocket)

@app.get("/")
async def root():
    return {"message": "PO Automation System API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
