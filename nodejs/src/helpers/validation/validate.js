// validate.js
function validate(data, schema) {
  for (let key in schema) {
    if (schema.hasOwnProperty(key)) {
      const validator = schema[key];
      const value = data[key];
      if (!validator(value)) {
        return { isValid: false, invalidKey: key };
      }
    }
  }
  return { isValid: true };
}

module.exports = validate;
