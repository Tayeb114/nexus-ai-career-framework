"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

export const generateAIInsights = async (industry) => {
  const prompt = `
          Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
          {
            "salaryRanges": [
              { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
            ],
            "growthRate": number,
            "demandLevel": "High" | "Medium" | "Low",
            "topSkills": ["skill1", "skill2"],
            "marketOutlook": "Positive" | "Neutral" | "Negative",
            "keyTrends": ["trend1", "trend2"],
            "recommendedSkills": ["skill1", "skill2"]
          }
          
          IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
          Include at least 5 common roles for salary ranges.
          For each role, provide two entries: one for 'Local (Dhaka)' location and one for 'Global (Remote/US)' location.
          Growth rate should be a percentage.
          Include at least 5 skills and trends.
        `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Gemini API error (fallback to dummy data):", error);
    // Return dummy data if API key is banned/leaked
    return {
      salaryRanges: [
        { role: `Junior ${industry} Engineer`, min: 3000, max: 8000, median: 5000, location: "Local (Dhaka)" },
        { role: `Junior ${industry} Engineer`, min: 60000, max: 90000, median: 75000, location: "Global (Remote/US)" },
        { role: `${industry} Manager`, min: 8000, max: 15000, median: 12000, location: "Local (Dhaka)" },
        { role: `${industry} Manager`, min: 100000, max: 150000, median: 125000, location: "Global (Remote/US)" },
        { role: `Senior ${industry} Specialist`, min: 10000, max: 20000, median: 15000, location: "Local (Dhaka)" },
        { role: `Senior ${industry} Specialist`, min: 120000, max: 180000, median: 145000, location: "Global (Remote/US)" },
        { role: `Lead ${industry} Analyst`, min: 7000, max: 12000, median: 9000, location: "Local (Dhaka)" },
        { role: `Lead ${industry} Analyst`, min: 90000, max: 130000, median: 110000, location: "Global (Remote/US)" },
        { role: `Director of ${industry}`, min: 15000, max: 30000, median: 20000, location: "Local (Dhaka)" },
        { role: `Director of ${industry}`, min: 150000, max: 250000, median: 190000, location: "Global (Remote/US)" }
      ],
      growthRate: 15.5,
      demandLevel: "High",
      topSkills: ["Problem Solving", "Cloud Computing", "Python", "Team Leadership", "Agile"],
      marketOutlook: "Positive",
      keyTrends: [
        "Increased adoption of AI tools",
        "Shift towards remote-first work",
        "Emphasis on cross-functional collaboration",
        "Growing importance of security",
        "Focus on continuous learning"
      ],
      recommendedSkills: ["AI Ethics", "Advanced Data Analysis", "Communication", "System Architecture", "Project Management"]
    };
  }
};

export async function getIndustryInsights(searchIndustry) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  // If a specific industry is queried
  if (searchIndustry) {
    const searchResult = await db.industryInsight.findUnique({
      where: { industry: searchIndustry },
    });
    
    if (searchResult) {
      return { insights: searchResult, userSkills: user.skills || [] };
    }
    
    // If not found, generate it
    const insights = await generateAIInsights(searchIndustry);
    
    const newInsight = await db.industryInsight.create({
      data: {
        industry: searchIndustry,
        ...insights,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    
    return { insights: newInsight, userSkills: user.skills || [] };
  }

  // If no insights exist, generate them
  if (!user.industryInsight) {
    const insights = await generateAIInsights(user.industry);

    const industryInsight = await db.industryInsight.create({
      data: {
        industry: user.industry,
        ...insights,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { insights: industryInsight, userSkills: user.skills || [] };
  }

  return { insights: user.industryInsight, userSkills: user.skills || [] };
}
