// models/index.js

// Import Sequelize ORM to manage database connections and models.
const { Sequelize } = require('sequelize');
// Import model factory functions for User and Message models.
const { defineUser } = require('./User');
const { defineMessage } = require('./Message');

// Read database configuration from environment variables (DOCKER) or defaults.
const DB_NAME = process.env.DB_NAME || 'mydb';
const DB_USER = process.env.DB_USER || 'internet';
const DB_PASS = process.env.DB_PASS || 'internet';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT || 3306);

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'mariadb',
    logging: false,
});

// Models
const User = defineUser(sequelize);
const Message = defineMessage(sequelize);

// Associations
User.hasMany(Message, { foreignKey: 'userEmail', sourceKey: 'email' });
Message.belongsTo(User, { foreignKey: 'userEmail', targetKey: 'email' });

async function initDb() {
    await sequelize.authenticate();
    console.log('DB connected');

    await sequelize.sync();
    console.log('DB synced');
}

module.exports = {
    sequelize,
    initDb,
    User,
    Message,
};
