class Device {
  constructor(params) {
    this.id = params.id;
    this.created_at = params.created_at;
    this.modified_at = params.modified_at;
    this.name = params.name.trim();
    this.token = params.token ? params.token.trim() : null;
  }
}

module.exports = Device;