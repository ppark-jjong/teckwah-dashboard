// frontend/src/utils/ErrorHandler.js
import { MessageKeys, MessageTemplates } from './message';
import messageService from './message';

/**
 * 애플리케이션 전반의 에러 처리를 담당하는 유틸리티 클래스
 */
class ErrorHandler {
  static errorCodeMap = {
    VALIDATION_ERROR: 'VALIDATION_ERROR', // 유효성 검증 실패
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR', // 인증 실패
    PERMISSION_ERROR: 'PERMISSION_ERROR', // 권한 부족
    NETWORK_ERROR: 'NETWORK_ERROR', // 네트워크 연결 문제
    SERVER_ERROR: 'SERVER_ERROR', // 서버 내부 오류
    NOT_FOUND_ERROR: 'NOT_FOUND_ERROR', // 리소스 없음
    BUSINESS_ERROR: 'BUSINESS_ERROR', // 비즈니스 로직 오류
    OPTIMISTIC_LOCK_ERROR: 'OPTIMISTIC_LOCK_ERROR', // 낙관적 락 충돌
    PESSIMISTIC_LOCK_ERROR: 'PESSIMISTIC_LOCK_ERROR', // 비관적 락 충돌
  };

  /**
   * 에러 코드와 메시지 세부 정보 추출
   * @param {Error} error - 발생한 에러 객체
   * @param {string} context - 에러 발생 컨텍스트 정보
   * @returns {Object} - 에러 세부 정보 객체
   */
  static getErrorDetails(error, context = '') {
    let statusCode = 0;
    let errorCode = this.errorCodeMap.BUSINESS_ERROR;
    let errorData = null;
    let errorMessage = '오류가 발생했습니다';
    let messageKey = `error-${Date.now()}`;

    // HTTP 응답 에러 (axios 에러)
    if (error.response) {
      statusCode = error.response.status;
      errorData = error.response.data;

      // HTTP 상태 코드별 처리
      switch (statusCode) {
        case 400: // Bad Request
          if (errorData?.detail?.includes('우편번호')) {
            errorMessage = MessageTemplates.DASHBOARD.INVALID_POSTAL;
            messageKey = 'postal-code-error';
          } else if (errorData?.detail?.includes('연락처')) {
            errorMessage = MessageTemplates.DASHBOARD.INVALID_PHONE;
            messageKey = 'phone-format-error';
          } else {
            errorMessage = errorData?.detail || '입력값이 올바르지 않습니다';
          }
          errorCode = this.errorCodeMap.VALIDATION_ERROR;
          break;

        case 401: // Unauthorized
          if (errorData?.detail?.includes('아이디 또는 비밀번호')) {
            errorMessage = MessageTemplates.AUTH.LOGIN_FAILED;
            messageKey = MessageKeys.AUTH.LOGIN;
          } else if (errorData?.detail?.includes('만료')) {
            errorMessage = MessageTemplates.AUTH.SESSION_EXPIRED;
            messageKey = MessageKeys.AUTH.SESSION_EXPIRED;
          } else {
            errorMessage = '인증이 필요합니다. 다시 로그인해주세요';
          }
          errorCode = this.errorCodeMap.AUTHENTICATION_ERROR;
          break;

        case 403: // Forbidden
          errorMessage = '접근 권한이 없습니다';
          messageKey = 'permission-error';
          errorCode = this.errorCodeMap.PERMISSION_ERROR;
          break;

        case 404: // Not Found
          if (context === 'dashboard') {
            errorMessage =
              '대시보드를 찾을 수 없습니다. 이미 삭제되었거나 존재하지 않는 항목입니다.';
            messageKey = MessageKeys.DASHBOARD.LOAD;
          } else {
            errorMessage = '요청한 자원을 찾을 수 없습니다';
          }
          errorCode = this.errorCodeMap.NOT_FOUND_ERROR;
          break;

        case 409: // Conflict (낙관적 락 충돌)
          const currentVersion = errorData?.detail?.current_version;
          if (currentVersion) {
            errorMessage =
              '다른 사용자가 이미 데이터를 수정했습니다. 최신 정보를 확인 후 다시 시도해주세요.';
          } else {
            errorMessage = errorData?.detail || '데이터 충돌이 발생했습니다';
          }
          messageKey = 'optimistic-lock-error';
          errorCode = this.errorCodeMap.OPTIMISTIC_LOCK_ERROR;
          break;

        case 423: // Locked (비관적 락 충돌)
          const lockedBy = errorData?.detail?.locked_by || '다른 사용자';
          errorMessage = `현재 ${lockedBy}님이 이 데이터를 수정 중입니다. 잠시 후 다시 시도해주세요.`;
          messageKey = 'pessimistic-lock-error';
          errorCode = this.errorCodeMap.PESSIMISTIC_LOCK_ERROR;
          break;

        case 422: // Validation Error
          if (Array.isArray(errorData?.detail)) {
            errorMessage = errorData.detail.map((err) => err.msg).join('\n');
          } else {
            errorMessage = errorData?.detail || '입력값 검증에 실패했습니다';
          }
          errorCode = this.errorCodeMap.VALIDATION_ERROR;
          messageKey = 'validation-error';
          break;

        case 500: // Internal Server Error
          errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요';
          messageKey = 'server-error';
          errorCode = this.errorCodeMap.SERVER_ERROR;
          break;

        default:
          errorMessage =
            errorData?.detail || `서버에서 오류가 발생했습니다 (${statusCode})`;
          errorCode =
            statusCode >= 500
              ? this.errorCodeMap.SERVER_ERROR
              : this.errorCodeMap.BUSINESS_ERROR;
      }
    }
    // 네트워크 에러 (요청이 전송되었지만 응답 없음)
    else if (error.request) {
      errorMessage = '서버와 통신할 수 없습니다. 네트워크 연결을 확인해주세요';
      messageKey = 'network-error';
      errorCode = this.errorCodeMap.NETWORK_ERROR;
    }

    // 특수 에러 메시지 처리 (백엔드 응답에서 추가 정보 추출)
    if (errorData?.detail?.includes('대기 상태가 아니')) {
      const orderNos = errorData.detail.split(':')[1]?.trim() || '';
      errorMessage = MessageTemplates.DASHBOARD.INVALID_WAITING(orderNos);
    }

    return {
      statusCode,
      errorCode,
      errorMessage,
      messageKey,
      originalError: error,
    };
  }

