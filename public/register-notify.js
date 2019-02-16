import {
  PolymerElement,
  html
} from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js'
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';

export class RegisterNotify extends PolymerElement {
  constructor() {
    super();

    this._boundMessingInit = this.initializeMessaging.bind(this);
  }

  ready() {
    super.ready();
    this.$.deviceList.generateRequest();

    this.$.submitReg.addEventListener('click', this.registerSelf.bind(this));
    this.$.submitNoti.addEventListener('click', this.postNotification.bind(this));
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('firebase-init', this._boundMessingInit)
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('firebase-init', this._boundMessingInit);
  }

  static get template() {
    return html `
    <style>
      div {
        margin: 20px;
        padding: 20px;
        border: 1px solid grey;
        border-radius: 2px;
      }

      paper-button {
        background: blue;
        color: white;
      }

      #notifyForm {
          display: none;
      }
    </style>

    <div id="regForm">
      <paper-input id="regText" label="Register As" required></paper-input>
      <paper-button id="submitReg">Submit</paper-button>
    </div>

    <div id="notifyForm">
      <paper-input id="notifyTitle" label="Title" required></paper-input>
      <paper-input id="notifyBody" label="Body" required></paper-input>

      <paper-dropdown-menu id="notifyDevice" label="Devices">
        <paper-listbox id="items" slot="dropdown-content">
        </paper-listbox>
      </paper-dropdown-menu>

      <paper-button id="submitNoti">Notify</paper-button>
    </div>

    <iron-ajax id="register" url="/notify/register"
      method="POST"
      content-type="application/x-www-form-urlencoded"
      on-response="handleRegistration"
      on-error="handleError">
    </iron-ajax>

    <iron-ajax id="notify"
      method="POST"
      content-type="application/x-www-form-urlencoded"
      on-response="handleNotify"
      on-error="handleError">
    </iron-ajax>

    <iron-ajax id="deviceList" url="/notify/list"
      handle-as="json"
      on-response="handleDeviceList"
      on-error="handleError">
    </iron-ajax>
    `;
  }

  static get properties() {
    return {
      deviceList: {
        type: Array,
        value: [],
        observer: '_deviceListUpdated'
      },
      messaging: {
        type: Object,
        value: {}
      }
    }
  }

  handleDeviceList(data) {
    this.$.notifyForm.style.display = "block";
    this.set('deviceList', data.detail.response);
  }

  handleError(error) {
    console.log(error);
  }

  _deviceListUpdated() {
    let list = this.$.items;

    for (var device of this.deviceList) {
      let item = document.createElement('paper-item');
      let textNode = document.createTextNode(device);
      item.append(textNode);
      list.append(item);
    }
  }

  postNotification() {
    if (this.$.notifyTitle.value === "" || this.$.notifyBody.value === "" || this.$.notifyDevice.value === undefined) {
      return;
    }

    var xhr = this.$.notify;
    xhr.url = '/notify/' + this.$.notifyDevice.value;
    xhr.body = {
      title: this.$.notifyTitle.value,
      body: this.$.notifyBody.value,
      source: 'web'
    }

    xhr.generateRequest();
  }

  registerSelf() {
    this.messaging.getToken().then(token => {
      if (token) {
        let xhr = this.$.register;
        xhr.body = {
          source: this.$.regText.value,
          token: token
        };
        xhr.generateRequest();
      } else {
        this.messaging.requestPermission().then(() => {
          console.log('Notification permission granted.');
          this.registerSelf();
        }).catch(err => {
          console.log('Unable to get permission to notify.', err);
        });
      }
    }).catch(err => {
      console.log('An error occurred while retrieving token. ', err);
    });
  }

  initializeMessaging() {
    this.messaging = firebase.messaging();
    this.registerSelf();
    this.messaging.onTokenRefresh(() => this.registerSelf());
  }

  handleRegistration() {
    console.log('registered');
  }

  handleNotify() {
    console.log('notified');
  }
};

customElements.define('register-notify', RegisterNotify);