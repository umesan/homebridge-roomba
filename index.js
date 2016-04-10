var Service, Characteristic;
var request = require('request');

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-roomba", "Roomba", RoombaAccessory);
}


function RoombaAccessory(log, config) {
    this.log = log;

    // url info
    this.blid = config["blid"];
    this.robotpwd = config["robotpwd"];
    this.irobotapi = 'https://irobot.axeda.com/services/v1/rest/Scripto/execute/AspenApiRequest';
    this.name = config["name"];
}

RoombaAccessory.prototype = {

    httpRequest: function (type,callback) {
        request({
            url: this.irobotapi,
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            json:true,
            form: {
                'blid':this.blid,
                'robotpwd':this.robotpwd,
                'method':'multipleFieldSet',
                'value':'{"remoteCommand":"'+type+'"}'
            }
        },
        function (error, response, body) {
            callback(error, response, body)
        })
    },

    setPowerState: function(powerOn, callback) {
        if (powerOn) {
            this.log("Roomba Start!");
            this.httpRequest('start',function(error, response, responseBody) {
                if (error) {
                    this.log('Roomba Failed: %s', error.message);
                    this.log(response);
                    callback(error);
                } else {
                    this.log('Roomba is Ruuuuuuuuuuning!');
                    callback();
                }
            }.bind(this));
        } else {
            this.log("Roomba Pause & Dock!");
            this.httpRequest('pause',function(error, response, responseBody) {
                if (error) {
                    this.log('Roomba Failed: %s', error.message);
                    this.log(response);
                    callback(error);
                } else {
                    this.log('Roomba is Pause!');

                    var checkStatus = function(time){
                        setTimeout(
                            function() {
                                this.log('Roomba Checking the Status!');
                                request({
                                    url: this.irobotapi,
                                    method: 'POST',
                                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                                    json:true,
                                    form: {
                                        'blid':this.blid,
                                        'robotpwd':this.robotpwd,
                                        'method':'getStatus'
                                    }
                                },
                                function (error, response, body) {
                                    this.log('Roomba Get Status!');
                                    var status = JSON.parse(body.robot_status);
                                    switch (status.phase){
                                        case "stop":
                                            this.httpRequest('dock',function(error, response, responseBody) {
                                                if (error) {
                                                    this.log('Roomba Failed: %s', error.message);
                                                    this.log(response);
                                                    callback(error);
                                                } else {
                                                    this.log('Roomba Back Home! Goodbye!');
                                                    callback();
                                                }
                                            }.bind(this));
                                            break;
                                        case "run":
                                            this.log('Roomba is still Running... Wait a 3sec.');
                                            checkStatus(3000);
                                            break;
                                        default:
                                            this.log('Roomba is not Running...You Please Help.');
                                            callback();
                                            break;
                                    }
                                }.bind(this));

                            }.bind(this),time
                        );
                    }.bind(this);
                    checkStatus(3000);

                }
            }.bind(this));
        }
    },


    identify: function (callback) {
        this.log("Identify requested!");
        callback(); // success
    },

    getServices: function () {
        var informationService = new Service.AccessoryInformation();
        informationService
                .setCharacteristic(Characteristic.Manufacturer, "Roomba Manufacturer")
                .setCharacteristic(Characteristic.Model, "Roomba Model")
                .setCharacteristic(Characteristic.SerialNumber, "Roomba Serial Number");

        var switchService = new Service.Switch(this.name);
        switchService
                .getCharacteristic(Characteristic.On)
                .on('set', this.setPowerState.bind(this));

        return [switchService];
    }
};