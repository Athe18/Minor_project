class Orchestrator:

    def __init__(self):

        self.state = AgentState()

        os.makedirs("logs", exist_ok=True)
        os.makedirs("data", exist_ok=True)

        # Version tracking
        self.state["co_versions"] = []
        self.state["mapping_versions"] = []