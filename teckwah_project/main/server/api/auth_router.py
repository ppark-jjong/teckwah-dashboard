# teckwah_project/main/server/api/auth_router.py
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Header
from sqlalchemy.orm import Session
from fastapi.security import HTTPBearer
from typing import Optional
from datetime import datetime, timedelta
from jose import jwt, JWTError

from main.server.schemas.auth_schema import UserLogin, LoginResponse, Token, RefreshTokenRequest, ApiResponse
from main.server.services.auth_service import AuthService
from main.server.repositories.auth_repository import AuthRepository
from main.server.config.database import get_db
from main.server.config.settings import get_settings
from main.server.utils.logger import log_info, log_error
from main.server.utils.auth import create_token
from main.server.utils.api_decorators import error_handler
from main.server.utils.datetime_helper import get_kst_now
from main.server.utils.constants import MESSAGES

router = APIRouter()
settings = get_settings()


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    """AuthService 의존성 주입"""
    repository = AuthRepository(db)
    return AuthService(repository)


@router.post("/login", response_model=LoginResponse)
@error_handler("로그인")
async def login(
    login_data: UserLogin, auth_service: AuthService = Depends(get_auth_service)
):
    """로그인 API"""
    log_info(f"로그인 요청: user_id={login_data.user_id}")
    login_response = auth_service.authenticate_user(login_data)
    log_info(f"로그인 성공: user_id={login_data.user_id}")
    return login_response


@router.get("/check-session", response_model=ApiResponse)
@error_handler("세션 유효성 검증")
async def check_session(authorization: str = Header(None)):
    """세션 유효성 검증 API"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": MESSAGES["ERROR"]["UNAUTHORIZED"]}
        )

    token = authorization.split(" ")[1]

    try:
        # 토큰 검증 로직
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )

        # 유효성 검사 (KST 시간 기준)
        now = get_kst_now().timestamp()
        token_exp = payload.get("exp", 0)
        
        if now > token_exp:
            raise HTTPException(
                status_code=401, 
                detail={"success": False, "message": "인증이 만료되었습니다"}
            )

        return {
            "success": True,
            "message": "유효한 세션입니다",
            "data": {
                "user": {
                    "user_id": payload.get("sub"),
                    "user_department": payload.get("department"),
                    "user_role": payload.get("role"),
                }
            }
        }
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail={"success": False, "message": MESSAGES["ERROR"]["UNAUTHORIZED"]}
        )


@router.post("/refresh", response_model=ApiResponse)
@error_handler("토큰 갱신")
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """토큰 갱신 API"""
    if not refresh_data.refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": MESSAGES["ERROR"]["UNAUTHORIZED"]}
        )

    token_data = auth_service.refresh_token(refresh_data.refresh_token)

    return {
        "success": True,
        "message": "토큰이 갱신되었습니다",
        "data": {
            "token": token_data
        },
    }


@router.post("/logout", response_model=ApiResponse)
@error_handler("로그아웃")
async def logout(
    refresh_data: RefreshTokenRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """로그아웃 API"""
    if refresh_data.refresh_token:
        auth_service.logout(refresh_data.refresh_token)

    return {"success": True, "message": "로그아웃이 완료되었습니다"}