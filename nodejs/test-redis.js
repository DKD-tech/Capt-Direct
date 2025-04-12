const client = require("./src/redis/index");

async function testRedis() {
  try {
    await client.set("test_key", "Hello Redis");
    const value = await client.get("test_key");
    console.log("Valeur de test dans Redis :", value);
    client.quit();
  } catch (err) {
    console.error("Erreur lors du test Redis :", err);
  }
}

testRedis();
