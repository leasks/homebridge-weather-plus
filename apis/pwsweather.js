/*jshint esversion: 6,node: true,-W041: false */
"use strict";
require('request');
require('../util/converter');
const
    moment = require('moment-timezone'),
    //debug = require('debug')('homebridge-weather-plus'),
    //axios_debug = require('axios-debug-log/enable'),
    axios = require('axios')
;

class PWSWeather {
    constructor(config, log) {
        this.apiKey = config.apiKey;
        this.stationID = config.stationID;
        this.log = log;
    }

    notify(weather) {
        //https://pwsupdate.pwsweather.com/api/v1/submitwx?ID=STATIONID&PASSWORD=APIkey&dateutc=2000-12-01+15:20:01&
        // winddir=225&windspeedmph=0.0&windgustmph=0.0&tempf=34.88&
        // rainin=0.06&dailyrainin=0.06&monthrainin=1.02&yearrainin=18.26&
        // baromin=29.49&dewptf=30.16&humidity=83&weather=OVC&solarradiation=183&UV=5.28&
        // softwaretype=Examplever1.1&action=updateraw

        //Too lazy to make it work with all services. Will work only with Wunderground.
        //The standardized model this plugin uses alters some data irrevocably (like wind direction)
        //Plus, the converstion between units is painful. Wish Report was a class that took in all the
        //observed values and spit out any unit we ask for. That would have been nice.
        //TODO For another day.
        let observation = weather.report.WundergroundData;
        let values = observation.imperial;
        let that = this;
        let queryUri = "https://pwsupdate.pwsweather.com/api/v1/submitwx?ID=" + this.stationID + "&PASSWORD=" + this.apiKey +
            "&softwaretype=Homebridge&action=updateraw" +
            "&dateutc=" + moment.utc(observation.obsTimeUtc).format("yyyy-MM-DD+HH:mm:ss") +
            "&winddir=" + observation.winddir +
            "&windspeedmph=" + values.windSpeed +
            "&windgustmph=" + values.windGust +
            "&tempf=" + values.temp +
            "&rainin=" + values.precipRate +
            "&daiyrainin=" + values.precipTotal +
            "&baromin=" + values.pressure +
            "&dewptf=" + values.dewpt +
            "&humidity=" + observation.humidity +
            "&solarradiation=" + observation.solarRadiation +
            "&UV=" + observation.uv
        ;

        that.log.info("Posting to PWS: " + queryUri)
        axios
            .get(encodeURI(queryUri))
            .then(res => {
                that.log.info("Data posted to PWS: " + res.status + " " + res.statusText)
            })
            .catch(error => {
                that.log.error("Failed to post to PWS: " + error)
            })
        ;
    }
}

module.exports = {
    PWSWeather: PWSWeather
};

//Basic Test
/*
new PWSWeather({apiKey: "APIKEY", stationID: "STATIONID"}, {info: console.log, debug: console.log, error: console.log}).notify({
    report: {
        WundergroundData: {
            obsTimeUtc: "2022-08-20T05:54:00",
            winddir: 235,
            humidity: 45,
            imperial: {
                pressure: "1009",
                dewpt: "12",
                precipRate: "0",
                precipTotal: "0",
                temp: "25",
                windGust: 25,
                windSpeed: 3,
            }
        }
    }
})
*/