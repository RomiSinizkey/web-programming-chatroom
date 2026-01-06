const { Sequelize } = require('sequelize');

//update by the DOCKER
const DB_NAME = process.env.DB_NAME || 'YOUR_DB_NAME';
const DB_USER = process.env.DB_USER || 'YOUR_DB_USER';
const DB_PASS = process.env.DB_PASS || 'YOUR_DB_PASS';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_DIALECT = 'mariadb';

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    dialect: DB_DIALECT,
    logging: false,
});

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('DB connected');
    } catch (err) {
        console.error('DB connection failed:', err.message);
    }
}

module.exports = {
    sequelize,
    testConnection,
};
