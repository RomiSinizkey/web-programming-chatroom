// models/Message.js

// Import Sequelize data types for defining the Message model schema.
const { DataTypes } = require('sequelize');

// Factory function that defines and returns the Message model.
function defineMessage(sequelize) {

    const Message = sequelize.define(
        'Message',
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            text: {
                type: DataTypes.STRING(500),
                allowNull: false,
                validate: { len: [1, 500] },
            },
            userEmail: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },

        },
        {
            tableName: 'messages',
            timestamps: true,
            paranoid: true,
        }
    );

    return Message;
}

module.exports = { defineMessage };
