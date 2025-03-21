# app/models/dashboard_model.py
from sqlalchemy import (
    Column,
    BigInteger,
    Integer,
    String,
    Enum,
    DateTime,
    Text,
    ForeignKey,
    Computed,
)
from sqlalchemy.orm import relationship
from app.config.database import Base


class Dashboard(Base):
    __tablename__ = "dashboard"

    dashboard_id = Column(Integer, primary_key=True, autoincrement=True)
    order_no = Column(String(15), nullable=False)
    type = Column(Enum("DELIVERY", "RETURN"), nullable=False)
    status = Column(
        Enum("WAITING", "IN_PROGRESS", "COMPLETE", "ISSUE", "CANCEL"),
        server_default="WAITING",
        nullable=False,
        index=True,
    )
    department = Column(Enum("CS", "HES", "LENOVO"), nullable=False, index=True)
    warehouse = Column(Enum("SEOUL", "BUSAN", "GWANGJU", "DAEJEON"), nullable=False)
    sla = Column(String(10), nullable=False)
    eta = Column(DateTime, nullable=False, index=True)
    create_time = Column(DateTime, nullable=False)
    depart_time = Column(DateTime, nullable=True)
    complete_time = Column(DateTime, nullable=True)
    postal_code = Column(
        String(5), ForeignKey("postal_code.postal_code"), nullable=False
    )
    city = Column(String(21), nullable=True)
    county = Column(String(51), nullable=True)
    district = Column(String(51), nullable=True)
    region = Column(
        String(153), Computed("CONCAT(city, ' ', county, ' ', district)"), nullable=True
    )
    distance = Column(Integer, nullable=True)
    duration_time = Column(Integer, nullable=True)
    address = Column(Text, nullable=False)
    customer = Column(String(150), nullable=False)
    contact = Column(String(20), nullable=True)
    driver_name = Column(String(153), nullable=True)
    driver_contact = Column(String(50), nullable=True)
    # version 필드 제거함

    # Relationships
    postal_code_info = relationship("PostalCode", backref="dashboards", viewonly=True)

    # 새로운 관계 추가
    remarks = relationship(
        "DashboardRemark", back_populates="dashboard", cascade="all, delete-orphan"
    )
    locks = relationship(
        "DashboardLock", back_populates="dashboard", cascade="all, delete-orphan"
    )