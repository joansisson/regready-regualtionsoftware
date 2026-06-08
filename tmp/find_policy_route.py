with open('server/routes.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'POST /api/policies' in line and 'generate' not in line and '/api/policies/' in line:
        print(f"Line {i+1}: {line.rstrip()}")