  /**
   * 에러 처리 메인 메서드
   * @param {Error} error - 처리할 에러 객체
   * @param {string} context - 에러 발생 컨텍스트 정보
   * @returns {Error} - 처리 후 에러 객체
   */
  static handle(error, context = '') {
    // 이미 처리된 에러는 다시 처리하지 않음
    if (error.handled) return error;

    const { errorMessage, messageKey, errorCode } = this.getErrorDetails(
      error,
      context
    );

    // 메시지 표시
    messageService.error(errorMessage, messageKey);
    error.handled = true;
    error.errorCode = errorCode;

    // 개발 환경에서 추가 로깅
    if (process.env.NODE_ENV === 'development') {
      console.error('Error occurred:', {
        code: errorCode,
        message: errorMessage,
        originalError: error,
        context,
        status: error.response?.status,
        data: error.response?.data,
        stack: error.stack,
      });
    }

    return error;
  }

  /**
   * 유효성 검증 에러 처리
   * @param {Array|Object} errors - 유효성 검증 에러 배열 또는 객체
   * @returns {Object} - 필드별 포맷팅된 에러 메시지
   */
  static handleValidationErrors(errors) {
    const formattedErrors = {};

    if (Array.isArray(errors)) {
      errors.forEach((error) => {
        const field = error.field || error.loc?.[1] || 'general';
        if (!formattedErrors[field]) {
          formattedErrors[field] = [];
        }
        formattedErrors[field].push(error.message || error.msg);
      });
    } else if (typeof errors === 'object') {
      Object.entries(errors).forEach(([field, message]) => {
        formattedErrors[field] = Array.isArray(message) ? message : [message];
      });
    }

    return formattedErrors;
  }

