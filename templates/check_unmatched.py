with open('reports.html', 'r', encoding='utf-8') as f:
    content = f.read()
    
if_count = content.count("{% if user_data.status == 'authentic_data_available' %}")
endif_count = content.count("{% endif %}")

print(f"IF statements: {if_count}")
print(f"ENDIF statements: {endif_count}")

if if_count > endif_count:
    print("There are unmatched IF statements!")
elif if_count < endif_count:
    print("There are extra ENDIF statements!")
else:
    print("IF/ENDIF statements are balanced!")