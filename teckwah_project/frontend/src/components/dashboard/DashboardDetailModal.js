// frontend/src/components/dashboard/DashboardDetailModal.js
import React, { useState } from 'react';
import { Modal, Descriptions, Select, Input, Button, message, Space, Typography } from 'antd';
import { STATUS_TYPES, STATUS_TEXTS, TYPE_TEXTS } from '../../utils/Constants';
import { 
  formatDateTime, 
  formatDistance, 
  formatDuration,
  formatPhoneNumber 
} from '../../utils/Formatter';
import DashboardService from '../../services/DashboardService';

const { TextArea } = Input;
const { Text } = Typography;

/**
 * 대시보드 상세 정보 모달 컴포넌트
 * @param {Object} props
 * @param {boolean} props.visible - 모달 표시 여부
 * @param {Function} props.onCancel - 취소 핸들러
 * @param {Function} props.onSuccess - 성공 시 콜백
 * @param {Object} props.dashboard - 대시보드 데이터
 */
const DashboardDetailModal = ({ visible, onCancel, onSuccess, dashboard }) => {
  const [loading, setLoading] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingRemark, setEditingRemark] = useState(false);
  const [newStatus, setNewStatus] = useState(dashboard.status);
  const [newRemark, setNewRemark] = useState(dashboard.remark);

  // 상태 변경 가능 여부 및 옵션 확인
  const getStatusOptions = () => {
    const currentStatus = dashboard.status;
    let allowedStatus = [];

    // 모든 상태 전환 가능하도록 수정
    const allStatuses = Object.values(STATUS_TYPES)
      .filter(status => status !== currentStatus)
      .map(status => ({
        value: status,
        label: STATUS_TEXTS[status]
      }));

    return allStatuses;
  };

  // 상태 업데이트 처리
  const handleStatusUpdate = async () => {
    try {
      setLoading(true);
      await DashboardService.updateStatus(dashboard.dashboard_id, newStatus);
      message.success('상태가 업데이트되었습니다');
      setEditingStatus(false);
      onSuccess();
      onCancel(); // 모달 자동 종료
    } catch (error) {
      message.error('상태 업데이트 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 메모 업데이트 처리
  const handleRemarkUpdate = async () => {
    try {
      setLoading(true);
      await DashboardService.updateRemark(dashboard.dashboard_id, newRemark);
      message.success('메모가 업데이트되었습니다');
      setEditingRemark(false);
      onSuccess();
      onCancel(); // 모달 자동 종료
    } catch (error) {
      message.error('메모 업데이트 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space direction="vertical" size={4}>
          <Text strong style={{ fontSize: '18px' }}>대시보드 상세 정보</Text>
          <Text strong style={{ fontSize: '20px', color: '#1890ff' }}>
            주문번호: {dashboard.order_no}
          </Text>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={900}  
      maskClosable={false}
    >
      <Descriptions bordered column={2}>
        <Descriptions.Item label="종류">{TYPE_TEXTS[dashboard.type] || dashboard.type}</Descriptions.Item>
        <Descriptions.Item label="부서">{dashboard.department}</Descriptions.Item>
        <Descriptions.Item label="출발 허브">{dashboard.warehouse}</Descriptions.Item>
        <Descriptions.Item label="담당 기사">{dashboard.driver_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="기사 연락처">
          {dashboard.driver_contact ? formatPhoneNumber(dashboard.driver_contact) : '-'}
        </Descriptions.Item>
        
        <Descriptions.Item label="배송 상태" span={2}>
          <div style={{ display: 'flex', gap: 8, minHeight: '32px', alignItems: 'center' }}>
            {editingStatus ? (
              <Space size="middle">
                <Select
                  value={newStatus}
                  onChange={setNewStatus}
                  style={{ width: 200 }}
                  options={getStatusOptions()}
                />
                <Button onClick={handleStatusUpdate} loading={loading} type="primary">저장</Button>
                <Button onClick={() => setEditingStatus(false)}>취소</Button>
              </Space>
            ) : (
              <Space>
                <Tag color={STATUS_COLORS[dashboard.status]} style={{ padding: '4px 12px' }}>
                  {STATUS_TEXTS[dashboard.status]}
                </Tag>
                <Button 
                  size="small" 
                  type="primary" 
                  ghost
                  onClick={() => setEditingStatus(true)}
                >
                  수정
                </Button>
              </Space>
            )}
          </div>
        </Descriptions.Item>

        <Descriptions.Item label="접수 시각">{formatDateTime(dashboard.create_time)}</Descriptions.Item>
        <Descriptions.Item label="출발 시각">{formatDateTime(dashboard.depart_time)}</Descriptions.Item>
        <Descriptions.Item label="완료 시각" span={2}>{formatDateTime(dashboard.complete_time)}</Descriptions.Item>

        <Descriptions.Item label="주소" span={2}>{dashboard.address}</Descriptions.Item>
        <Descriptions.Item label="거리">{formatDistance(dashboard.distance)}</Descriptions.Item>
        <Descriptions.Item label="예상 소요 시간">{formatDuration(dashboard.duration_time)}</Descriptions.Item>
        <Descriptions.Item label="수령인">{dashboard.customer}</Descriptions.Item>
        <Descriptions.Item label="연락처">{formatPhoneNumber(dashboard.contact)}</Descriptions.Item>

        <Descriptions.Item label="메모" span={2}>
          {editingRemark ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <TextArea
                value={newRemark}
                onChange={(e) => setNewRemark(e.target.value)}
                rows={4}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button onClick={handleRemarkUpdate} loading={loading} type="primary">저장</Button>
                <Button onClick={() => setEditingRemark(false)}>취소</Button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>{dashboard.remark || '-'}</div>
              <Button 
                size="small" 
                type="primary" 
                ghost
                onClick={() => setEditingRemark(true)}
              >
                수정
              </Button>
            </div>
          )}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};

export default DashboardDetailModal;