# homebridge-roomba

homebridge-plugin for Roomba980  
[![homebridge-plugin for Roomba980](http://img.youtube.com/vi/BbHbArJ95g0/0.jpg)](https://www.youtube.com/watch?v=BbHbArJ95g0)


# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-roomba
3. Update your configuration file. See sample-config.json in this repository for a sample. 

# Configuration
Configuration sample:

```
"accessories": [
    "accessories": [
    {
        "accessory": "Roomba",
        "name": "Roomba",
        "blid":"0123456789abcdef",
        "robotpwd":"abcdefghijklmnop"
    }
]
```


# How do You find the BLID and robotpwd?

1. [install Charles](https://www.charlesproxy.com/)
2. Start the Charles.
3. [Set the packet capture of the iPhone.](http://qiita.com/HIkaruSato/items/1f66c1a189bf9c19f838)
4. Start the iRobot app.
5. Check the contents of communication 「https://irobot.axeda.com」.
6. Check the request parameters of the top of the communication.
```
example:
blid=0123456789abcdef&robotpwd=abcdefghijklmnop&method=getStatus
```
