from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Date, Float, CheckConstraint, Numeric, LargeBinary, Time
from sqlalchemy.sql import func
from passlib.hash import bcrypt
from flask_login import UserMixin
import os
import base64
import json

# Create SQLAlchemy instance
db = SQLAlchemy()

class User(db.Model, UserMixin):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="inspector")
    department = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    qc_sessions = db.relationship("QCSession", back_populates="inspector_user", foreign_keys="QCSession.inspector_id")

    def set_password(self, password):
        self.password_hash = bcrypt.hash(password)

    def verify_password(self, password):
        return bcrypt.verify(password, self.password_hash)

    def is_admin(self):
        return self.role == "admin"

    def is_manager(self):
        return self.role in ["admin", "manager"]

    # Method for flask-login
    def get_id(self):
        return str(self.id)


class Product(db.Model):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    product_number = Column(String(50), nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    status = Column(String(20), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"))

    # Relationships
    warehouse = db.relationship("Warehouse", back_populates="products")
    qc_sessions = db.relationship("QCSession", back_populates="product")
    shipments = db.relationship("ProductShipment", back_populates="product")

    # Constraints
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'qc_passed', 'shipped', 'complete')", name="valid_status"),
    )


class QCSession(db.Model):
    __tablename__ = "qc_sessions"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    inspector_id = Column(Integer, ForeignKey("users.id"))
    performed_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    product = db.relationship("Product", back_populates="qc_sessions")
    inspector_user = db.relationship("User", back_populates="qc_sessions", foreign_keys=[inspector_id])
    attribute_values = db.relationship("QCAttributeValue", back_populates="qc_session", cascade="all, delete-orphan")
    photos = db.relationship("QCPhoto", back_populates="qc_session", cascade="all, delete-orphan")


class QCAttributeDef(db.Model):
    __tablename__ = "qc_attribute_defs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    data_type = Column(String(20), nullable=False)
    description = Column(Text)

    # Relationships
    values = db.relationship("QCAttributeValue", back_populates="attribute_def")
    photos = db.relationship("QCPhoto", back_populates="attribute")

    # Constraints
    __table_args__ = (
        CheckConstraint("data_type IN ('numeric', 'boolean', 'text', 'lookup', 'photo')", name="valid_data_type"),
    )


