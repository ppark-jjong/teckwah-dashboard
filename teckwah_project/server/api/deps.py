# server/api/deps.py - 필요한 함수 추가

from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Request, Cookie, Header
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from datetime import datetime

from server.config.database import get_db
from server.config.settings import get_settings, Settings
from server.schemas.auth_schema import TokenData
from server.utils.logger import log_info, log_error, set_request_id
from server.repositories.dashboard_repository import DashboardRepository
from server.utils.datetime import get_kst_now
from server.utils.constants import MESSAGES
from server.utils.datetime import get_kst_now as get_kst_now_helper
from server.utils.auth import get_token_data_from_header, verify_admin_role
from server.utils.error import ForbiddenException

settings = get_settings()


def get_dashboard_repository(db: Session = Depends(get_db)) -> DashboardRepository:
    """대시보드 레포지토리 의존성 주입"""
    return DashboardRepository(db)


def get_request_id():
    """요청 ID 생성"""
    import uuid

    return str(uuid.uuid4())


def get_settings_dependency():
    """설정 의존성"""
    return settings


async def get_current_user(
    authorization: str = Header(None, alias="Authorization"),
    request: Request = None,
) -> TokenData:
    """Authorization 헤더에서 토큰 추출하여 사용자 정보 반환

    모든 인증이 필요한 API 엔드포인트에서 사용되는 의존성 함수입니다.
    """
    try:
        return get_token_data_from_header(authorization)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "message": MESSAGES["ERROR"]["UNAUTHORIZED"],
                "error_code": "UNAUTHORIZED",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )


async def check_admin_access(current_user: TokenData = Depends(get_current_user)):
    """관리자 권한 체크"""
    return await verify_admin_role(current_user)


async def get_user_is_admin(
    current_user: TokenData = Depends(get_current_user),
) -> bool:
    """사용자의 관리자 권한 여부 확인

    current_user의 role이 ADMIN인지 확인하고, 그렇지 않으면 ForbiddenException을 발생시킵니다.
    handover_router.py 및 기타 관리자 권한이 필요한 라우터에서 사용됩니다.
    """
    if not current_user or current_user.role != "ADMIN":
        raise ForbiddenException("관리자 권한이 필요합니다")
    return True


async def get_transaction_db():
    """트랜잭션 세션 제공 (with 구문과 사용)"""
    db = next(get_db())
    try:
        yield db
        db.commit()
    except:
        db.rollback()
        raise
    finally:
        db.close()
