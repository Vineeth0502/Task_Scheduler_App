const User = require("../models/user");
const { google } = require("googleapis");
const mailSender = require('../utils/mailsender');
const alertTemplate = require("../mailTemplates/alertTemplate");

// Function to create a Google Calendar Event
async function createGoogleCalendarEvent(task, tokens) {
    console.log("createGoogleCalendarEvent called with task:", task, "tokens:", tokens);

    try {
        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            "http://localhost:3000/auth/google/calendar/callback"
        );
        oAuth2Client.setCredentials(tokens);

        console.log("Google OAuth client initialized.");

        const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

        // Construct event object
        const event = {
            summary: task.name,
            description: task.description,
            start: {
                dateTime: `${task.day}T${task.time}:00`,
                timeZone: task.timezone,
            },
            end: {
                dateTime: `${task.day}T${task.time}:00`,
                timeZone: task.timezone,
            },
        };

        console.log("Creating Google Calendar event with data:", event);

        const response = await calendar.events.insert({
            calendarId: "primary",
            resource: event,
        });

        console.log("Event successfully created in Google Calendar:", response.data.htmlLink);
        return response.data.htmlLink; // Return the event link
    } catch (error) {
        console.error("Error creating Google Calendar event:", error.message);
        if (error.response && error.response.data) {
            console.error("API Error Details:", error.response.data);
        }
        throw error;
    }
}

// Function to delete a Google Calendar Event
async function deleteGoogleCalendarEvent(eventId, tokens) {
    try {
        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            "http://localhost:3000/auth/google/calendar/callback"
        );
        oAuth2Client.setCredentials(tokens);

        const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

        await calendar.events.delete({
            calendarId: "primary",
            eventId,
        });

        console.log("Google Calendar event deleted successfully.");
    } catch (error) {
        console.error("Error deleting Google Calendar event:", error);
        throw error;
    }
}

// Function to update a Google Calendar Event
async function updateGoogleCalendarEvent(eventId, task, tokens) {
    try {
        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            "http://localhost:3000/auth/google/calendar/callback"
        );
        oAuth2Client.setCredentials(tokens);

        const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
        const event = {
            summary: task.name,
            description: task.description,
            start: {
                dateTime: `${task.day}T${task.time}:00`,
                timeZone: task.timezone,
            },
            end: {
                dateTime: `${task.day}T${task.time}:00`,
                timeZone: task.timezone,
            },
        };

        await calendar.events.update({
            calendarId: "primary",
            eventId,
            resource: event,
        });

        console.log("Google Calendar event updated successfully.");
    } catch (error) {
        console.error("Error updating Google Calendar event:", error);
        throw error;
    }
}

// Add a new task
exports.addTodo = async (req, res) => {
    console.log("addTodo called with request body:", req.body);

    const { name, day, time, timezone, description } = req.body;

    if (!name || !day || !time || !timezone || !description) {
        return res.status(400).send("All fields are required.");
    }

    const task = {
        name,
        day: new Date(`${day}T00:00:00Z`).toISOString().split("T")[0],
        time,
        timezone,
        description,
    };

    try {
        console.log("Adding task to user:", req.user.id);

        const updatedList = await User.findOneAndUpdate(
            { _id: req.user.id },
            { $push: { items: task } },
            { new: true }
        );

        if (updatedList) {
            console.log("Task added successfully:", task);

            const user = await User.findById(req.user.id);
            console.log("Retrieved user for Google Calendar:", user);

            if (user && user.googleTokens && user.googleTokens.access_token) {
                console.log("Google tokens found. Checking token validity...");

                const oAuth2Client = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET,
                    "http://localhost:3000/auth/google/calendar/callback"
                );

                oAuth2Client.setCredentials(user.googleTokens);

                // Check if access token is expired
                const now = new Date().getTime();
                if (user.googleTokens.expiry_date <= now) {
                    console.log("Access token expired. Refreshing tokens...");
                    try {
                        const { credentials } = await oAuth2Client.refreshAccessToken();
                        console.log("Tokens refreshed:", credentials);

                        // Update tokens in the database
                        user.googleTokens = credentials;
                        await user.save();
                        console.log("Refreshed tokens saved to database.");
                    } catch (err) {
                        console.error("Failed to refresh tokens:", err.message);
                        return res.status(500).send("Failed to refresh Google Calendar tokens.");
                    }
                }

                // Attempt to create the Google Calendar event
                try {
                    const eventLink = await createGoogleCalendarEvent(task, user.googleTokens);
                    console.log("Google Calendar Event Link:", eventLink);

                    // Save the Google Calendar event link in the database
                    const updatedUser = await User.findOneAndUpdate(
                        { _id: req.user.id, "items.name": task.name }, // Find the task by its name
                        { $set: { "items.$.googleCalendarLink": eventLink } }, // Update the googleCalendarLink
                        { new: true }
                    );

                    if (updatedUser) {
                        console.log("Google Calendar link successfully saved to the task.");
                    } else {
                        console.error("Failed to update user with Google Calendar link.");
                    }
                } catch (error) {
                    console.error("Failed to create Google Calendar event:", error.message);
                }
            } else {
                console.log("No Google tokens available. Skipping Google Calendar integration.");
            }

            res.redirect("/todo");
        } else {
            res.status(404).send("User not found.");
        }
    } catch (err) {
        console.error("Error adding task:", err);
        res.status(500).send("Internal Server Error.");
    }
};

