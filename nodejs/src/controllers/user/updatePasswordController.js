const bcrypt = require("bcrypt");
const UserModel = require("../../models/UserModel");

async function updatePasswordController(req, res) {
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await UserModel.findOneById(req.user.id);

    // Vérifie si l'ancien mot de passe est correct
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // Hache le nouveau mot de passe et met à jour dans la base de données
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.updateOneById(req.user.id, { password: hashedPassword });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.sendStatus(500);
  }
}

module.exports = updatePasswordController;
