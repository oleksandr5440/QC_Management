import os
import logging
from datetime import datetime, timedelta
from functools import wraps
import json
import io
from io import BytesIO

import pandas as pd
from flask import Flask, jsonify, request, abort, g, session, make_response, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.sql import func
from sqlalchemy import text
import jwt

from excel_export import export_qc_cw_panel_data_to_excel

from models import db, User, Product, QCSession, QCAttributeDef, QCAttributeValue 
from models import LookupType, Lookup, QCPhoto, Warehouse, PartType, PartSubtype
from models import InventorySnapshot, PartShipment, Container, ProductShipment, PartSubtypeImage
from models import ProductPart, CoatingColor, ProductColor, QCReport, ReportImage
from models import QCCWPanelData, FrameCavitiesAttribute, FrameCavitiesValue, QCCWPanelPhoto

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "postgresql://postgres:nova@localhost:5432/qc_management")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize extensions
db.init_app(app)
# Configure CORS with explicit headers - allow all origins for development
CORS(app, 
     resources={r"/*": {"origins": "*"}}, 
     supports_credentials=True,
     expose_headers=["Content-Type", "Authorization", "Content-Disposition"],
     allow_headers=["Content-Type", "Authorization", "Accept"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

# JWT Configuration
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or "your-secret-key"
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 30

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

# Helper functions for API authentication
def create_access_token(data, expires_delta=None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=1800)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # get token from Authorization header
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            # Expected format: "Bearer <token>"
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]
            
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            # Store user info in Flask g object for route function access
            g.user = db.session.query(User).filter(User.username == payload['sub']).first()
            
            if not g.user:
                return jsonify({'message': 'User not found!'}), 401
                
            if not g.user.is_active:
                return jsonify({'message': 'Inactive user!'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!'}), 401
            
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not g.user.is_admin():
            return jsonify({'message': 'Admin privileges required!'}), 403
        return f(*args, **kwargs)
    return decorated

# Create database tables if they don't exist
with app.app_context():
    db.create_all()

# Add CORS headers to all responses
@app.after_request
def add_cors_headers(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Expose-Headers', 'Content-Disposition')
    return response

# Root endpoint
@app.route("/")
def root():
    return jsonify({
        "message": "Welcome to QC Management System API",
        "documentation": "/docs"
    })

# Health check endpoint
@app.route("/health")
def health_check():
    return jsonify({"status": "healthy"})

# Authentication routes
@app.route("/api/auth/token", methods=["POST"])
@app.route("/api/auth/login", methods=["POST"])  # Additional route for frontend compatibility
def login_for_access_token():
    data = request.json
    username = data.get("username") or data.get("email")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"message": "Username and password required"}), 400
    
    # Try to find user by username or email
    user = db.session.query(User).filter(
        (User.username == username) | (User.email == username)
    ).first()
    
    # For development purposes, create a test user if not exists
    if not user:
        try:
            user = User(
                username="test",
                email="test@example.com",
                role="admin",
                department="QC",
                is_active=True
            )
            user.set_password("password")
            db.session.add(user)
            db.session.commit()
            
            # Try to find the user again
            user = db.session.query(User).filter(User.username == "test").first()
        except Exception as e:
            logger.warning(f"Could not create test user: {str(e)}")
    
    # For development, allow login with test/password
    if (username == "test" and password == "password") or (user and user.verify_password(password)):
        # Ensure we have the user object
        if not user:
            user = db.session.query(User).filter(User.username == "test").first()
            
        access_token_expires = timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username},
            expires_delta=access_token_expires
        )
        
        # Format user information for response
        user_dict = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "department": user.department,
            "is_active": user.is_active
        }
        
        return jsonify({
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_dict
        })
    else:
        return jsonify({"message": "Invalid username or password"}), 401

@app.route("/api/auth/register", methods=["POST"])
def register_user():
    data = request.json
    
    # Check if username or email already exists
    existing_user = db.session.query(User).filter(
        (User.username == data.get("username")) | (User.email == data.get("email"))
    ).first()
    
    if existing_user:
        return jsonify({"message": "Username or email already registered"}), 400
    
    # Create new user
    new_user = User(
        username=data.get("username"),
        email=data.get("email"),
        role=data.get("role", "inspector"),
        department=data.get("department", "qc"),
        is_active=True
    )
    new_user.set_password(data.get("password"))
    
    db.session.add(new_user)
    db.session.commit()
    
    # Format user response
    user_dict = {
        "id": new_user.id,
        "username": new_user.username,
        "email": new_user.email,
        "role": new_user.role,
        "department": new_user.department,
        "is_active": new_user.is_active,
        "created_at": new_user.created_at.isoformat() if new_user.created_at else None
    }
    
    return jsonify(user_dict), 201

@app.route("/api/auth/users/me", methods=["GET"])
@app.route("/api/users/me", methods=["GET"])  # Additional endpoint for frontend compatibility
def read_users_me():
    # For development, automatically return the test user
    try:
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        
        # If token is provided, try to validate it
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
                username = payload.get('sub')
                user = db.session.query(User).filter(User.username == username).first()
                
                if user:
                    # Format user response
                    user_dict = {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "role": user.role,
                        "department": user.department,
                        "is_active": user.is_active,
                        "created_at": user.created_at.isoformat() if user.created_at else None
                    }
                    return jsonify(user_dict)
            except Exception as e:
                logger.warning(f"Token validation error: {str(e)}")
        
        # No valid token or validation failed, return test user for development
        user = db.session.query(User).filter(User.username == "test").first()
        
        # If test user doesn't exist, create it
        if not user:
            try:
                user = User(
                    username="test",
                    email="test@example.com",
                    role="admin",
                    department="QC",
                    is_active=True
                )
                user.set_password("password")
                db.session.add(user)
                db.session.commit()
                
                # Get the user with ID
                user = db.session.query(User).filter(User.username == "test").first()
            except Exception as e:
                logger.warning(f"Could not create test user: {str(e)}")
        
        # Format user response for test user
        user_dict = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "department": user.department,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
        return jsonify(user_dict)
    except Exception as e:
        logger.error(f"Error in read_users_me: {str(e)}")
        return jsonify({"error": "An error occurred while retrieving user data"}), 500

@app.route("/api/auth/users/me", methods=["PUT"])
@token_required
def update_user_me():
    user = g.user
    data = request.json
    
    # Update user fields
    if "username" in data and data["username"]:
        # Check if username is already taken
        existing_user = db.session.query(User).filter(
            (User.username == data["username"]) & 
            (User.id != user.id)
        ).first()
        if existing_user:
            return jsonify({"message": "Username already taken"}), 400
        user.username = data["username"]
    
    if "email" in data and data["email"]:
        # Check if email is already taken
        existing_user = db.session.query(User).filter(
            (User.email == data["email"]) & 
            (User.id != user.id)
        ).first()
        if existing_user:
            return jsonify({"message": "Email already registered"}), 400
        user.email = data["email"]
    
    if "password" in data and data["password"]:
        user.set_password(data["password"])
    
    db.session.commit()
    
    # Format user response
    user_dict = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "department": user.department,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }
    
    return jsonify(user_dict)

@app.route("/api/auth/users", methods=["GET"])
@token_required
@admin_required
def get_users():
    skip = request.args.get("skip", 0, type=int)
    limit = request.args.get("limit", 100, type=int)
    
    users = db.session.query(User).offset(skip).limit(limit).all()
    
    # Format users list
    users_list = []
    for user in users:
        users_list.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "department": user.department,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None
        })
    
    return jsonify(users_list)

@app.route("/api/auth/users/<int:user_id>", methods=["PUT"])
@token_required
@admin_required
def update_user(user_id):
    user = db.session.get(User, user_id)
    
    if not user:
        return jsonify({"message": "User not found"}), 404
    
    data = request.json
    
    # Update user fields
    if "username" in data and data["username"]:
        # Check if username is already taken
        existing_user = db.session.query(User).filter(
            (User.username == data["username"]) & 
            (User.id != user_id)
        ).first()
        if existing_user:
            return jsonify({"message": "Username already taken"}), 400
        user.username = data["username"]
    
    if "email" in data and data["email"]:
        # Check if email is already taken
        existing_user = db.session.query(User).filter(
            (User.email == data["email"]) & 
            (User.id != user_id)
        ).first()
        if existing_user:
            return jsonify({"message": "Email already registered"}), 400
        user.email = data["email"]
    
    if "password" in data and data["password"]:
        user.set_password(data["password"])
    
    if "is_active" in data:
        user.is_active = data["is_active"]
    
    if "role" in data:
        user.role = data["role"]
        
    if "department" in data:
        user.department = data["department"]
    
    db.session.commit()
    
    # Format user response
    user_dict = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "department": user.department,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }
    
    return jsonify(user_dict)

# Lookup routes
@app.route("/api/lookups/types", methods=["GET"])
@token_required
def get_lookup_types():
    skip = request.args.get("skip", 0, type=int)
    limit = request.args.get("limit", 100, type=int)
    
    lookup_types = db.session.query(LookupType).offset(skip).limit(limit).all()
    
    # Format lookup types list
    lookup_types_list = []
    for lookup_type in lookup_types:
        lookup_types_list.append({
            "id": lookup_type.id,
            "name": lookup_type.name
        })
    
    return jsonify(lookup_types_list)

@app.route("/api/lookups/types/<int:lookup_type_id>", methods=["GET"])
@token_required
def get_lookup_type(lookup_type_id):
    lookup_type = db.session.get(LookupType, lookup_type_id)
    
    if not lookup_type:
        return jsonify({"message": "Lookup type not found"}), 404
    
    # Format lookup type response
    lookup_type_dict = {
        "id": lookup_type.id,
        "name": lookup_type.name
    }
    
    return jsonify(lookup_type_dict)

