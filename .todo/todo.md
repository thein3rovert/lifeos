## Agent Page - Smart Board Feature

The agent page (which will be renamed) have a chat interface that is connected to opencode and the mcp created for it that has access a scope and limited dir in my obsidian vault.

But this page except for the chat interface is currently blank and has nothing in it but i have an idea of what i want it to be..a SMART BOARD..where i can see more ai summary and details about my vault and all.

- [x] I need to make sure some of the description is visible on the cards
- [ ] If the recent output is [] just show the cache output in the db and have a way to show its not the latest output
- [x] I need to convert the catagory on the card to tags instead and have them below like linear
- [x] I need to preview card below to show the preview mode first instead of edit mode and i need the save to work.
- [ ] Make sure the github action is using bun so it have faster build time
- [x] Generate a new agent.md for lifeos so its
- x[ ] Add the ability to pause/disable the timer on each panel
  x [ ] Maybe also add it in settings
- [ ] Add notification (discord/telegram)
- [ ] I need a better way to integrate the agent chat below with each of these days
  - [ ] It need to have context of each card and also knowledge base in case it wants to go deeper into what the context board gives.
- [ ] Add filtering option to panel types

- Panel data in DB — yes, smartboard_panels table has the latest JSON blob per panel (1-8KB each). Cheap, reusable.
  Ideas ranked by effort/value:

# 25-07-2026

- x Pre-fill panels as context (easiest, biggest win)  
   Before calling sidecar, backend fetches the 4 latest panels + injects them into the agent's context. Agent answers "what's blocking me?" instantly with 0 MCP calls.

- [ ] Add the features to expand/zoom any soecific panel
  - Add a zoom icon and when click on will pop up and float the panel, my aim is for this to help with better visibility and maybe further functionalities

- [ ] I need to add the feature to go back in time in each panel..
  - For example if i want to see previous blockers either by date or by updated date..not sure yet but there should be a way to see and filter previous blockers...same with other panels since they are all been fetched from the database

- [ ] Panel-item mention (Linear-style)  
       User picks a specific card from the board via @blockers/1 and it gets attached as context. Explicit intent, minimal token waste.

- [ ] New MCP tool get_smartboard_panel(type) (cleanest)  
       Agent decides when to query DB vs when to scan files. E.g., "any recent achievements?" → DB. "What did I write yesterday?" → MCP.

- [ ] Session pre-fill (once per session)  
       Inject panel JSON when creating the session; agent has it for the whole convo. Fast, mildly stale.

- [ ] I want to understand what is the lifecycle of this floating chat..does it delete each session after refresh
  - Does it delete each session after refresh or just keep it and reuse it for future request.

- [ ] Looking to replace skill Note section to skill review note section
- Currently i update my skills from hy agent harnes itself, because this is quite convenient, when i start workong on a project i do say "oh by the way can you update the skill with this context" and it does that with ease..i feel updating it through lifeos ui will just ad extra work for me.. so instead i will do a weekly review..i will have the agent go through the skills and suggest improvement to them and best practise those suggestion will be the one in thew skill notes section and ranked by priority.

- [ ] I am thinking of moving my mcp to a diff dedicated server alongside my notes so it know where to pull from and can also write to it.
