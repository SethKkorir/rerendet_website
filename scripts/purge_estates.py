import os
import re

def replace_estates(directory):
    # Prepare regex patterns
    # Higher priority first to avoid "Coffee Coffee" issues
    replacements = [
        (re.compile(r'Rerendet Coffee Estate', re.IGNORECASE), 'Rerendet Coffee'),
        (re.compile(r'Rerendet Estate', re.IGNORECASE), 'Rerendet Coffee'),
        (re.compile(r'Coffee Estate', re.IGNORECASE), 'Coffee'),
        (re.compile(r'highland estates', re.IGNORECASE), 'highland farms'),
        (re.compile(r'highland estate', re.IGNORECASE), 'highland farm'),
        (re.compile(r'Digital Estate Refresh', re.IGNORECASE), 'Premium Coffee Refresh'),
        (re.compile(r'Deep Estate Blue', re.IGNORECASE), 'Deep Coffee Blue'),
        (re.compile(r'estate taxes', re.IGNORECASE), 'local taxes'),
        (re.compile(r'Estate Associate', re.IGNORECASE), 'Associate'),
        (re.compile(r' estates', re.IGNORECASE), ' farms'),
        (re.compile(r' estate', re.IGNORECASE), ' farm'),
        (re.compile(r'Estates', re.IGNORECASE), 'Farms'),
        (re.compile(r'Estate', re.IGNORECASE), 'Coffee')
    ]

    exclude_dirs = {'.git', 'node_modules', 'dist', 'build', '.next'}
    exclude_files = {'.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', '.zip'}

    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if any(file.lower().endswith(ext) for ext in exclude_files):
                continue
            
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                for pattern, replacement in replacements:
                    content = pattern.sub(replacement, content)
                
                if content != original_content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"Updated: {file_path}")
            except Exception as e:
                # print(f"Could not process {file_path}: {e}")
                pass

if __name__ == "__main__":
    base_dir = r'c:\Users\Kipchumba\Documents\rerendet_website-1'
    # Target only source files and server files
    replace_estates(os.path.join(base_dir, 'client', 'src'))
    replace_estates(os.path.join(base_dir, 'controllers'))
    replace_estates(os.path.join(base_dir, 'models'))
    replace_estates(os.path.join(base_dir, 'routes'))
    replace_estates(os.path.join(base_dir, 'utils'))
    replace_estates(os.path.join(base_dir, 'middleware'))
    # Also root server.js if it exists
    replace_estates(os.path.join(base_dir, 'server.js')) if os.path.exists(os.path.join(base_dir, 'server.js')) else None
