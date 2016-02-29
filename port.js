function SerialPort(path, options) {
  this.path = path;
  this.options = options;
  this.connectionId = -1;
  this.state = SerialPort.STATE.DISCONNECTED;
  this.notifier = new EventNotifier();
}

SerialPort.prototype.setState = function(newState) {
  this.state = newState;
  this.notifier.notifyEvent(SerialPort.EVENT.STATE_CHANGE, newState);
};

SerialPort.prototype.getState = function() {
  return this.state;
};

SerialPort.prototype.connect = function () {
  this.setState(SerialPort.STATE.CONNECTING);
  chrome.serial.connect(this.path, this.options, this.onConnect.bind(this));
};

SerialPort.prototype.onConnect = function (info) {
  if (info) {
    this.connectionId = info.connectionId;
  }
  if (!this.isConnected()) {
    this.setState(SerialPort.STATE.CONNECTION_FAILED);
    return;
  }
  this.setState(SerialPort.STATE.CONNECTED);
  chrome.serial.onReceive.addListener(this.onReceive.bind(this));
};

SerialPort.prototype.onReceive = function (info) {
  if (info && this.connectionId == info.connectionId) {
    var buffer = new Uint8Array(info.data);
    this.notifier.notifyEvent(SerialPort.EVENT.DATA_AVAILABLE, buffer);
  }
};

SerialPort.prototype.write = function (buffer, onDone) {
  if (buffer instanceof ArrayBuffer == false) {
    buffer = bufferToArrayBuffer(buffer);
  }
  if (typeof onDone !== 'function') {
    onDone = function() {
    };
  }
  chrome.serial.send(this.connectionId, buffer, onDone);
};

SerialPort.prototype.writeString = function (string, onDone) {
  this.write(stringToArrayBuffer(string), onDone);
};

SerialPort.prototype.disconnect = function () {
  if (this.isConnected()) {
    chrome.serial.disconnect(this.connectionId, this.onDisconnect.bind(this));
  }
};

SerialPort.prototype.onDisconnect = function () {
  this.connectionId = -1;
  this.setState(SerialPort.STATE.DISCONNECTED);
};

SerialPort.prototype.addEventListener = function(event, notification) {
  this.notifier.addEventListener(event, notification);
};

SerialPort.prototype.isConnected = function() {
  return this.connectionId != -1;
};

SerialPort.prototype.stateMessage = function() {
  return SerialPort.STATE_MESSAGE[this.getState()];
};

SerialPort.STATE = {
  CONNECTING: 0x01,
  CONNECTED: 0x02,
  DISCONNECTED: 0x04,
  CONNECTION_FAILED: 0x08
};

SerialPort.EVENT = {
  STATE_CHANGE: 0x01,
  DATA_AVAILABLE: 0x02
};

SerialPort.STATE_MESSAGE = [];
SerialPort.STATE_MESSAGE[SerialPort.STATE.CONNECTING] = "Connecting";
SerialPort.STATE_MESSAGE[SerialPort.STATE.CONNECTED] = "Connected";
SerialPort.STATE_MESSAGE[SerialPort.STATE.DISCONNECTED] = "Disconnected";
SerialPort.STATE_MESSAGE[SerialPort.STATE.CONNECTION_FAILED] = "Connection failed";
