const { convertSecondsToTime } = require("./timeUtils");

test("convertSecondsToTime correctly formats seconds to HH:MM:SS", () => {
  expect(convertSecondsToTime(0)).toBe("00:00:00");
  expect(convertSecondsToTime(60)).toBe("00:01:00");
  expect(convertSecondsToTime(3600)).toBe("01:00:00");
  expect(convertSecondsToTime(3661)).toBe("01:01:01");
});
