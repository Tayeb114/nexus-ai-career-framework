"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import {
  BriefcaseIcon,
  LineChart,
  TrendingUp,
  TrendingDown,
  Brain,
  Search,
  Target,
  MapPin,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const INDUSTRIES = [
  "Software Engineering",
  "Cybersecurity",
  "Data Science",
  "Product Management",
  "DevOps",
  "Cloud Computing",
  "Digital Marketing",
  "AI/Machine Learning",
  "UX/UI Design",
];

const COUNTRIES = [
  { label: "South Asia", options: ["Bangladesh"] },
  { label: "Americas", options: ["United States", "Canada"] },
  { label: "Europe", options: ["United Kingdom", "Germany", "Netherlands"] },
  { label: "Asia/Oceania", options: ["Japan", "Singapore", "Australia"] },
  { label: "Middle East", options: ["United Arab Emirates"] },
];

export default function DashboardView({ userSkills = [], defaultIndustry }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const industryQuery = searchParams.get("industry") || defaultIndustry;
  const countryQuery = searchParams.get("country") || "Bangladesh";

  const [searchIndustry, setSearchIndustry] = useState(industryQuery);
  const [searchCountry, setSearchCountry] = useState(countryQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      setIsLoading(true);
      try {
        const url = `/api/insights?industry=${encodeURIComponent(industryQuery)}&country=${encodeURIComponent(countryQuery)}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setInsights(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
        setIsSearching(false);
      }
    };
    fetchInsights();
  }, [industryQuery, countryQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchIndustry.trim()) {
      setIsSearching(true);
      let targetUrl = `/dashboard?industry=${encodeURIComponent(searchIndustry)}`;
      if (searchCountry.trim()) {
        targetUrl += `&country=${encodeURIComponent(searchCountry)}`;
      }
      router.push(targetUrl);
    }
  };

  const getCurrencySettings = (country) => {
    const c = (country || "").toLowerCase();
    if (c === "bangladesh") {
      return { code: "BDT", locale: "en-BD", name: "Bangladeshi Taka", symbol: "৳" };
    }
    if (c === "japan") {
      return { code: "JPY", locale: "ja-JP", name: "Japanese Yen", symbol: "¥" };
    }
    // "Only use $ (USD) for USA, Canada, and Singapore" -> defaults back to USD globally per typical configurations
    return { code: "USD", locale: "en-US", name: "US Dollar", symbol: "$" };
  };

  const currencyConfig = getCurrencySettings(countryQuery);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat(currencyConfig.locale, {
      style: 'currency',
      currency: currencyConfig.code, 
      notation: 'standard',
      maximumFractionDigits: 0
    }).format(value);
  };

  if (isLoading || !insights) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted/60 backdrop-blur-md animate-pulse rounded-md" />
        <Card className="p-6 bg-background/60 backdrop-blur-md border-muted/50 h-[88px] w-full animate-pulse flex gap-4 items-center">
          <div className="h-10 flex-1 bg-muted/40 rounded-md"></div>
          <div className="h-10 flex-1 bg-muted/40 rounded-md"></div>
          <div className="h-10 w-24 bg-muted/40 rounded-md"></div>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
             <Card key={i} className="h-[120px] bg-background/60 backdrop-blur-md border-muted/50 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="h-[500px] col-span-1 bg-background/60 backdrop-blur-md border-muted/50 animate-pulse" />
          <Card className="h-[500px] col-span-1 bg-background/60 backdrop-blur-md border-muted/50 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="h-[300px] bg-background/60 backdrop-blur-md border-muted/50 animate-pulse" />
          <Card className="h-[300px] bg-background/60 backdrop-blur-md border-muted/50 animate-pulse" />
        </div>
      </div>
    );
  }

  const salaryData = insights.salaryRanges.map((range) => ({
    name: range.role,
    min: Math.round(range.min / 12),
    max: Math.round(range.max / 12),
    median: Math.round(range.median / 12),
  }));

  const skillGapData = insights.topSkills.map((skill) => {
    const userHas = userSkills.some(
      (uSkill) => uSkill.toLowerCase() === skill.toLowerCase()
    );
    return {
      skill,
      "Industry Needs": 100,
      "Your Skill": userHas ? 100 : 0,
    };
  });

  const getDemandLevelColor = (level) => {
    switch (level.toLowerCase()) {
      case "high": return "bg-green-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const rawOutlook = insights.marketOutlook || "Neutral: Market stable";
  const [sentiment, ...descParts] = rawOutlook.split(":");
  const outlookText = descParts.length > 0 ? descParts.join(":").trim() : rawOutlook;
  
  const getMarketOutlookInfo = (outlook) => {
    const s = (outlook || "").toLowerCase();
    if (s.includes("positive")) return { icon: TrendingUp, color: "text-green-500" };
    if (s.includes("negative")) return { icon: TrendingDown, color: "text-red-500" };
    return { icon: LineChart, color: "text-yellow-500" };
  };

  const OutlookIcon = getMarketOutlookInfo(sentiment).icon;
  const outlookColor = getMarketOutlookInfo(sentiment).color;
  const lastUpdatedDate = format(new Date(insights.lastUpdated), "dd/MM/yyyy");
  const nextUpdateDistance = formatDistanceToNow(new Date(insights.nextUpdate), { addSuffix: true });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Badge variant="outline">Last updated: {lastUpdatedDate}</Badge>
      </div>

      <Card className="p-6 bg-background/60 backdrop-blur-md border-muted/50">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Select 
              value={searchIndustry}
              onValueChange={setSearchIndustry}
              disabled={isSearching || isLoading}
            >
              <SelectTrigger className="w-full bg-background/50 border-muted pl-9">
                <SelectValue placeholder="Select an industry..." />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative flex-1 w-full">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Select 
              value={searchCountry}
              onValueChange={setSearchCountry}
              disabled={isSearching || isLoading}
            >
              <SelectTrigger className="w-full bg-background/50 border-muted pl-9">
                <SelectValue placeholder="Select Country..." />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.options.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full md:w-auto" disabled={isSearching || isLoading || !searchIndustry.trim()}>
            {isSearching ? "Searching..." : "Explore Insights"}
          </Button>
        </form>
      </Card>

      {/* Market Overview Cards */}
      <div 
        key={insights.id || industryQuery}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
      >
        <Card className="bg-background/60 backdrop-blur-md border-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Outlook</CardTitle>
            <OutlookIcon className={`h-4 w-4 ${outlookColor}`} />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium leading-tight mb-2 tracking-tight">{outlookText}</div>
            <p className="text-xs text-muted-foreground">Next update {nextUpdateDistance}</p>
          </CardContent>
        </Card>

        <Card className="bg-background/60 backdrop-blur-md border-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Industry Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {insights.growthRate ? `${insights.growthRate.toFixed(1)}%` : "Loading..."}
            </div>
            <Progress value={insights.growthRate || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="bg-background/60 backdrop-blur-md border-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demand Level</CardTitle>
            <BriefcaseIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.demandLevel}</div>
            <div className={`h-2 w-full rounded-full mt-2 ${getDemandLevelColor(insights.demandLevel)}`} />
          </CardContent>
        </Card>

        <Card className="bg-background/60 backdrop-blur-md border-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Skills</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {insights.topSkills.map((skill) => (
                <Badge key={skill} variant="secondary">{skill}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card 
          className="col-span-1 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 bg-background/60 backdrop-blur-md border-muted/50"
          key={`salary-${insights.id || industryQuery}`}
        >
          <CardHeader>
            <CardTitle>Monthly Salary Ranges by Role ({countryQuery})</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              All figures shown are estimated monthly take-home pay in {currencyConfig.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full pr-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryData} margin={{ left: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tickFormatter={formatCurrency} width={80} tick={{ fontSize: 12 }} tickCount={4} />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background/90 backdrop-blur-md border border-muted/50 rounded-lg p-4 shadow-xl text-sm">
                            <p className="font-semibold mb-3 border-b border-muted pb-2">{label}</p>
                            {payload.map((item) => (
                              <div key={item.name} className="flex items-center justify-between gap-6 py-1">
                                <span className="flex items-center gap-2 text-muted-foreground">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }}></div>
                                  {item.name}
                                </span>
                                <span className="font-medium text-foreground">
                                  {formatCurrency(item.value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="min" fill="#3b82f6" name="Monthly Min" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="median" fill="#2563eb" name="Monthly Median" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="max" fill="#1d4ed8" name="Monthly Max" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {salaryData.length === 0 && (
                <div className="text-center text-muted-foreground pt-4">
                  No data available for this industry.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skill Gap Heatmap */}
        <Card 
          className="col-span-1 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 bg-background/60 backdrop-blur-md border-muted/50"
          key={`skills-${insights.id || industryQuery}`}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Skill Gap Heatmap
            </CardTitle>
            <CardDescription>
              Comparing your current skills with industry demands
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={skillGapData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  
                  <Radar
                    name="Industry Needs"
                    dataKey="Industry Needs"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.2}
                  />
                  
                  <Radar
                    name="Your Skill"
                    dataKey="Your Skill"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.6}
                  />
                  
                  <Legend />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const hasSkill = payload.find(p => p.dataKey === "Your Skill")?.value === 100;
                        return (
                          <div className="bg-background/90 backdrop-blur-md border rounded-lg p-2 shadow-md text-sm">
                            <span className="font-semibold">{payload[0].payload.skill}</span>
                            <div className="mt-1">
                              Status: <span className={hasSkill ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
                                {hasSkill ? "Covered ✓" : "Missing ✕"}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div 
        className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200"
        key={`trends-${insights.id || industryQuery}`}
      >
        <Card className="bg-background/60 backdrop-blur-md border-muted/50">
          <CardHeader>
            <CardTitle>Key Industry Trends</CardTitle>
            <CardDescription>
              Current trends shaping the industry
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {insights.keyTrends.map((trend, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                  <span>{trend}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-background/60 backdrop-blur-md border-muted/50">
          <CardHeader>
            <CardTitle>Recommended Skills</CardTitle>
            <CardDescription>Skills to consider developing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {insights.recommendedSkills.map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