  /**
   * 낙관적 락 에러 사용자 친화적 처리
   * @param {Error} error - 에러 객체
   * @param {Function} refreshCallback - 데이터 새로고침 콜백 함수
   * @returns {boolean} - 낙관적 락 에러 여부
   */
  static handleOptimisticLockError(error, refreshCallback) {
    if (error.response?.status === 409) {
      const errorDetail = error.response?.data?.detail;
      const currentVersion = errorDetail?.current_version;

      // 충돌 메시지 생성
      let errorMessage =
        '다른 사용자가 이미 데이터를 수정했습니다. 최신 정보를 불러옵니다.';

      // 충돌한 주문번호가 있는 경우 표시
      if (errorDetail?.conflicted_orders) {
        const conflictedOrders = errorDetail.conflicted_orders.join(', ');
        errorMessage = `다음 주문(${conflictedOrders})이 이미 다른 사용자에 의해 수정되었습니다.`;
      }

      messageService.error(errorMessage, 'optimistic-lock-error');

      // 데이터 새로고침 콜백 호출
      if (typeof refreshCallback === 'function') {
        refreshCallback(currentVersion);
      }

      return true;
    }

    return false;
  }

  /**
   * 비관적 락 에러 사용자 친화적 처리
   * @param {Error} error - 에러 객체
   * @returns {boolean} - 비관적 락 에러 여부
   */
  static handlePessimisticLockError(error) {
    if (error.response?.status === 423) {
      const lockedBy = error.response?.data?.detail?.locked_by || '다른 사용자';
      const lockType = error.response?.data?.detail?.lock_type || '';
      let lockTypeText = '';

      // 락 타입에 따른 메시지 차별화
      switch (lockType) {
        case 'EDIT':
          lockTypeText = '편집';
          break;
        case 'STATUS':
          lockTypeText = '상태 변경';
          break;
        case 'ASSIGN':
          lockTypeText = '배차';
          break;
        case 'REMARK':
          lockTypeText = '메모 작성';
          break;
        default:
          lockTypeText = '수정';
      }

      const message = `현재 ${lockedBy}님이 ${lockTypeText} 중입니다. 잠시 후 다시 시도해주세요.`;
      messageService.error(message, 'pessimistic-lock-error');

      return true;
    }

    return false;
  }

  /**
   * 에러 유형 확인 헬퍼 함수들
   */
  static isValidationError(error) {
    return (
      error.errorCode === this.errorCodeMap.VALIDATION_ERROR ||
      error.response?.status === 400 ||
      error.response?.status === 422
    );
  }

  static isAuthenticationError(error) {
    return (
      error.errorCode === this.errorCodeMap.AUTHENTICATION_ERROR ||
      error.response?.status === 401
    );
  }

  static isPermissionError(error) {
    return (
      error.errorCode === this.errorCodeMap.PERMISSION_ERROR ||
      error.response?.status === 403
    );
  }

  static isNetworkError(error) {
    return (
      error.errorCode === this.errorCodeMap.NETWORK_ERROR ||
      (!error.response && error.request)
    );
  }

  static isServerError(error) {
    return (
      error.errorCode === this.errorCodeMap.SERVER_ERROR ||
      (error.response?.status && error.response.status >= 500)
    );
  }

  static isOptimisticLockError(error) {
    return (
      error.errorCode === this.errorCodeMap.OPTIMISTIC_LOCK_ERROR ||
      error.response?.status === 409
    );
  }

  static isPessimisticLockError(error) {
    return (
      error.errorCode === this.errorCodeMap.PESSIMISTIC_LOCK_ERROR ||
      error.response?.status === 423
    );
  }

  /**
   * 폼 에러 자동 설정 헬퍼
   * Ant Design Form에 에러 상태 자동 설정
   * @param {Object} form - Ant Design Form 인스턴스
   * @param {Array|Object} errors - 에러 정보
   */
  static setFormErrors(form, errors) {
    if (!form || !errors) return;

    const formattedErrors = this.handleValidationErrors(errors);

    const formErrors = Object.entries(formattedErrors).map(
      ([name, errors]) => ({
        name,
        errors: Array.isArray(errors) ? errors : [errors],
      })
    );

    form.setFields(formErrors);
  }
}

export default ErrorHandler;
