# Homebridge Pi Garage Door Opener

This is a [homebridge](https://github.com/nfarina/homebridge) plugin to make a Raspberry Pi connected with a Relay Board into a Garage Door Opener via the Home app on iOS using Homekit.

Just add the following config to your homebridge config file located at this path `~/.homebridge/config.json`.

```json
{
  "bridge": {
    "name": "Homebridge",
    "username": "CC:22:3D:E3:CE:30",
    "port": 51826,
    "pin": "031-45-154"
  },
  
  "description": "",

  "accessories": [
    {
      "accessory": "Garage Opener",
      "name": "Pi Garage Opener",
      "doorRelayPin": 4,
      "openCloseTime": 30000
    }
  ],

  "platforms": [
  ]
}
```
