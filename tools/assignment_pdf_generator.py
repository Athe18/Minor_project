import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from core.schemas import Assignment

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to calculate total page count and draw
    consistent headers and footers with page numbers.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor('#555555'))
        
        # Bottom Margin line and Footer on all pages
        self.setStrokeColor(colors.HexColor('#CCCCCC'))
        self.setLineWidth(0.5)
        self.line(40, 45, 572, 45)
        
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(572, 32, page_text)
        self.drawString(40, 32, "MIT Academy of Engineering - Outcome Based Education (OBE) System")

        # Header line on pages 2 and onwards
        if self._pageNumber > 1:
            self.line(40, 755, 572, 755)
            self.drawString(40, 760, "CO-Wise Assignment Sheet")
            self.drawRightString(572, 760, "MIT AOE, Alandi")
            
        self.restoreState()


def generate_assignment_pdf(assignment: Assignment, output_path: str):
    # Setup document template with margins
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=50,
        bottomMargin=60
    )

    styles = getSampleStyleSheet()
    
    # Custom Typography Styles
    header_style = ParagraphStyle(
        'HeaderCollege',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        textColor=colors.HexColor('#1F3864'),
        alignment=1, # Center
        spaceAfter=3
    )

    sub_header_style = ParagraphStyle(
        'HeaderDept',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#444444'),
        alignment=1,
        spaceAfter=10
    )

    doc_title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        textColor=colors.HexColor('#2E75B6'),
        alignment=1,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        textColor=colors.white,
        spaceBefore=12,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#222222')
    )

    body_bold_style = ParagraphStyle(
        'BodyTextBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    metadata_label_style = ParagraphStyle(
        'MetaLabel',
        parent=body_style,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#1F3864')
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.white,
        alignment=1
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12
    )

    table_cell_center = ParagraphStyle(
        'TableCellCenter',
        parent=table_cell_style,
        alignment=1
    )

    appendix_title_style = ParagraphStyle(
        'AppendixTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        textColor=colors.HexColor('#1F3864'),
        alignment=1,
        spaceAfter=15,
        spaceBefore=15
    )

    story = []

    # 1. College Letterhead Branding
    story.append(Paragraph(assignment.college_header.upper(), header_style))
    story.append(Paragraph("DEPARTMENT OF COMPUTER ENGINEERING", sub_header_style))
    story.append(Paragraph(assignment.title.upper(), doc_title_style))
    story.append(Spacer(1, 5))

    # 2. Metadata Grid Table
    total_marks = sum(q.marks for s in assignment.sections for q in s.questions)
    meta_data = [
        [
            Paragraph("Subject Name:", metadata_label_style), Paragraph(assignment.subject_name, body_style),
            Paragraph("Academic Year:", metadata_label_style), Paragraph(assignment.academic_year, body_style)
        ],
        [
            Paragraph("Difficulty Level:", metadata_label_style), Paragraph(assignment.difficulty, body_style),
            Paragraph("Assignment Type:", metadata_label_style), Paragraph(assignment.assignment_type, body_style)
        ],
        [
            Paragraph("Total Marks:", metadata_label_style), Paragraph(f"{total_marks} Marks", body_bold_style),
            Paragraph("Date of Issue:", metadata_label_style), Paragraph("As per academic calendar", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[110, 156, 110, 156])
    meta_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CCCCCC')),
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F5F7FA')),
        ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#F5F7FA')),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # 3. Student Details Entry Box (Makes it look like a physical sheet)
    student_data = [
        [
            Paragraph("<b>Roll No:</b> ___________________", body_style),
            Paragraph("<b>Name:</b> __________________________________________", body_style),
            Paragraph("<b>Batch:</b> _________", body_style)
        ]
    ]
    student_table = Table(student_data, colWidths=[140, 290, 102])
    student_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#888888')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FAFAFA'))
    ]))
    story.append(student_table)
    story.append(Spacer(1, 12))

    # 4. Instructions Block
    instructions_content = []
    instructions_content.append([Paragraph("<b>General Instructions:</b>", metadata_label_style)])
    for i, inst in enumerate(assignment.instructions, 1):
        instructions_content.append([Paragraph(f"{i}. {inst}", body_style)])
        
    instructions_table = Table(instructions_content, colWidths=[532])
    instructions_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#2E75B6')),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F0F4F8')),
        ('PADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,-1), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(instructions_table)
    story.append(Spacer(1, 15))

    # 5. Question Sheets segmented by CO
    for sec_idx, section in enumerate(assignment.sections):
        # Section Header Banner
        banner_data = [[
            Paragraph(f"{section.section_name.upper()}: COURSE OUTCOME {section.co_id} (Bloom: L{section.blooms_level})", h1_style)
        ]]
        banner_table = Table(banner_data, colWidths=[532])
        banner_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#1F3864')),
            ('PADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(banner_table)
        
        # Section CO Description
        co_desc_style = ParagraphStyle(
            'CoDesc',
            parent=body_style,
            fontName='Helvetica-Oblique',
            textColor=colors.HexColor('#555555'),
            leftIndent=4,
            spaceBefore=4,
            spaceAfter=6
        )
        story.append(Paragraph(f"CO Target: {section.co_statement}", co_desc_style))
        
        # Section Questions Grid Table
        grid_headers = ["Q.No.", "Question Statement", "CO Mapping", "Blooms Level", "Marks"]
        grid_rows = [[Paragraph(f"<b>{h}</b>", table_header_style) for h in grid_headers]]
        
        for q in section.questions:
            grid_rows.append([
                Paragraph(q.id, table_cell_center),
                Paragraph(q.question_text, table_cell_style),
                Paragraph(q.co_id, table_cell_center),
                Paragraph(f"L{q.blooms_level}", table_cell_center),
                Paragraph(f"{q.marks} M", table_cell_center)
            ])
            
        grid_table = Table(grid_rows, colWidths=[40, 322, 50, 75, 45])
        grid_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#5B9BD5')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D3D3D3')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F9F9F9')]),
            ('PADDING', (0,0), (-1,-1), 5),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(grid_table)
        story.append(Spacer(1, 15))

    # 6. Appendix: Answer Keys and Grading Rubrics (Optional Pages)
    has_appendix = False
    for section in assignment.sections:
        for q in section.questions:
            if q.answer_key or q.rubric:
                has_appendix = True
                break
        if has_appendix:
            break

    if has_appendix:
        story.append(PageBreak())
        story.append(Paragraph("APPENDIX: ANSWER KEY & EVALUATION RUBRICS", appendix_title_style))
        story.append(Paragraph("<i>This section is automatically appended for faculty reference, detailing grading benchmarks.</i>", ParagraphStyle('ItalicInfo', parent=body_style, fontName='Helvetica-Oblique', alignment=1, spaceAfter=20)))
        
        for section in assignment.sections:
            sec_header_style = ParagraphStyle(
                'AppendixSecHeader',
                parent=styles['Heading3'],
                fontName='Helvetica-Bold',
                fontSize=11,
                textColor=colors.HexColor('#1F3864'),
                spaceBefore=10,
                spaceAfter=8,
                borderColor=colors.HexColor('#1F3864'),
                borderWidth=0.5,
                borderPadding=3
            )
            story.append(Paragraph(f"{section.section_name}: Solutions & Rubrics for CO {section.co_id}", sec_header_style))
            
            for q in section.questions:
                if not q.answer_key and not q.rubric:
                    continue
                
                # Question statement text block
                q_text_style = ParagraphStyle(
                    'AppQText',
                    parent=body_style,
                    fontName='Helvetica-Bold',
                    spaceBefore=6,
                    spaceAfter=4
                )
                story.append(Paragraph(f"{q.id}. {q.question_text} [{q.marks} Marks, L{q.blooms_level}]", q_text_style))
                
                # Answer Key Box
                if q.answer_key:
                    ans_content = [
                        [Paragraph("<b>Sample Answer Key / Solution:</b>", metadata_label_style)],
                        [Paragraph(q.answer_key.replace('\n', '<br/>'), body_style)]
                    ]
                    ans_table = Table(ans_content, colWidths=[520])
                    ans_table.setStyle(TableStyle([
                        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#10B981')),
                        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#ECFDF5')),
                        ('PADDING', (0,0), (-1,-1), 5),
                        ('LEFTPADDING', (0,0), (-1,-1), 8),
                    ]))
                    story.append(ans_table)
                    story.append(Spacer(1, 4))
                
                # Rubrics Box
                if q.rubric:
                    rubric_content = [
                        [Paragraph("<b>Grading Rubrics / Marking Breakdown:</b>", ParagraphStyle('RubricLabel', parent=body_style, fontName='Helvetica-Bold', textColor=colors.HexColor('#B45309')))],
                        [Paragraph(q.rubric.replace('\n', '<br/>'), body_style)]
                    ]
                    rubric_table = Table(rubric_content, colWidths=[520])
                    rubric_table.setStyle(TableStyle([
                        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#F59E0B')),
                        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FEF3C7')),
                        ('PADDING', (0,0), (-1,-1), 5),
                        ('LEFTPADDING', (0,0), (-1,-1), 8),
                    ]))
                    story.append(rubric_table)
                
                story.append(Spacer(1, 8))
            story.append(Spacer(1, 10))

    # Build the document using our NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
