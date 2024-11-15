import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { v2 as cloudinary } from "cloudinary";

// Import routes
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";

import connectMongoDB from "./db/connectMongoDB.js";

dotenv.config();
console.log(process.env.MONGO_URI); // Add this line to check the value

// Configure Cloudinary with credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // - cloud_name: Your Cloudinary account's cloud name
  api_key: process.env.CLOUDINARY_API_KEY, // - api_key: Your Cloudinary API key for authentication
  api_secret: process.env.CLOUDINARY_API_SECRET, // - api_secret: Your Cloudinary API secret for secure access
});

const app = express();
const PORT = process.env.PORT || 5000;

//console.log(process.env.MONGO_URI); // cannot read env variable by default instead use dotenv

app.use(express.json()); // Parses incoming JSON data from the request body and makes it available in req.body
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded form data from the request body (for traditional form submissions)

app.use(cookieParser());
// This line adds middleware to our app that processes any cookies sent with the request.
// The 'cookie-parser' package makes it easy to read cookies from the incoming requests.
// After this, we can access cookies using 'req.cookies' in any route in our app.

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectMongoDB();
});

// Note
// dotenv.config({ path: "../.env" }); // this will look for .env file in parent directory
// React (frontend) usually sends data to your server in JSON format via fetch or axios. So, only express.json() is needed to parse that data on the backend.
