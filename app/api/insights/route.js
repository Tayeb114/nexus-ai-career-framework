import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const industry = searchParams.get("industry");
  const country = searchParams.get("country") || "Bangladesh";

  if (!industry) {
    return NextResponse.json(
      { error: "Industry is required" },
      { status: 400 }
    );
  }

  // Composite Key ensures regional distinction without schema migrations
  const uniqueKey = `${industry}-${country}`;

  try {
    const storedData = await db.industryInsight.findUnique({
      where: { industry: uniqueKey },
    });

    if (storedData) {
      return NextResponse.json(storedData);
    }

    const prompt = `You are a career data expert. Return a valid JSON object matching the IndustryInsight Prisma model for the industry '${industry}' in the country '${country}'.

The salaryRanges field MUST be an array of objects: { role: string, min: number, max: number, median: number }.

CRITICAL: Always return ANNUAL salary as a full integer (e.g., 2400000). Do NOT use strings like '2.4M' or '20k'.

SALARY SCALES:
- Bangladesh (BDT): Junior: 400000-700000 | Mid: 800000-1500000 | Senior: 1800000-3500000
- USA (USD): 80000-250000

CURRENCY: Use BDT for Bangladesh, JPY for Japan, and USD for all other countries. Provide realistic 2026 market rates.

MARKET TRENDS & OUTLOOK:
- Bangladesh: Growth rate MUST be between 6.0 and 8.0. Outlook must mention "Digital Bangladesh 2041" or "SME Digitalization".
- Japan: Growth rate MUST be between 3.0 and 9.0. Outlook must mention "Labor shortage driving automation".
- Global/USA: Growth rate MUST be between 9.0 and 12.0. Outlook must mention "AI Infrastructure" or "Cyber Resilience".

FORMATTING requirements:
Data needs to have:
{
  "salaryRanges": [...],
  "growthRate": number,
  "demandLevel": "High" | "Medium" | "Low",
  "topSkills": ["skill1", "skill2"],
  "marketOutlook": "Sentiment: Short description" (e.g. 'Positive: Digital Bangladesh 2041 scaling SME...'),
  "keyTrends": ["trend1", "trend2"],
  "recommendedSkills": ["skill1", "skill2"]
}`;

    let generatedData;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
      generatedData = JSON.parse(cleanedText);
    } catch (apiError) {
      console.error("Gemini API error in Self-Healing API:", apiError);
      
      const isBD = country.toLowerCase() === "bangladesh";
      const isJP = country.toLowerCase() === "japan";
      
      let baseSalaryRanges = [];
      if (isBD) {
        baseSalaryRanges = [
          { role: `Junior ${industry} Engineer`, min: 400000, max: 700000, median: 550000 },
          { role: `Mid ${industry} Engineer`, min: 800000, max: 1500000, median: 1150000 },
          { role: `Senior ${industry} Specialist`, min: 1800000, max: 3500000, median: 2650000 },
          { role: `Lead ${industry} Analyst`, min: 2000000, max: 4000000, median: 3000000 },
          { role: `Director of ${industry}`, min: 3000000, max: 6000000, median: 4500000 }
        ];
      } else {
        const mult = isJP ? 150 : 1;
        baseSalaryRanges = [
          { role: `Junior ${industry} Engineer`, min: 80000 * mult, max: 120000 * mult, median: 100000 * mult },
          { role: `Mid ${industry} Manager`, min: 130000 * mult, max: 180000 * mult, median: 155000 * mult },
          { role: `Senior ${industry} Specialist`, min: 160000 * mult, max: 250000 * mult, median: 205000 * mult },
          { role: `Lead ${industry} Analyst`, min: 140000 * mult, max: 200000 * mult, median: 170000 * mult },
          { role: `Director of ${industry}`, min: 200000 * mult, max: 350000 * mult, median: 275000 * mult }
        ];
      }

      let fallbackGrowth = 10.5;
      let fallbackOutlook = "Positive: Global tech adoption is driving infrastructure scaling.";
      if (isBD) {
        fallbackGrowth = 7.2;
        fallbackOutlook = "Positive: Digital Bangladesh 2041 scaling SME Digitalization.";
      } else if (isJP) {
        fallbackGrowth = 5.5;
        fallbackOutlook = "Neutral: Labor shortage driving automation across enterprise layers.";
      } else {
        fallbackGrowth = 11.0;
        fallbackOutlook = "Positive: AI Infrastructure and Cyber Resilience boosting demand.";
      }

      generatedData = {
        salaryRanges: baseSalaryRanges,
        growthRate: fallbackGrowth,
        demandLevel: "High",
        topSkills: ["Problem Solving", "Cloud Computing", "Python", "Team Leadership", "Agile"],
        marketOutlook: fallbackOutlook,
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

    const savedData = await db.industryInsight.upsert({
      where: { industry: uniqueKey },
      update: {
        ...generatedData,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      create: {
        industry: uniqueKey,
        ...generatedData,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json(savedData);
  } catch (error) {
    console.error("Error in insights API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
