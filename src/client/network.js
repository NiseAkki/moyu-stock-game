export default class Network {
    constructor() {
        // socket.io 已经通过 script 标签全局加载，直接使用
        this.socket = io();
        this.setupEventListeners();
    }
  
    setupEventListeners() {
      this.socket.on('connect', () => {
        console.log('Connected to server');
      });
  
      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
      });
    }
  
    sendMessage(event, data) {
      this.socket.emit(event, data);
    }
  
    onMessage(event, callback) {
      this.socket.on(event, callback);
    }
  }