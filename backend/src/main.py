"""
Flask application for Quality Control Management System.
This is the main entry point for the Gunicorn server.
"""
from app import app

if __name__ == "__main__":
    from waitress import serve
    serve(app, host="0.0.0.0", port=5000)
