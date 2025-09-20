# app/routers/files.py
import os
import shutil
from fastapi import APIRouter, HTTPException, Request
from . import utils

router = APIRouter(prefix="/api/files", tags=["files"])


@router.delete("/clear-user-files")
async def clear_user_files(request: Request):
    user = utils.get_current_user_from_token(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    uploads_dir = os.path.join(os.path.dirname(__file__), "uploads", str(user["id"]))
    if os.path.exists(uploads_dir):
        try:
            shutil.rmtree(uploads_dir)
            return {"message": "All user files cleared successfully"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to clear files: {str(e)}")
    return {"message": "No files found"}
