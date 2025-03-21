# backend/app/schemas/dashboard_schema.py
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from .common_schema import BaseResponse, DateRangeInfo
from enum import Enum


# 배송 타입 정의
class DeliveryType(str, Enum):
    DELIVERY = "DELIVERY"
    RETURN = "RETURN"


class RemarkResponse(BaseModel):
    remark_id: int
    dashboard_id: int
    content: str
    created_at: datetime
    created_by: str
    formatted_content: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator('formatted_content', mode='before')
    @classmethod
    def set_formatted_content_default(cls, v, info):
        # None인 경우 content와 created_by 필드로 자동 생성
        if v is None:
            try:
                content = info.data.get('content', '')
                created_by = info.data.get('created_by', '')
                return f"{created_by}: {content}"
            except Exception:
                return ""  # 예외 발생 시 빈 문자열 반환
        return v

class RemarkCreate(BaseModel):
    content: str = Field(max_length=2000, description="메모 내용(2000자 이내)")


class RemarkUpdate(BaseModel):
    content: str = Field(max_length=2000, description="변경할 메모 내용")


# 배송 상태 정의
class DeliveryStatus(str, Enum):
    WAITING = "WAITING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETE = "COMPLETE"
    ISSUE = "ISSUE"
    CANCEL = "CANCEL"


# 부서 정의
class Department(str, Enum):
    CS = "CS"
    HES = "HES"
    LENOVO = "LENOVO"


# 창고 정의
class Warehouse(str, Enum):
    SEOUL = "SEOUL"
    BUSAN = "BUSAN"
    GWANGJU = "GWANGJU"
    DAEJEON = "DAEJEON"


# 기본 대시보드 필드
class DashboardBase(BaseModel):
    type: DeliveryType
    warehouse: Warehouse
    order_no: str = Field(
        max_length=15,
        pattern=r"^[\d\-]+$",
        description="주문번호는 15자 이내의 숫자여야 합니다",
    )
    eta: datetime = Field(description="예상 도착 시간")


# 생성 요청
class DashboardCreate(DashboardBase):
    sla: str = Field(max_length=10, description="SLA(10자 이내)")
    postal_code: str = Field(
        min_length=5, max_length=5, pattern=r"^\d{5}$", description="5자리 우편번호"
    )
    address: str = Field(description="배송 주소")
    customer: str = Field(None, max_length=50, description="수령인 이름")
    contact: Optional[str] = Field(
        None, pattern=r"^\d{2,3}-\d{3,4}-\d{4}$", description="연락처(xxx-xxxx-xxxx)"
    )


# 기본 응답
class DashboardResponse(DashboardBase):
    dashboard_id: int
    department: Department
    status: DeliveryStatus
    driver_name: Optional[str] = None
    create_time: datetime
    depart_time: Optional[datetime] = None
    customer: str
    region: Optional[str] = None
    version: int
    sla: str

    model_config = ConfigDict(from_attributes=True)


# 상세 응답 (기본 응답 확장)
class DashboardDetail(DashboardResponse):
    driver_contact: Optional[str] = None
    complete_time: Optional[datetime] = None
    address: str
    postal_code: str
    distance: Optional[int] = None
    duration_time: Optional[int] = None
    customer: str
    contact: Optional[str] = None
    remarks: List[RemarkResponse] = Field(default_factory=list)  # 메모 리스트 추가
    city: Optional[str] = None
    county: Optional[str] = None
    district: Optional[str] = None
    sla: str


# 목록 데이터
class DashboardListData(BaseModel):
    items: List[DashboardResponse]
    date_range: Dict[str, str]
    user_role: Optional[str] = None
    is_admin: Optional[bool] = False


# 목록 응답
class DashboardListResponse(BaseResponse):
    data: Optional[Dict[str, Any]] = None


# 관리자 목록 응답
class AdminDashboardListResponse(BaseResponse):
    data: Optional[Dict[str, Any]] = None


# 상세 응답 - 버전 정보 필드 추가
class DashboardDetailResponse(BaseResponse):
    data: Optional[DashboardDetail] = None
    postal_code_error: bool = False  # 우편번호 오류 플래그 추가
    is_latest: bool = True  # 클라이언트 버전이 최신인지 여부
    version_info: Optional[Dict[str, Any]] = None  # 버전 정보 추가


# 상태 변경
class StatusUpdate(BaseModel):
    status: DeliveryStatus = Field(description="변경할 상태")
    is_admin: bool = Field(default=False, description="관리자 권한 사용 여부")


# 필드 업데이트 
class FieldsUpdate(BaseModel):
    eta: Optional[datetime] = None
    customer: Optional[str] = Field(None, max_length=50)
    contact: Optional[str] = Field(None, pattern=r"^\d{2,3}-\d{3,4}-\d{4}$")
    address: Optional[str] = None
    postal_code: Optional[str] = Field(
        None, min_length=5, max_length=5, pattern=r"^\d{5}$"
    )


# 배차 처리 (비관적 락으로 전환)
class DriverAssignment(BaseModel):
    dashboard_ids: List[int] = Field(description="대시보드 ID 목록")
    driver_name: str = Field(
        min_length=1, max_length=50, description="배송 담당자 이름"
    )
    driver_contact: str = Field(
        pattern=r"^\d{2,3}-\d{3,4}-\d{4}$", description="배송 담당자 연락처"
    )