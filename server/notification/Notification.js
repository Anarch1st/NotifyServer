class Notification {
  constructor(params) {
    this.id = params.id;
    this.timestamp = params.timestamp;
    this.source = params.source ? params.source.trim() : null;
    this.title = params.title ? params.title.trim() : null;
    this.message = params.message ? params.message.trim() : null;
    this.destination = params.destination ? params.destination.trim() : null;
    this.response = params.response ? params.response.trim() : null;
  }
}

module.exports = Notification;