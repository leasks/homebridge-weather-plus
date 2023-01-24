/*jshint esversion: 6,node: true,-W041: false */
"use strict";
const request = require('request'),
    converter = require('../util/converter'),
    moment = require('moment-timezone'),
    debug = require('debug')('homebridge-weather-plus');

//https://docs.google.com/document/d/1KGb8bTVYRsNgljnNH67AMhckY8AQT2FVwZ9urj8SWBs/

class WundergroundAPI {
    constructor(apiKey, location, log, pwsService, locationGeo, conditionDetail) {
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
        
        this.forecastCharacteristics = [
            'CloudCover',
            'Condition',
            'ConditionCategory',
            'ForecastDay',
            'Humidity',
            'RainBool',
            'RainDay',
            'SnowBool',
            'SunriseTime',
            'SunsetTime',
            'TemperatureMax',
            'TemperatureMin',
            'UVIndex',
            'WindDirection',
            'WindSpeed',
            'RainChance'
        ];

        this.log = log;

        this.location = location;
        this.apiKey = apiKey;
        this.pwsService = pwsService;
        this.locationGeo = locationGeo;
        this.forecastDays = 5;
        this.conditionDetail = conditionDetail;

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
                    that.log.error("Error parsing weather report");
                    that.log.error("Error Message: " + e);
                    callback(e);
                }
            } else {
                that.log.error("Error retrieving weather report");
                that.log.error("Error Message: " + err);
                callback(err);
            }
        }.bind(this));
        
        const queryForecastUri = "https://api.weather.com/v3/wx/forecast/daily/5day?geocode=" + this.locationGeo + "&format=json&units=" + this.units + "&language=en-US&apiKey=" + this.apiKey;
        request(encodeURI(queryForecastUri), function (err, response, body) {
            if (!err) {
                // Current weather report
                try {
                    const jsonObj = JSON.parse(body);
                    if (jsonObj.errors === undefined || jsonObj.errors.length === 0) {
                        debug(JSON.stringify(jsonObj, null, 2));
                        let forecasts = [];
                        for (let index = 0; index < jsonObj.dayOfWeek.length; index++ ) {
                            forecasts[index] = that.parseForecasts(jsonObj, index);
                        }
                        weather.forecasts = forecasts;
                        callback(null, weather);
                    } else {
                        throw new Error(JSON.stringify(jsonObj.errors, null, 2));
                    }
                } catch (e) {
                    that.log.error("Error parsing weather forecast");
                    that.log.error("Error Message: " + e);
                    callback(e);
                }
            } else {
                that.log.error("Error retrieving weather forecast");
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

    parseForecasts(json, day) {
        let that = this;
        let report = {};
        
        try {
            let values = json.daypart[0];
            report.CloudCover = values.cloudCover[day * 2] === null ? (values.cloudCover[day * 2 + 1] === null ? 0 : values.cloudCover[day * 2 + 1]) : values.cloudCover[day * 2];
            report.Condition = json.narrative[day].substring(0, 64);
            let iconCode = values.iconCode[day * 2] === null ? values.iconCode[day * 2 + 1] : values.iconCode[day * 2];
            report.ConditionCategory = this.getConditionCategory(iconCode, this.conditionDetail);
            report.Humidity = values.relativeHumidity[day * 2] === null ? (values.relativeHumidity[day * 2 + 1] === null ? 0 : values.relativeHumidity[day * 2 + 1]) : values.relativeHumidity[day * 2];
            report.UVIndex = values.uvIndex[day * 2] === null ? (values.uvIndex[day * 2 + 1] === null ? 0 : values.uvIndex[day * 2 + 1]) : values.uvIndex[day * 2];
            report.TemperatureMin = isNaN(json.calendarDayTemperatureMin[day]) ? 0 : json.calendarDayTemperatureMin[day];
            report.TemperatureMax = isNaN(json.calendarDayTemperatureMax[day]) ? 0 : json.calendarDayTemperatureMax[day];

            let detailedCondition = this.getConditionCategory(iconCode, true);
            report.RainBool = [5, 6, 9].includes(detailedCondition);
            report.SnowBool = [7, 8].includes(detailedCondition);
            
            let precipTot = isNaN(json.qpf[day]) ? 0 : json.qpf[day];
            precipTot += isNaN(json.qpfSnow[day]) ? 0 : json.qpfSnow[day];
            report.RainDay = precipTot;
            report.RainChance = values.precipChance[day * 2] === null ? (values.precipChance[day * 2 + 1] === null ? 0 : values.precipChance[day * 2 + 1]) : values.precipChance[day * 2];
            report.ForecastDay = json.dayOfWeek[day];
            report.SunriseTime = moment.utc(json.sunriseTimeLocal[day]).format("yyyy-MM-DD+HH:mm:ss");
            report.SunsetTime = moment.utc(json.sunsetTimeLocal[day]).format("yyyy-MM-DD+HH:mm:ss");
            report.WindDirection = values.windDirectionCardinal[day * 2] === null ? values.windDirectionCardinal[day * 2 + 1] : values.windDirectionCardinal[day * 2];
            report.WindBearing = values.windDirection[day * 2] === null ? values.windDirection[day * 2 + 1] : values.windDirection[day * 2];
            report.WindSpeed = values.windSpeed[day * 2] === null ? (values.windSpeed[day * 2 + 1] === null ? 0 : values.windSpeed[day * 2 + 1]) : values.windSpeed[day * 2];
        }  catch (error) {
            that.log.error("Error parsing weather forecast for Weather Underground");
            that.log.error("Error Message: " + error);
        }
        return report;
    }
    
    getConditionCategory(code, detail = false) {
        if ([0, 1, 2, 3].includes(code)) {
            // Severe weather
            return detail ? 9 : 2;
        } else if ([13, 14, 15, 16, 41, 42, 43, 46].includes(code)) {
            // Snow
            return detail ? 8 : 3;
        } else if (code === 17) {
            // Hail
            return detail ? 7 : 3;
        } else if ([4, 5, 6, 7, 8, 10, 11, 35, 39, 40, 45, 47].includes(code)) {
            // Rain
            return detail ? 6 : 2;
        } else if ([8, 9, 38].includes(code)) {
            // Drizzle
            return detail ? 5 : 2;
        } else if ([20, 21, 22].includes(code)) {
            // Fog
            return detail ? 4 : 1;
        } else if ([26, 27, 28].includes(code)) {
            // Overcast
            return detail ? 3 : 1;
        } else if ([29, 30].includes(code)) {
            // Broken Clouds
            return detail ? 2 : 1;
        } else if ([33, 34].includes(code)) {
            // Few Clouds
            return detail ? 1 : 0;
        } else if ([31, 32, 36].includes(code)) {
            // Clear
            return 0;
        } else {
            this.log.warn("Unknown OpenWeatherMap category " + code);
            return 0;
        }
    };

}

module.exports = {
    WundergroundAPI: WundergroundAPI
};