class QCAttributeValue(db.Model):
    __tablename__ = "qc_attribute_values"

    qc_id = Column(Integer, ForeignKey("qc_sessions.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    attribute_id = Column(Integer, ForeignKey("qc_attribute_defs.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    value_numeric = Column(Numeric(10, 3))
    value_text = Column(Text)
    lookup_id = Column(Integer, ForeignKey("lookups.id"))
    photo_url = Column(Text)

    # Relationships
    qc_session = db.relationship("QCSession", back_populates="attribute_values")
    attribute_def = db.relationship("QCAttributeDef", back_populates="values")
    lookup = db.relationship("Lookup")


class LookupType(db.Model):
    __tablename__ = "lookup_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)

    # Relationships
    lookups = db.relationship("Lookup", back_populates="lookup_type")


class Lookup(db.Model):
    __tablename__ = "lookups"

    id = Column(Integer, primary_key=True, index=True)
    lookup_type_id = Column(Integer, ForeignKey("lookup_types.id", ondelete="CASCADE"), nullable=False)
    code = Column(String(50), nullable=False)
    label = Column(String(200), nullable=False)
    parent_id = Column(Integer, ForeignKey("lookups.id"))

    # Relationships
    lookup_type = db.relationship("LookupType", back_populates="lookups")
    children = db.relationship("Lookup", foreign_keys=[parent_id], backref=db.backref("parent", remote_side=[id]))

    # Constraints
    __table_args__ = (
        CheckConstraint('parent_id != id', name='no_self_reference'),
    )


class QCPhoto(db.Model):
    __tablename__ = "qc_photos"

    id = Column(Integer, primary_key=True, index=True)
    qc_id = Column(Integer, ForeignKey("qc_sessions.id", ondelete="CASCADE"), nullable=False)
    attribute_id = Column(Integer, ForeignKey("qc_attribute_defs.id"))
    url = Column(Text, nullable=False)
    note = Column(Text)

    # Relationships
    qc_session = db.relationship("QCSession", back_populates="photos")
    attribute = db.relationship("QCAttributeDef", back_populates="photos")


class Warehouse(db.Model):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    location = Column(Text)

    # Relationships
    products = db.relationship("Product", back_populates="warehouse")
    inventory_snapshots = db.relationship("InventorySnapshot", back_populates="warehouse")
    part_shipments = db.relationship("PartShipment", back_populates="warehouse")


class PartType(db.Model):
    __tablename__ = "part_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)

    # Relationships
    subtypes = db.relationship("PartSubtype", back_populates="part_type")


class PartSubtype(db.Model):
    __tablename__ = "part_subtypes"

    id = Column(Integer, primary_key=True, index=True)
    part_type_id = Column(Integer, ForeignKey("part_types.id"), nullable=False)
    name = Column(String(200), nullable=False)

    # Relationships
    part_type = db.relationship("PartType", back_populates="subtypes")
    inventory_snapshots = db.relationship("InventorySnapshot", back_populates="part_subtype")
    part_shipments = db.relationship("PartShipment", back_populates="part_subtype")
    images = db.relationship("PartSubtypeImage", back_populates="part_subtype")


class InventorySnapshot(db.Model):
    __tablename__ = "inventory_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    part_subtype_id = Column(Integer, ForeignKey("part_subtypes.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    snapshot_date = Column(Date, nullable=False)

    # Relationships
    part_subtype = db.relationship("PartSubtype", back_populates="inventory_snapshots")
    warehouse = db.relationship("Warehouse", back_populates="inventory_snapshots")

    # Constraints
    __table_args__ = (
        CheckConstraint("quantity >= 0", name="non_negative_quantity"),
    )


class PartShipment(db.Model):
    __tablename__ = "part_shipments"

    id = Column(Integer, primary_key=True, index=True)
    part_subtype_id = Column(Integer, ForeignKey("part_subtypes.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    received_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    vendor = Column(String(200))

    # Relationships
    part_subtype = db.relationship("PartSubtype", back_populates="part_shipments")
    warehouse = db.relationship("Warehouse", back_populates="part_shipments")

    # Constraints
    __table_args__ = (
        CheckConstraint("quantity > 0", name="positive_quantity"),
    )


class Container(db.Model):
    __tablename__ = "containers"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(Text)
    capacity = Column(Integer)

    # Relationships
    product_shipments = db.relationship("ProductShipment", back_populates="container")


class ProductShipment(db.Model):
    __tablename__ = "product_shipments"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    container_id = Column(Integer, ForeignKey("containers.id"))
    shipped_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    destination = Column(String(200))

    # Relationships
    product = db.relationship("Product", back_populates="shipments")
    container = db.relationship("Container", back_populates="product_shipments")


class PartSubtypeImage(db.Model):
    __tablename__ = "part_subtype_images"

    id = Column(Integer, primary_key=True, index=True)
    part_subtype_id = Column(Integer, ForeignKey("part_subtypes.id"), nullable=False)
    image_data = Column(Text, nullable=False)  # Base64 encoded image
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    part_subtype = db.relationship("PartSubtype", back_populates="images")


class ProductPart(db.Model):
    """
    Product part model representing aluminum extrusion die information.
    """
    __tablename__ = "product_parts"

    id = Column(Integer, primary_key=True, index=True)
    product_part_id = Column(String(50), nullable=False, unique=True, comment="Die # (PF)")
    product_part_name = Column(String(100), nullable=False, comment="Die Name")
    product_part_vendor = Column(String(100), nullable=True, comment="Die # (Vendor)")
    product_part_image = Column(LargeBinary, nullable=True, comment="Profile Image stored as binary data")
    product_part_type = Column(String(100), nullable=True, comment="Type (e.g. Mullion)")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    product_colors = db.relationship("ProductColor", back_populates="product_part", cascade="all, delete-orphan")

    def set_image_from_base64(self, base64_str):
        """Convert base64 string to binary data for storage"""
        if base64_str:
            # Remove data URL prefix if present (e.g., "data:image/png;base64,")
            if ',' in base64_str:
                base64_str = base64_str.split(',', 1)[1]
            self.product_part_image = base64.b64decode(base64_str)
    
    def get_image_as_base64(self):
        """Convert binary image data to base64 string for display"""
        if self.product_part_image:
            return base64.b64encode(self.product_part_image).decode('utf-8')
        return None


class CoatingColor(db.Model):
    """
    Coating color model representing available coating colors for aluminum parts.
    """
    __tablename__ = "coating_colors"

    id = Column(Integer, primary_key=True, index=True)
    coating_color_name = Column(String(100), nullable=False, unique=True, comment="Name of the coating color")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    
    # Relationships
    product_colors = db.relationship("ProductColor", back_populates="coating_color", cascade="all, delete-orphan")


class ProductColor(db.Model):
    """
    Product color model representing the many-to-many relationship between product parts and coating colors.
    """
    __tablename__ = "product_colors"

    id = Column(Integer, primary_key=True, index=True)
    product_part_id = Column(Integer, ForeignKey("product_parts.id", ondelete="CASCADE"), nullable=False)
    coating_color_id = Column(Integer, ForeignKey("coating_colors.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    product_part = db.relationship("ProductPart", back_populates="product_colors")
    coating_color = db.relationship("CoatingColor", back_populates="product_colors")
    
    # Unique constraint to prevent duplicate product part and coating color combinations
    __table_args__ = (
        CheckConstraint("product_part_id IS NOT NULL", name="check_product_part_id"),
        CheckConstraint("coating_color_id IS NOT NULL", name="check_coating_color_id"),
    )


class QCReport(db.Model):
    """
    QC Report model for tracking sealant application reports.
    Contains batch information and glazing details with JSON fields for flexible storage.
    Only panels_glazed is stored individually for each batch item. Date_glazed, time_glazed, 
    and other fields like strs_batch, catalyst_batch, primer_c are shared across all batch items.
    """
    __tablename__ = "qc_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(50), nullable=False, unique=True, index=True)
    strs_batch = Column(Text, nullable=True, comment="JSON data for StrS Batch information (shared across all batch items)")
    catalyst_batch = Column(Text, nullable=True, comment="JSON data for Catalyst Batch information (shared across all batch items)")
    primer_c = Column(Text, nullable=True, comment="JSON data for Primer C information (shared across all batch items)")
    batch_items = Column(Text, nullable=True, comment="JSON array of batch items, each containing an individual panels_glazed value")
    # These fields are shared across all batch items in a report
    panels_glazed = Column(String(100), nullable=True, comment="Default panels_glazed for backward compatibility")
    date_glazed = Column(Date, nullable=True, comment="Date glazed (shared across all batch items)")
    time_glazed = Column(Time, nullable=True, comment="Time glazed (shared across all batch items)")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    creator = db.relationship("User", foreign_keys=[created_by])
    images = db.relationship("ReportImage", back_populates="report", cascade="all, delete-orphan")

    def set_strs_batch(self, batch_data):
        """Set StrS Batch data as JSON"""
        if isinstance(batch_data, dict):
            self.strs_batch = json.dumps(batch_data)
        else:
            self.strs_batch = batch_data
    
    def get_strs_batch(self):
        """Get StrS Batch data as dict"""
        if self.strs_batch:
            try:
                return json.loads(self.strs_batch)
            except:
                return {}
        return {}
    
    def set_catalyst_batch(self, batch_data):
        """Set Catalyst Batch data as JSON"""
        if isinstance(batch_data, dict):
            self.catalyst_batch = json.dumps(batch_data)
        else:
            self.catalyst_batch = batch_data
    
    def get_catalyst_batch(self):
        """Get Catalyst Batch data as dict"""
        if self.catalyst_batch:
            try:
                return json.loads(self.catalyst_batch)
            except:
                return {}
        return {}
    
    def set_primer_c(self, primer_data):
        """Set Primer C data as JSON"""
        if isinstance(primer_data, dict):
            self.primer_c = json.dumps(primer_data)
        else:
            self.primer_c = primer_data
    
    def get_primer_c(self):
        """Get Primer C data as dict"""
        if self.primer_c:
            try:
                return json.loads(self.primer_c)
            except:
                return {}
        return {}
    
    def set_batch_items(self, items_data):
        """Set batch items as JSON array"""
        if isinstance(items_data, list):
            self.batch_items = json.dumps(items_data)
        else:
            self.batch_items = items_data
    
    def get_batch_items(self):
        """Get batch items as list of dicts"""
        if self.batch_items:
            try:
                return json.loads(self.batch_items)
            except:
                return []
        return []


class ReportImage(db.Model):
    """
    Model for storing images associated with QC reports.
    """
    __tablename__ = "report_images"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("qc_reports.id", ondelete="CASCADE"), nullable=False)
    image_data = Column(LargeBinary, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    report = db.relationship("QCReport", back_populates="images")
    
    def set_image_from_base64(self, base64_str):
        """Convert base64 string to binary data for storage"""
        if base64_str:
            # Remove data URL prefix if present (e.g., "data:image/png;base64,")
            if ',' in base64_str:
                base64_str = base64_str.split(',', 1)[1]
            self.image_data = base64.b64decode(base64_str)
    
    def get_image_as_base64(self):
        """Convert binary image data to base64 string for display"""
        if self.image_data:
            return base64.b64encode(self.image_data).decode('utf-8')
        return None


# QC CW Panel Data Models
class QCCWPanelData(db.Model):
    """
    QC CW Panel Data model for Curtain Wall panels quality control data.
    """
    __tablename__ = "qc_cw_panel_data"
    
    id = Column(Integer, primary_key=True, index=True)
    fl_id = Column(String(20), nullable=False, index=True)
    pan_id = Column(String(20), nullable=False)
    pan_name = Column(String(50), nullable=False)  # Calculated as 'c'+fl_id+'.'+pan_id
    
    # CW Frame Assembly fields
    ipa_cleaned = Column(Boolean, default=False)  # Checkbox
    sealant_frame_enough = Column(Boolean, default=False)  # Checkbox
    
    # Panel measurements as JSON fields
    width_l = Column(Text, nullable=True)  # {'GZ_office': numeric, 'factory_offer': 'yes'/'no, add sealant'}
    width_r = Column(Text, nullable=True)
    height_1 = Column(Text, nullable=True)
    height_2 = Column(Text, nullable=True)
    height_3 = Column(Text, nullable=True)
    height_4 = Column(Text, nullable=True)
    
    # Cavities information
    cavities_invert = Column(Integer, nullable=True)  # Number of cavities
    cavity_ro_height_total = Column(Text, nullable=True)  # {'GZ_office': numeric, 'factory_offer': numeric}
    cavity_diag_cw_pan_l = Column(Text, nullable=True)
    cavity_diag_cw_pan_r = Column(Text, nullable=True)
    
    # Mullion parts as JSON
    left = Column(Text, nullable=True)  # {'GZ_office': product_part_id, 'IT_look': image}
    middle = Column(Text, nullable=True)
    right = Column(Text, nullable=True)
    head = Column(Text, nullable=True)
    sill = Column(Text, nullable=True)
    
    # Transom parts as JSON
    trans_1 = Column(Text, nullable=True)  # Only D015, D016
    trans_2 = Column(Text, nullable=True)
    trans_3 = Column(Text, nullable=True)
    
    # Bracket parts as JSON
    bracket_l = Column(Text, nullable=True)  # Only parts with prefix D06
    bracket_r = Column(Text, nullable=True)
    
    # Infill location
    infill_fs_location = Column(Text, nullable=True)  # {'GZ_office': int, 'factory_offer': boolean}
    
    # Infill types (combined in groups)
    infills_1_type = Column(Text, nullable=True)  # {'GZ_office': text, 'GZ_office_2': text, 'factory_offer': boolean}
    infills_2_type = Column(Text, nullable=True)
    infills_3_type = Column(Text, nullable=True)
    infills_4_type = Column(Text, nullable=True)
    infills_right_1_type = Column(Text, nullable=True)  # For right combined panel
    infills_right_2_type = Column(Text, nullable=True)
    infills_right_3_type = Column(Text, nullable=True)
    infills_right_4_type = Column(Text, nullable=True)
    
    # Infill colors
    infills_1_color = Column(Text, nullable=True)  # {'GZ_office': text, 'factory_offer': boolean}
    infills_2_color = Column(Text, nullable=True)
    infills_3_color = Column(Text, nullable=True)
    infills_4_color = Column(Text, nullable=True)
    infills_right_1_color = Column(Text, nullable=True)
    infills_right_2_color = Column(Text, nullable=True)
    infills_right_3_color = Column(Text, nullable=True)
    infills_right_4_color = Column(Text, nullable=True)
    
    # Additional fields
    qc_infill_affix = Column(String(200), nullable=True)  # Text field
    structural_sealant_records = Column(Text, nullable=True)  # Text area
    lmr = Column(String(1), nullable=True)  # L, M, or R
    type_gz_factory = Column(Text, nullable=True)  # {'GZ_office': text, 'factory_offer': text}
    
    # Image fields
    profile_photo = Column(LargeBinary, nullable=True)  # For storing the image
    
    # Final checks
    edge_bead_attached = Column(Boolean, default=False)
    operable = Column(Boolean, default=False)
    card_checked = Column(String(20), nullable=True)  # 'pass', 'no pass-rework', 'no pass-fix at jobsite'
    paint_damage = Column(String(20), nullable=True)
    glass_scratched = Column(String(20), nullable=True)
    cleaned_ready = Column(String(20), nullable=True)  # 'pass: cleaned', 'ready to pack', 'not cleaned'
    crated = Column(Boolean, default=False)
    
    # Many-to-one relationship with User
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Setup relationships
    creator = db.relationship("User", foreign_keys=[created_by])
    updater = db.relationship("User", foreign_keys=[updated_by])
    frame_cavities_values = db.relationship("FrameCavitiesValue", back_populates="panel", cascade="all, delete-orphan")
    panel_photos = db.relationship("QCCWPanelPhoto", back_populates="panel", cascade="all, delete-orphan")
    
    def get_profile_photo_as_base64(self):
        """Convert binary image data to base64 for transmission."""
        if self.profile_photo:
            return base64.b64encode(self.profile_photo).decode('utf-8')
        return None
    
    def set_profile_photo_from_base64(self, base64_data):
        """Set profile photo from base64 encoded data."""
        if base64_data:
            # Extract the base64 content after the comma if it includes data URL format
            if ',' in base64_data:
                base64_data = base64_data.split(',', 1)[1]
            self.profile_photo = base64.b64decode(base64_data)
    
    def set_json_field(self, field_name, data):
        """Set JSON field by name"""
        if hasattr(self, field_name) and data is not None:
            if isinstance(data, dict):
                setattr(self, field_name, json.dumps(data))
            else:
                setattr(self, field_name, data)
    
    def get_json_field(self, field_name):
        """Get JSON field by name as dict"""
        value = getattr(self, field_name, None)
        if value:
            try:
                return json.loads(value)
            except:
                return {}
        return {}


# Frame Cavities Attribute Model
class FrameCavitiesAttribute(db.Model):
    """
    Frame Cavities Attribute model for storing attributes that depend on fl_id.
    """
    __tablename__ = "frame_cavities_attributes"
    
    id = Column(Integer, primary_key=True, index=True)
    fl_id = Column(String(20), nullable=False, index=True)  # Link to the fl_id in QCCWPanelData
    attribute_name = Column(String(100), nullable=False)
    attribute_type = Column(Text, nullable=False)  # JSON: {'Input-GZ office': bool, 'Factory floor': bool}
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Setup relationships
    values = db.relationship("FrameCavitiesValue", back_populates="attribute", cascade="all, delete-orphan")
    
    def set_attribute_type(self, data):
        """Set attribute type as JSON"""
        if isinstance(data, dict):
            self.attribute_type = json.dumps(data)
        else:
            self.attribute_type = data
    
    def get_attribute_type(self):
        """Get attribute type as dict"""
        if self.attribute_type:
            try:
                return json.loads(self.attribute_type)
            except:
                return {}
        return {}


# Frame Cavities Value Model
class FrameCavitiesValue(db.Model):
    """
    Frame Cavities Value model for storing actual values for panel attributes.
    """
    __tablename__ = "frame_cavities_values"
    
    id = Column(Integer, primary_key=True, index=True)
    panel_id = Column(Integer, ForeignKey("qc_cw_panel_data.id", ondelete="CASCADE"), nullable=False)
    attribute_id = Column(Integer, ForeignKey("frame_cavities_attributes.id", ondelete="CASCADE"), nullable=False)
    value = Column(String(255), nullable=True)  # Value for this attribute
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Setup relationships
    panel = db.relationship("QCCWPanelData", back_populates="frame_cavities_values")
    attribute = db.relationship("FrameCavitiesAttribute", back_populates="values")


# QC CW Panel Photos Model
class QCCWPanelPhoto(db.Model):
    """
    QC CW Panel Photos model for storing multiple photos for a panel.
    """
    __tablename__ = "qc_cw_panel_photos"
    
    id = Column(Integer, primary_key=True, index=True)
    panel_id = Column(Integer, ForeignKey("qc_cw_panel_data.id", ondelete="CASCADE"), nullable=False)
    photo = Column(LargeBinary, nullable=True)
    photo_type = Column(String(50), nullable=True)  # Type of photo (profile, sealant, etc.)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Setup relationships
    panel = db.relationship("QCCWPanelData", back_populates="panel_photos")
    
    def get_photo_as_base64(self):
        """Convert binary image data to base64 for transmission."""
        if self.photo:
            return base64.b64encode(self.photo).decode('utf-8')
        return None
    
    def set_photo_from_base64(self, base64_data):
        """Set photo from base64 encoded data."""
        if base64_data:
            # Extract the base64 content after the comma if it includes data URL format
            if ',' in base64_data:
                base64_data = base64_data.split(',', 1)[1]
            self.photo = base64.b64decode(base64_data)