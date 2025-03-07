// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import AuthService from '../services/AuthService';
import message from '../utils/message';
import ErrorHandler from '../utils/ErrorHandler';
import { MessageKeys } from '../utils/message';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 초기 인증 상태 확인
  useEffect(() => {
    const initAuth = async () => {
      try {
        setAuthChecking(true);
        const currentUser = AuthService.getCurrentUser();

        if (!currentUser) {
          if (location.pathname !== '/login') {
            localStorage.setItem('returnUrl', location.pathname);
            navigate('/login');
          }
          setLoading(false);
          setAuthChecking(false);
          return;
        }

        // 세션 유효성 확인
        try {
          const token = localStorage.getItem('access_token');
          if (!token) {
            throw new Error('No token available');
          }

          await axios.get('/auth/check-session', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setUser(currentUser);
        } catch (error) {
          console.log('세션 체크 실패, 토큰 갱신 시도', error);

          // 세션 체크 실패 시 토큰 갱신 시도
          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await AuthService.refreshToken(refreshToken);
            if (response && response.token) {
              // 갱신된 토큰 저장
              localStorage.setItem('access_token', response.token.access_token);
              localStorage.setItem(
                'refresh_token',
                response.token.refresh_token
              );
              setUser(currentUser);
              console.log('토큰 갱신 성공');
            } else {
              throw new Error('Token refresh failed');
            }
          } catch (refreshError) {
            // 갱신 실패 시 로그인 페이지로
            console.error('Token refresh failed:', refreshError);
            AuthService.clearAuthData();
            if (location.pathname !== '/login') {
              localStorage.setItem('returnUrl', location.pathname);
              message.warning(
                '세션이 만료되었습니다. 다시 로그인해주세요.',
                MessageKeys.AUTH.SESSION_EXPIRED
              );
              navigate('/login');
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        AuthService.clearAuthData();
      } finally {
        setLoading(false);
        setAuthChecking(false);
      }
    };

    initAuth();
  }, [navigate, location.pathname]);

  const login = async (userId, password) => {
    try {
      console.log('로그인 요청:', userId);

      const response = await AuthService.login(userId, password);

      // 응답 구조 로깅 (디버깅용)
      console.log('로그인 응답 구조:', response);

      // 사용자 정보 설정
      if (response && response.user) {
        setUser(response.user);
      } else {
        console.error('로그인 응답에 사용자 정보가 없습니다:', response);
        throw new Error('로그인 응답 형식이 올바르지 않습니다');
      }

      // 저장된 returnUrl이 있으면 해당 위치로, 없으면 대시보드로
      const returnUrl = localStorage.getItem('returnUrl');
      const redirectTo = returnUrl || '/dashboard';
      localStorage.removeItem('returnUrl');

      navigate(redirectTo);
      message.success('로그인되었습니다', MessageKeys.AUTH.LOGIN);
      return response;
    } catch (error) {
      // ErrorHandler를 통한 일관된 에러 처리
      console.error('로그인 실패:', error);
      ErrorHandler.handle(error, 'login');
      throw error;
    }
  };

  const logout = async () => {
    message.loading('로그아웃 중...', MessageKeys.AUTH.LOGOUT);
    try {
      await AuthService.logout();
      setUser(null);
      message.success('로그아웃되었습니다', MessageKeys.AUTH.LOGOUT);
      navigate('/login');
    } catch (error) {
      // 로그아웃 실패 시에도 클라이언트 상태는 초기화
      setUser(null);
      ErrorHandler.handle(error, 'logout');
      navigate('/login');
    }
  };

  // 인증 데이터 초기화 및 리다이렉트 헬퍼 함수
  const resetAuthAndRedirect = () => {
    AuthService.clearAuthData();
    setUser(null);

    if (location.pathname !== '/login') {
      localStorage.setItem('returnUrl', location.pathname);
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div className="loading-spinner"></div>
        <p>인증 정보 확인 중...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        authChecking,
        resetAuthAndRedirect,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
