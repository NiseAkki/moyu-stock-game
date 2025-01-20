import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 存储所有在线玩家的信息
const players = new Map();
// 存储当前股票信息
let gameState = {
    stocks: [],
    roundEndTime: 0
};

// 暴露 /public 目录
app.use(express.static(path.join(__dirname, '../../public')));

// 暴露 /src/shared 目录（用于加载 config.js）
app.use('/shared', express.static(path.join(__dirname, '../shared')));

// 暴露 /assets 目录（用于加载股票图片等资源）
app.use('/assets', express.static(path.join(__dirname, '../../public/assets')));

// WebSocket 连接逻辑
io.on('connection', (socket) => {
    console.log('玩家连接:', socket.id);

    // 处理玩家加入
    socket.on('playerJoin', (playerData) => {
        players.set(socket.id, {
            id: socket.id,
            name: playerData.playerName,
            totalAssets: playerData.totalAssets,
            currentGameAssets: playerData.currentGameAssets,
            stocks: playerData.playerStocks || []
        });
        
        // 广播玩家列表更新
        io.emit('playersUpdate', Array.from(players.values()));
    });

    // 处理股票交易
    socket.on('stockTransaction', (data) => {
        const player = players.get(socket.id);
        if (player) {
            // 更新玩家数据
            player.currentGameAssets = data.currentGameAssets;
            player.stocks = data.playerStocks;
            
            // 广播交易信息
            io.emit('transactionUpdate', {
                playerId: socket.id,
                playerName: player.name,
                stockName: data.stockName,
                type: data.type, // 'buy' 或 'sell'
                price: data.price
            });
            
            // 更新玩家列表
            io.emit('playersUpdate', Array.from(players.values()));
        }
    });

    // 处理回合结束
    socket.on('roundEnd', (newStockPrices) => {
        gameState.stocks = newStockPrices;
        gameState.roundEndTime = Date.now() + 3600000; // 1小时后
        io.emit('newRound', gameState);
    });

    // 处理断开连接
    socket.on('disconnect', () => {
        console.log('玩家断开连接:', socket.id);
        players.delete(socket.id);
        io.emit('playersUpdate', Array.from(players.values()));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});