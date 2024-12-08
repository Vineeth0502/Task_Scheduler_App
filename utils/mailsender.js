const nodemailer = require("nodemailer");

const mailSender = async(email,title,body) => {
    try {
        let transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: 587, // Use 465 if using secure: true
            secure: false, // true for port 465, false for 587
            auth: {
                user: process.env.MAIL_USER, // Your email address
                pass: process.env.MAIL_PASS, // Your app password
            },
        });
        

        let info = await transporter.sendMail({
            from: 'My Todo App',
            to: `${email}`,
            subject: `${title}`,
            html: `${body}`
        })

        return info;
        
    } catch (error) {
        console.log("Error Occured at MailSender: ", error.message);
    }
}

module.exports = mailSender;