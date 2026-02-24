module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    action: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT'
    },
    before_data: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    after_data: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['entity_type', 'entity_id'] },
      { fields: ['user_id'] },
      { fields: ['action'] },
      { fields: ['created_at'] }
    ]
  });

  return AuditLog;
};
