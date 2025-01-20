export const GameConfig = {
    // 游戏基本设置
    GAME_WIDTH: 800, // 游戏画布宽度
    GAME_HEIGHT: 600, // 游戏画布高度
    BACKGROUND_COLOR: '#000000', // 游戏背景颜色

    // 玩家初始设置
    INITIAL_TOTAL_ASSETS: 1000, // 玩家初始总资产
    INITIAL_GAME_ASSETS: 1000, // 玩家初始对局资产
    MAX_GAME_ASSETS: 1000, // 玩家每局最多携带的资产
    DEFAULT_AVATAR: 'default_avatar.png', // 玩家默认头像

    // 股票设置
    STOCKS: [
        { name: '股票A', price: 100, icon: 'stock_1.png' },
        { name: '股票B', price: 150, icon: 'stock_2.png' }
    ],
    STOCK_PRICE_FLUCTUATION: 10, // 股票价格波动范围（±10）
    STOCK_MIN_PRICE: 0, // 股票最低价格

    // 回合设置
    ROUND_DURATION: 60 * 60 * 1000, // 每回合持续时间（1小时）
    GAME_END_TIME: 15, // 游戏结束时间（下午3点）

    // 功能卡设置
    FUNCTION_CARDS: [
        { name: '强制上涨（百分比）', effect: 'forceRisePercentage', range: [1, 10], probability: 0.2 }, // 20% 概率
        { name: '强制下跌（百分比）', effect: 'forceFallPercentage', range: [1, 10], probability: 0.2 }, // 20% 概率
        { name: '强制上涨（股价）', effect: 'forceRisePrice', range: [1, 10], probability: 0.2 }, // 20% 概率
        { name: '强制下跌（股价）', effect: 'forceFallPrice', range: [1, 10], probability: 0.2 }, // 20% 概率
        { name: '锁定股价', effect: 'freezeStock', probability: 0.2 } // 20% 概率
    ],

    // 排行榜设置
    LEADERBOARD_SIZE: 10, // 排行榜显示的最大玩家数量

    // 调试设置
    DEBUG_MODE: true, // 是否启用调试模式
    DEBUG_BUTTONS: true // 是否显示调试按钮
};