import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  fetchTaskForDate,
  fetchRecentTasks,
  fetchActiveProjects,
  saveGeneratedTask,
  createProject,
} from '@/lib/art-coach';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { date, difficulty = 'normal', isReplacement = false } = body as {
      date: string;
      difficulty?: 'easy' | 'normal' | 'challenge';
      isReplacement?: boolean;
    };

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 });
    }

    // Check for cached task (only if not requesting a replacement)
    if (!isReplacement) {
      const existing = await fetchTaskForDate(supabase, user.id, date);
      if (existing) {
        return NextResponse.json({ task: existing });
      }
    }

    // Fetch context for AI
    const [recentTasks, activeProjects] = await Promise.all([
      fetchRecentTasks(supabase, user.id, 10),
      fetchActiveProjects(supabase, user.id),
    ]);

    const recentContext = recentTasks.length > 0
      ? recentTasks.map(t =>
          `- ${t.date}: "${t.title}" (${t.medium}, ${t.focus_area}, ${t.difficulty})${t.completed ? ' [completed]' : ''}`
        ).join('\n')
      : 'No previous tasks yet - this is the first assignment.';

    const projectContext = activeProjects.length > 0
      ? activeProjects.map(p =>
          `- "${p.title}" (${p.completed_sessions}/${p.total_sessions} sessions): ${p.description}`
        ).join('\n')
      : 'No active multi-session projects.';

    const difficultyInstruction = isReplacement
      ? `The student requested an EASIER alternative. Generate a simpler, lower-pressure task (difficulty: easy). This could be a quick gesture study, a relaxing doodle exercise, or a shorter focused warm-up.`
      : difficulty === 'easy'
        ? 'Generate an easier, shorter task (15-30 min). Focus on warm-ups, gesture drawing, or simple studies.'
        : difficulty === 'challenge'
          ? 'Generate a challenging task (60-90 min). Push the student with complex subjects, new techniques, or master copy exercises.'
          : 'Generate a standard practice task (30-60 min). Balance skill-building with variety.';

    const systemPrompt = `You are an art practice coach for an intermediate artist working toward portrait painting mastery.

Student Profile:
- Level: Intermediate
- Goal: Portrait painting proficiency — facial anatomy, value/light control, likeness capture
- Schedule: Wednesday through Sunday (skip Monday and Tuesday)
- Mediums: Pencil, charcoal, digital
- Study sources: Proko tutorials, Andrew Loomis books ("Drawing the Head and Hands", "Figure Drawing for All It's Worth"), George Bridgman anatomy, live photo references

Task Guidelines:
${difficultyInstruction}

Vary tasks across these categories:
- Gesture/quick sketches (15-30 min) — faces, expressions, hands
- Focused studies (30-60 min) — facial planes, eye studies, nose/mouth anatomy, value mapping
- Full portrait sessions (60-90 min) — complete portrait from reference
- Master copy exercises (30-60 min) — study from Sargent, Repin, Zorn, or other portrait masters
- Multi-session projects (spanning 2-4 practice days) — detailed portrait from life/photo reference

When generating a multi-session project, set project_title and project_total_sessions in your response.

${activeProjects.length > 0 ? `Active Projects (CONTINUE these before starting new ones):\n${projectContext}` : ''}

Recent Task History (avoid repetition):\n${recentContext}

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "title": "Short task title",
  "description": "Detailed instructions for the practice session. Include specific guidance on what to focus on, technique tips, and what a successful session looks like.",
  "medium": "pencil" | "charcoal" | "digital",
  "focus_area": "e.g., facial proportions, value study, gesture, eye anatomy, master copy",
  "difficulty": "easy" | "normal" | "challenge",
  "reference_source": "e.g., Proko - Head Drawing Fundamentals, Loomis - Drawing the Head and Hands Ch.3, photo reference, or null",
  "duration_minutes": 30,
  "project_title": null,
  "project_total_sessions": null
}`;

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Generate a practice task for ${date} (${new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}).`,
        },
      ],
      system: systemPrompt,
    });

    // Extract text from response
    const textBlock = message.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    let parsed;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      // Try to extract JSON from the response if it has extra text
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json(
          { error: 'Failed to parse AI response' },
          { status: 500 }
        );
      }
    }

    // If AI wants to create a multi-session project, create it
    let projectId: number | null = null;

    // Check if we should continue an active project
    if (activeProjects.length > 0 && !isReplacement) {
      // Continue the first active project
      projectId = activeProjects[0].id;
    } else if (parsed.project_title && parsed.project_total_sessions) {
      const project = await createProject(
        supabase,
        user.id,
        parsed.project_title,
        parsed.description,
        parsed.project_total_sessions
      );
      projectId = project.id;
    }

    const savedTask = await saveGeneratedTask(supabase, user.id, {
      date,
      title: parsed.title,
      description: parsed.description,
      medium: parsed.medium,
      focus_area: parsed.focus_area,
      difficulty: isReplacement ? 'easy' : (parsed.difficulty || difficulty),
      reference_source: parsed.reference_source,
      duration_minutes: parsed.duration_minutes || 30,
      is_replacement: isReplacement,
      project_id: projectId,
    });

    // Re-fetch to include project data
    const task = await fetchTaskForDate(supabase, user.id, date);

    return NextResponse.json({ task: task || savedTask });
  } catch (err) {
    console.error('Art coach generate error:', err);
    return NextResponse.json(
      { error: 'Failed to generate task' },
      { status: 500 }
    );
  }
}
