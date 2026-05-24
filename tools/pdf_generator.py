import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from core.state import AgentState

def generate_pdf_report(state: AgentState, output_path: str):
    # Setup document
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        textColor=colors.HexColor('#1F3864'),
        spaceAfter=15,
        alignment=1 # Center
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=12,
        textColor=colors.HexColor('#555555'),
        spaceAfter=25,
        alignment=1
    )

    h1_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        textColor=colors.HexColor('#1F3864'),
        spaceBefore=15,
        spaceAfter=10,
        borderColor=colors.HexColor('#1F3864'),
        borderWidth=0.5,
        borderPadding=4
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        spaceAfter=10
    )
    
    body_bold = ParagraphStyle(
        'BodyTextBold',
        parent=body_style,
        fontName='Helvetica-Bold'
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
        leading=11
    )
    
    table_cell_center = ParagraphStyle(
        'TableCellCenter',
        parent=table_cell_style,
        alignment=1
    )

    story = []

    # Title Banner
    story.append(Paragraph("UNIVERSITY ERP PORTAL", title_style))
    story.append(Paragraph("Course Outcome & Program Outcome (CO-PO) Accreditation Intelligence Report", subtitle_style))
    story.append(Spacer(1, 10))

    # Course Metadata Table
    meta_data = [
        [Paragraph("<b>Course Name:</b>", body_style), Paragraph(state.subject_name or "N/A", body_style),
         Paragraph("<b>Year of Study:</b>", body_style), Paragraph(state.year or "N/A", body_style)],
        [Paragraph("<b>Level 1 Threshold:</b>", body_style), Paragraph(f"{state.level1_threshold}%", body_style),
         Paragraph("<b>Level 2 Threshold:</b>", body_style), Paragraph(f"{state.level2_threshold}%", body_style)],
        [Paragraph("<b>Level 3 Threshold:</b>", body_style), Paragraph(f"{state.level3_threshold}%", body_style),
         Paragraph("<b>Date Generated:</b>", body_style), Paragraph(os.path.basename(output_path).split('_')[-1].replace('.pdf', '') if '_' in output_path else "N/A", body_style)]
    ]
    meta_table = Table(meta_data, colWidths=[130, 130, 130, 130])
    meta_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CCCCCC')),
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F2F2F2')),
        ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#F2F2F2')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 20))

    # 1. Course Outcomes
    story.append(Paragraph("1. Course Outcomes (COs)", h1_style))
    co_headers = ["CO ID", "Bloom's Level", "Course Outcome Statement", "Status"]
    co_rows = [[Paragraph(f"<b>{h}</b>", table_header_style) for h in co_headers]]
    for co in state.cos:
        co_rows.append([
            Paragraph(co.co_id, table_cell_center),
            Paragraph(f"L{co.blooms_level} - {co.blooms_keyword}", table_cell_center),
            Paragraph(co.statement, table_cell_style),
            Paragraph(co.validation_status.upper(), table_cell_center)
        ])
    co_table = Table(co_rows, colWidths=[50, 90, 310, 70])
    co_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1F3864')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CCCCCC')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F9F9F9')]),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(co_table)
    story.append(Spacer(1, 15))

    # 2. Course Articulation Matrix
    story.append(Paragraph("2. Course Articulation Matrix (CO-PO Direct Strength Mapping)", h1_style))
    story.append(Paragraph("This matrix shows the direct contribution of Course Outcomes (COs) to Program Outcomes (POs) as mapped by the pipeline.", body_style))
    
    co_ids = [co.co_id for co in state.cos]
    po_ids = [po.po_id for po in state.pos]
    
    if not co_ids or not po_ids:
        story.append(Paragraph("Course Outcomes or Program Outcomes not configured.", body_style))
    else:
        art_headers = ["CO / PO"] + po_ids
        art_rows = [[Paragraph(f"<b>{h}</b>", table_header_style) for h in art_headers]]
        
        # Build PO mapping lookup
        po_map_lookup = {(m.co_id, m.po_id): m.strength for m in state.co_po_mapping}
        
        art_styles = [
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1F3864')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CCCCCC')),
            ('PADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]
        
        for r_idx, co in enumerate(state.cos, 1):
            row = [Paragraph(f"<b>{co.co_id}</b>", table_cell_center)]
            for c_idx, po_id in enumerate(po_ids, 1):
                strength = po_map_lookup.get((co.co_id, po_id), 0)
                val_str = str(strength) if strength > 0 else "-"
                row.append(Paragraph(val_str, table_cell_center))
                
                # Apply cell colors
                if strength == 3:
                    art_styles.append(('BACKGROUND', (c_idx, r_idx), (c_idx, r_idx), colors.HexColor('#D6F0D6'))) # green
                elif strength == 2:
                    art_styles.append(('BACKGROUND', (c_idx, r_idx), (c_idx, r_idx), colors.HexColor('#FFF2CC'))) # amber/yellow
                elif strength == 1:
                    art_styles.append(('BACKGROUND', (c_idx, r_idx), (c_idx, r_idx), colors.HexColor('#FF9999'))) # red
                else:
                    art_styles.append(('BACKGROUND', (c_idx, r_idx), (c_idx, r_idx), colors.HexColor('#F2F2F2'))) # gray
            art_rows.append(row)
            
        num_pos = len(po_ids)
        po_col_w = 34
        co_col_w = 60
        art_col_ws = [co_col_w] + [po_col_w] * num_pos
        
        art_table = Table(art_rows, colWidths=art_col_ws)
        art_table.setStyle(TableStyle(art_styles))
        story.append(art_table)
        story.append(Spacer(1, 10))
        
        # Legend below matrix
        legend_data = [
            [
                Paragraph("<font color='#006100'><b>3</b></font>: Substantial (Green)", table_cell_style),
                Paragraph("<font color='#9C6500'><b>2</b></font>: Moderate (Amber)", table_cell_style),
                Paragraph("<font color='#9C0006'><b>1</b></font>: Slight (Red)", table_cell_style),
                Paragraph("<b>-</b>: None (Gray)", table_cell_style)
            ]
        ]
        legend_table = Table(legend_data, colWidths=[130, 130, 130, 130])
        legend_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#EAEAEA')),
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FDFDFD')),
            ('PADDING', (0,0), (-1,-1), 6),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ]))
        story.append(legend_table)
        story.append(Spacer(1, 15))

    # 3. Performance Indicator (PI) Alignment Matrix
    story.append(Paragraph("3. Performance Indicator (PI) Alignment Matrix (Performance Indicator to CO Mapping)", h1_style))
    
    cos = state.cos
    pis = state.performance_indicators
    
    if not cos or not pis:
        story.append(Paragraph("Performance indicators or Course Outcomes not configured.", body_style))
    else:
        co_ids = [co.co_id for co in cos]
        matrix_headers = ["PO", "PI ID", "Performance Indicator"] + co_ids
        matrix_rows = [[Paragraph(f"<b>{h}</b>", table_header_style) for h in matrix_headers]]
        
        # Build PI mapping lookup
        pi_map_lookup = {(m.co_id, m.pi_id): m.mapped for m in state.pi_mappings}
        
        # Build PO mapping lookup
        po_map_lookup = {(m.co_id, m.po_id): m.strength for m in state.co_po_mapping}
        
        table_styles = [
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1F3864')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CCCCCC')),
            ('PADDING', (0,0), (-1,-1), 4),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]
        
        pos_list = ["PO1", "PO2", "PO3", "PO4", "PO5", "PO6", "PO7", "PO8", "PO9", "PO10", "PO11", "PO12"]
        current_row_idx = 1
        
        for po_id in pos_list:
            po_pis = [pi for pi in pis if pi.po_id == po_id]
            if not po_pis:
                continue
                
            for pi in po_pis:
                row = [
                    Paragraph(pi.po_id, table_cell_center),
                    Paragraph(pi.pi_id, table_cell_center),
                    Paragraph(pi.pi_statement, table_cell_style)
                ]
                
                for col_idx, co in enumerate(cos, 3):
                    mapped = pi_map_lookup.get((co.co_id, pi.pi_id), "N")
                    row.append(Paragraph(mapped, table_cell_center))
                    if mapped == "Y":
                        # Light green background for mapped indicator
                        table_styles.append(('BACKGROUND', (col_idx, current_row_idx), (col_idx, current_row_idx), colors.HexColor('#D6F0D6')))
                        
                matrix_rows.append(row)
                current_row_idx += 1
                
            # PO summary row
            summary_row = [
                Paragraph(f"<b>PO to CO Mapping for {po_id}</b>", table_cell_style),
                Paragraph("", table_cell_center),
                Paragraph("", table_cell_center)
            ]
            
            for col_idx, co in enumerate(cos, 3):
                strength = po_map_lookup.get((co.co_id, po_id), 0)
                val_str = str(strength) if strength > 0 else "-"
                summary_row.append(Paragraph(f"<b>{val_str}</b>", table_cell_center))
                
            matrix_rows.append(summary_row)
            table_styles.append(('SPAN', (0, current_row_idx), (2, current_row_idx)))
            table_styles.append(('BACKGROUND', (0, current_row_idx), (-1, current_row_idx), colors.HexColor('#DDEBF7'))) # Light blue background
            
            current_row_idx += 1
            
        num_cos = len(cos)
        co_width = 30
        po_w = 30
        pi_id_w = 40
        pi_desc_w = 520 - po_w - pi_id_w - (co_width * num_cos)
        col_w = [po_w, pi_id_w, pi_desc_w] + [co_width] * num_cos
        
        matrix_table = Table(matrix_rows, colWidths=col_w)
        matrix_table.setStyle(TableStyle(table_styles))
        story.append(matrix_table)

    # Page Break for Teaching Philosophy & Attainment
    story.append(PageBreak())

    # 4. Teaching Philosophy
    if state.teaching_philosophy:
        story.append(Paragraph("4. Teaching Philosophy", h1_style))
        story.append(Paragraph(state.teaching_philosophy, body_style))
        story.append(Spacer(1, 15))

    # 5. CO Attainment Analysis
    story.append(Paragraph("5. CO Attainment Analysis", h1_style))
    if not state.co_attainment:
        story.append(Paragraph("No CO attainment calculated. Marks file not uploaded yet.", body_style))
    else:
        co_att_headers = ["CO ID", "Average Marks %", "Students >= L1 %", "Students >= L2 %", "Students >= L3 %", "Attainment Level"]
        co_att_rows = [[Paragraph(f"<b>{h}</b>", table_header_style) for h in co_att_headers]]
        for a in state.co_attainment:
            co_att_rows.append([
                Paragraph(a.co_id, table_cell_center),
                Paragraph(f"{a.avg_percentage}%", table_cell_center),
                Paragraph(f"{a.level_1_students_pct}%", table_cell_center),
                Paragraph(f"{a.level_2_students_pct}%", table_cell_center),
                Paragraph(f"{a.level_3_students_pct}%", table_cell_center),
                Paragraph(f"Level {a.achieved_level}" if a.achieved_level > 0 else "Not Achieved", table_cell_center)
            ])
        co_att_table = Table(co_att_rows, colWidths=[60, 90, 95, 95, 95, 95])
        co_att_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#6A2B6A')), # Dark Purple
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CCCCCC')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F9F9F9')]),
            ('PADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(co_att_table)
    story.append(Spacer(1, 15))

    # 6. PO Attainment Analysis
    story.append(Paragraph("6. PO Attainment Analysis", h1_style))
    if not state.po_attainment:
        story.append(Paragraph("No PO attainment calculated.", body_style))
    else:
        po_att_headers = ["PO ID", "Weighted Attainment Score", "Status", "Weakness Reason / Remarks"]
        po_att_rows = [[Paragraph(f"<b>{h}</b>", table_header_style) for h in po_att_headers]]
        for a in state.po_attainment:
            status_text = "WEAK" if a.is_weak else "GOOD"
            po_att_rows.append([
                Paragraph(a.po_id, table_cell_center),
                Paragraph(f"{a.weighted_attainment:.3f}", table_cell_center),
                Paragraph(status_text, table_cell_center),
                Paragraph(a.weakness_reason or "Attainment satisfactory", table_cell_style)
            ])
        po_att_table = Table(po_att_rows, colWidths=[60, 130, 90, 250])
        po_att_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#702E2E')), # Dark Red
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CCCCCC')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F9F9F9')]),
            ('PADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(po_att_table)
    story.append(Spacer(1, 15))

    # 7. AI-Generated Recommendations
    if state.recommendations:
        story.append(Paragraph("7. AI-Generated Recommendations", h1_style))
        rec_headers = ["Target", "Priority", "Issue Identified", "Action Recommendation"]
        rec_rows = [[Paragraph(f"<b>{h}</b>", table_header_style) for h in rec_headers]]
        for r in state.recommendations:
            rec_rows.append([
                Paragraph(r.target, table_cell_center),
                Paragraph(r.priority.upper(), table_cell_center),
                Paragraph(r.issue, table_cell_style),
                Paragraph(r.suggestion, table_cell_style)
            ])
        rec_table = Table(rec_rows, colWidths=[60, 70, 180, 220])
        rec_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#A05A2C')), # Dark Brown/Orange
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CCCCCC')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F9F9F9')]),
            ('PADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(rec_table)

    doc.build(story)
