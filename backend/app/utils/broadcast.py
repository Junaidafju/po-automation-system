import asyncio

connections = set()

async def register(ws):
    connections.add(ws)

async def unregister(ws):
    connections.discard(ws)

async def broadcast(message: str):
    to_remove = []
    for ws in list(connections):
        try:
            await ws.send_text(message)
        except Exception:
            to_remove.append(ws)
    for ws in to_remove:
        connections.discard(ws)
