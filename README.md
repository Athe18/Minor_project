# 🤖 Multi-Agent CO-PO Agentic Platform

**NBA/NAAC Accreditation Intelligence System**

An AI-powered platform that automates the entire **Course Outcome (CO) → Program Outcome (PO)** mapping pipeline for engineering colleges. From syllabus upload to Excel report generation, every step is handled by specialized AI agents.

---

## 📑 Table of Contents

1. [What is CO-PO Mapping?](#what-is-co-po-mapping)
2. [Complete Pipeline Overview](#complete-pipeline-overview)
3. [How CO-PO Mapping Works — Step by Step](#how-co-po-mapping-works--step-by-step)
4. [CO-PO Mapping Example (with Numbers)](#co-po-mapping-example-with-numbers)
5. [About data/sample_pos.json](#about-datasample_posjson)
6. [Project Structure](#project-structure)
7. [Installation & Setup](#installation--setup)
8. [Running the Platform](#running-the-platform)
9. [API Reference](#api-reference)
10. [Data Formats](#data-formats)

---

## What is CO-PO Mapping?

| Term | Full Form | Meaning |
|------|-----------|---------|
| **CO** | Course Outcome | What a student should be able to do after completing a specific course (e.g., "Apply normalization to design a relational schema") |
| **PO** | Program Outcome | Broad graduate attributes for the entire degree program (e.g., "Apply engineering knowledge", "Analyze complex problems") |
| **CO-PO Mapping** | — | A matrix that shows how strongly each CO contributes to each PO, scored 0–3 |
| **NBA** | National Board of Accreditation | Indian accreditation body that requires CO-PO mapping for engineering programs |

### Mapping Strength Scale

| Value | Meaning | When to use |
|-------|---------|-------------|
| **3** | Strong | CO directly and fully addresses the PO |
| **2** | Moderate | CO partially addresses the PO |
| **1** | Weak / Low | CO has minimal connection to the PO |
| **0** | No mapping | CO has no meaningful relationship with the PO |

---

## Complete Pipeline Overview

```
Syllabus (PDF/TXT)
        │
        ▼
┌─────────────────────┐
│  Phase 1: Setup     │  Subject name, year, attainment thresholds
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Phase 2: CO Gen    │  AI generates 6 Course Outcomes (Bloom's L3–L6)
│  + CO Validation    │  Validator checks quality, retries up to 3 times
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Phase 3: PO Input  │  Load from data/sample_pos.json OR enter manually
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Phase 4: CO-PO     │  AI maps each CO to each PO with strength 0–3
│  Mapping + Validate │  Mapping Validator checks NBA compliance
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Phase 5: Teaching  │  Generates Teaching Philosophy document
│  Philosophy         │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Phase 6: CO        │  Reads student marks CSV → calculates CO attainment %
│  Attainment         │  Assigns Level 1 / 2 / 3 per CO
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Phase 7: PO        │  Uses CO attainment + mapping strengths to compute
│  Attainment         │  weighted PO attainment scores
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Phase 8: Recs      │  AI identifies weak POs and generates recommendations
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Phase 9: Report    │  Exports Excel / PDF report for NBA submission
└─────────────────────┘
```

---

## How CO-PO Mapping Works — Step by Step

### Step 1 — CO Generator Agent reads the syllabus

The [`co_generator.py`](agents/co_generator.py) agent receives:
- Subject name (e.g., "Database Management Systems")
- Syllabus text (first 4000 characters)

It sends this to the LLM with strict rules:
- Minimum **Bloom's Level 3** (Apply, Analyze, Evaluate, Create)
- COs must start with a Bloom's action verb
- No vague or overlapping outcomes

**Output Example:**
```json
[
  {
    "co_id": "CO1",
    "statement": "Apply normalization techniques to design an efficient relational schema",
    "blooms_level": 3,
    "blooms_keyword": "Apply",
    "confidence_score": 0.92
  },
  {
    "co_id": "CO2",
    "statement": "Analyze query execution plans to optimize database performance",
    "blooms_level": 4,
    "blooms_keyword": "Analyze",
    "confidence_score": 0.88
  },
  {
    "co_id": "CO3",
    "statement": "Design a normalized relational database schema for real-world applications",
    "blooms_level": 6,
    "blooms_keyword": "Design",
    "confidence_score": 0.91
  }
]
```

---

### Step 2 — CO Validator checks quality

The [`co_validator.py`](agents/co_validator.py) agent reviews the generated COs and returns a `ValidationReport`:
- ✅ `passed: true` → move to next phase
- ❌ `passed: false` → retry CO generation (up to 3 times)

---

### Step 3 — POs are loaded from `data/sample_pos.json`

The Platform Outcomes (POs) are the **12 standard NBA Program Outcomes** (PO1–PO12). These come from [`data/sample_pos.json`](data/sample_pos.json):

```json
[
  {"po_id": "PO1", "statement": "Engineering knowledge: Apply mathematics, science, and fundamentals"},
  {"po_id": "PO2", "statement": "Problem analysis: Identify, formulate, and analyze complex problems"},
  {"po_id": "PO3", "statement": "Design solutions for complex engineering problems"},
  ...
  {"po_id": "PO12", "statement": "Life-long learning: Engage in continuous learning"}
]
```

> **These POs are fixed for NBA accreditation** — all 12 are standard for all engineering programs in India.

---

### Step 4 — PO Mapper Agent generates the mapping matrix

The [`po_mapper.py`](agents/po_mapper.py) agent receives all COs and all POs as text, and asks the LLM to output a mapping array:

```json
[
  {
    "co_id": "CO1",
    "po_id": "PO1",
    "strength": 3,
    "reasoning": "CO1 requires applying mathematical normalization theory — directly maps to engineering knowledge",
    "confidence": 0.91
  },
  {
    "co_id": "CO1",
    "po_id": "PO2",
    "strength": 2,
    "reasoning": "Normalization involves identifying redundancy problems — moderate alignment with problem analysis",
    "confidence": 0.78
  },
  {
    "co_id": "CO1",
    "po_id": "PO3",
    "strength": 1,
    "reasoning": "Schema design is part of CO3, not CO1 — weak connection here",
    "confidence": 0.65
  },
  {
    "co_id": "CO1",
    "po_id": "PO4",
    "strength": 0,
    "reasoning": "No research-based investigation involved in normalization",
    "confidence": 0.95
  }
  // ... (CO1 vs PO5 to PO12, CO2 vs all POs, CO3 vs all POs, etc.)
]
```

The result is stored as a flat list of `MappingEntry` objects in `state.co_po_mapping`.

**The CO-PO Matrix it produces looks like this:**

| CO \ PO | PO1 | PO2 | PO3 | PO4 | PO5 | PO6 | PO7 | PO8 | PO9 | PO10 | PO11 | PO12 |
|---------|-----|-----|-----|-----|-----|-----|-----|-----|-----|------|------|------|
| CO1     |  3  |  2  |  1  |  0  |  2  |  0  |  0  |  0  |  0  |   0  |   0  |   1  |
| CO2     |  3  |  3  |  2  |  2  |  3  |  0  |  0  |  0  |  0  |   0  |   0  |   1  |
| CO3     |  2  |  2  |  3  |  1  |  2  |  0  |  0  |  1  |  1  |   0  |   0  |   1  |

---

### Step 5 — CO Attainment is calculated from student marks

**Input CSV format:**

```csv
roll_no,CO1,CO2,CO3
MAX,30,30,30
101,25,22,18
102,18,27,24
103,12,15,10
104,28,25,26
```

> The `MAX` row defines the maximum marks for each CO.

**Calculation formula:**
```
Student's CO% = (marks obtained / max marks) × 100

Level 1 students% = % of students scoring ≥ Level1_threshold (default 55%)
Level 2 students% = % of students scoring ≥ Level2_threshold (default 65%)
Level 3 students% = % of students scoring ≥ Level3_threshold (default 75%)

Achieved Level = 3  if Level3_students% ≥ 50%
               = 2  if Level2_students% ≥ 50%
               = 1  if Level1_students% ≥ 50%
               = 0  otherwise
```

**Example output:**
```
CO1 → Average: 68.3%  |  L1: 75%  |  L2: 50%  |  L3: 25%  →  Achieved Level 2
CO2 → Average: 73.5%  |  L1: 100% |  L2: 75%  |  L3: 50%  →  Achieved Level 3
CO3 → Average: 58.9%  |  L1: 75%  |  L2: 25%  |  L3: 0%   →  Achieved Level 1
```

---

### Step 6 — PO Attainment is computed using weighted formula

**Formula (from [`po_attainment.py`](agents/po_attainment.py)):**

```
PO_j = Σ (CO_i_achieved_level × strength_ij)  /  Σ (strength_ij)
```

Where:
- `CO_i_achieved_level` = attainment level of CO_i (0, 1, 2, or 3)
- `strength_ij` = mapping strength of CO_i → PO_j (0, 1, 2, or 3)
- Sum is only over COs where `strength > 0`

**Example calculation for PO1:**

Using CO1 (Level 2, strength 3), CO2 (Level 3, strength 3), CO3 (Level 1, strength 2):

```
PO1 = (2×3 + 3×3 + 1×2) / (3 + 3 + 2)
    = (6 + 9 + 2) / 8
    = 17 / 8
    = 2.125
```

A PO is marked **weak** if `weighted_attainment < 1.5`.

---

## CO-PO Mapping Example (with Numbers)

**Subject:** Database Management Systems (DBMS)

**Generated COs:**

| CO ID | Statement | Bloom's Level |
|-------|-----------|---------------|
| CO1 | Apply normalization techniques to design an efficient relational schema | L3 – Apply |
| CO2 | Analyze query execution plans to optimize database performance | L4 – Analyze |
| CO3 | Design a normalized relational database schema for a real-world application | L6 – Create |
| CO4 | Evaluate transaction management strategies to ensure ACID properties | L5 – Evaluate |
| CO5 | Implement indexing and hashing techniques for efficient data retrieval | L3 – Apply |
| CO6 | Compare NoSQL and SQL database models for scalable application design | L4 – Analyze |

**CO-PO Mapping Matrix:**

| CO \ PO | PO1 | PO2 | PO3 | PO4 | PO5 | PO6 | PO7 | PO8 | PO9 | PO10 | PO11 | PO12 |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:----:|:----:|:----:|
| CO1     |  3  |  2  |  2  |  0  |  2  |  0  |  0  |  0  |  0  |   0  |   0  |   1  |
| CO2     |  3  |  3  |  1  |  3  |  3  |  0  |  0  |  0  |  0  |   0  |   0  |   2  |
| CO3     |  2  |  2  |  3  |  1  |  2  |  1  |  0  |  0  |  1  |   1  |   1  |   1  |
| CO4     |  2  |  3  |  2  |  2  |  1  |  0  |  0  |  2  |  0  |   0  |   0  |   1  |
| CO5     |  3  |  2  |  1  |  0  |  3  |  0  |  0  |  0  |  0  |   0  |   0  |   1  |
| CO6     |  2  |  3  |  2  |  2  |  2  |  1  |  0  |  0  |  1  |   1  |   0  |   2  |

**Student Marks CSV:**
```csv
roll_no,CO1,CO2,CO3,CO4,CO5,CO6
MAX,20,20,20,20,20,20
101,17,18,15,16,19,14
102,12,14,18,10,15,17
103,19,17,12,18,16,13
104,8,11,16,9,12,18
105,15,16,19,14,17,15
```

**CO Attainment (thresholds: L1=55%, L2=65%, L3=75%):**

| CO | Avg % | L1 Students | L2 Students | L3 Students | Achieved Level |
|----|-------|-------------|-------------|-------------|----------------|
| CO1 | 71.0% | 80% | 60% | 40% | **Level 2** |
| CO2 | 76.0% | 100% | 80% | 60% | **Level 3** |
| CO3 | 80.0% | 100% | 80% | 80% | **Level 3** |
| CO4 | 67.0% | 60% | 60% | 20% | **Level 2** |
| CO5 | 79.0% | 100% | 80% | 60% | **Level 3** |
| CO6 | 77.0% | 100% | 80% | 60% | **Level 3** |

**PO Attainment calculation for PO1:**
```
Mappings to PO1: CO1(str=3, level=2), CO2(str=3, level=3), CO3(str=2, level=3),
                 CO4(str=2, level=2), CO5(str=3, level=3), CO6(str=2, level=3)

PO1 = (2×3 + 3×3 + 3×2 + 2×2 + 3×3 + 3×2) / (3+3+2+2+3+2)
    = (6 + 9 + 6 + 4 + 9 + 6) / 15
    = 40 / 15
    = 2.67  ✅ Strong attainment
```

---

## About `data/sample_pos.json`

### ✅ Yes — the model uses `data/sample_pos.json` for POs by default!

Here is exactly how it's used in the system:

**1. When a new subject state has no POs** (`server.py` → `ensure_pos_and_mappings()`):
```python
# server.py line ~140
sample_path = "data/sample_pos.json"
if os.path.exists(sample_path):
    with open(sample_path) as f:
        data = json.load(f)
    state.pos = [ProgramOutcome(**p) for p in data]
```

**2. When you click "Load Default POs"** in the frontend (`/api/pos/default`):
```python
# server.py → /api/pos/default endpoint
with open("data/sample_pos.json") as f:
    data = json.load(f)
state.pos = [ProgramOutcome(**p) for p in data]
```

**3. In CLI mode** (Phase 3), the user can also load it manually by entering its path.

### The file contains the 12 standard NBA POs:

```json
[
  {"po_id": "PO1",  "statement": "Engineering knowledge: Apply mathematics, science, and fundamentals"},
  {"po_id": "PO2",  "statement": "Problem analysis: Identify, formulate, and analyze complex problems"},
  {"po_id": "PO3",  "statement": "Design solutions for complex engineering problems"},
  {"po_id": "PO4",  "statement": "Conduct investigations using research-based knowledge"},
  {"po_id": "PO5",  "statement": "Modern tool usage: Create and apply appropriate techniques"},
  {"po_id": "PO6",  "statement": "Engineer and society: Apply contextual reasoning"},
  {"po_id": "PO7",  "statement": "Environment and sustainability: Understand impact of solutions"},
  {"po_id": "PO8",  "statement": "Ethics: Apply ethical principles and professional responsibility"},
  {"po_id": "PO9",  "statement": "Individual and team work: Function effectively in teams"},
  {"po_id": "PO10", "statement": "Communication: Communicate effectively on complex activities"},
  {"po_id": "PO11", "statement": "Project management: Demonstrate management principles"},
  {"po_id": "PO12", "statement": "Life-long learning: Engage in continuous learning"}
]
```

> **You can customize this file** to add PSOs (Program Specific Outcomes) or replace with your institution's custom POs. The system will automatically use your updated file.

---

## Project Structure

```
CO_PO/
├── server.py               # FastAPI backend — all REST endpoints
├── main.py                 # CLI entry point (terminal mode)
├── config.py               # LLM configuration (API keys, model)
├── requirement.txt         # Python dependencies
├── .env                    # Environment variables (LLM API key)
│
├── agents/                 # AI agents — each handles one pipeline phase
│   ├── co_generator.py     # Phase 2: Generates COs from syllabus
│   ├── co_validator.py     # Phase 2: Validates COs for NBA compliance
│   ├── po_mapper.py        # Phase 4: Generates CO-PO mapping matrix
│   ├── mapping_validator.py# Phase 4: Validates mapping quality
│   ├── teaching_philosophy.py # Phase 5: Generates teaching philosophy
│   ├── co_attainment.py    # Phase 6: Calculates CO attainment from CSV
│   ├── po_attainment.py    # Phase 7: Computes weighted PO attainment
│   ├── recommendation.py   # Phase 8: Generates improvement recommendations
│   ├── report_generator.py # Phase 9: Exports Excel report
│   ├── reflection_agent.py # Meta-agent for reflection/regeneration
│   ├── assignment_generator.py # Bonus: Generates assignments per CO
│   ├── pi_generator.py     # Bonus: Generates Performance Indicators
│   └── pi_mapper.py        # Bonus: Maps COs to Performance Indicators
│
├── core/                   # Core infrastructure
│   ├── state.py            # AgentState — shared memory across agents
│   ├── schemas.py          # Pydantic models (CourseOutcome, MappingEntry, etc.)
│   ├── orchestrator.py     # CLI pipeline orchestrator (all 9 phases)
│   ├── database.py         # SQLite database layer
│   ├── memory.py           # Long-term memory helpers
│   └── default_pis.py      # Default Performance Indicators by department
│
├── tools/                  # Utility tools used by agents
│   ├── llm_client.py       # LLM API wrapper (call_llm, call_llm_json)
│   ├── syllabus_reader.py  # PDF/TXT syllabus parser
│   ├── pdf_generator.py    # PDF report generator
│   └── assignment_pdf_generator.py
│
├── data/
│   ├── sample_pos.json     # ⭐ Default 12 NBA Program Outcomes
│   ├── db.sqlite           # SQLite database (subjects, users, logs)
│   ├── output/             # Generated Excel/PDF reports
│   ├── syllabus/           # Uploaded syllabus files
│   └── students/           # Student marks CSV files
│
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── pages/          # Dashboard, Mapping, Attainment, Recommendations, etc.
│   │   └── components/     # Reusable UI components
│   └── package.json
│
└── logs/                   # Audit trail logs
```

---

## Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- An LLM API key (Google Gemini / OpenAI)

### Backend Setup

```bash
# 1. Install Python dependencies
pip install -r requirement.txt

# 2. Create .env file with your API key
echo "GEMINI_API_KEY=your_api_key_here" > .env

# 3. Start the backend server
uvicorn server:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will open at `http://localhost:5173` and connects to the backend at `http://localhost:8000`.

---

## Running the Platform

### Option A: Web UI (Recommended)

1. Start backend: `uvicorn server:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Open browser at `http://localhost:5173`
4. Login with credentials (default: admin/admin)
5. Create a subject → Upload syllabus → Follow the pipeline

### Option B: CLI Mode (Terminal)

```bash
python main.py
```

Follow the prompts:
1. Enter subject name and year
2. Enter attainment thresholds (e.g., 55, 65, 75)
3. Enter path to syllabus PDF/TXT
4. Review and accept/reject generated COs
5. Choose to load POs from `data/sample_pos.json`
6. Review and accept the CO-PO mapping matrix
7. Enter path to student marks CSV
8. View CO and PO attainment results
9. Generate Excel report

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/setup` | Configure subject, year, thresholds, syllabus |
| `POST` | `/api/cos/generate` | Generate COs using AI |
| `POST` | `/api/cos/regenerate` | Regenerate COs with feedback |
| `GET`  | `/api/cos` | Fetch current COs |
| `POST` | `/api/pos/default` | Load POs from `data/sample_pos.json` |
| `POST` | `/api/pos/load` | Load custom POs |
| `GET`  | `/api/mappings` | Get current CO-PO mappings |
| `POST` | `/api/mappings/generate` | AI-generate CO-PO mapping matrix |
| `PUT`  | `/api/mappings/update` | Manually update mappings |
| `POST` | `/api/attainment/upload` | Upload student marks CSV |
| `POST` | `/api/attainment/calculate` | Calculate CO & PO attainment |
| `GET`  | `/api/recommendations` | Get AI recommendations |
| `GET`  | `/api/report/download` | Download Excel/PDF report |

---

## Data Formats

### Student Marks CSV
```csv
roll_no,CO1,CO2,CO3,CO4,CO5,CO6
MAX,30,30,30,30,30,30
101,25,28,22,27,30,18
102,18,21,26,15,22,24
103,27,24,19,28,25,21
```

> ⚠️ **Required**: The `MAX` row must be present to define the maximum marks per CO.
> The roll column can be named: `roll_no`, `rollno`, `roll number`, `student_id`, `enrollment_no`

### Custom POs JSON (to replace `data/sample_pos.json`)
```json
[
  {"po_id": "PO1", "statement": "Your custom PO1 statement"},
  {"po_id": "PO2", "statement": "Your custom PO2 statement"},
  {"po_id": "PSO1", "statement": "Program Specific Outcome 1"}
]
```

---

## Key Design Decisions

| Decision | Reason |
|----------|--------|
| **Strength scale 0–3** | NBA standard; 0=None, 1=Low, 2=Medium, 3=High |
| **Bloom's Level ≥ 3** | NBA/NAAC requires Apply-level and above for COs |
| **Weighted PO formula** | Accounts for mapping strength — a CO with strength 3 contributes more to PO attainment than a CO with strength 1 |
| **50% student threshold for level achievement** | Standard NBA benchmark — a CO is "achieved at Level X" if ≥50% of students reach that level |
| **Auto-healing (ensure_pos_and_mappings)** | If POs or mappings are missing, the system auto-loads defaults to prevent crashes |
| **SQLite persistence** | Lightweight, zero-config database; no need for PostgreSQL/MySQL in local deployments |

---

*Built for NBA/NAAC accreditation compliance. For questions or contributions, refer to the project team.*
