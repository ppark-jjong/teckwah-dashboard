# teckwah_project/main/dash/callbacks/common_callbacks.py
from dash import Dash, Output, Input, State, callback_context, no_update
from dash.exceptions import PreventUpdate
import dash_bootstrap_components as dbc
import logging
import json
from typing import Dict, Any, List, Optional

from components.navbar import create_navbar
from components.alerts import create_alert
from layouts.login_layout import create_login_layout
from layouts.dashboard_layout import create_dashboard_layout
from layouts.visualization_layout import create_visualization_layout
from layouts.download_layout import create_download_layout

from utils.auth_helper import is_token_valid, is_admin_user, handle_auth_error
from api.api_client import ApiClient

logger = logging.getLogger(__name__)

def register_callbacks(app: Dash):
    """공통 콜백 등록"""
    
    @app.callback(
        [
            Output("page-content", "children"),
            Output("navbar-container", "children"),
            Output("auth-store", "data", allow_duplicate=True),
            Output("url", "pathname", allow_duplicate=True)
        ],
        [
            Input("url", "pathname")
        ],
        [
            State("auth-store", "data"),
            State("user-info-store", "data")
        ],
        prevent_initial_call=True
    )
    def display_page(pathname, auth_data, user_info):
        """페이지 라우팅 처리"""
        ctx = callback_context
        if not ctx.triggered:
            raise PreventUpdate
        
        # 현재 경로
        current_path = pathname or "/"
        
        # 인증 상태 확인
        if not is_token_valid(auth_data) and current_path != "/":
            # 인증 정보 없음 => 로그인 페이지로 리다이렉트
            return create_login_layout(), html.Div(), None, "/"
        
        # 경로별 페이지 컴포넌트 반환
        if current_path == "/":
            # 이미 로그인된 상태라면 대시보드로 리다이렉트
            if is_token_valid(auth_data):
                return no_update, no_update, no_update, "/dashboard"
            else:
                return create_login_layout(), html.Div(), no_update, no_update
        
        elif current_path == "/dashboard":
            return create_dashboard_layout(), create_navbar(user_info), no_update, no_update
        
        elif current_path == "/visualization":
            return create_visualization_layout(), create_navbar(user_info), no_update, no_update
        
        elif current_path == "/download":
            # 관리자만 접근 가능
            if not is_admin_user(user_info):
                return dbc.Alert("관리자 권한이 필요합니다.", color="danger"), create_navbar(user_info), no_update, "/dashboard"
            return create_download_layout(), create_navbar(user_info), no_update, no_update
        
        else:
            # 알 수 없는 경로 => 대시보드로 리다이렉트
            return no_update, no_update, no_update, "/dashboard"
    
    @app.callback(
        Output("alert-container", "children"),
        [
            Input("app-state-store", "data")
        ],
        prevent_initial_call=True
    )
    def show_alert(app_state):
        """알림 메시지 표시"""
        if not app_state or not isinstance(app_state, dict):
            raise PreventUpdate
        
        # 알림 메시지 추출
        alert_data = app_state.get("alert")
        if not alert_data:
            raise PreventUpdate
        
        # 알림 속성 추출
        message = alert_data.get("message", "")
        color = alert_data.get("color", "primary")
        duration = alert_data.get("duration", 4000)
        
        # 내용이 없으면 무시
        if not message:
            raise PreventUpdate
        
        # 알림 컴포넌트 생성
        return create_alert(message, color, True, duration)
    
    @app.callback(
        Output("app-state-store", "data"),
        [
            Input("url", "search")  # dummy input, 실제로 사용하지 않음
        ],
        [
            State("app-state-store", "data")
        ],
        prevent_initial_call=True
    )
    def init_app_state(_, current_state):
        """앱 상태 초기화"""
        # 이미 초기화되어 있으면 업데이트 방지
        if current_state is not None:
            raise PreventUpdate
        
        # 기본 앱 상태 설정
        app_state = {
            "alert": None,
            "modals": {
                "detail": {"is_open": False, "dashboard_id": None},
                "assign": {"is_open": False, "selected_ids": []},
                "delete": {"is_open": False, "selected_ids": []},
                "new": {"is_open": False}
            },
            "filters": {
                "type": "ALL",
                "department": "ALL",
                "warehouse": "ALL"
            }
        }
        
        return app_state
    
    @app.callback(
        Output("modals-container", "children"),
        [
            Input("app-state-store", "data")
        ],
        prevent_initial_call=True
    )
    def render_modals(app_state):
        """모달 컴포넌트 렌더링"""
        if not app_state or "modals" not in app_state:
            raise PreventUpdate
        
        from components.modals import create_detail_modal, create_assign_modal, create_delete_confirm_modal, create_new_dashboard_modal
        
        # 모든 모달 컴포넌트 생성
        detail_modal = create_detail_modal()
        assign_modal = create_assign_modal()
        delete_modal = create_delete_confirm_modal()
        new_modal = create_new_dashboard_modal()
        
        return [detail_modal, assign_modal, delete_modal, new_modal]