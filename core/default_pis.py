def get_default_pis(department: str) -> list[dict]:
    # Normalize department name to handle subtle variations
    dept_lower = department.lower()
    
    # Custom specialization indicators
    spec_1_4 = "Apply knowledge of specialized engineering principles to analyze complex domain-specific systems."
    spec_3_1 = "Design solutions for domain-specific engineering problems using standard methodologies."
    
    if "computer" in dept_lower:
        spec_1_4 = "Apply knowledge of computer architecture, operating systems, and discrete mathematics to analyze computer systems."
        spec_3_1 = "Design software architectures, database schemas, and networking topologies that meet technical constraints."
    elif "data science" in dept_lower:
        spec_1_4 = "Apply knowledge of statistics, data structures, and databases to analyze and process large datasets."
        spec_3_1 = "Design data pipelines, statistical models, and analytics dashboards to extract business intelligence."
    elif "aiml" in dept_lower or "artificial intelligence" in dept_lower:
        spec_1_4 = "Apply knowledge of linear algebra, probability, and optimization to design intelligent machine learning models."
        spec_3_1 = "Design neural networks, computer vision systems, or natural language processing workflows to solve automation tasks."
    elif "software" in dept_lower:
        spec_1_4 = "Apply software engineering principles, design patterns, and testing methodologies to manage software lifecycle."
        spec_3_1 = "Design secure, robust, and scalable software applications adhering to object-oriented or functional paradigms."
    elif "information" in dept_lower:
        spec_1_4 = "Apply knowledge of network protocols, cloud computing, and web technologies to integrate information systems."
        spec_3_1 = "Design secure information systems, database applications, and cloud-based infrastructures."
    elif "mechanical" in dept_lower:
        spec_1_4 = "Apply knowledge of thermodynamics, fluid mechanics, and materials science to mechanical systems."
        spec_3_1 = "Design mechanical systems, components, thermal cycles, or manufacturing processes."
    elif "chemical" in dept_lower:
        spec_1_4 = "Apply knowledge of transport phenomena, reaction kinetics, and thermodynamics to chemical processes."
        spec_3_1 = "Design reactor vessels, mass transfer systems, or chemical process plants with safe operating limits."
    elif "civil" in dept_lower:
        spec_1_4 = "Apply structural analysis, soil mechanics, and hydraulics principles to civil infrastructure."
        spec_3_1 = "Design structural components, foundations, drainage systems, or transportation facilities."

    # Standard POs, Competencies, and PIs
    pis = [
        # PO1: Engineering Knowledge
        {
            "po_id": "PO1",
            "competency_id": "1.1",
            "competency_statement": "Demonstrate competence in mathematical modelling.",
            "pi_id": "1.1.1",
            "pi_statement": "Apply mathematical concepts like calculus, algebra, probability, and statistics to engineering problems."
        },
        {
            "po_id": "PO1",
            "competency_id": "1.2",
            "competency_statement": "Demonstrate competence in basic sciences.",
            "pi_id": "1.2.1",
            "pi_statement": "Apply laws of physics and chemistry to solve engineering problems."
        },
        {
            "po_id": "PO1",
            "competency_id": "1.3",
            "competency_statement": "Demonstrate competence in engineering fundamentals.",
            "pi_id": "1.3.1",
            "pi_statement": "Apply basic engineering principles (circuits, mechanics, materials, etc.) to analyze problems."
        },
        {
            "po_id": "PO1",
            "competency_id": "1.4",
            "competency_statement": "Demonstrate competence in specialized engineering knowledge.",
            "pi_id": "1.4.1",
            "pi_statement": spec_1_4
        },
        
        # PO2: Problem Analysis
        {
            "po_id": "PO2",
            "competency_id": "2.1",
            "competency_statement": "Identify complex engineering problems.",
            "pi_id": "2.1.1",
            "pi_statement": "Identify and define engineering problems based on customer and societal requirements."
        },
        {
            "po_id": "PO2",
            "competency_id": "2.2",
            "competency_statement": "Formulate complex engineering problems.",
            "pi_id": "2.2.1",
            "pi_statement": "Formulate mathematical and logical models of engineering problems."
        },
        {
            "po_id": "PO2",
            "competency_id": "2.3",
            "competency_statement": "Analyze complex engineering problems.",
            "pi_id": "2.3.1",
            "pi_statement": "Analyze and evaluate alternative designs and solutions for feasibility."
        },
        {
            "po_id": "PO2",
            "competency_id": "2.4",
            "competency_statement": "Solve complex engineering problems using literature.",
            "pi_id": "2.4.1",
            "pi_statement": "Conduct literature reviews and consult academic publications to research complex problems."
        },
        
        # PO3: Design/Development of Solutions
        {
            "po_id": "PO3",
            "competency_id": "3.1",
            "competency_statement": "Design solutions for complex engineering problems.",
            "pi_id": "3.1.1",
            "pi_statement": spec_3_1
        },
        {
            "po_id": "PO3",
            "competency_id": "3.2",
            "competency_statement": "Design systems/components meeting specific needs.",
            "pi_id": "3.2.1",
            "pi_statement": "Design subsystems or processes including components, wiring, layouts, or flowcharts."
        },
        {
            "po_id": "PO3",
            "competency_id": "3.3",
            "competency_statement": "Use creative/innovative design methodologies under constraints.",
            "pi_id": "3.3.1",
            "pi_statement": "Incorporate safety, environmental, societal, and regulatory standards into designs."
        },

        # PO4: Conduct Investigations of Complex Problems
        {
            "po_id": "PO4",
            "competency_id": "4.1",
            "competency_statement": "Formulate research-based investigations.",
            "pi_id": "4.1.1",
            "pi_statement": "Formulate research methodologies and select experimental designs."
        },
        {
            "po_id": "PO4",
            "competency_id": "4.2",
            "competency_statement": "Conduct experiments and collect data.",
            "pi_id": "4.2.1",
            "pi_statement": "Conduct experiments, collect data, and verify correctness of results."
        },
        {
            "po_id": "PO4",
            "competency_id": "4.3",
            "competency_statement": "Synthesize information to provide conclusions.",
            "pi_id": "4.3.1",
            "pi_statement": "Analyze experimental data to extract meaningful conclusions."
        },

        # PO5: Modern Tool Usage
        {
            "po_id": "PO5",
            "competency_id": "5.1",
            "competency_statement": "Select appropriate modern tools.",
            "pi_id": "5.1.1",
            "pi_statement": "Select appropriate modern software, hardware, or simulation tools."
        },
        {
            "po_id": "PO5",
            "competency_id": "5.2",
            "competency_statement": "Apply tools to model and analyze problems.",
            "pi_id": "5.2.1",
            "pi_statement": "Apply modern engineering tools to model, simulate, or analyze system behaviors."
        },
        {
            "po_id": "PO5",
            "competency_id": "5.3",
            "competency_statement": "Recognize limitations of modern tools.",
            "pi_id": "5.3.1",
            "pi_statement": "Acknowledge the accuracy, precision, and performance limits of engineering tools."
        },

        # PO6: The Engineer and Society
        {
            "po_id": "PO6",
            "competency_id": "6.1",
            "competency_statement": "Assess societal, health, safety, and legal issues.",
            "pi_id": "6.1.1",
            "pi_statement": "Assess the impact of engineering solutions on public health, safety, and legal issues."
        },
        {
            "po_id": "PO6",
            "competency_id": "6.2",
            "competency_statement": "Understand professional engineering responsibilities.",
            "pi_id": "6.2.1",
            "pi_statement": "Apply contextual knowledge to assess professional, safety, and cultural issues."
        },

        # PO7: Environment and Sustainability
        {
            "po_id": "PO7",
            "competency_id": "7.1",
            "competency_statement": "Understand environmental impact of solutions.",
            "pi_id": "7.1.1",
            "pi_statement": "Analyze the environmental impact of engineering solutions and product life cycles."
        },
        {
            "po_id": "PO7",
            "competency_id": "7.2",
            "competency_statement": "Apply sustainable development principles.",
            "pi_id": "7.2.1",
            "pi_statement": "Incorporate sustainable practices and green energy principles into solutions."
        },

        # PO8: Ethics
        {
            "po_id": "PO8",
            "competency_id": "8.1",
            "competency_statement": "Demonstrate professional ethics and responsibility.",
            "pi_id": "8.1.1",
            "pi_statement": "Apply codes of professional ethics and responsibility in engineering practices."
        },
        {
            "po_id": "PO8",
            "competency_id": "8.2",
            "competency_statement": "Practice academic integrity and respect diversity.",
            "pi_id": "8.2.1",
            "pi_statement": "Practice academic honesty, avoid plagiarism, and respect intellectual property rights."
        },

        # PO9: Individual and Team Work
        {
            "po_id": "PO9",
            "competency_id": "9.1",
            "competency_statement": "Function effectively as an individual in diverse teams.",
            "pi_id": "9.1.1",
            "pi_statement": "Function effectively as a member or leader in diverse, multidisciplinary teams."
        },
        {
            "po_id": "PO9",
            "competency_id": "9.2",
            "competency_statement": "Demonstrate leadership and collaborative skills.",
            "pi_id": "9.2.1",
            "pi_statement": "Collaborate with others, share responsibilities, and meet project deadlines."
        },

        # PO10: Communication
        {
            "po_id": "PO10",
            "competency_id": "10.1",
            "competency_statement": "Communicate effectively in writing.",
            "pi_id": "10.1.1",
            "pi_statement": "Write clear reports, documentation, and user manuals."
        },
        {
            "po_id": "PO10",
            "competency_id": "10.2",
            "competency_statement": "Communicate effectively orally.",
            "pi_id": "10.2.1",
            "pi_statement": "Present technical information and speak effectively to diverse audiences."
        },

        # PO11: Project Management and Finance
        {
            "po_id": "PO11",
            "competency_id": "11.1",
            "competency_statement": "Apply engineering management principles.",
            "pi_id": "11.1.1",
            "pi_statement": "Apply project management principles (budgeting, scheduling, resource allocation)."
        },
        {
            "po_id": "PO11",
            "competency_id": "11.2",
            "competency_statement": "Manage projects in multidisciplinary environments.",
            "pi_id": "11.2.1",
            "pi_statement": "Assess the financial feasibility and cost-benefit ratio of engineering projects."
        },

        # PO12: Life-Long Learning
        {
            "po_id": "PO12",
            "competency_id": "12.1",
            "competency_statement": "Adapt to technological changes.",
            "pi_id": "12.1.1",
            "pi_statement": "Demonstrate self-education and adapt to rapid technological advancements."
        },
        {
            "po_id": "PO12",
            "competency_id": "12.2",
            "competency_statement": "Engage in continuous self-directed learning.",
            "pi_id": "12.2.1",
            "pi_statement": "Access and retrieve technical information from databases and online resources."
        }
    ]
    
    return pis
