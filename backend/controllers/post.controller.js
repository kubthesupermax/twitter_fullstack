import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
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

export const likeUnlikePost = async (req, res) => {
  try {
    // Extract the user ID from the request object (assuming the user is authenticated and their ID is stored in req.user._id)
    const userId = req.user._id;

    // Destructure the 'id' parameter from the request URL and rename it to 'postId'
    // This gives us the ID of the post that the user wants to like or unlike
    const { id: postId } = req.params;

    // Find the post by ID
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if the user has already liked the post
    const userLikedPost = post.likes.includes(userId);

    // If the user has liked the post, remove their ID from the likes array
    if (userLikedPost) {
      // Unlike post
      // Update the 'Post' collection by pulling (removing) the user's ID from the 'likes' array of the post
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } }); // This effectively "unlikes" the post by the current user

      // Update the 'User' collection by pulling (removing) the post ID from the 'likedPosts' array of the user
      // This ensures that the post is no longer listed as liked by this user
      await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });

      // Create an updated version of the 'likes' array by filtering out the user ID who has just unliked the post
      // This generates the new state of likes for the post (without the unliked user)
      const updatedLikes = post.likes.filter(
        (id) => id.toString() !== userId.toString()
      );

      res.status(200).json(updatedLikes); // This allows the client (e.g., frontend) to receive the updated list of users who liked the post after the like/unlike action
    } else {
      post.likes.push(userId); // Add the user ID to the 'likes' array of the post, effectively liking the post for the current user

      // Update the 'User' collection by pushing the post ID to the 'likedPosts' array of the user
      await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } }); // This tracks which posts the user has liked

      await post.save(); // Save the updated post document after adding the user to the likes array

      // Create a new notification object to inform the post's author that their post has been liked
      const notification = new Notification({
        from: userId,
        to: post.user,
        type: "like",
      }); // The notification includes the user who liked the post (from) and the author of the post (to), along with the type of action (like)

      await notification.save(); // Save the notification to the database so the post author is informed

      // Send a successful response to the client with the updated list of users who liked the post
      //res.status(200).json(post.likes); // The client (e.g., frontend) will now have the latest likes data for the post
      res.status(200).json({
        message: "Post liked successfully",
      });
    }
  } catch (error) {
    console.log("Error in likeUnlikePost controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    // Retrieve all posts from the database
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      }); // Sort the posts by date in descending order (newest first) //Check notes for more info down

    // If there are no posts, return an empty array
    if (posts.length === 0) {
      return res.status(200).json([]);
    }

    // Send the retrieved posts as a response
    res.status(200).json(posts);
  } catch (error) {
    console.log("Error in getAllPosts controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller to get all posts liked by a user
export const getLikedPosts = async (req, res) => {
  // Get the user ID from the request
  const userId = req.params.id;

  try {
    // Check if the user exists in the database
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Find all posts that the user has liked
    // Retrieve all posts from the 'Post' collection where the post ID is found in the user's 'likedPosts' array
    // The '$in' operator checks if the '_id' of each post matches any of the IDs in the 'likedPosts' array of the user
    const likedPosts = await Post.find({ _id: { $in: user.likedPosts } })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    res.status(200).json(likedPosts); // Send the liked posts as a response
  } catch (error) {
    console.log("Error in getLikedPosts controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/*
// Notes for getAllPosts:
// Retrieve all posts from the 'Post' collection in the database
// The 'await' ensures that the code waits for the database query to complete before proceeding
const posts = await Post.find()

  // Sort the posts in descending order by their creation date (newest first)
  .sort({ createdAt: -1 })

  // Populate the 'user' field of each post with the associated user details, excluding the 'password' field
  // This ensures that the post object contains the full user details for the post's author, minus sensitive information
  .populate({
    path: "user",
    select: "-password",
  })

  // Populate the 'user' field within the 'comments' array of each post
  // Each comment has a 'user' field, and this populates that user field, again excluding the 'password' field
  .populate({
    path: "comments.user",
    select: "-password",
  });
*/
