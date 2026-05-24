from core.schemas import CourseOutcome

BLOOMS_VERBS = {
    1: ["recall", "list", "define", "identify", "name", "state"],
    2: ["explain", "describe", "summarize", "classify", "interpret"],
    3: ["apply", "demonstrate", "use", "implement", "solve"],
    4: ["analyze", "differentiate", "compare", "examine", "distinguish"],
    5: ["evaluate", "justify", "assess", "critique", "judge"],
    6: ["create", "design", "formulate", "develop", "construct"],
}

def check_blooms_coverage(cos: list[CourseOutcome]) -> list[str]:
    """Check if all 6 Bloom's levels are covered."""
    covered = {co.blooms_level for co in cos}
    missing = [f"Level {l}" for l in range(1, 7) if l not in covered]
    return missing

def check_duplicates(cos: list[CourseOutcome]) -> list[str]:
    """Detect suspiciously similar CO statements."""
    issues = []
    statements = [co.statement.lower() for co in cos]
    for i in range(len(statements)):
        for j in range(i + 1, len(statements)):
            common_words = set(statements[i].split()) & set(statements[j].split())
            if len(common_words) > 8:
                issues.append(
                    f"{cos[i].co_id} and {cos[j].co_id} may be too similar "
                    f"({len(common_words)} common words)"
                )
    return issues

def check_action_verbs(cos: list[CourseOutcome]) -> list[str]:
    """Check each CO starts with an appropriate Bloom's action verb."""
    issues = []
    all_verbs = [v for verbs in BLOOMS_VERBS.values() for v in verbs]
    for co in cos:
        first_word = co.statement.split()[0].lower().rstrip(".,")
        if first_word not in all_verbs:
            issues.append(
                f"{co.co_id} does not start with a recognized Bloom's verb "
                f"(starts with '{first_word}')"
            )
    return issues