with open('templates/reports.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    
count = 0
for i, line in enumerate(lines):
    if "{% if user_data.status == 'authentic_data_available' %}" in line:
        print(f'Line {i+1}: {line.strip()}')
        count += 1
        
print(f'Total occurrences: {count}')