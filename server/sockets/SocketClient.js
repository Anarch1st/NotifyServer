class SocketClient {
  constructor(params) {
    this.device = params.device;
    this.socket = params.socket;
  }
}

module.exports = SocketClient;