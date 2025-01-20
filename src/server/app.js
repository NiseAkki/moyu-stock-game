import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",  // 在生产环境中应该设置为具体的域名
        methods: ["GET", "POST"]
    }
});

// 静态文件服务
app.use(express.static(path.join(__dirname, '../../public')));

// 根路由处理
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// 添加错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// 处理 404
app.use((req, res) => {
    console.log('404 请求:', req.url);
    res.status(404).sendFile(path.join(__dirname, '../../public/index.html'));
});

// 暴露 /src/shared 目录（用于加载 config.js）
app.use('/shared', express.static(path.join(__dirname, '../shared')));

// 暴露 /assets 目录（用于加载股票图片等资源）
app.use('/assets', express.static(path.join(__dirname, '../../public/assets')));

// 存储所有在线玩家的信息
const players = new Map();
// 存储当前股票信息
let gameState = {
    stocks: [],
    roundEndTime: 0
};

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
server.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});