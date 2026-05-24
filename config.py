import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
ATTAINMENT_LEVELS = {
    "FY": {1: 50, 2: 55, 3: 60},
    "SY": {1: 60, 2: 65, 3: 70},
    "TY": {1: 65, 2: 75, 3: 80},
}