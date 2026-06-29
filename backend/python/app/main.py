from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR

from app.routers import optimize as optimize_router
from app.routers import ml as ml_router


def _value_error_handler(request: Request, exc: ValueError):
	return JSONResponse(status_code=HTTP_400_BAD_REQUEST, content={"error": str(exc)})


def _generic_exception_handler(request: Request, exc: Exception):
	return JSONResponse(status_code=HTTP_500_INTERNAL_SERVER_ERROR, content={"error": "Internal server error"})


app = FastAPI(title="Ultimate Portfolio Optimizer")

# Register global exception handlers so endpoints do not need manual try/except
app.add_exception_handler(ValueError, _value_error_handler)
app.add_exception_handler(Exception, _generic_exception_handler)

app.include_router(optimize_router.router)
app.include_router(ml_router.router)
