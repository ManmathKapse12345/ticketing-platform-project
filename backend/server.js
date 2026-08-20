const app = require("./app.js");
const connectDB = require("./src/config/db.js");

const PORT = process.env.PORT || 5000;

// console.log(process.env.MONGODB_URI);
connectDB().then(() => {
  app.listen(PORT,() => {
    console.log(`Server running on  http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error("MONGODB connection error :- ",error);
});
