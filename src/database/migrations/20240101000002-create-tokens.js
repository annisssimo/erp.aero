'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tokens', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.STRING(255),
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      deviceId: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      refreshToken: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      revoked: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('tokens', ['userId', 'deviceId', 'revoked'], {
      name: 'idx_tokens_user_device_revoked',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tokens');
  },
};
