const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/Database');

const PostalCode = sequelize.define(
  'postal_code',
  {
    postal_code: {
      type: DataTypes.STRING(5),
      primaryKey: true,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING(21),
      allowNull: false,
    },
    county: {
      type: DataTypes.STRING(51),
      allowNull: false,
    },
    district: {
      type: DataTypes.STRING(51),
      allowNull: true,
    },
  },
  {
    tableName: 'postal_code',
    timestamps: false,
  }
);

// 우편번호 상세 모델 정의
const PostalCodeDetail = sequelize.define(
  'postal_code_detail',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    postal_code: {
      type: DataTypes.STRING(5),
      allowNull: false,
      references: {
        model: 'postal_code',
        key: 'postal_code',
      },
    },
    warehouse: {
      type: DataTypes.ENUM('SEOUL', 'BUSAN', 'GWANGJU', 'DAEJEON'),
      allowNull: false,
    },
    distance: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '거리(미터)',
    },
    duration_time: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '소요시간(초)',
    },
  },
  {
    tableName: 'postal_code_detail',
    timestamps: false,
    indexes: [
      {
        name: 'idx_postal_code_warehouse',
        fields: ['postal_code', 'warehouse'],
        unique: true,
      },
    ],
  }
);

// 관계 설정
PostalCode.hasMany(PostalCodeDetail, {
  foreignKey: 'postal_code',
  sourceKey: 'postal_code',
  as: 'details',
});

PostalCodeDetail.belongsTo(PostalCode, {
  foreignKey: 'postal_code',
  targetKey: 'postal_code',
  as: 'postalCode',
});

module.exports = {
  PostalCode,
  PostalCodeDetail,
};
