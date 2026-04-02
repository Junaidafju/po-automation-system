from fastapi import APIRouter, UploadFile, File
import os
from ....config import settings
from ....utils.broadcast import broadcast

router = APIRouter()


@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    upload_dir = os.path.join(os.getcwd(), settings.UPLOAD_DIR)
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # notify listeners that a file was uploaded
    try:
        await broadcast(f"uploaded:{file.filename}")
    except Exception:
        pass

    return {"filename": file.filename, "status": "uploaded"}
