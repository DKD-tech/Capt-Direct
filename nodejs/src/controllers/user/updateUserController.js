const UserModel = require("../../models/UserModel");

async function updateUserController(req, res) {
  const { username, email } = req.body;

  try {
    await UserModel.updateOneById(req.user.id, { username, email });
    res.status(200).json({ message: "User information updated successfully" });
  } catch (error) {
    console.error("Error updating user information:", error);
    res.sendStatus(500);
  }
}

module.exports = updateUserController;
