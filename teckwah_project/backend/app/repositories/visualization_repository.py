# visualization_repository.py
from datetime import datetime
from typing import List, Tuple, Dict, Any, Union
from sqlalchemy import func, and_, extract
from sqlalchemy.orm import Session
from app.models.dashboard_model import Dashboard
from app.utils.logger import log_error, log_info


class VisualizationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_raw_delivery_data(
        self, start_date: datetime, end_date: datetime
    ) -> List[Tuple]:
        """배송 현황 raw 데이터 조회 - create_time 기준"""
        try:
            log_info(f"배송 현황 데이터 조회: {start_date} ~ {end_date}")

            # 하루 단위로 조회 (00:00:00 ~ 23:59:59)
            start_time = start_date.replace(hour=0, minute=0, second=0)
            end_time = end_date.replace(hour=23, minute=59, second=59)

            result = (
                self.db.query(
                    Dashboard.department, Dashboard.status, Dashboard.create_time
                )
                .filter(
                    and_(
                        Dashboard.create_time >= start_time,
                        Dashboard.create_time <= end_time,
                    )
                )
                .all()
            )

            log_info(f"배송 현황 데이터 조회 결과: {len(result)}건")
            return result
        except Exception as e:
            log_error(e, "배송 현황 데이터 조회 실패")
            raise

    def get_raw_hourly_data(
        self, start_date: datetime, end_date: datetime
    ) -> List[Tuple]:
        """시간대별 접수량 raw 데이터 조회 - create_time 기준"""
        try:
            log_info(f"시간대별 접수량 데이터 조회: {start_date} ~ {end_date}")

            # 하루 단위로 조회 (00:00:00 ~ 23:59:59)
            start_time = start_date.replace(hour=0, minute=0, second=0)
            end_time = end_date.replace(hour=23, minute=59, second=59)

            result = (
                self.db.query(Dashboard.department, Dashboard.create_time)
                .filter(
                    and_(
                        Dashboard.create_time >= start_time,
                        Dashboard.create_time <= end_time,
                    )
                )
                .all()
            )

            log_info(f"시간대별 접수량 데이터 조회 결과: {len(result)}건")
            return result
        except Exception as e:
            log_error(e, "시간대별 접수량 데이터 조회 실패")
            raise

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """조회 가능한 날짜 범위 조회 - create_time 기준"""
        try:
            log_info("조회 가능 날짜 범위 조회")
            result = self.db.query(
                func.min(Dashboard.create_time).label("oldest_date"),
                func.max(Dashboard.create_time).label("latest_date"),
            ).first()

            oldest_date = result.oldest_date if result.oldest_date else datetime.now()
            latest_date = result.latest_date if result.latest_date else datetime.now()

            log_info(f"조회 가능 날짜 범위: {oldest_date} ~ {latest_date}")
            return oldest_date, latest_date
        except Exception as e:
            log_error(e, "날짜 범위 조회 실패")
            raise

    def has_data_in_date_range(self, start_date: datetime, end_date: datetime) -> bool:
        """특정 날짜 범위에 데이터가 있는지 확인"""
        try:
            log_info(f"데이터 존재 여부 확인: {start_date} ~ {end_date}")

            # 하루 단위로 조회 (00:00:00 ~ 23:59:59)
            start_time = start_date.replace(hour=0, minute=0, second=0)
            end_time = end_date.replace(hour=23, minute=59, second=59)

            count = (
                self.db.query(func.count(Dashboard.dashboard_id))
                .filter(
                    and_(
                        Dashboard.create_time >= start_time,
                        Dashboard.create_time <= end_time,
                    )
                )
                .scalar()
            )

            has_data = count > 0
            log_info(f"데이터 존재 여부: {has_data} (건수: {count})")
            return has_data
        except Exception as e:
            log_error(e, "데이터 존재 여부 확인 실패")
            return False
