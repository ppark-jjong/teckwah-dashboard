import apiClient from './Client';
import { getTodayDate } from '../utils/Helpers';

/**
 * 대시보드 목록 조회 API
 * @param {Object} params - 조회 파라미터
 * @param {string} params.start - 시작 날짜 (ETA 기준)
 * @param {string} params.end - 종료 날짜 (ETA 기준)
 * @param {number} params.page - 페이지 번호
 * @param {number} params.limit - 페이지 사이즈
 * @returns {Promise<Object>} - 대시보드 목록 응답 데이터
 */
export const getDashboardList = async (params = {}) => {
  // 날짜 범위가 없는 경우 기본값으로 오늘 날짜 설정
  const today = getTodayDate();
  const requestParams = {
    ...params,
    start: params.start || today,
    end: params.end || today,
  };

  // 항상 필요한 파라미터인 start와 end가 있는지 검증
  if (!requestParams.start || !requestParams.end) {
    console.error('필수 파라미터 누락: start, end');
    throw new Error('조회 기간을 지정해주세요.');
  }

  console.log('대시보드 목록 API 요청 최종 파라미터:', requestParams);

  try {
    return await apiClient.get('/dashboard/list', { params: requestParams });
  } catch (error) {
    console.error('대시보드 목록 조회 API 오류:', error);
    throw error;
  }
};

/**
 * 대시보드 검색 API
 * @param {Object} params - 검색 파라미터
 * @param {string} params.search - 검색어 (필수)
 * @param {number} params.page - 페이지 번호
 * @param {number} params.limit - 페이지 사이즈
 * @returns {Promise<Object>} - 검색 결과 응답 데이터
 */
export const searchDashboard = async (params = {}) => {
  // 검색어 필수 검증
  if (!params.search) {
    console.error('필수 파라미터 누락: search');
    throw new Error('검색어를 입력해주세요.');
  }

  console.log('대시보드 검색 API 요청 파라미터:', params);

  try {
    return await apiClient.get('/dashboard/search', { params });
  } catch (error) {
    console.error('대시보드 검색 API 오류:', error);
    throw error;
  }
};

/**
 * 대시보드 상세 조회 API
 * @param {number} id - 대시보드 ID
 * @returns {Promise<Object>} - 대시보드 상세 응답 데이터
 */
export const getDashboardDetail = async (id) => {
  return await apiClient.get(`/dashboard/${id}`);
};

/**
 * 대시보드 생성 API
 * @param {Object} data - 대시보드 생성 데이터
 * @returns {Promise<Object>} - 대시보드 생성 응답 데이터
 */
export const createDashboard = async (data) => {
  return await apiClient.post('/dashboard', data);
};

/**
 * 대시보드 수정 API
 * @param {number} id - 대시보드 ID
 * @param {Object} data - 대시보드 수정 데이터
 * @returns {Promise<Object>} - 대시보드 수정 응답 데이터
 */
export const updateDashboard = async (id, data) => {
  return await apiClient.put(`/dashboard/${id}`, data);
};

/**
 * 대시보드 삭제 API
 * @param {number} id - 대시보드 ID
 * @returns {Promise<Object>} - 대시보드 삭제 응답 데이터
 */
export const deleteDashboard = async (id) => {
  return await apiClient.delete(`/dashboard/${id}`);
};

/**
 * 상태 변경 API
 * @param {number} id - 대시보드 ID
 * @param {Object} data - 상태 변경 데이터
 * @param {string} data.status - 변경할 상태
 * @returns {Promise<Object>} - 상태 변경 응답 데이터
 */
export const updateStatus = async (id, data) => {
  return await apiClient.patch(`/dashboard/${id}/status`, data);
};

/**
 * 배차 처리 API
 * @param {number} id - 대시보드 ID
 * @param {Object} data - 배차 처리 데이터
 * @param {string} data.driver_name - 배송기사 이름 (백엔드에서는 snake_case로 변환됨)
 * @param {string} data.driver_contact - 배송기사 연락처 (백엔드에서는 snake_case로 변환됨)
 * @returns {Promise<Object>} - 배차 처리 응답 데이터
 */
export const assignDriver = async (id, data) => {
  return await apiClient.patch(`/dashboard/${id}/assign`, data);
};

/**
 * 다중 배차 처리 API
 * @param {Object} data - 다중 배차 처리 데이터
 * @param {Array<number>} data.ids - 대시보드 ID 배열
 * @param {string} data.driver_name - 배송기사 이름 (백엔드에서는 snake_case로 변환됨)
 * @param {string} data.driver_contact - 배송기사 연락처 (백엔드에서는 snake_case로 변환됨)
 * @returns {Promise<Object>} - 다중 배차 처리 응답 데이터
 */
export const assignMultiDrivers = async (data) => {
  return await apiClient.patch('/dashboard/multi-assign', data);
};

/**
 * 시각화 데이터 조회 API
 * @param {Object} params - 조회 파라미터
 * @param {string} params.chartType - 차트 타입 (time/department)
 * @param {string} params.startDate - 시작 날짜
 * @param {string} params.endDate - 종료 날짜
 * @param {string} params.department - 부서
 * @returns {Promise<Object>} - 시각화 데이터 응답 데이터
 */
export const getVisualizationData = async (params) => {
  return await apiClient.get('/dashboard/visualization', { params });
};
