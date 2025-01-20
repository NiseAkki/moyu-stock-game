import { GameConfig } from './config.js';

export default class StockGameScene extends Phaser.Scene {
    constructor() {
        super('StockGameScene');
        this.stocks = GameConfig.STOCKS; // 使用配置中的股票列表
        this.playerAssets = 0; // 当前对局中的资产
        this.totalAssets = 0; // 总资产
        this.playerStocks = [];
        this.textObjects = [];
        this.assetsText = null; // 用于显示当前资产的文本对象
        this.roundTimerText = null; // 用于显示本回合倒计时的文本对象
        this.roundTimerEvent = null; // 回合计时器事件
        this.roundEndTime = 0; // 当前回合结束时间（基于本地时间）
        this.gameEndTime = this.getGameEndTime(); // 游戏结束时间（下午3点）
        this.playerFunctionCards = []; // 玩家持有的功能卡
        this.isFunctionCardActive = false; // 是否正在使用功能卡
        this.activeCard = null; // 当前激活的功能卡
        this.stockPriceChanges = {}; // 记录每只股票的价格变动情况
        this.hasPaidInitialFee = false; // 标记是否已经支付了初始1000游戏币
        this.previousStockPrices = {}; // 记录上一回合的实际股价
    }

    init(data) {
        // 保存socket引用
        this.socket = data.socket;
        
        // 从主场景传入的当前对局资产、总资产、持仓和回合结束时间
        this.totalAssets = data.totalAssets || 0; // 总资产
        
        // 如果还没有支付初始费用，从总资产中扣除1000并设置为当前资产
        if (!data.hasPaidInitialFee && this.totalAssets >= 1000) {
            this.totalAssets -= 1000;
            this.playerAssets = 1000;
            this.hasPaidInitialFee = true;
        } else {
            // 如果已经支付过初始费用，使用传入的当前资产
            this.playerAssets = data.currentGameAssets || 0;
        }

        this.playerName = data.playerName || ''; // 玩家昵称
        this.playerStocks = data.playerStocks || []; // 恢复持仓
        this.roundEndTime = data.roundEndTime || 0; // 回合结束时间
        this.hasPaidInitialFee = data.hasPaidInitialFee || false; // 是否已经支付了初始费用

        // 每回合开始时发放一张功能卡
        this.addFunctionCardToPlayer();

        // 初始化股票价格变动状态
        this.stocks.forEach(stock => {
            this.stockPriceChanges[stock.name] = 0; // 初始化为0，表示无变动
            this.previousStockPrices[stock.name] = stock.price; // 记录上一回合的实际股价
        });

        // 设置socket监听器
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        this.socket.on('transactionUpdate', (data) => {
            this.showTransactionMessage(data);
        });

        this.socket.on('newRound', (gameState) => {
            this.stocks = gameState.stocks;
            this.roundEndTime = gameState.roundEndTime;
            this.displayStocks();
        });
    }

    preload() {
        // 加载其他资源（不再加载股票图标）
        this.load.image('default_avatar', '/assets/avatars/default_avatar.png');
        this.load.image('bg', '/assets/background.png');
        this.load.image('plus', '/assets/ui/plus.png');
        this.load.image('minus', '/assets/ui/minus.png');
    }

    create() {
        // 添加背景图片，并设置层级为 0
        this.add.image(400, 300, 'bg').setDepth(0);

        // 显示当前对局中的资产
        this.assetsText = this.add.text(20, 20, `当前资产: $${this.playerAssets}`, { fontSize: '20px', fill: '#fff' }).setDepth(1);

        // 显示本回合倒计时
        this.roundTimerText = this.add.text(20, 50, `剩余时间: ${this.formatTime(this.roundEndTime - Date.now())}`, { fontSize: '20px', fill: '#fff' }).setDepth(1);

        // 显示返回主界面按钮
        const backButton = this.add.text(20, 500, '返回主界面', { fontSize: '24px', fill: '#fff' })
            .setInteractive()
            .setDepth(1)
            .on('pointerdown', () => {
                // 关闭功能卡弹窗
                closeFunctionCardPanel();

                // 返回主界面
                this.scene.start('GameScene', {
                    totalAssets: this.totalAssets,
                    currentGameAssets: this.playerAssets,
                    playerName: this.playerName,
                    roundEndTime: this.roundEndTime,
                    hasPaidInitialFee: this.hasPaidInitialFee // 传递是否支付了初始费用的状态
                });
            });

        // 显示功能卡按钮
        this.functionCardButton = this.add.text(700, 20, '功能卡', { fontSize: '24px', fill: '#000', backgroundColor: '#fff' })
            .setInteractive()
            .setDepth(1)
            .on('pointerdown', () => {
                toggleFunctionCardPanel(); // 调用全局函数显示功能卡界面
                this.updateFunctionCardPanel(); // 更新功能卡列表
            });

        // 显示测试按钮
        const refreshButton = this.add.text(600, 20, '刷新', { fontSize: '24px', fill: '#ff0' })
            .setInteractive()
            .setDepth(1)
            .on('pointerdown', () => {
                this.endRound();
            });

        const endGameButton = this.add.text(600, 60, '结束对局', { fontSize: '24px', fill: '#f00' })
            .setInteractive()
            .setDepth(1)
            .on('pointerdown', () => {
                this.endGame();
            });

        // 显示股票信息
        this.displayStocks();

        // 启动回合计时器
        this.startRoundTimer();
    }

