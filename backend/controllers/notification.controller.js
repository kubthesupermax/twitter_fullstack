import Notification from "../models/notification.model.js";

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id; // Get the authenticated user's ID

    // Retrieve notifications for the authenticated user
    const notifications = await Notification.find({ to: userId }).populate({
      path: "from",
      select: "username profileImg", // Select only the username and profile image fields
    });

    await Notification.updateMany({ to: userId }, { read: true }); // Mark all notifications as read

    res.status(200).json(notifications);
  } catch (error) {
    console.log("Error in getNotifications function", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.deleteMany({ to: userId });

    res.status(200).json({ message: "Notifications deleted successfully" });
  } catch (error) {
    console.log("Error in deleteNotifications function", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/*
// Did the first half
export const deleteNotification = async (req, res) => {
  try {
    const { id: notificationId } = req.params;
    const userId = req.user._id;
    const notification = await Notification.findById(notificationId);

    // Check if the notification exists
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Check if the authenticated user is the recipient of the notification
    if (notification.to.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "You are not authorized to delete this notification" });
    }

    // Delete the notification
    await Notification.findByIdAndDelete(notificationId);

    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error in deleteNotification function:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
*/
