import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";

export const createPost = async (req, res) => {
  try {
    // - It extracts the 'text' and 'img' fields from the request body (data sent by the user).
    const { text } = req.body;
    let { img } = req.body;

    // - It gets the ID of the currently logged-in user from `req.user` (added by `protectRoute` middleware).
    const userId = req.user._id.toString(); // Convert ObjectId to string for consistency in comparisons or usage.

    // Check if the user exists in the database.
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check if the 'text' or 'img' field is provided in the request.
    // If both are missing, return a 400 Bad Request response.
    if (!text && !img) {
      return res.status(400).json({ error: "Post must have text or image" });
    }

    // If 'img' field is provided, upload the image to Cloudinary and get the secure URL.
    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img);
      img = uploadedResponse.secure_url;
    }

    // Create a new post in the database.
    const newPost = new Post({
      user: userId,
      text,
      img,
    });

    // Save the new post to the database.
    await newPost.save();

    // Send a response with the newly created post.
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in createPost controller: ", error);
  }
};

export const deletePost = async (req, res) => {
  try {
    // Find the post by ID
    const post = await Post.findById(req.params.id);

    // Check if the post exists
    if (!post) return res.status(404).json({ error: "Post not found" });

    // Check if the current user is the owner of the post
    if (post.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ error: "You are not authorized to delete this post" });
    }

    // If the post has an image, delete it from Cloudinary
    if (post.img) {
      const imgId = post.img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imgId);
    }

    // Delete the post from the database
    await Post.findByIdAndDelete(req.params.id);

    // Send a response with a success message
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.log("Error in deletePost controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const commentOnPost = async (req, res) => {
  try {
    const { text } = req.body; // Get the text from the request body
    const postId = req.params.id; // Get the post ID from the request parameters

    // Get the user ID from the request object.
    const userId = req.user._id; // There's no need to convert it to a string unless it's required for comparison or storage elsewhere.

    // Check if the text field is provided
    if (!text) {
      return res.status(400).json({ error: "Text field is required" });
    }

    // Find the post by ID
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Create a comment object with the user ID and text from the request.
    // Add the comment to the post's comments array.
    const comment = { user: userId, text };

    // Save the updated post with the new comment.
    post.comments.push(comment); // Add the comment to the comments array
    await post.save(); // Save the updated post to the database.

    // Send a response with the updated post
    res.status(200).json(post);
  } catch (error) {
    console.log("Error in commentOnPost controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
