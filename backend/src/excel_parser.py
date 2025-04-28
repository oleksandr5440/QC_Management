import pandas as pd
import json
import os

def parse_excel_file(excel_path):
    """
    More detailed parsing of the Excel file to understand its structure better.
    """
    try:
        # Load the Excel file
        print(f"Reading Excel file: {excel_path}")
        
        # Parse each sheet with different strategies
        result = {}
        
        # 1. Adm-Extrus,Infills - Inventory data
        print("\nParsing Adm-Extrus,Infills sheet...")
        try:
            # Skip the first few rows which seem to be headers/descriptions
            inventory_df = pd.read_excel(excel_path, sheet_name="Adm-Extrus,Infills", skiprows=5)
            # Remove unnamed columns
            inventory_df = inventory_df.loc[:, ~inventory_df.columns.str.contains('^Unnamed')]
            # Drop rows with all NaNs
            inventory_df = inventory_df.dropna(how='all')
            
            # Get actual column names from the first row if needed
            if inventory_df.shape[0] > 0:
                # Get the first few rows
                print("First few rows of Adm-Extrus,Infills:")
                print(inventory_df.head(10))
                
                # Get column names 
                print("\nColumn names:")
                print(inventory_df.columns.tolist())
                
                result["inventory"] = {
                    "row_count": len(inventory_df),
                    "columns": inventory_df.columns.tolist(),
                    "sample": inventory_df.head(5).to_dict(orient='records')
                }
        except Exception as e:
            print(f"Error parsing Adm-Extrus,Infills: {str(e)}")
            result["inventory"] = {"error": str(e)}
        
        # 2. Str Seal - Structural Sealant data
        print("\nParsing Str Seal sheet...")
        try:
            # Skip the first few rows which seem to be headers/descriptions
            seal_df = pd.read_excel(excel_path, sheet_name="Str Seal", skiprows=5)
            # Remove unnamed columns
            seal_df = seal_df.loc[:, ~seal_df.columns.str.contains('^Unnamed')]
            # Drop rows with all NaNs
            seal_df = seal_df.dropna(how='all')
            
            if seal_df.shape[0] > 0:
                # Get the first few rows
                print("First few rows of Str Seal:")
                print(seal_df.head(10))
                
                # Get column names 
                print("\nColumn names:")
                print(seal_df.columns.tolist())
                
                result["seal"] = {
                    "row_count": len(seal_df),
                    "columns": seal_df.columns.tolist(),
                    "sample": seal_df.head(5).to_dict(orient='records')
                }
        except Exception as e:
            print(f"Error parsing Str Seal: {str(e)}")
            result["seal"] = {"error": str(e)}
        
        # 3. Fl-17 - Main QC data
        print("\nParsing Fl-17 sheet...")
        try:
            # Initialize qc_df to handle possible unbound reference
            qc_df = None
            
            # Try different skiprows to find the actual data table
            for skip_rows in range(5, 10):
                temp_df = pd.read_excel(excel_path, sheet_name="Fl-17", skiprows=skip_rows)
                # Remove unnamed columns
                temp_df = temp_df.loc[:, ~temp_df.columns.str.contains('^Unnamed')]
                # Drop rows with all NaNs
                temp_df = temp_df.dropna(how='all')
                
                if temp_df.shape[0] > 0 and temp_df.shape[1] > 0:
                    # Found data, assign to qc_df and break the loop
                    qc_df = temp_df
                    break
            
            if qc_df is not None and qc_df.shape[0] > 0:
                # Get the first few rows
                print("First few rows of Fl-17:")
                print(qc_df.head(10))
                
                # Get column names 
                print("\nColumn names:")
                print(qc_df.columns.tolist())
                
                result["qc"] = {
                    "row_count": len(qc_df),
                    "columns": qc_df.columns.tolist(),
                    "sample": qc_df.head(5).to_dict(orient='records')
                }
        except Exception as e:
            print(f"Error parsing Fl-17: {str(e)}")
            result["qc"] = {"error": str(e)}
        
        return result
    
    except Exception as e:
        print(f"Error analyzing Excel file: {str(e)}")
        return {"error": str(e)}

if __name__ == "__main__":
    # Path to the Excel file
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
    excel_file = os.path.join(project_root, "attached_assets/QC Panel Report Sys-IT Fl 17 2025-03-29 v01.xlsx")
    
    # Parse the file
    result = parse_excel_file(excel_file)
    
    # Save the result to a JSON file for reference
    output_file = os.path.join(project_root, 'excel_analysis_result.json')
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2, default=str)
    
    print(f"\nAnalysis complete. Results saved to {output_file}")