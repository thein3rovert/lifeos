const FILE_TOOLS = new Set(['read', 'write', 'edit', 'patch', 'glob', 'grep', 'list']);

function timestamp(created) {
  return new Date(typeof created === 'number' ? created : Date.now()).toISOString();
}

function errorMessage(error) {
  return error?.message || 'OpenCode reported an error';
}

function toolKind(name, input = {}) {
  const normalized = (name || '').toLowerCase();
  if (
    normalized.startsWith('mcp_') ||
    normalized.startsWith('mcp.') ||
    normalized.includes('__') ||
    input.server ||
    input.mcpServer
  ) {
    return 'mcp';
  }
  return FILE_TOOLS.has(normalized) ? 'file' : 'tool';
}

function toolDetail(input = {}) {
  for (const key of ['path', 'file', 'filePath', 'filename', 'directory', 'pattern']) {
    if (typeof input[key] === 'string' && input[key]) return input[key];
  }
  return undefined;
}

function activity(event, kind, status, title, detail, toolCallId) {
  return {
    id: event.id,
    kind,
    status,
    title,
    ...(detail ? { detail } : {}),
    ...(toolCallId ? { toolCallId } : {}),
    timestamp: timestamp(event.created),
  };
}

/**
 * Normalize one @opencode/client V2 event. Events without an exact matching
 * data.sessionID are intentionally ignored, including global filesystem/MCP
 * events which cannot be safely attributed to a conversation.
 */
export function normalizeActivityEvent(event, sessionID, toolNames = new Map()) {
  const eventSessionID = event?.data?.sessionID || event?.data?.form?.sessionID;
  if (!event?.data || eventSessionID !== sessionID) return null;

  const { data } = event;
  switch (event.type) {
    case 'session.execution.started':
      return activity(event, 'status', 'started', 'Agent started');
    case 'permission.asked':
      return activity(event, 'status', 'progress', 'Permission requested', data.action);
    case 'permission.replied':
      return activity(event, 'status', 'completed', 'Permission settled', data.reply);
    case 'form.created':
      return activity(event, 'status', 'progress', 'Input requested', data.form.title);
    case 'form.replied':
      return activity(event, 'status', 'completed', 'Form submitted');
    case 'form.cancelled':
      return activity(event, 'status', 'interrupted', 'Form cancelled');
    case 'session.execution.succeeded':
      return activity(event, 'status', 'completed', 'Agent completed');
    case 'session.execution.interrupted':
      return activity(event, 'status', 'interrupted', 'Agent interrupted', data.reason);
    case 'session.execution.failed':
      return activity(event, 'error', 'failed', 'Agent failed', errorMessage(data.error));
    case 'session.status':
      return activity(
        event,
        'status',
        data.status.type === 'busy' ? 'started' : data.status.type,
        data.status.type === 'busy' ? 'Agent is working' : data.status.type === 'idle' ? 'Agent is idle' : 'Retrying',
        data.status.type === 'retry' ? data.status.message : undefined,
      );
    case 'session.idle':
      return activity(event, 'status', 'idle', 'Agent is idle');
    case 'session.retry.scheduled':
      return activity(event, 'status', 'retry', `Retry ${data.attempt}`, errorMessage(data.error));
    case 'session.compaction.started':
      return activity(event, 'status', 'started', 'Compacting context', data.reason);
    case 'session.compaction.ended':
      return activity(event, 'status', 'completed', 'Context compacted');
    case 'session.compaction.failed':
      return activity(event, 'error', 'failed', 'Context compaction failed', errorMessage(data.error));
    case 'session.step.started':
      return activity(event, 'status', 'progress', `Running ${data.agent}`);
    case 'session.step.failed':
      return activity(event, 'error', 'failed', 'Agent step failed', errorMessage(data.error));
    case 'session.reasoning.started':
      return activity(event, 'reasoning', 'started', 'Reasoning');
    case 'session.reasoning.ended':
      return activity(event, 'reasoning', 'completed', 'Reasoning complete');
    case 'session.tool.input.started': {
      toolNames.set(data.id, data.name);
      const kind = toolKind(data.name);
      return activity(event, kind, 'started', data.name, undefined, data.id);
    }
    case 'session.tool.called': {
      const name = toolNames.get(data.id) || 'Tool';
      const kind = toolKind(name, data.input);
      return activity(event, kind, 'progress', name, toolDetail(data.input), data.id);
    }
    case 'session.tool.progress': {
      const name = toolNames.get(data.id) || 'Tool';
      return activity(event, toolKind(name), 'progress', name, undefined, data.id);
    }
    case 'session.tool.success': {
      const name = toolNames.get(data.id) || 'Tool';
      toolNames.delete(data.id);
      return activity(event, toolKind(name), 'completed', name, undefined, data.id);
    }
    case 'session.tool.failed': {
      const name = toolNames.get(data.id) || 'Tool';
      toolNames.delete(data.id);
      return activity(event, 'error', 'failed', `${name} failed`, errorMessage(data.error), data.id);
    }
    default:
      return null;
  }
}

export async function streamSessionActivity(client, sessionID, res, signal) {
  const toolNames = new Map();
  for await (const event of client.event.subscribe({ signal })) {
    const normalized = normalizeActivityEvent(event, sessionID, toolNames);
    if (!normalized) continue;
    res.write(`id: ${normalized.id}\ndata: ${JSON.stringify(normalized)}\n\n`);
  }
}
