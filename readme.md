# Task Scheduler Application

This is a **Task Scheduler Application** built using **Node.js**, **Express.js**, and **Google Calendar API**. The app allows users to manage tasks efficiently and integrates with Google Calendar to synchronize events seamlessly. It features a modern, responsive UI and uses animations and gradient backgrounds to provide a visually appealing user experience.

---

## Features

### Core Features
1. **Task Management:**
   - Create, view, update, and delete tasks.
   - Add descriptions, dates, times, and time zones to each task.

2. **Google Calendar Integration:**
   - Synchronize tasks with your Google Calendar.
   - Display upcoming Google Calendar events in a structured format.

3. **User Authentication:**
   - Log in or sign up using email and password.
   - OAuth integration for Google and GitHub login options.

4. **Interactive UI:**
   - Attractive gradient backgrounds.
   - Smooth animations using AOS (Animate on Scroll).
   - Hover effects for buttons, cards, and task items.

### Frontend Features
- **Responsive Design:** Optimized for desktop and mobile devices.
- **Modern Styling:** Styled using `Poppins` font and a vibrant color palette.
- **Dynamic Calendar:** Displays tasks and events on an interactive FullCalendar view.

### Backend Features
- **REST API:** Endpoints for managing tasks and user authentication.
- **Google API Integration:** Fetch events from Google Calendar.
- **Database Integration:** Persistent task storage using a database (MongoDB recommended).

---

## Installation

### Prerequisites
1. **Node.js**: Ensure Node.js is installed on your system.
2. **MongoDB**: Install and configure MongoDB for database management.
3. **Google API Credentials**: Set up a Google Cloud project and enable the Calendar API.

### Steps
1. **Clone the Repository:**
   ```bash
   git clone <repository-url>
   cd Task_Scheduler_App
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env` file in the root directory and add the following variables:
   ```env
   PORT=3000
   MONGODB_URI=<your-mongodb-uri>
   GOOGLE_CLIENT_ID=<your-google-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-client-secret>
   SESSION_SECRET=<random-string>
   ```

4. **Run the Application:**
   ```bash
   npm start
   ```

5. **Access the Application:**
   Open your browser and navigate to `http://localhost:3000`.

---

## Usage

### Task Management
1. **Add a Task:**
   - Enter task details like name, date, time, and timezone.
   - Submit to save the task.

2. **View Tasks:**
   - Tasks are displayed in a list and on the calendar.

3. **Edit or Delete Tasks:**
   - Edit task names inline or delete tasks using the checkbox feature.

### Google Calendar Integration
1. **Synchronize Events:**
   - Authenticate with your Google account.
   - View upcoming events from your Google Calendar.

2. **Navigate Calendar:**
   - Use the interactive calendar to browse through days, weeks, or months.

---

## File Structure

```
Task_Scheduler_App/
├── public/                 # Static files (CSS, JS, images)
├── views/                  # EJS templates for frontend pages
│   ├── header.ejs
│   ├── footer.ejs
│   ├── tasks.ejs           # Main task management page
│   ├── calendar.ejs        # Google Calendar events page
├── routes/                 # Express.js route handlers
│   ├── index.js            # Main routes
│   ├── auth.js             # Authentication routes
│   ├── google.js           # Google API integration
├── controllers/            # Application logic
├── models/                 # MongoDB models
│   ├── Task.js             # Task schema
│   ├── User.js             # User schema
├── .env.example            # Example environment variables
├── package.json            # Project dependencies
├── README.md               # Project documentation
```

---

## Dependencies

### Backend
- **Node.js**: Runtime environment.
- **Express.js**: Web framework.
- **Mongoose**: MongoDB object modeling.
- **Passport.js**: User authentication.
- **Google APIs**: Integration with Google Calendar.

### Frontend
- **EJS**: Embedded JavaScript templating.
- **FullCalendar**: Interactive calendar component.
- **AOS (Animate on Scroll)**: Animation library.
- **Font Awesome**: Icon library.

---

## Contributing

1. Fork the repository.
2. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Description of changes"
   ```
4. Push your branch:
   ```bash
   git push origin feature-name
   ```
5. Open a pull request.

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.

---

## Acknowledgments

- **Google Developers**: For providing the Calendar API.
- **FullCalendar.js**: For the interactive calendar component.
- **Font Awesome**: For icons used in the UI.
- **AOS**: For smooth animations.
- **Community Contributors**: For ongoing support and contributions.

---

Enjoy using the Task Scheduler Application! If you encounter any issues or have feature requests, feel free to open an issue on GitHub.

