// ===== TEST LANGUAGETOOL ULTRA-SIMPLE =====
// Version minimaliste pour debug

const https = require("https");
const { URLSearchParams } = require("url");

async function testSimple(text = "bonour") {
  console.log(`🔧 Test simple: "${text}"`);

  // Paramètres minimaux selon la doc officielle
  const postData = new URLSearchParams({
    text: text,
    language: "fr",
  }).toString();

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.languagetool.org",
      port: 443,
      path: "/v2/check",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    console.log("📡 Envoi requête...");

    const req = https.request(options, (res) => {
      let data = "";

      console.log(`📥 Status: ${res.statusCode}`);
      console.log(`📥 Headers:`, res.headers);

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        console.log("📄 Réponse brute:", data);

        try {
          if (res.statusCode !== 200) {
            console.log(`❌ Erreur HTTP ${res.statusCode}`);
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            return;
          }

          const response = JSON.parse(data);
          console.log("✅ JSON parsé avec succès");
          console.log("🔍 Matches trouvés:", response.matches?.length || 0);

          if (response.matches?.length > 0) {
            response.matches.forEach((match, i) => {
              console.log(
                `  ${i + 1}. "${match.context?.text?.substring(
                  match.offset,
                  match.offset + match.length
                )}" → "${match.replacements?.[0]?.value}"`
              );
            });
          }

          resolve(response);
        } catch (error) {
          console.log("❌ Erreur parsing JSON:", error.message);
          reject(new Error(`Parse error: ${error.message}`));
        }
      });
    });

    req.on("error", (error) => {
      console.log("❌ Erreur requête:", error.message);
      reject(new Error(`Request error: ${error.message}`));
    });

    console.log("📤 Envoi données:", postData);
    req.write(postData);
    req.end();
  });
}

// Tests spécifiques à vos cas
async function testYourExamples() {
  const examples = [
    "bonour",
    "les renouvelles",
    "sa va bien",
    "Les enfant mange",
  ];

  for (const example of examples) {
    try {
      console.log("\n" + "=".repeat(40));
      await testSimple(example);
      console.log("✅ Test réussi");
    } catch (error) {
      console.log(`❌ Test échoué: ${error.message}`);
    }

    // Pause entre tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// Lancement
if (require.main === module) {
  console.log("🚀 Test LanguageTool ultra-simple\n");
  testYourExamples().catch(console.error);
}

module.exports = { testSimple, testYourExamples };
