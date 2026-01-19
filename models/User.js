// models/User.js
const { DataTypes } = require('sequelize');

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