    updateFunctionCardPanel() {
        // 清空功能卡列表
        const cardList = document.getElementById('card-list');
        cardList.innerHTML = '';

        // 动态生成功能卡列表
        this.playerFunctionCards.forEach((card, index) => {
            const cardItem = document.createElement('div');
            cardItem.className = 'card-item';
            cardItem.textContent = card.name;
            const useButton = document.createElement('button');
            useButton.textContent = '使用';
            useButton.onclick = () => {
                this.activateFunctionCard(card);
                toggleFunctionCardPanel(); // 使用功能卡后关闭侧边栏
            };
            cardItem.appendChild(useButton);
            cardList.appendChild(cardItem);
        });
    }

    activateFunctionCard(card) {
        this.isFunctionCardActive = true;
        this.activeCard = card;
        console.log(`功能卡 ${card.name} 已激活`);
        // 这里可以添加功能卡的具体逻辑
    }

    startRoundTimer() {
        // 每1秒更新一次回合倒计时
        this.roundTimerEvent = this.time.addEvent({
            delay: 1000, // 1秒
            callback: this.updateRoundTimer,
            callbackScope: this,
            loop: true
        });
    }

    updateRoundTimer() {
        const remainingTime = this.roundEndTime - Date.now();
        // 更新回合倒计时显示
        this.roundTimerText.setText(`剩余时间: ${this.formatTime(remainingTime)}`);
        // 如果回合结束，进入下一回合
        if (remainingTime <= 0) {
            this.endRound();
        }
    }

    endRound() {
        // 调试信息：输出回合结束的时间
        console.log(`回合结束时间: ${new Date().toLocaleString()}`);

        // 应用功能卡效果
        this.applyFunctionCardEffects();

        // 更新股票价格
        this.updateStockPrices();

        // 如果当前时间超过游戏结束时间（下午3点），结束对局
        if (Date.now() >= this.gameEndTime) {
            console.log(`对局结束原因: 游戏时间到达下午3点`);
            this.endGame();
            return;
        }

        // 计算下一回合的结束时间（下一整点）
        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setHours(now.getHours() + 1, 0, 0, 0); // 设置为下一整点
        this.roundEndTime = nextHour.getTime();

        // 更新倒计时显示
        this.roundTimerText.setText(`剩余时间: ${this.formatTime(this.roundEndTime - Date.now())}`);

        // 每回合开始时发放一张功能卡
        this.addFunctionCardToPlayer();

        // 更新上一回合的实际股价
        this.stocks.forEach(stock => {
            this.previousStockPrices[stock.name] = stock.price;
        });

        // 解除锁定状态（锁定卡只生效一回合）
        this.stocks.forEach(stock => {
            if (stock.isFrozen) {
                stock.isFrozen = false;
            }
        });

        // 发送新的股票价格到服务器
        this.socket.emit('roundEnd', this.stocks);
    }

    endGame() {
        // 计算所有持仓的价值
        const stocksValue = this.playerStocks.reduce((total, stock) => {
            return total + stock.price;
        }, 0);

        // 计算最终资产（现金 + 持仓价值）
        const finalAssets = this.playerAssets + stocksValue;

        // 通知服务器游戏结束
        this.socket.emit('gameEnd', {
            playerName: this.playerName,
            finalAssets: finalAssets
        });
    }

    getGameEndTime() {
        const now = new Date();
        const endTime = new Date(now);
        endTime.setHours(GameConfig.GAME_END_TIME, 0, 0, 0); // 使用配置中的游戏结束时间
        if (now >= endTime) {
            endTime.setDate(endTime.getDate() + 1); // 如果当前时间已经超过游戏结束时间，设置为第二天的游戏结束时间
        }
        return endTime.getTime();
    }

