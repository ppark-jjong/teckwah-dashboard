// src/components/LockConflictModal.js
import React from 'react';
import { Modal, Button, Alert } from 'antd';

const LockConflictModal = ({
  visible,
  lockInfo,
  onRetry,
  onCancel,
  confirmLoading = false
}) => {
  const renderLockInfo = () => {
    if (!lockInfo) return null;
    
    const { locked_by, expires_at } = lockInfo;
    const expiryTime = expires_at ? new Date(expires_at).toLocaleTimeString() : '알 수 없음';
    
    return (
      <Alert
        type="warning"
        message="락 충돌 발생"
        description={
          <div>
            <p>다른 사용자({locked_by})가 현재 작업 중입니다.</p>
            <p>락 만료 시간: {expiryTime}</p>
            <p>재시도하거나 작업을 취소해주세요.</p>
          </div>
        }
        showIcon
      />
    );
  };

  return (
    <Modal
      title="작업 충돌"
      visible={visible}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          작업 취소
        </Button>,
        <Button
          key="retry"
          type="primary"
          loading={confirmLoading}
          onClick={onRetry}
        >
          재시도
        </Button>
      ]}
      closable={false}
      maskClosable={false}
      centered
    >
      {renderLockInfo()}
    </Modal>
  );
};

export default LockConflictModal;