import os
import json
import re
from html.parser import HTMLParser

class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_table = False
        self.in_tr = False
        self.in_td = False
        self.rows = []
        self.current_row = []
        self.current_cell = ''
        
    def handle_starttag(self, tag, attrs):
        if tag == 'table': self.in_table = True
        elif tag == 'tr' and self.in_table: 
            self.in_tr = True
            self.current_row = []
        elif tag == 'td' and self.in_tr:
            self.in_td = True
            self.current_cell = ''
            
    def handle_endtag(self, tag):
        if tag == 'td' and self.in_td:
            self.in_td = False
            self.current_row.append(self.current_cell.strip())
        elif tag == 'tr' and self.in_tr:
            self.in_tr = False
            if self.current_row:
                self.rows.append(self.current_row)
        elif tag == 'table':
            self.in_table = False
            
    def handle_data(self, data):
        if self.in_td:
            self.current_cell += data

def parse_schedule(time_str):
    if not time_str or time_str == '無':
        return None
    
    # Expected format: Day / periods / room
    # e.g., "三 / 1,2 / E 310"
    parts = [p.strip() for p in time_str.split('/')]
    if len(parts) >= 2:
        day_str = parts[0]
        # Map Chinese day to integer (1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun)
        day_map = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7}
        day = day_map.get(day_str)
        
        if day is not None:
            # Parse periods: "1,2,3" -> [1, 2, 3]
            try:
                periods = [int(p) for p in parts[1].split(',') if p.isdigit()]
            except ValueError:
                periods = []
                
            room = parts[2] if len(parts) > 2 else ""
            
            return {
                "day": day,
                "periods": periods,
                "room": room
            }
    return None

def main():
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    courses = []
    skipped = 0
    
    # Map index files to their names for better category names
    category_map = {}
    
    for filename in os.listdir(data_dir):
        if not filename.endswith('.htm') or filename == 'INDEX.htm':
            continue
            
        filepath = os.path.join(data_dir, filename)
        try:
            with open(filepath, 'rb') as f:
                raw = f.read()
            # Try utf-8 first, fallback to cp950 (Big5)
            try:
                text = raw.decode('utf-8')
            except UnicodeDecodeError:
                text = raw.decode('cp950', errors='replace')
                
            parser = TableParser()
            parser.feed(text)
            
            # Row 1 is usually Department name
            department_name = filename.replace('.htm', '')
            if len(parser.rows) > 1 and len(parser.rows[1]) > 0:
                dept_str = parser.rows[1][0]
                # Format is usually "系別(Department)：TEIXB.資工系（日）　DEPARTMENT OF..."
                if '：' in dept_str:
                    dept_parts = dept_str.split('：')[1].split('.')
                    if len(dept_parts) > 1:
                        # e.g. "資工系（日）　DEPARTMENT OF..." -> "資工系（日）"
                        department_name = dept_parts[1].split('\u3000')[0].split(' ')[0]

            # Manual override for duplicate physical education department names
            if filename == 'B05.htm':
                department_name = '體育興趣二年級－日'
            elif filename == 'B09.htm':
                department_name = '體育興趣一年級－日'
            
            # Process data rows
            # Row 2 is headers, Row 3 is sub-headers
            for row in parser.rows[4:]:
                if len(row) < 14:
                    continue  # Invalid row
                if row[0] == '年級' or '科\u3000目\u3000名\u3000稱' in row[10]:
                    continue  # Skip inner header rows
                    
                course = {
                    "departmentId": filename.replace('.htm', ''),
                    "departmentName": department_name,
                    "grade": row[0],
                    "seqNumber": row[1],
                    "courseCode": row[2],
                    "reqElective": row[7],  # 必 or 選
                    "category": row[9],
                    "name": row[10],
                    "instructor": row[12].split('(')[0].strip() if '(' in row[12] else row[12],
                    "schedules": [],
                    "id": f"{row[1]}-{filename.replace('.htm', '')}"  # unique ID
                }
                
                # Parse credits
                try:
                    course["credits"] = float(row[8]) if row[8] else 0
                except ValueError:
                    course["credits"] = 0
                    
                # Parse capacity
                try:
                    course["enrollLimit"] = int(row[11]) if row[11] else 0
                except (ValueError, IndexError):
                    course["enrollLimit"] = 0
                    
                # Parse schedules
                s1 = parse_schedule(row[13])
                if s1: course["schedules"].append(s1)
                
                if len(row) > 14:
                    s2 = parse_schedule(row[14])
                    if s2: course["schedules"].append(s2)
                    
                courses.append(course)
                
        except Exception as e:
            print(f"Error processing {filename}: {e}")
            skipped += 1
            
    # Output to JSON
    output_path = os.path.join(os.path.dirname(__file__), 'courses.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(courses, f, ensure_ascii=False, indent=2)
        
    print(f"Processed {len(courses)} courses from {len(os.listdir(data_dir))} files.")
    if skipped > 0:
        print(f"Skipped {skipped} files with errors.")

if __name__ == "__main__":
    main()
