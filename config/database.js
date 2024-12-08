const mongoose = require("mongoose");
require("dotenv").config();

exports.connect = () => {
    mongoose.connect("mongodb+srv://vineethketham:Axxmyn0iiuTfyogL@cluster0.glfyj.mongodb.net/", {
        useNewUrlParser: true,
        useUnifiedTopology:true,
    })
    .then(() => console.log("Database Connected Successfully"))
    .catch( (error) => {
        console.log("Database Connection Failed");
        console.error(error);
        process.exit(1);
    } )
};