# Dashboard API endpoint
@app.route("/api/dashboard", methods=["GET"])
def get_dashboard_data():
    """Get dashboard data including counts and statistics."""
    try:
        # Get panel counts by status
        total_panels = db.session.query(func.count(Product.id)).scalar() or 0
        # If we don't have any data yet, return some sample dashboard data
        if total_panels == 0:
            return jsonify({
                "total_panels": 120,
                "passed_qc": 85,
                "pending_qc": 30,
                "failed_qc": 5,
                "shipped_panels": 65,
                "inventory_counts": {
                    "Aluminum Extrusions": 250,
                    "Glass Panels": 180,
                    "Brackets": 350,
                    "Sealant Tubes": 120,
                    "Fasteners": 1200
                },
                "panels_data": [],
                "sealant_data": [],
                "inventory_data": []
            })
        pending_panels = db.session.query(func.count(Product.id)).filter(Product.status == 'pending').scalar() or 0
        passed_panels = db.session.query(func.count(Product.id)).filter(Product.status == 'qc_passed').scalar() or 0
        shipped_panels = db.session.query(func.count(Product.id)).filter(Product.status == 'shipped').scalar() or 0
        
        # Get inventory data by type
        inventory_data = {}
        inventory_counts = {}
        
        # Get recent QC sessions
        qc_sessions = db.session.query(QCSession).order_by(QCSession.performed_at.desc()).limit(5).all()
        
        panels_data = []
        for session in qc_sessions:
            product = db.session.get(Product, session.product_id)
            inspector = db.session.get(User, session.inspector_id)
            
            panel_data = {
                "qc_id": session.id,
                "panel_number": product.product_number if product else f"Unknown-{session.product_id}",
                "inspector": inspector.username if inspector else "System",
                "date": session.performed_at.strftime("%Y-%m-%d"),
                "status": "Passed" if session.status == "passed" else "Failed",
                "type": "Standard",
                "width": "N/A",
                "height": "N/A",
                "notes": "N/A"
            }
            panels_data.append(panel_data)
        
        # Get part types
        part_subtypes = db.session.query(PartSubtype).all()
        for subtype in part_subtypes:
            part_type = db.session.get(PartType, subtype.part_type_id)
            type_name = part_type.name if part_type else "Unknown"
            
            if type_name not in inventory_data:
                inventory_data[type_name] = []
                inventory_counts[type_name] = 0
            
            # Get latest inventory snapshot
            snapshot = db.session.query(InventorySnapshot).filter(
                InventorySnapshot.part_subtype_id == subtype.id
            ).order_by(InventorySnapshot.snapshot_date.desc()).first()
            
            warehouse = None
            if snapshot:
                warehouse = db.session.get(Warehouse, snapshot.warehouse_id)
                inventory_counts[type_name] += snapshot.quantity
            
            # Add inventory item data
            inventory_data[type_name].append({
                "part_id": subtype.id,
                "type": type_name,
                "description": subtype.name,
                "size": "N/A",
                "color": "Standard",
                "quantity": snapshot.quantity if snapshot else 0,
                "warehouse": warehouse.name if warehouse else "Unknown",
                "last_update": snapshot.snapshot_date.strftime("%Y-%m-%d") if snapshot else datetime.now().strftime("%Y-%m-%d")
            })
        
        return jsonify({
            "panels_data": panels_data,
            "inventory_data": inventory_data,
            "inventory_counts": inventory_counts,
            "panel_counts": {
                "total": total_panels,
                "pending": pending_panels,
                "passed": passed_panels,
                "shipped": shipped_panels
            },
            "failed_qc": db.session.query(func.count(QCSession.id)).filter(
                QCSession.status == "failed"
            ).scalar() or 0
        })
    except Exception as e:
        logger.error(f"Error generating dashboard data: {str(e)}")
        return jsonify({"error": "Could not generate dashboard data"}), 500

# Products routes - public for development purposes
@app.route("/api/products", methods=["GET"])
def get_products():
    """Get all products data."""
    try:
        products = db.session.query(Product).order_by(Product.created_at.desc()).all()
        
        product_list = []
        for product in products:
            # Get the most recent QC session for this product if any
            qc_session = db.session.query(QCSession).filter(
                QCSession.product_id == product.id
            ).order_by(QCSession.performed_at.desc()).first()
            
            # Format product data
            product_data = {
                "id": product.id,
                "product_number": product.product_number,
                "status": product.status,
                "created_at": product.created_at.strftime("%Y-%m-%d"),
                "warehouse_id": product.warehouse_id,
                "qc_id": qc_session.id if qc_session else None,
                "qc_date": qc_session.performed_at.strftime("%Y-%m-%d") if qc_session else None,
                "inspector_id": qc_session.inspector_id if qc_session else None,
            }
            
            product_list.append(product_data)
        
        return jsonify(product_list)
    except Exception as e:
        # Log the error details
        logger.error(f"Products data error: {str(e)}")
        return jsonify({
            "error": "An error occurred while retrieving products data"
        }), 500

