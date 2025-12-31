const cors = require('cors');

module.exports = cors({
  origin: [
    "http://localhost:5173",
    "https://techiconnect.shop",
    "https://www.techiconnect.shop",
    "https://api.techiconnect.shop",
  ],
  credentials: true
});
