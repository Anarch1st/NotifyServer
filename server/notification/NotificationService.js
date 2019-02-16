const Notification = require('./Notification');
const NotificationRepo = require('./NotificationRepo');

const debug = require('debug')('notify:notification:service');

const notificationRepo = new NotificationRepo();

class NotificationService {

  async saveNotification(title, message, source, destination) {
    let newNotification = new Notification({
      title: title,
      message: message,
      source: source,
      destination: destination
    });

    let res = await notificationRepo.saveNotification(newNotification);

    if (res.rows && res.rows[0] && Object.keys(res.rows[0]).length > 0) {
      debug('Notification successfully added');
      return new Notification(res.rows[0]);
    } else {
      throw new Error('No notifications added');
    }
  };

  async updateNotification(notification) {
    let res = await notificationRepo.updateNotification(notification);

    if (res.rows && res.rows[0] && Object.keys(res.rows[0]).length > 0) {
      debug('Notification successfully updated');
      return new Notification(res.rows[0]);
    } else {
      throw new Error('No notifications added');
    }
  }
}

module.exports = NotificationService;