#!/bin/bash

# Set the PYTHONPATH to include the current directory
export PYTHONPATH=$PYTHONPATH:$(pwd)

# Start Flask backend in background
echo "Starting Flask backend on port 5000..."
cd src && python main.py
BACKEND_PID=$!

# Give backend time to start
sleep 2
echo "Backend started with PID: $BACKEND_PID"

