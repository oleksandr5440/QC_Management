# QC Management System

A comprehensive Quality Control management system designed for efficient warehouse inventory and quality tracking. The application provides robust data management and reporting capabilities for industrial and logistics operations.

## Tech Stack

- **Backend**: Flask with SQLAlchemy
- **Database**: PostgreSQL
- **Frontend**: React (in development)
- **Server**: Gunicorn
- **Authentication**: JWT

## Project Structure

- `app.py`: Main Flask application with API routes
- `models.py`: SQLAlchemy models defining database schema
- `main.py`: Entry point for Gunicorn server
- `qc_management.py`: CLI tool for running the application
- `frontend/`: React frontend (in development)

## API Endpoints

### Authentication
- `POST /api/auth/token`: Login and get JWT token
- `POST /api/auth/register`: Register new user
- `GET /api/auth/users/me`: Get current user info
- `PUT /api/auth/users/me`: Update current user info
- `GET /api/auth/users`: Admin only - list all users
- `PUT /api/auth/users/{user_id}`: Admin only - update specific user

### Lookups
- `GET /api/lookups/types`: Get all lookup types
- `GET /api/lookups/types/{lookup_type_id}`: Get specific lookup type

### Dashboard
- `GET /api/dashboard`: Get dashboard data

## Running the Application

The application runs on Replit using Gunicorn, which is configured in the workflow.

### Using Replit Workflow:
The application can be run using the configured Replit workflow:
- "Start application": Runs the Flask backend with Gunicorn

### Using Shell Scripts:
We've provided several shell scripts to simplify development:

1. Run both backend and frontend:
```bash
./start_app.sh
```

2. Run only the backend:
```bash
gunicorn --bind 0.0.0.0:5000 --workers 1 --reuse-port --reload main:app
```

3. Run only the frontend:
```bash
cd frontend && npm start
```

### Database Setup:
To seed the database with initial test data:
```bash
python seed_db.py
```

### Default Users:
- Admin: username `admin`, password `admin123`
- Inspector: username `inspector`, password `inspector123`

## Data Model

The system tracks:
- Products (panels)
- QC sessions and attributes
- Warehouse inventory
- Part types and shipments
- Users with different roles (inspector, manager, admin)