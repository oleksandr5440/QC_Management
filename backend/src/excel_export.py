"""
Excel export functionality for the QC Management System.
This module handles exporting database data to Excel files that match the structure
of the reference Excel files.
"""

import io
import pandas as pd
from sqlalchemy.orm import Session
from datetime import datetime
import json
from sqlalchemy import text

def export_qc_cw_panel_data_to_excel(db_session: Session):
    """
    Export QC CW Panel Data to Excel with the same structure as the reference file.
    
    Args:
        db_session: SQLAlchemy database session
        
    Returns:
        BytesIO: Excel file as bytes stream
    """
    # Create a BytesIO object to store the Excel file
    output = io.BytesIO()
    
    # Create an Excel writer with the BytesIO object
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        try:
            # Export Fl-17 sheet data (QC CW Panel Data)
            export_fl17_sheet(db_session, writer)
        except Exception as e:
            print(f"Error exporting Fl-17 sheet: {str(e)}")
            # Create a minimal sheet if export fails
            pd.DataFrame({'Error': ['No data available']}).to_excel(writer, sheet_name='Fl-17')
        
        try:
            # Export Str Seal sheet data
            export_str_seal_sheet(db_session, writer)
        except Exception as e:
            print(f"Error exporting Str Seal sheet: {str(e)}")
            # Create a minimal sheet if export fails
            pd.DataFrame({'Error': ['No data available']}).to_excel(writer, sheet_name='Str Seal')
        
        try:
            # Export Adm-Extrus,Infills sheet data
            export_inventory_sheet(db_session, writer)
        except Exception as e:
            print(f"Error exporting Inventory sheet: {str(e)}")
            # Create a minimal sheet if export fails
            pd.DataFrame({'Error': ['No data available']}).to_excel(writer, sheet_name='Adm-Extrus,Infills')
        
    # Reset the BytesIO position to the beginning
    output.seek(0)
    return output

