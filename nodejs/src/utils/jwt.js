require("dotenv").config();
const jsonwebtoken = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET not found in environment variables!");
}

const jwt = {
  verify: (token) => {
    return new Promise((resolve, reject) => {
      jsonwebtoken.verify(token, JWT_SECRET, (error, decoded) => {
        if (error) {
          reject(error);
        } else {
          resolve(decoded);
        }
      });
    });
  },

  sign: (payload) => {
    return new Promise((resolve, reject) => {
      try {
        resolve(jsonwebtoken.sign(payload, JWT_SECRET));
      } catch (error) {
        reject(error);
      }
    });
  },
};

module.exports = jwt;
