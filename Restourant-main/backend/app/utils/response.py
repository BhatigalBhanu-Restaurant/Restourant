from typing import Any, Optional, Dict
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

class ApiResponse:
    @staticmethod
    def success(data: Any = None, message: str = "Success", status_code: int = 200) -> JSONResponse:
        content = {
            "success": True,
            "message": message,
            "data": data
        }
        return JSONResponse(
            status_code=status_code,
            content=jsonable_encoder(content)
        )

    @staticmethod
    def error(message: str = "Internal Server Error", status_code: int = 500, code: Optional[str] = None) -> JSONResponse:
        default_code = "SERVER_ERROR"
        if status_code == 400:
            default_code = "BAD_REQUEST"
        elif status_code == 401:
            default_code = "UNAUTHORIZED"
        elif status_code == 403:
            default_code = "FORBIDDEN"
        elif status_code == 404:
            default_code = "NOT_FOUND"
        elif status_code == 422:
            default_code = "VALIDATION_ERROR"

        content = {
            "success": False,
            "message": message,
            "code": code or default_code
        }
        return JSONResponse(
            status_code=status_code,
            content=jsonable_encoder(content)
        )

    @staticmethod
    def forbidden(message: str = "You do not have permission to perform this action.") -> JSONResponse:
        content = {
            "success": False,
            "message": message,
            "code": "FORBIDDEN"
        }
        return JSONResponse(
            status_code=403,
            content=jsonable_encoder(content)
        )

    @staticmethod
    def validation_error(errors: Any, message: str = "Validation failed") -> JSONResponse:
        formatted_errors = {"general": errors} if isinstance(errors, str) else errors
        content = {
            "success": False,
            "message": message,
            "errors": formatted_errors
        }
        return JSONResponse(
            status_code=422,
            content=jsonable_encoder(content)
        )
