// utils/filter.js
const buildFilterQuery = (query) => {
  const {
    year,
    country,
    region,
    state,
    sector,
    pestle,
    topic,
    source,
    startYear,
    endYear
  } = query;

  let match = {};

  // Helper function to check if value is valid (not empty, null, undefined)
  const isValid = (value) => {
    return value !== undefined && 
           value !== null && 
           value !== '' && 
           value !== ' ' && 
           value !== 'null' && 
           value !== 'undefined';
  };

  // Exact year filter - ONLY if it's a valid number
  if (isValid(year)) {
    const yearNum = Number(year);
    if (!isNaN(yearNum) && yearNum > 1900 && yearNum < 2100) {
      match.start_year = yearNum;
    }
  }

  // Range filter (takes priority over single year)
  if (isValid(startYear) || isValid(endYear)) {
    // Initialize if not exists
    if (!match.start_year || typeof match.start_year === 'number') {
      match.start_year = {};
    }

    if (isValid(startYear)) {
      const startYearNum = Number(startYear);
      if (!isNaN(startYearNum) && startYearNum > 1900 && startYearNum < 2100) {
        match.start_year.$gte = startYearNum;
      }
    }

    if (isValid(endYear)) {
      const endYearNum = Number(endYear);
      if (!isNaN(endYearNum) && endYearNum > 1900 && endYearNum < 2100) {
        match.start_year.$lte = endYearNum;
      }
    }

    // If the object is empty, remove it
    if (Object.keys(match.start_year).length === 0) {
      delete match.start_year;
    }
  }

  // Add other filters only if they have valid values
  if (isValid(country)) match.country = country;
  if (isValid(region)) match.region = region;
  if (isValid(state)) match.city = state;
  if (isValid(sector)) match.sector = sector;
  if (isValid(pestle)) match.pestle = pestle;
  if (isValid(topic)) match.topic = topic;
  if (isValid(source)) match.source = source;

  console.log("Built filter:", JSON.stringify(match, null, 2));
  return match;
};

module.exports = buildFilterQuery;