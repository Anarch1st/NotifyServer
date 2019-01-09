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
  }

  ready() {
    super.ready();
    this.$.deviceList.generateRequest();

    this.$.submitReg.addEventListener('click', this.registerSelf.bind(this));
    this.$.submitNoti.addEventListener('click', this.postNotification.bind(this));
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
      _resources: {
        type: Object,
        value: Resources
      },
      deviceList: {
        type: Array,
        value: [],
        observer: '_deviceListUpdated'
      },
      messaging: {
        type: Object,
        observer: '_messagingInitialized'
      },
      token: {
        type: String,
        observer: '_tokenRefreshed'
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
      body: this.$.notifyBody.value
    }

    xhr.generateRequest();
  }

  _tokenRefreshed() {
    if (this.token) {
      this.registerSelf();
    }
  }

  _messagingInitialized() {

    if (!this.messaging) {
      return;
    }

    this.messaging.getToken().then(function(currentToken) {
      if (currentToken) {
        this.set('token', currentToken);
      } else {
        console.log('No Instance ID token available. Request permission to generate one.');
      }
    }.bind(this)).catch(function(err) {
      console.log('An error occurred while retrieving token. ', err);
    });

    this.messaging.onMessage(function(payload) {
      console.log('Message received. ', payload);
      // ...
    });

    this.messaging.onTokenRefresh(() => {
      this._messagingInitialized();
    });
  }

  registerSelf() {
    if (!this.token) {
      this._resources.setupFireBase(function() {
        this.set('messaging', firebase.messaging());
        console.log('messaging set');
      }.bind(this));
      return;
    }

    if (!this.$.regText.value) {
      return;
    }

    var xhr = this.$.register;
    xhr.body = {
      source: this.$.regText.value,
      token: this.token
    };

    xhr.generateRequest();
  }

  handleRegistration() {
    console.log('registered');
  }

  handleNotify() {
    console.log('notified');
  }
};

customElements.define('register-notify', RegisterNotify);