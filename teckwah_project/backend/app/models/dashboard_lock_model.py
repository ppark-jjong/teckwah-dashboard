# app/models/dashboard_lock_model.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.config.database import Base
from datetime import datetime, timedelta


class DashboardLock(Base):
    __tablename__ = "dashboard_lock"

    dashboard_id = Column(
        Integer,
        ForeignKey("dashboard.dashboard_id", ondelete="CASCADE"),
        primary_key=True,
    )
    locked_by = Column(String(50), nullable=False)  # 락을 획득한 사용자 ID
    locked_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    lock_type = Column(Enum("EDIT", "STATUS", "ASSIGN", "REMARK"), nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)  # 락 만료 시간
    lock_timeout = Column(Integer, nullable=False, default=300)  # 락 타임아웃(초)

    # 관계 설정
    dashboard = relationship("Dashboard", back_populates="locks")

    def __repr__(self):
        return (
            f"<DashboardLock(dashboard_id={self.dashboard_id}, type={self.lock_type})>"
        )

    @property
    def is_expired(self):
        """락 만료 여부 확인"""
        return datetime.utcnow() > self.expires_at
        
    def extend_expiry(self, seconds=None):
        """락 만료 시간 연장"""
        seconds = seconds or self.lock_timeout
        self.expires_at = datetime.utcnow() + timedelta(seconds=seconds)