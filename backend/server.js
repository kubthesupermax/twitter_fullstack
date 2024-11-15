import express from "express";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import connectMongoDB from "./db/connectMongoDB.js";

dotenv.config();
console.log(process.env.MONGO_URI); // Add this line to check the value

const app = express();
const PORT = process.env.PORT || 5000;

//console.log(process.env.MONGO_URI); // cannot read env variable by default instead use dotenv

app.use(express.json()); // middleware to parse req.body
// app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectMongoDB();
});

// Note
// dotenv.config({ path: "../.env" }); // this will look for .env file in parent directory
