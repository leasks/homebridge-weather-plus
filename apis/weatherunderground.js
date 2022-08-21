/*jshint esversion: 6,node: true,-W041: false */
"use strict";
const request = require('request'),
    converter = require('../util/converter'),
    moment = require('moment-timezone'),
    debug = require('debug')('homebridge-weather-plus');

//https://docs.google.com/document/d/1KGb8bTVYRsNgljnNH67AMhckY8AQT2FVwZ9urj8SWBs/

class WundergroundAPI {
    constructor(apiKey, location, log, pwsService) {
        this.attribution = 'Powered by Weather Underground';
        this.reportCharacteristics = [
            'ObservationStation',
            'ObservationTime',
            'WindDirection',
            'Humidity',
            'SolarRadiation',
            'UVIndex',
            'Temperature',
            'DewPoint',
            'AirPressure',
            'WindSpeed',
            'WindSpeedMax',
            'RainDay'
        ];

        this.log = log;

        this.location = location;
        this.apiKey = apiKey;
        this.pwsService = pwsService;

        // Get observation values only in si 's' for now.
        this.units = 's'; //m for metrics. e for english
    }

    update(forecastDays, callback) {
        debug("Updating weather with weather underground");
        let weather = {};
        let that = this;

        const queryUri = "https://api.weather.com/v2/pws/observations/current?apiKey=" + this.apiKey + "&stationId=" + this.location + "&format=json&units=" + this.units + '&numericPrecision=decimal';
        request(encodeURI(queryUri), function (err, response, body) {
            if (!err) {
                // Current weather report
                try {
                    const jsonObj = JSON.parse(body);
                    if (jsonObj.errors === undefined || jsonObj.errors.length === 0) {
                        debug(JSON.stringify(jsonObj, null, 2));
                        weather.report = that.parseReport(jsonObj);
                        that.pwsService.notify(weather)
                        callback(null, weather);
                    } else {
                        throw new Error(JSON.stringify(jsonObj.errors, null, 2));
                    }
                } catch (e) {
                    that.log.error("Error retrieving weather report and forecast");
                    that.log.error("Error Message: " + e);
                    callback(e);
                }
            } else {
                that.log.error("Error retrieving weather report and forecast");
                that.log.error("Error Message: " + err);
                callback(err);
            }
        }.bind(this));
    }

    parseReport(json) {
        let that = this;
        let report = {};

        try {
            let observation = json.observations[0];
            let values;
            debug("Units: " + this.units);

            // Get values depending on chosen unit in request
            if (this.units === 's') {
                values = observation.metric_si;
            } else if (this.units === 'm') {
                values = observation.metric;
            } else if (this.units === 'e') {
                values = observation.imperial;
            } else { // 'h'
                values = observation.uk_hybrid;
            }

            report.ObservationStation = observation.stationID + " : " + observation.neighborhood;
            report.ObservationTime = moment(Date.parse(observation.obsTimeUtc)).format('HH:mm:ss');
            report.ObservationTimeUTC = moment.utc(observation.obsTimeUtc).format("yyyy-MM-DD+HH:mm:ss")
            report.WindDirection = converter.getWindDirection(isNaN(parseInt(observation.winddir)) ? 0 : parseInt(observation.winddir));
            report.WindBearing = observation.winddir;
            report.Humidity = isNaN(observation.humidity) ? 0 : observation.humidity;
            report.SolarRadiation = isNaN(observation.solarRadiation) ? 0 : observation.solarRadiation;
            report.UVIndex = isNaN(observation.uv) ? 0 : observation.uv;
            report.Temperature = isNaN(values.temp) ? 0 : values.temp;
            report.DewPoint = isNaN(values.dewpt) ? 0 : values.dewpt;
            report.AirPressure = isNaN(values.pressure) ? 0 : values.pressure;
            report.WindSpeed = isNaN(values.windSpeed) ? 0 : values.windSpeed;
            report.WindSpeedMax = isNaN(values.windGust) ? 0 : values.windGust;
            report.RainDay = isNaN(values.precipTotal) ? 0 : values.precipTotal;
            report.Precipitation = values.precipRate;
            report.PrecipitationTotal = values.precipTotal;

            report.WundergroundData = observation;
        } catch (error) {
            that.log.error("Error parsing weather report for Weather Underground");
            that.log.error("Error Message: " + error);
        }
        return report;
    }

    parseForecasts(forecastObjs, timezone) {
        /* NO FORECAST DATA FROM API */
        return [];
    }
}

module.exports = {
    WundergroundAPI: WundergroundAPI
};
