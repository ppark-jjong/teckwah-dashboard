// frontend/src/pages/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { Layout, DatePicker, Space, Typography } from 'antd';
import dayjs from 'dayjs';
import DashboardTable from '../components/dashboard/DashboardTable';
import CreateDashboardModal from '../components/dashboard/CreateDashboardModal';
import AssignDriverModal from '../components/dashboard/AssignDriverModal';
import DashboardDetailModal from '../components/dashboard/DashboardDetailModal';
import LoadingSpin from '../components/common/LoadingSpin';
import DashboardService from '../services/DashboardService';
import { useDashboard } from '../contexts/DashboardContext';
import { useAuth } from '../contexts/AuthContext';
import message, { MessageKeys, MessageTemplates } from '../utils/message';
import { FONT_STYLES } from '../utils/Constants';

const { Text } = Typography;

const DashboardPage = () => {
  const { 
    dashboards, 
    loading, 
    fetchDashboards,
    updateMultipleDashboards
  } = useDashboard();
  
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedRows, setSelectedRows] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [oldestDate, setOldestDate] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    getDateRange();
    loadDashboardData(selectedDate);
  }, []);

  const getDateRange = async () => {
    try {
      const response = await DashboardService.getDateRange();
      setOldestDate(dayjs(response.oldest_date));
    } catch (error) {
      message.error('조회 가능 기간 확인 중 오류가 발생했습니다');
    }
  };

  const loadDashboardData = async (date) => {
    const key = MessageKeys.DASHBOARD.LOAD;
    try {
      message.loading('데이터 조회 중...', key);
      await fetchDashboards(date);
      message.loadingToSuccess(MessageTemplates.DASHBOARD.LOAD_SUCCESS, key);
    } catch (error) {
      message.loadingToError(MessageTemplates.DASHBOARD.LOAD_FAIL, key);
    }
  };

  const handleDateChange = (date) => {
    const newDate = date || dayjs();
    setSelectedDate(newDate);
    setSelectedRows([]);
    loadDashboardData(newDate);
  };

  const handleRefresh = () => {
    loadDashboardData(selectedDate);
  };

  const handleRowClick = async (record) => {
    const key = MessageKeys.DASHBOARD.DETAIL;
    try {
      message.loading('상세 정보 조회 중...', key);
      const detailData = await DashboardService.getDashboardDetail(record.dashboard_id);
      setSelectedDashboard(detailData);
      setShowDetailModal(true);
      message.loadingToSuccess('상세 정보를 조회했습니다', key);
    } catch (error) {
      message.loadingToError(MessageTemplates.DASHBOARD.DETAIL_FAIL, key);
    }
  };

  // 날짜 선택 제한 로직
  const disabledDate = (current) => {
    if (!current || !oldestDate) return false;
    return current.isBefore(oldestDate, 'day') || current.isAfter(dayjs(), 'day');
  };

  return (
    <Layout.Content style={{ padding: '12px', backgroundColor: 'white' }}>
      <div style={{ marginBottom: '16px' }}>
        <Space direction="vertical" size={4}>
          <Space size="large">
            <DatePicker
              value={selectedDate}
              onChange={handleDateChange}
              disabledDate={disabledDate}
              allowClear={false}
              style={{ width: 280 }}
              size="large"
            />
            {oldestDate && (
              <Text type="secondary" style={FONT_STYLES.BODY.MEDIUM}>
                조회 가능 기간: {oldestDate.format('YYYY-MM-DD')} ~ {dayjs().format('YYYY-MM-DD')}
              </Text>
            )}
          </Space>
        </Space>
      </div>

      <DashboardTable
        dataSource={dashboards}
        loading={loading}
        selectedRows={selectedRows}
        onSelectRows={setSelectedRows}
        onRowClick={handleRowClick}
        onRefresh={handleRefresh}
        onCreateClick={() => setShowCreateModal(true)}
        onAssignClick={() => setShowAssignModal(true)}
        isAdminPage={false}
        selectedDate={selectedDate}
      />

      {showCreateModal && (
        <CreateDashboardModal
          visible={showCreateModal}
          onCancel={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            handleRefresh();
          }}
          userDepartment={user.user_department}
        />
      )}

      {showAssignModal && (
        <AssignDriverModal
          visible={showAssignModal}
          onCancel={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false);
            setSelectedRows([]);
            handleRefresh();
          }}
          selectedRows={selectedRows}
        />
      )}

      {showDetailModal && selectedDashboard && (
        <DashboardDetailModal
          visible={showDetailModal}
          dashboard={selectedDashboard}
          onCancel={() => {
            setShowDetailModal(false);
            setSelectedDashboard(null);
          }}
          onSuccess={() => {
            handleRefresh();
          }}
          isAdmin={false}
        />
      )}
    </Layout.Content>
  );
};

export default DashboardPage;