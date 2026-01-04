const cors = require('cors');

module.exports = cors({
  origin: [
    "http://localhost:5173",
    "https://zomestay.com",
    "https://www.zomestay.com",
    "https://api.zomestay.com",
  ],
  credentials: true
});
