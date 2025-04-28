"""
Seed script for the QC Management System database.
This script populates the database with initial data for testing.
"""

import os
from .app import app, db
from .models import User, Product, QCSession, QCAttributeDef, QCAttributeValue
from .models import LookupType, Lookup, Warehouse

def seed_database():
    """Create initial data in the database."""
    print("Seeding database...")
    
    with app.app_context():
        # Create admin user if it doesn't exist
        if not db.session.query(User).filter(User.username == "admin").first():
            admin = User(
                username="admin",
                email="admin@example.com",
                role="admin",
                department="management",
                is_active=True
            )
            admin.set_password("admin123")
            db.session.add(admin)
            print("Added admin user")
        
        # Create test user if it doesn't exist
        if not db.session.query(User).filter(User.username == "inspector").first():
            inspector = User(
                username="inspector",
                email="inspector@example.com",
                role="inspector",
                department="qc",
                is_active=True
            )
            inspector.set_password("inspector123")
            db.session.add(inspector)
            print("Added inspector user")
        
        # Create warehouse if it doesn't exist
        if not db.session.query(Warehouse).filter(Warehouse.name == "Main Warehouse").first():
            warehouse = Warehouse(
                name="Main Warehouse",
                location="Floor 17"
            )
            db.session.add(warehouse)
            print("Added main warehouse")
        
        # Create lookup types and values if they don't exist
        if not db.session.query(LookupType).filter(LookupType.name == "panel_type").first():
            panel_type = LookupType(name="panel_type")
            db.session.add(panel_type)
            db.session.flush()  # Flush to get ID
            
            # Add panel types
            standard = Lookup(lookup_type_id=panel_type.id, code="STD", label="Standard")
            custom = Lookup(lookup_type_id=panel_type.id, code="CST", label="Custom")
            db.session.add_all([standard, custom])
            print("Added panel types")
        
        # Create QC attribute definitions if they don't exist
        if not db.session.query(QCAttributeDef).filter(QCAttributeDef.name == "width").first():
            width = QCAttributeDef(
                name="width",
                data_type="numeric",
                description="Panel width in millimeters"
            )
            height = QCAttributeDef(
                name="height", 
                data_type="numeric",
                description="Panel height in millimeters"
            )
            sealant_check = QCAttributeDef(
                name="sealant_quality",
                data_type="lookup",
                description="Quality of sealant application"
            )
            db.session.add_all([width, height, sealant_check])
            print("Added QC attribute definitions")
        
        # Commit all changes
        db.session.commit()
        print("Database seeding completed successfully")

if __name__ == "__main__":
    seed_database()