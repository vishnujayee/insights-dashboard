// migrate-data.js
const mongoose = require("mongoose");
const fs = require("fs");
require("dotenv").config();

const Insight = require("../server/models/insightsModel");

// Connect to MongoDB without deprecated options
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

const parseDate = (value) => {
  if (!value || value === "") return null;
  
  // Handle various date formats
  try {
    // Format: "July, 03 2016 06:00:29"
    const monthMap = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
      'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    
    if (value.includes(',')) {
      const parts = value.split(/[,: ]+/);
      if (parts.length >= 4) {
        const month = monthMap[parts[0]];
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        const hour = parseInt(parts[3] || 0);
        const minute = parseInt(parts[4] || 0);
        const second = parseInt(parts[5] || 0);
        
        if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
          return new Date(Date.UTC(year, month, day, hour, minute, second));
        }
      }
    }
    
    // Try standard date parsing
    const timestamp = Date.parse(value);
    if (!isNaN(timestamp)) {
      return new Date(timestamp);
    }
    
    return null;
  } catch (error) {
    console.log(`Date parsing failed for: ${value}`);
    return null;
  }
};

const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const parseString = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

async function migrateData() {
  try {
    console.log("📖 Reading data file...");
    const rawData = JSON.parse(fs.readFileSync("jsondata.json", "utf-8"));
    
    console.log(`Found ${rawData.length} records to process`);
    
    // Format the data
    const formatted = rawData.map((item, index) => {
      // Handle empty strings and null values
      const formattedItem = {
        end_year: parseString(item.end_year),
        start_year: parseString(item.start_year),
        intensity: parseNumber(item.intensity),
        sector: parseString(item.sector),
        topic: parseString(item.topic),
        insight: parseString(item.insight),
        url: parseString(item.url),
        region: parseString(item.region),
        impact: parseString(item.impact),
        added: parseDate(item.added),
        published: parseDate(item.published),
        country: parseString(item.country),
        relevance: parseNumber(item.relevance),
        pestle: parseString(item.pestle),
        source: parseString(item.source),
        swot: parseString(item.swot || ""),
        title: parseString(item.title),
        likelihood: parseNumber(item.likelihood),
        city: parseString(item.city || "")
      };
      
      return formattedItem;
    });

    console.log("Sample formatted record:", JSON.stringify(formatted[0], null, 2));

    // Clear existing data (optional)
    console.log("🧹 Clearing existing data...");
    await Insight.deleteMany({});
    
    // Insert in batches to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < formatted.length; i += batchSize) {
      const batch = formatted.slice(i, i + batchSize);
      await Insight.insertMany(batch, { ordered: false });
      console.log(`✅ Inserted batch ${i / batchSize + 1}/${Math.ceil(formatted.length / batchSize)}`);
    }
    
    // Verify the data
    const count = await Insight.countDocuments();
    console.log(`\n📊 Migration complete! Total records: ${count}`);
    
    // Show statistics
    const stats = await Insight.aggregate([
      {
        $group: {
          _id: null,
          totalIntensity: { $sum: "$intensity" },
          avgIntensity: { $avg: "$intensity" },
          maxIntensity: { $max: "$intensity" },
          totalLikelihood: { $sum: "$likelihood" },
          avgLikelihood: { $avg: "$likelihood" }
        }
      }
    ]);
    console.log("Statistics:", stats[0]);
    
    const distinctValues = await Promise.all([
      Insight.distinct("sector"),
      Insight.distinct("region"),
      Insight.distinct("country"),
      Insight.distinct("pestle"),
      Insight.distinct("topic")
    ]);
    
    console.log("\n📈 Data Distribution:");
    console.log(`Sectors (${distinctValues[0].filter(Boolean).length}):`, distinctValues[0].filter(Boolean).slice(0, 10));
    console.log(`Regions (${distinctValues[1].filter(Boolean).length}):`, distinctValues[1].filter(Boolean).slice(0, 10));
    console.log(`Countries (${distinctValues[2].filter(Boolean).length}):`, distinctValues[2].filter(Boolean).slice(0, 10));
    console.log(`PESTLE (${distinctValues[3].filter(Boolean).length}):`, distinctValues[3].filter(Boolean));
    console.log(`Topics (${distinctValues[4].filter(Boolean).length}):`, distinctValues[4].filter(Boolean).slice(0, 20));
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
migrateData();