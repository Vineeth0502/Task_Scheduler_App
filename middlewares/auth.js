// auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { google } = require("googleapis"); // Ensure google is imported
require("dotenv").config();

exports.auth = async (req, res, next) => {
    try {
        // Check if the user is authenticated via Passport
        if (req.isAuthenticated && req.isAuthenticated()) {
            return next();
        }

        // Check for JWT token in cookies, body, or Authorization header
        const token =
            req.cookies.token ||
            req.body.token ||
            req.header("Authorization")?.replace("Bearer ", ""); // Ensure there's a space after "Bearer"

        if (!token) {
            return res.status(401).render("login", { errorMessage: "JWT Token Missing" });
        }

        try {
            // Verify the JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Attach the decoded user information to the request
            req.user = decoded;

            // Manually set a custom property for tracking user authentication
            req.userVerified = true;

            next(); // Proceed to the next middleware
        } catch (error) {
            return res.status(401).render("login", { errorMessage: "Token is Invalid" });
        }
    } catch (error) {
        console.error("Error in auth middleware:", error.message);
        return res.status(500).render("login", { errorMessage: "Something went wrong" });
    }
};

exports.googleCalendarCallback = async (req, res) => {
    try {
        const code = req.query.code;

        // Ensure the JWT token is used to retrieve the user if req.user is undefined
        if (!req.user) {
            console.log("req.user is undefined, attempting to retrieve user via token.");
            const token = req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");
            
            if (!token) {
                console.error("Error: No token available to retrieve user.");
                return res.status(400).send("User authentication required before accessing Google Calendar.");
            }

            // Decode the JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id);

            if (!req.user) {
                console.error("Error: User not found in the database.");
                return res.status(404).send("User not found.");
            }
        }

        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            "http://localhost:3000/auth/google/calendar/callback"
        );

        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        console.log("Tokens received:", tokens);

        // Save tokens in the user's record
        req.user.googleTokens = tokens;
        await User.findByIdAndUpdate(req.user.id, { googleTokens: tokens });

        res.redirect("/todo"); // Redirect to tasks page
    } catch (error) {
        console.error("Error getting tokens from Google:", error.message);
        return res.status(500).render("error", {
            errorMessage: "Failed to authenticate with Google Calendar. Please try again.",
        });
    }
};

