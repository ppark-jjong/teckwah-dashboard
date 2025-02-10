from datetime import datetime
from typing import Optional
from app.config.database import execute_query
from sqlalchemy.orm import Session
from app.models.token_model import RefreshToken, Token
from app.utils.logger_util import Logger
from fastapi import HTTPException, status


class TokenRepository:
    """토큰 데이터 접근 레포지토리"""

    def __init__(self, db: Session):
        self.db = db  # 데이터베이스 세션 저장

    @staticmethod
    def create_refresh_token(user_id: str, token: str, expires_at: datetime) -> bool:
        """리프레시 토큰 생성"""
        query = """
        INSERT INTO refresh_tokens (token, user_id, expires_at)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE
            expires_at = VALUES(expires_at)
        """
        return bool(execute_query(query, (token, user_id, expires_at)))

    @staticmethod
    def get_valid_token(token: str, current_time: datetime) -> Optional[dict]:
        """유효한 리프레시 토큰 조회"""
        query = """
        SELECT token, user_id, expires_at
        FROM refresh_tokens
        WHERE token = %s AND expires_at > %s
        """
        result = execute_query(query, (token, current_time), fetch_one=True)
        if result is None:
            Logger.error("유효하지 않은 토큰입니다.")
        return result

    @staticmethod
    def delete_user_tokens(user_id: str) -> bool:
        """사용자의 모든 리프레시 토큰 삭제"""
        query = "DELETE FROM refresh_tokens WHERE user_id = %s"
        return bool(execute_query(query, (user_id,)))

    @staticmethod
    def delete_token(token: str) -> bool:
        """특정 리프레시 토큰 삭제"""
        query = "DELETE FROM refresh_tokens WHERE token = %s"
        return bool(execute_query(query, (token,)))

    @staticmethod
    def delete_expired_tokens(current_time: datetime) -> int:
        """만료된 리프레시 토큰 삭제"""
        query = "DELETE FROM refresh_tokens WHERE expires_at <= %s"
        result = execute_query(query, (current_time,))
        return result.rowcount if result else 0

    def get_by_token(self, token: str) -> RefreshToken:
        """토큰으로 리프레시 토큰 조회"""
        try:
            return self.db.query(RefreshToken).filter(RefreshToken.token == token).first()
        except Exception as e:
            Logger.error(f"리프레시 토큰 조회 중 오류 발생: {str(e)}")
            raise

    def delete(self, token: str) -> bool:
        """리프레시 토큰 삭제"""
        try:
            result = self.db.query(RefreshToken).filter(
                RefreshToken.token == token
            ).delete()
            self.db.commit()
            return result > 0
        except Exception as e:
            Logger.error(f"리프레시 토큰 삭제 중 오류 발생: {str(e)}")
            self.db.rollback()
            raise

    def delete_expired(self) -> int:
        """만료된 리프레시 토큰 삭제"""
        try:
            result = self.db.query(RefreshToken).filter(
                RefreshToken.expires_at < datetime.utcnow()
            ).delete()
            self.db.commit()
            return result
        except Exception as e:
            Logger.error(f"만료된 리프레시 토큰 삭제 중 오류 발생: {str(e)}")
            self.db.rollback()
            raise

    def create_token(self, user_id: str, refresh_token: str, expires_at: datetime) -> Token:
        """새로운 토큰 생성"""
        token = Token(user_id=user_id, refresh_token=refresh_token, expires_at=expires_at)
        self.db.add(token)
        self.db.commit()
        self.db.refresh(token)
        return token

    def get_token_by_user_id(self, user_id: str) -> Token:
        """사용자 ID로 토큰 조회"""
        return self.db.query(Token).filter(Token.user_id == user_id).first()

    def delete_token(self, token_id: int) -> bool:
        """토큰 삭제"""
        token = self.db.query(Token).filter(Token.token_id == token_id).first()
        if token:
            self.db.delete(token)
            self.db.commit()
            return True
        return False