@app.route("/api/products", methods=["POST"])
def create_product():
    """Create a new product."""
    try:
        data = request.json
        
        # Validate required fields
        if not data.get("product_number"):
            return jsonify({"error": "Product number is required"}), 400
        
        # Check if product with same number already exists
        existing_product = db.session.query(Product).filter(
            Product.product_number == data.get("product_number")
        ).first()
        
        if existing_product:
            return jsonify({"error": "Product with this number already exists"}), 409
        
        # Create new product
        new_product = Product(
            product_number=data.get("product_number"),
            status=data.get("status", "pending"),
            warehouse_id=data.get("warehouse_id"),
            created_at=datetime.now()
        )
        
        db.session.add(new_product)
        db.session.commit()
        
        return jsonify({
            "id": new_product.id,
            "product_number": new_product.product_number,
            "status": new_product.status,
            "warehouse_id": new_product.warehouse_id,
            "created_at": new_product.created_at.strftime("%Y-%m-%d"),
            "message": "Product created successfully"
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Product creation error: {str(e)}")
        return jsonify({
            "error": "An error occurred while creating product"
        }), 500

@app.route("/api/products/<int:product_id>", methods=["GET"])
def get_product(product_id):
    """Get a specific product by ID."""
    try:
        product = db.session.get(Product, product_id)
        
        if not product:
            return jsonify({"error": "Product not found"}), 404
        
        # Get the most recent QC session for this product if any
        qc_session = db.session.query(QCSession).filter(
            QCSession.product_id == product.id
        ).order_by(QCSession.performed_at.desc()).first()
        
        # Get warehouse info
        warehouse = db.session.get(Warehouse, product.warehouse_id) if product.warehouse_id else None
        
        # Format product data
        product_data = {
            "id": product.id,
            "product_number": product.product_number,
            "status": product.status,
            "created_at": product.created_at.strftime("%Y-%m-%d"),
            "warehouse_id": product.warehouse_id,
            "warehouse_name": warehouse.name if warehouse else None,
            "warehouse_location": warehouse.location if warehouse else None,
            "qc_id": qc_session.id if qc_session else None,
            "qc_date": qc_session.performed_at.strftime("%Y-%m-%d %H:%M") if qc_session else None,
            "inspector_id": qc_session.inspector_id if qc_session else None,
        }
        
        # Add inspector info if available
        if qc_session and qc_session.inspector_id:
            inspector = db.session.get(User, qc_session.inspector_id)
            if inspector:
                product_data["inspector_name"] = inspector.username
                product_data["inspector_role"] = inspector.role
        
        return jsonify(product_data)
    except Exception as e:
        logger.error(f"Product detail error: {str(e)}")
        return jsonify({
            "error": "An error occurred while retrieving product details"
        }), 500

# QC sessions route - public for development purposes
@app.route("/api/qc/sessions", methods=["GET"])
def get_qc_sessions():
    """Get all QC sessions data."""
    try:
        qc_sessions = db.session.query(QCSession).join(
            Product, QCSession.product_id == Product.id
        ).join(
            User, QCSession.inspector_id == User.id
        ).order_by(
            QCSession.performed_at.desc()
        ).all()
        
        sessions_list = []
        for session in qc_sessions:
            # Get attribute values
            attribute_values = db.session.query(QCAttributeValue).filter(
                QCAttributeValue.qc_id == session.id
            ).all()
            
            # Format session data
            session_data = {
                "id": session.id,
                "product_id": session.product_id,
                "product_number": session.product.product_number,
                "inspector_id": session.inspector_id,
                "inspector_name": session.inspector_user.username if session.inspector_user else "Unknown",
                "performed_at": session.performed_at.strftime("%Y-%m-%d %H:%M"),
                "status": session.product.status,
                "attribute_count": len(attribute_values)
            }
            
            sessions_list.append(session_data)
        
        return jsonify(sessions_list)
    except Exception as e:
        # Log the error details
        logger.error(f"QC sessions data error: {str(e)}")
        return jsonify({
            "error": "An error occurred while retrieving QC sessions data"
        }), 500

# Inventory snapshots route - public for development purposes
@app.route("/api/inventory/inventory-snapshots", methods=["GET"])
def get_inventory_snapshots():
    """Get all inventory snapshots data."""
    try:
        snapshots = db.session.query(
            InventorySnapshot,
            PartSubtype,
            Warehouse
        ).join(
            PartSubtype, InventorySnapshot.part_subtype_id == PartSubtype.id
        ).join(
            Warehouse, InventorySnapshot.warehouse_id == Warehouse.id
        ).order_by(
            InventorySnapshot.snapshot_date.desc()
        ).all()
        
        snapshots_list = []
        for snapshot, part_subtype, warehouse in snapshots:
            # Format snapshot data
            snapshot_data = {
                "id": snapshot.id,
                "part_subtype_id": snapshot.part_subtype_id,
                "part_name": part_subtype.name,
                "warehouse_id": snapshot.warehouse_id,
                "warehouse_name": warehouse.name,
                "quantity": snapshot.quantity,
                "snapshot_date": snapshot.snapshot_date.strftime("%Y-%m-%d")
            }
            
            snapshots_list.append(snapshot_data)
        
        return jsonify(snapshots_list)
    except Exception as e:
        # Log the error details
        logger.error(f"Inventory snapshots data error: {str(e)}")
        return jsonify({
            "error": "An error occurred while retrieving inventory snapshots data"
        }), 500

# Warehouses route - public for development purposes
@app.route("/api/inventory/warehouses", methods=["GET"])
def get_warehouses():
    """Get all warehouses."""
    try:
        warehouses = db.session.query(Warehouse).all()
        
        warehouses_list = []
        for warehouse in warehouses:
            warehouse_data = {
                "id": warehouse.id,
                "name": warehouse.name,
                "location": warehouse.location
            }
            warehouses_list.append(warehouse_data)
        
        return jsonify(warehouses_list)
    except Exception as e:
        logger.error(f"Warehouses data error: {str(e)}")
        return jsonify({
            "error": "An error occurred while retrieving warehouses data"
        }), 500

# Part types route - public for development purposes
@app.route("/api/inventory/part-types", methods=["GET"])
def get_part_types():
    """Get all part types."""
    try:
        part_types = db.session.query(PartType).all()
        
        part_types_list = []
        for part_type in part_types:
            part_type_data = {
                "id": part_type.id,
                "name": part_type.name
            }
            part_types_list.append(part_type_data)
        
        return jsonify(part_types_list)
    except Exception as e:
        logger.error(f"Part types data error: {str(e)}")
        return jsonify({
            "error": "An error occurred while retrieving part types data"
        }), 500

# Part subtypes route - public for development purposes
@app.route("/api/inventory/part-subtypes", methods=["GET"])
def get_part_subtypes():
    """Get all part subtypes."""
    try:
        part_subtypes = db.session.query(PartSubtype).all()
        
        part_subtypes_list = []
        for part_subtype in part_subtypes:
            part_type = db.session.get(PartType, part_subtype.part_type_id)
            
            part_subtype_data = {
                "id": part_subtype.id,
                "part_type_id": part_subtype.part_type_id,
                "part_type_name": part_type.name if part_type else "Unknown",
                "name": part_subtype.name
            }
            part_subtypes_list.append(part_subtype_data)
        
        return jsonify(part_subtypes_list)
    except Exception as e:
        logger.error(f"Part subtypes data error: {str(e)}")
        return jsonify({
            "error": "An error occurred while retrieving part subtypes data"
        }), 500

# Individual QC session route - public for development purposes
@app.route("/api/qc/sessions/<int:session_id>", methods=["GET"])
def get_qc_session(session_id):
    """Get a specific QC session by ID."""
    try:
        session = db.session.get(QCSession, session_id)
        
        if not session:
            return jsonify({"error": "QC session not found"}), 404
        
        product = db.session.get(Product, session.product_id)
        inspector = db.session.get(User, session.inspector_id)
        
        # Get attribute values
        attribute_values = db.session.query(QCAttributeValue).filter(
            QCAttributeValue.qc_id == session.id
        ).all()
        
        attributes_list = []
        for attr_value in attribute_values:
            attribute_def = db.session.get(QCAttributeDef, attr_value.attribute_id)
            
            attribute_data = {
                "attribute_id": attr_value.attribute_id,
                "attribute_name": attribute_def.name if attribute_def else "Unknown",
                "value_numeric": float(attr_value.value_numeric) if attr_value.value_numeric is not None else None,
                "value_text": attr_value.value_text
            }
            attributes_list.append(attribute_data)
        
        # Format session data
        session_data = {
            "id": session.id,
            "product_id": session.product_id,
            "product": {
                "id": product.id,
                "product_number": product.product_number,
                "status": product.status
            } if product else None,
            "inspector_id": session.inspector_id,
            "inspector_user": {
                "id": inspector.id,
                "username": inspector.username,
                "role": inspector.role
            } if inspector else None,
            "performed_at": session.performed_at.strftime("%Y-%m-%d %H:%M"),
            "attribute_values": attributes_list,
            "status": product.status if product else "unknown"
        }
        
        return jsonify(session_data)
    except Exception as e:
        logger.error(f"QC session detail error: {str(e)}")
        return jsonify({
            "error": "An error occurred while retrieving QC session details"
        }), 500

# Create QC session route - public for development purposes
@app.route("/api/qc/sessions", methods=["POST"])
def create_qc_session():
    """Create a new QC session."""
    try:
        data = request.json
        
        # Validate required fields
        if not data.get("product_id"):
            return jsonify({"error": "Product ID is required"}), 400
        
        # Check if product exists
        product = db.session.get(Product, data.get("product_id"))
        if not product:
            return jsonify({"error": "Product not found"}), 404
        
        # Create new QC session
        new_session = QCSession(
            product_id=data.get("product_id"),
            inspector_id=data.get("inspector_id"),
            performed_at=datetime.now()
        )
        
        db.session.add(new_session)
        db.session.commit()
        
        # Process attribute values if provided
        if data.get("attribute_values") and isinstance(data["attribute_values"], list):
            for attr_value in data["attribute_values"]:
                # Create attribute value
                new_value = QCAttributeValue(
                    qc_id=new_session.id,
                    attribute_id=attr_value.get("attribute_id"),
                    value_numeric=attr_value.get("value_numeric"),
                    value_text=attr_value.get("value_text"),
                    value_boolean=attr_value.get("value_boolean"),
                    lookup_id=attr_value.get("lookup_id")
                )
                
                db.session.add(new_value)
        
        # Update product status to qc_passed (simplification for prototype)
        product.status = "qc_passed"
        
        db.session.commit()
        
        return jsonify({
            "id": new_session.id,
            "product_id": new_session.product_id,
            "inspector_id": new_session.inspector_id,
            "performed_at": new_session.performed_at.strftime("%Y-%m-%d %H:%M"),
            "message": "QC session created successfully"
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"QC session creation error: {str(e)}")
        return jsonify({
            "error": "An error occurred while creating QC session"
        }), 500

# Part shipments route - public for development purposes
@app.route("/api/inventory/part-shipments", methods=["GET"])
def get_part_shipments():
    """Get all part shipments data."""
    try:
        # Get limit parameter from query string, default to 10
        limit = request.args.get('limit', 10, type=int)
        
        shipments = db.session.query(
            PartShipment,
            PartSubtype,
            Warehouse
        ).join(
            PartSubtype, PartShipment.part_subtype_id == PartSubtype.id
        ).join(
            Warehouse, PartShipment.warehouse_id == Warehouse.id
        ).order_by(
            PartShipment.received_at.desc()
        ).limit(limit).all()
        
        shipments_list = []
        for shipment, part_subtype, warehouse in shipments:
            # Format shipment data
            shipment_data = {
                "shipment_id": shipment.id,
                "part_subtype_id": shipment.part_subtype_id,
                "part_name": part_subtype.name,
                "warehouse_id": shipment.warehouse_id,
                "warehouse_name": warehouse.name,
                "quantity": shipment.quantity,
                "received_at": shipment.received_at.strftime("%Y-%m-%d"),
                "vendor": shipment.vendor
            }
            
            shipments_list.append(shipment_data)
        
        return jsonify(shipments_list)
    except Exception as e:
        # Log the error details
        logger.error(f"Part shipments data error: {str(e)}")
        return jsonify({
            "error": "An error occurred while retrieving part shipments data"
        }), 500

# Home page API endpoint
@app.route("/api/home", methods=["GET"])
def get_home_data():
    """
    Home page data endpoint.
    
    This endpoint provides information about the QC Management System.
    """
    try:
        return jsonify({
            "title": "QC Management System",
            "description": "A comprehensive Quality Control management system for warehouse inventory and logistics operations.",
            "features": [
                {
                    "name": "QC Reports",
                    "description": "Create and manage quality control reports with batch entries and image upload capabilities.",
                    "icon": "clipboard-check"
                },
                {
                    "name": "Product Parts",
                    "description": "Manage product parts with detailed information including coating colors.",
                    "icon": "box"
                },
                {
                    "name": "Coating Colors",
                    "description": "Track and manage coating colors used in manufacturing.",
                    "icon": "palette"
                },
                {
                    "name": "Panel Data",
                    "description": "Track and manage CW Panel data with complex measurements.",
                    "icon": "table"
                }
                # },
                # {
                #     "name": "Data Export",
                #     "description": "Export data to Excel for reporting and analysis.",
                #     "icon": "file-excel"
                # }
            ],
            "version": "1.0.0",
            "last_updated": "2025-04-27"
        })
    except Exception as e:
        logger.error(f"Error generating home data: {str(e)}")
        return jsonify({"error": "Could not generate home data"}), 500

# QC Report endpoints
@app.route("/api/qc-reports", methods=["GET"])
@token_required
def get_qc_reports():
    """Get all QC reports."""
    try:
        qc_reports = QCReport.query.all()
        result = []
        for report in qc_reports:
            # Get batch items with their individual panels_glazed, date_glazed, and time_glazed fields
            batch_items = report.get_batch_items()
            
            # For backward compatibility, use report-level fields if batch_items is empty
            if not batch_items:
                batch_items_count = 0
                first_panel = report.panels_glazed
            else:
                batch_items_count = len(batch_items)
                # Get first item's panels_glazed for summary display
                first_panel = batch_items[0].get('panels_glazed', report.panels_glazed) if batch_items else report.panels_glazed
            
            report_data = {
                "id": report.id,
                "report_id": report.report_id,
                "strs_batch": report.get_strs_batch(),
                "catalyst_batch": report.get_catalyst_batch(),
                "primer_c": report.get_primer_c(),
                "batch_items_count": batch_items_count,
                "panels_glazed": first_panel,  # Show the first item's panels_glazed or fall back to report-level field
                "date_glazed": report.date_glazed.isoformat() if report.date_glazed else None,
                "time_glazed": report.time_glazed.isoformat() if report.time_glazed else None,
                "has_images": len(report.images) > 0,
                "created_at": report.created_at.isoformat() if report.created_at else None,
                "updated_at": report.updated_at.isoformat() if report.updated_at else None,
                "created_by": {
                    "id": report.creator.id,
                    "username": report.creator.username
                } if report.creator else None
            }
            result.append(report_data)
        
        return jsonify({"status": "success", "data": result}), 200
    except Exception as e:
        logger.error(f"Error retrieving QC reports: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/qc-reports/<int:report_id>", methods=["GET"])
@token_required
def get_qc_report(report_id):
    """Get a specific QC report by ID."""
    try:
        report = QCReport.query.get(report_id)
        if not report:
            return jsonify({"status": "error", "message": "Report not found"}), 404
        
        # Get all images for this report
        images = []
        for image in report.images:
            images.append({
                "id": image.id,
                "image_data": image.get_image_as_base64()
            })
        
        # Get batch items
        batch_items = report.get_batch_items()
        
        # Add backward compatibility for empty batch_items
        # This is for reports created before the batch_items had individual panels_glazed fields
        if batch_items and all('panels_glazed' not in item for item in batch_items):
            # Only add panels_glazed to each batch item, date_glazed and time_glazed are shared
            for item in batch_items:
                item['panels_glazed'] = report.panels_glazed
        
        report_data = {
            "id": report.id,
            "report_id": report.report_id,
            "strs_batch": report.get_strs_batch(),
            "catalyst_batch": report.get_catalyst_batch(),
            "primer_c": report.get_primer_c(),
            "batch_items": batch_items,
            # Keep these for backward compatibility
            "panels_glazed": report.panels_glazed,
            "date_glazed": report.date_glazed.isoformat() if report.date_glazed else None,
            "time_glazed": report.time_glazed.isoformat() if report.time_glazed else None,
            "created_at": report.created_at.isoformat() if report.created_at else None,
            "updated_at": report.updated_at.isoformat() if report.updated_at else None,
            "created_by": {
                "id": report.creator.id,
                "username": report.creator.username
            } if report.creator else None,
            "images": images
        }
        
        return jsonify({"status": "success", "data": report_data}), 200
    except Exception as e:
        logger.error(f"Error retrieving QC report: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/qc-reports", methods=["POST"])
@token_required
def create_qc_report():
    """Create a new QC report."""
    try:
        data = request.json
        logger.info(f"Received QC report data: {data}")
        current_user_id = g.user.id
        
        # Create a new QC report
        report = QCReport(
            report_id=data.get("report_id"),
            created_by=current_user_id
        )
        
        # For backward compatibility, still store the top-level fields if provided
        if data.get("panels_glazed"):
            report.panels_glazed = str(data.get("panels_glazed"))
        
        # Handle date_glazed - with error handling (for backward compatibility)
        if data.get("date_glazed"):
            try:
                report.date_glazed = datetime.strptime(data.get("date_glazed"), "%Y-%m-%d").date()
            except Exception as e:
                logger.warning(f"Error parsing date_glazed: {str(e)}")
                # If date format is wrong, store as is or leave as None
        
        # Handle time_glazed - with error handling (for backward compatibility)
        if data.get("time_glazed"):
            try:
                report.time_glazed = datetime.strptime(data.get("time_glazed"), "%H:%M").time()
            except Exception as e:
                logger.warning(f"Error parsing time_glazed: {str(e)}")
                # If time format is wrong, store as is or leave as None
        
        # Set JSON data fields
        if data.get("strs_batch"):
            report.set_strs_batch(data.get("strs_batch"))
        
        if data.get("catalyst_batch"):
            report.set_catalyst_batch(data.get("catalyst_batch"))
        
        if data.get("primer_c"):
            report.set_primer_c(data.get("primer_c"))
        
        # Set batch items if provided
        if data.get("batch_items"):
            report.set_batch_items(data.get("batch_items"))
        
        db.session.add(report)
        db.session.flush()  # Get ID for the report before committing
        
        # Handle report images if any
        if data.get("images"):
            for image_data in data.get("images"):
                image = ReportImage(report_id=report.id)
                image.set_image_from_base64(image_data)
                db.session.add(image)
        
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": "QC report created successfully",
            "data": {
                "id": report.id,
                "report_id": report.report_id
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating QC report: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/qc-reports/<int:report_id>", methods=["PUT"])
@token_required
def update_qc_report(report_id):
    """Update an existing QC report."""
    try:
        data = request.json
        logger.info(f"Updating QC report {report_id} with data: {data}")
        report = QCReport.query.get(report_id)
        
        if not report:
            return jsonify({"status": "error", "message": "Report not found"}), 404
        
        # Update report fields
        if "report_id" in data:
            report.report_id = data["report_id"]
        
        # For backward compatibility, still update the top-level fields if provided
        if "panels_glazed" in data:
            report.panels_glazed = str(data["panels_glazed"])  # Convert to string to handle any type
        
        # Handle date_glazed with error handling (for backward compatibility)
        if "date_glazed" in data:
            if data["date_glazed"]:
                try:
                    report.date_glazed = datetime.strptime(data["date_glazed"], "%Y-%m-%d").date()
                except Exception as e:
                    logger.warning(f"Error parsing date_glazed during update: {str(e)}")
                    # Leave the original value if parsing fails
            else:
                report.date_glazed = None
        
        # Handle time_glazed with error handling (for backward compatibility)
        if "time_glazed" in data:
            if data["time_glazed"]:
                try:
                    report.time_glazed = datetime.strptime(data["time_glazed"], "%H:%M").time()
                except Exception as e:
                    logger.warning(f"Error parsing time_glazed during update: {str(e)}")
                    # Leave the original value if parsing fails
            else:
                report.time_glazed = None
        
        # Update JSON data fields
        if "strs_batch" in data:
            report.set_strs_batch(data["strs_batch"])
        
        if "catalyst_batch" in data:
            report.set_catalyst_batch(data["catalyst_batch"])
        
        if "primer_c" in data:
            report.set_primer_c(data["primer_c"])
        
        # Update batch items if provided
        if "batch_items" in data:
            report.set_batch_items(data["batch_items"])
        
        # Handle image updates if provided
        if "new_images" in data and data["new_images"]:
            for image_data in data["new_images"]:
                image = ReportImage(report_id=report.id)
                image.set_image_from_base64(image_data)
                db.session.add(image)
        
        # Handle image deletions if provided
        if "delete_images" in data and data["delete_images"]:
            for image_id in data["delete_images"]:
                image = ReportImage.query.get(image_id)
                if image and image.report_id == report.id:
                    db.session.delete(image)
        
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": "QC report updated successfully",
            "data": {
                "id": report.id,
                "report_id": report.report_id
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating QC report: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/qc-reports/<int:report_id>", methods=["DELETE"])
@token_required
def delete_qc_report(report_id):
    """Delete a QC report."""
    try:
        report = QCReport.query.get(report_id)
        
        if not report:
            return jsonify({"status": "error", "message": "Report not found"}), 404
        
        db.session.delete(report)
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": "QC report deleted successfully"
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting QC report: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

# Product Part endpoints
@app.route("/api/product-parts", methods=["GET"])
@token_required
def get_product_parts():
    """Get all product parts."""
    try:
        product_parts = ProductPart.query.all()
        result = []
        for part in product_parts:
            part_data = {
                "id": part.id,
                "product_part_id": part.product_part_id,
                "product_part_name": part.product_part_name,
                "product_part_vendor": part.product_part_vendor,
                "product_part_type": part.product_part_type,
                "created_at": part.created_at.isoformat() if part.created_at else None,
                "has_image": part.product_part_image is not None,
                "colors": [
                    {
                        "id": color.coating_color.id,
                        "name": color.coating_color.coating_color_name
                    } for color in part.product_colors
                ]
            }
            result.append(part_data)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/product-parts/<int:part_id>", methods=["GET"])
@token_required
def get_product_part(part_id):
    """Get a specific product part by ID."""
    try:
        part = ProductPart.query.get(part_id)
        if not part:
            return jsonify({"error": "Product part not found"}), 404
        
        # Convert image to base64 for transfer if available
        image_base64 = part.get_image_as_base64()
        
        part_data = {
            "id": part.id,
            "product_part_id": part.product_part_id,
            "product_part_name": part.product_part_name,
            "product_part_vendor": part.product_part_vendor,
            "product_part_type": part.product_part_type,
            "created_at": part.created_at.isoformat() if part.created_at else None,
            "image_data": image_base64,
            "colors": [
                {
                    "id": color.coating_color.id,
                    "name": color.coating_color.coating_color_name
                } for color in part.product_colors
            ]
        }
        return jsonify(part_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/product-parts/<int:part_id>/image", methods=["GET"])
def get_product_part_image(part_id):
    """Get product part image as binary data."""
    try:
        part = ProductPart.query.get(part_id)
        if not part or not part.product_part_image:
            return jsonify({"error": "Image not found"}), 404
        
        # Return the image directly with appropriate content type
        response = make_response(part.product_part_image)
        response.headers.set('Content-Type', 'image/png')  # Adjust content type if needed
        return response
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/product-parts", methods=["POST"])
@token_required
@admin_required
def create_product_part():
    """Create a new product part."""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ["product_part_id", "product_part_name"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Check if part ID already exists
        existing_part = ProductPart.query.filter_by(product_part_id=data["product_part_id"]).first()
        if existing_part:
            return jsonify({"error": "Product part ID already exists"}), 400
        
        # Create new product part
        new_part = ProductPart(
            product_part_id=data["product_part_id"],
            product_part_name=data["product_part_name"],
            product_part_vendor=data.get("product_part_vendor"),
            product_part_type=data.get("product_part_type")
        )
        
        # Process image if provided
        if "image_data" in data and data["image_data"]:
            new_part.set_image_from_base64(data["image_data"])
        
        # Add coating colors if provided
        if "color_ids" in data and isinstance(data["color_ids"], list):
            for color_id in data["color_ids"]:
                color = CoatingColor.query.get(color_id)
                if color:
                    new_part.product_colors.append(ProductColor(coating_color=color))
        
        db.session.add(new_part)
        db.session.commit()
        
        return jsonify({
            "id": new_part.id,
            "product_part_id": new_part.product_part_id,
            "message": "Product part created successfully"
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/product-parts/<int:part_id>", methods=["PUT"])
@token_required
@admin_required
def update_product_part(part_id):
    """Update a product part."""
    try:
        part = ProductPart.query.get(part_id)
        if not part:
            return jsonify({"error": "Product part not found"}), 404
        
        data = request.json
        
        # Update fields if provided
        if "product_part_name" in data:
            part.product_part_name = data["product_part_name"]
        if "product_part_vendor" in data:
            part.product_part_vendor = data["product_part_vendor"]
        if "product_part_type" in data:
            part.product_part_type = data["product_part_type"]
            
        # Update image if provided
        if "image_data" in data:
            part.set_image_from_base64(data["image_data"])
        
        # Update coating colors if provided
        if "color_ids" in data and isinstance(data["color_ids"], list):
            # Remove existing colors
            for color in list(part.product_colors):
                db.session.delete(color)
            
            # Add new colors
            for color_id in data["color_ids"]:
                color = CoatingColor.query.get(color_id)
                if color:
                    part.product_colors.append(ProductColor(coating_color=color))
        
        db.session.commit()
        
        return jsonify({
            "id": part.id,
            "message": "Product part updated successfully"
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/product-parts/<int:part_id>", methods=["DELETE"])
@token_required
@admin_required
def delete_product_part(part_id):
    """Delete a product part."""
    try:
        part = ProductPart.query.get(part_id)
        if not part:
            return jsonify({"error": "Product part not found"}), 404
        
        db.session.delete(part)
        db.session.commit()
        
        return jsonify({
            "message": "Product part deleted successfully"
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# Coating Color endpoints
@app.route("/api/coating-colors", methods=["GET"])
@token_required
def get_coating_colors():
    """Get all coating colors."""
    try:
        colors = CoatingColor.query.all()
        result = [{
            "id": color.id,
            "coating_color_name": color.coating_color_name,
            "created_at": color.created_at.isoformat() if color.created_at else None
        } for color in colors]
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# QC CW Panel Data endpoints
@app.route("/api/qc-cw-panel-data", methods=["GET"])
@token_required
def get_qc_cw_panel_data():
    """Get all QC CW Panel Data."""
    try:
        # Parse query parameters
        fl_id = request.args.get('fl_id')
        
        # Build query based on filters
        query = QCCWPanelData.query
        if fl_id:
            query = query.filter(QCCWPanelData.fl_id == fl_id)
        
        # Execute query and format results
        panels = query.order_by(QCCWPanelData.fl_id, QCCWPanelData.pan_id).all()
        result = []
        
        for panel in panels:
            panel_data = {
                "id": panel.id,
                "fl_id": panel.fl_id,
                "pan_id": panel.pan_id,
                "pan_name": panel.pan_name,
                "ipa_cleaned": panel.ipa_cleaned,
                "sealant_frame_enough": panel.sealant_frame_enough,
                "created_at": panel.created_at.isoformat() if panel.created_at else None,
                "has_profile_photo": panel.profile_photo is not None
            }
            result.append(panel_data)
        
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error retrieving QC CW Panel Data: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/qc-cw-panel-data/<int:panel_id>", methods=["GET"])
@token_required
def get_qc_cw_panel_data_by_id(panel_id):
    """Get a specific QC CW Panel Data by ID."""
    try:
        panel = QCCWPanelData.query.get(panel_id)
        if not panel:
            return jsonify({"error": "Panel not found"}), 404
        
        # Convert JSON fields
        json_fields = [
            'width_l', 'width_r', 'height_1', 'height_2', 'height_3', 'height_4',
            'cavity_ro_height_total', 'cavity_diag_cw_pan_l', 'cavity_diag_cw_pan_r',
            'left', 'middle', 'right', 'head', 'sill',
            'trans_1', 'trans_2', 'trans_3',
            'bracket_l', 'bracket_r',
            'infill_fs_location',
            'infills_1_type', 'infills_2_type', 'infills_3_type', 'infills_4_type',
            'infills_right_1_type', 'infills_right_2_type', 'infills_right_3_type', 'infills_right_4_type',
            'infills_1_color', 'infills_2_color', 'infills_3_color', 'infills_4_color',
            'infills_right_1_color', 'infills_right_2_color', 'infills_right_3_color', 'infills_right_4_color',
            'type_gz_factory'
        ]
        
        panel_data = {
            "id": panel.id,
            "fl_id": panel.fl_id,
            "pan_id": panel.pan_id,
            "pan_name": panel.pan_name,
            "ipa_cleaned": panel.ipa_cleaned,
            "sealant_frame_enough": panel.sealant_frame_enough,
            "cavities_invert": panel.cavities_invert,
            "qc_infill_affix": panel.qc_infill_affix,
            "structural_sealant_records": panel.structural_sealant_records,
            "lmr": panel.lmr,
            "edge_bead_attached": panel.edge_bead_attached,
            "operable": panel.operable,
            "card_checked": panel.card_checked,
            "paint_damage": panel.paint_damage,
            "glass_scratched": panel.glass_scratched,
            "cleaned_ready": panel.cleaned_ready,
            "crated": panel.crated,
            "created_at": panel.created_at.isoformat() if panel.created_at else None,
            "updated_at": panel.updated_at.isoformat() if panel.updated_at else None,
            "profile_photo": panel.get_profile_photo_as_base64()
        }
        
        # Add all JSON fields after parsing
        for field in json_fields:
            panel_data[field] = panel.get_json_field(field)
        
        # Get frame cavities values
        frame_cavities_values = []
        for value in panel.frame_cavities_values:
            frame_cavities_values.append({
                "id": value.id,
                "attribute_id": value.attribute_id,
                "attribute_name": value.attribute.attribute_name,
                "attribute_type": value.attribute.get_attribute_type(),
                "value": value.value
            })
        panel_data["frame_cavities_values"] = frame_cavities_values
        
        # Get additional photos
        additional_photos = []
        for photo in panel.panel_photos:
            additional_photos.append({
                "id": photo.id,
                "photo_type": photo.photo_type,
                "photo": photo.get_photo_as_base64(),
                "created_at": photo.created_at.isoformat() if photo.created_at else None
            })
        panel_data["additional_photos"] = additional_photos
        
        return jsonify(panel_data), 200
    except Exception as e:
        logger.error(f"Error retrieving QC CW Panel Data: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/qc-cw-panel-data/fl/<string:fl_id>", methods=["GET"])
@token_required
def get_qc_cw_panel_data_by_fl_id(fl_id):
    """Get all QC CW Panel Data for a specific fl_id."""
    try:
        panels = QCCWPanelData.query.filter(QCCWPanelData.fl_id == fl_id).all()
        result = []
        
        for panel in panels:
            panel_data = {
                "id": panel.id,
                "fl_id": panel.fl_id,
                "pan_id": panel.pan_id,
                "pan_name": panel.pan_name,
                "ipa_cleaned": panel.ipa_cleaned,
                "sealant_frame_enough": panel.sealant_frame_enough,
                "created_at": panel.created_at.isoformat() if panel.created_at else None,
                "has_profile_photo": panel.profile_photo is not None
            }
            result.append(panel_data)
        
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error retrieving QC CW Panel Data by fl_id: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/qc-cw-panel-data", methods=["POST"])
@token_required
def create_qc_cw_panel_data():
    """Create a new QC CW Panel Data entry."""
    try:
        data = request.json
        logger.info(f"Received QC CW Panel Data: {data}")
        current_user_id = g.user.id
        
        # Required fields validation
        required_fields = ["fl_id", "pan_id"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Calculate pan_name based on fl_id and pan_id
        pan_name = f"c{data['fl_id']}.{data['pan_id']}"
        
        # Create new panel data
        panel = QCCWPanelData(
            fl_id=data["fl_id"],
            pan_id=data["pan_id"],
            pan_name=pan_name,
            ipa_cleaned=data.get("ipa_cleaned", False),
            sealant_frame_enough=data.get("sealant_frame_enough", False),
            cavities_invert=data.get("cavities_invert"),
            qc_infill_affix=data.get("qc_infill_affix"),
            structural_sealant_records=data.get("structural_sealant_records"),
            lmr=data.get("lmr"),
            edge_bead_attached=data.get("edge_bead_attached", False),
            operable=data.get("operable", False),
            card_checked=data.get("card_checked"),
            paint_damage=data.get("paint_damage"),
            glass_scratched=data.get("glass_scratched"),
            cleaned_ready=data.get("cleaned_ready"),
            crated=data.get("crated", False),
            created_by=current_user_id
        )
        
        # Set JSON fields
        json_fields = [
            'width_l', 'width_r', 'height_1', 'height_2', 'height_3', 'height_4',
            'cavity_ro_height_total', 'cavity_diag_cw_pan_l', 'cavity_diag_cw_pan_r',
            'left', 'middle', 'right', 'head', 'sill',
            'trans_1', 'trans_2', 'trans_3',
            'bracket_l', 'bracket_r',
            'infill_fs_location',
            'infills_1_type', 'infills_2_type', 'infills_3_type', 'infills_4_type',
            'infills_right_1_type', 'infills_right_2_type', 'infills_right_3_type', 'infills_right_4_type',
            'infills_1_color', 'infills_2_color', 'infills_3_color', 'infills_4_color',
            'infills_right_1_color', 'infills_right_2_color', 'infills_right_3_color', 'infills_right_4_color',
            'type_gz_factory'
        ]
        
        for field in json_fields:
            if field in data:
                panel.set_json_field(field, data[field])
        
        # Set profile photo if provided
        if "profile_photo" in data and data["profile_photo"]:
            panel.set_profile_photo_from_base64(data["profile_photo"])
        
        db.session.add(panel)
        db.session.flush()  # Get ID before committing
        
        # Add frame cavity values if provided
        if "frame_cavities_values" in data and isinstance(data["frame_cavities_values"], list):
            for value_data in data["frame_cavities_values"]:
                value = FrameCavitiesValue(
                    panel_id=panel.id,
                    attribute_id=value_data["attribute_id"],
                    value=value_data["value"]
                )
                db.session.add(value)
        
        # Add photos if provided
        if "additional_photos" in data and isinstance(data["additional_photos"], list):
            for photo_data in data["additional_photos"]:
                photo = QCCWPanelPhoto(
                    panel_id=panel.id,
                    photo_type=photo_data.get("photo_type")
                )
                photo.set_photo_from_base64(photo_data["photo"])
                db.session.add(photo)
        
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": "QC CW Panel Data created successfully",
            "data": {
                "id": panel.id,
                "fl_id": panel.fl_id,
                "pan_id": panel.pan_id,
                "pan_name": panel.pan_name
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating QC CW Panel Data: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/qc-cw-panel-data/<int:panel_id>", methods=["PUT"])
@token_required
def update_qc_cw_panel_data(panel_id):
    """Update an existing QC CW Panel Data entry."""
    try:
        data = request.json
        panel = QCCWPanelData.query.get(panel_id)
        
        if not panel:
            return jsonify({"error": "Panel not found"}), 404
        
        # Update basic fields
        if "pan_id" in data:
            panel.pan_id = data["pan_id"]
            # Recalculate pan_name if pan_id changes
            panel.pan_name = f"c{panel.fl_id}.{panel.pan_id}"
        
        # Update boolean fields
        for field in ["ipa_cleaned", "sealant_frame_enough", "edge_bead_attached", 
                      "operable", "crated"]:
            if field in data:
                setattr(panel, field, data[field])
        
        # Update text fields
        for field in ["cavities_invert", "qc_infill_affix", "structural_sealant_records", 
                     "lmr", "card_checked", "paint_damage", "glass_scratched", "cleaned_ready"]:
            if field in data:
                setattr(panel, field, data[field])
        
        # Update JSON fields
        json_fields = [
            'width_l', 'width_r', 'height_1', 'height_2', 'height_3', 'height_4',
            'cavity_ro_height_total', 'cavity_diag_cw_pan_l', 'cavity_diag_cw_pan_r',
            'left', 'middle', 'right', 'head', 'sill',
            'trans_1', 'trans_2', 'trans_3',
            'bracket_l', 'bracket_r',
            'infill_fs_location',
            'infills_1_type', 'infills_2_type', 'infills_3_type', 'infills_4_type',
            'infills_right_1_type', 'infills_right_2_type', 'infills_right_3_type', 'infills_right_4_type',
            'infills_1_color', 'infills_2_color', 'infills_3_color', 'infills_4_color',
            'infills_right_1_color', 'infills_right_2_color', 'infills_right_3_color', 'infills_right_4_color',
            'type_gz_factory'
        ]
        
        for field in json_fields:
            if field in data:
                panel.set_json_field(field, data[field])
        
        # Update profile photo if provided
        if "profile_photo" in data:
            if data["profile_photo"]:
                panel.set_profile_photo_from_base64(data["profile_photo"])
            else:
                panel.profile_photo = None
        
        panel.updated_by = g.user.id
        
        # Update frame cavity values if provided
        if "frame_cavities_values" in data and isinstance(data["frame_cavities_values"], list):
            # Get existing values
            existing_values = {v.attribute_id: v for v in panel.frame_cavities_values}
            
            for value_data in data["frame_cavities_values"]:
                attribute_id = value_data["attribute_id"]
                
                if attribute_id in existing_values:
                    # Update existing value
                    existing_values[attribute_id].value = value_data["value"]
                else:
                    # Create new value
                    value = FrameCavitiesValue(
                        panel_id=panel.id,
                        attribute_id=attribute_id,
                        value=value_data["value"]
                    )
                    db.session.add(value)
        
        # Handle photo updates
        if "new_photos" in data and isinstance(data["new_photos"], list):
            for photo_data in data["new_photos"]:
                photo = QCCWPanelPhoto(
                    panel_id=panel.id,
                    photo_type=photo_data.get("photo_type")
                )
                photo.set_photo_from_base64(photo_data["photo"])
                db.session.add(photo)
        
        # Handle photo deletions
        if "delete_photos" in data and isinstance(data["delete_photos"], list):
            for photo_id in data["delete_photos"]:
                photo = QCCWPanelPhoto.query.get(photo_id)
                if photo and photo.panel_id == panel.id:
                    db.session.delete(photo)
        
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": "QC CW Panel Data updated successfully",
            "data": {
                "id": panel.id,
                "fl_id": panel.fl_id,
                "pan_id": panel.pan_id,
                "pan_name": panel.pan_name
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating QC CW Panel Data: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/qc-cw-panel-data/<int:panel_id>", methods=["DELETE"])
@token_required
def delete_qc_cw_panel_data(panel_id):
    """Delete a QC CW Panel Data entry."""
    try:
        panel = QCCWPanelData.query.get(panel_id)
        
        if not panel:
            return jsonify({"error": "Panel not found"}), 404
        
        db.session.delete(panel)
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": "QC CW Panel Data deleted successfully"
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting QC CW Panel Data: {str(e)}")
        return jsonify({"error": str(e)}), 500


# Frame Cavities Attributes endpoints
@app.route("/api/frame-cavities-attributes/<string:fl_id>", methods=["GET"])
@token_required
def get_frame_cavities_attributes(fl_id):
    """Get frame cavities attributes for a specific fl_id."""
    try:
        attributes = FrameCavitiesAttribute.query.filter(FrameCavitiesAttribute.fl_id == fl_id).all()
        result = []
        
        for attr in attributes:
            attr_data = {
                "id": attr.id,
                "fl_id": attr.fl_id,
                "attribute_name": attr.attribute_name,
                "attribute_type": attr.get_attribute_type(),
                "created_at": attr.created_at.isoformat() if attr.created_at else None
            }
            result.append(attr_data)
        
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error retrieving Frame Cavities Attributes: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/frame-cavities-attributes", methods=["POST"])
@token_required
def create_frame_cavities_attribute():
    """Create a new Frame Cavities Attribute."""
    try:
        data = request.json
        
        # Required fields validation
        required_fields = ["fl_id", "attribute_name", "attribute_type"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Create new attribute
        attr = FrameCavitiesAttribute(
            fl_id=data["fl_id"],
            attribute_name=data["attribute_name"]
        )
        
        # Set attribute type
        attr.set_attribute_type(data["attribute_type"])
        
        db.session.add(attr)
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": "Frame Cavities Attribute created successfully",
            "data": {
                "id": attr.id,
                "fl_id": attr.fl_id,
                "attribute_name": attr.attribute_name
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating Frame Cavities Attribute: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/frame-cavities-attributes/<int:attr_id>", methods=["PUT"])
@token_required
def update_frame_cavities_attribute(attr_id):
    """Update an existing Frame Cavities Attribute."""
    try:
        data = request.json
        attr = FrameCavitiesAttribute.query.get(attr_id)
        
        if not attr:
            return jsonify({"error": "Attribute not found"}), 404
        
        # Update fields
        if "attribute_name" in data:
            attr.attribute_name = data["attribute_name"]
        
        if "attribute_type" in data:
            attr.set_attribute_type(data["attribute_type"])
        
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": "Frame Cavities Attribute updated successfully",
            "data": {
                "id": attr.id,
                "fl_id": attr.fl_id,
                "attribute_name": attr.attribute_name
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating Frame Cavities Attribute: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/frame-cavities-attributes/<int:attr_id>", methods=["DELETE"])
@token_required
def delete_frame_cavities_attribute(attr_id):
    """Delete a Frame Cavities Attribute."""
    try:
        attr = FrameCavitiesAttribute.query.get(attr_id)
        
        if not attr:
            return jsonify({"error": "Attribute not found"}), 404
        
        db.session.delete(attr)
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": "Frame Cavities Attribute deleted successfully"
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting Frame Cavities Attribute: {str(e)}")
        return jsonify({"error": str(e)}), 500


# Frame Cavities Values endpoints
@app.route("/api/frame-cavities-values/<int:panel_id>", methods=["GET"])
@token_required
def get_frame_cavities_values(panel_id):
    """Get frame cavities values for a specific panel."""
    try:
        values = FrameCavitiesValue.query.filter(FrameCavitiesValue.panel_id == panel_id).all()
        result = []
        
        for value in values:
            value_data = {
                "id": value.id,
                "panel_id": value.panel_id,
                "attribute_id": value.attribute_id,
                "attribute_name": value.attribute.attribute_name,
                "value": value.value,
                "created_at": value.created_at.isoformat() if value.created_at else None
            }
            result.append(value_data)
        
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error retrieving Frame Cavities Values: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/coating-colors/<int:color_id>", methods=["GET"])
@token_required
def get_coating_color(color_id):
    """Get a specific coating color by ID."""
    try:
        color = CoatingColor.query.get(color_id)
        if not color:
            return jsonify({"error": "Coating color not found"}), 404
        
        result = {
            "id": color.id,
            "coating_color_name": color.coating_color_name,
            "created_at": color.created_at.isoformat() if color.created_at else None,
            "product_parts": [
                {
                    "id": pc.product_part.id,
                    "product_part_id": pc.product_part.product_part_id,
                    "product_part_name": pc.product_part.product_part_name
                } for pc in color.product_colors
            ]
        }
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/coating-colors", methods=["POST"])
@token_required
@admin_required
def create_coating_color():
    """Create a new coating color."""
    try:
        data = request.json
        
        # Validate required fields
        if "coating_color_name" not in data:
            return jsonify({"error": "Missing required field: coating_color_name"}), 400
        
        # Check if color name already exists
        existing_color = CoatingColor.query.filter_by(coating_color_name=data["coating_color_name"]).first()
        if existing_color:
            return jsonify({"error": "Coating color name already exists"}), 400
        
        # Create new coating color
        new_color = CoatingColor(
            coating_color_name=data["coating_color_name"]
        )
        
        db.session.add(new_color)
        db.session.commit()
        
        return jsonify({
            "id": new_color.id,
            "coating_color_name": new_color.coating_color_name,
            "message": "Coating color created successfully"
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/coating-colors/<int:color_id>", methods=["PUT"])
@token_required
@admin_required
def update_coating_color(color_id):
    """Update a coating color."""
    try:
        color = CoatingColor.query.get(color_id)
        if not color:
            return jsonify({"error": "Coating color not found"}), 404
        
        data = request.json
        
        # Validate required fields
        if "coating_color_name" not in data:
            return jsonify({"error": "Missing required field: coating_color_name"}), 400
        
        # Check if new color name already exists (excluding current color)
        existing_color = CoatingColor.query.filter(
            CoatingColor.coating_color_name == data["coating_color_name"],
            CoatingColor.id != color_id
        ).first()
        if existing_color:
            return jsonify({"error": "Coating color name already exists"}), 400
        
        # Update color name
        color.coating_color_name = data["coating_color_name"]
        
        db.session.commit()
        
        return jsonify({
            "id": color.id,
            "coating_color_name": color.coating_color_name,
            "message": "Coating color updated successfully"
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/coating-colors/<int:color_id>", methods=["DELETE"])
@token_required
@admin_required
def delete_coating_color(color_id):
    """Delete a coating color."""
    try:
        color = CoatingColor.query.get(color_id)
        if not color:
            return jsonify({"error": "Coating color not found"}), 404
        
        db.session.delete(color)
        db.session.commit()
        
        return jsonify({
            "message": "Coating color deleted successfully"
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    try:
        # Get panel counts
        total_panels = db.session.query(func.count(Product.id)).scalar() or 0
        
        # Count panels by status
        passed_qc = db.session.query(func.count(Product.id)).filter(
            Product.status == 'qc_passed'
        ).scalar() or 0
        
        pending_qc = db.session.query(func.count(Product.id)).filter(
            Product.status == 'pending'
        ).scalar() or 0
        
        failed_qc = db.session.query(func.count(Product.id)).filter(
            ~Product.status.in_(['qc_passed', 'pending', 'shipped', 'complete'])
        ).scalar() or 0
        
        shipped_panels = db.session.query(func.count(Product.id)).filter(
            Product.status.in_(['shipped', 'complete'])
        ).scalar() or 0

        # Get recent panels data (Floor 17)
        panels_data = []
        
        # Get all products first (even without QC sessions)
        products = db.session.query(Product).order_by(Product.created_at.desc()).limit(10).all()
        
        for product in products:
            # Get the most recent QC session for this product if any
            qc_session = db.session.query(QCSession).filter(
                QCSession.product_id == product.id
            ).order_by(QCSession.performed_at.desc()).first()
            
            status = 'Passed' if product.status == 'qc_passed' else \
                    'Pending' if product.status == 'pending' else 'Failed'
            
            # Get any attribute values from the QC session if available
            inspector_name = "Unassigned"
            performed_date = product.created_at.strftime("%Y-%m-%d")
            notes = ""  # Default empty notes
            
            if qc_session:
                if qc_session.inspector_user:
                    inspector_name = qc_session.inspector_user.username
                performed_date = qc_session.performed_at.strftime("%Y-%m-%d")
                
                # Get QC attribute values for this product if any exist
                attribute_values = db.session.query(QCAttributeValue).filter(
                    QCAttributeValue.qc_id == qc_session.id
                ).all()
                
                # Look for text values to use as notes
                for attr_value in attribute_values:
                    if attr_value.value_text:
                        notes = attr_value.value_text
                        break
            
            panels_data.append({
                "qc_id": qc_session.id if qc_session else None,
                "panel_number": product.product_number or f"Panel #{product.id}",
                "type": "Standard",  # Default type
                "width": "N/A",
                "height": "N/A",
                "inspector": inspector_name,
                "date": performed_date,
                "status": status,
                "notes": notes
            })

        # Get structural sealant data
        sealant_data = []
        
        # Look for any sealant-related products or QC sessions
        sealant_products = db.session.query(Product).filter(
            Product.product_number.ilike('%sealant%') | 
            Product.product_number.ilike('%seal%') |
            Product.product_number.ilike('%str%') |
            Product.product_number.ilike('%barrel%')
        ).order_by(Product.created_at.desc()).limit(5).all()
        
        for product in sealant_products:
            # Get the most recent QC session for this product
            qc_session = db.session.query(QCSession).filter(
                QCSession.product_id == product.id
            ).order_by(QCSession.performed_at.desc()).first()
            
            inspector_name = "Unassigned"
            performed_date = product.created_at.strftime("%Y-%m-%d")
            
            if qc_session and qc_session.inspector_user:
                inspector_name = qc_session.inspector_user.username
                performed_date = qc_session.performed_at.strftime("%Y-%m-%d")
            
            # Extract data from product number if possible
            product_parts = product.product_number.split('-')
            
            sealant_data.append({
                "date": performed_date,
                "shift": "Day",  # Default shift
                "batch_number": f"B{product.id}",
                "barrel_number": f"BAR{product.id}",
                "panels_glazed": 1,  # Default value
                "inspector": inspector_name
            })
        
        # If we don't have any sealant products, add placeholder based on available QC sessions
        if not sealant_data and total_panels > 0:
            # Get latest QC sessions
            recent_sessions = db.session.query(QCSession).order_by(
                QCSession.performed_at.desc()
            ).limit(3).all()
            
            for session in recent_sessions:
                inspector_name = "Unassigned"
                if session.inspector_user:
                    inspector_name = session.inspector_user.username
                
                sealant_data.append({
                    "date": session.performed_at.strftime("%Y-%m-%d"),
                    "shift": "Day",  # Default shift
                    "batch_number": f"B{session.id}",
                    "barrel_number": f"BAR{session.id}",
                    "panels_glazed": 1,  # Default value
                    "inspector": inspector_name
                })
        
        # Get inventory data (Extrusions & Infills)
        inventory_data = {}
        inventory_counts = {}
        
        # Get all part subtypes with their inventory snapshots
        inventory_items = db.session.query(
            PartSubtype, 
            InventorySnapshot,
            Warehouse
        ).join(
            InventorySnapshot, InventorySnapshot.part_subtype_id == PartSubtype.id, isouter=True
        ).join(
            Warehouse, InventorySnapshot.warehouse_id == Warehouse.id, isouter=True
        ).join(
            PartType, PartSubtype.part_type_id == PartType.id
        ).order_by(
            PartType.name, 
            PartSubtype.name
        ).all()
        
        # Organize inventory data by part type
        for subtype, snapshot, warehouse in inventory_items:
            # Get part type name from the subtype's parent
            part_type = db.session.query(PartType).filter(PartType.id == subtype.part_type_id).first()
            type_name = part_type.name if part_type else "Unknown"
            
            # Initialize this part type in inventory data if not present
            if type_name not in inventory_data:
                inventory_data[type_name] = []
                inventory_counts[type_name] = 0
            
            # Get quantity from snapshot if available
            quantity = snapshot.quantity if snapshot else 0
            warehouse_name = warehouse.name if warehouse else "Main Warehouse"
            last_update = snapshot.snapshot_date.strftime("%Y-%m-%d") if snapshot else "N/A"
            
            # Add to inventory counts
            inventory_counts[type_name] += quantity
            
            # Add this part to the inventory data
            inventory_data[type_name].append({
                "part_id": subtype.id,
                "description": subtype.name,
                "type": type_name,
                "color": "Standard",  # Could be derived from attributes if available
                "size": "N/A",        # Could be derived from attributes if available
                "warehouse": warehouse_name,
                "quantity": quantity,
                "last_update": last_update
            })
        
        # Get recent activities based on timestamps
        recent_activities = []
        
        # Get latest QC sessions
        recent_qc = db.session.query(QCSession).join(
            User, QCSession.inspector_id == User.id
        ).join(
            Product, QCSession.product_id == Product.id
        ).order_by(
            QCSession.performed_at.desc()
        ).limit(5).all()
        
        for qc in recent_qc:
            recent_activities.append({
                "type": "qc_inspection",
                "date": qc.performed_at.strftime("%Y-%m-%d %H:%M"),
                "user": qc.inspector_user.username if qc.inspector_user else "System",
                "description": f"QC inspection performed on {qc.product.product_number}",
                "details": {
                    "product_id": qc.product_id,
                    "qc_id": qc.id
                }
            })
        
        # Return the dashboard data
        return jsonify({
            "total_panels": total_panels,
            "passed_qc": passed_qc,
            "pending_qc": pending_qc,
            "failed_qc": failed_qc,
            "shipped_panels": shipped_panels,
            "panels_data": panels_data,
            "sealant_data": sealant_data,
            "inventory_data": inventory_data,
            "inventory_counts": inventory_counts,
            "recent_activities": recent_activities
        })
    except Exception as e:
        # Log the error details
        logger.error(f"Dashboard data error: {str(e)}")
        return jsonify({
            "error": "An error occurred while retrieving dashboard data",
            "total_panels": 0,
            "passed_qc": 0,
            "pending_qc": 0,
            "failed_qc": 0,
            "shipped_panels": 0,
            "panels_data": [],
            "sealant_data": [],
            "inventory_data": {},
            "inventory_counts": {},
            "recent_activities": []
        }), 500
        
# Export QC CW Panel Data to Excel
@app.route("/api/qc/cw-panel-data/export-excel", methods=["GET"])
@token_required
def export_qc_cw_panel_data_excel():
    """Export QC CW Panel Data to Excel file with same structure as reference file."""
    try:
        # Generate Excel file
        excel_data = export_qc_cw_panel_data_to_excel(db.session)
        
        # Create response with Excel file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"QC_CW_Panel_Data_{timestamp}.xlsx"
        
        # Set additional headers for better download handling
        response = send_file(
            excel_data,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=filename
        )
        
        # Add explicit headers to help with download
        response.headers["Content-Disposition"] = f"attachment; filename={filename}"
        response.headers["Access-Control-Expose-Headers"] = "Content-Disposition"
        return response
    except Exception as e:
        logger.error(f"Error exporting Excel: {str(e)}")
        return jsonify({"error": str(e)}), 500
        
@app.route('/api/product-parts/export-excel', methods=['GET'])
@token_required
def export_product_parts_excel():
    """Export Product Parts to Excel file."""
    try:
        # Create a BytesIO object to store the Excel file
        output = io.BytesIO()
        
        # Create an Excel writer with the BytesIO object
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            try:
                # Query the database to get product parts data
                query = text("""
                    SELECT 
                        product_part_id,
                        product_part_name,
                        description,
                        part_type,
                        coating_color
                    FROM product_parts
                    ORDER BY product_part_id
                """)
                
                # Execute the query
                result = db.session.execute(query)
                records = result.fetchall()
                
                # Convert the results to a list of dictionaries
                data = []
                for record in records:
                    data.append(dict(record))
                
                # Create a DataFrame from the data
                df = pd.DataFrame(data) if data else pd.DataFrame(columns=[
                    'product_part_id', 'product_part_name', 'description', 'part_type', 'coating_color'
                ])
                
                # Rename columns for better readability in Excel
                if not df.empty:
                    df.rename(columns={
                        'product_part_id': 'Product Part ID',
                        'product_part_name': 'Name',
                        'description': 'Description',
                        'part_type': 'Part Type',
                        'coating_color': 'Coating Color'
                    }, inplace=True)
                else:
                    df = pd.DataFrame(columns=[
                        'Product Part ID', 'Name', 'Description', 'Part Type', 'Coating Color'
                    ])
                
                # Write DataFrame to Excel
                df.to_excel(writer, sheet_name='Product Parts', index=False)
                
                # Get the worksheet
                worksheet = writer.sheets['Product Parts']
                
                # Adjust column widths
                for col_num, column in enumerate(df.columns, 1):
                    max_length = max(df[column].astype(str).apply(len).max(), len(column)) + 2
                    col_letter = chr(64 + col_num)
                    worksheet.column_dimensions[col_letter].width = max_length
                
            except Exception as e:
                logger.error(f"Error exporting Product Parts: {str(e)}")
                # Create a minimal sheet if export fails
                pd.DataFrame({'Error': ['No data available']}).to_excel(writer, sheet_name='Product Parts')

        # Reset the BytesIO position to the beginning
        output.seek(0)

        # Create response with Excel file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"Product_Parts_{timestamp}.xlsx"
        
        # Set additional headers for better download handling
        response = send_file(
            output,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=filename
        )
        
        # Add explicit headers to help with download
        response.headers["Content-Disposition"] = f"attachment; filename={filename}"
        response.headers["Access-Control-Expose-Headers"] = "Content-Disposition"
        return response
    except Exception as e:
        logger.error(f"Error exporting Product Parts to Excel: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/coating-colors/export-excel', methods=['GET'])
@token_required
def export_coating_colors_excel():
    """Export Coating Colors to Excel file."""
    try:
        # Create a BytesIO object to store the Excel file
        output = io.BytesIO()
        
        # Create an Excel writer with the BytesIO object
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            try:
                # Query the database to get coating colors data
                query = text("""
                    SELECT 
                        id,
                        color_name,
                        color_code,
                        description,
                        is_active
                    FROM coating_colors
                    ORDER BY color_name
                """)
                
                # Execute the query
                result = db.session.execute(query)
                records = result.fetchall()
                
                # Convert the results to a list of dictionaries
                data = []
                for record in records:
                    data.append(dict(record))
                
                # Create a DataFrame from the data
                df = pd.DataFrame(data) if data else pd.DataFrame(columns=[
                    'id', 'color_name', 'color_code', 'description', 'is_active'
                ])
                
                # Rename columns for better readability in Excel
                if not df.empty:
                    df.rename(columns={
                        'id': 'ID',
                        'color_name': 'Color Name',
                        'color_code': 'Color Code',
                        'description': 'Description',
                        'is_active': 'Active'
                    }, inplace=True)
                    
                    # Convert boolean to Yes/No for better readability
                    df['Active'] = df['Active'].map({True: 'Yes', False: 'No'})
                else:
                    df = pd.DataFrame(columns=[
                        'ID', 'Color Name', 'Color Code', 'Description', 'Active'
                    ])
                
                # Write DataFrame to Excel
                df.to_excel(writer, sheet_name='Coating Colors', index=False)
                
                # Get the worksheet
                worksheet = writer.sheets['Coating Colors']
                
                # Adjust column widths
                for col_num, column in enumerate(df.columns, 1):
                    max_length = max(df[column].astype(str).apply(len).max(), len(column)) + 2
                    col_letter = chr(64 + col_num)
                    worksheet.column_dimensions[col_letter].width = max_length
                
            except Exception as e:
                logger.error(f"Error exporting Coating Colors: {str(e)}")
                # Create a minimal sheet if export fails
                pd.DataFrame({'Error': ['No data available']}).to_excel(writer, sheet_name='Coating Colors')

        # Reset the BytesIO position to the beginning
        output.seek(0)

        # Create response with Excel file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"Coating_Colors_{timestamp}.xlsx"
        
        # Set additional headers for better download handling
        response = send_file(
            output,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=filename
        )
        
        # Add explicit headers to help with download
        response.headers["Content-Disposition"] = f"attachment; filename={filename}"
        response.headers["Access-Control-Expose-Headers"] = "Content-Disposition"
        return response
    except Exception as e:
        logger.error(f"Error exporting Coating Colors to Excel: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/qc-reports/export-excel', methods=['GET'])
@token_required
def export_qc_reports_excel():
    """Export QC Reports to Excel file."""
    try:
        # Create a BytesIO object to store the Excel file
        output = io.BytesIO()
        
        # Create an Excel writer with the BytesIO object
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            try:
                # Query the database to get QC Reports data
                query = text("""
                    SELECT 
                        id,
                        report_date,
                        panels_glazed,
                        date_glazed,
                        time_glazed,
                        qc_technician,
                        report_status,
                        batch_items,
                        structural_sealant_records,
                        created_at,
                        updated_at
                    FROM qc_reports
                    ORDER BY report_date DESC
                """)
                
                # Execute the query
                result = db.session.execute(query)
                records = result.fetchall()
                
                # Convert the results to a list of dictionaries
                data = []
                for record in records:
                    row_dict = dict(record)
                    
                    # Parse batch_items JSON if it exists
                    if row_dict.get('batch_items') and isinstance(row_dict['batch_items'], str):
                        try:
                            row_dict['batch_items'] = len(json.loads(row_dict['batch_items']))
                        except:
                            row_dict['batch_items'] = 0
                    
                    data.append(row_dict)
                
                # Create a DataFrame from the data
                df = pd.DataFrame(data) if data else pd.DataFrame(columns=[
                    'id', 'report_date', 'panels_glazed', 'date_glazed', 'time_glazed',
                    'qc_technician', 'report_status', 'batch_items', 'structural_sealant_records',
                    'created_at', 'updated_at'
                ])
                
                # Rename columns for better readability in Excel
                if not df.empty:
                    df.rename(columns={
                        'id': 'Report ID',
                        'report_date': 'Report Date',
                        'panels_glazed': 'Panels Glazed',
                        'date_glazed': 'Date Glazed',
                        'time_glazed': 'Time Glazed',
                        'qc_technician': 'QC Technician',
                        'report_status': 'Status',
                        'batch_items': 'Number of Items',
                        'structural_sealant_records': 'Structural Sealant Records',
                        'created_at': 'Created At',
                        'updated_at': 'Updated At'
                    }, inplace=True)
                else:
                    df = pd.DataFrame(columns=[
                        'Report ID', 'Report Date', 'Panels Glazed', 'Date Glazed', 'Time Glazed',
                        'QC Technician', 'Status', 'Number of Items', 'Structural Sealant Records',
                        'Created At', 'Updated At'
                    ])
                
                # Write DataFrame to Excel
                df.to_excel(writer, sheet_name='QC Reports', index=False)
                
                # Get the worksheet
                worksheet = writer.sheets['QC Reports']
                
                # Adjust column widths
                for col_num, column in enumerate(df.columns, 1):
                    max_length = max(df[column].astype(str).apply(len).max(), len(column)) + 2
                    col_letter = chr(64 + col_num)
                    worksheet.column_dimensions[col_letter].width = max_length
                
            except Exception as e:
                logger.error(f"Error exporting QC Reports: {str(e)}")
                # Create a minimal sheet if export fails
                pd.DataFrame({'Error': ['No data available']}).to_excel(writer, sheet_name='QC Reports')

        # Reset the BytesIO position to the beginning
        output.seek(0)

        # Create response with Excel file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"QC_Reports_{timestamp}.xlsx"
        
        # Set additional headers for better download handling
        response = send_file(
            output,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=filename
        )
        
        # Add explicit headers to help with download
        response.headers["Content-Disposition"] = f"attachment; filename={filename}"
        response.headers["Access-Control-Expose-Headers"] = "Content-Disposition"
        return response
    except Exception as e:
        logger.error(f"Error exporting QC Reports to Excel: {str(e)}")
        return jsonify({"error": str(e)}), 500