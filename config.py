import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
ATTAINMENT_LEVELS = {
    "FY": {1: 50, 2: 55, 3: 60},
    "SY": {1: 60, 2: 65, 3: 70},
    "TY": {1: 65, 2: 75, 3: 80},
}

CURRICULUM = {
    "CSE (Data Science)": {
        "FY": {
            "Semester 1": [
                "Calculus & Differential Equation Theory",
                "Foundations of Computing Theory",
                "Science of Nature Theory",
                "Applied Mechanics Theory",
                "Design Thinking Theory",
                "Data Driven Modelling Theory",
                "Foundations of Computing Lab",
                "Science of Nature Lab",
                "Applied Mechanics Lab",
                "Design Thinking Lab",
                "Data Driven Modelling Lab"
            ],
            "Semester 2": [
                "Statistics and Integral Calculus Theory",
                "Engineering Physics Theory",
                "Electrical & Electronics Engineering Theory",
                "Essentials of Data Science Theory",
                "Engineering Physics Lab",
                "Electrical & Electronics Engineering Lab",
                "Essentials of Data Science Lab"
            ]
        },
        "SY": {
            "Semester 3": [
                "Data Structures & Algorithm Theory",
                "Data Warehousing Theory",
                "Operating System Theory",
                "Entrepreneurship Skills Theory",
                "Environmental Science Theory",
                "Data Structures & Algorithm Lab",
                "OOPS Lab",
                "Entrepreneurship Skills Lab"
            ],
            "Semester 4": [
                "Database Management System Theory",
                "Predictive Analysis Theory",
                "Computer Networks Theory",
                "Engineering Informatics Theory",
                "Applied Mathematics Theory",
                "Database Management System Lab",
                "Predictive Analysis Lab",
                "Engineering Informatics Lab",
                "Applied Mathematics Lab"
            ]
        }
    }
}