class Notification {
  constructor(params) {
    this.id = params.id;
    this.timestamp = params.timestamp;
    this.source = params.source;
    this.title = params.title;
    this.message = params.message;
    this.destination = params.destination;
    this.response = params.response;
  }
}

module.exports = Notification;