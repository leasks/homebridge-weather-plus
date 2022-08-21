/*jshint esversion: 6,node: true,-W041: false */
"use strict";

const getWindDirection = function (degree) {
    if (typeof degree !== 'number' || isNaN(degree)) {
        return 'Unknown';
    }
    let cat = Math.round(degree % 360 / 22.5);
    let dir;

    // TODO multi-language
    switch (cat) {
        case 0:
            dir = 'N';
            break;
        case 1:
            dir = 'NNE';
            break;
        case 2:
            dir = 'NE';
            break;
        case 3:
            dir = 'ENE';
            break;
        case 4:
            dir = 'E';
            break;
        case 5:
            dir = 'ESE';
            break;
        case 6:
            dir = 'SE';
            break;
        case 7:
            dir = 'SSE';
            break;
        case 8:
            dir = 'S';
            break;
        case 9:
            dir = 'SSW';
            break;
        case 10:
            dir = 'SW';
            break;
        case 11:
            dir = 'WSW';
            break;
        case 12:
            dir = 'W';
            break;
        case 13:
            dir = 'WNW';
            break;
        case 14:
            dir = 'NW';
            break;
        case 15:
            dir = 'NNW';
            break;
        case 16:
            dir = 'N';
            break;
        default:
            dir = 'Variable';
    }
    return dir;
};

const getRainAccumulated = function (array, parameter) {
    let sum = 0;
    for (let i = 0; i < array.length; i++) {
        sum += array[i][parameter];
    }
    return sum;
};

const cToF = function (c) {
    return (c * 9 / 5) + 32;
};

const kmToMiles = function (km) {
    return km * 0.62137
};

const cmToIn = function (cm) {
    return cm * 0.3937008
};

const mbToIn = function (mb) {
    return mb * 0.029529980;
};

module.exports = {
    getWindDirection,
    getRainAccumulated,
    cToF,
    kmToMiles,
    cmToIn,
    mbToIn
}
