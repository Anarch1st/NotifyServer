const {
  Client
} = require('pg');
const fs = require('fs');
const path = require('path');
const Notification = require('./Notification');

const debug = require('debug')('notify:notification:repo');

class NotificationRepo {
  constructor(params) {
    this.client = new Client({
      user: (process.env.NODE_ENV === 'production') ? 'pi' : 'saii',
      host: 'localhost',
      database: 'pi_db',
      password: 'pi_db_pass',
      port: 5432
    });
    this.client.connect();
    let sql = fs.readFileSync(path.join(__dirname, './notification.sql')).toString();

    this.client.query(sql).then(res => {
      debug('notification.sql ran successfully');
    }).catch(err => {
      debug('Error orrured while running notification.sql \n %O', err);
    })
  }

  saveNotification(notification) {
    let insertQuery = {
      name: 'insert-notification',
      text: 'INSERT INTO notifications(source, title, message, destination) VALUES($1, $2, $3, $4) RETURNING *',
      values: [notification.source, notification.title, notification.message, notification.destination]
    }
    debug('Adding notification: %o', notification);
    return this.client.query(insertQuery);
  }

  updateNotification(notification) {
    let updateQuery = {
      name: 'update-notification',
      text: 'UPDATE notifications SET source = $1, title = $2, message = $3, destination = $4, response = $5 WHERE id = $6 RETURNING *',
      values: [notification.source, notification.title, notification.message, notification.destination, notification.response, notification.id]
    }
    debug('Updating notification: %s', notification.id);
    return this.client.query(updateQuery);
  }
}

module.exports = NotificationRepo;