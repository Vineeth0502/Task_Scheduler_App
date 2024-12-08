const express = require("express");
const passport = require("passport");
const { sendotp, signUp, login } = require("../controllers/Auth");
const { addTodo, getTodo, deleteTodo } = require("../controllers/crud");
const { auth } = require("../middlewares/auth");
const User = require("../models/user");
const { google } = require("googleapis");

const router = express.Router();

// Serve static files from the "public" folder
router.use(express.static("public"));

// Routes for OTP and user registration
router.post("/sendotp", sendotp);

router.get("/register", (req, res) => {
    res.render("new1", { errorMessage: null, successMessage: null });
});

router.post("/register", signUp);

// Login and logout routes
router.get("/", (req, res) => {
    res.render("login", { errorMessage: null });
});

router.post("/", login);

router.get("/logout", (req, res) => {
    req.logout(() => {
        res.clearCookie("token");
        res.redirect("/");
        console.log("User logout successfully");
    });
});

// Google authentication routes
router.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get("/auth/google/todo",
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
        res.redirect("/todo");
    }
);

// GitHub authentication routes
router.get("/auth/github",
    passport.authenticate("github", { scope: ["user:email"] })
);

router.get("/auth/github/todo",
    passport.authenticate("github", { failureRedirect: "/" }),
    (req, res) => {
        res.redirect("/todo");
    }
);

// Google Calendar authorization route
router.get("/auth/google/calendar", auth, async (req, res) => {
    const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        "http://localhost:3000/auth/google/calendar/callback"
    );

    const authURL = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent", // Ensures the refresh token is generated
        scope: ["https://www.googleapis.com/auth/calendar.events"],
    });

    res.redirect(authURL);
});

// Google Calendar callback route
router.get("/auth/google/calendar/callback", async (req, res) => {
    const code = req.query.code;

    const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        "http://localhost:3000/auth/google/calendar/callback"
    );

    try {
        const { tokens } = await oAuth2Client.getToken(code);
        console.log("Tokens received:", tokens);

        if (!req.user) {
            console.error("User not authenticated. Cannot save tokens.");
            return res.status(401).send("User authentication required.");
        }

        // Save tokens persistently in the database
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { googleTokens: tokens },
            { new: true }
        );

        if (!updatedUser) {
            console.error("Failed to update user with tokens. User not found.");
            return res.status(404).send("User not found.");
        }

        console.log("Tokens successfully saved to user:", updatedUser.googleTokens);
        res.redirect("/todo");
    } catch (error) {
        console.error("Error during Google OAuth callback:", error.message);
        res.status(500).send("Failed to authenticate with Google Calendar.");
    }
});


// Google Calendar event listing
router.get("/google-calendar", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user || !user.googleTokens || !user.googleTokens.access_token) {
            return res.redirect("/auth/google/calendar");
        }

        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            "http://localhost:3000/auth/google/calendar/callback"
        );

        oAuth2Client.setCredentials(user.googleTokens);

        const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

        const events = await calendar.events.list({
            calendarId: "primary",
            maxResults: 10,
            singleEvents: true,
            orderBy: "startTime",
        });

        const eventList = events.data.items.map(event => ({
            summary: event.summary,
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
        }));

        res.render("google-calendar", { events: eventList });
    } catch (error) {
        console.error("Error fetching Google Calendar events:", error.message);
        res.status(500).send("Failed to fetch Google Calendar events.");
    }
});

// Test Google Calendar integration
router.get("/test-calendar", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user || !user.googleTokens || !user.googleTokens.access_token) {
            return res.status(401).send("No Google tokens available. Please authenticate with Google Calendar.");
        }

        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            "http://localhost:3000/auth/google/calendar/callback"
        );

        oAuth2Client.setCredentials(user.googleTokens);

        const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

        const task = {
            name: "Test Event",
            day: "2024-12-08",
            time: "10:00",
            timezone: "CST",
            description: "Testing Google Calendar Integration",
        };

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

        const response = await calendar.events.insert({
            calendarId: "primary",
            resource: event,
        });

        const eventLink = response.data.htmlLink;
        console.log("Event successfully created in Google Calendar:", eventLink);

        res.send(`Event created successfully: <a href="${eventLink}" target="_blank">View Event</a>`);
    } catch (error) {
        console.error("Error creating Google Calendar event:", error.message);
        res.status(500).send("Failed to create Google Calendar event.");
    }
});

// Todo-related routes
router.get("/todo", auth, getTodo);
router.post("/todo", auth, addTodo);
router.post("/delete", auth, deleteTodo);

module.exports = router;
