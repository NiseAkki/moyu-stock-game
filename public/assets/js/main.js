import GameScene from './game.js';
import StockGameScene from './stockGameScene.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    scene: [GameScene, StockGameScene],
    backgroundColor: '#000000',
};

const game = new Phaser.Game(config);