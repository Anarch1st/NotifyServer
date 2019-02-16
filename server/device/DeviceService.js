const Device = require('./Device');
const DeviceRepo = require('./DeviceRepo');

const debug = require('debug')('notify:device:service');

const deviceRepo = new DeviceRepo();

class DeviceService {

  // cb(status, object)
  // status can be 'added', 'updated' or 'error' and corrosponding object
  async addOrUpdateDevice(name, token) {
    let res = await deviceRepo.queryDeviceByName(name);

    if (res.rows && res.rows[0] && Object.keys(res.rows[0]).length > 0) {
      let device = new Device(res.rows[0]);
      device.token = token;
      let updateRes = await deviceRepo.updateDevice(device);

      if (updateRes.rows && updateRes.rows[0] && Object.keys(updateRes.rows[0]).length > 0) {
        debug('Device successfully updated %s', name);
        return new Device(updateRes.rows[0]);
      } else {
        throw new Error('No rows updated');
      }

    } else {
      let newDevice = new Device({
        name: name,
        token: token
      });

      let addRes = await deviceRepo.saveDevice(newDevice);

      if (addRes.rows && addRes.rows[0] && Object.keys(addRes.rows[0]).length > 0) {
        debug('Device successfully added %s', name);
        return new Device(addRes.rows[0]);
      } else {
        throw new Error('No rows added');
      }
    }
  }

  async getAllDeviceNames() {
    let res = await deviceRepo.queryAllDevices();
    if (res.rows && res.rows.length > 0) {
      debug('Device name query success. Number of devices: %d', res.rows.length);
      return res.rows.map(row => row.name);
    } else {
      debug('Device name query success. No devices');
      return [];
    }
  }

  async getDeviceWithName(name) {
    let res = await deviceRepo.queryDeviceByName(name);
    if (res.rows && res.rows[0] && Object.keys(res.rows[0]).length > 0) {
      let device = new Device(res.rows[0]);
      debug('Device %s found.', device.name);
      return device;
    } else {
      debug('Device not found.');
      return null;
    }
  }
}

module.exports = DeviceService;