const mongoose = require("mongoose");
const findOrCreate = require("mongoose-findorcreate");

// Define a task schema
const taskSchema = new mongoose.Schema({
    name: { type: String, required: true },
    day: { type: String, default: "" }, // Optional: Default to an empty string
    time: { type: String, default: "" }, // Optional: Default to an empty string
    timezone: { type: String, default: "" }, // Optional: Default to an empty string
    description: { type: String, default: "" }, // Optional: Default to an empty string
    googleCalendarLink: { type: String, default: null }, // Store the event link
}, { _id: true }); // Ensure `_id` is created for each task

// Define the user schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    googleId: { type: String, unique: true }, // Ensure unique Google ID
    googleTokens: {
        access_token: { type: String, default: null },
        refresh_token: { type: String, default: null },
        scope: { type: String, default: null },
        token_type: { type: String, default: null },
        expiry_date: { type: Number, default: null },
    },
    items: [taskSchema], // Reference the task schema for the items
}, {
    timestamps: true, // Automatically add `createdAt` and `updatedAt` timestamps
});

// Add the `findOrCreate` plugin
userSchema.plugin(findOrCreate);

// Export the user model
module.exports = mongoose.model("User", userSchema);
