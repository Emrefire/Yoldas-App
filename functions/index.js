const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {GoogleGenerativeAI} = require("@google/generative-ai");

exports.askYoldas = onCall({secrets: ["GEMINI_API_KEY"]}, async (request) => {
  const userPrompt = request.data.prompt;

  if (!userPrompt) {
    throw new HttpsError("invalid-argument", "Mesaj yazman lazım.");
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({model: "gemini-2.0-flash"});

    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    const text = response.text();

    return {
      answer: text,
    };
  } catch (error) {
    console.error("Gemini Hatası Detayı:", error);
    throw new HttpsError("internal", "Yoldas şu an tefekkürde.");
  }
});

