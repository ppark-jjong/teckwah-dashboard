// src/services/DownloadService.js
import ApiService from "./ApiService";
import { MessageKeys } from "../utils/Constants";
import message from "../utils/message";
import { useLogger } from "../utils/LogUtils";

const logger = useLogger("DownloadService");

/**
 * 데이터 다운로드 관련 서비스
 */
class DownloadService {
  /**
   * CSV 형식으로 데이터 다운로드
   * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
   * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
   * @param {Object} options - 다운로드 옵션
   * @returns {Promise<Blob>} - 다운로드 파일 Blob
   */
  async downloadAsCsv(startDate, endDate, options = {}) {
    try {
      logger.info(`CSV 다운로드 요청: ${startDate} ~ ${endDate}`, options);

      const params = {
        start_date: startDate,
        end_date: endDate,
        ...options,
      };

      // API 요청 (blob 형식으로 받음)
      const response = await ApiService._request("get", "/download/csv", {
        params,
        responseType: "blob",
      });

      return response;
    } catch (error) {
      logger.error("CSV 다운로드 실패:", error);
      message.error(
        "데이터 다운로드 중 오류가 발생했습니다",
        MessageKeys.ERROR.UNKNOWN
      );
      throw error;
    }
  }

  /**
   * Excel 형식으로 데이터 다운로드
   * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
   * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
   * @param {Object} options - 다운로드 옵션
   * @returns {Promise<Blob>} - 다운로드 파일 Blob
   */
  async downloadAsExcel(startDate, endDate, options = {}) {
    try {
      logger.info(`Excel 다운로드 요청: ${startDate} ~ ${endDate}`, options);

      const params = {
        start_date: startDate,
        end_date: endDate,
        ...options,
      };

      // API 요청 (blob 형식으로 받음)
      const response = await ApiService._request("get", "/download/excel", {
        params,
        responseType: "blob",
      });

      return response;
    } catch (error) {
      logger.error("Excel 다운로드 실패:", error);
      message.error(
        "데이터 다운로드 중 오류가 발생했습니다",
        MessageKeys.ERROR.UNKNOWN
      );
      throw error;
    }
  }

  /**
   * 파일 다운로드 처리 헬퍼 함수
   * @param {Blob} blob - 다운로드할 파일 Blob
   * @param {string} filename - 파일명
   */
  downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  }
}

export default new DownloadService();
