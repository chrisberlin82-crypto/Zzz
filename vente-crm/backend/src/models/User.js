module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('ADMIN', 'STANDORTLEITUNG', 'TEAMLEAD', 'BACKOFFICE', 'VERTRIEB'),
      allowNull: false,
      defaultValue: 'VERTRIEB'
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    company_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    legal_form: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    owner_manager: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    tax_number: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    street: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    postal_code: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    iban: {
      type: DataTypes.STRING(34),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    last_latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true
    },
    last_longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true
    },
    last_location_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    trial_ends_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    subscription_status: {
      type: DataTypes.ENUM('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'),
      allowNull: false,
      defaultValue: 'TRIAL'
    },
    stripe_customer_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    stripe_subscription_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    subscription_plan: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    subscription_price_cents: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    subscription_started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    subscription_ends_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['email'] },
      { fields: ['role'] },
      { fields: ['is_active'] }
    ]
  });

  User.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    delete values.password_hash;
    delete values.refresh_token;
    return values;
  };

  return User;
};
