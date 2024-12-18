const mongoose = require("mongoose");
require("dotenv").config();

exports.connect = () => {
    mongoose.connect(process.env.MONGODB_URI, { // Use the environment variable
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("Database Connected Successfully"))
    .catch((error) => {
        console.log("Database Connection Failed");
        console.error(error);
        process.exit(1); // Exit process with failure
    });
};
