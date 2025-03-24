# app/api/dashboard_remark_router.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.schemas.dashboard_schema import RemarkResponse, RemarkUpdate
from app.services.dashboard_remark_service import DashboardRemarkService
from app.repositories.dashboard_remark_repository import DashboardRemarkRepository
from app.repositories.dashboard_lock_repository import DashboardLockRepository
from app.repositories.dashboard_repository import DashboardRepository
from app.config.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth_schema import TokenData
from app.utils.logger import log_info, log_error
from app.utils.api_decorators import error_handler
from app.utils.lock_manager import LockManager

router = APIRouter()


def get_remark_service(db: Session = Depends(get_db)) -> DashboardRemarkService:
    """DashboardRemarkService 의존성 주입"""
    remark_repository = DashboardRemarkRepository(db)
    lock_repository = DashboardLockRepository(db)
    dashboard_repository = DashboardRepository(db)
    lock_manager = LockManager(lock_repository)

    return DashboardRemarkService(
        remark_repository, lock_repository, dashboard_repository, lock_manager
    )


# 메모 생성 API는 제거 (대시보드 생성 시 자동 생성)

@router.patch("/{dashboard_id}/remarks/{remark_id}", response_model=RemarkResponse)
@error_handler("메모 업데이트")
async def update_remark(
    dashboard_id: int,
    remark_id: int,
    remark_update: RemarkUpdate,
    service: DashboardRemarkService = Depends(get_remark_service),
    current_user: TokenData = Depends(get_current_user),
):
    """메모 업데이트 API (비관적 락 적용)"""
    log_info(f"메모 업데이트 요청: 메모 ID {remark_id}")
    result = service.update_remark(remark_id, remark_update, current_user.user_id)
    return result


# 메모 삭제 API는 제거 (삭제 기능 비활성화)