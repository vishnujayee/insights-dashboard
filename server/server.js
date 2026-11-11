const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const analyticsRoutes = require("../server/routes/anayltics");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"));

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", analyticsRoutes);

app.listen(5000, () => console.log("Server running on 5000"));