def export_fl17_sheet(db_session: Session, writer):
    """
    Export QC CW Panel Data to Fl-17 sheet.
    
    Args:
        db_session: SQLAlchemy database session
        writer: Excel writer
    """
    # Create a simple DataFrame with headers to ensure we have a valid sheet
    headers = create_fl17_headers()
    excel_df = pd.DataFrame(columns=headers)
    write_fl17_sheet(writer, excel_df, headers)
    
    # Let's just get a list of columns to make sure we don't have any column mismatches
    try:
        # Get column names dynamically
        col_query = text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'qc_cw_panel_data'
            ORDER BY ordinal_position
        """)
        
        result = db_session.execute(col_query)
        columns = [row[0] for row in result.fetchall()]
        
        # Build a dynamic query based on actual columns
        select_parts = ["qp.id", "qp.fl_id", "qp.pan_id", 
                      "'C' || qp.fl_id || '.' || qp.pan_id AS panel_name"]
        
        # Add columns that exist in the table
        common_columns = [
            'ipa_cleaned', 'sealant_frame_enough', 'width_l', 'width_r',
            'height_1', 'height_2', 'height_3', 'height_4', 'cavities_invert',
            'cavity_ro_height_total', 'cavity_diag_cw_pan_l', 'cavity_diag_cw_pan_r',
            'left', 'middle', 'right', 'head', 'sill',
            'trans_1', 'trans_2', 'trans_3', 'bracket_l', 'bracket_r',
            'infill_fs_location', 'infills_1_type', 'infills_2_type', 'infills_3_type', 'infills_4_type',
            'infills_right_1_type', 'infills_right_2_type', 'infills_right_3_type', 'infills_right_4_type',
            'infills_1_color', 'infills_2_color', 'infills_3_color', 'infills_4_color',
            'infills_right_1_color', 'infills_right_2_color', 'infills_right_3_color', 'infills_right_4_color',
            'qc_infill_affix', 'structural_sealant_records', 'lmr', 'type_gz_factory',
            'edge_bead_attached', 'operable', 'card_checked', 'paint_damage',
            'glass_scratched', 'cleaned_ready', 'crated'
        ]
        
        for col in common_columns:
            if col in columns:
                select_parts.append(f"qp.{col}")
        
        # Create the query with the columns that exist
        select_clause = ",\n            ".join(select_parts)
        query_str = f"""
            SELECT 
            {select_clause}
            FROM qc_cw_panel_data qp
            ORDER BY qp.fl_id, qp.pan_id
        """
        
        query = text(query_str)
    except Exception as e:
        print(f"Error building dynamic query: {str(e)}")
        return
    
    # Execute the query
    result = db_session.execute(query)
    records = result.fetchall()
    
    # Convert the results to a list of dictionaries
    data = []
    for record in records:
        row = dict(record)
        # Convert JSON strings to dictionaries
        for key in row:
            if key in [
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
                'type_gz_factory', 'isa_type'
            ] and row[key] and isinstance(row[key], str):
                try:
                    row[key] = json.loads(row[key])
                except:
                    # If JSON conversion fails, keep the original value
                    pass
        data.append(row)
    
    # Create a DataFrame from the data
    df = pd.DataFrame(data) if data else pd.DataFrame()
    
    if not df.empty:
        # Prepare the data in the format needed for the Excel file
        excel_data = format_fl17_data_for_excel(df)
        
        # Create the headers (matching the reference file)
        headers = create_fl17_headers()
        
        # Create the DataFrame for the Excel file
        excel_df = pd.DataFrame(excel_data)
        
        # Write the headers and data to the Excel file
        write_fl17_sheet(writer, excel_df, headers)
    else:
        # Create an empty DataFrame with the headers
        headers = create_fl17_headers()
        excel_df = pd.DataFrame(columns=headers)
        write_fl17_sheet(writer, excel_df, headers)

def format_fl17_data_for_excel(df):
    """
    Format the QC CW Panel Data for the Excel file.
    
    Args:
        df: DataFrame with QC CW Panel Data
        
    Returns:
        list: Data formatted for Excel
    """
    excel_data = []
    
    for idx, row in df.iterrows():
        excel_row = {
            'Index': idx + 1,
            'pan #': row['pan_id'],
            'Panel #': row['panel_name'],
            'IPA cleaned': 'yes' if row['ipa_cleaned'] else 'no',
            'Sealant Frame enough': 'yes' if row['sealant_frame_enough'] else 'no',
            'Width-L (mm)': extract_json_value(row['width_l'], 'GZ_office'),
            'Width-L factory': extract_json_value(row['width_l'], 'factory_floor'),
            'Width-R (mm)': extract_json_value(row['width_r'], 'GZ_office'),
            'Width-R factory': extract_json_value(row['width_r'], 'factory_floor'),
            'Height 1 (mm)': extract_json_value(row['height_1'], 'GZ_office'),
            'Height 1 factory': extract_json_value(row['height_1'], 'factory_floor'),
            'Height 2 (mm)': extract_json_value(row['height_2'], 'GZ_office'),
            'Height 2 factory': extract_json_value(row['height_2'], 'factory_floor'),
            'Height 3 (mm)': extract_json_value(row['height_3'], 'GZ_office'),
            'Height 3 factory': extract_json_value(row['height_3'], 'factory_floor'),
            'Height 4 (mm)': extract_json_value(row['height_4'], 'GZ_office'),
            'Height 4 factory': extract_json_value(row['height_4'], 'factory_floor'),
            '# Cavities (in vert)': row['cavities_invert'],
            'Cavity RO Height Total (mm)': extract_json_value(row['cavity_ro_height_total'], 'GZ_office'),
            'Cavity RO Height Total factory': extract_json_value(row['cavity_ro_height_total'], 'factory_floor'),
            'Cavity Diag CW Pan-L (mm)': extract_json_value(row['cavity_diag_cw_pan_l'], 'GZ_office'),
            'Cavity Diag CW Pan-L factory': extract_json_value(row['cavity_diag_cw_pan_l'], 'factory_floor'),
            'Cavity Diag CW Pan-R (mm)': extract_json_value(row['cavity_diag_cw_pan_r'], 'GZ_office'),
            'Cavity Diag CW Pan-R factory': extract_json_value(row['cavity_diag_cw_pan_r'], 'factory_floor'),
            'Left': extract_json_value(row['left'], 'GZ_office'),
            'Left factory': extract_json_value(row['left'], 'factory_floor'),
            'Middle': extract_json_value(row['middle'], 'GZ_office'),
            'Middle factory': extract_json_value(row['middle'], 'factory_floor'),
            'Right': extract_json_value(row['right'], 'GZ_office'),
            'Right factory': extract_json_value(row['right'], 'factory_floor'),
            'Head': extract_json_value(row['head'], 'GZ_office'),
            'Head factory': extract_json_value(row['head'], 'factory_floor'),
            'Sill': extract_json_value(row['sill'], 'GZ_office'),
            'Sill factory': extract_json_value(row['sill'], 'factory_floor'),
            'Trans-1': extract_json_value(row['trans_1'], 'GZ_office'),
            'Trans-1 factory': extract_json_value(row['trans_1'], 'factory_floor'),
            'Trans-2': extract_json_value(row['trans_2'], 'GZ_office'),
            'Trans-2 factory': extract_json_value(row['trans_2'], 'factory_floor'),
            'Trans-3': extract_json_value(row['trans_3'], 'GZ_office'),
            'Trans-3 factory': extract_json_value(row['trans_3'], 'factory_floor'),
            'Bracket-L': extract_json_value(row['bracket_l'], 'GZ_office'),
            'Bracket-L factory': extract_json_value(row['bracket_l'], 'factory_floor'),
            'Bracket-R': extract_json_value(row['bracket_r'], 'GZ_office'),
            'Bracket-R factory': extract_json_value(row['bracket_r'], 'factory_floor'),
            'Infill-FS-Location': extract_json_value(row['infill_fs_location'], 'GZ_office'),
            'Infill-FS-Location factory': extract_json_value(row['infill_fs_location'], 'factory_floor'),
            'Infill 1 Type': extract_json_value(row['infills_1_type'], 'GZ_office'),
            'Infill 1 Type 2': extract_json_value(row['infills_1_type'], 'GZ_office_2'),
            'Infill 1 factory': extract_json_value(row['infills_1_type'], 'factory_floor'),
            'Infill 1 Color': extract_json_value(row['infills_1_color'], 'GZ_office'),
            'Infill 1 Color factory': extract_json_value(row['infills_1_color'], 'factory_floor'),
            'Infill 2 Type': extract_json_value(row['infills_2_type'], 'GZ_office'),
            'Infill 2 Type 2': extract_json_value(row['infills_2_type'], 'GZ_office_2'),
            'Infill 2 factory': extract_json_value(row['infills_2_type'], 'factory_floor'),
            'Infill 2 Color': extract_json_value(row['infills_2_color'], 'GZ_office'),
            'Infill 2 Color factory': extract_json_value(row['infills_2_color'], 'factory_floor'),
            'Infill 3 Type': extract_json_value(row['infills_3_type'], 'GZ_office'),
            'Infill 3 Type 2': extract_json_value(row['infills_3_type'], 'GZ_office_2'),
            'Infill 3 factory': extract_json_value(row['infills_3_type'], 'factory_floor'),
            'Infill 3 Color': extract_json_value(row['infills_3_color'], 'GZ_office'),
            'Infill 3 Color factory': extract_json_value(row['infills_3_color'], 'factory_floor'),
            'Infill 4 Type': extract_json_value(row['infills_4_type'], 'GZ_office'),
            'Infill 4 Type 2': extract_json_value(row['infills_4_type'], 'GZ_office_2'),
            'Infill 4 factory': extract_json_value(row['infills_4_type'], 'factory_floor'),
            'Infill 4 Color': extract_json_value(row['infills_4_color'], 'GZ_office'),
            'Infill 4 Color factory': extract_json_value(row['infills_4_color'], 'factory_floor'),
            'Right Infill 1 Type': extract_json_value(row['infills_right_1_type'], 'GZ_office'),
            'Right Infill 1 Type 2': extract_json_value(row['infills_right_1_type'], 'GZ_office_2'),
            'Right Infill 1 factory': extract_json_value(row['infills_right_1_type'], 'factory_floor'),
            'Right Infill 1 Color': extract_json_value(row['infills_right_1_color'], 'GZ_office'),
            'Right Infill 1 Color factory': extract_json_value(row['infills_right_1_color'], 'factory_floor'),
            'Right Infill 2 Type': extract_json_value(row['infills_right_2_type'], 'GZ_office'),
            'Right Infill 2 Type 2': extract_json_value(row['infills_right_2_type'], 'GZ_office_2'),
            'Right Infill 2 factory': extract_json_value(row['infills_right_2_type'], 'factory_floor'),
            'Right Infill 2 Color': extract_json_value(row['infills_right_2_color'], 'GZ_office'),
            'Right Infill 2 Color factory': extract_json_value(row['infills_right_2_color'], 'factory_floor'),
            'Right Infill 3 Type': extract_json_value(row['infills_right_3_type'], 'GZ_office'),
            'Right Infill 3 Type 2': extract_json_value(row['infills_right_3_type'], 'GZ_office_2'),
            'Right Infill 3 factory': extract_json_value(row['infills_right_3_type'], 'factory_floor'),
            'Right Infill 3 Color': extract_json_value(row['infills_right_3_color'], 'GZ_office'),
            'Right Infill 3 Color factory': extract_json_value(row['infills_right_3_color'], 'factory_floor'),
            'Right Infill 4 Type': extract_json_value(row['infills_right_4_type'], 'GZ_office'),
            'Right Infill 4 Type 2': extract_json_value(row['infills_right_4_type'], 'GZ_office_2'),
            'Right Infill 4 factory': extract_json_value(row['infills_right_4_type'], 'factory_floor'),
            'Right Infill 4 Color': extract_json_value(row['infills_right_4_color'], 'GZ_office'),
            'Right Infill 4 Color factory': extract_json_value(row['infills_right_4_color'], 'factory_floor'),
            'QC Infill Affix': row['qc_infill_affix'],
            'Structural Sealant Records': row['structural_sealant_records'],
            'L/M/R': row['lmr'],
            'Type 1': extract_json_value(row['type_gz_factory'], 'GZ_office'),
            'Type 1 factory': extract_json_value(row['type_gz_factory'], 'factory_floor'),
            'Type 2': extract_json_value(row['isa_type'], 'GZ_office'),
            'Type 2 factory': extract_json_value(row['isa_type'], 'factory_floor'),
            'Edge Bead Attached': 'yes' if row['edge_bead_attached'] else 'no',
            'Operable': 'yes' if row['operable'] else 'no',
            'Card Checked': row['card_checked'],
            'Paint Damage': row['paint_damage'],
            'Glass Scratched': row['glass_scratched'],
            'Cleaned Ready': row['cleaned_ready'],
            'Crated': 'yes' if row['crated'] else 'no'
        }
        excel_data.append(excel_row)
    
    return excel_data

def extract_json_value(json_data, key):
    """
    Extract a value from a JSON object or dictionary.
    
    Args:
        json_data: JSON object or dictionary or string representation
        key: Key to extract
        
    Returns:
        Value of the key or None if not found
    """
    if not json_data:
        return None
    
    if isinstance(json_data, str):
        try:
            json_data = json.loads(json_data)
        except:
            return None
    
    if isinstance(json_data, dict) and key in json_data:
        return json_data[key]
    
    return None

def create_fl17_headers():
    """
    Create the headers for the Fl-17 sheet.
    
    Returns:
        list: Headers for the Fl-17 sheet
    """
    # These headers should match the headers from row 15 in the reference file
    headers = [
        'Index', 'pan #', 'Panel #', 
        'IPA cleaned', 'Sealant Frame enough',
        'Width-L (mm)', 'Width-L factory',
        'Width-R (mm)', 'Width-R factory',
        'Height 1 (mm)', 'Height 1 factory',
        'Height 2 (mm)', 'Height 2 factory',
        'Height 3 (mm)', 'Height 3 factory',
        'Height 4 (mm)', 'Height 4 factory',
        '# Cavities (in vert)',
        'Cavity RO Height Total (mm)', 'Cavity RO Height Total factory',
        'Cavity Diag CW Pan-L (mm)', 'Cavity Diag CW Pan-L factory',
        'Cavity Diag CW Pan-R (mm)', 'Cavity Diag CW Pan-R factory',
        'Left', 'Left factory',
        'Middle', 'Middle factory',
        'Right', 'Right factory',
        'Head', 'Head factory',
        'Sill', 'Sill factory',
        'Trans-1', 'Trans-1 factory',
        'Trans-2', 'Trans-2 factory',
        'Trans-3', 'Trans-3 factory',
        'Bracket-L', 'Bracket-L factory',
        'Bracket-R', 'Bracket-R factory',
        'Infill-FS-Location', 'Infill-FS-Location factory',
        'Infill 1 Type', 'Infill 1 Type 2', 'Infill 1 factory', 'Infill 1 Color', 'Infill 1 Color factory',
        'Infill 2 Type', 'Infill 2 Type 2', 'Infill 2 factory', 'Infill 2 Color', 'Infill 2 Color factory',
        'Infill 3 Type', 'Infill 3 Type 2', 'Infill 3 factory', 'Infill 3 Color', 'Infill 3 Color factory',
        'Infill 4 Type', 'Infill 4 Type 2', 'Infill 4 factory', 'Infill 4 Color', 'Infill 4 Color factory',
        'Right Infill 1 Type', 'Right Infill 1 Type 2', 'Right Infill 1 factory', 'Right Infill 1 Color', 'Right Infill 1 Color factory',
        'Right Infill 2 Type', 'Right Infill 2 Type 2', 'Right Infill 2 factory', 'Right Infill 2 Color', 'Right Infill 2 Color factory',
        'Right Infill 3 Type', 'Right Infill 3 Type 2', 'Right Infill 3 factory', 'Right Infill 3 Color', 'Right Infill 3 Color factory',
        'Right Infill 4 Type', 'Right Infill 4 Type 2', 'Right Infill 4 factory', 'Right Infill 4 Color', 'Right Infill 4 Color factory',
        'QC Infill Affix', 'Structural Sealant Records', 'L/M/R',
        'Type 1', 'Type 1 factory', 'Type 2', 'Type 2 factory',
        'Edge Bead Attached', 'Operable', 'Card Checked', 'Paint Damage', 'Glass Scratched', 'Cleaned Ready', 'Crated'
    ]
    return headers

def write_fl17_sheet(writer, df, headers):
    """
    Write the Fl-17 sheet to the Excel file.
    
    Args:
        writer: Excel writer
        df: DataFrame with data
        headers: Headers for the sheet
    """
    # Create the sheet
    sheet_name = 'Fl-17'
    df.to_excel(writer, sheet_name=sheet_name, index=False, header=True)
    
    # Get the workbook and worksheet
    workbook = writer.book
    worksheet = writer.sheets[sheet_name]
    
    # Add title row at the top
    worksheet.cell(row=1, column=1, value='QC CW Panel Data')
    
    # Add the header rows
    # Row 2: Production Step categories
    worksheet.cell(row=2, column=1, value='Production Step')
    worksheet.cell(row=2, column=3, value='CW Frame Assembly')
    worksheet.cell(row=2, column=5, value='CW Frame assembled')
    
    # Row 3: Index label
    worksheet.cell(row=3, column=1, value='Index')
    
    # Row 4: IT Work note
    worksheet.cell(row=4, column=1, value='IT Work: simple look up, concatenation, etc….')
    
    # Row 5: Input type - GZ office
    worksheet.cell(row=5, column=1, value='Input-GZ office')
    
    # Row 6: Input type - Factory floor
    worksheet.cell(row=6, column=1, value='Input-Factory floor')
    
    # Format the sheet to match the reference file
    for col_num, column_title in enumerate(headers, 1):
        worksheet.cell(row=8, column=col_num, value=column_title)
    
    # Adjust column widths
    for col_num, _ in enumerate(headers, 1):
        worksheet.column_dimensions[get_column_letter(col_num)].width = 15
    
    # Start data from row 9
    for row_num, row_data in enumerate(df.values.tolist(), 9):
        for col_num, cell_value in enumerate(row_data, 1):
            worksheet.cell(row=row_num, column=col_num, value=cell_value)

def export_str_seal_sheet(db_session: Session, writer):
    """
    Export Structural Sealant data to Str Seal sheet.
    
    Args:
        db_session: SQLAlchemy database session
        writer: Excel writer
    """
    # Create a simple sheet with headers if we don't have real data yet
    pd.DataFrame({
        'Panel #': [],
        'Structural Sealant': [],
        'Date': [],
        'Time': []
    }).to_excel(writer, sheet_name='Str Seal', index=False)
    # Query the database to get structural sealant data
    query = text("""
        SELECT DISTINCT 
            structural_sealant_records,
            panels_glazed,
            date_glazed,
            time_glazed
        FROM qc_reports
        WHERE structural_sealant_records IS NOT NULL
        ORDER BY date_glazed DESC, time_glazed DESC
    """)
    
    # Execute the query
    result = db_session.execute(query)
    records = result.fetchall()
    
    # Convert the results to a list of dictionaries
    data = []
    for record in records:
        data.append(dict(record))
    
    # Create a DataFrame from the data
    df = pd.DataFrame(data) if data else pd.DataFrame(columns=[
        'structural_sealant_records', 'panels_glazed', 'date_glazed', 'time_glazed'
    ])
    
    # Rename the columns to match the reference file
    if not df.empty:
        df.rename(columns={
            'structural_sealant_records': 'StrS Batch #',
            'panels_glazed': 'Panels Glazed',
            'date_glazed': 'Date Glazed',
            'time_glazed': 'Time Glazed'
        }, inplace=True)
        
        # Add empty columns for Catalyst Batch #, Primer C, and Photo
        df['Catalyst Batch #'] = ''
        df['Primer C'] = ''
        df['Photo of the paper record as a reference'] = ''
        
        # Reorder columns to match reference file
        df = df[[
            'StrS Batch #', 'Catalyst Batch #', 'Primer C', 
            'Panels Glazed', 'Date Glazed', 'Time Glazed',
            'Photo of the paper record as a reference'
        ]]
    else:
        # Create an empty DataFrame with the headers
        df = pd.DataFrame(columns=[
            'StrS Batch #', 'Catalyst Batch #', 'Primer C', 
            'Panels Glazed', 'Date Glazed', 'Time Glazed',
            'Photo of the paper record as a reference'
        ])
    
    # Write the DataFrame to the Excel file
    sheet_name = 'Str Seal'
    df.to_excel(writer, sheet_name=sheet_name, index=False)
    
    # Get the worksheet
    worksheet = writer.sheets[sheet_name]
    
    # Add title and description rows
    worksheet.insert_rows(0, 7)
    worksheet.cell(row=1, column=1, value='Structural Sealant Records')
    worksheet.cell(row=3, column=1, value='Structural Sealant Batch Numbers (both large drum and smaller activator) as well as the barrel and small barrel number from that batch')
    worksheet.cell(row=4, column=1, value='Which panels were glazed with that Batch-Barrel')
    worksheet.cell(row=6, column=1, value='Add in the sheets from the factory. ')
    worksheet.cell(row=7, column=1, value='The factory produces a daily report, AM, PM, Night and lists the CW panels glazed')
    
    # Add second header row
    worksheet.insert_rows(9, 1)
    worksheet.cell(row=9, column=1, value='Batch #')
    worksheet.cell(row=9, column=2, value='# of 30')
    worksheet.cell(row=9, column=3, value='Batch #')
    worksheet.cell(row=9, column=4, value='# of 30')
    worksheet.cell(row=9, column=5, value='Lot #')
    
    # Adjust column widths
    for col_num in range(1, 8):
        worksheet.column_dimensions[get_column_letter(col_num)].width = 20

def export_inventory_sheet(db_session: Session, writer):
    """
    Export inventory data to Adm-Extrus,Infills sheet.
    
    Args:
        db_session: SQLAlchemy database session
        writer: Excel writer
    """
    # Create a simple sheet with headers if we don't have real data yet
    pd.DataFrame({
        'Die # (PF)': [],
        'Die Name': [],
        'Description': [],
        'Type (e.g. Mullion)': [],
        'Coating Color': []
    }).to_excel(writer, sheet_name='Adm-Extrus,Infills', index=False)
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
    result = db_session.execute(query)
    records = result.fetchall()
    
    # Convert the results to a list of dictionaries
    data = []
    for record in records:
        data.append(dict(record))
    
    # Create a DataFrame from the data
    df = pd.DataFrame(data) if data else pd.DataFrame(columns=[
        'product_part_id', 'product_part_name', 'description', 'part_type', 'coating_color'
    ])
    
    # Rename the columns to match the reference file
    if not df.empty:
        df.rename(columns={
            'product_part_id': 'Die # (PF)',
            'product_part_name': 'Die Name',
            'description': 'Description',
            'part_type': 'Type (e.g. Mullion)',
            'coating_color': 'Coating Color'
        }, inplace=True)
    else:
        # Create an empty DataFrame with the headers
        df = pd.DataFrame(columns=[
            'Die # (PF)', 'Die Name', 'Description', 'Type (e.g. Mullion)', 'Coating Color'
        ])
    
    # Write the DataFrame to the Excel file
    sheet_name = 'Adm-Extrus,Infills'
    df.to_excel(writer, sheet_name=sheet_name, index=False)
    
    # Get the worksheet
    worksheet = writer.sheets[sheet_name]
    
    # Add title and description rows
    worksheet.insert_rows(0, 8)
    worksheet.cell(row=1, column=1, value='Extrusions & Infills Inventory')
    worksheet.cell(row=3, column=1, value='Process:')
    worksheet.cell(row=4, column=1, value='For each CW Panel on each floor give the following items')
    worksheet.cell(row=5, column=1, value='Panel #, Mullion left & right, Color/coating each mullion')
    worksheet.cell(row=6, column=1, value='Dimension opening width and each opening height')
    
    # Add the Glass header
    worksheet.insert_rows(9, 1)
    worksheet.cell(row=9, column=1, value='Glass: ')
    worksheet.cell(row=9, column=2, value='Spandral, Vision')
    
    # Adjust column widths
    for col_num in range(1, 15):
        worksheet.column_dimensions[get_column_letter(col_num)].width = 18

def get_column_letter(col_num):
    """
    Convert a column number to an Excel column letter.
    
    Args:
        col_num: Column number (1-based)
        
    Returns:
        str: Excel column letter (A, B, C, etc.)
    """
    col_letter = ''
    while col_num > 0:
        col_num, remainder = divmod(col_num - 1, 26)
        col_letter = chr(65 + remainder) + col_letter
    return col_letter