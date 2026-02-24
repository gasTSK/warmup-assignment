const {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
} = require("./main.js");

// don't remove the above code
// You need the above code to use your implemented functions from main.js
// You can test here your implemented functions from main.js

// ===================== Test getShiftDuration =====================
let firstIn = "6:01:20 am";
let lastOut = "4:13:40 pm";
let duration = getShiftDuration(firstIn, lastOut);
console.log('shiftDuration Test case 1', duration);

firstIn = "7:30:30 am";
lastOut = "12:26:20 am";
duration = getShiftDuration(firstIn, lastOut);
console.log('shiftDuration Test case 2', duration);

firstIn = "1:30:30 pm";
lastOut = "7:26:20 pm";
duration = getShiftDuration(firstIn, lastOut);
console.log('shiftDuration Test case 3', duration);

// ===================== Test getIdleTime =====================
firstIn = "6:01:20 am";
lastOut = "4:13:40 pm";
let idleTime = getIdleTime(firstIn, lastOut);
console.log('idleTime Test case 1', idleTime);

firstIn = "8:30:30 am";
lastOut = "9:26:20 pm";
idleTime = getIdleTime(firstIn, lastOut);
console.log('idleTime Test case 2', idleTime);

firstIn = "7:00:00 am";
lastOut = "11:30:00 pm";
idleTime = getIdleTime(firstIn, lastOut);
console.log('idleTime Test case 3', idleTime);

// ===================== Test getActiveTime =====================
let shiftDur = "6:01:10";
let wastedHrs = "1:13:08";
let activeTime = getActiveTime(shiftDur, wastedHrs);
console.log('activeTime Test case 1', activeTime);

shiftDur = "8:01:20";
wastedHrs = "0:00:00";
activeTime = getActiveTime(shiftDur, wastedHrs);
console.log('activeTime Test case 2', activeTime);

// ===================== Test metQuota =====================
// Note: 2025-04-15 is within special period (Eid), quota = 6 hours
let date = "2025-04-15";
let activeHrs = "6:50:00";
let fullTime = metQuota(date, activeHrs);
console.log('metQuota Test case 1', fullTime);

// Note: 2025-04-05 is normal day, quota = 8h24m
date = "2025-04-05";
activeHrs = "4:50:00";
fullTime = metQuota(date, activeHrs);
console.log('metQuota Test case 2', fullTime);

// ===================== Test addShiftRecord =====================
let shiftObj = {
    driverID: "D1001",
    driverName: "Ahmed Hassan",
    date: "2025-04-20",
    startTime: '6:32:26 am',
    endTime: '7:26:20 pm'
};

let textFile = "./shifts.txt";
let resultObj = addShiftRecord(textFile, shiftObj);
console.log("addShiftRecord output case 1", resultObj);

resultObj = addShiftRecord(textFile, shiftObj);
console.log("addShiftRecord output case 2", resultObj);

// ===================== Test setBonus =====================
textFile = "./shifts.txt";
let staffID = "D1001";
let newValue = true;
date = "2025-04-06";
setBonus(textFile, staffID, date, newValue);
console.log("setBonus executed for D1001 on 2025-04-06");

// ===================== Test countBonusPerMonth =====================
textFile = "./shifts.txt";
staffID = "D1001";
let month = "04";
let result = countBonusPerMonth(textFile, staffID, month);
console.log("total bonuses are", result);

month = "4";
result = countBonusPerMonth(textFile, staffID, month);
console.log("total bonuses are", result);

// ===================== Test getTotalActiveHoursPerMonth =====================
textFile = "./shifts.txt";
staffID = "D1001";
month = 4;
result = getTotalActiveHoursPerMonth(textFile, staffID, month);
console.log("total active hours are", result);

// ===================== Test getRequiredHoursPerMonth =====================
textFile = "./shifts.txt";
let rateFile = "./driverRates.txt";
let bonusCount = 1;
staffID = "D1001";
month = 4;
result = getRequiredHoursPerMonth(textFile, rateFile, bonusCount, staffID, month);
console.log("total required hours are", result);

// ===================== Test getNetPay =====================
rateFile = "./driverRates.txt";
staffID = "D1001";
let actualHours = "146:20:00";
let requiredHours = "168:00:00";
result = getNetPay(staffID, actualHours, requiredHours, rateFile);
console.log("net pay is", result);
