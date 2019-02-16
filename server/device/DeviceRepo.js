const {
  Client
} = require('pg');
const fs = require('fs');
const path = require('path');
const Device = require('./Device');

const debug = require('debug')('notify:device:repo');

class DeviceRepo {
  constructor(params) {
    this.client = new Client({
      user: (process.env.NODE_ENV === 'production') ? 'pi' : 'saii',
      host: 'localhost',
      database: 'pi_db',
      password: 'pi_db_pass',
      port: 5432
    });
    this.client.connect();
    let sql = fs.readFileSync(path.join(__dirname, './device.sql')).toString();

    this.client.query(sql).then(res => {
      debug('device.sql ran successfully');
    }).catch(err => {
      debug('Error orrured while running device.sql \n %O', err);
    })
  }

  saveDevice(device) {
    let insertQuery = {
      name: 'insert-device',
      text: 'INSERT INTO devices(name, token) VALUES($1, $2) RETURNING *',
      values: [device.name, device.token]
    }
    debug('Adding device: %o', device);
    return this.client.query(insertQuery);
  }

  updateDevice(device) {
    let updateQuery = {
      name: 'update-device',
      text: 'UPDATE devices SET name = $1, token = $2 WHERE id = $3 RETURNING *',
      values: [device.name, device.token, device.id]
    }
    debug('Updating device with id: %s', device.id);
    return this.client.query(updateQuery);
  }

  queryDeviceById(id) {
    let searchQuery = {
      name: 'search-device-id',
      text: 'SELECT * FROM devices WHERE id = $1 LIMIT 1',
      values: [id]
    }
    debug('Querying for device by id %s', id);
    return this.client.query(searchQuery);
  }

  queryDeviceByName(name) {
    let searchQuery = {
      name: 'search-device-name',
      text: 'SELECT * FROM devices WHERE name = $1 LIMIT 1',
      values: [name]
    }
    debug('Querying for device by name %s', name);
    return this.client.query(searchQuery);
  }

  queryAllDevices() {
    let listQuery = {
      name: 'list-devices',
      text: 'SELECT DISTINCT name FROM devices',
      values: []
    }
    debug('Querying for all unique devices');
    return this.client.query(listQuery);
  }
}

module.exports = DeviceRepo;