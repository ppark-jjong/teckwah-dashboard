// frontend/src/components/dashboard/DashboardTable.js

import React, { useState, useEffect } from 'react';
import { Table, Tag, Tooltip, Input, Select, Space, Button } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  STATUS_TYPES,
  STATUS_TEXTS,
  STATUS_COLORS,
  TYPE_TEXTS,
  TYPE_TYPES,
  TYPE_COLORS,
  WAREHOUSE_TEXTS,
  WAREHOUSE_TYPES,
  DEPARTMENT_TEXTS,
  DEPARTMENT_TYPES,
  FONT_STYLES,
  STATUS_BG_COLORS,
} from '../../utils/Constants';
import { formatDateTime } from '../../utils/Formatter';
import './DashboardTable.css';

const { Option } = Select;

/**
 * 대시보드 테이블 컴포넌트
 * 배송 주문 목록을 표시하고 필터링, 정렬, 선택 기능을 제공
 */
const DashboardTable = ({
  dataSource = [],
  loading = false,
  selectedRows = [],
  onSelectRows = () => {},
  onRowClick = () => {},
  onRefresh = () => {},
  currentPage = 1,
  pageSize = 50,
  onPageChange = () => {},
  isAdminPage = false,
  // 외부 필터링 props
  typeFilter,
  departmentFilter,
  warehouseFilter,
  orderNoSearch,
  onTypeFilterChange = () => {},
  onDepartmentFilterChange = () => {},
  onWarehouseFilterChange = () => {},
  onOrderNoSearchChange = () => {},
  onResetFilters = () => {},
}) => {
  // 로컬 필터링 상태 관리(외부 props와 연동)
  const [localTypeFilter, setLocalTypeFilter] = useState(typeFilter);
  const [localDepartmentFilter, setLocalDepartmentFilter] =
    useState(departmentFilter);
  const [localWarehouseFilter, setLocalWarehouseFilter] =
    useState(warehouseFilter);
  const [localOrderNoSearch, setLocalOrderNoSearch] = useState(orderNoSearch);
  const [filteredData, setFilteredData] = useState([]);

  // 외부 props가 변경되면 로컬 상태 업데이트
  useEffect(() => {
    setLocalTypeFilter(typeFilter);
    setLocalDepartmentFilter(departmentFilter);
    setLocalWarehouseFilter(warehouseFilter);
    setLocalOrderNoSearch(orderNoSearch);
  }, [typeFilter, departmentFilter, warehouseFilter, orderNoSearch]);

  // 안전한 데이터 소스 확인
  const safeDataSource = Array.isArray(dataSource) ? dataSource : [];

  // 필터링된 데이터 계산 및 정렬
  useEffect(() => {
    console.log('필터링 및 정렬 적용 시작');
    console.log('원본 데이터 건수:', safeDataSource.length);

    // 데이터 필드 검사 로깅 (누락된 필드 확인용)
    if (safeDataSource.length > 0) {
      const sample = safeDataSource[0];
      console.log('데이터 샘플의 필드 목록:', Object.keys(sample));

      // 필수 필드 확인
      const missingFields = [];
      [
        'dashboard_id',
        'status',
        'type',
        'department',
        'warehouse',
        'sla',
        'eta',
      ].forEach((field) => {
        if (sample[field] === undefined) {
          missingFields.push(field);
        }
      });

      if (missingFields.length > 0) {
        console.error('누락된 필드 발견:', missingFields);
      }
    }

    // 원본 데이터 복사 (불변성 유지)
    let result = [...safeDataSource];

    // 필터링 적용
    if (localTypeFilter) {
      result = result.filter((item) => item.type === localTypeFilter);
      console.log(
        `타입 필터 적용: ${localTypeFilter}, 결과 건수: ${result.length}`
      );
    }

    if (localDepartmentFilter) {
      result = result.filter(
        (item) => item.department === localDepartmentFilter
      );
      console.log(
        `부서 필터 적용: ${localDepartmentFilter}, 결과 건수: ${result.length}`
      );
    }

    if (localWarehouseFilter) {
      result = result.filter((item) => item.warehouse === localWarehouseFilter);
      console.log(
        `허브 필터 적용: ${localWarehouseFilter}, 결과 건수: ${result.length}`
      );
    }

    if (localOrderNoSearch) {
      result = result.filter((item) =>
        String(item.order_no).includes(localOrderNoSearch)
      );
      console.log(
        `주문번호 검색 적용: ${localOrderNoSearch}, 결과 건수: ${result.length}`
      );
    }

    // 정렬 로직: 요구사항에 맞게 단순화
    // 1. 완료/이슈/취소 상태와 대기/진행 상태로 그룹화
    // 2. 각 그룹 내에서 ETA 기준 오름차순 정렬
    result.sort((a, b) => {
      // 상태 그룹화 (대기, 진행 vs 완료, 이슈, 취소)
      const aGroup = ['COMPLETE', 'ISSUE', 'CANCEL'].includes(a.status) ? 1 : 0;
      const bGroup = ['COMPLETE', 'ISSUE', 'CANCEL'].includes(b.status) ? 1 : 0;

      // 그룹이 다르면 그룹 기준으로 정렬 (대기,진행 우선)
      if (aGroup !== bGroup) {
        return aGroup - bGroup;
      }

      // 같은 그룹 내에서는 ETA 기준 오름차순 정렬
      const aEta = a.eta ? new Date(a.eta) : new Date(9999, 11, 31);
      const bEta = b.eta ? new Date(b.eta) : new Date(9999, 11, 31);
      return aEta - bEta;
    });

    console.log(`정렬 및 필터링 완료, 최종 결과 건수: ${result.length}`);
    setFilteredData(result);
  }, [
    safeDataSource,
    localTypeFilter,
    localDepartmentFilter,
    localWarehouseFilter,
    localOrderNoSearch,
  ]);

  // 필터 변경 핸들러 - 상위 컴포넌트 콜백 호출
  const handleTypeFilterChange = (value) => {
    setLocalTypeFilter(value);
    onTypeFilterChange(value);
  };

  const handleDepartmentFilterChange = (value) => {
    setLocalDepartmentFilter(value);
    onDepartmentFilterChange(value);
  };

  const handleWarehouseFilterChange = (value) => {
    setLocalWarehouseFilter(value);
    onWarehouseFilterChange(value);
  };

  // 주문번호 검색 핸들러 - API 호출 방식으로 변경
  const handleOrderNoSearchChange = (e) => {
    const value = e.target.value;
    setLocalOrderNoSearch(value);
    // 백엔드 API 호출을 위해 상위 컴포넌트의 핸들러 호출
    onOrderNoSearchChange(value);
  };

  // 필터 초기화 함수
  const resetFilters = () => {
    setLocalTypeFilter(null);
    setLocalDepartmentFilter(null);
    setLocalWarehouseFilter(null);
    setLocalOrderNoSearch('');
    onResetFilters(); // 상위 컴포넌트에 전달
  };

  /**
   * 행 스타일 생성 함수 - 상태별 배경색 적용
   * 요구사항: 각 상태별 색상대로 각 행 전체에 색이 반영되어야 함
   */
  const getRowStyle = (record) => {
    const { status } = record;

    // 상태별 배경색 및 스타일 적용
    const style = {
      backgroundColor: STATUS_BG_COLORS[status]?.normal || '#ffffff',
      cursor: 'pointer',
      transition: 'background-color 0.3s ease',
    };

    // 완료, 취소, 이슈 상태는 더 어둡게 표시
    if (['COMPLETE', 'CANCEL', 'ISSUE'].includes(status)) {
      style.color = '#888888'; // 텍스트 색상 어둡게
    }

    return style;
  };

  /**
   * 행 Hover 이벤트 처리 - 동적 상태별 시각적 피드백
   */
  const onRowOver = (record) => {
    return {
      onMouseEnter: (e) => {
        const { status } = record;
        e.currentTarget.style.backgroundColor =
          STATUS_BG_COLORS[status]?.hover || '#f5f5f5';
      },
      onMouseLeave: (e) => {
        const { status } = record;
        e.currentTarget.style.backgroundColor =
          STATUS_BG_COLORS[status]?.normal || '#ffffff';
      },
    };
  };

  // 필터 컴포넌트 (간소화)
  const renderFilters = () => (
    <div className="dashboard-filters">
      <Space size="middle" wrap>
        <div>
          <span style={{ marginRight: 8 }}>타입:</span>
          <Select
            allowClear
            style={{ width: 120 }}
            placeholder="타입 선택"
            value={localTypeFilter}
            onChange={handleTypeFilterChange}
          >
            {Object.entries(TYPE_TYPES).map(([key, value]) => (
              <Option key={key} value={value}>
                {TYPE_TEXTS[key]}
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <span style={{ marginRight: 8 }}>부서:</span>
          <Select
            allowClear
            style={{ width: 120 }}
            placeholder="부서 선택"
            value={localDepartmentFilter}
            onChange={handleDepartmentFilterChange}
          >
            {Object.entries(DEPARTMENT_TYPES).map(([key, value]) => (
              <Option key={key} value={value}>
                {DEPARTMENT_TEXTS[key]}
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <span style={{ marginRight: 8 }}>출발 허브:</span>
          <Select
            allowClear
            style={{ width: 120 }}
            placeholder="허브 선택"
            value={localWarehouseFilter}
            onChange={handleWarehouseFilterChange}
          >
            {Object.entries(WAREHOUSE_TYPES).map(([key, value]) => (
              <Option key={key} value={value}>
                {WAREHOUSE_TEXTS[key]}
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <span style={{ marginRight: 8 }}>주문번호:</span>
          <Input
            placeholder="주문번호 검색"
            value={localOrderNoSearch}
            onChange={handleOrderNoSearchChange}
            style={{ width: 150 }}
            prefix={<SearchOutlined />}
            allowClear
          />
        </div>

        <Button
          icon={<ReloadOutlined />}
          onClick={resetFilters}
          disabled={
            !localTypeFilter &&
            !localDepartmentFilter &&
            !localWarehouseFilter &&
            !localOrderNoSearch
          }
        >
          필터 초기화
        </Button>
      </Space>
    </div>
  );

  // 열 정의 - 요구사항에 명시된 순서 준수
  const columns = [
    {
      title: '종류',
      dataIndex: 'type',
      align: 'center',
      width: 80,
      render: (text) => (
        <span
          className={`type-column-${text?.toLowerCase()}`}
          style={{
            color: TYPE_COLORS[text] || '#666',
            fontWeight: 700,
            fontSize: '14px',
            ...FONT_STYLES.BODY.MEDIUM,
          }}
        >
          {TYPE_TEXTS[text] || text}
        </span>
      ),
    },
    {
      title: '부서',
      dataIndex: 'department',
      align: 'center',
      width: 80,
      render: (text) => (
        <span style={FONT_STYLES.BODY.MEDIUM}>
          {DEPARTMENT_TEXTS[text] || text}
        </span>
      ),
    },
    {
      title: '출발 허브',
      dataIndex: 'warehouse',
      align: 'center',
      width: 100,
      render: (text) => (
        <span style={FONT_STYLES.BODY.MEDIUM}>
          {WAREHOUSE_TEXTS[text] || text}
        </span>
      ),
    },
    {
      title: 'order#',
      dataIndex: 'order_no',
      align: 'center',
      width: 130,
      render: (text) => <span style={FONT_STYLES.BODY.MEDIUM}>{text}</span>,
    },
    {
      title: 'SLA',
      dataIndex: 'sla',
      align: 'center',
      width: 100,
      render: (text) => (
        <span style={FONT_STYLES.BODY.MEDIUM}>{text || '-'}</span>
      ),
      // SLA 데이터 디버깅 추가
      onCell: (record) => ({
        onMouseEnter: () => {
          if (!record.sla) {
            console.log('SLA 값 없음:', record);
          }
        },
      }),
    },
    {
      title: 'ETA',
      dataIndex: 'eta',
      align: 'center',
      width: 150,
      render: (text, record) => (
        <span
          style={{
            ...FONT_STYLES.BODY.MEDIUM,
            fontWeight: ['WAITING', 'IN_PROGRESS'].includes(record.status)
              ? 600
              : 400,
          }}
        >
          {formatDateTime(text)}
        </span>
      ),
    },
    {
      title: '출발 시각',
      dataIndex: 'depart_time',
      align: 'center',
      width: 150,
      render: (text) => (
        <span
          style={{
            color: text ? 'black' : '#999',
            ...FONT_STYLES.BODY.MEDIUM,
          }}
        >
          {formatDateTime(text) || '-'}
        </span>
      ),
    },
    {
      title: '도착 지역',
      dataIndex: 'region',
      align: 'center',
      width: 150,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span style={FONT_STYLES.BODY.MEDIUM}>{text || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '배송 담당',
      dataIndex: 'driver_name',
      align: 'center',
      width: 100,
      render: (text) => (
        <span
          style={{
            color: text ? 'black' : '#999',
            ...FONT_STYLES.BODY.MEDIUM,
          }}
        >
          {text || '-'}
        </span>
      ),
    },
    {
      title: '수령인',
      dataIndex: 'customer',
      align: 'center',
      width: 100,
      render: (text) => (
        <span style={FONT_STYLES.BODY.MEDIUM}>{text || '-'}</span>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      align: 'center',
      width: 100,
      render: (status) => {
        // 상태 값이 없으면 '-' 표시
        if (!status) {
          console.error('상태 값이 없습니다:', status);
          return <span>-</span>;
        }

        // STATUS_TEXTS에 없는 상태값이면 원본 표시 (디버깅 로그 추가)
        if (!STATUS_TEXTS[status]) {
          console.error('알 수 없는 상태:', status);
        }

        return (
          <Tag
            color={STATUS_COLORS[status] || 'default'}
            style={{
              minWidth: '60px',
              textAlign: 'center',
              fontWeight: 600,
              ...FONT_STYLES.BODY.MEDIUM,
            }}
            className="status-tag"
          >
            {STATUS_TEXTS[status] || status}
          </Tag>
        );
      },
    },
  ];

  // 테이블 CSS 스타일 적용을 위한 클래스 설정
  const tableClassName = `dashboard-table${isAdminPage ? ' admin-table' : ''}`;

  return (
    <div className="dashboard-table-container">
      {/* 필터 컴포넌트 */}
      {renderFilters()}

      {/* 테이블 컴포넌트 */}
      <Table
        className={tableClassName}
        columns={columns}
        dataSource={filteredData}
        rowKey="dashboard_id"
        loading={loading}
        size="middle"
        scroll={{ x: 1200, y: 'calc(100vh - 340px)' }}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: filteredData?.length || 0,
          onChange: onPageChange,
          showSizeChanger: false,
          showTotal: (total) => `총 ${total}건`,
        }}
        rowSelection={{
          selectedRowKeys: selectedRows.map((row) => row.dashboard_id),
          onChange: (_, rows) => onSelectRows(rows),
          getCheckboxProps: (record) => ({
            // 일반 사용자 페이지에서는 배차 처리를 위한 선택만 제한 (대기 상태만 선택 가능)
            // 행 클릭을 통한 상세정보 조회는 모든 상태에서 가능
            disabled: isAdminPage ? false : record.status !== 'WAITING',
            name: record.order_no,
          }),
        }}
        onRow={(record) => ({
          onClick: () => onRowClick(record),
          className: `ant-table-row-${record.status.toLowerCase()}`,
          style: getRowStyle(record),
          ...onRowOver(record),
        })}
        locale={{
          emptyText: '데이터가 없습니다',
        }}
      />
    </div>
  );
};

export default DashboardTable;
