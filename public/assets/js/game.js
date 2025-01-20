import { GameConfig } from './config.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        // socket.io 已经通过 script 标签全局加载，直接使用
        this.socket = io();
        this.setupSocketListeners();
        this.playerName = '';
        this.totalAssets = GameConfig.INITIAL_TOTAL_ASSETS; // 使用配置中的初始总资产
        this.currentGameAssets = 0; // 当前对局中的资产
        this.inGame = false; // 新增：标记玩家是否在对局中
        this.playerStocks = []; // 玩家持仓
        this.playerFunctionCards = []; // 玩家持有的功能卡
    }

    setupSocketListeners() {
        this.socket.on('playersUpdate', (players) => {
            this.updatePlayersList(players);
        });

        this.socket.on('transactionUpdate', (data) => {
            this.showTransactionMessage(data);
        });

        this.socket.on('newRound', (gameState) => {
            this.handleNewRound(gameState);
        });

        // 添加游戏结束监听器
        this.socket.on('gameEnd', (finalAssets) => {
            this.handleGameEnd(finalAssets);
        });
    }

    init(data) {
        // 从其他场景返回时，恢复玩家的总资产、当前资产、持仓和回合结束时间
        if (data) {
            this.totalAssets = data.totalAssets || this.totalAssets;
            this.playerName = data.playerName || this.playerName;
            this.currentGameAssets = data.currentGameAssets || 0;
            this.playerStocks = data.playerStocks || []; // 恢复持仓
            this.roundEndTime = data.roundEndTime || 0;
        }
    }

    preload() {
        // 加载股票图片
        this.load.image('stock_1', '/assets/stocks/stock_1.png');
        this.load.image('stock_2', '/assets/stocks/stock_2.png');
        // 加载其他资源
        this.load.image('default_avatar', '/assets/avatars/default_avatar.png');
        this.load.image('bg', '/assets/background.png');
        this.load.image('plus', '/assets/ui/plus.png');
        this.load.image('minus', '/assets/ui/minus.png');
        // 调试信息
        this.load.on('filecomplete', (key, type, file) => {
            console.log(`Loaded: ${key} (${type})`);
        });
        this.load.on('loaderror', (file) => {
            console.error(`Failed to load: ${file.src}`);
        });
    }

    create() {
        this.cameras.main.setBackgroundColor(GameConfig.BACKGROUND_COLOR); // 使用配置中的背景颜色
        this.add.image(GameConfig.GAME_WIDTH / 2, GameConfig.GAME_HEIGHT / 2, 'bg').setDepth(0);
        this.createNicknameInput();
    }

    createNicknameInput() {
        if (!this.playerName) {
            const promptText = this.add.text(100, 250, '点击此处输入昵称', { fontSize: '20px', fill: '#fff' })
                .setOrigin(0.5)
                .setInteractive()
                .setDepth(1)
                .on('pointerdown', () => {
                    const name = prompt('请输入昵称');
                    if (name) {
                        this.playerName = name;
                        promptText.destroy();
                        this.createMainInterface();
                    }
                });
        } else {
            this.createMainInterface();
        }
    }

    createMainInterface() {
        this.add.text(20, 20, `昵称: ${this.playerName}`, { fontSize: '20px', fill: '#fff' }).setDepth(1);
        this.add.text(20, 50, `总资产: $${this.totalAssets}`, { fontSize: '20px', fill: '#fff' }).setDepth(1);
        this.startButton = this.add.text(400, 500, this.inGame ? '回到游戏' : '开始炒股', {
            fontSize: '32px',
            fill: '#fff'
        }).setInteractive();
        this.startButton.on('pointerdown', () => {
            if (!this.inGame) {
                // 首次进入游戏
                if (this.totalAssets >= GameConfig.MAX_GAME_ASSETS) {
                    this.totalAssets -= GameConfig.MAX_GAME_ASSETS;
                    this.currentGameAssets = GameConfig.MAX_GAME_ASSETS;
                    this.inGame = true;
                    this.startStockGame();
                } else {
                    alert('总资产不足，无法参与游戏！');
                }
            } else {
                // 返回游戏
                this.startStockGame();
            }
        });
        this.add.image(500, 200, 'default_avatar').setScale(0.5).setDepth(1);
        // 每回合获得一张功能卡
        this.addFunctionCardToPlayer();

        // 添加在线玩家列表
        this.playersList = this.add.text(500, 100, '在线玩家:', { 
            fontSize: '20px', 
            fill: '#fff' 
        }).setDepth(1);
    }

    addFunctionCardToPlayer() {
        // 计算所有功能卡的总概率
        const totalProbability = GameConfig.FUNCTION_CARDS.reduce((sum, card) => sum + (card.probability || 0), 0);

        // 生成一个随机数（0 到 1 之间）
        const randomValue = Phaser.Math.FloatBetween(0, 1);

        // 如果随机数小于总概率，则选择功能卡
        if (randomValue <= totalProbability) {
            let accumulatedProbability = 0;
            for (const card of GameConfig.FUNCTION_CARDS) {
                accumulatedProbability += card.probability || 0;
                if (randomValue <= accumulatedProbability) {
                    this.playerFunctionCards.push(card);
                    console.log(`获得功能卡: ${card.name}`);
                    return;
                }
            }
        }

        // 如果随机数大于总概率，则不发放功能卡
        console.log('未获得功能卡');
    }

    updatePlayersList(players) {
        let text = '在线玩家:\n';
        players.forEach(player => {
            text += `${player.name}: $${player.currentGameAssets}\n`;
        });
        if (this.playersList) {
            this.playersList.setText(text);
        }
    }

    showTransactionMessage(data) {
        const message = `${data.playerName} ${data.type === 'buy' ? '购买' : '出售'} ${data.stockName} 价格: $${data.price}`;
        // 显示交易消息
        const messageText = this.add.text(400, 550, message, {
            fontSize: '16px',
            fill: '#fff'
        }).setOrigin(0.5);

        // 3秒后消失
        this.time.delayedCall(3000, () => {
            messageText.destroy();
        });
    }

    startStockGame() {
        // 发送玩家加入消息
        this.socket.emit('playerJoin', {
            playerName: this.playerName,
            totalAssets: this.totalAssets,
            currentGameAssets: this.currentGameAssets,
            playerStocks: this.playerStocks
        });

        // 启动股票游戏场景
        this.scene.start('StockGameScene', {
            currentGameAssets: this.currentGameAssets,
            totalAssets: this.totalAssets,
            playerStocks: this.playerStocks,
            playerName: this.playerName,
            roundEndTime: this.roundEndTime,
            socket: this.socket
        });
    }

    handleGameEnd(finalAssets) {
        // 强制退出对局
        this.inGame = false;
        this.totalAssets += finalAssets;
        this.currentGameAssets = 0;
        this.playerStocks = [];
        this.playerFunctionCards = [];
        
        // 返回主界面
        this.scene.start('GameScene');
        
        alert(`本局游戏结束！\n最终资产：${finalAssets}\n已返回总资产`);
    }
}