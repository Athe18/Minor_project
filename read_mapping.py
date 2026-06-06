import os
import sys

path = "frontend/src/pages/Mapping.jsx"
if os.path.exists(path):
    print("File exists, size:", os.path.getsize(path))
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
    print("Total lines:", len(lines))
    # If a line range is specified, print it
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    end = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    for i in range(start-1, min(end, len(lines))):
        print(f"{i+1}: {lines[i]}", end="")
else:
    print("File does not exist")
