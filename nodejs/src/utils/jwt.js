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

  sign: (user) => {
    return new Promise((resolve, reject) => {
      try {
        const payload = {
          id: user.id, // Assurez-vous que `user` a un attribut `id`
          username: user.username, // Ajoutez d'autres informations si nécessaire
        };
        resolve(jsonwebtoken.sign(payload, JWT_SECRET, { expiresIn: "7d" }));
      } catch (error) {
        reject(error);
      }
    });
  },
};

module.exports = jwt;
