# teckwah_project/main/server/repositories/dashboard_repository.py
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, and_, or_, text
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import pytz

from main.server.models.dashboard_model import Dashboard
from main.server.models.dashboard_lock_model import DashboardLock
from main.server.models.dashboard_remark_model import DashboardRemark
from main.server.models.postal_code_model import PostalCode, PostalCodeDetail
from main.server.utils.logger import log_info, log_error
from main.server.utils.datetime_helper import KST, get_kst_now, localize_to_kst
from main.server.utils.exceptions import PessimisticLockException


class DashboardRepository:
    """통합된 대시보드 저장소 구현 - 대시보드, 메모 관련 기능 통합"""

    def __init__(self, db: Session):
        self.db = db

    #
    # [대시보드 기본 기능 영역]
    #
    def get_dashboard_list_by_date(
        self, start_date: datetime, end_date: datetime
    ) -> List[Dashboard]:
        """ETA 기준으로 날짜 범위 내 대시보드 목록 조회"""
        try:
            log_info(f"대시보드 목록 조회: {start_date} ~ {end_date}")
            query = (
                self.db.query(Dashboard)
                .filter(Dashboard.eta.between(start_date, end_date))
                .order_by(Dashboard.eta)
            )
            result = query.all()
            log_info(f"대시보드 목록 조회 결과: {len(result)}건")
            return result
        except Exception as e:
            log_error(e, "대시보드 목록 조회 실패")
            return []

    def get_dashboard_detail(self, dashboard_id: int) -> Optional[Dashboard]:
        """대시보드 상세 정보 조회"""
        try:
            log_info(f"대시보드 상세 조회: ID={dashboard_id}")
            dashboard = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .options(joinedload(Dashboard.postal_code_info))
                .first()
            )
            return dashboard
        except Exception as e:
            log_error(e, "대시보드 상세 조회 실패", {"id": dashboard_id})
            return None

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """조회 가능한 날짜 범위 조회 (ETA 기준)"""
        try:
            log_info("대시보드 날짜 범위 조회")
            # 가장 빠른 날짜와 가장 늦은 날짜 조회
            result = self.db.query(
                func.min(Dashboard.eta).label("oldest_date"),
                func.max(Dashboard.eta).label("latest_date"),
            ).first()

            # 올바른 시간대 처리로 수정
            now = get_kst_now()
            oldest_date = result.oldest_date or now - timedelta(days=30)
            latest_date = result.latest_date or now

            # 시간대 정보 없는 경우 KST로 변환
            oldest_date = localize_to_kst(oldest_date)
            latest_date = localize_to_kst(latest_date)

            log_info(f"날짜 범위 조회 결과: {oldest_date} ~ {latest_date}")
            return oldest_date, latest_date
        except Exception as e:
            log_error(e, "날짜 범위 조회 실패")
            # 실패 시 기본값으로 현재 날짜 기준 30일 범위 반환
            now = get_kst_now()
            return now - timedelta(days=30), now

    def create_dashboard(self, dashboard_data: Dict[str, Any]) -> Optional[Dashboard]:
        """대시보드 생성"""
        try:
            log_info(f"대시보드 생성: {dashboard_data}")
            dashboard = Dashboard(**dashboard_data)
            self.db.add(dashboard)
            self.db.flush()  # ID 생성을 위해 flush
            self.db.refresh(dashboard)
            log_info(f"대시보드 생성 완료: ID={dashboard.dashboard_id}")
            return dashboard
        except Exception as e:
            log_error(e, "대시보드 생성 실패", dashboard_data)
            self.db.rollback()
            return None

    def update_dashboard_fields(
        self, dashboard_id: int, fields: Dict[str, Any]
    ) -> Optional[Dashboard]:
        """대시보드 필드 업데이트 - 비즈니스 로직 제거"""
        try:
            log_info(f"대시보드 필드 업데이트: ID={dashboard_id}, 필드={fields}")

            # 필드 업데이트 (단순 DB 작업만 수행)
            result = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .update(fields)
            )

            if result:
                dashboard = self.get_dashboard_detail(dashboard_id)
                log_info(f"대시보드 필드 업데이트 완료: ID={dashboard_id}")
                return dashboard
            else:
                log_info(f"업데이트할 대시보드 없음: ID={dashboard_id}")
                return None

        except Exception as e:
            log_error(
                e, "대시보드 필드 업데이트 실패", {"id": dashboard_id, "fields": fields}
            )
            self.db.rollback()
            return None

    def assign_driver(
        self, dashboard_ids: List[int], driver_name: str, driver_contact: str
    ) -> List[Dashboard]:
        """배차 처리 (여러 대시보드에 배차 담당자 할당)"""
        try:
            log_info(f"배차 처리: IDs={dashboard_ids}, 담당자={driver_name}")

            # 배차 정보 업데이트
            result = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id.in_(dashboard_ids))
                .update(
                    {
                        "driver_name": driver_name,
                        "driver_contact": driver_contact,
                    },
                    synchronize_session=False,  # bulk update 최적화
                )
            )

            # 업데이트된 대시보드 목록 조회
            updated_dashboards = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id.in_(dashboard_ids))
                .all()
            )

            log_info(f"배차 처리 완료: {len(updated_dashboards)}건")
            return updated_dashboards

        except Exception as e:
            log_error(
                e, "배차 처리 실패", {"ids": dashboard_ids, "driver": driver_name}
            )
            self.db.rollback()
            return []

    def delete_dashboards(self, dashboard_ids: List[int]) -> int:
        """대시보드 삭제 (관리자 전용)"""
        try:
            log_info(f"대시보드 삭제: IDs={dashboard_ids}")

            # 삭제 전 메모 및 락 확인
            result = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id.in_(dashboard_ids))
                .delete(synchronize_session=False)  # bulk delete 최적화
            )

            log_info(f"대시보드 삭제 완료: {result}건")
            return result
        except Exception as e:
            log_error(e, "대시보드 삭제 실패", {"ids": dashboard_ids})
            self.db.rollback()
            return 0

    def search_dashboards_by_order_no(self, order_no: str) -> List[Dashboard]:
        """주문번호로 대시보드 검색"""
        try:
            log_info(f"주문번호 검색: {order_no}")

            # LIKE 검색 조건 생성 (주문번호에 검색어가 포함된 경우)
            search_term = f"%{order_no}%"

            dashboards = (
                self.db.query(Dashboard)
                .filter(Dashboard.order_no.like(search_term))
                .order_by(desc(Dashboard.eta))
                .all()
            )

            log_info(f"주문번호 검색 결과: {len(dashboards)}건")
            return dashboards
        except Exception as e:
            log_error(e, "주문번호 검색 실패", {"order_no": order_no})
            return []
            
    # 락 관련 메서드는 유지하되 LockManager에 위임하는 방식으로 변경
    def get_lock_info(self, dashboard_id: int) -> Optional[DashboardLock]:
        """락 정보 조회"""
        try:
            lock = (
                self.db.query(DashboardLock)
                .filter(DashboardLock.dashboard_id == dashboard_id)
                .first()
            )

            return lock
        except Exception as e:
            log_error(e, "락 정보 조회 실패", {"dashboard_id": dashboard_id})
            return None
            
    # 메모 관련 기능은 그대로 유지
    def get_remarks_by_dashboard_id(self, dashboard_id: int) -> List[DashboardRemark]:
        """대시보드 ID별 메모 목록 조회 (최신순)"""
        try:
            remarks = (
                self.db.query(DashboardRemark)
                .filter(DashboardRemark.dashboard_id == dashboard_id)
                .order_by(desc(DashboardRemark.created_at))
                .all()
            )
            return remarks
        except Exception as e:
            log_error(e, "메모 목록 조회 실패", {"dashboard_id": dashboard_id})
            return []

    def get_remark_by_id(self, remark_id: int) -> Optional[DashboardRemark]:
        """메모 ID로 메모 조회"""
        try:
            remark = (
                self.db.query(DashboardRemark)
                .filter(DashboardRemark.remark_id == remark_id)
                .first()
            )
            return remark
        except Exception as e:
            log_error(e, "메모 조회 실패", {"remark_id": remark_id})
            return None

    def create_empty_remark(
        self, dashboard_id: int, user_id: str
    ) -> Optional[DashboardRemark]:
        """
        빈 메모 생성 (대시보드 생성 시 자동 호출용)
        - 내용이 null인 초기 메모 생성
        """
        try:
            # 1. 대시보드 존재 확인
            dashboard = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .first()
            )
            if not dashboard:
                log_error(
                    None,
                    "메모 생성 실패: 대시보드 없음",
                    {"dashboard_id": dashboard_id},
                )
                return None

            # 2. 빈 메모 생성
            now = get_kst_now()
            remark = DashboardRemark(
                dashboard_id=dashboard_id,
                content=None,  # 빈 내용 (NULL)
                created_at=now,
                created_by=user_id,
                formatted_content="",  # 접두사 제거
            )

            self.db.add(remark)
            self.db.flush()
            self.db.refresh(remark)

            log_info(
                f"빈 메모 생성 완료: ID={remark.remark_id}, 대시보드 ID={dashboard_id}"
            )
            return remark

        except Exception as e:
            log_error(e, "빈 메모 생성 실패", {"dashboard_id": dashboard_id})
            self.db.rollback()
            return None

    def update_remark(
        self, remark_id: int, content: str, user_id: str
    ) -> Optional[DashboardRemark]:
        """
        메모 업데이트
        """
        try:
            # 1. 기존 메모 조회
            remark = self.get_remark_by_id(remark_id)

            if not remark:
                log_error(
                    None, "메모 업데이트 실패: 메모 없음", {"remark_id": remark_id}
                )
                return None

            # 2. 메모 내용 및 포맷팅된 내용 업데이트
            remark.content = content
            remark.formatted_content = content

            # 3. 변경 사항 저장
            self.db.flush()

            log_info(
                f"메모 업데이트 완료: ID={remark.remark_id}, 대시보드 ID={remark.dashboard_id}"
            )
            return remark

        except Exception as e:
            log_error(e, "메모 업데이트 실패", {"remark_id": remark_id})
            self.db.rollback()
            return None