    formatTime(milliseconds) {
        const hours = Math.floor(milliseconds / (60 * 60 * 1000));
        const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((milliseconds % (60 * 1000)) / 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateStockPrices() {
        this.stocks.forEach(stock => {
            // 如果股票被锁定，跳过自然变动
            if (stock.isFrozen) {
                console.log(`股票 ${stock.name} 被锁定，跳过自然变动`);
                return;
            }

            const previousPrice = stock.price; // 记录上一回合的价格
            stock.price += Phaser.Math.Between(-GameConfig.STOCK_PRICE_FLUCTUATION, GameConfig.STOCK_PRICE_FLUCTUATION); // 使用配置中的股票价格波动范围
            stock.price = Math.round(stock.price); // 对股价取整

            if (stock.price < GameConfig.STOCK_MIN_PRICE) stock.price = GameConfig.STOCK_MIN_PRICE; // 使用配置中的股票最低价格

            // 计算价格变动情况
            const priceChange = stock.price - previousPrice;
            this.stockPriceChanges[stock.name] = priceChange;
        });

        this.displayStocks();
    }

    displayStocks() {
        // 清空之前的股票信息
        this.textObjects.forEach(textObject => {
            textObject.destroy();
        });
        this.textObjects = [];

        // 显示每只股票的信息
        this.stocks.forEach((stock, index) => {
            const y = 100 + index * 100;

            // 添加股票名称和价格
            const stockInfoText = this.add.text(150, y, `${stock.name} - 价格: $${stock.price} 元`, { fontSize: '20px', fill: '#fff' })
                .setInteractive()
                .setDepth(10)
                .on('pointerdown', () => {
                    if (this.isFunctionCardActive) {
                        this.useFunctionCardOnStock(stock);
                    }
                });

            // 如果正在使用功能卡，股票名称变为蓝底白字
            if (this.isFunctionCardActive) {
                stockInfoText.setBackgroundColor('#00f').setColor('#fff');
            }

            // 显示股票状态
            if (stock.pendingEffect) {
                stockInfoText.setBackgroundColor('#ff0').setColor('#000'); // 黄底黑字
                const cancelButton = this.add.text(600, y, '×', { fontSize: '20px', fill: '#fff', backgroundColor: '#f00' })
                    .setInteractive()
                    .setDepth(10)
                    .on('pointerdown', () => {
                        this.cancelFunctionCard(stock);
                    });
                this.textObjects.push(cancelButton);
            } else if (stock.isFrozen) {
                stockInfoText.setBackgroundColor('#00f').setColor('#fff'); // 蓝底白字
            }

            this.textObjects.push(stockInfoText);

            // 添加持仓数量文本
            const holdings = this.playerStocks.filter(s => s.name === stock.name).length;
            const holdingsText = this.add.text(450, y, `持仓: ${holdings}`, { fontSize: '20px', fill: '#fff' }).setDepth(10);
            this.textObjects.push(holdingsText);

            // 添加股票价格变动状态 - 只显示已记录的状态
            let changeText = '';
            let backgroundColor = '#000';
            let textColor = '#fff';

            if (stock.isFrozen) {
                changeText = `锁定`;
                backgroundColor = '#00f';
                textColor = '#fff';
            } else {
                const priceChange = this.stockPriceChanges[stock.name]; // 使用已记录的价格变动
                if (priceChange > 0) {
                    changeText = `上涨`;
                    backgroundColor = '#f00';
                } else if (priceChange < 0) {
                    changeText = `下跌`;
                    backgroundColor = '#006400';
                } else {
                    changeText = `不变`;
                    backgroundColor = '#333';
                }
            }

            const changeTextObj = this.add.text(350, y, changeText, { 
                fontSize: '20px', 
                fill: textColor, 
                backgroundColor: backgroundColor 
            }).setDepth(10);

            this.textObjects.push(changeTextObj);

            // 添加买入按钮
            const plusButton = this.add.image(600, y, 'plus')
                .setScale(0.2)
                .setInteractive({ useHandCursor: true }) // 添加手型光标
                .setDepth(10)
                .on('pointerdown', () => {
                    this.buyStock(stock);
                })
                .on('pointerover', function() {
                    this.setTint(0xcccccc); // 鼠标悬停时变灰
                })
                .on('pointerout', function() {
                    this.clearTint(); // 鼠标移出时恢复原色
                });

            this.textObjects.push(plusButton);

            // 添加卖出按钮
            const minusButton = this.add.image(650, y, 'minus')
                .setScale(0.2)
                .setInteractive({ useHandCursor: true }) // 添加手型光标
                .setDepth(10)
                .on('pointerdown', () => {
                    this.sellStock(stock);
                })
                .on('pointerover', function() {
                    this.setTint(0xcccccc); // 鼠标悬停时变灰
                })
                .on('pointerout', function() {
                    this.clearTint(); // 鼠标移出时恢复原色
                });

            this.textObjects.push(minusButton);
        });
    }

    buyStock(stock) {
        if (this.playerAssets >= stock.price) {
            this.playerAssets -= stock.price;
            this.playerStocks.push(stock);
            this.updateAssetsText();
            this.displayStocks();

            // 发送交易信息到服务器
            this.socket.emit('stockTransaction', {
                currentGameAssets: this.playerAssets,
                playerStocks: this.playerStocks,
                stockName: stock.name,
                type: 'buy',
                price: stock.price
            });
        }
    }

    sellStock(stock) {
        const index = this.playerStocks.findIndex(s => s.name === stock.name);
        if (index !== -1) {
            this.playerAssets += stock.price;
            this.playerStocks.splice(index, 1);
            this.updateAssetsText();
            this.displayStocks();

            // 发送交易信息到服务器
            this.socket.emit('stockTransaction', {
                currentGameAssets: this.playerAssets,
                playerStocks: this.playerStocks,
                stockName: stock.name,
                type: 'sell',
                price: stock.price
            });
        }
    }

    updateAssetsText() {
        this.assetsText.setText(`当前资产: $${this.playerAssets}`);
    }

    useFunctionCardOnStock(stock) {
        if (this.activeCard) {
            // 记录功能卡效果，在下一回合结算
            stock.pendingEffect = this.activeCard;
            // 使用功能卡后，从列表中移除
            this.playerFunctionCards = this.playerFunctionCards.filter(c => c !== this.activeCard);
            this.isFunctionCardActive = false;
            this.activeCard = null;
            this.displayStocks();
        }
    }

    cancelFunctionCard(stock) {
        if (stock.pendingEffect) {
            // 将功能卡返回玩家手中
            this.playerFunctionCards.push(stock.pendingEffect);
            stock.pendingEffect = null;
            this.displayStocks();
        }
    }

    applyFunctionCardEffects() {
        this.stocks.forEach(stock => {
            if (stock.pendingEffect) {
                const previousPrice = stock.price; // 记录功能卡生效前的股价
                const effect = stock.pendingEffect.effect;
                const range = stock.pendingEffect.range;

                switch (effect) {
                    case 'forceRisePercentage':
                        const risePercentage = Phaser.Math.Between(range[0], range[1]);
                        stock.price *= (1 + risePercentage / 100);
                        stock.price = Math.round(stock.price); // 对股价取整
                        break;
                    case 'forceFallPercentage':
                        const fallPercentage = Phaser.Math.Between(range[0], range[1]);
                        stock.price *= (1 - fallPercentage / 100);
                        stock.price = Math.round(stock.price); // 对股价取整
                        break;
                    case 'forceRisePrice':
                        const risePrice = Phaser.Math.Between(range[0], range[1]);
                        stock.price += risePrice;
                        stock.price = Math.round(stock.price); // 对股价取整
                        break;
                    case 'forceFallPrice':
                        const fallPrice = Phaser.Math.Between(range[0], range[1]);
                        stock.price -= fallPrice;
                        stock.price = Math.round(stock.price); // 对股价取整
                        break;
                    case 'freezeStock':
                        stock.isFrozen = true;
                        break;
                }

                // 计算功能卡生效后的股价变动
                const priceChange = stock.price - previousPrice;
                this.stockPriceChanges[stock.name] = priceChange;

                // 清除功能卡效果
                stock.pendingEffect = null;
            }
        });

        // 更新股票显示
        this.displayStocks();
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

    showTransactionMessage(data) {
        const message = `${data.playerName} ${data.type === 'buy' ? '购买' : '出售'} ${data.stockName} 价格: $${data.price}`;
        const messageText = this.add.text(400, 550, message, {
            fontSize: '16px',
            fill: '#fff'
        }).setOrigin(0.5);

        this.time.delayedCall(3000, () => {
            messageText.destroy();
        });
    }

    update() {
        // 检查是否到达游戏结束时间
        if (Date.now() >= GameConfig.GAME_END_TIME) {
            this.endGame();
        }
    }
}

// 全局函数：切换功能卡侧边栏的显示状态
function toggleFunctionCardPanel() {
    const panel = document.getElementById('function-card-panel');
    panel.classList.toggle('visible');
}

// 全局函数：关闭功能卡弹窗
function closeFunctionCardPanel() {
    const panel = document.getElementById('function-card-panel');
    panel.classList.remove('visible'); // 移除 visible 类，关闭弹窗
}