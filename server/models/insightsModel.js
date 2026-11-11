const mongoose = require("mongoose");

const insightSchema = new mongoose.Schema({
  end_year: String,
  start_year: String,
  intensity: Number,
  sector: String,
  topic: String,
  insight: String,
  url: String,
  region: String,
  impact: String,
  added: Date,
  published: Date,
  country: String,
  relevance: Number,
  pestle: String,
  source: String,
  swot: String,
  title: String,
  likelihood: Number,
  city: String
});
insightSchema.index({ published: 1 });
insightSchema.index({ start_year: 1 });
insightSchema.index({ sector: 1 });
insightSchema.index({ topic: 1 });
insightSchema.index({ country: 1 });

module.exports = mongoose.model("Insight", insightSchema);
