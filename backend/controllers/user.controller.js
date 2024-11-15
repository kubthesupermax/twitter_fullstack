import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";

export const getUserProfile = async (req, res) => {
  const { username } = req.params; // Destructure the username from the request parameters

  try {
    // Find the user by username
    const user = await User.findOne({ username });

    // If the user doesn't exist, return a 404 Not Found response
    if (!user) return res.status(404).json({ error: "User not found" });

    // Send a response with the user's details
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error in getUserProfile controller", error.message);
  }
};

export const followUnfollowUser = async (req, res) => {
  try {
    const { id } = req.params; // Destructure the 'id' from the request parameters (this is the ID of the user to follow or unfollow)

    const userToModify = await User.findById(id); // Find the user that the current user wants to follow/unfollow using the 'id'
    const currentUser = await User.findById(req.user._id); // Find the current logged-in user by their ID, which is available via req.user (set by protectRoute middleware)

    if (id === req.user._id.toString()) {
      return res
        .status(400)
        .json({ error: "You can't follow/unfollow yourself" });
    }

    if (!userToModify || !currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the current user is already following the userToModify
    // 'currentUser.following' is an array of user IDs that the current user is following.
    // 'userToModify._id' is the ID of the user that the current user is trying to follow/unfollow.
    // The '.includes()' method checks if the 'userToModify._id' exists in the 'following' array.
    // If the current user is already following the user, 'isFollowing' will be 'true'; otherwise, it will be 'false'.
    const isFollowing = currentUser.following.includes(id);

    if (isFollowing) {
      // Unfollow the user

      // Remove the current user ID from the 'followers' array of the user to be unfollowed (id)
      await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });

      // Remove the user ID (id) from the 'following' array of the current user
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } });

      // Send a response back confirming that the unfollow was successful
      res.status(200).json({ message: "User unfollowed successfully" });
    } else {
      // Follow the user

      // Add the current user ID to the 'followers' array of the user to be followed (id)
      await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });

      // Add the user ID (id) to the 'following' array of the current user
      await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });

      // Send notification to the user being followed

      const newNotification = new Notification({
        type: "follow", // Define the type of notification as 'follow'
        from: req.user._id, // The current user (who is following) is the sender of the notification
        to: userToModify._id, // The user being followed is the recipient of the notification
      });

      // Save the notification in the database to notify the user about the follow event
      await newNotification.save();

      // Send a response back confirming that the follow was successful
      res.status(200).json({ message: "User followed successfully" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message }); // Return a 500 status code with an error message if something goes wrong

    console.log("Error in followUnfollowUser controller", error.message); // Log the error for debugging purposes
  }
};

export const getSuggestedUsers = async (req, res) => {
  try {
    const userId = req.user._id; // Get the current user's ID

    // Get the list of users the current user is following
    const usersFollowedByMe = await User.findById(userId).select("following");

    // Use aggregate to randomly select 10 users excluding the current user
    const users = await User.aggregate([
      {
        $match: {
          _id: { $ne: userId }, // Exclude the current user
        },
      },
      { $sample: { size: 10 } }, // Randomly select 10 users
    ]);

    // Filter out users that the current user is already following
    const filteredUsers = users.filter(
      (user) => !usersFollowedByMe.following.includes(user._id)
    );

    // Select the first 4 users as suggestions
    const suggestedUsers = filteredUsers.slice(0, 4);

    // Remove the password field from the suggested users for security
    suggestedUsers.forEach((user) => (user.password = null)); // Does not update the database. Users still have access to their password

    // Return the suggested users in the response
    res.status(200).json(suggestedUsers);
  } catch (error) {
    console.log("Error in getSuggestedUsers: ", error.message);
    res.status(500).json({ error: error.message }); // Return error if something fails
  }
};
// 1:31:20
