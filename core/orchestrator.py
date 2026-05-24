from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt
from rich.table import Table
from rich import box

import questionary
import json
import os

from core.state import AgentState
from core.schemas import ValidationReport, ProgramOutcome

import agents.co_generator as co_gen
import agents.co_validator as co_val
import agents.po_mapper as po_map
import agents.mapping_validator as map_val
import agents.teaching_philosophy as teach
import agents.co_attainment as co_att
import agents.po_attainment as po_att
import agents.recommendation as rec
import agents.report_generator as reporter
import agents.reflection_agent as reflect

from tools.syllabus_reader import load_syllabus

console = Console()

MAX_RETRIES = 3


class Orchestrator:

    def __init__(self):

        self.state = AgentState()

        os.makedirs("logs", exist_ok=True)
        os.makedirs("data", exist_ok=True)

        # Extra memory
        self.state.co_versions = []
        self.state.mapping_versions = []

        self.state.reflection_feedback = ""
        self.state.mapping_reflection = ""

        self.state.co_validation_feedback = ""
        self.state.mapping_validation_feedback = ""

        self.state.excel_customization = ""

        # NEW → USER DEFINED THRESHOLDS
        self.state.level1_threshold = 55
        self.state.level2_threshold = 65
        self.state.level3_threshold = 75

    # ==========================================================
    # BANNER
    # ==========================================================

    def banner(self):

        console.print(
            Panel.fit(
                "[bold cyan]🤖 Multi-Agent CO-PO Agentic Platform[/bold cyan]\n"
                "[dim]NBA/NAAC Accreditation Intelligence System[/dim]",
                border_style="bright_cyan",
                padding=(1, 5)
            )
        )

    # ==========================================================
    # FEEDBACK
    # ==========================================================

    def collect_feedback(self, phase_name: str):

        console.print(
            f"\n[bold red]❌ {phase_name} rejected by user[/bold red]"
        )

        console.print("\n[yellow]Why rejected?[/yellow]")

        console.print("1. Too generic")
        console.print("2. Too theoretical")
        console.print("3. Missing Bloom taxonomy levels")
        console.print("4. Weak mappings")
        console.print("5. Too repetitive")
        console.print("6. Need practical outcomes")
        console.print("7. Custom feedback")

        choice = input("\nSelect option: ").strip()

        feedback_map = {
            "1": "Outputs are too generic",
            "2": "Outputs are too theoretical",
            "3": "Bloom taxonomy coverage is incomplete",
            "4": "Mappings are weak or incorrect",
            "5": "Outputs are repetitive",
            "6": "Need more practical implementation-oriented outputs"
        }

        if choice == "7":
            feedback = input("Enter custom feedback: ")

        else:
            feedback = feedback_map.get(
                choice,
                "Improve overall quality"
            )

        return feedback

    # ==========================================================
    # VERSION DIFF
    # ==========================================================

    def show_version_diff(self, old, new):

        console.print("\n[bold yellow]📌 PREVIOUS VERSION[/bold yellow]")

        console.print(
            Panel.fit(
                str(old),
                title="OLD VERSION",
                border_style="red"
            )
        )

        console.print("\n[bold green]✨ NEW VERSION[/bold green]")

        console.print(
            Panel.fit(
                str(new),
                title="NEW VERSION",
                border_style="green"
            )
        )

    # ==========================================================
    # PHASE 1
    # ==========================================================

    def phase1_setup(self):

        console.rule(
            "[bold green]PHASE 1 — Setup[/bold green]"
        )

        self.state.subject_name = Prompt.ask(
            "[cyan]Enter Subject Name[/cyan]"
        )

        self.state.year = questionary.select(
            "Select Year of Study:",
            choices=["FY", "SY", "TY"]
        ).ask()

        path = Prompt.ask(
            "[cyan]Enter path to syllabus file (.pdf or .txt)[/cyan]"
        )

        self.state.syllabus_text = load_syllabus(path)

        console.print(
            f"\n[bold green]✓ Subject:[/bold green] "
            f"{self.state.subject_name}"
        )

        console.print(
            f"[bold green]✓ Year:[/bold green] "
            f"{self.state.year}"
        )

        # ======================================================
        # NEW USER INPUT FOR THRESHOLDS
        # ======================================================

        console.rule(
            "[bold blue]CO Attainment Threshold Setup[/bold blue]"
        )

        console.print(
            "[dim]Enter percentage thresholds out of 100[/dim]\n"
        )

        self.state.level1_threshold = int(
            Prompt.ask(
                "Level 1 Threshold %",
                
            )
        )

        self.state.level2_threshold = int(
            Prompt.ask(
                "Level 2 Threshold %",
                
            )
        )

        self.state.level3_threshold = int(
            Prompt.ask(
                "Level 3 Threshold %",
                
            )
        )

        console.print(
            "\n[bold green]✓ Attainment thresholds configured[/bold green]"
        )

        console.print(
            f"[magenta]Level 1:[/magenta] "
            f"{self.state.level1_threshold}%"
        )

        console.print(
            f"[yellow]Level 2:[/yellow] "
            f"{self.state.level2_threshold}%"
        )

        console.print(
            f"[green]Level 3:[/green] "
            f"{self.state.level3_threshold}%\n"
        )

    # ==========================================================
    # PHASE 2
    # ==========================================================

    def phase2_co_generation(self):

        console.rule(
            "[bold green]PHASE 2 — CO Generation + Validation[/bold green]"
        )

        num_cos = int(
            Prompt.ask(
                "[cyan]How many COs to generate?[/cyan]",
                default="6"
            )
        )

        for attempt in range(1, MAX_RETRIES + 1):

            console.print(
                f"\n[yellow]⏳ CO Generator Agent — Attempt {attempt}[/yellow]"
            )

            self.state = co_gen.run(
                self.state,
                num_cos
            )

            console.print(
                "[yellow]🔍 CO Validator Agent — Critiquing...[/yellow]"
            )

            self.state, report = co_val.run(self.state)

            self.state.co_validation_feedback = "\n".join(
                report.issues
            )

            self._show_validation_report(
                "CO Validation",
                report
            )

            if report.passed:

                console.print(
                    "[bold green]✅ COs passed validation[/bold green]"
                )

                break

            elif attempt < MAX_RETRIES:

                console.print(
                    f"[bold red]❌ Validation failed "
                    f"({attempt}/{MAX_RETRIES})[/bold red]"
                )

                self.state.increment_retry(
                    "co_generator"
                )

            else:

                console.print(
                    "[bold yellow]⚠ Max retries reached[/bold yellow]"
                )

        self._print_co_table()

        self.state.co_versions.append(
            [co.model_dump() for co in self.state.cos]
        )

        accept = Confirm.ask(
            "\n[yellow]Accept these COs?[/yellow]",
            default=True
        )

        if not accept:

            old_cos = [
                co.model_dump()
                for co in self.state.cos
            ]

            user_feedback = self.collect_feedback(
                "CO Generation"
            )

            reflection = reflect.generate_reflection(
                previous_output=old_cos,
                validator_feedback=self.state.co_validation_feedback,
                user_feedback=user_feedback
            )

            console.print(
                "\n[bold cyan]🧠 Reflection Suggestions[/bold cyan]"
            )

            console.print(reflection)

            self.state.reflection_feedback = reflection

            console.print(
                "\n[yellow]🔁 Regenerating COs...[/yellow]\n"
            )

            self.state = co_gen.run(
                self.state,
                num_cos
            )

            new_cos = [
                co.model_dump()
                for co in self.state.cos
            ]

            self.show_version_diff(
                old_cos,
                new_cos
            )

            return self.phase2_co_generation()

        console.print(
            "[bold green]✓ COs finalized.[/bold green]\n"
        )

    # ==========================================================
    # PHASE 3
    # ==========================================================

    def phase3_po_input(self):

        console.rule(
            "[bold green]PHASE 3 — Program Outcomes Input[/bold green]"
        )

        choice = questionary.select(
            "How would you like to provide POs/PIs?",
            choices=[
                "Load from JSON file",
                "Enter manually"
            ]
        ).ask()

        if choice == "Load from JSON file":

            path = Prompt.ask(
                "[cyan]Enter JSON file path[/cyan]"
            )

            with open(path) as f:
                data = json.load(f)

            self.state.pos = [
                ProgramOutcome(**p)
                for p in data
            ]

        else:

            self.state.pos = []

            while True:

                po_id = Prompt.ask(
                    "[cyan]PO ID[/cyan]",
                    default=""
                )

                if not po_id:
                    break

                statement = Prompt.ask(
                    f"[cyan]Statement for {po_id}[/cyan]"
                )

                self.state.pos.append(
                    ProgramOutcome(
                        po_id=po_id,
                        statement=statement
                    )
                )

        console.print(
            f"\n[bold green]✓ Loaded "
            f"{len(self.state.pos)} POs/PIs[/bold green]\n"
        )

    # ==========================================================
    # PHASE 4
    # ==========================================================

    def phase4_mapping(self):

        console.rule(
            "[bold green]PHASE 4 — CO-PO Mapping + Validation[/bold green]"
        )

        for attempt in range(1, MAX_RETRIES + 1):

            console.print(
                f"\n[yellow]⏳ PO Mapper Attempt {attempt}[/yellow]"
            )

            self.state = po_map.run(self.state)

            console.print(
                "[yellow]🔍 Validating mappings...[/yellow]"
            )

            self.state, report = map_val.run(self.state)

            self.state.mapping_validation_feedback = "\n".join(
                report.issues
            )

            self._show_validation_report(
                "Mapping Validation",
                report
            )

            if report.passed:

                console.print(
                    "[bold green]✅ Mapping passed validation[/bold green]"
                )

                break

        self._print_mapping_table()

        console.print(
            "[bold green]✓ CO-PO Mapping locked.[/bold green]\n"
        )

    # ==========================================================
    # PHASE 5
    # ==========================================================

    def phase5_teaching_philosophy(self):

        console.rule(
            "[bold green]PHASE 5 — Teaching Philosophy[/bold green]"
        )

        self.state = teach.run(self.state)

        console.print(
            Panel(
                self.state.teaching_philosophy,
                title="Teaching Philosophy",
                border_style="blue",
                padding=(1, 2)
            )
        )

    # ==========================================================
    # PHASE 6
    # ==========================================================

    def phase6_co_attainment(self):

        console.rule(
            "[bold green]PHASE 6 — CO Attainment[/bold green]"
        )

        marks_path = Prompt.ask(
            "[cyan]Enter path to student marks CSV[/cyan]"
        )

        self.state = co_att.run(
            self.state,
            marks_path
        )

        self._print_co_attainment_table()

    # ==========================================================
    # PHASE 7
    # ==========================================================

    def phase7_po_attainment(self):

        console.rule(
            "[bold green]PHASE 7 — PO Attainment[/bold green]"
        )

        self.state = po_att.run(self.state)

        self._print_po_attainment_table()

    # ==========================================================
    # PHASE 8
    # ==========================================================

    def phase8_recommendations(self):

        console.rule(
            "[bold green]PHASE 8 — Recommendations[/bold green]"
        )

        self.state = rec.run(self.state)

        for r in self.state.recommendations:

            panel = Panel(
                f"[bold]{r.issue}[/bold]\n\n→ {r.suggestion}",
                title=f"{r.priority} Priority | {r.target}",
                border_style="yellow"
            )

            console.print(panel)

    # ==========================================================
    # PHASE 9
    # ==========================================================

    def phase9_report(self):

        console.rule(
            "[bold green]PHASE 9 — Excel Report[/bold green]"
        )

        confirm = Confirm.ask(
            "[yellow]Generate Excel report?[/yellow]",
            default=True
        )

        if not confirm:
            return

        path = reporter.run(self.state)

        console.print(
            f"\n[bold green]✅ Excel file saved:[/bold green] {path}"
        )

    # ==========================================================
    # VALIDATION REPORT
    # ==========================================================

    def _show_validation_report(self, title, report):

        if report.issues:

            console.print(
                f"\n[bold red]Issues in {title}:[/bold red]"
            )

            for issue in report.issues:
                console.print(f" • {issue}")

        if report.suggestions:

            console.print(
                "\n[bold yellow]Suggestions:[/bold yellow]"
            )

            for s in report.suggestions:
                console.print(f" → {s}")

    # ==========================================================
    # CO TABLE
    # ==========================================================

    def _print_co_table(self):

        level_colors = {
            1: "red",
            2: "magenta",
            3: "green",
            4: "yellow",
            5: "bright_blue",
            6: "cyan"
        }

        table = Table(
            title="📘 Generated Course Outcomes",
            box=box.DOUBLE_EDGE,
            show_lines=True,
            header_style="bold white on dark_blue",
            border_style="bright_blue"
        )

        table.add_column(
            "CO ID",
            justify="center",
            style="bold cyan",
            width=10
        )

        table.add_column(
            "Course Outcome Statement",
            width=95
        )

        table.add_column(
            "Bloom Level",
            justify="center",
            width=20
        )

        for co in self.state.cos:

            color = level_colors.get(
                co.blooms_level,
                "white"
            )

            bloom = (
                f"[{color}]"
                f"L{co.blooms_level} - {co.blooms_keyword}"
                f"[/{color}]"
            )

            table.add_row(
                co.co_id,
                co.statement,
                bloom
            )

        console.print(table)

    # ==========================================================
    # MAPPING TABLE
    # ==========================================================

    def _print_mapping_table(self):

        po_ids = [po.po_id for po in self.state.pos]

        table = Table(
            title="🎯 CO-PO Competency Matrix",
            box=box.DOUBLE_EDGE,
            show_lines=True,
            header_style="bold white on dark_green",
            border_style="green"
        )

        table.add_column(
            "CO",
            justify="center",
            style="bold cyan",
            width=8
        )

        for po in po_ids:

            table.add_column(
                po,
                justify="center",
                width=6
            )

        mapping_lookup = {}

        for mapping in self.state.co_po_mapping:

            mapping_lookup[
                (mapping.co_id, mapping.po_id)
            ] = mapping.strength

        for co in self.state.cos:

            row = [f"[bold cyan]{co.co_id}[/bold cyan]"]

            for po in po_ids:

                strength = mapping_lookup.get(
                    (co.co_id, po),
                    0
                )

                if strength == 3:
                    value = "[bold green]3[/bold green]"

                elif strength == 2:
                    value = "[yellow]2[/yellow]"

                elif strength == 1:
                    value = "[magenta]1[/magenta]"

                else:
                    value = "[dim]-[/dim]"

                row.append(value)

            table.add_row(*row)

        console.print(table)

        console.print("\n[bold]Legend:[/bold]")
        console.print("[bold green]3[/bold green] = Strong")
        console.print("[yellow]2[/yellow] = Moderate")
        console.print("[magenta]1[/magenta] = Low")
        console.print("[dim]-[/dim] = No Mapping\n")

    # ==========================================================
    # CO ATTAINMENT TABLE
    # ==========================================================

    def _print_co_attainment_table(self):

        table = Table(
            title="📊 CO Attainment Analysis",
            box=box.DOUBLE_EDGE,
            show_lines=True,
            header_style="bold white on dark_magenta",
            border_style="magenta"
        )

        table.add_column(
            "CO",
            justify="center",
            style="bold cyan",
            width=10
        )

        table.add_column(
            "Average %",
            justify="center",
            width=15
        )

        table.add_column(
            "Attainment Level",
            justify="center",
            width=20
        )

        for a in self.state.co_attainment:

            level = a.achieved_level

            if level >= 3:
                text = "[bold green]Level 3[/bold green]"

            elif level == 2:
                text = "[yellow]Level 2[/yellow]"

            elif level == 1:
                text = "[magenta]Level 1[/magenta]"

            else:
                text = "[red]Not Achieved[/red]"

            table.add_row(
                a.co_id,
                f"{a.avg_percentage}%",
                text
            )

        console.print(table)

    # ==========================================================
    # PO ATTAINMENT TABLE
    # ==========================================================

    def _print_po_attainment_table(self):

        table = Table(
            title="📈 PO Attainment Analysis",
            box=box.DOUBLE_EDGE,
            show_lines=True,
            header_style="bold white on dark_red",
            border_style="red"
        )

        table.add_column(
            "PO",
            justify="center",
            style="bold cyan",
            width=10
        )

        table.add_column(
            "Weighted Score",
            justify="center",
            width=20
        )

        table.add_column(
            "Status",
            justify="center",
            width=15
        )

        for po in self.state.po_attainment:

            score = po.weighted_attainment

            if score >= 2:

                score_text = (
                    f"[bold green]{score}[/bold green]"
                )

                status = "[bold green]Strong[/bold green]"

            elif score >= 1:

                score_text = (
                    f"[yellow]{score}[/yellow]"
                )

                status = "[yellow]Moderate[/yellow]"

            else:

                score_text = (
                    f"[red]{score}[/red]"
                )

                status = "[red]Weak[/red]"

            table.add_row(
                po.po_id,
                score_text,
                status
            )

        console.print(table)

    # ==========================================================
    # RUN
    # ==========================================================

    def run(self):

        self.banner()

        self.phase1_setup()

        self.phase2_co_generation()

        self.phase3_po_input()

        self.phase4_mapping()

        self.phase5_teaching_philosophy()

        self.phase6_co_attainment()

        self.phase7_po_attainment()

        self.phase8_recommendations()

        self.phase9_report()

        console.print(
            "\n[bold cyan]🎉 Multi-Agent Pipeline Complete![/bold cyan]"
        )