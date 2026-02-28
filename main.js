const fs = require("fs");

// global helper functions and variables

const SHIFT_FILE_HEADER = "DriverID,DriverName,Date,StartTime,EndTime,ShiftDuration,IdleTime,ActiveTime,MetQuota,HasBonus";
const TWELVE_HOUR_TIME_PATTERN = /^(0?[1-9]|1[0-2]):([0-5]\d):([0-5]\d)\s(am|pm)$/i;

function isNonEmptyString(value) {
    return typeof value === "string" && value.trim() !== "";
}

function parseValidDate(dateStr) {
    if (!isNonEmptyString(dateStr)) {
        return null;
    }

    const normalizedDate = dateStr.trim();
    const dateMatch = normalizedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) {
        return null;
    }

    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);

    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        return null;
    }

    if (month < 1 || month > 12) {
        return null;
    }

    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day < 1 || day > daysInMonth[month - 1]) {
        return null;
    }

    return {
        year,
        month,
        day,
        normalizedDate
    };
}

function parseDurationToSeconds(durationStr) {
    if (!isNonEmptyString(durationStr)) {
        return null;
    }

    const match = durationStr.trim().match(/^(\d+):(\d{2}):(\d{2})$/);
    if (!match) {
        return null;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);

    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || !Number.isInteger(seconds)) {
        return null;
    }

    if (hours < 0 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
        return null;
    }

    return hours * 3600 + minutes * 60 + seconds;
}

function isValid12HourTime(timeStr) {
    return isNonEmptyString(timeStr) && TWELVE_HOUR_TIME_PATTERN.test(timeStr.trim());
}

function toSeconds(timeStr) {
    const [timePart, period] = timeStr.trim().toLowerCase().split(" ");
    let [hours, minutes, seconds] = timePart.split(":").map(Number);

    if (period == "am" && hours == 12) {
        hours = 0;
    }
    if (period == "pm" && hours != 12) {
        hours += 12;
    }

    return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    // check if endTime starts the day before startTime, if so, add 24 hours to endTime

    let startSeconds = toSeconds(startTime);
    let endSeconds = toSeconds(endTime);

    if (endSeconds < startSeconds) {
        endSeconds += 24 * 3600;
    }

    return formatDuration(endSeconds - startSeconds);
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    // endTime day check
    let startSeconds = toSeconds(startTime);
    let endSeconds = toSeconds(endTime);

    if (endSeconds < startSeconds) {
        endSeconds += 24 * 3600;
    }

    const deliveryStart = 8 * 3600;
    const deliveryEnd = 22 * 3600; 

    let idleSeconds = 0;

    // use min and max to handle cases where shift starts before deliveryStart or ends after deliveryEnd

    if (startSeconds < deliveryStart) {
        idleSeconds += Math.min(endSeconds, deliveryStart) - startSeconds;
    }

    if (endSeconds > deliveryEnd) {
        idleSeconds += endSeconds - Math.max(startSeconds, deliveryEnd);
    }

    return formatDuration(idleSeconds);
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    function durationToSeconds(durationStr) { // separate function due to different input format
        const [hours, minutes, seconds] = durationStr.trim().split(":").map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }

    const shiftSeconds = durationToSeconds(shiftDuration);
    const idleSeconds = durationToSeconds(idleTime);
    return formatDuration(shiftSeconds - idleSeconds);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    const parsedDate = parseValidDate(date);
    if (!parsedDate) {
        return false;
    }

    const activeSeconds = parseDurationToSeconds(activeTime);
    if (activeSeconds === null) {
        return false;
    }

    const isEidPeriod = parsedDate.year === 2025 && parsedDate.month === 4 && parsedDate.day >= 10 && parsedDate.day <= 30;
    const quotaSeconds = isEidPeriod ? 6 * 3600 : 8 * 3600 + 24 * 60;

    return activeSeconds >= quotaSeconds;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {

    // return empty object if textFile is not a non-empty string or
    // if shiftObj is not a valid object with required properties
    if (!isNonEmptyString(textFile)) {
        return {};
    }

    if (typeof shiftObj !== "object" || shiftObj === null || Array.isArray(shiftObj)) {
        return {};
    }

    const requiredKeys = ["driverID", "driverName", "date", "startTime", "endTime"];
    for (let i = 0; i < requiredKeys.length; i++) {
        const key = requiredKeys[i];
        if (!(key in shiftObj) || !isNonEmptyString(shiftObj[key])) {
            return {};
        }
    }

    const driverID = shiftObj.driverID.trim();
    const driverName = shiftObj.driverName.trim();
    const date = shiftObj.date.trim();
    const startTime = shiftObj.startTime.trim();
    const endTime = shiftObj.endTime.trim();

    const parsedDate = parseValidDate(date);
    if (!parsedDate) {
        return {};
    }

    // 12-hour format checking via helper (matches hh:mm:ss am/pm with optional leading zero for hours)
    if (!isValid12HourTime(startTime) || !isValid12HourTime(endTime)) {
        return {};
    }

    let fileContent;
    try {
        fileContent = fs.readFileSync(textFile, { encoding: "utf8", flag: "r" });
    } catch (error) {
        return {};
    }

    const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== "");
    const defaultHeader = SHIFT_FILE_HEADER;
    const header = lines.length > 0 ? lines[0] : defaultHeader;
    const records = lines.length > 1 ? lines.slice(1) : [];

    for (let i = 0; i < records.length; i++) {
        const columns = records[i].split(",");
        const existingDriverID = (columns[0] || "").trim();
        const existingDate = (columns[2] || "").trim();
        if (existingDriverID === driverID && existingDate === date) {
            return {};
        }
    }

    // compute and build new record line
    const shiftDuration = getShiftDuration(startTime, endTime);
    const idleTime = getIdleTime(startTime, endTime);
    const activeTime = getActiveTime(shiftDuration, idleTime);
    const metQuotaValue = metQuota(date, activeTime);
    const hasBonus = false;

    const newRecordLine = [
        driverID,
        driverName,
        date,
        startTime,
        endTime,
        shiftDuration,
        idleTime,
        activeTime,
        metQuotaValue,
        hasBonus
    ].join(",");

    // search for last occurrence of driverID and insert new record after it
    // if not found, append to end of file (after header if exists)
    let lastDriverIndex = -1;
    for (let i = 0; i < records.length; i++) {
        const columns = records[i].split(",");
        if ((columns[0] || "").trim() === driverID) {
            lastDriverIndex = i;
        }
    }

    if (lastDriverIndex === -1) {
        records.push(newRecordLine);
    } else {
        records.splice(lastDriverIndex + 1, 0, newRecordLine);
    }

    // construct updated file content and write back to file
    const updatedContent = [header].concat(records).join("\n");
    fs.writeFileSync(textFile, updatedContent, { encoding: "utf8" });

    return {
        driverID,
        driverName,
        date,
        startTime,
        endTime,
        shiftDuration,
        idleTime,
        activeTime,
        metQuota: metQuotaValue,
        hasBonus
    };
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    // TODO: Implement this function
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    // TODO: Implement this function
}

module.exports = {
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
};
