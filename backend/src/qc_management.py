#!/usr/bin/env python3
"""
Command-line interface for the QC Management System.
This script serves as an entry point for running different components of the application.
"""
import os
import sys
import argparse
import subprocess
from backend.src.main import app as flask_app

def run_backend(host="0.0.0.0", port=5000, debug=True):
    """Run the Flask backend server."""
    print(f"Starting backend server at http://{host}:{port}...")
    flask_app.run(
        host=host,
        port=port,
        debug=debug
    )

def run_frontend(port=3000):
    """Run the frontend React development server."""
    print(f"Starting frontend development server on port {port}...")
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend")
    os.chdir(frontend_dir)
    subprocess.run(["npm", "start"])

def main():
    """Entry point for the command-line interface."""
    parser = argparse.ArgumentParser(description="QC Management System Command-Line Interface")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Backend parser
    backend_parser = subparsers.add_parser("backend", help="Run the backend server")
    backend_parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to bind to")
    backend_parser.add_argument("--port", type=int, default=5000, help="Port to bind to")
    backend_parser.add_argument("--no-reload", action="store_true", help="Disable auto-reload")

    # Frontend parser
    frontend_parser = subparsers.add_parser("frontend", help="Run the frontend development server")
    frontend_parser.add_argument("--port", type=int, default=3000, help="Port to bind to")

    # Full stack parser
    full_parser = subparsers.add_parser("full", help="Run both backend and frontend servers")

    args = parser.parse_args()

    if args.command == "backend":
        run_backend(args.host, args.port, not args.no_reload)
    elif args.command == "frontend":
        run_frontend(args.port)
    elif args.command == "full":
        # For simplicity, we'll just run the backend for now
        run_backend()
    else:
        parser.print_help()
        return 1

    return 0

if __name__ == "__main__":
    sys.exit(main())