const router = require("express").Router();
const Insight = require("../models/insightsModel");
const buildFilter = require("../utils/filter");

// =============================
//  TOP INTENSITY TOPICS
// =============================
router.get("/top-intensity", async (req, res) => {
  try {
    const filter = buildFilter(req.query);

    const data = await Insight.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$topic",
          totalIntensity: { $sum: "$intensity" },
          url: { $first: "$url" }
        }
      },
      { $match: { _id: { $nin: [null, "", " "] } } },
      { $sort: { totalIntensity: -1 } },
      { $limit: 10 }
    ]);

    res.json(data);
  } catch (err) {
    console.error("Top Intensity Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
//  TOPIC COMPARISON
// =============================
router.get("/top-topic-comparison", async (req, res) => {
  try {
    const filter = buildFilter(req.query);

    const data = await Insight.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$topic",
          avgIntensity: { $avg: "$intensity" },
          avgLikelihood: { $avg: "$likelihood" }
        }
      },
      { $match: { _id: { $nin: [null, "", " "] } } },
      { $sort: { avgIntensity: -1 } }
    ]);

    res.json(data);
  } catch (err) {
    console.error("Topic Comparison Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
//  TOP REGIONS
// =============================
router.get("/top-region", async (req, res) => {
  try {
    const filter = buildFilter(req.query);

    const data = await Insight.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$region",
          avgRelevance: { $avg: "$relevance" },
          avgLikelihood: { $avg: "$likelihood" }
        }
      },
      { $match: { _id: { $nin: [null, "", " "] } } },
      { $sort: { avgRelevance: -1 } }
    ]);

    res.json(data);
  } catch (err) {
    console.error("Top Region Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
//  LOCATION COMPARISON
// =============================
router.get("/location-comparison", async (req, res) => {
  try {
    const filter = buildFilter(req.query);

    const data = await Insight.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            country: "$country",
            region: "$region",
            city: "$city"
          },
          total: { $sum: 1 }
        }
      },
      { $match: { "_id.country": { $nin: [null, "", " "] } } }
    ]);

    res.json(data);
  } catch (err) {
    console.error("Location Comparison Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
//  TOP SECTOR
// =============================
router.get("/top-sector", async (req, res) => {
  try {
    const filter = buildFilter(req.query);

    const data = await Insight.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$sector",
          intensity: { $sum: "$intensity" },
          likelihood: { $avg: "$likelihood" },
          relevance: { $avg: "$relevance" }
        }
      },
      { $match: { _id: { $nin: [null, "", " "] } } },
      { $sort: { intensity: -1 } }
    ]);

    res.json(data);
  } catch (err) {
    console.error("Top Sector Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
//  YEAR TREND
// =============================
router.get("/year-trend", async (req, res) => {
  try {
    const filter = buildFilter(req.query);

    const data = await Insight.aggregate([
      {
        $match: {
          ...filter,
          published: { $nin: [null, "", " "] }
        }
      },
      {
        $group: {
          _id: { $year: "$published" },
          totalLikelihood: { $sum: "$likelihood" }
        }
      },
      { $match: { _id: { $nin: [null, 0] } } },
      { $sort: { _id: 1 } }
    ]);

    res.json(data);
  } catch (err) {
    console.error("Year Trend Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
//  DURATION ANALYSIS - COMPLETELY REWRITTEN WITH SAFE CONVERSION
// =============================
router.get("/duration-analysis", async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    console.log("Duration Analysis Filter:", filter);

    // First, let's check what data we have
    const sampleData = await Insight.find(filter).limit(5);
    console.log("Sample data for duration:", sampleData.map(d => ({
      topic: d.topic,
      start: d.start_year,
      end: d.end_year,
      startType: typeof d.start_year,
      endType: typeof d.end_year
    })));

    const data = await Insight.aggregate([
      { $match: filter },
      {
        $match: {
          // Only include documents where topic exists
          topic: { $exists: true, $ne: null, $ne: "" }
        }
      },
      {
        $addFields: {
          // Handle start_year - could be various types
          startProcessed: {
            $cond: {
              if: {
                $or: [
                  { $eq: ["$start_year", null] },
                  { $eq: ["$start_year", ""] },
                  { $eq: ["$start_year", " "] },
                  { $eq: [{ $type: "$start_year" }, "missing"] }
                ]
              },
              then: null,
              else: {
                $cond: {
                  if: { $eq: [{ $type: "$start_year" }, "string"] },
                  then: {
                    $cond: {
                      if: { $regexMatch: { input: "$start_year", regex: /^\d+$/ } },
                      then: { $toInt: "$start_year" },
                      else: null
                    }
                  },
                  else: {
                    $cond: {
                      if: { $eq: [{ $type: "$start_year" }, "number"] },
                      then: "$start_year",
                      else: null
                    }
                  }
                }
              }
            }
          },
          // Handle end_year similarly
          endProcessed: {
            $cond: {
              if: {
                $or: [
                  { $eq: ["$end_year", null] },
                  { $eq: ["$end_year", ""] },
                  { $eq: ["$end_year", " "] },
                  { $eq: [{ $type: "$end_year" }, "missing"] }
                ]
              },
              then: null,
              else: {
                $cond: {
                  if: { $eq: [{ $type: "$end_year" }, "string"] },
                  then: {
                    $cond: {
                      if: { $regexMatch: { input: "$end_year", regex: /^\d+$/ } },
                      then: { $toInt: "$end_year" },
                      else: null
                    }
                  },
                  else: {
                    $cond: {
                      if: { $eq: [{ $type: "$end_year" }, "number"] },
                      then: "$end_year",
                      else: null
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $match: {
          startProcessed: { $ne: null },
          endProcessed: { $ne: null },
          $expr: {
            $and: [
              { $gt: ["$endProcessed", "$startProcessed"] },
              { $gt: ["$startProcessed", 1900] },
              { $lt: ["$startProcessed", 2100] },
              { $gt: ["$endProcessed", 1900] },
              { $lt: ["$endProcessed", 2100] }
            ]
          }
        }
      },
      {
        $project: {
          topic: 1,
          duration: { $subtract: ["$endProcessed", "$startProcessed"] }
        }
      },
      {
        $match: {
          duration: { $gt: 0, $lt: 100 }
        }
      },
      { $sort: { duration: -1 } },
      { $limit: 50 }
    ]);

    console.log(`Duration analysis found ${data.length} records`);
    res.json(data);
  } catch (err) {
    console.error("Duration Analysis Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
//  SECTOR YEAR COMPARISON - FIXED
// =============================
router.get("/comparison/sector-year", async (req, res) => {
  try {
    const filter = buildFilter(req.query);

    const data = await Insight.aggregate([
      { $match: filter },
      {
        $match: {
          start_year: { $exists: true, $type: "string", $ne: "", $ne: null },
          sector: { $exists: true, $ne: "", $ne: null }
        }
      },
      {
        $addFields: {
          yearTrimmed: { $trim: { input: "$start_year" } }
        }
      },
      {
        $match: {
          yearTrimmed: { $ne: "" }
        }
      },
      {
        $addFields: {
          yearIsNumeric: {
            $regexMatch: { input: "$yearTrimmed", regex: /^\d+$/ }
          }
        }
      },
      {
        $match: {
          yearIsNumeric: true
        }
      },
      {
        $addFields: {
          yearNum: { $toInt: "$yearTrimmed" }
        }
      },
      {
        $match: {
          yearNum: { $gt: 1900, $lt: 2100 }
        }
      },
      {
        $group: {
          _id: { 
            year: "$yearNum",
            sector: "$sector" 
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1 } }
    ]);

    res.json(data);
  } catch (err) {
    console.error("Sector Year Comparison Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
//  LOCATION YEAR COMPARISON
// =============================
router.get("/location-year-comparison", async (req, res) => {
  try {
    const filter = buildFilter(req.query);

    const data = await Insight.aggregate([
      { $match: filter },
      {
        $match: {
          published: { $nin: [null, "", " "] },
          region: { $nin: [null, "", " "] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$published" },
            region: "$region"
          },
          count: { $sum: 1 }
        }
      },
      { $match: { "_id.year": { $ne: null } } },
      { $sort: { "_id.year": 1 } }
    ]);

    res.json(data);
  } catch (err) {
    console.error("Location Year Comparison Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
//  DURATION YEAR HEATMAP - FIXED
// =============================
router.get("/duration-year-heatmap", async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    console.log("Duration Heatmap Filter:", filter);

    const data = await Insight.aggregate([
      { $match: filter },
      {
        $addFields: {
          // Handle start_year
          startProcessed: {
            $cond: {
              if: {
                $or: [
                  { $eq: ["$start_year", null] },
                  { $eq: ["$start_year", ""] },
                  { $eq: ["$start_year", " "] }
                ]
              },
              then: null,
              else: {
                $cond: {
                  if: { $eq: [{ $type: "$start_year" }, "string"] },
                  then: {
                    $cond: {
                      if: { $regexMatch: { input: "$start_year", regex: /^\d+$/ } },
                      then: { $toInt: "$start_year" },
                      else: null
                    }
                  },
                  else: {
                    $cond: {
                      if: { $eq: [{ $type: "$start_year" }, "number"] },
                      then: "$start_year",
                      else: null
                    }
                  }
                }
              }
            }
          },
          // Handle end_year
          endProcessed: {
            $cond: {
              if: {
                $or: [
                  { $eq: ["$end_year", null] },
                  { $eq: ["$end_year", ""] },
                  { $eq: ["$end_year", " "] }
                ]
              },
              then: null,
              else: {
                $cond: {
                  if: { $eq: [{ $type: "$end_year" }, "string"] },
                  then: {
                    $cond: {
                      if: { $regexMatch: { input: "$end_year", regex: /^\d+$/ } },
                      then: { $toInt: "$end_year" },
                      else: null
                    }
                  },
                  else: {
                    $cond: {
                      if: { $eq: [{ $type: "$end_year" }, "number"] },
                      then: "$end_year",
                      else: null
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $match: {
          startProcessed: { $ne: null },
          endProcessed: { $ne: null },
          $expr: {
            $and: [
              { $gt: ["$endProcessed", "$startProcessed"] },
              { $gt: ["$startProcessed", 1900] },
              { $lt: ["$startProcessed", 2100] }
            ]
          }
        }
      },
      {
        $addFields: {
          year: "$startProcessed",
          duration: { $subtract: ["$endProcessed", "$startProcessed"] }
        }
      },
      {
        $match: {
          duration: { $gt: 0, $lt: 50 }
        }
      },
      {
        $group: {
          _id: {
            year: "$year",
            durationBucket: {
              $switch: {
                branches: [
                  { case: { $lte: ["$duration", 2] }, then: "Short (0-2 years)" },
                  { case: { $lte: ["$duration", 5] }, then: "Medium (3-5 years)" },
                  { case: { $lte: ["$duration", 10] }, then: "Long (6-10 years)" }
                ],
                default: "Very Long (10+ years)"
              }
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1 } }
    ]);

    console.log(`Duration heatmap found ${data.length} records`);
    res.json(data);
  } catch (err) {
    console.error("Duration Heatmap Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
//  SOURCE YEAR COMPARISON
// =============================
router.get("/comparison/source-year", async (req, res) => {
  try {
    const filter = buildFilter(req.query);

    const data = await Insight.aggregate([
      { $match: filter },
      {
        $match: {
          published: { $nin: [null, "", " "] },
          source: { $nin: [null, "", " "] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$published" },
            source: "$source"
          },
          count: { $sum: 1 }
        }
      },
      { $match: { "_id.year": { $ne: null } } },
      { $sort: { "_id.year": 1 } }
    ]);

    res.json(data);
  } catch (err) {
    console.error("Source Year Comparison Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
//  FILTER OPTIONS
// =============================
router.get("/filter-options", async (req, res) => {
  try {
    const [countries, sectors, topics, regions, pestles] = await Promise.all([
      Insight.distinct("country"),
      Insight.distinct("sector"),
      Insight.distinct("topic"),
      Insight.distinct("region"),
      Insight.distinct("pestle")
    ]);

    res.json({
      countries: countries.filter(c => c && c.toString().trim() !== ""),
      sectors: sectors.filter(s => s && s.toString().trim() !== ""),
      topics: topics.filter(t => t && t.toString().trim() !== ""),
      regions: regions.filter(r => r && r.toString().trim() !== ""),
      pestles: pestles.filter(p => p && p.toString().trim() !== "")
    });
  } catch (error) {
    console.error("Filter Options Error:", error);
    res.status(500).json({ error: "Failed to fetch filter options" });
  }
});

// =============================
//  PESTLE SECTOR
// =============================
router.get("/pestle-sector", async (req, res) => {
  try {
    const filter = buildFilter(req.query);

    const data = await Insight.aggregate([
      { $match: filter },
      {
        $match: {
          sector: { $nin: [null, "", " "] },
          pestle: { $nin: [null, "", " "] }
        }
      },
      {
        $group: {
          _id: { sector: "$sector", pestle: "$pestle" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          sector: "$_id.sector",
          pestle: "$_id.pestle",
          count: 1,
          _id: 0
        }
      }
    ]);

    res.json(data);
  } catch (err) {
    console.error("Pestle Sector Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
//  PESTLE YEAR - FIXED
// =============================
router.get("/pestle-year", async (req, res) => {
  try {
    const filter = buildFilter(req.query);

    const data = await Insight.aggregate([
      { $match: filter },
      {
        $match: {
          pestle: { $nin: [null, "", " "] }
        }
      },
      {
        $addFields: {
          yearProcessed: {
            $cond: {
              if: {
                $or: [
                  { $eq: ["$start_year", null] },
                  { $eq: ["$start_year", ""] },
                  { $eq: ["$start_year", " "] }
                ]
              },
              then: null,
              else: {
                $cond: {
                  if: { $eq: [{ $type: "$start_year" }, "string"] },
                  then: {
                    $cond: {
                      if: { $regexMatch: { input: "$start_year", regex: /^\d+$/ } },
                      then: { $toInt: "$start_year" },
                      else: null
                    }
                  },
                  else: {
                    $cond: {
                      if: { $eq: [{ $type: "$start_year" }, "number"] },
                      then: "$start_year",
                      else: null
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $match: {
          yearProcessed: { $ne: null, $gt: 1900, $lt: 2100 }
        }
      },
      {
        $group: {
          _id: { 
            year: "$yearProcessed",
            pestle: "$pestle" 
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          year: "$_id.year",
          pestle: "$_id.pestle",
          count: 1,
          _id: 0
        }
      },
      { $sort: { year: 1 } }
    ]);

    res.json(data);
  } catch (err) {
    console.error("Pestle Year Error:", err);
    res.status(500).json({ error: err.message });
  }
});
// =============================
//  PESTLE COUNTRY
// =============================
router.get("/pestle-country", async (req, res) => {
  try {
    const filter = buildFilter(req.query);

    const data = await Insight.aggregate([
      { $match: filter },
      {
        $match: {
          country: { $nin: [null, "", " "] },
          pestle: { $nin: [null, "", " "] }
        }
      },
      {
        $group: {
          _id: { country: "$country", pestle: "$pestle" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          country: "$_id.country",
          pestle: "$_id.pestle",
          count: 1,
          _id: 0
        }
      }
    ]);

    res.json(data);
  } catch (err) {
    console.error("Pestle Country Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================
//  PESTLE SECTOR COMPARISON
// =============================
router.get("/pestle-sector-comparison", async (req, res) => {
  try {
    const filter = buildFilter(req.query);

    const data = await Insight.aggregate([
      { $match: filter },
      {
        $match: {
          sector: { $nin: [null, "", " "] },
          pestle: { $nin: [null, "", " "] }
        }
      },
      {
        $group: {
          _id: {
            sector: "$sector",
            pestle: "$pestle"
          },
          avgIntensity: { $avg: "$intensity" },
          avgLikelihood: { $avg: "$likelihood" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          sector: "$_id.sector",
          pestle: "$_id.pestle",
          avgIntensity: 1,
          avgLikelihood: 1,
          count: 1,
          _id: 0
        }
      }
    ]);

    res.json(data);
  } catch (err) {
    console.error("Pestle Sector Comparison Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;