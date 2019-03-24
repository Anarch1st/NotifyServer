const SocketClient = require('./SocketClient');

const debug = require('debug')('notify:socket:service');


class SocketClientService {

  constructor() {
    this.socketClients = []
  }

  addSocketClient(device, socket) {
    this.socketClients.push(new SocketClient({
      device: device,
      socket: socket
    }));

    debug('Added socket client: %s', device.name);
  }

  findSocketClient(device) {
    let index = this.socketClients.findIndex(entry => entry.device.name === device);
    if (index !== -1) {
      debug('Found socket client %s', device);
      return this.socketClients[index];
    } else {
      debug('Client %s not found', device);
      return null;
    }
  }

  findDevice(socket) {
    let index = this.socketClients.findIndex(entry => entry.socket === socket);
    if (index !== -1) {
      debug('Found device');
      return this.socketClients[index].device;
    } else {
      debug('Device not found');
      return null;
    }
  }

  deleteSocketClient(socket) {
    let index = this.socketClients.findIndex(entry => entry.socket === socket);
    if (index !== -1) {
      debug('Deleted socket client %s', this.socketClients[index].device.name);
      return (this.socketClients.splice(index, 1))[0];
    } else {
      debug('Socket not found');
      return null;
    }
  }

  getListOfSockets() {
    return this.socketClients.map(entry => entry.socket);
  }

  getListOfClients() {
    return this.socketClients.map(entry => entry.device);
  }
}

module.exports = SocketClientService;