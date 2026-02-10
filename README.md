[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/assignment-invitations/764de04399dba3d18619b585ada40536/status)

#  Chatroom Website (Node.js + Express + EJS + MariaDB)

This project implements a **multi-user Chatroom web application** using  
**Node.js**, **Express**, **EJS**, and **MariaDB**, as part of the *Internet Programming* course.

The application allows users to register, log in securely, send messages in a shared chatroom, and persist all data in a relational database.

---

## 👥 Author

 ROMI SINIZKEY

- **Emails:**
    - sinizromi@gmail.com


---

## 🧩 Features

- Express.js server built on Node.js
- Server-side rendering using EJS
- User authentication system:
    - Two-step user registration
    - User login
    - Session-based authentication (`express-session`)
    - Password hashing using `bcrypt`
- Chatroom functionality:
    - Sending messages
    - Viewing message history
    - Editing and deleting messages by the message owner
    - Searching messages in the database
- Database layer:
    - MariaDB relational database
    - Sequelize ORM
    - User and Message models
- Docker support:
    - Docker Compose setup for the database
- Error handling:
    - 404 and 500 error pages
    - Centralized error middleware

---

## 🗂 Project Structure

```text
ex5-express-orramatar_romisinizkey/
├─ app.js
├─ bin/
├─ controllers/
├─ middleware/
├─ models/
├─ routes/
├─ views/
│  ├─ includes/
│  │  ├─ head.ejs
│  │  └─ foot.ejs
│  ├─ login.ejs
│  ├─ register.ejs
│  ├─ chatroom.ejs
│  └─ error.ejs
├─ public/
│  ├─ stylesheets/
│  │  └─ style.css
│  └─ JS/
│     └─ chatroom.js  
└─ mydatabase-docker/
   └─ docker-compose.yml
```

---
## ⚙️ Configuration

The application uses environment variables for configuration.

### Required variables:
- `SESSION_SECRET` – session signing secret (optional, defaults to dev value)

Database credentials are configured in the Docker Compose file  
and **must not be changed**, according to course instructions.

---
## 🍪 Sessions & Cookies

- Authentication is handled using server-side sessions (`express-session`)
- User registration data is temporarily stored using cookies
- Registration cookie timeout is **30 seconds**, as required by the assignment
- If the timeout expires, the registration process is reset
---

## 🔄 Chat Updates & Polling

- Chat messages are retrieved using REST API polling
- Polling interval is configurable via a constant
- All users see the same chat content in the same order
- Chat content updates immediately after:
    - Message creation
    - Message deletion
    - Message edit
  
---

## 🔐 Authorization Rules

- Only authenticated users can access the chatroom
- Only the message owner can:
    - Edit their messages
    - Delete their messages
- All REST API routes are protected against unauthorized access
---

## 🧪 Validation Rules
### Registration

- Valid email address

- First name / Last name:

    - English letters only

    - Length between 3 and 32 characters

- All inputs are trimmed (whitespace-only input is invalid)

### Password

- Stored only in hashed form using bcrypt

### Messages

- Cannot be empty

- Can only be sent by logged-in users

---
## 💻 How to Run

### 1️⃣ Install Dependencies
```bash
npm install
```

---

### #️⃣ Start the Database (MariaDB)

```bash
cd mydatabase-docker
docker-compose up -d
```

---
### 3️⃣ Run the Server
npm start
---

### 4️⃣ Open the Application

Open your browser and navigate to:
http://localhost:3000

---
## 🌐 Assumptions

- No frontend frameworks (such as React or Vue) are used

- All data is stored in a relational database

- Authentication is session-based (no JWT)

- The project is intended to run locally

- Docker is used only for the database layer
---

## 🔐 Security

- Passwords are hashed using bcrypt before storage

- Sessions are managed on the server

- Only authenticated users can access the chatroom and send messages

---

## 🧪 Validation Rules
#### Username

- English letters only

- Length between 3 and 32 characters

#### Password

- Stored only in hashed form

#### Messages

- Cannot be empty

- Can only be sent by logged-in users
---
## 📌 Notes

- Sequelize is used to separate database logic from application logic

- The codebase is modular and easy to maintain

- The project follows the academic requirements of the course

- Rendering is performed using EJS templates
- 
---
## 🧠 Design Decisions & Limitations

- WebSockets were intentionally not used, according to course requirements
- The database layer is fully handled via Sequelize ORM
- Client-side state is minimal; the server is the single source of truth
- The application is intended for local development only
---

### ✅ Summary

- This project demonstrates a complete Express.js web application, including:

- User authentication

- Persistent storage with MariaDB

- Server-side rendering using EJS

- All implemented according to best practices taught in the course.
