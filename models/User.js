// models/User.js

// Import Sequelize data types used to define model columns.
const { DataTypes } = require('sequelize');

// Model factory: defines and returns the User model using the provided Sequelize instance.
function defineUser(sequelize) {
    const User = sequelize.define(
        'User',
        {
            email: {
                type: DataTypes.STRING(32),
                allowNull: false,
                primaryKey: true,
                validate: { isEmail: true, len: [3, 32] },
            },
            firstName: {
                type: DataTypes.STRING(32),
                allowNull: false,
                validate: { len: [3, 32], is: /^[A-Za-z]+$/i },
            },
            lastName: {
                type: DataTypes.STRING(32),
                allowNull: false,
                validate: { len: [3, 32], is: /^[A-Za-z]+$/i },
            },
            password: {
                type: DataTypes.STRING(255),
                allowNull: false,
            }

        },
        {
            tableName: 'users',
            timestamps: true,
        }
    );

    return User;
}

module.exports = { defineUser };
