import { Sequelize, DataTypes } from 'sequelize';

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite'
});

export const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true  // 确保用户名唯一
    },
    totalAssets: {
        type: DataTypes.INTEGER,
        defaultValue: 1000
    },
    currentGameAssets: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    stocks: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    }
});

// 初始化数据库
try {
    await sequelize.sync();
    console.log('数据库同步成功');
} catch (error) {
    console.error('数据库同步失败:', error);
}

export default User;
