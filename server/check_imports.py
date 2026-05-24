import os
import glob

bad_files = []
for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                
            in_code = False
            for i, line in enumerate(lines):
                stripped = line.strip()
                if not stripped or stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*'):
                    continue
                
                if stripped.startswith('import '):
                    if in_code:
                        bad_files.append((path, i + 1, stripped))
                else:
                    in_code = True

for b in bad_files:
    print(f"{b[0]}:{b[1]} -> {b[2]}")
