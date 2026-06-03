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
    
    table_header_style_small = ParagraphStyle(
        'TableHeaderSmall',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=6.5,
        textColor=colors.white,
        alignment=1,
        leading=8
    )

    table_cell_style_small = ParagraphStyle(
        'TableCellSmall',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=6.5,
        leading=8
    )

    table_cell_center_small = ParagraphStyle(
        'TableCellCenterSmall',
        parent=table_cell_style_small,
        alignment=1
    )

    table_cell_bold_center_small = ParagraphStyle(
        'TableCellBoldCenterSmall',
        parent=table_cell_style_small,
        fontName='Helvetica-Bold',
        alignment=1
    )

    table_cell_bold_center_dark = ParagraphStyle(
        'TableCellBoldCenterDark',
        parent=table_cell_style_small,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#1F3864'),
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
        ia_max = next(iter(state.ia_max_marks.values()), 30.0) if state.ia_max_marks else 30.0
        mse_max = next(iter(state.mse_max_marks.values()), 20.0) if state.mse_max_marks else 20.0
        cie_max = ia_max + mse_max
        ese_max = next(iter(state.ese_max_marks.values()), 50.0) if state.ese_max_marks else 50.0
        total_max = cie_max + ese_max

        header_row0 = [
            Paragraph("<b>Sr. NO.</b>", table_header_style_small),
            Paragraph("<b>CO</b>", table_header_style_small),
            Paragraph("<b>COURSE OUTCOMES</b>", table_header_style_small),
            Paragraph("<b>REVISED BLOOMS LEVEL</b>", table_header_style_small),
            Paragraph("<b>TARGET FOR COs %</b>", table_header_style_small),
            Paragraph("<b>CIE ASSESSMENT</b>", table_header_style_small),
            "", "", "",
            Paragraph("<b>ESE ASSESSMENT</b>", table_header_style_small),
            "",
            Paragraph("<b>AVERAGE ACHIEVED</b>", table_header_style_small),
            Paragraph("<b>ATTAINMENT LEVEL</b>", table_header_style_small)
        ]

        header_row1 = [
            "", "", "", "", "",
            Paragraph("<b>IA</b>", table_header_style_small),
            Paragraph("<b>MSE</b>", table_header_style_small),
            Paragraph("<b>TOTAL</b>", table_header_style_small),
            Paragraph("<b>ATTAINMENT LEVEL</b>", table_header_style_small),
            Paragraph("<b>ESE</b>", table_header_style_small),
            Paragraph("<b>ATTAINMENT LEVEL</b>", table_header_style_small),
            "",
            ""
        ]

        header_row2 = [
            "", "", "", "", "",
            Paragraph(f"<b>{ia_max:.0f}</b>", table_cell_bold_center_dark),
            Paragraph(f"<b>{mse_max:.0f}</b>", table_cell_bold_center_dark),
            Paragraph(f"<b>{cie_max:.0f}</b>", table_cell_bold_center_dark),
            "",
            Paragraph(f"<b>{ese_max:.0f}</b>", table_cell_bold_center_dark),
            "",
            Paragraph(f"<b>{total_max:.0f}</b>", table_cell_bold_center_dark),
            ""
        ]

        co_map = {co.co_id: co for co in state.cos}
        att_lookup = {a.co_id: a for a in state.co_attainment}
        active_cos = [co for co in state.cos if co.statement and co.statement.strip()]

        co_att_rows = [header_row0, header_row1, header_row2]

        def fmt_pct(val):
            return f"{val:.2f}" if val is not None else ""

        def fmt_lvl(val):
            return f"{val:.2f}" if val is not None else ""

        for idx, co in enumerate(state.cos):
            att = att_lookup.get(co.co_id)
            is_active = bool(co.statement and co.statement.strip())
            
            row = [
                Paragraph(str(idx + 1), table_cell_center_small),
                Paragraph(co.co_id, table_cell_center_small),
                Paragraph(co.statement if is_active else "", table_cell_style_small),
                Paragraph(f"Level {co.blooms_level}" if (is_active and co.blooms_level) else ("Level 3" if is_active else "0"), table_cell_center_small),
                Paragraph(str(co.target_attainment if co.target_attainment is not None else (state.level1_threshold or 60.0)) if is_active else "0", table_cell_center_small)
            ]
            
            if is_active and att:
                row.extend([
                    Paragraph(fmt_pct(att.ia_percentage), table_cell_center_small),
                    Paragraph(fmt_pct(att.mse_percentage), table_cell_center_small),
                    Paragraph(fmt_pct(att.cie_percentage), table_cell_center_small),
                    Paragraph(fmt_lvl(att.cie_level), table_cell_center_small),
                    Paragraph(fmt_pct(att.ese_percentage), table_cell_center_small),
                    Paragraph(fmt_lvl(att.ese_level), table_cell_center_small),
                    Paragraph(fmt_pct(att.avg_percentage), table_cell_center_small),
                    Paragraph(fmt_lvl(att.achieved_level), table_cell_center_small)
                ])
            else:
                row.extend(["", "", "", "", "", "", "", ""])
                
            co_att_rows.append(row)

        avg_row_idx = len(co_att_rows)
        active_atts = [att_lookup[co.co_id] for co in active_cos if co.co_id in att_lookup]

        def get_avg_str(extractor):
            vals = [extractor(a) for a in active_atts if extractor(a) is not None]
            return f"{sum(vals) / len(vals):.2f}" if vals else ""

        avg_target = round(sum(co.target_attainment if co.target_attainment is not None else (state.level1_threshold or 60.0) for co in state.cos) / len(state.cos)) if state.cos else 0

        avg_row = [
            Paragraph("<b>Average</b>", table_cell_bold_center_small),
            "", "", "",
            Paragraph(f"<b>{avg_target}</b>", table_cell_bold_center_small),
            Paragraph(f"<b>{get_avg_str(lambda a: a.ia_percentage)}</b>", table_cell_bold_center_small),
            Paragraph(f"<b>{get_avg_str(lambda a: a.mse_percentage)}</b>", table_cell_bold_center_small),
            Paragraph(f"<b>{get_avg_str(lambda a: a.cie_percentage)}</b>", table_cell_bold_center_small),
            Paragraph(f"<b>{get_avg_str(lambda a: a.cie_level)}</b>", table_cell_bold_center_small),
            Paragraph(f"<b>{get_avg_str(lambda a: a.ese_percentage)}</b>", table_cell_bold_center_small),
            Paragraph(f"<b>{get_avg_str(lambda a: a.ese_level)}</b>", table_cell_bold_center_small),
            Paragraph(f"<b>{get_avg_str(lambda a: a.avg_percentage)}</b>", table_cell_bold_center_small),
            Paragraph(f"<b>{get_avg_str(lambda a: a.achieved_level)}</b>", table_cell_bold_center_small)
        ]
        co_att_rows.append(avg_row)

        co_att_table = Table(co_att_rows, colWidths=[18, 22, 172, 36, 32, 28, 28, 30, 36, 28, 36, 32, 34])
        
        table_style_list = [
            ('BACKGROUND', (0, 0), (-1, 1), colors.HexColor('#6A2B6A')),
            ('TEXTCOLOR', (0, 0), (-1, 1), colors.white),
            ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F2F2F2')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('SPAN', (0, 0), (0, 2)),
            ('SPAN', (1, 0), (1, 2)),
            ('SPAN', (2, 0), (2, 2)),
            ('SPAN', (3, 0), (3, 2)),
            ('SPAN', (4, 0), (4, 2)),
            ('SPAN', (5, 0), (8, 0)),
            ('SPAN', (9, 0), (10, 0)),
            ('SPAN', (11, 0), (11, 1)),
            ('SPAN', (12, 0), (12, 2)),
            ('SPAN', (8, 1), (8, 2)),
            ('SPAN', (10, 1), (10, 2)),
            ('SPAN', (0, avg_row_idx), (3, avg_row_idx)),
            ('BACKGROUND', (0, avg_row_idx), (-1, avg_row_idx), colors.HexColor('#EAEAEA')),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ]

        for r in range(3, avg_row_idx):
            bg = colors.white if r % 2 == 1 else colors.HexColor('#F9F9F9')
            table_style_list.append(('BACKGROUND', (0, r), (-1, r), bg))

        co_att_table.setStyle(TableStyle(table_style_list))
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
