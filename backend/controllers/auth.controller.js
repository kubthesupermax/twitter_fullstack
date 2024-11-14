import User from "../models/user.model";
import bcrypt from "bcryptjs";

export const signup = async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;

    // If the email doesn't match the regular expression (invalid email format),
    // return a 400 Bad Request response with an error message.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check if the username is already taken
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    // Check if the email is already taken
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: "Email is already taken" });
    }

    // hash password
    const salt = await bcrypt.genSalt(10); // The number 10 refers to the cost factor (salt rounds); the higher the number, the more secure but slower the hashing process.

    // Hash the password using the generated salt. The result is a secure, hashed version of the password that can be safely stored in the database.
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = new User({
      fullName,
      username,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      // Generate a token based on the user's ID and set it as a cookie in the response.
      generateTokenAndSetCookie(newUser._id, res);

      // Save the new user to the database after the token is generated and cookie is set.
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        username: newUser.username,
        email: newUser.email,
        followers: newUser.followers,
        following: newUser.following,
        profileImg: newUser.profileImg,
        coverImg: newUser.coverImg,
      });
    } else {
      res.status(400).json({ error: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  res.json({
    data: "You hit the login endpoint",
  });
};

export const logout = async (req, res) => {
  res.json({
    data: "You hit the logout endpoint",
  });
};
