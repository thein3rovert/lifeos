---
id: LOS-005
title: Investigate lifeos recent request failure issue on context deadline
status: To Do
assignee: []
created_date: '2026-08-15 21:36'
updated_date: '2026-08-15 21:37'
labels: []
dependencies: []
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Recently i mean today 15 august, i had issue with lifeos..it kept saying context deadline exceeded, so i think it tries to run but maybe the opencode server had issue and the context deadline closed so i dont know if its on my sidecar server side or opencode side..so i need to investitage
Here is the error i was having:

failed to call AI: sidecar /agent/chat returned 504: {"error":"Request timed out. The agent might be processing a complex task or MCP is slow.","sessionId":"ses_13e16ecc4ffe57BKA6XhXBcQR3","duration":"600.00s"}

```
failed to call AI: sidecar request failed: Post "http://sidecar:3002/agent/chat": context deadline exceeded (Client.Timeout exceeded while awaiting headers)
```
and this happened to the achivement panel, thing to remember panel and the blocker pannel
<!-- SECTION:DESCRIPTION:END -->
