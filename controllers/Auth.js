const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const mailSender = require("../utils/mailsender");
const OTP = require("../models/OTP");
const User = require("../models/user");
const passport = require("passport");
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
const bodyParser = require("body-parser");
const { google } = require('googleapis');

require("dotenv").config();

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id)
        .then(user => done(null, user))
        .catch(err => done(err, null));
});

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/github/todo",
    scope: ['user:email'] 
}, function (accessToken, refreshToken, profile, done) {
    const email = profile.emails[0] ? profile.emails[0].value : null;
    const { id, displayName } = profile;
    User.findOrCreate({ githubId: id, name: displayName, email: email }, function (err, user) {
        if (err) {
            return done(err);
        }
        return done(null, user);
    });
}));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/todo",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.events'],
}, (accessToken, refreshToken, profile, done) => {
    const { id, displayName, emails } = profile;
    const email = emails[0].value;
    User.findOrCreate({ googleId: id, name: displayName, email: email }, function (err, user) {
        if (err) {
            return done(err);
        }
        return done(null, user);
    });
}));

exports.sendotp = async (req, res) => {
    try {
        const email = req.body.email;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required to send OTP',
            });
        }

        const checkPresent = await User.findOne({ email });
        if (checkPresent) {
            return res.status(401).json({
                success: false,
                message: 'User already registered',
            });
        }

        var otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        });

        let result = await OTP.findOne({ otp: otp });
        while (result) {
            otp = otpGenerator.generate(6, {
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false,
            });
            result = await OTP.findOne({ otp: otp });
        }

        const otpPayload = { email, otp };
        await OTP.create(otpPayload);

        res.status(200).render("new2", { successMessage: "OTP Sent Successfully", emailText: email });

    } catch (error) {
        console.log(error.message);
        return res.status(500).render("new1", { errorMessage: "Error occurred while sending OTP" });
    }
};

exports.signUp = async (req, res) => {
    try {
        const { firstName, lastName, email, password, otp } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).render("new1", { errorMessage: "User Already Registered !" });
        }

        const response = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1);
        if (response.length === 0 || otp !== response[0].otp) {
            return res.status(400).render("new1", { errorMessage: "The OTP is not valid" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const fullName = firstName + " " + lastName;
        const defaultItems = [
            { name: "Hey👋 " + fullName },
            { name: "Welcome to your todolist 💝" }
        ];

        await User.create({
            email,
            name: fullName,
            password: hashedPassword,
            items: defaultItems,
        });

        return res.status(200).redirect('/');

    } catch (error) {
        console.error(error);
        return res.status(500).render("new1", {
            errorMessage: `Email validation failed. Please try again later`
        });
    }
};

const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/auth/google/calendar/callback' // Redirect URI
);

exports.getCalendarAuthURL = (req, res) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline', // Ensures a refresh token is issued
        prompt: 'consent',      // Forces the consent screen to appear every time
        scope: [
            'profile',
            'email',
            'https://www.googleapis.com/auth/calendar.events',
        ],
    });
    res.redirect(authUrl);
};

exports.googleCalendarCallback = async (req, res) => {
    try {
        const code = req.query.code;

        if (!req.user) {
            const token = req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");
            if (!token) {
                return res.status(400).send("User authentication required.");
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id);
        }

        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            "http://localhost:3000/auth/google/calendar/callback"
        );

        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        console.log("Tokens received:", tokens);

        // Save tokens to the database
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { googleTokens: tokens },
            { new: true }
        );

        if (!updatedUser) {
            console.error("Failed to update user with Google tokens.");
            return res.status(404).send("User not found.");
        }

        // Verify tokens are saved
        const userAfterUpdate = await User.findById(req.user.id);
        console.log("User tokens after saving:", userAfterUpdate.googleTokens);

        res.redirect("/todo");
    } catch (error) {
        console.error("Error during Google OAuth callback:", error.message);
        res.status(500).send("Failed to authenticate with Google Calendar.");
    }
};


exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email.toLowerCase();

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(401).render("login", {
                errorMessage: "No User Found",
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).render("login", {
                errorMessage: "Incorrect Password",
            });
        }

        const token = jwt.sign(
            { email: user.email, id: user.id, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        user.token = token;
        await user.save();

        res.cookie("token", token, {
            expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            httpOnly: true,
        });

        req.login(user, (err) => {
            if (err) {
                console.error("Error logging in:", err.message);
                return res.status(500).render("login", {
                    errorMessage: "Something went wrong during login.",
                });
            }
            res.redirect("/todo");
        });
    } catch (error) {
        console.error("Error in login:", error.message);
        return res.status(500).render("login", {
            errorMessage: "Login Failure. Please Try Again.",
        });
    }
};
