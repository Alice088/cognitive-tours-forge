export const INSTRUCTIONS = `The map is a file in the project, not a database.

Work in a loop:
1. list_projects, then read_map for the map you need. The answer carries a state token.
2. Change one thing with one call, sending that token back.
3. read_map again before the next change; the token from step 2 replaces the old one.

Valid waypoint types: Goal, User Need, Feature, ADR, Code Component, Test, Risk, AI Instruction, Open Question, Deprecated.

Every change carries the state token of the read it was based on. If the map moved since then, the answer is a refusal that carries the current map, so read it again and redo the change against what is true now.

A refusal means nothing was written: the file is byte-for-byte what it was. The refusal names the cause and, when a value was wrong, the valid ones.

Do not invent waypoints, links or tours the person did not ask for. Do not delete a map or a project; that stays with the person.`;
