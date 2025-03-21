// src/services/ApiService.js
import axios from 'axios';
import message from '../utils/MessageService';
import { MessageKeys } from '../utils/Constants';
import TokenManager from '../utils/TokenManager';
import Logger from '../utils/Logger';

const logger = Logger.getLogger('ApiService');

/**
 * 통합 API 서비스
 * 모든 백엔드 API 요청을 처리하는 중앙 서비스
 */
class ApiService {
  // 인증 관련 API 호출
  async login(userId, password) {
    logger.info('로그인 요청:', userId);
    return this._request('post', '/auth/login', {
      user_id: userId,
      password,
    });
  }

  async refreshToken(refreshToken = null) {
    const tokenToUse = refreshToken || TokenManager.getRefreshToken();
    if (!tokenToUse) {
      throw new Error('갱신할 리프레시 토큰이 없습니다');
    }

    logger.info('토큰 갱신 요청');
    return this._request('post', '/auth/refresh', {
      refresh_token: tokenToUse,
    });
  }

  async logout() {
    const refreshToken = TokenManager.getRefreshToken();
    return this._request('post', '/auth/logout', {
      refresh_token: refreshToken,
    });
  }

  async checkSession() {
    return this._request('get', '/auth/check-session');
  }

  // 대시보드 관련 API 호출
  async getDashboardList(startDate, endDate) {
    logger.debug('대시보드 목록 요청:', startDate, endDate);
    return this._request('get', '/dashboard/list', {
      params: {
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
      },
    });
  }

  async getDashboardDetail(dashboardId) {
    return this._request('get', `/dashboard/${dashboardId}`);
  }

  async createDashboard(dashboardData) {
    return this._request('post', '/dashboard', dashboardData);
  }

  async searchDashboardsByOrderNo(orderNo) {
    return this._request('get', '/dashboard/search', {
      params: { order_no: orderNo.trim() },
    });
  }

  async updateDashboardFields(dashboardId, fields, clientVersion = null) {
    const requestData = {
      ...fields,
      ...(clientVersion ? { client_version: clientVersion } : {}),
    };
    return this._request(
      'patch',
      `/dashboard/${dashboardId}/fields`,
      requestData
    );
  }

  async updateStatus(dashboardId, status, isAdmin = false) {
    return this._request('patch', `/dashboard/${dashboardId}/status`, {
      status,
      is_admin: isAdmin,
    });
  }

  async assignDriver(driverData) {
    return this._request('post', '/dashboard/assign', driverData);
  }

  async deleteDashboards(dashboardIds) {
    return this._request('delete', '/dashboard', {
      data: { dashboard_ids: dashboardIds },
    });
  }

  // 메모 관련 API 호출
  async createRemark(dashboardId, content) {
    return this._request('post', `/dashboard/${dashboardId}/remarks`, {
      content,
    });
  }

  async updateRemark(dashboardId, remarkId, content) {
    return this._request(
      'patch',
      `/dashboard/${dashboardId}/remarks/${remarkId}`,
      { content }
    );
  }

  async deleteRemark(dashboardId, remarkId) {
    return this._request(
      'delete',
      `/dashboard/${dashboardId}/remarks/${remarkId}`
    );
  }

  // 락 관련 API 호출
  async acquireLock(dashboardId, lockType) {
    return this._request('post', `/dashboard/${dashboardId}/lock`, {
      lock_type: lockType,
    });
  }

  async releaseLock(dashboardId) {
    return this._request('delete', `/dashboard/${dashboardId}/lock`);
  }

  async checkLockStatus(dashboardId) {
    return this._request('get', `/dashboard/${dashboardId}/lock/status`);
  }

  // 시각화 관련 API 호출
  async getDeliveryStatus(startDate, endDate) {
    return this._request('get', '/visualization/delivery_status', {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    });
  }

  async getHourlyOrders(startDate, endDate) {
    return this._request('get', '/visualization/hourly_orders', {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    });
  }

  async getDateRange() {
    return this._request('get', '/visualization/date_range');
  }

  // 공통 요청 처리 메서드
  async _request(method, url, data = {}) {
    try {
      const config = { method, url, ...data };
      const response = await axios(config);

      if (!response.data) {
        throw new Error('응답 데이터가 없습니다');
      }

      return response.data.success
        ? response.data.data || response.data
        : Promise.reject(new Error(response.data.message || '요청 처리 실패'));
    } catch (error) {
      logger.error(`API 요청 오류: ${method.toUpperCase()} ${url}`, error);
      throw error;
    }
  }
}

export default new ApiService();
