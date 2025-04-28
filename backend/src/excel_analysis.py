import pandas as pd
import json
import os

def analyze_excel_file(excel_path):
    """
    Analyze an Excel file and return information about its sheets and content.
    """
    try:
        # Load the Excel file
        xls = pd.ExcelFile(excel_path)
        
        # Get sheet names
        sheet_names = xls.sheet_names
        
        # Read each sheet
        sheets_data = {}
        for sheet_name in sheet_names:
            # Read sheet
            df = pd.read_excel(excel_path, sheet_name=sheet_name)
            
            # Get columns
            columns = df.columns.tolist()
            
            # Sample data (first 5 rows)
            sample_data = df.head(5).to_dict(orient='records')
            
            # Add sheet info to result
            sheets_data[sheet_name] = {
                'columns': columns,
                'row_count': len(df),
                'sample_data': sample_data
            }
        
        # Return the analysis result
        result = {
            'file_name': os.path.basename(excel_path),
            'sheet_count': len(sheet_names),
            'sheet_names': sheet_names,
            'sheets_data': sheets_data
        }
        
        return json.dumps(result, indent=2)
    
    except Exception as e:
        return f"Error analyzing Excel file: {str(e)}"

if __name__ == "__main__":
    # Path to the Excel file
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
    excel_file = os.path.join(project_root, "attached_assets/QC Panel Report Sys-IT Fl 17 2025-03-29 v01.xlsx")
    
    # Analyze the file
    result = analyze_excel_file(excel_file)
    print(result)