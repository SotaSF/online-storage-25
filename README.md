<<<<<<< HEAD
# File Storage Application

A full-stack web application for secure file storage with user authentication and management features.

## Features

- User Authentication (Sign up, Login, Forgot Password)
- File Upload and Management
- Storage Usage Tracking
- Secure File Storage
- Modern UI with Material-UI
- Responsive Design

## Tech Stack

- Frontend:
  - React
  - TypeScript
  - Material-UI
  - React Router
  - Axios

- Backend:
  - Node.js
  - Express
  - MongoDB
  - JWT Authentication
  - Multer (File Upload)

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd file-storage-app
```

2. Install backend dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
```

4. Create a `.env` file in the backend directory with the following variables:
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/file-storage
JWT_SECRET=your_jwt_secret
EMAIL_SERVICE=gmail
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=noreply@filestorage.com
```

## Running the Application

1. Start the backend server:
```bash
# From the root directory
npm run server
```

2. Start the frontend development server:
```bash
# From the frontend directory
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## API Endpoints

### Authentication
- POST `/api/users` - Register new user
- POST `/api/users/login` - User login
- POST `/api/users/forgotpassword` - Request password reset
- PUT `/api/users/resetpassword/:resettoken` - Reset password

### Files
- POST `/api/files` - Upload file
- GET `/api/files` - Get all user files
- GET `/api/files/:id` - Download file
- DELETE `/api/files/:id` - Delete file

### User
- GET `/api/users/me` - Get user profile and storage info

## Security Features

- Password Hashing
- JWT Authentication
- Protected Routes
- File Access Control
- Storage Limits
# online-storage-25
>>>>>>> 1666dfda5fc0b6f2318bee79729279f4929d4a14
