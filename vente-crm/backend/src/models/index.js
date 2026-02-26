const { Sequelize } = require('sequelize');
const dbConfig = require('../config/database');
const logger = require('../utils/logger');

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
    pool: config.pool,
    dialectOptions: config.dialectOptions || {},
    define: {
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

// Import models
const User = require('./User')(sequelize, Sequelize.DataTypes);
const Customer = require('./Customer')(sequelize, Sequelize.DataTypes);
const Contract = require('./Contract')(sequelize, Sequelize.DataTypes);
const Product = require('./Product')(sequelize, Sequelize.DataTypes);
const Expense = require('./Expense')(sequelize, Sequelize.DataTypes);
const ExpenseCategory = require('./ExpenseCategory')(sequelize, Sequelize.DataTypes);
const AddressList = require('./AddressList')(sequelize, Sequelize.DataTypes);
const Address = require('./Address')(sequelize, Sequelize.DataTypes);
const Signature = require('./Signature')(sequelize, Sequelize.DataTypes);
const AuditLog = require('./AuditLog')(sequelize, Sequelize.DataTypes);
const TerritoryAssignment = require('./TerritoryAssignment')(sequelize, Sequelize.DataTypes);
const SalespersonTerritory = require('./SalespersonTerritory')(sequelize, Sequelize.DataTypes);
const StreetUnit = require('./StreetUnit')(sequelize);
const TerritoryRun = require('./TerritoryRun')(sequelize);
const RunTerritory = require('./RunTerritory')(sequelize);
const RunTerritoryUnit = require('./RunTerritoryUnit')(sequelize);
const LocationPing = require('./LocationPing')(sequelize);

const db = {
  sequelize,
  Sequelize,
  User,
  Customer,
  Contract,
  Product,
  Expense,
  ExpenseCategory,
  AddressList,
  Address,
  Signature,
  AuditLog,
  TerritoryAssignment,
  SalespersonTerritory,
  StreetUnit,
  TerritoryRun,
  RunTerritory,
  RunTerritoryUnit,
  LocationPing
};

// Define associations
// User -> Customers (1:n)
User.hasMany(Customer, { foreignKey: 'user_id', as: 'customers' });
Customer.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Customer -> Contracts (1:n)
Customer.hasMany(Contract, { foreignKey: 'customer_id', as: 'contracts' });
Contract.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

// User -> Contracts (1:n)
User.hasMany(Contract, { foreignKey: 'user_id', as: 'contracts' });
Contract.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Product -> Contracts (1:n)
Product.hasMany(Contract, { foreignKey: 'product_id', as: 'contracts' });
Contract.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User -> Expenses (1:n)
User.hasMany(Expense, { foreignKey: 'user_id', as: 'expenses' });
Expense.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ExpenseCategory -> Expenses (1:n)
ExpenseCategory.hasMany(Expense, { foreignKey: 'category_id', as: 'expenses' });
Expense.belongsTo(ExpenseCategory, { foreignKey: 'category_id', as: 'category' });

// User -> AddressLists (1:n)
User.hasMany(AddressList, { foreignKey: 'user_id', as: 'addressLists' });
AddressList.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// AddressList -> Addresses (1:n)
AddressList.hasMany(Address, { foreignKey: 'address_list_id', as: 'addresses' });
Address.belongsTo(AddressList, { foreignKey: 'address_list_id', as: 'addressList' });

// Contract -> Signatures (1:n)
Contract.hasMany(Signature, { foreignKey: 'contract_id', as: 'signatures' });
Signature.belongsTo(Contract, { foreignKey: 'contract_id', as: 'contract' });

// User -> Signatures (1:n)
User.hasMany(Signature, { foreignKey: 'user_id', as: 'signatures' });
Signature.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User -> AuditLogs (1:n)
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Territory Assignments: Admin -> Standortleitung/Teamlead
User.hasMany(TerritoryAssignment, { foreignKey: 'assigned_to_user_id', as: 'territories' });
TerritoryAssignment.belongsTo(User, { foreignKey: 'assigned_to_user_id', as: 'assignedTo' });
User.hasMany(TerritoryAssignment, { foreignKey: 'assigned_by_user_id', as: 'assignedTerritories' });
TerritoryAssignment.belongsTo(User, { foreignKey: 'assigned_by_user_id', as: 'assignedBy' });

// Salesperson Territories: Standortleitung/Teamlead -> Vertriebler
TerritoryAssignment.hasMany(SalespersonTerritory, { foreignKey: 'territory_assignment_id', as: 'salespersonTerritories' });
SalespersonTerritory.belongsTo(TerritoryAssignment, { foreignKey: 'territory_assignment_id', as: 'territoryAssignment' });
User.hasMany(SalespersonTerritory, { foreignKey: 'salesperson_user_id', as: 'myTerritories' });
SalespersonTerritory.belongsTo(User, { foreignKey: 'salesperson_user_id', as: 'salesperson' });
User.hasMany(SalespersonTerritory, { foreignKey: 'assigned_by_user_id', as: 'delegatedTerritories' });
SalespersonTerritory.belongsTo(User, { foreignKey: 'assigned_by_user_id', as: 'delegatedBy' });

// Associations for new models (StreetUnit, TerritoryRun, RunTerritory, RunTerritoryUnit, LocationPing)
StreetUnit.hasMany(RunTerritoryUnit, { foreignKey: 'street_unit_id', as: 'territoryUnits' });
RunTerritoryUnit.belongsTo(StreetUnit, { foreignKey: 'street_unit_id', as: 'streetUnit' });

TerritoryRun.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'createdBy' });
TerritoryRun.hasMany(RunTerritory, { foreignKey: 'run_id', as: 'territories' });
TerritoryRun.hasMany(LocationPing, { foreignKey: 'run_id', as: 'pings' });

RunTerritory.belongsTo(TerritoryRun, { foreignKey: 'run_id', as: 'run' });
RunTerritory.belongsTo(User, { foreignKey: 'rep_user_id', as: 'rep' });
RunTerritory.hasMany(RunTerritoryUnit, { foreignKey: 'run_territory_id', as: 'units' });

RunTerritoryUnit.belongsTo(RunTerritory, { foreignKey: 'run_territory_id', as: 'territory' });

LocationPing.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
LocationPing.belongsTo(TerritoryRun, { foreignKey: 'run_id', as: 'run' });

module.exports = db;
