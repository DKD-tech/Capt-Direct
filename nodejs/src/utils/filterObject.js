function filterObject(obj) {
  return Object.keys(obj).reduce((acc, key) => {
    const val = obj[key];
    if (val !== undefined && val !== null) {
      acc[key] = val;
    }
    return acc;
  }, {});
}

module.exports = filterObject;
