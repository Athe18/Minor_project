import os
import tempfile
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import numpy as np

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from core.state import AgentState

def generate_analysis_pdf(state: AgentState, output_path: str):
    # Determine directory for temporary images
    temp_dir = tempfile.gettempdir()
    chart_paths = []

    # Helper function to register and track temp files
    def get_temp_img_path():
        p = os.path.join(temp_dir, f"chart_{len(chart_paths)}_{os.getpid()}.png")
        chart_paths.append(p)
        return p

    # ─── Data Extraction & Calculations ───
    cos = state.cos or []
    co_attainments = state.co_attainment or []
    pos = state.pos or []
    mappings = state.co_po_mapping or []

    # Map CO details
    computed_cos = []
    for co in cos:
        att = next((a for a in co_attainments if a.co_id == co.co_id), None)
        achieved = att.avg_percentage if att else 0.0
        target = co.target_attainment if co.target_attainment is not None else state.level1_threshold or 60.0
        computed_cos.append({
            "co_id": co.co_id,
            "statement": co.statement,
            "blooms_level": co.blooms_level,
            "target": target,
            "achieved": achieved,
            "achieved_level": att.achieved_level if att else 0.0,
            "cia": att.cie_percentage if att else (att.ia_percentage if att else 0.0),
            "ese": att.ese_percentage if att else 0.0
        })

    # ─── Chart 1: CO Attainment vs Target ───
    c1_path = get_temp_img_path()
    plt.figure(figsize=(6, 3.2), dpi=150)
    co_names = [c["co_id"] for c in computed_cos]
    targets = [c["target"] for c in computed_cos]
    achieved_pcts = [c["achieved"] for c in computed_cos]
    
    x = np.arange(len(co_names))
    width = 0.35
    
    plt.bar(x - width/2, targets, width, label='Target CO %', color='#64748b')
    bars_achieved = plt.bar(x + width/2, achieved_pcts, width, label='Average Achieved %')
    
    # Color achieved bars green/red based on meeting target
    for idx, bar in enumerate(bars_achieved):
        if achieved_pcts[idx] >= targets[idx]:
            bar.set_color('#10b981')
        else:
            bar.set_color('#ef4444')
            
    plt.ylabel('Percentage')
    plt.title('CO Attainment vs Target')
    plt.xticks(x, co_names)
    plt.ylim(0, 100)
    plt.legend(fontsize=8, loc='upper left')
    plt.grid(axis='y', linestyle='--', alpha=0.3)
    plt.tight_layout()
    plt.savefig(c1_path)
    plt.close()

    # ─── Chart 2: CO Gap Analysis ───
    c2_path = get_temp_img_path()
    plt.figure(figsize=(6, 3.2), dpi=150)
    gaps = [c["achieved"] - c["target"] for c in computed_cos]
    gap_data = sorted(zip(co_names, gaps), key=lambda item: item[1]) # sorted ascending for horizontal bar (largest positive at top)
    sorted_names = [item[0] for item in gap_data]
    sorted_gaps = [item[1] for item in gap_data]
    
    y = np.arange(len(sorted_names))
    bars = plt.barh(y, sorted_gaps, color=['#10b981' if g >= 0 else '#ef4444' for g in sorted_gaps], height=0.5)
    
    plt.xlabel('Gap Score %')
    plt.title('Course Outcomes Gap Analysis (Achieved − Target)')
    plt.yticks(y, sorted_names)
    plt.grid(axis='x', linestyle='--', alpha=0.3)
    plt.tight_layout()
    plt.savefig(c2_path)
    plt.close()

    # ─── Chart 3: CIA vs ESE Performance Comparison ───
    c3_path = get_temp_img_path()
    plt.figure(figsize=(6, 3.2), dpi=150)
    cia_vals = [c["cia"] for c in computed_cos]
    ese_vals = [c["ese"] for c in computed_cos]
    
    plt.bar(x - width/2, cia_vals, width, label='CIA (Internal) %', color='#3b82f6')
    plt.bar(x + width/2, ese_vals, width, label='ESE (External) %', color='#6366f1')
    
    plt.ylabel('Percentage')
    plt.title('CIA vs ESE Performance Comparison')
    plt.xticks(x, co_names)
    plt.ylim(0, 100)
    plt.legend(fontsize=8, loc='upper left')
    plt.grid(axis='y', linestyle='--', alpha=0.3)
    plt.tight_layout()
    plt.savefig(c3_path)
    plt.close()

    # ─── Chart 4: CO Attainment Level Distribution ───
    c4_path = get_temp_img_path()
    plt.figure(figsize=(4.5, 3.2), dpi=150)
    counts = {'Level 3': 0, 'Level 2': 0, 'Level 1': 0, 'Level 0': 0}
    for c in computed_cos:
        lvl = max(0, min(3, round(c["achieved_level"])))
        counts[f'Level {lvl}'] += 1
        
    labels = list(counts.keys())
    sizes = list(counts.values())
    colors_dist = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'] # emerald, blue, amber, rose
    
    # Filter out categories with 0 values
    pie_data = [(l, s, c) for l, s, c in zip(labels, sizes, colors_dist) if s > 0]
    if pie_data:
        p_labels, p_sizes, p_colors = zip(*pie_data)
        plt.pie(
            p_sizes, 
            labels=p_labels, 
            colors=p_colors, 
            autopct='%1.0f%%', 
            startangle=90, 
            wedgeprops=dict(width=0.4, edgecolor='w')
        )
    else:
        plt.text(0.5, 0.5, 'No Attainment Data Available', ha='center', va='center')
        
    plt.title('CO Attainment Level Distribution')
    plt.tight_layout()
    plt.savefig(c4_path)
    plt.close()

    # ─── Chart 5: Bloom Level vs Average Attainment ───
    c5_path = get_temp_img_path()
    plt.figure(figsize=(6, 3.2), dpi=150)
    bloom_groups = {}
    for c in computed_cos:
        b_lvl = f"Level {c['blooms_level']}"
        if b_lvl not in bloom_groups:
            bloom_groups[b_lvl] = []
        bloom_groups[b_lvl].append(c["achieved"])
        
    sorted_blooms = sorted(bloom_groups.keys())
    avg_bloom_attainments = [np.mean(bloom_groups[b]) for b in sorted_blooms]
    
    y_pos = np.arange(len(sorted_blooms))
    plt.bar(y_pos, avg_bloom_attainments, color='#06b6d4', width=0.4)
    plt.ylabel('Average Achieved %')
    plt.title("Bloom's Level vs Average Attainment")
    plt.xticks(y_pos, sorted_blooms)
    plt.ylim(0, 100)
    plt.grid(axis='y', linestyle='--', alpha=0.3)
    plt.tight_layout()
    plt.savefig(c5_path)
    plt.close()

    # ─── Chart 6: CO Achievement Ranking ───
    c6_path = get_temp_img_path()
    plt.figure(figsize=(6, 3.2), dpi=150)
    ranked_cos = sorted(computed_cos, key=lambda c: c["achieved"], reverse=True)
    ranked_names = [c["co_id"] for c in ranked_cos]
    ranked_vals = [c["achieved"] for c in ranked_cos]
    
    y_pos = np.arange(len(ranked_names))
    plt.bar(y_pos, ranked_vals, color='#f59e0b', width=0.4)
    plt.ylabel('Average Achieved %')
    plt.title('Course Outcomes Achievement Ranking')
    plt.xticks(y_pos, ranked_names)
    plt.ylim(0, 100)
    plt.grid(axis='y', linestyle='--', alpha=0.3)
    plt.tight_layout()
    plt.savefig(c6_path)
    plt.close()

    # ─── Chart 7: PO Attainment vs Target ───
    c7_path = get_temp_img_path()
    plt.figure(figsize=(6.5, 3.2), dpi=150)
    po_ids = [p.po_id for p in pos] if pos else [f"PO{i}" for i in range(1, 13)]
    
    # Calculate PO Attainments just like in backend/frontend mapping
    computed_pos = []
    for po_id in po_ids:
        po_mappings = [m for m in mappings if m.po_id == po_id and float(m.strength) > 0]
        if not po_mappings:
            computed_pos.append(0.0)
            continue
            
        numerator = 0.0
        denominator = 0.0
        for m in po_mappings:
            co_att = next((c for c in computed_cos if c["co_id"] == m.co_id), None)
            if co_att:
                lvl = co_att["achieved_level"]
                numerator += lvl * float(m.strength)
                denominator += float(m.strength)
                
        weighted = numerator / denominator if denominator > 0 else 0.0
        computed_pos.append(round(weighted, 2))
        
    x_pos = np.arange(len(po_ids))
    plt.bar(x_pos - width/2, [2.0] * len(po_ids), width, label='Target PO Benchmark', color='#94a3b8')
    plt.bar(x_pos + width/2, computed_pos, width, label='Weighted PO Score', color='#10b981')
    plt.ylabel('PO Score (0 - 3.0)')
    plt.title('PO Attainment vs Target')
    plt.xticks(x_pos, po_ids, rotation=45)
    plt.ylim(0, 3.0)
    plt.legend(fontsize=8, loc='upper left')
    plt.grid(axis='y', linestyle='--', alpha=0.3)
    plt.tight_layout()
    plt.savefig(c7_path)
    plt.close()

    # ─── 8. Heatmap Calculation & Info ───
    active_links = 0
    highest_val = -1.0
    highest_link = ""
    weak_count = 0
    sum_contrib = 0.0
    po_sums = {po_id: 0.0 for po_id in po_ids}
    co_sums = {c["co_id"]: 0.0 for c in computed_cos}
    
    heatmap_matrix = {} # {co_id: {po_id: (index, strength)}}
    for c in computed_cos:
        heatmap_matrix[c["co_id"]] = {}
        for po_id in po_ids:
            mapping = next((m for m in mappings if m.co_id == c["co_id"] and m.po_id == po_id), None)
            strength = float(mapping.strength) if mapping else 0.0
            index_val = (c["achieved_level"] * strength) / 3.0
            index_rounded = round(index_val, 2)
            heatmap_matrix[c["co_id"]][po_id] = (index_rounded, strength)
            
            if strength > 0:
                active_links += 1
                sum_contrib += index_rounded
                po_sums[po_id] += index_rounded
                co_sums[c["co_id"]] += index_rounded
                if index_rounded < 1.0:
                    weak_count += 1
                if index_rounded > highest_val:
                    highest_val = index_rounded
                    highest_link = f"{c['co_id']} -> {po_id}"

    avg_contrib = sum_contrib / active_links if active_links > 0 else 0.0
    strongest_po = max(po_sums, key=po_sums.get) if po_sums and any(po_sums.values()) else "None"
    weakest_po = min(po_sums, key=po_sums.get) if po_sums else "None"
    weakest_co = min(co_sums, key=co_sums.get) if co_sums else "None"

    # ─── ReportLab Generation ───
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=colors.HexColor('#1F3864'),
        spaceAfter=5,
        alignment=1
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=15,
        alignment=1
    )

    section_header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=colors.HexColor('#1e3a8a'),
        spaceBefore=10,
        spaceAfter=5,
        borderColor=colors.HexColor('#3b82f6'),
        borderWidth=0.5,
        borderPadding=3
    )
    
    interpretation_style = ParagraphStyle(
        'InterpretationText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#475569')
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        textColor=colors.white,
        alignment=1
    )

    kpi_header_style = ParagraphStyle(
        'KpiHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        textColor=colors.white,
        alignment=1
    )
    
    table_cell_style = ParagraphStyle(
        'TableCellCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        textColor=colors.HexColor('#0f172a'),
        alignment=1
    )

    table_cell_style_white = ParagraphStyle(
        'TableCellCustomWhite',
        parent=table_cell_style,
        textColor=colors.white
    )

    story = []

    # ─── Header Section ───
    story.append(Paragraph("MIT ACADEMY OF ENGINEERING, ALANDI", title_style))
    story.append(Paragraph("Accreditation Dossier: Outcome Analysis Report", subtitle_style))
    
    # Metadata Table
    meta_data = [
        [Paragraph(f"<b>Subject:</b> {state.subject_name or 'N/A'}", table_cell_style),
         Paragraph(f"<b>Department:</b> {state.department or 'N/A'}", table_cell_style),
         Paragraph(f"<b>Year & Sem:</b> {state.year or 'N/A'} · {state.semester or 'N/A'}", table_cell_style)]
    ]
    meta_table = Table(meta_data, colWidths=[180, 180, 180])
    meta_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CCCCCC')),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # Helper function to append chart block with interpretation
    def add_chart_block(title, img_path, interp_text):
        story.append(Paragraph(title, section_header_style))
        story.append(Spacer(1, 2))
        img = Image(img_path, width=280, height=150)
        img.hAlign = 'CENTER'
        story.append(img)
        story.append(Spacer(1, 4))
        
        # Interpretation Panel
        interp_p = Paragraph(f"<b>Interpretation:</b> {interp_text}", interpretation_style)
        panel_table = Table([[interp_p]], colWidths=[540])
        panel_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('PADDING', (0,0), (-1,-1), 6),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ]))
        story.append(panel_table)
        story.append(Spacer(1, 10))

    # We will lay out the 6 charts side-by-side or stacked. Let's stack them, 2 per page.
    
    # ─── PAGE 1: Charts 1 & 2 ───
    add_chart_block(
        "1. Course Outcomes (CO) Attainment vs Target",
        c1_path,
        "Compares target attainment threshold of each Course Outcome against the actual average scores achieved by the cohort. Green bars meet/exceed targets, while Red bars show targets missed."
    )
    add_chart_block(
        "2. Course Outcomes Gap Analysis",
        c2_path,
        "Ranks Course Outcomes by their performance gap (Achieved − Target). Positive values indicate achievement; negative values represent negative gaps where student cohorts failed to meet standards, highlighting areas for correction."
    )
    
    story.append(PageBreak())

    # ─── PAGE 2: Charts 3 & 4 ───
    add_chart_block(
        "3. CIA vs ESE Performance Comparison",
        c3_path,
        "Compares continuous internal assessments (CIA) against end-semester exams (ESE) per CO. Mismatches highlight differences in testing rigors."
    )
    add_chart_block(
        "4. CO Attainment Level Distribution",
        c4_path,
        "Illustrates the proportion of COs grouped by their achieved NBA Attainment levels (0 to 3). Higher concentration in Level 3 represents overall student mastery."
    )

    story.append(PageBreak())

    # ─── PAGE 3: Charts 5 & 6 ───
    add_chart_block(
        "5. Bloom Level vs Average Attainment",
        c5_path,
        "Illustrates average student attainment across different cognitive levels of Bloom's Taxonomy. It helps audit higher-order instructional requirements."
    )
    add_chart_block(
        "6. Course Outcomes Achievement Ranking",
        c6_path,
        "Ranks all Course Outcomes in descending order of average achievement, outlining strongest and weakest syllabus segments."
    )

    story.append(PageBreak())

    # ─── PAGE 4: Chart 7 & KPI Cards / Insights ───
    add_chart_block(
        "7. PO Attainment vs Target",
        c7_path,
        "Evaluates the direct, weighted contribution of Course Outcomes to the 12 Graduate Program Outcomes (POs) against a standard NBA target score of 2.0."
    )
    
    # KPI cards and Insights Title
    story.append(Paragraph("KPI Dashboard & Insights Summary", section_header_style))
    story.append(Spacer(1, 4))
    
    # KPI Grid Table
    kpi_data = [
        [Paragraph("<b>Active Mappings</b>", kpi_header_style), Paragraph("<b>Avg Contribution</b>", kpi_header_style),
         Paragraph("<b>Highest Contribution</b>", kpi_header_style), Paragraph("<b>Weak Links (<1)</b>", kpi_header_style)],
        [Paragraph(str(active_links), table_cell_style), Paragraph(f"{avg_contrib:.2f}", table_cell_style),
         Paragraph(f"{highest_link}<br/>(Index: {highest_val:.1f})", table_cell_style), Paragraph(str(weak_count), table_cell_style)]
    ]
    kpi_table = Table(kpi_data, colWidths=[135, 135, 135, 135])
    kpi_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CCCCCC')),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e3a8a')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor('#f8fafc')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 10))

    # Insights Banner
    insights_html = f"""
    <b>Faculty OBE Insights:</b><br/>
    • <b>Strongest PO Target:</b> <font color="#10b981"><b>{strongest_po}</b></font> receives the strongest mapping contribution, representing robust coverage.<br/>
    • <b>Weakest PO Target:</b> <font color="#ef4444"><b>{weakest_po}</b></font> has lowest mapping weight, indicating a potential curricular coverage gap.<br/>
    • <b>Weakest Outcome Contribution:</b> <font color="#f59e0b"><b>{weakest_co}</b></font> contributes minimally to POs, highlighting opportunities to strengthen mapping correlation.
    """
    insights_p = Paragraph(insights_html, ParagraphStyle('InsightStyle', parent=styles['Normal'], fontSize=8.5, leading=13))
    insights_table = Table([[insights_p]], colWidths=[540])
    insights_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#eff6ff')),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#bfdbfe')),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(insights_table)
    
    story.append(PageBreak())

    # ─── PAGE 5: CO-PO Contribution Heatmap ───
    story.append(Paragraph("8. CO → PO Contribution Heatmap Matrix", section_header_style))
    story.append(Paragraph("Cell values represent the Contribution Index: <code>(Final CO Attainment × Mapping Strength) / 3</code>. Active mappings are colored by contribution strength; empty cells represent unmapped pairs (strength = 0).", interpretation_style))
    story.append(Spacer(1, 8))
    
    # Build Heatmap Table
    h_headers = ["CO \\ PO"] + po_ids
    h_rows = [[Paragraph(f"<b>{h}</b>", table_header_style) for h in h_headers]]
    
    h_table_styles = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e3a8a')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]

    for r_idx, c in enumerate(computed_cos, 1):
        rounded_lvl = max(0, min(3, round(c["achieved_level"])))
        co_label = f"{c['co_id']} [L{rounded_lvl}]"
        
        row = [Paragraph(f"<b>{co_label}</b>", table_cell_style)]
        for col_idx, po_id in enumerate(po_ids, 1):
            val, strength = heatmap_matrix[c["co_id"]][po_id]
            if strength > 0:
                val_str = f"{val:.1f}"
                # Apply background colors and high-contrast text styles
                if val <= 1.0:
                    bg_color = colors.HexColor('#dbeafe') # very light blue
                    row.append(Paragraph(val_str, table_cell_style))
                elif val <= 2.0:
                    bg_color = colors.HexColor('#93c5fd') # medium blue
                    row.append(Paragraph(val_str, table_cell_style))
                else:
                    bg_color = colors.HexColor('#1d4ed8') # dark blue
                    row.append(Paragraph(val_str, table_cell_style_white))
                h_table_styles.append(('BACKGROUND', (col_idx, r_idx), (col_idx, r_idx), bg_color))
            else:
                row.append(Paragraph("", table_cell_style))
                h_table_styles.append(('BACKGROUND', (col_idx, r_idx), (col_idx, r_idx), colors.white))
                
        h_rows.append(row)

    col_widths = [68] + [39.3] * len(po_ids) # perfectly fits within 540pt printable width on letter page
    heatmap_table = Table(h_rows, colWidths=col_widths)
    heatmap_table.setStyle(TableStyle(h_table_styles))
    story.append(heatmap_table)
    story.append(Spacer(1, 15))

    # Heatmap Legend
    legend_title = Paragraph("<b>Cell contribution scale index color key:</b>", interpretation_style)
    story.append(legend_title)
    story.append(Spacer(1, 4))
    
    leg_cells = [
        Paragraph("0.0 (Unmapped / Empty)", table_cell_style),
        Paragraph("0.1 - 1.0 (Low Contribution)", table_cell_style),
        Paragraph("1.1 - 2.0 (Medium Contribution)", table_cell_style),
        Paragraph("2.1 - 3.0 (High Contribution)", table_cell_style_white)
    ]
    leg_table = Table([leg_cells], colWidths=[135, 135, 135, 135])
    leg_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('BACKGROUND', (0,0), (0,0), colors.white),
        ('BACKGROUND', (1,0), (1,0), colors.HexColor('#dbeafe')),
        ('BACKGROUND', (2,0), (2,0), colors.HexColor('#93c5fd')),
        ('BACKGROUND', (3,0), (3,0), colors.HexColor('#1d4ed8')),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(leg_table)

    # Build Document
    doc.build(story)

    # Cleanup temporary images
    for p in chart_paths:
        try:
            if os.path.exists(p):
                os.remove(p)
        except Exception:
            pass
