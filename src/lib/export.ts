import type { AppDataPayload } from '../types';

export function exportDataToMarkdown(data: AppDataPayload): string {
  const lines: string[] = [];
  
  lines.push(`# Learning Progress Export`);
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push(`\n## Goals`);
  
  for (const goal of data.goals) {
    lines.push(`\n### ${goal.title} (${goal.status})`);
    lines.push(`- Level: ${goal.level}`);
    lines.push(`- Hours: ${goal.hours}`);
    lines.push(`- Target Date: ${goal.target_date}`);
    lines.push(`- Created: ${goal.created_at}`);
    
    const goalTasks = data.tasks.filter((t) => t.goal_id === goal.id);
    lines.push(`\n#### Tasks`);
    for (const task of goalTasks) {
      lines.push(`- [${task.status === 'completed' ? 'x' : ' '}] **${task.title}**`);
      lines.push(`  ${task.description}`);
      if (task.completed_at) {
        lines.push(`  *Completed at: ${task.completed_at}*`);
      }
      
      const taskSessions = data.sessions.filter(s => s.task_id === task.id && s.completed_at);
      if (taskSessions.length > 0) {
        lines.push(`  - **Sessions:**`);
        for (const session of taskSessions) {
          lines.push(`    - Duration: ${Math.round(session.duration_seconds / 60)} minutes`);
          if (session.reflection) lines.push(`    - Reflection: ${session.reflection}`);
          if (session.confusion) lines.push(`    - Obstacles: ${session.confusion}`);
          if (session.confidence) lines.push(`    - Confidence: ${session.confidence}/5`);
        }
      }
    }

    const goalNotes = data.notes.filter((n) => n.topic === goal.title || n.topic === `${goal.title} resources`);
    if (goalNotes.length > 0) {
      lines.push(`\n#### Notes`);
      for (const note of goalNotes) {
        lines.push(`- **${note.topic}** (${note.kind})`);
        lines.push(`  ${note.content.split('\n').join('\n  ')}`);
      }
    }
  }
  
  return lines.join('\n');
}

export function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
