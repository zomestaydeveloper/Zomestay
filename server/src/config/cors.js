const allowedOrigins = [
  "http://localhost:5173",
  "https://zomestay.com",
  "https://www.zomestay.com",
];

module.exports = cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow server-to-server / curl
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
});
