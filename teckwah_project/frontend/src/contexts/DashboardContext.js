// frontend/src/contexts/DashboardContext.js
import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from 'react';
import DashboardService from '../services/DashboardService';
import message, { MessageKeys, MessageTemplates } from '../utils/message';

const DashboardContext = createContext(null);

export const DashboardProvider = ({ children }) => {
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(30000); // 30초 기본값
  const [dateRange, setDateRange] = useState(null);
  const [availableDateRange, setAvailableDateRange] = useState(null);

  // 데이터 폴링을 위한 상태
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // 일반 대시보드 목록 조회 (날짜 범위)
  const fetchDashboards = useCallback(
    async (startDate, endDate) => {
      try {
        setLoading(true);
        const data = await DashboardService.getDashboardList(
          startDate,
          endDate
        );
        console.log('fetchDashboards 결과:', data);

        // 받아온 데이터가 배열인지 확인하고 설정
        const items = Array.isArray(data) ? data : [];
        setDashboards(items);
        setDateRange([startDate, endDate]);
        setLastUpdate(Date.now());

        // 데이터 변경 여부에 따른 폴링 간격 조정
        if (JSON.stringify(items) !== JSON.stringify(dashboards)) {
          setPollingInterval(15000); // 변경사항 있으면 15초
        } else {
          setPollingInterval(45000); // 변경사항 없으면 45초
        }

        return {
          items,
          date_range: availableDateRange,
        };
      } catch (error) {
        console.error(
          '대시보드 목록 조회 오류:',
          error.response?.data || error
        );
        message.error(
          '데이터 조회 중 오류가 발생했습니다',
          MessageKeys.DASHBOARD.LOAD
        );
        return [];
      } finally {
        setLoading(false);
      }
    },
    [dashboards, availableDateRange]
  );

  // 관리자 대시보드 목록 조회 (날짜 범위)
  const fetchAdminDashboards = useCallback(
    async (startDate, endDate) => {
      try {
        setLoading(true);
        const data = await DashboardService.getAdminDashboardList(
          startDate,
          endDate
        );
        console.log('fetchAdminDashboards 결과:', data);

        // 받아온 데이터가 배열인지 확인하고 설정
        const items = Array.isArray(data) ? data : [];
        setDashboards(items);
        setDateRange([startDate, endDate]);
        setLastUpdate(Date.now());

        return {
          items,
          date_range: availableDateRange,
        };
      } catch (error) {
        console.error(
          '관리자 대시보드 목록 조회 오류:',
          error.response?.data || error
        );
        message.error(
          '데이터 조회 중 오류가 발생했습니다',
          MessageKeys.DASHBOARD.LOAD
        );
        return [];
      } finally {
        setLoading(false);
      }
    },
    [availableDateRange]
  );

  // 단일 대시보드 업데이트 (낙관적 락 고려)
  const updateDashboard = useCallback((dashboardId, updates) => {
    setDashboards((prev) =>
      prev.map((dash) =>
        dash.dashboard_id === dashboardId
          ? {
              ...dash,
              ...updates,
              // 버전 값이 있으면 증가, 없으면 기존 버전 유지
              version: updates.version || dash.version,
            }
          : dash
      )
    );
  }, []);

  // 여러 대시보드 업데이트 (새로운 항목 추가 로직 포함)
  const updateMultipleDashboards = useCallback((newDashboards) => {
    console.log('updateMultipleDashboards 호출됨:', newDashboards);

    if (!Array.isArray(newDashboards)) {
      console.error(
        'updateMultipleDashboards: newDashboards는 배열이어야 합니다',
        newDashboards
      );
      return;
    }

    // 정렬 적용 후 데이터 설정
    const sortedDashboards =
      DashboardService.sortDashboardsByStatus(newDashboards);
    setDashboards(sortedDashboards);
  }, []);

  // 대시보드 삭제
  const removeDashboards = useCallback((dashboardIds) => {
    if (!Array.isArray(dashboardIds)) {
      console.error(
        'removeDashboards: dashboardIds는 배열이어야 합니다',
        dashboardIds
      );
      return;
    }

    setDashboards((prev) =>
      prev.filter((dash) => !dashboardIds.includes(dash.dashboard_id))
    );
  }, []);

  // 주기적 폴링 설정
  useEffect(() => {
    if (isPolling && dateRange && dateRange.length === 2) {
      const timer = setTimeout(() => {
        console.log('폴링 실행: 대시보드 데이터 갱신');
        fetchDashboards(dateRange[0], dateRange[1]);
      }, pollingInterval);

      return () => clearTimeout(timer);
    }
  }, [isPolling, dateRange, pollingInterval, fetchDashboards, lastUpdate]);

  // 폴링 시작/중지 함수
  const startPolling = useCallback(() => {
    setIsPolling(true);
  }, []);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  const value = {
    dashboards,
    loading,
    pollingInterval,
    dateRange,
    lastUpdate,
    isPolling,
    availableDateRange,
    setAvailableDateRange,
    fetchDashboards,
    fetchAdminDashboards,
    updateDashboard,
    updateMultipleDashboards,
    removeDashboards,
    startPolling,
    stopPolling,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
