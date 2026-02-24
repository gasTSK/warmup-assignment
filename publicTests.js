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

const fs = require("fs");

let passed = 0;
let failed = 0;

function test(testName, actual, expected) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
        console.log(`  PASS: ${testName}`);
        passed++;
    } else {
        console.log(`  FAIL: ${testName}`);
        console.log(`    Expected: ${JSON.stringify(expected)}`);
        console.log(`    Actual:   ${JSON.stringify(actual)}`);
        failed++;
    }
}

// Helper: reset a test file from template
function resetFile(src, dest) {
    let data = fs.readFileSync(src, { encoding: 'utf8', flag: 'r' });
    fs.writeFileSync(dest, data, { encoding: 'utf8' });
}

console.log("============================================");
console.log("  PUBLIC TEST CASES - Delivery Driver Shift Tracker");
console.log("============================================\n");

// ==================== getShiftDuration ====================
console.log("--- getShiftDuration ---");
test("getShiftDuration('6:01:20 am', '4:13:40 pm')", getShiftDuration("6:01:20 am", "4:13:40 pm"), "10:12:20");
test("getShiftDuration('7:30:00 am', '8:42:50 am')", getShiftDuration("7:30:00 am", "8:42:50 am"), "1:12:50");
test("getShiftDuration('1:00:00 pm', '9:30:00 pm')", getShiftDuration("1:00:00 pm", "9:30:00 pm"), "8:30:00");
console.log();

// ==================== getIdleTime ====================
console.log("--- getIdleTime ---");
test("getIdleTime('6:00:00 am', '3:00:00 pm')", getIdleTime("6:00:00 am", "3:00:00 pm"), "2:00:00");
test("getIdleTime('8:00:00 am', '11:00:00 pm')", getIdleTime("8:00:00 am", "11:00:00 pm"), "1:00:00");
test("getIdleTime('6:00:00 am', '11:30:00 pm')", getIdleTime("6:00:00 am", "11:30:00 pm"), "3:30:00");
console.log();

// ==================== getActiveTime ====================
console.log("--- getActiveTime ---");
test("getActiveTime('6:40:20', '3:10:10')", getActiveTime("6:40:20", "3:10:10"), "3:30:10");
test("getActiveTime('8:42:59', '0:00:00')", getActiveTime("8:42:59", "0:00:00"), "8:42:59");
test("getActiveTime('5:00:10', '2:30:00')", getActiveTime("5:00:10", "2:30:00"), "2:30:10");
console.log();

// ==================== metQuota ====================
console.log("--- metQuota ---");
// During special period (Eid), quota is 6 hours
test("metQuota('2025-04-15', '6:50:00') [special period]", metQuota("2025-04-15", "6:50:00"), true);
// Normal day, quota is 8h24m
test("metQuota('2025-04-05', '7:42:59') [normal day]", metQuota("2025-04-05", "7:42:59"), false);
test("metQuota('2025-04-05', '9:00:00') [normal day]", metQuota("2025-04-05", "9:00:00"), true);
console.log();

// ==================== addShiftRecord ====================
console.log("--- addShiftRecord ---");
resetFile("./PublicTestFiles/shiftsPublic.txt", "./shifts.txt");
let shiftObj = {
    driverID: "D1001",
    driverName: "Ahmed Hassan",
    date: "2025-04-20",
    startTime: "6:32:26 am",
    endTime: "7:26:20 pm"
};
let addResult = addShiftRecord("./shifts.txt", shiftObj);
test("addShiftRecord new record returns object with 10 props", Object.keys(addResult).length, 10);
test("addShiftRecord new record driverID", addResult.driverID, "D1001");
test("addShiftRecord new record hasBonus default", addResult.hasBonus, false);
// Adding duplicate should return empty object
let addResult2 = addShiftRecord("./shifts.txt", shiftObj);
test("addShiftRecord duplicate returns {}", JSON.stringify(addResult2), "{}");
console.log();

// ==================== setBonus ====================
console.log("--- setBonus ---");
resetFile("./PublicTestFiles/shiftsPublic.txt", "./shifts.txt");
setBonus("./shifts.txt", "D1001", "2025-04-06", true);
let fileData = fs.readFileSync("./shifts.txt", { encoding: 'utf8' }).split("\n");
let targetLine = fileData.find(l => l.includes("D1001") && l.includes("2025-04-06"));
test("setBonus updates HasBonus to true", targetLine.trim().endsWith("true"), true);
console.log();

// ==================== countBonusPerMonth ====================
console.log("--- countBonusPerMonth ---");
resetFile("./PublicTestFiles/shiftsPublic.txt", "./shifts.txt");
test("countBonusPerMonth('D1001', '04')", countBonusPerMonth("./shifts.txt", "D1001", "04"), 1);
test("countBonusPerMonth('D1001', '4')", countBonusPerMonth("./shifts.txt", "D1001", "4"), 1);
test("countBonusPerMonth non-existent ID", countBonusPerMonth("./shifts.txt", "D9999", "4"), -1);
console.log();

// ==================== getTotalActiveHoursPerMonth ====================
console.log("--- getTotalActiveHoursPerMonth ---");
resetFile("./PublicTestFiles/shiftsPublic.txt", "./shifts.txt");
test("getTotalActiveHoursPerMonth('D1001', 4)", getTotalActiveHoursPerMonth("./shifts.txt", "D1001", 4), "33:30:00");
console.log();

// ==================== getRequiredHoursPerMonth ====================
console.log("--- getRequiredHoursPerMonth ---");
resetFile("./PublicTestFiles/shiftsPublic.txt", "./shifts.txt");
test("getRequiredHoursPerMonth('D1001', Apr, bonus=1)", getRequiredHoursPerMonth("./shifts.txt", "./PublicTestFiles/driverRatesPublic.txt", 1, "D1001", 4), "26:48:00");
resetFile("./PublicTestFiles/shiftsPublic.txt", "./shifts.txt");
test("getRequiredHoursPerMonth('D1003', Apr, bonus=0)", getRequiredHoursPerMonth("./shifts.txt", "./PublicTestFiles/driverRatesPublic.txt", 0, "D1003", 4), "16:48:00");
console.log();

// ==================== getNetPay ====================
console.log("--- getNetPay ---");
test("getNetPay D1001 with deduction", getNetPay("D1001", "146:20:00", "168:00:00", "./PublicTestFiles/driverRatesPublic.txt"), 29838);
test("getNetPay D1001 no deduction", getNetPay("D1001", "170:00:00", "168:00:00", "./PublicTestFiles/driverRatesPublic.txt"), 30000);
test("getNetPay D1001 within allowed", getNetPay("D1001", "150:00:00", "168:00:00", "./PublicTestFiles/driverRatesPublic.txt"), 30000);
console.log();

// ==================== Summary ====================
console.log("============================================");
console.log(`  Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log("============================================");
