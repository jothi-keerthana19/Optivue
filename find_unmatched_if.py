with open('templates/reports.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

if_stack = []
for i, line in enumerate(lines):
    if '{% if' in line:
        # Check if this is not inside a {% if ... %}...{% endif %} on the same line
        if '{% endif' not in line:
            if_stack.append((i+1, line.strip()))
    elif '{% endif' in line:
        if if_stack:
            if_stack.pop()

print("Unmatched IF statements:")
for line_num, line_content in if_stack:
    print(f"Line {line_num}: {line_content}")