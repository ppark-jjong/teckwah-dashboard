# teckwah_project/main/dash/layouts/login_layout.py
from dash import html, dcc
import dash_bootstrap_components as dbc

def create_login_layout():
    """로그인 페이지 레이아웃 생성"""
    return dbc.Container([
        dbc.Row([
            dbc.Col([
                html.Div([
                    html.H2("배송 실시간 관제 시스템", className="text-center mb-4"),
                    html.Div([
                        html.Img(src="/assets/logo.png", className="mx-auto d-block mb-4", 
                                style={"maxWidth": "200px"}, id="logo-image"),
                    ], className="text-center"),
                    
                    # 로그인 양식
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("로그인", className="card-title text-center mb-4"),
                            
                            # Form 태그 추가 - Enter 키 대응
                            html.Form([
                                # 사용자 ID 입력
                                html.Div([
                                    dbc.Label("사용자 ID", html_for="user_id"),
                                    dbc.Input(
                                        type="text",
                                        id="user_id",
                                        placeholder="사용자 ID를 입력하세요",
                                        className="mb-3"
                                    ),
                                ], className="mb-3"),
                                
                                # 비밀번호 입력
                                html.Div([
                                    dbc.Label("비밀번호", html_for="password"),
                                    dbc.Input(
                                        type="password",
                                        id="password",
                                        placeholder="비밀번호를 입력하세요",
                                        className="mb-4"
                                    ),
                                ], className="mb-3"),
                                
                                # 로그인 버튼
                                dbc.Button(
                                    "로그인",
                                    id="login-button",
                                    color="primary",
                                    className="w-100 mb-3",
                                    type="submit"
                                ),
                                
                                # 숨겨진 div - Enter 키 이벤트 트리거용
                                html.Div(id="login-trigger", style={"display": "none"}),
                            ], id="login-form"),
                            
                            # 로그인 상태/오류 메시지 영역
                            html.Div(id="login-message", className="text-center text-danger")
                        ])
                    ], className="shadow")
                ], className="p-4 bg-white rounded shadow-sm")
            ], md=6, lg=4, className="mx-auto")
        ], className="align-items-center min-vh-100")
    ], fluid=True, className="bg-light min-vh-100")