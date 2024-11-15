import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    // 1. We use the 'cookie-parser' middleware (added earlier) to easily access cookies from incoming requests.
    // 'req.cookies' holds all cookies sent by the client. Here, we are checking for a cookie named 'jwt'.
    // 'jwt' is expected to contain the user's authentication token (used for verifying their identity).
    const token = req.cookies.jwt;

    // 2. If the 'jwt' cookie is missing (i.e., no token was provided), we send a 401 Unauthorized response,
    // meaning the user is not allowed to access this resource without a valid token.
    if (!token) {
      return res.status(401).json({ error: "Unauthorized: No Token Provided" });
    }

    // 3. If the token exists, we verify it using 'jwt.verify'. This function checks the token's
    // authenticity using a secret key (stored in environment variable 'JWT_SECRET').
    // If the token is valid, 'decoded' will contain the information embedded in the token, such as the user ID else it returns null.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. If the token can't be verified (for example, if it was tampered with or expired),
    // we return a 401 Unauthorized error.
    if (!decoded) {
      return res.status(401).json({ error: "Unauthorized: Invalid Token" });
    }

    // 5. Once the token is verified, we extract the user ID from 'decoded'.
    // Then, we query the database using the User model to find the user with this ID.
    // The '.select("-password")' part excludes the user's password from the returned data, ensuring we don't retrieve sensitive information.
    const user = await User.findById(decoded.userId).select("-password");

    // 6. If the user doesn't exist in the database (maybe the account was deleted), we return a 404 Not Found error.
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 7. If the user is found, we attach the user object to 'req.user' so that the next middleware
    // or route handler can access the authenticated user's details.
    req.user = user;

    // 8. 'next()' passes control to the next middleware or route handler in the stack.
    next();
  } catch (error) {
    console.log("Error in protectRoute middleware", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
