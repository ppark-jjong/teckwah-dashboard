# backend/app/api/dashboard_lock_router.py 

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.schemas.dashboard_schema import LockResponse, LockRequest
from app.repositories.dashboard_lock_repository import DashboardLockRepository
from app.config.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth_schema import TokenData
from app.utils.logger import log_info, log_error
from app.utils.exceptions import PessimisticLockException

router = APIRouter()

def get_lock_repository(db: Session = Depends(get_db)) -> DashboardLockRepository:
    """DashboardLockRepository 의존성 주입"""
    return DashboardLockRepository(db)

@router.post("/{dashboard_id}/lock", response_model=LockResponse)
async def acquire_dashboard_lock(
    dashboard_id: int,
    lock_data: LockRequest,
    repository: DashboardLockRepository = Depends(get_lock_repository),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 락 획득 API"""
    try:
        log_info(f"락 획득 요청: dashboard_id={dashboard_id}, user_id={current_user.user_id}, type={lock_data.lock_type}")
        lock = repository.acquire_lock(dashboard_id, current_user.user_id, lock_data.lock_type)
        return LockResponse(
            success=True,
            message="락이 획득되었습니다",
            data={"dashboard_id": dashboard_id, "locked_by": current_user.user_id, "lock_type": lock_data.lock_type}
        )
    except PessimisticLockException as e:
        # 이미 락이 존재하는 경우
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail={"message": str(e.detail), "locked_by": e.locked_by}
        )
    except Exception as e:
        log_error(e, "락 획득 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="락 획득 중 오류가 발생했습니다"
        )

@router.delete("/{dashboard_id}/lock", response_model=LockResponse)
async def release_dashboard_lock(
    dashboard_id: int,
    repository: DashboardLockRepository = Depends(get_lock_repository),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 락 해제 API"""
    try:
        log_info(f"락 해제 요청: dashboard_id={dashboard_id}, user_id={current_user.user_id}")
        result = repository.release_lock(dashboard_id, current_user.user_id)
        return LockResponse(
            success=result,
            message="락이 해제되었습니다" if result else "락 해제에 실패했습니다",
            data={"dashboard_id": dashboard_id}
        )
    except Exception as e:
        log_error(e, "락 해제 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="락 해제 중 오류가 발생했습니다"
        )

@router.get("/{dashboard_id}/lock/status", response_model=LockResponse)
async def check_dashboard_lock(
    dashboard_id: int,
    repository: DashboardLockRepository = Depends(get_lock_repository),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 락 상태 확인 API"""
    try:
        log_info(f"락 상태 확인 요청: dashboard_id={dashboard_id}")
        lock_info = repository.get_lock_info(dashboard_id)
        
        if not lock_info:
            return LockResponse(
                success=True,
                message="락이 없습니다",
                data={"dashboard_id": dashboard_id, "is_locked": False}
            )
        
        return LockResponse(
            success=True,
            message="락 정보를 조회했습니다",
            data={
                "dashboard_id": dashboard_id,
                "is_locked": True,
                "locked_by": lock_info.locked_by,
                "lock_type": lock_info.lock_type,
                "expires_at": lock_info.expires_at.isoformat()
            }
        )
    except Exception as e:
        log_error(e, "락 상태 확인 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="락 상태 확인 중 오류가 발생했습니다"
        )

@router.post("/{dashboard_id}/lock/extend", response_model=LockResponse)
async def extend_dashboard_lock(
    dashboard_id: int,
    extension_seconds: Optional[int] = 300,  # 기본 5분 연장
    repository: DashboardLockRepository = Depends(get_lock_repository),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 락 타임아웃 연장 API"""
    try:
        log_info(f"락 연장 요청: dashboard_id={dashboard_id}, user_id={current_user.user_id}, seconds={extension_seconds}")
        
        # 현재 락 정보 조회
        lock_info = repository.get_lock_info(dashboard_id)
        
        if not lock_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="락이 없습니다"
            )
        
        # 자신의 락만 연장 가능
        if lock_info.locked_by != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="다른 사용자의 락은 연장할 수 없습니다"
            )
        
        # 락 연장
        lock_info.extend_expiry(extension_seconds)
        repository.db.commit()
        
        return LockResponse(
            success=True,
            message="락 타임아웃이 연장되었습니다",
            data={
                "dashboard_id": dashboard_id,
                "is_locked": True,
                "locked_by": lock_info.locked_by,
                "lock_type": lock_info.lock_type,
                "expires_at": lock_info.expires_at.isoformat()
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, "락 연장 실패")
        repository.db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="락 연장 중 오류가 발생했습니다"
        )