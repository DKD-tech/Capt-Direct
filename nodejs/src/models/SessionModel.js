const Model = require("./Model");

class SessionModel extends Model {
  constructor() {
    super("sessions");
  }

  // méthodes spécifiques au modèle Session si nécessaire
}

module.exports = new SessionModel();
