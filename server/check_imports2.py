import os

bad_files = []
for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            in_code = False
            in_multiline_import = False
            in_multiline_comment = False
            
            for i, line in enumerate(lines):
                stripped = line.strip()
                
                if not stripped:
                    continue
                    
                if in_multiline_comment:
                    if '*/' in stripped:
                        in_multiline_comment = False
                    continue
                    
                if stripped.startswith('/*'):
                    if '*/' not in stripped:
                        in_multiline_comment = True
                    continue
                    
                if stripped.startswith('//'):
                    continue
                    
                if in_multiline_import:
                    if 'from ' in stripped or '}' in stripped and stripped.endswith(';'):
                        in_multiline_import = False
                    continue
                    
                if stripped.startswith('import '):
                    if '{' in stripped and '}' not in stripped:
                        in_multiline_import = True
                    if in_code:
                        bad_files.append((path, i + 1, stripped))
                else:
                    if stripped != '}' and not stripped.startswith('export '):
                        # Simple heuristic: if it's not an import or a comment, we are in code.
                        # Wait, exports can be multi-line.
                        # dotenv.config() is code.
                        if stripped != "dotenv.config();":
                            in_code = True

for b in bad_files:
    print(f"{b[0]}:{b[1]} -> {b[2]}")