// Get tasks
exports.getTodo = async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            console.log("Fetching tasks for user:", req.user.id);

            const foundUser = await User.findById(req.user.id);

            console.log("User tokens in DB during getTodo:", foundUser.googleTokens);

            if (foundUser && foundUser.items.length === 0) {
                console.log("No tasks found. Adding default tasks...");
                const defaultItems = [
                    { name: `Hey👋 ${req.user.name}`, day: "", time: "", timezone: "", description: "" },
                    { name: "Welcome to your task scheduler 💝", day: "", time: "", timezone: "", description: "" },
                ];

                foundUser.items = defaultItems;
                await foundUser.save();
                console.log("Default Tasks Inserted Successfully");
            }

            const formattedDate = new Date().toLocaleDateString();
            console.log("User login successfully");

            res.render("list", { listTitle: formattedDate, listArray: foundUser.items });
        } catch (err) {
            console.error("Error finding user tasks:", err);
            res.redirect("/");
        }
    } else {
        console.log("User not authenticated. Redirecting to login...");
        res.redirect("/");
    }
};


// Update a task
exports.updateTodo = async (req, res) => {
    const { taskId, name, day, time, timezone, description, googleCalendarEventId } = req.body;

    if (!taskId || !name || !day || !time || !timezone || !description) {
        return res.status(400).send("All fields are required.");
    }

    const task = { name, day, time, timezone, description };

    try {
        const updatedTask = await User.findOneAndUpdate(
            { "items._id": taskId },
            {
                $set: {
                    "items.$.name": name,
                    "items.$.day": day,
                    "items.$.time": time,
                    "items.$.timezone": timezone,
                    "items.$.description": description,
                },
            },
            { new: true }
        );

        if (updatedTask) {
            const user = await User.findById(req.user.id);

            if (user && user.googleTokens && user.googleTokens.access_token && googleCalendarEventId) {
                await updateGoogleCalendarEvent(googleCalendarEventId, task, user.googleTokens);
            }

            res.redirect("/todo");
        } else {
            res.status(404).send("Task not found.");
        }
    } catch (err) {
        console.error("Error updating task:", err);
        res.status(500).send("Internal Server Error.");
    }
};

// Delete a task
exports.deleteTodo = async (req, res) => {
    const { checkboxID, googleCalendarEventId } = req.body;

    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $pull: { items: { _id: checkboxID } } },
            { new: true }
        );

        if (user) {
            if (user.googleTokens && user.googleTokens.access_token && googleCalendarEventId) {
                await deleteGoogleCalendarEvent(googleCalendarEventId, user.googleTokens);
            }

            res.redirect("/todo");
        } else {
            res.status(404).send("User not found.");
        }
    } catch (err) {
        console.error("Error deleting task:", err);
        res.status(500).send("Internal Server Error.");
    }
};

// Validate time format
function isValidTimeFormat(time) {
    const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    return timePattern.test(time);
}

// Schedule a notification
function scheduleNotification(user, item) {
    console.log("Scheduling notification for task:", item);

    const [hours, minutes] = item.time.split(":").map(Number);

    const deadlineTime = new Date();
    deadlineTime.setHours(hours, minutes, 0, 0);

    const fiveMinutesBeforeDeadline = new Date(deadlineTime);
    fiveMinutesBeforeDeadline.setMinutes(deadlineTime.getMinutes() - 5);

    const currentTime = new Date();

    if (fiveMinutesBeforeDeadline <= currentTime) {
        console.log("Notification time has passed. Sending notification immediately.");
        sendNotification(user, item);
    } else {
        const delay = fiveMinutesBeforeDeadline - currentTime;
        console.log(`Notification scheduled in ${delay}ms.`);
        setTimeout(() => sendNotification(user, item), delay);
    }
}

// Send email notification
function sendNotification(user, item) {
    console.log("Sending email notification for task:", item);

    const email = user.email;
    const name = user.name;
    const title = "Task Alert";
    const body = alertTemplate(name, item.name, item.time);

    mailSender(email, title, body)
        .then(() => console.log(`Alert Email sent to ${user.name}`))
        .catch((error) => console.error("Error sending alert email:", error.message));
}
