const Model = require("./Model");

class UserModel extends Model {
  constructor() {
    super("users");
  }

  async findByEmail(email) {
    return this.findOneBy({ email });
  }

  async findByUsername(username) {
    return this.findOneBy({ username });
  }
}

module.exports = new UserModel();
