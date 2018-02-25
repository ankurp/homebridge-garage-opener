const gpio = require('rpi-gpio');
gpio.setMode(gpio.MODE_BCM);

let Service, Characteristic, TargetDoorState, CurrentDoorState;
const OFF = true;
const ON = false;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  TargetDoorState = Characteristic.TargetDoorState;
  CurrentDoorState = Characteristic.CurrentDoorState;
  homebridge.registerAccessory('homebridge-garage-door-opener', 'Garage Door Opener', GarageDoorOpener);
};

class GarageDoorOpener {
  constructor(log, config) {
    this.log = log;
    this.name = config.name;
    this.openCloseTime = config.openCloseTime;
    this.doorRelayPin = config.doorRelayPin;

    gpio.setup(this.doorRelayPin, gpio.DIR_HIGH);
    this.currentDoorState = CurrentDoorState.CLOSED;
    this.targetDoorState = TargetDoorState.CLOSED;
  }

  identify(callback) {
    this.log('Identify requested!');
    callback(null);
  }

  openCloseGarage(callback) {
    gpio.write(this.doorRelayPin, ON);
    setTimeout(() => {
      gpio.write(this.doorRelayPin, OFF);
      callback();
    }, 500);
  }

  getServices() {
    const informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Encore Dev Labs')
      .setCharacteristic(Characteristic.Model, 'Pi Garage Door Opener')
      .setCharacteristic(Characteristic.SerialNumber, 'Raspberry Pi');

    this.service = new Service.GarageDoorOpener(this.name, this.name);
    this.service.setCharacteristic(TargetDoorState, TargetDoorState.CLOSED);
    this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.CLOSED);

    this.service.getCharacteristic(TargetDoorState)
      .on('get', (callback) => {
        callback(null, this.targetDoorState);
      })
      .on('set', (value, callback) => {
        this.targetDoorState = value;
        if (this.targetDoorState === TargetDoorState.OPEN) {
          if (this.currentDoorState === CurrentDoorState.CLOSED) {
            this.openCloseGarage(() =>
              this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.OPENING));
          } else if (this.currentDoorState === CurrentDoorState.OPENING) {
            // Do nothing
          } else if (this.currentDoorState === CurrentDoorState.CLOSING) {
            this.openCloseGarage(() =>
              this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.OPENING));
          } else if (this.currentDoorState === CurrentDoorState.OPEN) {
            // Do nothing
          }
        } else if (this.targetDoorState === TargetDoorState.CLOSED) {
          if (this.currentDoorState === CurrentDoorState.CLOSED) {
            // Do nothing
          } else if (this.currentDoorState === CurrentDoorState.OPENING) {
            this.openCloseGarage(() =>
              this.openCloseGarage(() =>
                this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.CLOSING)));
            // Do nothing
          } else if (this.currentDoorState === CurrentDoorState.CLOSING) {
            // Do nothing
          } else if (this.currentDoorState === CurrentDoorState.OPEN) {
            this.openCloseGarage(() =>
              this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.CLOSING));
          }
        }
        callback();
      });

    this.service.getCharacteristic(CurrentDoorState)
      .on('get', (callback) => {
        callback(null, this.currentDoorState);
      })
      .on('set', (value, callback) => {
        this.currentDoorState = value;
        this.log('current', this.currentDoorState);
        if (this.currentDoorState === CurrentDoorState.OPENING) {
          clearTimeout(this.openCloseTimer);
          this.doorOpenStartTime = new Date();
          const timeSinceDoorStartedClosing = new Date() - this.doorCloseStartTime;
          let stateChangeTimer = this.openCloseTime;
          if (timeSinceDoorStartedClosing < this.openCloseTime) {
            stateChangeTimer = timeSinceDoorStartedClosing;
          }
          this.openCloseTimer = setTimeout(() => {
            this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.OPEN);
          }, stateChangeTimer);
        } else if (this.currentDoorState === CurrentDoorState.CLOSING) {
          clearTimeout(this.openCloseTimer);
          this.doorCloseStartTime = new Date();
          const timeSinceDoorStartedOpening = new Date() - this.doorOpenStartTime;
          let stateChangeTimer = this.openCloseTime;
          if (timeSinceDoorStartedOpening < this.openCloseTime) {
            stateChangeTimer = timeSinceDoorStartedOpening;
          }
          this.openCloseTimer = setTimeout(() => {
            this.service.setCharacteristic(CurrentDoorState, CurrentDoorState.CLOSED);
          }, stateChangeTimer);
        }
        callback();
      });

    this.service
      .getCharacteristic(Characteristic.Name)
      .on('get', callback => {
        callback(null, this.name);
      });

    return [informationService, this.service];
  }
}
