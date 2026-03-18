import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyBOR0KhGUqp1CA8E6RsX5OQ-dsnovRiwd8");

async function testModels() {
    const modelsToTest = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro",
        "gemini-1.0-pro",
        "gemini-pro"
    ];

    for (const modelName of modelsToTest) {
        console.log(`\nTesting model: ${modelName}`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say hello");
            console.log(`✅ Success! Response: ${result.response.text()}`);
            break; // Stop on first success
        } catch (error) {
            console.error(`❌ Failed: ${error.message}`);
        }
    }
}

testModels();
