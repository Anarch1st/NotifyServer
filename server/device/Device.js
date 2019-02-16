class Device {
  constructor(params) {
    this.id = params.id;
    this.created_at = params.created_at;
    this.modified_at = params.modified_at;
    this.name = params.name;
    this.token = params.token;
  }
}

module.exports = Device;