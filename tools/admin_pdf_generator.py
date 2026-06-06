import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from datetime import datetime

def generate_admin_pdf_report(depts: list, users: list, subjects: list, monitoring: list, output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'AdminDocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=colors.HexColor('#0F172A'), # Slate 900
        spaceAfter=5,
        alignment=1 # Center
    )
    
    subtitle_style = ParagraphStyle(
        'AdminDocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#64748B'), # Slate 500
        spaceAfter=15,
        alignment=1
    )

    h1_style = ParagraphStyle(
        'AdminSectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=colors.HexColor('#1E3A8A'), # Blue 900
        spaceBefore=12,
        spaceAfter=8,
        borderColor=colors.HexColor('#CBD5E1'),
        borderWidth=0.5,
        borderPadding=4
    )

    body_style = ParagraphStyle(
        'AdminBodyTextCustom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        spaceAfter=6
    )
    
    table_header_style = ParagraphStyle(
        'AdminTableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        textColor=colors.white,
        alignment=1
    )

    table_cell_style = ParagraphStyle(
        'AdminTableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10
    )
    
    table_cell_center = ParagraphStyle(
        'AdminTableCellCenter',
        parent=table_cell_style,
        alignment=1
    )

    story = []

    # Title Banner
    story.append(Paragraph("MIT Academy of Engineering", title_style))
    story.append(Paragraph(f"OBE Accreditation Portal - Admin System Governance Report | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", subtitle_style))
    story.append(Spacer(1, 5))

    # 1. Departments Table
    story.append(Paragraph("1. Academic Departments", h1_style))
    dept_headers = ["Dept ID", "Department Name", "Vision Statement", "Mission Statement", "Academic Year"]
    dept_rows = [[Paragraph(f"<b>{h}</b>", table_header_style) for h in dept_headers]]
    for d in depts:
        dept_rows.append([
            Paragraph(str(d["id"]), table_cell_center),
            Paragraph(d["department_name"], table_cell_style),
            Paragraph(d.get("vision", "")[:120] + ("..." if len(d.get("vision", "")) > 120 else ""), table_cell_style),
            Paragraph(d.get("mission", "")[:120] + ("..." if len(d.get("mission", "")) > 120 else ""), table_cell_style),
            Paragraph(d.get("academic_year", "N/A"), table_cell_center)
        ])
    dept_table = Table(dept_rows, colWidths=[40, 130, 160, 160, 50])
    dept_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E3A8A')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(dept_table)
    story.append(Spacer(1, 10))

    # 2. Users Table
    story.append(Paragraph("2. User Accounts & Faculty Directory", h1_style))
    user_headers = ["ID", "Name", "Username", "Role", "Department", "Status"]
    user_rows = [[Paragraph(f"<b>{h}</b>", table_header_style) for h in user_headers]]
    for u in users:
        user_rows.append([
            Paragraph(str(u["id"]), table_cell_center),
            Paragraph(u["name"], table_cell_style),
            Paragraph(u["username"], table_cell_style),
            Paragraph(u["role"], table_cell_center),
            Paragraph(u.get("department_name") or "None", table_cell_style),
            Paragraph(u.get("status", "active").upper(), table_cell_center)
        ])
    user_table = Table(user_rows, colWidths=[30, 130, 90, 110, 130, 50])
    user_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(user_table)
    
    # Page Break for Subjects & Monitoring
    story.append(PageBreak())

    # 3. Subjects & Assignments Table
    story.append(Paragraph("3. Subject Directory & Course Assignments", h1_style))
    subj_headers = ["Code", "Subject Name", "Sem", "Year", "Department", "Champion", "Assigned Faculty"]
    subj_rows = [[Paragraph(f"<b>{h}</b>", table_header_style) for h in subj_headers]]
    for s in subjects:
        champ_name = s["champion"]["name"] if s["champion"] else "Not Assigned"
        fac_names = ", ".join(f["name"] for f in s["faculties"]) if s["faculties"] else "None"
        subj_rows.append([
            Paragraph(s["subject_code"] or "N/A", table_cell_center),
            Paragraph(s["subject_name"], table_cell_style),
            Paragraph(s["semester"], table_cell_center),
            Paragraph(s["year"], table_cell_center),
            Paragraph(s["department_name"] or "None", table_cell_style),
            Paragraph(champ_name, table_cell_style),
            Paragraph(fac_names, table_cell_style)
        ])
    subj_table = Table(subj_rows, colWidths=[45, 115, 30, 45, 95, 95, 115])
    subj_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E3A8A')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(subj_table)
    story.append(Spacer(1, 10))

    # 4. Monitoring & Attainment
    story.append(Paragraph("4. Academic Progress & Attainment Summary", h1_style))
    mon_headers = ["Subject Name", "Department", "Year / Semester", "Course Champion", "Progress Status", "Avg Attainment"]
    mon_rows = [[Paragraph(f"<b>{h}</b>", table_header_style) for h in mon_headers]]
    for m in monitoring:
        mon_rows.append([
            Paragraph(m["subject_name"], table_cell_style),
            Paragraph(m["department_name"] or "None", table_cell_style),
            Paragraph(f"{m['year']} / {m['semester']}", table_cell_center),
            Paragraph(m["champion_name"], table_cell_style),
            Paragraph(m["status"], table_cell_center),
            Paragraph(f"{m['avg_attainment']}%" if m["avg_attainment"] > 0 else "N/A", table_cell_center)
        ])
    mon_table = Table(mon_rows, colWidths=[120, 100, 75, 100, 85, 60])
    mon_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#3F823F')), # Dark Green
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(mon_table)

    doc.build(story)
